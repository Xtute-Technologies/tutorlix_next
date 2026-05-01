import hashlib
from datetime import datetime

from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from lms.models import MicrosoftCourse
from lms.permissions import IsAdminOrReadOnly
from lms.serializers import MicrosoftCourseSerializer


ALLOWED_TYPES = ['modules', 'learningPaths', 'courses', 'certifications', 'appliedSkills']
DEFAULT_ALL_TYPES = ['learningPaths', 'modules', 'courses']
TYPE_LABELS = {
    'modules': 'Module',
    'learningPaths': 'Learning Path',
    'courses': 'Instructor-Led Course',
    'certifications': 'Certification',
    'appliedSkills': 'Applied Skill',
}


def resolve_microsoft_types(requested_type='learningPaths'):
    if requested_type == 'all':
        return DEFAULT_ALL_TYPES

    selected = [
        value.strip()
        for value in str(requested_type or '').split(',')
        if value.strip() in ALLOWED_TYPES
    ]
    return selected or ['learningPaths']


def as_string(value, default=''):
    if value is None:
        return default
    return str(value).strip()


def as_string_list(value):
    if not isinstance(value, list):
        return []
    return [as_string(item) for item in value if as_string(item)]


def as_int(value, default=0):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed >= 0 else default


def as_float(value, default=0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_catalog_datetime(value):
    if isinstance(value, datetime):
        parsed = value
    elif value:
        parsed = parse_datetime(str(value))
    else:
        parsed = None

    if parsed and timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def build_search_haystack(course):
    return ' '.join([
        course.title or '',
        course.summary or '',
        course.subtitle or '',
        course.uid or '',
        course.url or '',
        course.type_label or '',
        *as_string_list(course.levels),
        *as_string_list(course.roles),
        *as_string_list(course.products),
        *as_string_list(course.subjects),
    ]).lower()


def course_matches_level(course, level):
    if not level:
        return True
    return any(item.lower() == level for item in as_string_list(course.levels))


def catalog_sort_key(course):
    last_modified_ts = course.last_modified.timestamp() if course.last_modified else 0
    return (course.popularity or 0, last_modified_ts)


def build_source_key(item, locale, course_type):
    explicit_key = (
        as_string(item.get('uid'))
        or as_string(item.get('url'))
        or as_string(item.get('slug'))
        or f'{course_type}:{as_string(item.get("title"), "microsoft-course")}'
    )
    source_key = f'{locale}::{course_type}::{explicit_key}'
    source_key_hash = hashlib.sha256(source_key.encode('utf-8')).hexdigest()
    return source_key, source_key_hash


def normalize_course_item(item, *, default_locale, source, scraped, synced_at):
    course_type = as_string(item.get('type'), 'learningPaths')
    if course_type not in ALLOWED_TYPES:
        course_type = 'learningPaths'

    locale = as_string(item.get('locale'), default_locale or 'en-us').lower()
    source_key, source_key_hash = build_source_key(item, locale, course_type)
    url = as_string(item.get('url'))

    return {
        'uid': as_string(item.get('uid') or url)[:512],
        'source_key': source_key,
        'source_key_hash': source_key_hash,
        'slug': as_string(item.get('slug') or url or item.get('uid')),
        'title': as_string(item.get('title') or item.get('display_name'), 'Untitled Microsoft Learn item')[:500],
        'summary': as_string(item.get('summary')),
        'subtitle': as_string(item.get('subtitle')),
        'url': url[:1000],
        'icon_url': as_string(item.get('icon_url'))[:1000],
        'social_image_url': as_string(item.get('social_image_url'))[:1000],
        'duration_in_minutes': as_int(item.get('duration_in_minutes')),
        'levels': as_string_list(item.get('levels')),
        'roles': as_string_list(item.get('roles')),
        'products': as_string_list(item.get('products')),
        'subjects': as_string_list(item.get('subjects')),
        'learning_objectives': as_string_list(item.get('learningObjectives') or item.get('learning_objectives')),
        'prerequisites': as_string_list(item.get('prerequisites')),
        'last_modified': parse_catalog_datetime(item.get('last_modified')),
        'course_type': course_type,
        'type_label': as_string(item.get('typeLabel') or item.get('type_label'), TYPE_LABELS.get(course_type, course_type))[:120],
        'popularity': as_float(item.get('popularity')),
        'locale': locale[:20],
        'source_url': as_string(item.get('source') or source or url)[:1000],
        'scraped': bool(item.get('scraped', scraped)),
        'scraped_duration_label': as_string(item.get('scrapedDurationLabel') or item.get('scraped_duration_label'))[:120],
        'raw_payload': item if isinstance(item, dict) else {},
        'is_active': True,
        'synced_at': synced_at,
    }


def sync_token_allowed(request):
    configured_token = getattr(settings, 'MICROSOFT_CATALOG_SYNC_TOKEN', '')
    provided_token = (
        request.headers.get('X-Microsoft-Catalog-Sync-Token')
        or request.headers.get('X-Catalog-Sync-Token')
        or ''
    ).strip()

    if configured_token:
        return provided_token == configured_token

    user = getattr(request, 'user', None)
    if user and user.is_authenticated and getattr(user, 'role', None) == 'admin':
        return True

    return bool(settings.DEBUG)


class MicrosoftCourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MicrosoftCourse.objects.all()
    serializer_class = MicrosoftCourseSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'pk'

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        if self.action == 'sync_snapshot':
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = MicrosoftCourse.objects.all()
        if self.action in ('list', 'retrieve'):
            queryset = queryset.filter(is_active=True)
        return queryset

    def list(self, request, *args, **kwargs):
        locale = as_string(request.query_params.get('locale'), 'en-us').lower()
        requested_type = request.query_params.get('type') or 'learningPaths'
        q = as_string(request.query_params.get('q')).lower()
        level = as_string(request.query_params.get('level')).lower()
        page = max(1, as_int(request.query_params.get('page'), 1))
        page_size = min(24, max(1, as_int(request.query_params.get('pageSize') or request.query_params.get('page_size'), 12)))
        effective_types = resolve_microsoft_types(requested_type)

        base_queryset = self.get_queryset().filter(locale=locale, course_type__in=effective_types)
        stored_count = base_queryset.count()
        courses = list(base_queryset)

        if q:
            courses = [course for course in courses if q in build_search_haystack(course)]
        if level:
            courses = [course for course in courses if course_matches_level(course, level)]

        courses.sort(key=catalog_sort_key, reverse=True)
        total = len(courses)
        total_pages = max(1, (total + page_size - 1) // page_size)
        current_page = min(page, total_pages)
        start_index = (current_page - 1) * page_size
        page_items = courses[start_index:start_index + page_size]

        available_levels = sorted({
            item
            for course in courses
            for item in as_string_list(course.levels)
        })
        latest_sync = max((course.synced_at for course in courses if course.synced_at), default=None)

        serializer = self.get_serializer(page_items, many=True)
        return Response({
            'items': serializer.data,
            'total': total,
            'page': current_page,
            'pageSize': page_size,
            'totalPages': total_pages,
            'availableLevels': available_levels,
            'requestedTypes': effective_types,
            'source': 'tutorlix-database:microsoft-courses',
            'stale': True,
            'cachedAt': latest_sync.isoformat() if latest_sync else None,
            'storedCount': stored_count,
        })

    @action(detail=False, methods=['post'], url_path='sync-snapshot')
    def sync_snapshot(self, request):
        if not sync_token_allowed(request):
            return Response(
                {'detail': 'Microsoft catalog sync is not allowed.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        payload = request.data if isinstance(request.data, dict) else {}
        items = payload.get('items') if isinstance(payload.get('items'), list) else []
        if not items:
            return Response({'items': ['At least one Microsoft catalog item is required.']}, status=status.HTTP_400_BAD_REQUEST)

        default_locale = as_string(payload.get('locale'), 'en-us').lower()
        source = as_string(payload.get('source'))
        scraped = bool(payload.get('scraped', False))
        synced_at = parse_catalog_datetime(payload.get('cachedAt')) or timezone.now()

        created_count = 0
        updated_count = 0

        for item in items:
            if not isinstance(item, dict):
                continue
            defaults = normalize_course_item(
                item,
                default_locale=default_locale,
                source=source,
                scraped=scraped,
                synced_at=synced_at,
            )
            source_key_hash = defaults.pop('source_key_hash')
            _, created = MicrosoftCourse.objects.update_or_create(
                source_key_hash=source_key_hash,
                defaults=defaults,
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        return Response({
            'created': created_count,
            'updated': updated_count,
            'total': created_count + updated_count,
            'syncedAt': synced_at.isoformat(),
        }, status=status.HTTP_200_OK)
