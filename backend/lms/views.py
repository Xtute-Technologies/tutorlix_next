from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum
from django.utils import timezone
from django.contrib.auth import get_user_model
import json
import logging
from .payment import PaymentService
from django.conf import settings
logger = logging.getLogger(__name__)

User = get_user_model()

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
    permission_classes = [ IsAdminOrReadOnly]
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
    permission_classes = [ IsAdminOrReadOnly]
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

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get aggregated statistics for dashboard.
        Endpoint: /api/lms/bookings/statistics/
        """
        # queryset is already filtered by role via get_queryset
        queryset = self.get_queryset()
        
        total_bookings = queryset.count()
        paid_bookings = queryset.filter(payment_status='paid').count()
        pending_bookings = queryset.filter(payment_status='pending').count()
        
        # Calculate total revenue (sum of final_amount for paid bookings)
        revenue_data = queryset.filter(payment_status='paid').aggregate(
            total_revenue=Sum('final_amount')
        )
        total_revenue = revenue_data['total_revenue'] or 0
        
        return Response({
            'total_bookings': total_bookings,
            'paid_bookings': paid_bookings,
            'pending_bookings': pending_bookings,
            'total_revenue': total_revenue
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def seller_create_booking(self, request):
        """
        Custom endpoint for Seller/Admin to create booking for a student.
        If student doesn't exist, create one.
        Generate Razorpay payment link.
        """
        user = request.user
        if user.role not in ['admin', 'seller']:
             return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        
        # 1. Get or Create Student
        email = data.get('email')
        student_name = data.get('student_name')
        if not email:
            return Response({"email": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = User.objects.get(email=email)
            if student.role != 'student':
                 return Response({"email": "User exists but is not a student."}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            # Create new student
            password = data.get('password')
            phone = data.get('phone')
            state = data.get('state')
            
            if not password:
                return Response({"password": "Password is required for new student."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Split name
            names = student_name.split(' ', 1)
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else ''
            
            try:
                student = User.objects.create_user(
                    username=email, # Use email as username
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    phone=phone,
                    state=state,
                    role='student',
                    student_status='in_process'
                )
            except Exception as e:
                return Response({"detail": f"Error creating student: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Get Product and Calculate Price
        product_id = data.get('product')
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
             return Response({"product": "Invalid product ID."}, status=status.HTTP_400_BAD_REQUEST)
        
        price = product.price # Use base price

        # Use discounted price if available
        effective_price = product.discounted_price if product.discounted_price else product.price
        price = effective_price
        # Apply Coupon if present
        coupon_code = data.get('coupon_code')
        discount_amount = 0
        offer = None
        
        if coupon_code:
            try:
                offer = Offer.objects.get(code=coupon_code, is_active=True)
                # Basic validation
                if offer.is_valid():
                    discount_amount = offer.amount_off
                else:
                    return Response({"coupon_code": "Coupon is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
            except Offer.DoesNotExist:
                 return Response({"coupon_code": "Invalid coupon code."}, status=status.HTTP_400_BAD_REQUEST)
        
        final_amount = max(price - discount_amount, 0)
        
        # 3. Create Booking Record
        booking_data = {
            "student": student,
            "product": product,
            "course_name": product.name,
            "price": price,
            "coupon_code": offer,
            "discount_amount": discount_amount,
            "final_amount": final_amount,
            "sales_representative": user,
            "booked_by": user.get_full_name(),
            "payment_status": "pending",
            "student_status": "in_process"
        }
        
        booking = CourseBooking.objects.create(**booking_data)
        
            # 4. Generate Payment Link (Custom Frontend Page)
        booking.payment_link = f"{settings.FRONTEND_URL}/public-payment/{booking.booking_id}"
        booking.save()
        
        serializer = self.get_serializer(booking)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        # except Exception as e:
        #     return Response({
        #         "detail": "Booking created but error occurred.", 
        #         "error": str(e),
        #         "booking_id": booking.id
        #     }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='details_public/(?P<uuid>[^/.]+)')
    def get_payment_details(self, request, uuid=None):
        try:
            booking = CourseBooking.objects.get(booking_id=uuid)
        except CourseBooking.DoesNotExist:
            return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        if booking.payment_status == 'paid':
             return Response({
                 "booking": CourseBookingSerializer(booking).data,
                 "status": "paid"
             })

        service = PaymentService()
        order_id = booking.razorpay_order_id
        
        if not order_id:
            try:
                # Create Razorpay Order
                order = service.create_order(
                    amount=booking.final_amount, 
                    receipt=str(booking.id),
                    notes={"booking_uuid": str(booking.booking_id)}
                )
                booking.razorpay_order_id = order['id']
                booking.save()
                order_id = order['id']
            except Exception as e:
                logger.error(f"Error creating Razorpay order: {e}")
                return Response({"detail": "Error initializing payment."}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            "booking": CourseBookingSerializer(booking).data,
            "razorpay_order_id": order_id,
            "razorpay_key_id": settings.RAZORPAY_SECRET_ID, 
            "status": booking.payment_status
        })

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='verify_payment')
    def verify_payment(self, request):
        booking_uuid = request.data.get('booking_id')
        payment_id = request.data.get('razorpay_payment_id')
        order_id = request.data.get('razorpay_order_id')
        signature = request.data.get('razorpay_signature')
        
        if not all([booking_uuid, payment_id, order_id, signature]):
             return Response({"detail": "Missing parameters."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = CourseBooking.objects.get(booking_id=booking_uuid)
        except CourseBooking.DoesNotExist:
            return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
            
        service = PaymentService()
        params = {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        }
        
        if service.verify_order_signature(params):
            booking.payment_status = 'paid'
            booking.razorpay_payment_id = payment_id
            booking.razorpay_signature = signature
            booking.payment_date = timezone.now()
            booking.save()
            return Response({"status": "success"})
        else:
            booking.payment_status = 'failed'
            booking.save()
            return Response({"detail": "Signature verification failed."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='check_payment_status')
    def check_payment_status(self, request):
        payment_id = request.query_params.get('payment_id')
        if not payment_id:
             return Response({"detail": "Payment ID required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = CourseBooking.objects.get(razorpay_payment_id=payment_id)
            serializer = self.get_serializer(booking)
            return Response(serializer.data)
        except CourseBooking.DoesNotExist:
             return Response({"detail": "Booking not found for this payment ID."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='preview_price')
    def preview_price(self, request):
        """
        Preview price for a booking (no DB write). Returns effective price, discount, and final amount.
        """
        data = request.data
        product_id = data.get('product')
        coupon_code = data.get('coupon_code')
        if not product_id:
            return Response({"product": "Product is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"product": "Invalid product ID."}, status=status.HTTP_400_BAD_REQUEST)

        effective_price = product.discounted_price if product.discounted_price else product.price
        price = effective_price
        discount_amount = 0
        offer = None
        offer_valid = False
        offer_message = None
        if coupon_code:
            try:
                offer = Offer.objects.get(code=coupon_code, product=product, is_active=True)
                if offer.is_valid():
                    discount_amount = offer.amount_off
                    offer_valid = True
                else:
                    offer_message = "Coupon is invalid or expired."
            except Offer.DoesNotExist:
                offer_message = "Invalid coupon code."

        final_amount = max(price - discount_amount, 0)

        return Response({
            "effective_price": str(effective_price),
            "discount_amount": str(discount_amount),
            "final_amount": str(final_amount),
            "offer_message": offer_message,
            "has_discount": bool(product.discounted_price),
            "original_price": str(product.price),
            "discounted_price": str(product.discounted_price) if product.discounted_price else None
        })


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


class RazorpayWebhookView(APIView):
    """
    Webhook handler for Razorpay events
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        signature = request.headers.get('X-Razorpay-Signature')
        if not signature:
            logger.warning("Razorpay webhook called without signature")
            return Response({'error': 'No signature provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify signature
        payment_service = PaymentService()
        # Request body as string is needed for verification
        body_str = request.body.decode('utf-8')
        
        if not payment_service.verify_webhook_signature(body_str, signature):
            logger.error("Invalid Razorpay Webhook Signature")
            return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = json.loads(body_str)
            event = data.get('event')
            
            logger.info(f"Received Razorpay webhook event: {event}")
            
            if event == 'payment_link.paid':
                payload = data.get('payload', {})
                payment_link = payload.get('payment_link', {}).get('entity', {})
                
                # reference_id matches our Booking ID
                booking_ref = payment_link.get('reference_id')
                if booking_ref:
                    try:
                        booking = CourseBooking.objects.get(id=booking_ref)
                        
                        # Update status only if not already paid
                        if booking.payment_status != 'paid':
                            booking.payment_status = 'paid'
                            booking.payment_date = timezone.now()
                            
                            if booking.student_status == 'in_process':
                                booking.student_status = 'active'
                                
                            booking.save()
                            logger.info(f"Booking {booking_ref} marked as paid via webhook.")
                        else:
                            logger.info(f"Booking {booking_ref} was already paid.")
                            
                    except CourseBooking.DoesNotExist:
                        logger.error(f"Booking with ref {booking_ref} not found.")
                else:
                    logger.warning("No booking reference_id found in payment_link entity")
            
            return Response({'status': 'ok'})
            
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# --- Add these imports to your existing imports in views.py ---
from django.db.models import Sum
from .models import SellerExpense
from .serializers import SellerExpenseSerializer

# --- Add this Class to the end of your views.py ---

class SellerExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Seller Expense (Money given to sellers).
    - Admin: Full access (Create, Read, Update, Delete)
    - Seller: Read-only access to their own received expenses
    """
    queryset = SellerExpense.objects.all()
    serializer_class = SellerExpenseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['seller', 'date', 'created_by']
    search_fields = ['description', 'seller__email', 'seller__first_name', 'seller__last_name']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date']

    def get_permissions(self):
        """
        Custom permissions:
        - Create/Update/Delete: Admin only
        - List/Retrieve: Authenticated users (filtered by role in get_queryset)
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """
        - Admin: Sees all expenses
        - Seller: Sees only expenses where they are the 'seller' (recipient)
        """
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.role == 'admin':
            return queryset
        
        if user.role == 'seller':
            return queryset.filter(seller=user)
        
        # Other roles (e.g. students) shouldn't see these
        return queryset.none()

    def perform_create(self, serializer):
        """
        Auto-assign the creator
        """
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get total amount given to sellers.
        Supports filtering by date range and specific seller.
        """
        queryset = self.get_queryset()
        
        # Apply filters manually or rely on filter_backends if configured for the action
        # Here we manually apply basic filters for the summary calculation
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        seller_id = request.query_params.get('seller')

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # If admin wants to sum up for a specific seller
        if seller_id and request.user.role == 'admin':
            queryset = queryset.filter(seller_id=seller_id)

        total = queryset.aggregate(total=Sum('amount'))['total'] or 0
        count = queryset.count()
        
        return Response({
            'total_amount': total,
            'transaction_count': count,
            'start_date': start_date,
            'end_date': end_date
        })