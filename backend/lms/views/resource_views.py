import os
import threading
import time
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import requests
from django.core.files.base import ContentFile
from django.db import close_old_connections
from django.http import FileResponse, Http404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from lms.models import ApprovedResourceDomain, Resource, ResourceImportJob
from lms.permissions import IsAdmin, IsAdminOrTeacher
from lms.serializers import (
    ApprovedResourceDomainSerializer,
    ResourceImportJobSerializer,
    ResourceSerializer,
)

IMPORT_USER_AGENT = 'TutorlixResourceImporter/1.0'
MAX_IMPORTED_PDF_SIZE = 50 * 1024 * 1024
MAX_IMPORTED_PDF_SIZE_MB = MAX_IMPORTED_PDF_SIZE // (1024 * 1024)
HTTP_RETRY_ATTEMPTS = 20
PDF_RETRY_ATTEMPTS = 20
BACKOFF_BASE_SECONDS = 1
MAX_FOLDER_DEPTH = 5
MAX_FOLDER_PAGES = 100


class ImportAbortedError(Exception):
    pass


class PdfTooLargeError(Exception):
    pass


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


def append_job_log(job_id, message):
    job = ResourceImportJob.objects.only('id', 'log_lines').get(pk=job_id)
    log_lines = list(job.log_lines or [])
    timestamp = timezone.now().strftime('%H:%M:%S')
    log_lines.append(f'[{timestamp}] {message}')
    ResourceImportJob.objects.filter(pk=job_id).update(log_lines=log_lines, updated_at=timezone.now())


def update_job(job_id, **updates):
    updates['updated_at'] = timezone.now()
    ResourceImportJob.objects.filter(pk=job_id).update(**updates)


def get_job_status(job_id):
    return ResourceImportJob.objects.values_list('status', flat=True).get(pk=job_id)


def ensure_job_not_aborted(job_id):
    if get_job_status(job_id) == 'aborted':
        raise ImportAbortedError('Import aborted by admin.')


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


def fetch_with_retry(url, *, stream=False, attempts=HTTP_RETRY_ATTEMPTS, timeout=(10, 90)):
    last_error = None

    for attempt in range(1, attempts + 1):
        try:
            response = requests.get(
                url,
                stream=stream,
                timeout=timeout,
                headers={'User-Agent': IMPORT_USER_AGENT},
            )
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            last_error = exc
            if attempt == attempts:
                break
            time.sleep(BACKOFF_BASE_SECONDS * attempt)

    raise last_error


def download_pdf_to_resource(resource, pdf_url):
    response = fetch_with_retry(
        pdf_url,
        stream=True,
        attempts=PDF_RETRY_ATTEMPTS,
        timeout=(10, 180),
    )

    content_type = (response.headers.get('Content-Type') or '').lower()
    if 'application/pdf' not in content_type and not urlparse(pdf_url).path.lower().endswith('.pdf'):
        raise ValueError('Imported file is not a PDF.')

    content_length = response.headers.get('Content-Length')
    if content_length:
        try:
            if int(content_length) > MAX_IMPORTED_PDF_SIZE:
                raise PdfTooLargeError(f'PDF exceeds the {MAX_IMPORTED_PDF_SIZE_MB} MB import limit.')
        except (TypeError, ValueError):
            pass

    total_size = 0
    chunks = []
    for chunk in response.iter_content(chunk_size=8192):
        if not chunk:
            continue
        total_size += len(chunk)
        if total_size > MAX_IMPORTED_PDF_SIZE:
            raise PdfTooLargeError(f'PDF exceeds the {MAX_IMPORTED_PDF_SIZE_MB} MB import limit.')
        chunks.append(chunk)

    resource.file.save(
        build_import_filename(resource.id, pdf_url),
        ContentFile(b''.join(chunks)),
        save=True,
    )


def is_probable_folder(url):
    path = (urlparse(url).path or '').lower()
    if not path:
        return True
    if path.endswith('/'):
        return True
    last_segment = path.rsplit('/', 1)[-1]
    return '.' not in last_segment


