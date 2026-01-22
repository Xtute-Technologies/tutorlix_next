from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
import json
import logging
from ..payment import PaymentService
from django.conf import settings
logger = logging.getLogger(__name__)

User = get_user_model()

from ..models import (
    Category, Product, ProductImage, Offer, CourseBooking,
    StudentSpecificClass, CourseSpecificClass,
    Recording, Attendance, TestScore,
    Expense, ContactFormMessage
)
from ..serializers import (
    CategorySerializer, CategoryListSerializer,
    ProductSerializer, ProductListSerializer, ProductImageSerializer,
    OfferSerializer, CourseBookingSerializer, StudentSpecificClassSerializer, CourseSpecificClassSerializer,
    RecordingSerializer, AttendanceSerializer, TestScoreSerializer, ExpenseSerializer, ContactFormMessageSerializer
)
from ..permissions import (
    IsAdmin, IsAdminOrReadOnly, IsAdminOrTeacher, IsAdminOrTeacherOrReadOnly
)
from rest_framework import serializers # Import serializers for ValidationError


# ============= Main Course ViewSet =============

# ============= Student Specific Class ViewSet =============

class StudentSpecificClassViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Student Specific Class CRUD operations.
    - Admin/Teacher: Full access
    - Student: Can view classes they're enrolled in
    """
    queryset = StudentSpecificClass.objects.all()
    serializer_class = StudentSpecificClassSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['teacher', 'is_active']
    search_fields = ['name', 'time']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'teacher':
             serializer.save(teacher=user, is_active=True)
        else:
            serializer.save()

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Students can only see their own classes
        if user.role == 'student':
            return queryset.filter(students=user)
        
        # Teachers can see classes they teach
        if user.role == 'teacher':
            return queryset.filter(teacher=user)
        
        # Admin can see all
        return queryset
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminOrTeacher])
    def add_students(self, request, pk=None):
        """Add multiple students to a class"""
        class_obj = self.get_object()
        student_ids = request.data.get('student_ids', [])
        
        if not student_ids:
            return Response(
                {'error': 'student_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        students = User.objects.filter(id__in=student_ids, role='student')
        
        class_obj.students.add(*students)
        
        serializer = self.get_serializer(class_obj)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminOrTeacher])
    def remove_students(self, request, pk=None):
        """Remove multiple students from a class"""
        class_obj = self.get_object()
        student_ids = request.data.get('student_ids', [])
        
        if not student_ids:
            return Response(
                {'error': 'student_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        students = User.objects.filter(id__in=student_ids, role='student')
        
        class_obj.students.remove(*students)
        
        serializer = self.get_serializer(class_obj)
        return Response(serializer.data)


# ============= Course Specific Class ViewSet =============

class CourseSpecificClassViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Course Specific Class CRUD operations.
    - Admin/Teacher: Full access
    - Others: Read only
    """
    queryset = CourseSpecificClass.objects.all()
    serializer_class = CourseSpecificClassSerializer
    permission_classes = [IsAuthenticated, IsAdminOrTeacherOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['product', 'teacher', 'is_active']
    search_fields = ['name']
    ordering_fields = ['name', 'start_time', 'created_at']
    ordering = ['product', 'start_time']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Students can see classes for products they have booked (even if expired)
        if user.role == 'student':
            # Get all paid bookings regardless of expiry
            paid_bookings = CourseBooking.objects.filter(
                student=user,
                payment_status='paid'
            )
            product_ids = paid_bookings.values_list('product_id', flat=True)
            return queryset.filter(product_id__in=product_ids, is_active=True)

        # Teachers can see classes they teach OR classes for products they instruct
        if user.role == 'teacher':
            return queryset.filter(
                Q(teacher=user) | Q(product__instructors=user)
            ).distinct()
        
        # Admin can see all
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'teacher':
             product = serializer.validated_data.get('product')
             # Validate product ownership
             if product and not product.instructors.filter(id=user.id).exists():
                 raise serializers.ValidationError({"product": "You can only create classes for courses you instruct."})
             
             # Auto-assign teacher if not provided
             if not serializer.validated_data.get('teacher'):
                 serializer.save(teacher=user)
             else:
                 serializer.save()
        else:
             serializer.save()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.user.role == 'student':
            # Create a map of product_id -> expiry_date
            bookings = CourseBooking.objects.filter(
                student=self.request.user, 
                payment_status='paid'
            )
            expiry_map = {b.product_id: b.course_expiry_date for b in bookings}
            context['product_expiry_map'] = expiry_map
        return context


# ============= Recording ViewSet =============

class RecordingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Recording CRUD operations.
    - Admin/Teacher: Full access
    - Student: Can view recordings assigned to them
    """
    queryset = Recording.objects.all()
    serializer_class = RecordingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['teacher']
    search_fields = ['class_name', 'note']
    ordering_fields = ['uploaded_at', 'created_at']
    ordering = ['-uploaded_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Students can only see recordings assigned to them
        if user.role == 'student':
            return queryset.filter(students=user)
        
        # Teachers can see recordings they uploaded
        if user.role == 'teacher':
            return queryset.filter(teacher=user)
        
        # Admin can see all
        return queryset
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminOrTeacher])
    def add_students(self, request, pk=None):
        """Add multiple students to a recording"""
        recording = self.get_object()
        student_ids = request.data.get('student_ids', [])
        
    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'teacher':
             serializer.save(teacher=user)
        else:
            serializer.save()
        
        if not student_ids:
            return Response(
                {'error': 'student_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        students = User.objects.filter(id__in=student_ids, role='student')
        
        recording.students.add(*students)
        
        serializer = self.get_serializer(recording)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminOrTeacher])
    def remove_students(self, request, pk=None):
        """Remove multiple students from a recording"""
        recording = self.get_object()
        student_ids = request.data.get('student_ids', [])
        
        if not student_ids:
            return Response(
                {'error': 'student_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        students = User.objects.filter(id__in=student_ids, role='student')
        
        recording.students.remove(*students)
        
        serializer = self.get_serializer(recording)
        return Response(serializer.data)


# ============= Attendance ViewSet =============

class AttendanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Attendance CRUD operations.
    - Admin/Teacher: Full access
    - Student: Can view their own attendance
    """
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated] # Should be IsAdminOrTeacher for write? Check default
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['date', 'student', 'status']
    search_fields = ['class_name', 'class_time', 'student__email', 'student__username']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']
    
    def get_permissions(self):
        # Allow students to view, but only Admin/Teacher to create/edit
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminOrTeacher()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Students can only see their own attendance
        if user.role == 'student':
            return queryset.filter(student=user)
        
        # Teachers can see attendance for students in their products
        if user.role == 'teacher':
             return queryset.filter(student__course_bookings__product__instructors=user).distinct()
        
        # Admin can see all
        return queryset
    
    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'teacher':
            student = serializer.validated_data.get('student')
            # Check if student is in any of their courses
            # We check if there is ANY paid booking for this student in a course taught by this teacher
            has_booking = CourseBooking.objects.filter(
                student=student,
                payment_status='paid',
                product__instructors=user
            ).exists()
            
            if not has_booking:
                 raise serializers.ValidationError({"student": "You can only mark attendance for students enrolled in your courses."})
        
        serializer.save()


