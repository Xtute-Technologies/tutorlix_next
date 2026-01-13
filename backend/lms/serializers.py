from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Category, Product, ProductImage, Offer, CourseBooking,
    StudentSpecificClass, CourseSpecificClass,
    Recording, Attendance, TestScore,
    Expense, ContactFormMessage,SellerExpense
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
        fields = ['id', 'name', 'heading', 'description', 'products_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_products_count(self, obj):
        return obj.products.count()


class CategoryListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    class Meta:
        model = Category
        fields = ['id', 'name', 'heading']


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


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    effective_price = serializers.DecimalField(source='get_effective_price', max_digits=10, decimal_places=2, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    discount_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'total_seats', 'description', 'category', 'category_name',
            'price', 'discounted_price', 'effective_price', 'discount_percentage',
            'is_active', 'images', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_discount_percentage(self, obj):
        if obj.discounted_price and obj.price > 0:
            return round(((obj.price - obj.discounted_price) / obj.price) * 100, 2)
        return 0
    
    def validate_discounted_price(self, value):
        if value and value > self.initial_data.get('price', 0):
            raise serializers.ValidationError("Discounted price cannot be greater than regular price.")
        return value


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    effective_price = serializers.DecimalField(source='get_effective_price', max_digits=10, decimal_places=2, read_only=True)
    primary_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'category_name', 'price', 'discounted_price', 'effective_price', 'total_seats', 'is_active', 'primary_image']
    
    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first()
        if not primary:
            primary = obj.images.first()
        if primary and primary.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary.image.url)
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

class CourseBookingSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    student_phone = serializers.CharField(source='student.phone', read_only=True)
    student_state = serializers.CharField(source='student.state', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    sales_rep_name = serializers.CharField(source='sales_representative.get_full_name', read_only=True)
    coupon_code_text = serializers.CharField(source='coupon_code.code', read_only=True)
    
    class Meta:
        model = CourseBooking
        fields = [
            'id', 'student', 'student_name', 'student_email', 'student_phone', 'student_state',
            'product', 'product_name', 'course_name', 'price', 'coupon_code', 'coupon_code_text',
            'discount_amount', 'final_amount', 'payment_link', 'payment_status', 'payment_date',
            'sales_representative', 'sales_rep_name', 'booked_by', 'student_status',
            'booking_date', 'course_expiry_date', 'created_at', 'updated_at',
            'booking_id', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'
        ]
        read_only_fields = ['id', 'discount_amount', 'final_amount', 'booking_date', 'created_at', 'updated_at',
                            'booking_id', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature']
    
    def validate(self, data):
        # Validate student role
        student = data.get('student')
        if student and student.role != 'student':
            raise serializers.ValidationError("Selected user must have student role.")
        
        # Validate sales representative role
        sales_rep = data.get('sales_representative')
        if sales_rep and sales_rep.role not in ['seller', 'admin']:
            raise serializers.ValidationError("Sales representative must be a seller or admin.")
        
        return data


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
    
    class Meta:
        model = CourseSpecificClass
        fields = [
            'id', 'product', 'product_name', 'name', 'time',
            'link', 'teacher', 'teacher_name', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_teacher(self, value):
        if value and value.role != 'teacher':
            raise serializers.ValidationError("Selected user must have teacher role.")
        return value


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




class SellerExpenseSerializer(serializers.ModelSerializer):
    # Read-only fields to display names instead of just IDs
    seller_name = serializers.CharField(source='seller.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = SellerExpense
        fields = [
            'id', 
            'seller', 
            'seller_name', 
            'amount', 
            'date', 
            'description', 
            'created_by', 
            'created_by_name', 
            'created_at', 
            'updated_at'
        ]
        # The 'seller' field is writable (for Admins to select the seller), 
        # but 'created_by' is auto-filled by the view.
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']