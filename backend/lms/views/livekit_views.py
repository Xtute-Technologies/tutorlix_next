from django.conf import settings
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from ..livekit_service import (
    class_payload,
    generate_livekit_token,
    get_class_for_user,
    livekit_configured,
    mark_participant_removed,
    participant_identity_for_user,
    participant_is_removed,
    public_meeting_url,
    remove_livekit_participant,
    room_name_for_class,
    student_user_id_from_identity,
)


class LiveClassTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, class_type, class_id):
        class_obj = get_class_for_user(class_type, class_id, request.user)
        room_name = room_name_for_class(class_type, class_obj.id)
        identity = participant_identity_for_user(request.user)
        if request.user.role == 'student' and participant_is_removed(class_type, class_obj.id, identity):
            raise PermissionDenied('You have been removed from this live class.')

        token = generate_livekit_token(room_name, request.user)
        can_record = request.user.role in ['admin', 'teacher']

        return Response({
            'server_url': settings.LIVEKIT_WS_URL,
            'room_name': room_name,
            'token': token,
            'can_record': can_record,
            'class': class_payload(class_type, class_obj),
            'meeting_url': public_meeting_url(class_type, class_obj.id),
            'livekit_configured': livekit_configured(),
            'local_recording': can_record,
            'concurrent_class_target': settings.LIVEKIT_MIN_CONCURRENT_CLASSES,
        })


class LiveClassParticipantRemoveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, class_type, class_id):
        if request.user.role not in ['admin', 'teacher']:
            raise PermissionDenied('Only teachers and admins can remove students from a live class.')

        class_obj = get_class_for_user(class_type, class_id, request.user, require_join_window=False)
        identity = (request.data.get('identity') or '').strip()
        student_user_id = student_user_id_from_identity(identity)

        if not student_user_id:
            raise serializers.ValidationError({'identity': 'Only student participants can be removed.'})

        room_name = room_name_for_class(class_type, class_obj.id)
        remove_livekit_participant(room_name, identity)
        mark_participant_removed(class_type, class_obj, identity)

        return Response({
            'detail': 'Student removed from live class.',
            'identity': identity,
        })
