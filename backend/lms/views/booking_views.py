
from decimal import Decimal, InvalidOperation
from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
import json
import logging
from lms.payment import PaymentService
from django.conf import settings
logger = logging.getLogger(__name__)

User = get_user_model()

from lms.models import (
    Product, Offer, CourseBooking
)
from lms.serializers import (
    CourseBookingSerializer
)


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
        user = request.user

        # 🔐 Role check
        if user.role not in ['admin', 'seller']:
            return Response(
                {"detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data

        # 1️⃣ STUDENT
        email = data.get('email')
        student_name = data.get('student_name')

        if not email:
            return Response(
                {"email": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            student = User.objects.get(email=email)
            if student.role != 'student':
                return Response(
                    {"email": "User exists but is not a student."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except User.DoesNotExist:
            password = data.get('password')
            phone = data.get('phone')
            state = data.get('state')

            if not password:
                return Response(
                    {"password": "Password is required."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            first_name, *last = student_name.split(' ', 1)
            last_name = last[0] if last else ''

            student = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                state=state,
                role='student',
                student_status='in_process'
            )

        # 2️⃣ PRODUCT
        product_id = data.get('product')
        if not product_id:
            return Response(
                {"product": "Product is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"product": "Invalid product ID."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3️⃣ BASE PRICE
        base_price = Decimal(
            product.discounted_price if product.discounted_price else product.price
        )

        # 4️⃣ MANUAL DISCOUNT
        try:
            manual_discount = Decimal(data.get('manual_price'))
        except (InvalidOperation, TypeError):
            manual_discount = Decimal(0)

        if manual_discount < 0:
            manual_discount = Decimal(0)

        # 🔐 PERMISSION CHECK (MOST IMPORTANT)
        if manual_discount > 0 and not user.allow_manual_price:
            return Response(
                {
                    "manual_price": "You are not allowed to apply manual discount."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # 🔐 HARD 50% LIMIT
        max_manual_discount = base_price * Decimal("0.5")

        if manual_discount > max_manual_discount:
            return Response(
                {
                    "manual_price": (
                        f"Manual discount cannot exceed 50% of price. "
                        f"Max allowed: ₹{max_manual_discount}"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 5️⃣ COUPON (independent)
        coupon_code = data.get('coupon_code')
        coupon_discount = Decimal(0)
        offer = None

        if coupon_code:
            try:
                offer = Offer.objects.get(
                    code=coupon_code,
                    product=product,
                    is_active=True
                )
                if not offer.is_valid():
                    return Response(
                        {"coupon_code": "Coupon is invalid or expired."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                coupon_discount = Decimal(offer.amount_off)
            except Offer.DoesNotExist:
                return Response(
                    {"coupon_code": "Invalid coupon code."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 6️⃣ FINAL CALCULATION
        final_amount = max(
            base_price - coupon_discount - manual_discount,
            Decimal(0)
        )

        total_discount = coupon_discount + manual_discount

        # 7️⃣ CREATE BOOKING
        booking = CourseBooking.objects.create(
            student=student,
            product=product,
            course_name=product.name,
            price=base_price,
            coupon_code=offer,
            manual_discount=manual_discount,
            discount_amount=total_discount,
            final_amount=final_amount,
            sales_representative=user,
            booked_by=user.get_full_name(),
            payment_status="pending",
            student_status="in_process"
        )

        booking.payment_link = (
            f"{settings.FRONTEND_URL}/public-payment/{booking.booking_id}"
        )
        booking.save()

        serializer = self.get_serializer(booking)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='details_public/(?P<uuid>[^/.]+)')
    def get_payment_details(self, request, uuid=None):
        try:
            # 1. Fetch the booking referenced in the URL
            original_booking = CourseBooking.objects.get(booking_id=uuid)
        except CourseBooking.DoesNotExist:
            return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        booking = original_booking

        # 2. Logic for handling already paid/completed links
        if booking.payment_status in ['paid', 'completed', 'cancelled', 'refunded']:
            # Check if there is already a "retry" or "pending" version of this specific purchase
            recent_pending = CourseBooking.objects.filter(
                student=booking.student, 
                product=booking.product, 
                payment_status='pending'
            ).order_by('-created_at').first()

            if recent_pending:
                booking = recent_pending
            else:
                # CLONE: Create a fresh booking with CURRENT pricing
                product = booking.product
                effective_price = product.discounted_price if product.discounted_price else product.price
                
                booking = CourseBooking.objects.create(
                    student=booking.student,
                    product=product,
                    course_name=product.name, 
                    price=effective_price, 
                    sales_representative=booking.sales_representative,
                    booked_by=booking.sales_representative.get_full_name() if booking.sales_representative else "System",
                    payment_status="pending",
                    student_status="in_process",
                    final_amount=effective_price, 
                    discount_amount=Decimal('0.00'), 
                    manual_discount=Decimal('0.00'),
                    coupon_code=None,
                    razorpay_order_id=None  # CRITICAL: Force a new order creation
                )

        # 3. Handle Razorpay Order Creation
        service = PaymentService()
        
        # If order doesn't exist OR if price in DB doesn't match Razorpay (edge case), 
        # we generate a new order.
        if not booking.razorpay_order_id:
            try:
                # amount must be in paise for Razorpay (amount * 100)
                # Ensure your PaymentService handles the Decimal conversion inside create_order
                order = service.create_order(
                    amount=booking.final_amount, 
                    receipt=str(booking.id),
                    notes={"booking_uuid": str(booking.booking_id)}
                )
                booking.razorpay_order_id = order['id']
                booking.save()
            except Exception as e:
                logger.error(f"Error creating Razorpay order: {e}")
                return Response({"detail": "Error initializing payment."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 4. Return the (potentially new) booking details
        return Response({
            "booking": CourseBookingSerializer(booking).data,
            "razorpay_order_id": booking.razorpay_order_id,
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
            
            # Set Course Expiry
            if booking.product.duration_days and booking.product.duration_days > 0:
                booking.course_expiry_date = timezone.localdate() + timedelta(days=booking.product.duration_days)
            
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
        manual_price = data.get('manual_price')
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
        manual_discount_message = None
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
        try:
            manual_discount = Decimal(manual_price)
        except (InvalidOperation, TypeError):
            manual_discount = Decimal(0)

        base_for_manual = product.discounted_price if product.discounted_price else product.price
        min_manual_discount = Decimal(base_for_manual) * Decimal("0.5")

        if manual_discount > min_manual_discount:
            print(manual_discount)
            print(min_manual_discount)
            manual_discount = Decimal(0)
            manual_discount_message = "Cannot be Greater than ₹" + str(min_manual_discount)
        final_amount = max(price - discount_amount - manual_discount, 0)

        return Response({
            "effective_price": str(effective_price),
            "discount_amount": str(discount_amount),
            "manual_price": str(manual_discount),
            "final_amount": str(final_amount),
            "offer_message": offer_message,
            "manual_discount_message": manual_discount_message,
            "has_discount": bool(product.discounted_price),
            "original_price": str(product.price),
            "discounted_price": str(product.discounted_price) if product.discounted_price else None
        })


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
                            
                            # Set Course Expiry
                            if booking.product.duration_days and booking.product.duration_days > 0:
                                booking.course_expiry_date = (timezone.now() + timedelta(days=booking.product.duration_days)).date()
                            
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


