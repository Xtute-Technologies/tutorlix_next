from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum
from django.utils import timezone

from .models import (
    Category, Product, ProductImage, Offer, CourseBooking,
    StudentSpecificClass, CourseSpecificClass,
    Recording, Attendance, TestScore,
    Expense, ContactFormMessage
)
from .serializers import (
    CategorySerializer, CategoryListSerializer,
    ProductSerializer, ProductListSerializer, ProductImageSerializer,
    OfferSerializer, CourseBookingSerializer, StudentSpecificClassSerializer, CourseSpecificClassSerializer,
    RecordingSerializer, AttendanceSerializer, TestScoreSerializer, ExpenseSerializer, ContactFormMessageSerializer
)
from .permissions import (
    IsAdmin, IsAdminOrReadOnly, IsAdminOrTeacher, IsAdminOrTeacherOrReadOnly
)


# ============= Category ViewSet =============

class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Category CRUD operations.
    - List/Retrieve: All authenticated users
    - Create/Update/Delete: Admin only
    """
    queryset = Category.objects.all()
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'heading', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CategoryListSerializer
        return CategorySerializer
    
    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """Get all products in this category"""
        category = self.get_object()
        products = category.products.filter(is_active=True)
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)


# ============= Product ViewSet =============

class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product CRUD operations.
    - List/Retrieve: All authenticated users
    - Create/Update/Delete: Admin only
    """
    queryset = Product.objects.all()
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        return queryset
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def upload_images(self, request, pk=None):
        """Upload multiple images for a product (max 5)"""
        product = self.get_object()
        
        # Check current image count
        current_count = product.images.count()
        if current_count >= 5:
            return Response(
                {'error': 'Maximum 5 images allowed per product'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        images = request.FILES.getlist('images')
        if not images:
            return Response(
                {'error': 'No images provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(images) + current_count > 5:
            return Response(
                {'error': f'Can only upload {5 - current_count} more images'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_images = []
        for idx, image_file in enumerate(images):
            is_primary = current_count == 0 and idx == 0  # First image is primary if no images exist
            product_image = ProductImage.objects.create(
                product=product,
                image=image_file,
                is_primary=is_primary
            )
            uploaded_images.append(product_image)
        
        serializer = ProductImageSerializer(uploaded_images, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsAdmin])
    def set_primary_image(self, request, pk=None):
        """Set a specific image as primary"""
        product = self.get_object()
        image_id = request.data.get('image_id')
        
        if not image_id:
            return Response(
                {'error': 'image_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Remove primary from all images
            product.images.update(is_primary=False)
            # Set new primary
            image = product.images.get(id=image_id)
            image.is_primary = True
            image.save()
            
            return Response({'message': 'Primary image updated successfully'})
        except ProductImage.DoesNotExist:
            return Response(
                {'error': 'Image not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated, IsAdmin])
    def delete_image(self, request, pk=None):
        """Delete a specific product image"""
        product = self.get_object()
        image_id = request.data.get('image_id')
        
        if not image_id:
            return Response(
                {'error': 'image_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            image = product.images.get(id=image_id)
            was_primary = image.is_primary
            image.delete()
            
            # If deleted image was primary, set first remaining image as primary
            if was_primary:
                first_image = product.images.first()
                if first_image:
                    first_image.is_primary = True
                    first_image.save()
            
            return Response({'message': 'Image deleted successfully'})
        except ProductImage.DoesNotExist:
            return Response(
                {'error': 'Image not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured products (with discounts)"""
        featured = self.get_queryset().filter(
            is_active=True,
            discounted_price__isnull=False
        )[:10]
        serializer = ProductListSerializer(featured, many=True, context={'request': request})
        return Response(serializer.data)


# ============= Offer ViewSet =============

class OfferViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Offer/Voucher CRUD operations.
    - List/Retrieve: Authenticated users
    - Create/Update/Delete: Admin only
    """
    queryset = Offer.objects.all()
    serializer_class = OfferSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['product', 'is_active']
    search_fields = ['voucher_name', 'code']
    ordering_fields = ['created_at', 'valid_to']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter only valid offers if requested
        only_valid = self.request.query_params.get('only_valid', '').lower() == 'true'
        if only_valid:
            now = timezone.now()
            queryset = queryset.filter(
                is_active=True,
                valid_from__lte=now,
            ).filter(
                Q(valid_to__isnull=True) | Q(valid_to__gte=now)
            )
        return queryset
    
    @action(detail=False, methods=['post'])
    def validate_code(self, request):
        """Validate a coupon code"""
        code = request.data.get('code', '').upper()
        product_id = request.data.get('product_id')
        
        if not code:
            return Response(
                {'error': 'Code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            offer = Offer.objects.get(code=code, product_id=product_id)
            if offer.is_valid():
                return Response({
                    'valid': True,
                    'offer': OfferSerializer(offer, context={'request': request}).data
                })
            else:
                return Response({
                    'valid': False,
                    'message': 'This offer is no longer valid'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Offer.DoesNotExist:
            return Response({
                'valid': False,
                'message': 'Invalid coupon code'
            }, status=status.HTTP_404_NOT_FOUND)


# ============= Course Booking ViewSet =============

class CourseBookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Course Booking CRUD operations.
    - Admin/Seller: Full access
    - Student: Can view their own bookings
    """
    queryset = CourseBooking.objects.all()
    serializer_class = CourseBookingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['payment_status', 'student_status', 'sales_representative', 'student', 'product']
    search_fields = ['course_name', 'student__email', 'student__first_name', 'student__last_name', 'booked_by']
    ordering_fields = ['booking_date', 'final_amount', 'payment_date']
    ordering = ['-booking_date']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Students can only see their own bookings
        if user.role == 'student':
            return queryset.filter(student=user)
        
        # Sellers can see their own sales
        if user.role == 'seller':
            return queryset.filter(sales_representative=user)
        
        # Admin can see all
        return queryset
    
    def perform_create(self, serializer):
        # Auto-assign sales representative if not provided
        if not serializer.validated_data.get('sales_representative'):
            if self.request.user.role in ['admin', 'seller']:
                serializer.save(sales_representative=self.request.user)
            else:
                serializer.save()
        else:
            serializer.save()


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
    search_fields = ['name', 'time']
    ordering_fields = ['name', 'created_at']
    ordering = ['product', 'name']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Teachers can see classes they teach
        if user.role == 'teacher':
            return queryset.filter(teacher=user)
        
        # Admin can see all
        return queryset


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
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['date', 'student', 'status']
    search_fields = ['class_name', 'class_time', 'student__email', 'student__username']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Students can only see their own attendance
        if user.role == 'student':
            return queryset.filter(student=user)
        
        # Admin and Teachers can see all
        return queryset


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
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Students can only see their own scores
        if user.role == 'student':
            return queryset.filter(student=user)
        
        # Teachers can see scores they graded
        if user.role == 'teacher':
            return queryset.filter(teacher=user)
        
        # Admin can see all
        return queryset
    
    def perform_create(self, serializer):
        # Auto-assign teacher if not provided and user is teacher
        if not serializer.validated_data.get('teacher') and self.request.user.role == 'teacher':
            serializer.save(teacher=self.request.user)
        else:
            serializer.save()


# ============= Expense ViewSet =============

class ExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Expense CRUD operations.
    - Admin only
    """
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['date', 'created_by']
    search_fields = ['name', 'description']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get expense summary statistics"""
        queryset = self.get_queryset()
        
        # Filter by date range if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        total = queryset.aggregate(total=Sum('amount'))['total'] or 0
        count = queryset.count()
        
        return Response({
            'total_expenses': total,
            'expense_count': count,
            'start_date': start_date,
            'end_date': end_date
        })


# ============= Contact Form Message ViewSet =============

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
