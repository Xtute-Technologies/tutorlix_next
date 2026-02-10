
from decimal import Decimal, InvalidOperation
from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Sum, Count, Q
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
try:
    from allauth.account.models import EmailAddress
except ImportError:
    EmailAddress = None

from lms.models import (
    Product, Offer, CourseBooking, PaymentHistory
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
        Aggregated statistics for dashboard (HISTORY-DRIVEN)
        Endpoint: /api/lms/bookings/statistics/
        """

        # bookings already role-filtered
        bookings_qs = self.get_queryset()

        # payment histories scoped to visible bookings
        payment_qs = PaymentHistory.objects.filter(
            booking__in=bookings_qs
        )

        # ---------------------------
        # CORE COUNTS
        # ---------------------------
        total_bookings = bookings_qs.count()

        # bookings with at least one SUCCESS payment
        paid_bookings = (
            bookings_qs
            .filter(payment_histories__status='paid')
            .distinct()
            .count()
        )

        # pending = no paid history & not expired
        pending_bookings = (
            bookings_qs
            .exclude(payment_histories__status='paid')
            .exclude(payment_status='expired')
            .count()
        )

        # ---------------------------
        # REVENUE (SOURCE OF TRUTH)
        # ---------------------------
        revenue_data = payment_qs.filter(
            status='paid'
        ).aggregate(
            total_revenue=Sum('amount')
        )

        total_revenue = revenue_data['total_revenue'] or 0

        # ---------------------------
        # OPTIONAL: EXTRA INTELLIGENCE
        # ---------------------------
        failed_attempts = payment_qs.filter(status='failed').count()
        successful_payments = payment_qs.filter(status='paid').count()
        total_sales = successful_payments + pending_bookings

        return Response({
            "total_bookings": total_bookings,
            "paid_bookings": paid_bookings,
            "pending_bookings": pending_bookings,
            "successful_payments": successful_payments,
            "failed_payment_attempts": failed_attempts,
            "total_revenue": total_revenue,
            "total_sales": total_sales
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

            # Auto-verify email for seller-created students
            if EmailAddress:
                EmailAddress.objects.create(
                    user=student,
                    email=email,
                    verified=True,
                    primary=True
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
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def expire_payment_link(self, request):
        user = request.user
        booking_id = request.data.get("booking_id")

        if not booking_id:
            return Response(
                {"booking_id": "Booking ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            old_booking = CourseBooking.objects.get(booking_id=booking_id)
        except CourseBooking.DoesNotExist:
            return Response(
                {"detail": "Invalid booking ID."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 🔐 ROLE CHECK
        if user.role not in ["admin", "seller"]:
            return Response(
                {"detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 🔐 OWNERSHIP CHECK
        if user.role == "seller" and old_booking.sales_representative != user:
            return Response(
                {"detail": "You cannot expire this payment link."},
                status=status.HTTP_403_FORBIDDEN
            )

        # ❌ Already expired
        if old_booking.payment_status == "expired":
            return Response(
                {"detail": "Payment link is already expired."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1️⃣ EXPIRE OLD BOOKING (DO NOT TOUCH PRICE)
        old_booking.payment_status = "expired"
        old_booking.payment_link = None
        old_booking.save(update_fields=["payment_status", "payment_link"])
        return Response(
            {
                "detail": "Payment link expired.",
                "old_booking_id": old_booking.booking_id,
            },
            status=status.HTTP_200_OK
        )


    @action(
    detail=False,
    methods=['get'],
    permission_classes=[AllowAny],
    url_path='details_public/(?P<uuid>[^/.]+)'
    )
    def get_payment_details(self, request, uuid=None):
        try:
            booking = CourseBooking.objects.get(booking_id=uuid)
        except CourseBooking.DoesNotExist:
            return Response(
                {"detail": "Booking not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        service = PaymentService()

        # 🔥 CRITICAL RULE:
        # Razorpay order MUST be recreated on every retry
        try:
            order = service.create_order(
                amount=booking.final_amount,  # ✅ frozen price from DB
                receipt=str(booking.id),
                notes={"booking_uuid": str(booking.booking_id)}
            )

            booking.razorpay_order_id = order["id"]
            booking.save(update_fields=["razorpay_order_id"])

        except Exception as e:
            logger.error(f"Razorpay order creation failed: {e}")
            return Response(
                {"detail": "Error initializing payment."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            "booking": CourseBookingSerializer(booking).data,
            "razorpay_order_id": booking.razorpay_order_id,
            "razorpay_key_id": settings.RAZORPAY_SECRET_ID,
            "status": booking.payment_status
        })

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[AllowAny],
        url_path='verify_payment'
    )
    def verify_payment(self, request):
        booking_uuid = request.data.get('booking_id')
        payment_id = request.data.get('razorpay_payment_id')
        order_id = request.data.get('razorpay_order_id')
        signature = request.data.get('razorpay_signature')

        # 1️⃣ Basic validation
        if not all([booking_uuid, payment_id, order_id, signature]):
            return Response(
                {"detail": "Missing parameters."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2️⃣ Fetch booking (IMMUTABLE PRICING)
        try:
            booking = CourseBooking.objects.get(booking_id=booking_uuid)
        except CourseBooking.DoesNotExist:
            return Response(
                {"detail": "Booking not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        service = PaymentService()
        params = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        }

        # 3️⃣ VERIFY SIGNATURE
        if not service.verify_order_signature(params):
            # ❌ FAILED ATTEMPT → CREATE PAYMENT HISTORY ROW
            PaymentHistory.objects.create(
                booking=booking,
                course_name=booking.course_name,
                amount=booking.final_amount,
                razorpay_order_id=order_id,
                razorpay_payment_id=payment_id,
                status="failed",
                sales_representative=booking.sales_representative,
            )

            booking.payment_status = "failed"
            booking.save(update_fields=["payment_status"])

            return Response(
                {"detail": "Signature verification failed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4️⃣ SUCCESS → CREATE PAYMENT HISTORY ROW
        PaymentHistory.objects.create(
            booking=booking,
            course_name=booking.course_name,
            amount=booking.final_amount,
            razorpay_order_id=order_id,
            razorpay_payment_id=payment_id,
            razorpay_signature=signature,
            status="paid",
            sales_representative=booking.sales_representative,
        )

        # 5️⃣ UPDATE BOOKING (ONLY STATUS FIELDS)
        booking.payment_status = "paid"
        booking.razorpay_payment_id = payment_id
        booking.razorpay_signature = signature
        booking.payment_date = timezone.now()

        # Course expiry (only once)
        if (
            booking.product.duration_days
            and booking.product.duration_days > 0
            and not booking.course_expiry_date
        ):
            booking.course_expiry_date = (
                timezone.localdate() + timedelta(days=booking.product.duration_days)
            )

        if booking.student_status == "in_process":
            booking.student_status = "active"

        booking.save()

        return Response({
            "status": "success",
            "booking_id": str(booking.booking_id),
            "final_amount": str(booking.final_amount),
            "payment_attempts": booking.payment_histories.count(),  # ✅ FK based
        })


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
    Razorpay Webhook Handler
    Handles:
    - payment.captured
    - order.paid
    - payment.failed
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        # 1️⃣ SIGNATURE CHECK
        signature = request.headers.get("X-Razorpay-Signature")
        if not signature:
            logger.warning("Webhook called without signature")
            return Response({"error": "No signature"}, status=400)

        body_str = request.body.decode("utf-8")

        service = PaymentService()
        if not service.verify_webhook_signature(body_str, signature):
            logger.error("Invalid Razorpay webhook signature")
            return Response({"error": "Invalid signature"}, status=400)

        # 2️⃣ PARSE PAYLOAD
        try:
            payload = json.loads(body_str)
            event = payload.get("event")
        except Exception as e:
            logger.error(f"Webhook JSON parse error: {e}")
            return Response({"error": "Invalid payload"}, status=400)

        logger.info(f"Razorpay webhook received: {event}")

        # 3️⃣ HANDLE EVENTS
        try:
            if event in ["payment.captured", "order.paid"]:
                return self._handle_payment_success(payload)

            if event in ["payment.failed"]:
                return self._handle_payment_failed(payload)

            # Ignore other events safely
            return Response({"status": "ignored"})

        except Exception as e:
            logger.exception("Webhook processing failed")
            return Response({"error": "Internal error"}, status=500)

    # ------------------------------------------------------------------
    # SUCCESS HANDLER
    # ------------------------------------------------------------------
    def _handle_payment_success(self, payload):
        payment = payload["payload"]["payment"]["entity"]
        notes = payment.get("notes", {})
        
        # Check if it is a Note Purchase
        if notes.get("type") == "note_purchase":
            return self._handle_note_payment_success(payload, notes)

        payment_id = payment.get("id")
        order_id = payment.get("order_id")
        amount = payment.get("amount") / 100  # paise → rupees
        booking_uuid = notes.get("booking_uuid")

        if not booking_uuid:
            logger.warning("No booking_uuid in payment notes")
            return Response({"status": "ignored"})

        try:
            booking = CourseBooking.objects.get(booking_id=booking_uuid)
        except CourseBooking.DoesNotExist:
            logger.error(f"Booking not found for UUID {booking_uuid}")
            return Response({"status": "booking_not_found"})

        # 🧠 IDEMPOTENCY CHECK
        if PaymentHistory.objects.filter(
            razorpay_payment_id=payment_id,
            status="paid"
        ).exists():
            logger.info("Duplicate webhook ignored (already processed)")
            return Response({"status": "duplicate"})

        # 4️⃣ CREATE PAYMENT HISTORY
        PaymentHistory.objects.create(
            booking=booking,
            course_name=booking.course_name,
            amount=booking.final_amount,
            razorpay_order_id=order_id,
            razorpay_payment_id=payment_id,
            status="paid",
            sales_representative=booking.sales_representative,
        )

        # 5️⃣ UPDATE BOOKING (SAFE)
        booking.payment_status = "paid"
        booking.payment_date = timezone.now()
        booking.razorpay_payment_id = payment_id
        booking.razorpay_order_id = order_id

        # Course expiry (ONLY once)
        if (
            booking.product.duration_days
            and booking.product.duration_days > 0
            and not booking.course_expiry_date
        ):
            booking.course_expiry_date = (
                timezone.localdate() + timedelta(days=booking.product.duration_days)
            )

        if booking.student_status == "in_process":
            booking.student_status = "active"

        booking.save()

        logger.info(f"Payment SUCCESS recorded for booking {booking.booking_id}")

        return Response({"status": "success"})

    def _handle_note_payment_success(self, payload, notes):
        """
        Handle successful payment for Note Purchase
        """
        from notes.models import NotePurchase, NoteAccess
        
        purchase_id = notes.get("purchase_id")
        payment = payload["payload"]["payment"]["entity"]
        payment_id = payment.get("id")
        order_id = payment.get("order_id")
        
        if not purchase_id:
             logger.warning("No purchase_id in note payment webhook")
             return Response({"status": "ignored"})
             
        try:
            purchase = NotePurchase.objects.get(purchase_id=purchase_id)
        except NotePurchase.DoesNotExist:
             logger.error(f"Note Purchase not found for ID {purchase_id}")
             return Response({"status": "purchase_not_found"})
             
        # Idempotency check 
        if purchase.payment_status == 'paid':
             logger.info("Duplicate note payment webhook ignored")
             return Response({"status": "duplicate"})
             
        # Update Purchase
        purchase.payment_status = 'paid'
        purchase.payment_date = timezone.now()
        purchase.razorpay_payment_id = payment_id
        purchase.razorpay_order_id = order_id
        purchase.razorpay_signature = "" # Webhook doesn't give signature used for verification usually in payload, skip or store if needed
        purchase.save()
        
        # Grant Access (Lifetime enforced by model save method now)
        try:
            acc, created = NoteAccess.objects.get_or_create(
                student=purchase.student,
                note=purchase.note,
                access_type='purchase',
                defaults={
                    'purchase': purchase,
                    'is_active': True
                }
            )
            # Ensure it is active and lifetime if retrieved
            acc.is_active = True
            acc.purchase = purchase
            acc.valid_until = None
            acc.save()
        except Exception as e:
            logger.error(f"Failed to grant access for verified purchase {purchase_id}: {e}")
        
        logger.info(f"Payment SUCCESS recorded for Note Purchase {purchase.purchase_id}")
        return Response({"status": "success"})


    # ------------------------------------------------------------------
    # FAILED HANDLER
    # ------------------------------------------------------------------
    def _handle_payment_failed(self, payload):
        payment = payload["payload"]["payment"]["entity"]
        notes = payment.get("notes", {})
        
        # Check if it is a Note Purchase
        if notes.get("type") == "note_purchase":
             return self._handle_note_payment_failed(payload, notes)

        payment_id = payment.get("id")
        order_id = payment.get("order_id")
        booking_uuid = notes.get("booking_uuid")

        if not booking_uuid:
            return Response({"status": "ignored"})

        try:
            booking = CourseBooking.objects.get(booking_id=booking_uuid)
        except CourseBooking.DoesNotExist:
            return Response({"status": "booking_not_found"})

        # Avoid duplicate failure rows
        if PaymentHistory.objects.filter(
            razorpay_payment_id=payment_id,
            status="failed"
        ).exists():
            return Response({"status": "duplicate"})

        PaymentHistory.objects.create(
            booking=booking,
            course_name=booking.course_name,
            amount=booking.final_amount,
            razorpay_order_id=order_id,
            razorpay_payment_id=payment_id,
            status="failed",
            sales_representative=booking.sales_representative,
        )

        booking.payment_status = "failed"
        booking.save(update_fields=["payment_status"])

        logger.info(f"Payment FAILED recorded for booking {booking.booking_id}")

        return Response({"status": "failed"})

    def _handle_note_payment_failed(self, payload, notes):
        """
        Handle failed payment for Note Purchase
        """
        from notes.models import NotePurchase
        
        purchase_id = notes.get("purchase_id")
        payment = payload["payload"]["payment"]["entity"]
        
        if not purchase_id:
             return Response({"status": "ignored"})
             
        try:
            purchase = NotePurchase.objects.get(purchase_id=purchase_id)
            if purchase.payment_status != 'paid': # Don't mark as failed if already paid
                purchase.payment_status = 'failed'
                purchase.save()
        except NotePurchase.DoesNotExist:
             pass 
             
        return Response({"status": "success"})