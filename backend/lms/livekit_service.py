import json
import re
import time
from datetime import timedelta

import jwt
import requests
from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from .models import CourseBooking, CourseSpecificClass, StudentSpecificClass


COURSE_CLASS = 'course'
STUDENT_CLASS = 'student'
STUDENT_IDENTITY_RE = re.compile(r'^student-(\d+)$')


def livekit_configured():
    return all([
        settings.LIVEKIT_WS_URL,
        settings.LIVEKIT_API_KEY,
        settings.LIVEKIT_API_SECRET,
    ])


def require_livekit_config():
    if not livekit_configured():
        raise serializers.ValidationError({
            'livekit': 'LiveKit is not configured. Set LIVEKIT_WS_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.'
        })


def public_meeting_url(class_type, class_id):
    base_url = (settings.LIVEKIT_MEETING_BASE_URL or '').strip().rstrip('/')
    path = f'/meet/{class_type}/{class_id}'
    if not base_url:
        return path
    return f'{base_url}{path}'


def room_name_for_class(class_type, class_id):
    prefix = re.sub(r'[^a-zA-Z0-9_-]+', '-', settings.LIVEKIT_ROOM_PREFIX).strip('-') or 'tutorlix'
    return f'{prefix}-{class_type}-{class_id}'


def participant_identity_for_user(user):
    return f'{user.role}-{user.id}'


def _display_name(user):
    return user.get_full_name() or user.email or user.username or f'User {user.id}'


def _teacher_for_course_class(class_obj):
    if class_obj.teacher_id:
        return class_obj.teacher
    return class_obj.product.instructors.filter(role='teacher').first()


def _active_course_booking_exists(product, user):
    today = timezone.localdate()
    return CourseBooking.objects.filter(
        student=user,
        product=product,
        payment_status='paid',
    ).filter(
        Q(course_expiry_date__isnull=True) | Q(course_expiry_date__gte=today)
    ).exists()


def _course_join_allowed_for_student(class_obj, user):
    if not _active_course_booking_exists(class_obj.product, user):
        return False

    now = timezone.now()
    start = class_obj.start_time
    end = class_obj.end_time or (start + timedelta(hours=1))
    return (start - timedelta(minutes=5)) <= now <= end


def get_class_for_user(class_type, class_id, user, require_join_window=True):
    if class_type == COURSE_CLASS:
        class_obj = get_object_or_404(CourseSpecificClass.objects.select_related('product', 'teacher'), pk=class_id)

        if user.role == 'admin':
            return class_obj

        if user.role == 'teacher':
            teaches_class = class_obj.teacher_id == user.id
            teaches_product = class_obj.product.instructors.filter(id=user.id).exists()
            if teaches_class or teaches_product:
                return class_obj

        if user.role == 'student' and class_obj.is_active:
            if not require_join_window:
                if _active_course_booking_exists(class_obj.product, user):
                    return class_obj
            elif _course_join_allowed_for_student(class_obj, user):
                return class_obj

        raise PermissionDenied('You do not have access to this class room.')

    if class_type == STUDENT_CLASS:
        class_obj = get_object_or_404(
            StudentSpecificClass.objects.select_related('teacher').prefetch_related('students'),
            pk=class_id,
        )

        if user.role == 'admin':
            return class_obj

        if user.role == 'teacher' and class_obj.teacher_id == user.id:
            return class_obj

        if user.role == 'student' and class_obj.is_active and class_obj.students.filter(id=user.id).exists():
            return class_obj

        raise PermissionDenied('You do not have access to this class room.')

    raise serializers.ValidationError({'class_type': 'Class type must be "course" or "student".'})


