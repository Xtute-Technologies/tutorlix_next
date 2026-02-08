from decimal import Decimal
from rest_framework import serializers
from django.contrib.auth import get_user_model
from accounts.serializers import SimpleUserSerializer
from .models import (
    Category, PaymentHistory, Product, ProductImage, Offer, CourseBooking,
    StudentSpecificClass, CourseSpecificClass,
    Recording, Attendance, TestScore,
    Expense, ContactFormMessage,SellerExpense, TeacherExpense, ProductLead
)

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for nested serialization"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role']
        read_only_fields = fields
    
    def get_full_name(self, obj):
        return obj.get_full_name()


# ============= Category Serializers =============

class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'heading', 'description', 'products_count', 'created_at', 'updated_at', 'profileTypes']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_products_count(self, obj):
        return obj.products.count()


class CategoryListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    class Meta:
        model = Category
        fields = ['id', 'name', 'heading', 'profileTypes']


# ============= Product Serializers =============

class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'is_primary', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None
            # Fallback: returns relative path if request context is missing

class InstructorSerializer(serializers.ModelSerializer):
    """
    Minimal user serializer to show instructor details in course pages.
    """
    full_name = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'profile_image', 'bio']
        
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username
    
    def get_profile_image(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            # Fallback: returns relative path if request context is missing
            return obj.profile_image.url
        return None

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    effective_price = serializers.DecimalField(
        source='get_effective_price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    images = ProductImageSerializer(many=True, read_only=True)

    instructors = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(role='teacher'),
        required=False
    )

    discount_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'category',
            'category_name',
            'total_seats',
            'duration_days',
            'description',
            'overview',
            'manual_discount',
            'curriculum',
            'features',
            'price',
            'discounted_price',
            'effective_price',
            'discount_percentage',
            'instructors',
            'is_active',
            'images',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def to_representation(self, instance):
        response = super().to_representation(instance)
        response['instructors'] = InstructorSerializer(
            instance.instructors.all(),
            many=True,
            context=self.context
        ).data
        return response

    def get_discount_percentage(self, obj):
        if obj.discounted_price and obj.price and obj.price > 0:
            return round(((obj.price - obj.discounted_price) / obj.price) * 100)
        return 0

    def validate(self, data):
        """
        Validate discounted_price and manual_discount safely
        """
        price = data.get('price')
        discounted_price = data.get('discounted_price')
        manual_discount = data.get('manual_discount')

        if self.instance:
            price = price if price is not None else self.instance.price
            discounted_price = (
                discounted_price
                if discounted_price is not None
                else self.instance.discounted_price
            )
            manual_discount = (
                manual_discount
                if manual_discount is not None
                else self.instance.manual_discount
            )

        # discounted_price sanity
        if discounted_price is not None and price is not None:
            if discounted_price > price:
                raise serializers.ValidationError({
                    "discounted_price": "Discounted price cannot be greater than price."
                })

        # manual_discount sanity
        if manual_discount is not None and price is not None:
            if manual_discount < 0:
                raise serializers.ValidationError({
                    "manual_discount": "Manual discount cannot be negative."
                })

            if manual_discount > price * Decimal("0.5"):
                raise serializers.ValidationError({
                    "manual_discount": "Manual discount cannot exceed 50% of price."
                })

        return data

class ProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views / cards.
    Includes only what is needed for the Course Card UI.
    """
    category_name = serializers.CharField(source='category.name', read_only=True)
    effective_price = serializers.DecimalField(source='get_effective_price', max_digits=10, decimal_places=2, read_only=True)
    discount_percentage = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 
            'category_name', 
            'price', 'discounted_price', 'effective_price', 'discount_percentage',
            'total_seats', 
            'description', # Needed for the card preview text
            'is_active', 
            'primary_image'
        ]
    
    def get_discount_percentage(self, obj):
        if hasattr(obj, 'get_discount_percentage'):
            return obj.get_discount_percentage()
        if obj.discounted_price and obj.price > 0:
            return round(((obj.price - obj.discounted_price) / obj.price) * 100)
        return 0
    
    def get_primary_image(self, obj):
        # Optimized to avoid N+1 queries if you use prefetch_related('images') in the view
        primary = None
        
        # Check if 'images' is prefetched to avoid DB hits
        if hasattr(obj, '_prefetched_objects_cache') and 'images' in obj._prefetched_objects_cache:
            images = obj.images.all()
            primary = next((img for img in images if img.is_primary), None)
            if not primary and images:
                primary = images[0]
        else:
            # Fallback to DB query
            primary = obj.images.filter(is_primary=True).first()
            if not primary:
                primary = obj.images.first()
        
        if primary and primary.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary.image.url)
            return primary.image.url
        return None
# ============= Offer Serializers =============

class OfferSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_current_price = serializers.DecimalField(source='product.get_effective_price', max_digits=10, decimal_places=2, read_only=True)
    is_valid_now = serializers.SerializerMethodField()
    usage_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Offer
        fields = [
            'id', 'voucher_name', 'code', 'product', 'product_name', 'product_current_price',
            'amount_off', 'is_active', 'valid_from', 'valid_to', 'max_usage', 'current_usage',
            'is_valid_now', 'usage_info', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'current_usage', 'created_at', 'updated_at']
    
    def get_is_valid_now(self, obj):
        return obj.is_valid()
    
    def get_usage_info(self, obj):
        if obj.max_usage:
            return f"{obj.current_usage}/{obj.max_usage}"
        return f"{obj.current_usage}/Unlimited"
    
    def validate_code(self, value):
        return value.upper()  # Store codes in uppercase
    
    def validate(self, data):
        # Check if valid_to is after valid_from
        if data.get('valid_to') and data.get('valid_from'):
            if data['valid_to'] < data['valid_from']:
                raise serializers.ValidationError("Valid to date must be after valid from date.")
        return data


# ============= Course Booking Serializers =============

class PaymentHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentHistory
        fields = [
            "id",
            "amount",
            "status",
            "razorpay_order_id",
            "razorpay_payment_id",
            "created_at",
        ]

class CourseBookingSerializer(serializers.ModelSerializer):
    # --- Student Info ---
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    student_phone = serializers.CharField(source='student.phone', read_only=True)
    student_state = serializers.CharField(source='student.state', read_only=True)

    # --- Product Info ---
    product_name = serializers.CharField(source='product.name', read_only=True)

    # --- Sales Rep Info ---
    sales_rep_name = serializers.CharField(
        source='sales_representative.get_full_name',
        read_only=True
    )
    sales_rep_email = serializers.CharField(
        source='sales_representative.email',
        read_only=True
    )

    # --- Coupon ---
    coupon_code_text = serializers.CharField(
        source='coupon_code.code',
        read_only=True
    )

    # ✅ FK BASED PAYMENT HISTORY (CORRECT)
    payment_histories = PaymentHistorySerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = CourseBooking
        fields = [
            'id',
            'booking_id',

            'student',
            'student_name',
            'student_email',
            'student_phone',
            'student_state',

            'product',
            'product_name',
            'course_name',

            'price',
            'manual_discount',
            'coupon_code',
            'coupon_code_text',
            'discount_amount',
            'final_amount',

            'payment_link',
            'payment_status',
            'payment_date',

            # 🔥 THIS ONE
            'payment_histories',

            'razorpay_order_id',
            'razorpay_payment_id',
            'razorpay_signature',

            'sales_representative',
            'sales_rep_name',
            'sales_rep_email',
            'booked_by',

            'student_status',
            'course_expiry_date',

            'booking_date',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'booking_id',
            'discount_amount',
            'final_amount',
            'payment_date',
            'payment_histories',
            'razorpay_order_id',
            'razorpay_payment_id',
            'razorpay_signature',
            'booking_date',
            'created_at',
            'updated_at',
        ]

# ============= Class Serializers =============

class StudentSpecificClassSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    students_data = UserBasicSerializer(source='students', many=True, read_only=True)
    students_count = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentSpecificClass
        fields = [
            'id', 'name', 'time', 'students', 'students_data', 'students_count',
            'class_link', 'teacher', 'teacher_name', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_students_count(self, obj):
        return obj.students.count()
    
    def validate_teacher(self, value):
        if value and value.role != 'teacher':
            raise serializers.ValidationError("Selected user must have teacher role.")
        return value


class CourseSpecificClassSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    
    # Custom fields for frontend logic
    link = serializers.SerializerMethodField()
    is_booking_expired = serializers.SerializerMethodField()
    join_allowed = serializers.SerializerMethodField()
    
    class Meta:
        model = CourseSpecificClass
        fields = [
            'id', 'product', 'product_name', 'name', 
            'start_time', 'end_time',
            'link', 'teacher', 'teacher_name', 'is_active',
            'created_at', 'updated_at',
            'is_booking_expired', 'join_allowed' # Additional status fields
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_booking_expired', 'join_allowed']
    
    def validate_teacher(self, value):
        if value and value.role != 'teacher':
            raise serializers.ValidationError("Selected user must have teacher role.")
        return value

    def validate(self, data):
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if start_time and end_time and end_time <= start_time:
             raise serializers.ValidationError({"end_time": "End time must be after start time."})
             
        return data

    def _get_booking_status(self, obj):
        """Helper to determine booking status from context"""
        user = self.context['request'].user
        if user.is_anonymous or user.role != 'student':
            return {'expired': False} # Non-students don't have "expiry" in this context
            
        expiry_map = self.context.get('product_expiry_map', {})
        expiry_date = expiry_map.get(obj.product_id)
        
        if expiry_date:
            from django.utils import timezone
            today = timezone.localdate()
            if expiry_date <= today:
                return {'expired': True}
        
        return {'expired': False}

    def get_is_booking_expired(self, obj):
        return self._get_booking_status(obj)['expired']

    def get_join_allowed(self, obj):
        """Check if join is allowed based on Time and Booking"""
        user = self.context['request'].user
        
        # Admin/Teacher always allowed (if active)
        if hasattr(user, 'role') and user.role in ['admin', 'teacher']:
             return True

        # 1. Check Booking Expiry
        if self.get_is_booking_expired(obj):
            return False
            
        # 2. Check Time Window
        if not obj.start_time: 
            return False
            
        from django.utils import timezone
        now = timezone.now()
        start = obj.start_time
        end = obj.end_time
        
        # 5 minutes before start
        join_start = start - timezone.timedelta(minutes=5)
        
        # If no end time, assume 1 hour class for safety, or just checking start
        if not end:
             end = start + timezone.timedelta(hours=1)
             
        if now >= join_start and now <= end:
            return True
            
        return False

    def get_link(self, obj):
        """Return link ONLY if join is currently allowed"""
        user = self.context['request'].user
        
        # Always return link for Admin/Teacher
        if hasattr(user, 'role') and user.role in ['admin', 'teacher']:
            return obj.link
            
        if self.get_join_allowed(obj):
            return obj.link
            
        return None # Hide link for students if not allowed


# ============= Recording Serializers =============

class RecordingSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    students_data = UserBasicSerializer(source='students', many=True, read_only=True)
    students_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Recording
        fields = [
            'id', 'class_name', 'recording_link', 'students', 'students_data', 'students_count',
            'teacher', 'teacher_name', 'note', 'uploaded_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uploaded_at', 'created_at', 'updated_at']
    
    def get_students_count(self, obj):
        return obj.students.count()
    
    def validate_teacher(self, value):
        if value and value.role != 'teacher':
            raise serializers.ValidationError("Selected user must have teacher role.")
        return value


# ============= Attendance Serializers =============

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'class_name', 'class_time', 'student', 'student_name', 
            'student_email', 'status', 'date', 'remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_student(self, value):
        if value and value.role != 'student':
            raise serializers.ValidationError("Selected user must have student role.")
        return value


# ============= Test Score Serializers =============

class TestScoreSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    percentage = serializers.DecimalField(source='get_percentage', max_digits=5, decimal_places=2, read_only=True)
    
    class Meta:
        model = TestScore
        fields = [
            'id', 'student', 'student_name', 'student_email', 'test_name',
            'marks_obtained', 'total_marks', 'percentage', 'remarks',
            'teacher', 'teacher_name', 'test_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        if data.get('marks_obtained', 0) > data.get('total_marks', 0):
            raise serializers.ValidationError("Marks obtained cannot be greater than total marks.")
        
        student = data.get('student')
        if student and student.role != 'student':
            raise serializers.ValidationError("Selected user must have student role.")
        
        teacher = data.get('teacher')
        if teacher and teacher.role != 'teacher':
            raise serializers.ValidationError("Selected user must have teacher role.")
        
        return data


# ============= Expense Serializers =============

class ExpenseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Expense
        fields = ['id', 'name', 'amount', 'date', 'description', 'created_by', 'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


# ============= Contact Form Serializers =============
class ContactFormMessageSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    
    class Meta:
        model = ContactFormMessage
        fields = [
            'id', 'name', 'email', 'phone', 'subject', 'message', 'status',
            'assigned_to', 'assigned_to_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_representation(self, instance):
        """
        Hide internal assignment details from non-admin users.
        """
        representation = super().to_representation(instance)
        request = self.context.get('request')
        
        # If user is NOT admin, remove internal tracking fields
        if request and hasattr(request.user, 'role') and request.user.role != 'admin':
            fields_to_remove = ['assigned_to', 'assigned_to_name']
            for field in fields_to_remove:
                representation.pop(field, None)
        
        return representation


class SellerExpenseSerializer(serializers.ModelSerializer):
    # Read-only fields to display names instead of just IDs
    seller_name = serializers.CharField(source='seller.get_full_name', read_only=True)
    seller_details = SimpleUserSerializer(source='seller', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_details = SimpleUserSerializer(source='created_by', read_only=True)

    class Meta:
        model = SellerExpense
        fields = [
            'id', 
            'seller', 
            'seller_name', 
            'seller_details',
            'amount', 
            'date', 
            'description', 
            'created_by', 
            'created_by_name', 
            'created_by_details',
            'created_at', 
            'updated_at'
        ]
        # The 'seller' field is writable (for Admins to select the seller), 
        # but 'created_by' is auto-filled by the view.
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        # If user is not admin, remove admin-only details
        if request and hasattr(request.user, 'role') and request.user.role != 'admin':
            fields_to_remove = ['seller_details', 'seller_name', 'created_by', 'created_by_name', 'created_by_details']
            for field in fields_to_remove:
                representation.pop(field, None)
        return representation


class TeacherExpenseSerializer(serializers.ModelSerializer):
    # Read-only fields to display names instead of just IDs
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    teacher_details = SimpleUserSerializer(source='teacher', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_details = SimpleUserSerializer(source='created_by', read_only=True)

    class Meta:
        model = TeacherExpense
        fields = [
            'id', 
            'teacher', 
            'teacher_name', 
            'teacher_details',
            'amount', 
            'date', 
            'description', 
            'created_by', 
            'created_by_name', 
            'created_by_details',
            'created_at', 
            'updated_at'
        ]
        # The 'teacher' field is writable (for Admins to select the teacher), 
        # but 'created_by' is auto-filled by the view.
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        # If user is not admin, remove admin-only details
        if request and hasattr(request.user, 'role') and request.user.role != 'admin':
            fields_to_remove = ['teacher_details', 'teacher_name', 'created_by', 'created_by_name', 'created_by_details']
            for field in fields_to_remove:
                representation.pop(field, None)
        return representation


class ProductLeadSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    assigned_to_details = SimpleUserSerializer(source='assigned_to', read_only=True)

    class Meta:
        model = ProductLead
        fields = [
            'id', 
            'name', 
            'email', 
            'phone', 
            'state', 
            'source',
            'product', 
            'product_name', 
            'status', 
            'interest_area',
            'assigned_to', 
            'assigned_to_name',
            'assigned_to_details', 
            'remarks', 
            'created_at', 
            'updated_at'
        ]

class ProductLeadCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductLead
        fields = ['name', 'email','interest_area', 'phone', 'state', 'product', 'source']
        # status, assigned_to, remarks are excluded, so they will use model defaults
        # Only product and contact details required on creation
        read_only_fields = ['id', 'assigned_to_name', 'product_name', 'assigned_to_details', 'created_at', 'updated_at']
        
    def validate_phone(self, value):
        # Basic phone validation if needed
        return value

