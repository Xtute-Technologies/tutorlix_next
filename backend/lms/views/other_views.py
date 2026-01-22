from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
import logging
logger = logging.getLogger(__name__)

User = get_user_model()

from lms.models import (
    ContactFormMessage
)
from ..serializers import (
    ContactFormMessageSerializer
)
from ..permissions import (
    IsAdmin
)

class ContactFormMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Contact Form Message CRUD operations.
    - Admin: Full access
    - Others: Can only create (submit contact form) - no authentication required
    """
    queryset = ContactFormMessage.objects.all()
    serializer_class = ContactFormMessageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'assigned_to']
    search_fields = ['name', 'email', 'subject', 'message']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_permissions(self):
        # Anyone can create (submit contact form) - no authentication required
        if self.action == 'create':
            return []
        # Only admin for other actions
        return [IsAuthenticated(), IsAdmin()]
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsAdmin])
    def assign(self, request, pk=None):
        """Assign message to a user"""
        message = self.get_object()
        assigned_to_id = request.data.get('assigned_to')
        
        if not assigned_to_id:
            return Response(
                {'error': 'assigned_to is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(id=assigned_to_id)
            message.assigned_to = user
            message.status = 'in_progress'
            message.save()
            
            serializer = self.get_serializer(message)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsAdmin])
    def update_status(self, request, pk=None):
        """Update message status"""
        message = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_status not in dict(ContactFormMessage.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message.status = new_status
        message.save()
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)