def collect_pdf_links(start_url, approved_domains, *, job_id=None):
    visited_pages = set()
    found_pdfs = []
    seen_pdfs = set()

    def walk_folder(folder_url, depth):
        if job_id:
            ensure_job_not_aborted(job_id)
        if depth > MAX_FOLDER_DEPTH:
            if job_id:
                append_job_log(job_id, f'Skipping deep folder: {folder_url}')
            return
        if folder_url in visited_pages or len(visited_pages) >= MAX_FOLDER_PAGES:
            return

        visited_pages.add(folder_url)
        if job_id:
            append_job_log(job_id, f'Scanning folder: {folder_url}')

        response = fetch_with_retry(folder_url, attempts=HTTP_RETRY_ATTEMPTS, timeout=(10, 90))
        content_type = (response.headers.get('Content-Type') or '').lower()
        parsed_folder = urlparse(folder_url)

        if 'application/pdf' in content_type or parsed_folder.path.lower().endswith('.pdf'):
            if folder_url not in seen_pdfs:
                seen_pdfs.add(folder_url)
                found_pdfs.append({
                    'url': folder_url,
                    'title': os.path.basename(parsed_folder.path) or 'Imported PDF',
                })
                if job_id:
                    append_job_log(job_id, f'Found direct PDF: {folder_url}')
            return

        parser = BasicPageParser()
        parser.feed(response.text)

        pdf_links = []
        folder_links = []

        for link in parser.links:
            absolute_url = urljoin(folder_url, link['href'])
            absolute_parsed = urlparse(absolute_url)
            if not is_allowed_domain(absolute_parsed.hostname, approved_domains):
                continue
            if absolute_url == folder_url:
                continue

            if absolute_parsed.path.lower().endswith('.pdf'):
                if absolute_url not in seen_pdfs:
                    seen_pdfs.add(absolute_url)
                    pdf_links.append({
                        'url': absolute_url,
                        'title': link['text'] or os.path.basename(absolute_parsed.path) or 'Imported PDF',
                    })
                    if job_id:
                        append_job_log(job_id, f'Queued PDF: {absolute_url}')
                continue

            if is_probable_folder(absolute_url):
                folder_links.append(absolute_url)

        found_pdfs.extend(pdf_links)

        for next_folder in folder_links:
            if job_id:
                ensure_job_not_aborted(job_id)
            walk_folder(next_folder, depth + 1)

    walk_folder(start_url, 0)
    return found_pdfs