# ============= Test Score ViewSet =============

class TestScoreViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Test Score CRUD operations.
    - Admin/Teacher: Full access
    - Student: Can view their own scores
    """
    queryset = TestScore.objects.all()
    serializer_class = TestScoreSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['student', 'teacher', 'test_date']
    search_fields = ['test_name', 'student__email', 'student__first_name', 'student__last_name']
    ordering_fields = ['test_date', 'marks_obtained', 'created_at']
    ordering = ['-test_date']
    
    def get_permissions(self):
        # Allow students to view, but only Admin/Teacher to create/edit
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminOrTeacher()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Students can only see their own scores
        if user.role == 'student':
            return queryset.filter(student=user)
        
        # Teachers can see scores they graded OR scores for students in their products
        if user.role == 'teacher':
             return queryset.filter(student__course_bookings__product__instructors=user).distinct()
        
        # Admin can see all
        return queryset
    
    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'teacher':
             # Validate student
            student = serializer.validated_data.get('student')
            has_booking = CourseBooking.objects.filter(
                student=student,
                payment_status='paid',
                product__instructors=user
            ).exists()
            
            if not has_booking:
                 raise serializers.ValidationError({"student": "You can only add scores for students enrolled in your courses."})

            if not serializer.validated_data.get('teacher'):
                 serializer.save(teacher=user)
            else:
                 serializer.save()
        else:
            serializer.save()

