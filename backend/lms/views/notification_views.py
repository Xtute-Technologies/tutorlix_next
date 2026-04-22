from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from lms.models import ForumNotification
from lms.serializers import ForumNotificationSerializer


class ForumNotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ForumNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ForumNotification.objects.filter(recipient=self.request.user).select_related('actor', 'post')

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        now = timezone.now()
        self.get_queryset().filter(is_read=False).update(is_read=True, read_at=now)
        return Response({'marked': True}, status=status.HTTP_200_OK)
