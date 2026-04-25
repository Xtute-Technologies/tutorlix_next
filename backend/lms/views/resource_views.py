import os
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import requests
from django.core.files.base import ContentFile
from django.http import FileResponse, Http404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from lms.models import ApprovedResourceDomain, Resource
from lms.permissions import IsAdmin, IsAdminOrTeacher
from lms.serializers import ApprovedResourceDomainSerializer, ResourceSerializer

IMPORT_USER_AGENT = 'TutorlixResourceImporter/1.0'
MAX_IMPORTED_PDF_SIZE = 50 * 1024 * 1024


class BasicPageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag != 'a':
            return
        attrs_dict = dict(attrs)
        href = attrs_dict.get('href')
        if href:
            self.links.append({
                'href': href,
                'text': '',
            })

    def handle_data(self, data):
        if self.links:
            self.links[-1]['text'] += data.strip()


def is_allowed_domain(hostname, approved_domains):
    hostname = (hostname or '').lower()
    for domain in approved_domains:
        domain = domain.lower()
        if hostname == domain or hostname.endswith(f'.{domain}'):
            return True
    return False


def build_import_filename(resource_id, pdf_url):
    filename = os.path.basename(urlparse(pdf_url).path) or f'resource-{resource_id}.pdf'
    if not filename.lower().endswith('.pdf'):
        filename = f'{filename}.pdf'
    return filename


def download_pdf_to_resource(resource, pdf_url):
    response = requests.get(
        pdf_url,
        stream=True,
        timeout=(10, 180),
        headers={'User-Agent': IMPORT_USER_AGENT},
    )
    response.raise_for_status()

    content_type = (response.headers.get('Content-Type') or '').lower()
    if 'application/pdf' not in content_type and not urlparse(pdf_url).path.lower().endswith('.pdf'):
        raise ValueError('Imported file is not a PDF.')

    total_size = 0
    chunks = []
    for chunk in response.iter_content(chunk_size=8192):
        if not chunk:
            continue
        total_size += len(chunk)
        if total_size > MAX_IMPORTED_PDF_SIZE:
            raise ValueError('PDF is too large to import.')
        chunks.append(chunk)

    resource.file.save(
        build_import_filename(resource.id, pdf_url),
        ContentFile(b''.join(chunks)),
        save=True,
    )


class ApprovedResourceDomainViewSet(viewsets.ModelViewSet):
    queryset = ApprovedResourceDomain.objects.all()
    serializer_class = ApprovedResourceDomainSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['domain', 'description']
    ordering_fields = ['domain', 'created_at', 'updated_at']
    ordering = ['domain']


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.select_related('uploaded_by')
    serializer_class = ResourceSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['subject', 'curriculum', 'grade_or_course', 'topic', 'resource_type', 'visibility']
    search_fields = ['title', 'description', 'subject', 'curriculum', 'grade_or_course', 'topic', 'tags']
    ordering_fields = ['title', 'created_at', 'updated_at', 'subject', 'curriculum']
    ordering = ['-updated_at', '-created_at']

    def get_permissions(self):
        if self.action == 'import_from_url':
            return [IsAdmin()]
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsAdminOrTeacher()]
        return [IsAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return queryset.none()
        if user.role == 'admin':
            return queryset
        if user.role == 'teacher':
            return queryset.filter(visibility='teacher')
        return queryset.none()

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=False, methods=['post'])
    def import_from_url(self, request):
        source_url = (request.data.get('url') or '').strip()
        subject = (request.data.get('subject') or '').strip()
        curriculum = (request.data.get('curriculum') or '').strip()
        grade_or_course = (request.data.get('grade_or_course') or '').strip()
        topic = (request.data.get('topic') or '').strip()
        visibility = (request.data.get('visibility') or 'teacher').strip()

        if not source_url:
            return Response({'url': ['URL is required.']}, status=status.HTTP_400_BAD_REQUEST)

        parsed = urlparse(source_url)
        hostname = parsed.hostname
        approved_domains = list(
            ApprovedResourceDomain.objects.filter(is_active=True).values_list('domain', flat=True)
        )
        if not hostname or not is_allowed_domain(hostname, approved_domains):
            return Response(
                {'url': ['This domain is not approved for importing.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            response = requests.get(
                source_url,
                timeout=(10, 90),
                headers={'User-Agent': IMPORT_USER_AGENT},
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            return Response({'url': [f'Failed to fetch URL: {exc}']}, status=status.HTTP_400_BAD_REQUEST)

        safe_visibility = visibility if visibility in ('teacher', 'admin') else 'teacher'
        imported_at = timezone.now()
        created_resources = []

        def create_pdf_resource(pdf_url, title_hint='Imported PDF'):
            if Resource.objects.filter(source_url=pdf_url).exists():
                return None

            resource = Resource.objects.create(
                title=(title_hint or os.path.basename(urlparse(pdf_url).path) or 'Imported PDF')[:255],
                description='Imported PDF resource',
                subject=subject or 'General',
                curriculum=curriculum or 'General',
                grade_or_course=grade_or_course or 'General',
                topic=topic or 'Imported',
                resource_type='pdf',
                external_url='',
                source_url=pdf_url,
                imported_at=imported_at,
                visibility=safe_visibility,
                uploaded_by=request.user,
            )

            try:
                download_pdf_to_resource(resource, pdf_url)
            except Exception:
                resource.delete()
                return None

            return resource

        content_type = (response.headers.get('Content-Type') or '').lower()
        if 'application/pdf' in content_type or parsed.path.lower().endswith('.pdf'):
            resource = create_pdf_resource(source_url, os.path.basename(parsed.path) or 'Imported PDF')
            if resource:
                created_resources.append(resource)
        else:
            parser = BasicPageParser()
            parser.feed(response.text)
            seen_urls = set()

            for link in parser.links:
                absolute_url = urljoin(source_url, link['href'])
                absolute_parsed = urlparse(absolute_url)
                if absolute_url in seen_urls:
                    continue
                if not absolute_parsed.path.lower().endswith('.pdf'):
                    continue
                if not is_allowed_domain(absolute_parsed.hostname, approved_domains):
                    continue

                seen_urls.add(absolute_url)
                resource = create_pdf_resource(
                    absolute_url,
                    link['text'] or os.path.basename(absolute_parsed.path) or 'Imported PDF',
                )
                if resource:
                    created_resources.append(resource)

        if not created_resources:
            return Response(
                {'url': ['No importable PDFs were found at this approved URL.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(created_resources, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        resource = self.get_object()
        if not resource.file:
            raise Http404('No file attached to this resource.')

        file_handle = resource.file.open('rb')
        filename = os.path.basename(resource.file.name)
        return FileResponse(file_handle, as_attachment=True, filename=filename)

    def update(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            raise serializers.ValidationError({'detail': 'Only admin users can update resources.'})
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            raise serializers.ValidationError({'detail': 'Only admin users can delete resources.'})
        return super().destroy(request, *args, **kwargs)
