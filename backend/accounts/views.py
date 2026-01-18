from rest_framework import status, generics,filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.views import APIView
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from .serializers import UserDetailSerializer,CreateUserSerializer, ChangePasswordSerializer
User = get_user_model()


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or update user profile
    GET /api/auth/profile/
    PATCH /api/auth/profile/
    """
    serializer_class = UserDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """
    Change user password
    POST /api/auth/change-password/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data,context={'request': request})
        
        if serializer.is_valid():
            user = request.user
            
            # Check old password
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'old_password': ['Wrong password.']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set new password
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response(
                {'detail': 'Password updated successfully.'},
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserListCreateView(generics.ListCreateAPIView):
    """
    GET: List all users (with filters)
    POST: Create a new user (Admin only)
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'role']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = User.objects.all()
        role = self.request.query_params.get('role', None)
        if role and role != 'all':
            queryset = queryset.filter(role=role)
        return queryset

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateUserSerializer # Needs password handling
        return UserDetailSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET, PATCH, DELETE operations for a specific user ID
    /api/auth/users/<id>/
    """
    queryset = User.objects.all()
    serializer_class = UserDetailSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field = 'pk'
    
    def perform_destroy(self, instance):
        # Optional: Prevent deleting yourself
        if instance.id == self.request.user.id:
            raise ValidationError("You cannot delete your own account.")
        instance.delete()