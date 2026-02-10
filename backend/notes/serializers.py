from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Note, NoteAttachment, NotePurchase, NoteAccess
from lms.models import Product
from accounts.serializers import PublicUserSerializer

User = get_user_model()


class NoteAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for Note Attachments"""
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()
    
    class Meta:
        model = NoteAttachment
        fields = [
            'id',
            'note',
            'file',
            'file_url',
            'file_type',
            'file_name',
            'file_size',
            'file_size_display',
            'created_at'
        ]
        read_only_fields = ['file_size', 'created_at']
    
    def validate_file(self, value):
        # Check file size (100MB limit)
        max_size = 100 * 1024 * 1024  # 100MB
        if value.size > max_size:
            raise serializers.ValidationError("File size too large. Maximum 100MB allowed.")
        return value
    
    def validate(self, data):
        # Helper check for attachment count limit is better done in view due to race conditions or simple logic separation
        # but can be here too. Viewset is fine.
        return data
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_file_size_display(self, obj):
        if obj.file_size:
            size_kb = obj.file_size / 1024
            if size_kb > 1024:
                return f"{size_kb / 1024:.2f} MB"
            return f"{size_kb:.2f} KB"
        return None


class NoteListSerializer(serializers.ModelSerializer):
    """Serializer for listing notes (public view with limited fields)"""
    creator = PublicUserSerializer(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    effective_price = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()
    can_access = serializers.SerializerMethodField()
    has_purchased = serializers.SerializerMethodField()
    
    class Meta:
        model = Note
        fields = [
            'id',
            'title',
            'slug',
            'description',
            'note_type',
            'privacy',
            'creator',
            'product_name',
            'price',
            'discounted_price',
            'effective_price',
            'discount_percentage',
            'access_duration_days',
            'is_draft',
            'is_active',
            'created_at',
            'updated_at',
            'can_access',
            'has_purchased'
        ]
    
    def get_effective_price(self, obj):
        return obj.get_effective_price()
    
    def get_discount_percentage(self, obj):
        if obj.discounted_price and obj.price > 0:
            return round(((obj.price - obj.discounted_price) / obj.price) * 100, 2)
        return 0

    def get_can_access(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_user_access(request.user)
        return False
    
    def get_has_purchased(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'student':
            return NotePurchase.objects.filter(
                student=request.user,
                note=obj,
                payment_status='paid'
            ).exists()
        return False


class NoteDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed note view (includes content)"""
    creator = PublicUserSerializer(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    effective_price = serializers.SerializerMethodField()
    attachments = NoteAttachmentSerializer(many=True, read_only=True)
    can_access = serializers.SerializerMethodField()
    has_purchased = serializers.SerializerMethodField()
    
    class Meta:
        model = Note
        fields = [
            'id',
            'title',
            'slug',
            'description',
            'content',
            'note_type',
            'privacy',
            'creator',
            'product',
            'product_id',
            'product_name',
            'price',
            'discounted_price',
            'effective_price',
            'access_duration_days',
            'is_draft',
            'is_active',
            'attachments',
            'can_access',
            'has_purchased',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['creator', 'created_at', 'updated_at']
    
    def get_effective_price(self, obj):
        return obj.get_effective_price()
    
    def get_can_access(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_user_access(request.user)
        return False
    
    def get_has_purchased(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'student':
            return NotePurchase.objects.filter(
                student=request.user,
                note=obj,
                payment_status='paid'
            ).exists()
        return False

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        user = request.user if request else None

        # Check access (handles AnonymousUser safe via model method)
        if not instance.can_user_access(user):
            ret.pop('content', None)
            ret.pop('attachments', None)
            
        return ret


class NoteCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating notes"""
    attachments = NoteAttachmentSerializer(many=True, read_only=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    access_duration_days = serializers.IntegerField(required=False, allow_null=True)
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=False,
        allow_null=True
    )
    creator = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Note
        fields = [
            'id',
            'title',
            'slug',
            'description',
            'content',
            'note_type',
            'privacy',
            'product',
            'creator',
            'price',
            'discounted_price',
            'access_duration_days',
            'is_draft',
            'is_active',
            'attachments',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate(self, data):
        # Set defaults for price and access_duration_days if not provided
        if 'price' not in data or data.get('price') is None:
            data['price'] = 0
        if 'access_duration_days' not in data or data.get('access_duration_days') is None:
            data['access_duration_days'] = 0
            
        # Ensure course-specific notes have a product
        if data.get('note_type') == 'course_specific' and not data.get('product'):
            raise serializers.ValidationError({
                'product': 'Product is required for course-specific notes.'
            })
        
        # For course-specific notes, privacy doesn't matter (ignore it)
        if data.get('note_type') == 'course_specific':
            # We can set a default or leave as-is, but document that it's ignored
            pass
        
        # Ensure purchaseable notes have a price
        if data.get('note_type') == 'individual' and data.get('privacy') == 'purchaseable':
            if data.get('price', 0) <= 0:
                raise serializers.ValidationError({
                    'price': 'Price must be greater than 0 for purchaseable notes.'
                })
        
        # Validate discounted price
        if data.get('discounted_price') and data.get('price'):
            if data['discounted_price'] >= data['price']:
                raise serializers.ValidationError({
                    'discounted_price': 'Discounted price must be less than original price.'
                })
        
        return data
    
    def create(self, validated_data):
        # Auto-assign creator from request
        request = self.context.get('request')
        if request and request.user:
            validated_data['creator'] = request.user
        return super().create(validated_data)


class NotePurchaseSerializer(serializers.ModelSerializer):
    """Serializer for Note Purchases"""
    student = PublicUserSerializer(read_only=True)
    note_title = serializers.CharField(source='note.title', read_only=True)
    note_id = serializers.IntegerField(source='note.id', read_only=True)
    is_access_valid = serializers.SerializerMethodField()
    
    class Meta:
        model = NotePurchase
        fields = [
            'id',
            'purchase_id',
            'student',
            'note',
            'note_id',
            'note_title',
            'price',
            'discount_amount',
            'final_amount',
            'payment_status',
            'payment_link',
            'payment_date',
            'razorpay_order_id',
            'razorpay_payment_id',
            'razorpay_signature',
            'access_valid_until',
            'is_access_valid',
            'purchased_by',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'purchase_id',
            'razorpay_order_id',
            'razorpay_payment_id',
            'razorpay_signature',
            'created_at',
            'updated_at',
            'price',
            'discount_amount',
            'final_amount',
            'payment_link',
            'purchased_by',
            'payment_status'
        ]
    
    def get_is_access_valid(self, obj):
        return obj.is_access_valid()


class NoteAccessSerializer(serializers.ModelSerializer):
    """Serializer for Note Access Management"""
    student = PublicUserSerializer(read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='student'),
        source='student',
        write_only=True
    )
    granted_by = PublicUserSerializer(read_only=True)
    note_title = serializers.CharField(source='note.title', read_only=True)
    note_details = NoteListSerializer(source='note', read_only=True)
    is_valid_now = serializers.SerializerMethodField()
    
    class Meta:
        model = NoteAccess
        fields = [
            'id',
            'student',
            'student_id',
            'note',
            'note_title',
            'note_details',
            'access_type',
            'purchase',
            'course_booking',
            'valid_until',
            'is_active',
            'is_valid_now',
            'granted_by',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'granted_by']
    
    def get_is_valid_now(self, obj):
        return obj.is_valid()
