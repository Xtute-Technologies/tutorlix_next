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

class CheckUserView(APIView):
    """
    Check if user exists by email and return basic info.
    Used for booking creation forms.
    POST /api/auth/check-user/
    Body: { "email": "user@example.com" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            return Response({
                "exists": True,
                "user": {
                    "id": user.id,
                    "student_name": user.get_full_name() or user.username, # Mapping to form field 'student_name'
                    "email": user.email,
                    "phone": user.phone,
                    "state": user.state,
                }
            })
        except User.DoesNotExist:
            return Response({"exists": False}, status=status.HTTP_200_OK)


class UserListCreateView(generics.ListCreateAPIView):
    """
    GET: List all users (with filters)
    POST: Create a new user (Admin only)
    """
    permission_classes = [IsAuthenticated] # Changed from [IsAuthenticated, IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'role','first_name','status']
    ordering = ['-created_at']

    def create(self, request, *args, **kwargs):
        # Explicitly restrict creation to Admins
        if request.user.role != 'admin' and not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to create users."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        queryset = User.objects.all()

        # Role-based access control
        if user.role == 'teacher':
            # Teachers can only see students enrolled in their courses
            from lms.models import CourseBooking
            
            # Find students with paid bookings in courses taught by this teacher
            # filtering based on expired courses also int that api (TODO for later)
            student_ids = CourseBooking.objects.filter(
                product__instructors=user,
                payment_status='paid'
            ).values_list('student', flat=True).distinct()
            
            queryset = queryset.filter(id__in=student_ids)
            
        elif user.role != 'admin' and not user.is_staff:
            # Regular students cannot list users
            return User.objects.none()

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

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin' or user.is_staff:
            return User.objects.all()
        return User.objects.none()

    def perform_update(self, serializer):
        """
        ✅ Handle Manual Override Permission safely
        """
        instance = self.get_object()

        # If admin is trying to set manual override
        if "allow_manual_price" in serializer.validated_data:

            # ❌ Only sellers allowed
            if instance.role != "seller":
                raise ValidationError({
                    "allow_manual_price": "Manual override permission can only be set for sellers."
                })

        serializer.save()

    def perform_destroy(self, instance):
        # ❌ Prevent deleting yourself
        if instance.id == self.request.user.id:
            raise ValidationError("You cannot delete your own account.")
        instance.delete()