def class_payload(class_type, class_obj):
    if class_type == COURSE_CLASS:
        teacher = _teacher_for_course_class(class_obj)
        return {
            'id': class_obj.id,
            'type': COURSE_CLASS,
            'name': class_obj.name,
            'product_name': class_obj.product.name,
            'start_time': class_obj.start_time,
            'end_time': class_obj.end_time,
            'teacher_name': _display_name(teacher) if teacher else '',
            'meeting_url': public_meeting_url(COURSE_CLASS, class_obj.id),
        }

    return {
        'id': class_obj.id,
        'type': STUDENT_CLASS,
        'name': class_obj.name,
        'time': class_obj.time,
        'teacher_name': _display_name(class_obj.teacher) if class_obj.teacher_id else '',
        'meeting_url': public_meeting_url(STUDENT_CLASS, class_obj.id),
    }


def generate_livekit_token(room_name, user):
    require_livekit_config()
    now = int(time.time())
    ttl = max(300, int(settings.LIVEKIT_TOKEN_TTL_SECONDS))
    identity = participant_identity_for_user(user)

    video_grant = {
        'room': room_name,
        'roomJoin': True,
        'canPublish': True,
        'canSubscribe': True,
        'canPublishData': True,
    }

    if user.role in ['admin', 'teacher']:
        video_grant['roomAdmin'] = True

    payload = {
        'iss': settings.LIVEKIT_API_KEY,
        'sub': identity,
        'name': _display_name(user),
        'nbf': now - 10,
        'exp': now + ttl,
        'video': video_grant,
        'metadata': json.dumps({'user_id': user.id, 'role': user.role}),
    }
    return jwt.encode(payload, settings.LIVEKIT_API_SECRET, algorithm='HS256')


def _livekit_api_base_url():
    api_url = (settings.LIVEKIT_API_URL or settings.LIVEKIT_URL or settings.LIVEKIT_WS_URL or '').strip().rstrip('/')
    if api_url.startswith('wss://'):
        return f'https://{api_url[6:]}'
    if api_url.startswith('ws://'):
        return f'http://{api_url[5:]}'
    return api_url


def _generate_livekit_room_admin_token(room_name):
    require_livekit_config()
    now = int(time.time())
    payload = {
        'iss': settings.LIVEKIT_API_KEY,
        'sub': 'tutorlix-livekit-admin',
        'nbf': now - 10,
        'exp': now + 300,
        'video': {
            'room': room_name,
            'roomAdmin': True,
        },
    }
    return jwt.encode(payload, settings.LIVEKIT_API_SECRET, algorithm='HS256')


def student_user_id_from_identity(identity):
    match = STUDENT_IDENTITY_RE.match(identity or '')
    if not match:
        return None
    return int(match.group(1))


def remove_livekit_participant(room_name, identity):
    require_livekit_config()
    token = _generate_livekit_room_admin_token(room_name)
    response = requests.post(
        f'{_livekit_api_base_url()}/twirp/livekit.RoomService/RemoveParticipant',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        },
        json={'room': room_name, 'identity': identity},
        timeout=10,
    )

    if response.ok:
        return

    try:
        body = response.json()
        message = body.get('msg') or body.get('message') or body.get('error') or response.text
    except ValueError:
        message = response.text

    raise serializers.ValidationError({
        'livekit': f'Could not remove participant from LiveKit room: {message or response.status_code}'
    })


def _removed_participant_cache_key(class_type, class_id, identity):
    return f'livekit:removed:{class_type}:{class_id}:{identity}'


def _removed_participant_timeout(class_type, class_obj):
    if class_type == COURSE_CLASS:
        now = timezone.now()
        end_time = class_obj.end_time or (class_obj.start_time + timedelta(hours=1))
        seconds = int((end_time + timedelta(minutes=30) - now).total_seconds())
        return max(300, seconds)
    return max(300, int(settings.LIVEKIT_TOKEN_TTL_SECONDS))


def mark_participant_removed(class_type, class_obj, identity):
    cache.set(
        _removed_participant_cache_key(class_type, class_obj.id, identity),
        True,
        _removed_participant_timeout(class_type, class_obj),
    )


def participant_is_removed(class_type, class_id, identity):
    return bool(cache.get(_removed_participant_cache_key(class_type, class_id, identity)))
