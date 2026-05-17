from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..livekit_service import (
    class_payload,
    generate_livekit_token,
    get_class_for_user,
    livekit_configured,
    public_meeting_url,
    room_name_for_class,
)


class LiveClassTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, class_type, class_id):
        class_obj = get_class_for_user(class_type, class_id, request.user)
        room_name = room_name_for_class(class_type, class_obj.id)
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
