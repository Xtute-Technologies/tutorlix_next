from django.conf import settings
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from ..ai_tutor_service import review_ai_tutor_code
from ..livekit_service import (
    active_ai_tutor_course_bookings,
    ai_tutor_course_payload,
    ai_tutor_session_metadata,
    class_payload,
    dispatch_ai_tutor_agent,
    generate_livekit_token,
    get_ai_tutor_course_booking,
    get_class_for_user,
    livekit_configured,
    mark_participant_removed,
    participant_identity_for_user,
    participant_is_removed,
    public_meeting_url,
    remove_livekit_participant,
    room_name_for_ai_tutor,
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


class AITutorCourseListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'student':
            raise PermissionDenied('AI tutor calls are available for student accounts only.')

        courses = []
        seen_product_ids = set()
        for booking in active_ai_tutor_course_bookings(request.user):
            if booking.product_id in seen_product_ids:
                continue
            seen_product_ids.add(booking.product_id)
            courses.append(ai_tutor_course_payload(booking))

        return Response({
            'courses': courses,
            'livekit_configured': livekit_configured(),
            'agent_name': settings.LIVEKIT_AI_AGENT_NAME,
            'groq_configured': bool(settings.GROQ_API_KEY),
        })


class AITutorCourseTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, product_id):
        booking = get_ai_tutor_course_booking(product_id, request.user)
        room_name = room_name_for_ai_tutor(booking.product_id, request.user.id)
        metadata = ai_tutor_session_metadata(booking, request.user, room_name)
        token = generate_livekit_token(room_name, request.user)
        agent_dispatch = dispatch_ai_tutor_agent(room_name, metadata)

        return Response({
            'server_url': settings.LIVEKIT_WS_URL,
            'room_name': room_name,
            'token': token,
            'course': ai_tutor_course_payload(booking),
            'agent_dispatch': agent_dispatch,
            'livekit_configured': livekit_configured(),
            'agent_name': settings.LIVEKIT_AI_AGENT_NAME,
            'groq_configured': bool(settings.GROQ_API_KEY),
        })


class AITutorCodeReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, product_id):
        booking = get_ai_tutor_course_booking(product_id, request.user)
        result = review_ai_tutor_code(
            booking=booking,
            code=request.data.get('code', ''),
            language=request.data.get('language', 'python'),
            goal=request.data.get('goal', ''),
        )
        return Response(result)
