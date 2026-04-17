from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend

from lms.models import ProfileType
from lms.permissions import IsAdminOrReadOnly
from lms.serializers import ProfileTypeSerializer


class ProfileTypeViewSet(viewsets.ModelViewSet):
    queryset = ProfileType.objects.all()
    serializer_class = ProfileTypeSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['title', 'slug', 'description']
    ordering_fields = ['order', 'title', 'created_at']
    ordering = ['order', 'title']
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            if user.is_authenticated and user.role == 'admin':
                return queryset
            return queryset.filter(is_active=True)
        return queryset