def run_resource_import_job(job_id):
    close_old_connections()
    try:
        job = ResourceImportJob.objects.get(pk=job_id)
        approved_domains = list(
            ApprovedResourceDomain.objects.filter(is_active=True).values_list('domain', flat=True)
        )

        update_job(
            job_id,
            status='running',
            progress_current=0,
            progress_total=0,
            created_resources_count=0,
            started_at=timezone.now(),
            error_message='',
        )
        append_job_log(job_id, f'Starting import for {job.source_url}')
        ensure_job_not_aborted(job_id)

        parsed = urlparse(job.source_url)
        if not parsed.hostname or not is_allowed_domain(parsed.hostname, approved_domains):
            raise ValueError('This domain is not approved for importing.')

        try:
            response = fetch_with_retry(job.source_url, attempts=HTTP_RETRY_ATTEMPTS, timeout=(10, 90))
        except requests.RequestException as exc:
            raise ValueError(f'Failed to fetch URL: {exc}') from exc

        imported_count = 0
        content_type = (response.headers.get('Content-Type') or '').lower()

        if 'application/pdf' in content_type or parsed.path.lower().endswith('.pdf'):
            ensure_job_not_aborted(job_id)
            update_job(job_id, progress_total=1)
            if Resource.objects.filter(source_url=job.source_url).exists():
                append_job_log(job_id, f'Skipped duplicate PDF: {job.source_url}')
            else:
                resource = Resource.objects.create(
                    title=(os.path.basename(parsed.path) or 'Imported PDF')[:255],
                    description='Imported PDF resource',
                    subject=job.subject,
                    curriculum=job.curriculum,
                    grade_or_course=job.grade_or_course,
                    topic=job.topic,
                    resource_type='pdf',
                    external_url='',
                    source_url=job.source_url,
                    imported_at=timezone.now(),
                    visibility=job.visibility,
                    uploaded_by=job.created_by,
                )
                try:
                    ensure_job_not_aborted(job_id)
                    append_job_log(job_id, f'Downloading PDF: {job.source_url}')
                    download_pdf_to_resource(resource, job.source_url)
                    imported_count += 1
                    append_job_log(job_id, f'Imported PDF: {resource.title}')
                except PdfTooLargeError as exc:
                    append_job_log(job_id, f'Skipped oversized PDF: {job.source_url} ({exc})')
                    resource.delete()
                except Exception:
                    resource.delete()
                    raise
            update_job(job_id, progress_current=1, created_resources_count=imported_count)
        else:
            try:
                pdf_links = collect_pdf_links(job.source_url, approved_domains, job_id=job_id)
            except requests.RequestException as exc:
                raise ValueError(f'Failed while traversing folders: {exc}') from exc

            if not pdf_links:
                raise ValueError('No importable PDFs were found at this approved URL.')

            total = len(pdf_links)
            update_job(job_id, progress_total=total)
            append_job_log(job_id, f'Found {total} PDF file(s) to process.')

            processed = 0
            for pdf in pdf_links:
                ensure_job_not_aborted(job_id)
                pdf_url = pdf['url']
                processed += 1
                update_job(job_id, progress_current=processed)

                if Resource.objects.filter(source_url=pdf_url).exists():
                    append_job_log(job_id, f'Skipped duplicate PDF: {pdf_url}')
                    continue

                resource = Resource.objects.create(
                    title=(pdf['title'] or os.path.basename(urlparse(pdf_url).path) or 'Imported PDF')[:255],
                    description='Imported PDF resource',
                    subject=job.subject,
                    curriculum=job.curriculum,
                    grade_or_course=job.grade_or_course,
                    topic=job.topic,
                    resource_type='pdf',
                    external_url='',
                    source_url=pdf_url,
                    imported_at=timezone.now(),
                    visibility=job.visibility,
                    uploaded_by=job.created_by,
                )

                try:
                    ensure_job_not_aborted(job_id)
                    append_job_log(job_id, f'Downloading PDF {processed}/{total}: {pdf_url}')
                    download_pdf_to_resource(resource, pdf_url)
                    imported_count += 1
                    append_job_log(job_id, f'Imported PDF: {resource.title}')
                    update_job(job_id, created_resources_count=imported_count)
                except PdfTooLargeError as exc:
                    append_job_log(job_id, f'Skipped oversized PDF {processed}/{total}: {pdf_url} ({exc})')
                    resource.delete()
                except Exception:
                    resource.delete()
                    raise

        append_job_log(job_id, f'Import completed. Created {imported_count} resource(s).')
        final_job = ResourceImportJob.objects.get(pk=job_id)
        update_job(
            job_id,
            status='completed',
            progress_current=final_job.progress_total or final_job.progress_current,
            created_resources_count=imported_count,
            finished_at=timezone.now(),
        )
    except ImportAbortedError as exc:
        append_job_log(job_id, str(exc))
        update_job(job_id, status='aborted', error_message='', finished_at=timezone.now())
    except Exception as exc:
        append_job_log(job_id, f'Import failed: {exc}')
        update_job(job_id, status='failed', error_message=str(exc), finished_at=timezone.now())
    finally:
        close_old_connections()


class ApprovedResourceDomainViewSet(viewsets.ModelViewSet):
    queryset = ApprovedResourceDomain.objects.all()
    serializer_class = ApprovedResourceDomainSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['domain', 'description']
    ordering_fields = ['domain', 'created_at', 'updated_at']
    ordering = ['domain']


class ResourceImportJobViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ResourceImportJob.objects.select_related('created_by')
    serializer_class = ResourceImportJobSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['created_at', 'updated_at', 'finished_at']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def abort(self, request, pk=None):
        job = self.get_object()
        if job.status not in ('queued', 'running'):
            return Response(
                {'detail': 'Only queued or running imports can be aborted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        update_job(job.pk, status='aborted', finished_at=timezone.now(), error_message='')
        append_job_log(job.pk, f'Abort requested by {request.user.get_full_name() or request.user.username or "admin"}.')
        job.refresh_from_db()
        serializer = self.get_serializer(job)
        return Response(serializer.data, status=status.HTTP_200_OK)


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

        job = ResourceImportJob.objects.create(
            source_url=source_url,
            subject=subject or 'General',
            curriculum=curriculum or 'General',
            grade_or_course=grade_or_course or 'General',
            topic=topic or 'Imported',
            visibility=visibility if visibility in ('teacher', 'admin') else 'teacher',
            created_by=request.user,
            log_lines=['Import job queued.'],
        )

        thread = threading.Thread(target=run_resource_import_job, args=(job.pk,), daemon=True)
        thread.start()

        serializer = ResourceImportJobSerializer(job, context={'request': request})
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

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
