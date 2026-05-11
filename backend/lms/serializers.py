from decimal import Decimal
from rest_framework import serializers
from django.contrib.auth import get_user_model
from accounts.serializers import PublicUserSerializer, SimpleUserSerializer
from .models import (
    Category, ProfileType, PaymentHistory, Product, ProductImage, Offer, CourseBooking,
    AdhocPayment, AdhocPaymentHistory,
    StudentSpecificClass, CourseSpecificClass,
    Recording, Attendance, TestScore, Test, TestQuestion, TestAttempt, TestAnswer,
    Expense, ContactFormMessage, SellerExpense, TeacherExpense, ProductLead, Masterclass,
    QuestionBankCourse, QuestionBankTopic, QuestionBankQuestion, ReelGenerationJob, Resource, ApprovedResourceDomain, ResourceImportJob,
    ForumPost, ForumPostLike, ForumComment, ForumNotification, MicrosoftCourse,
)
from .frontend_urls import build_frontend_url
from django.utils.text import slugify

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


class ReelGenerationJobSerializer(serializers.ModelSerializer):
    created_by = UserBasicSerializer(read_only=True)

    class Meta:
        model = ReelGenerationJob
        fields = [
            'id',
            'created_by',
            'title',
            'topic',
            'prompt',
            'language',
            'tone',
            'duration_seconds',
            'avatar_style',
            'board_style',
            'voice_style',
            'call_to_action',
            'include_instagram_post',
            'instagram_caption',
            'hashtags',
            'script_text',
            'scene_plan',
            'board_notes',
            'provider_payload',
            'status',
            'provider_status',
            'provider_name',
            'render_preview_url',
            'instagram_media_id',
            'instagram_permalink',
            'published_at',
            'error_message',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'script_text',
            'scene_plan',
            'board_notes',
            'provider_payload',
            'status',
            'provider_status',
            'provider_name',
            'render_preview_url',
            'instagram_media_id',
            'instagram_permalink',
            'published_at',
            'error_message',
            'created_at',
            'updated_at',
        ]

    def validate_duration_seconds(self, value):
        if value < 15 or value > 120:
            raise serializers.ValidationError('Duration must be between 15 and 120 seconds.')
        return value

    def validate_hashtags(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Hashtags must be a list of strings.')

        cleaned = []
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError('Each hashtag must be a string.')
            tag = item.strip()
            if not tag:
                continue
            if not tag.startswith('#'):
                tag = f'#{tag.lstrip("#")}'
            cleaned.append(tag[:100])

        return cleaned[:15]


class ForumCommentSerializer(serializers.ModelSerializer):
    author = PublicUserSerializer(read_only=True)

    class Meta:
        model = ForumComment
        fields = [
            'id',
            'post',
            'author',
            'content',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'post', 'author', 'created_at', 'updated_at']

    def validate_content(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Comment cannot be empty.')
        if len(value) > 1000:
            raise serializers.ValidationError('Comment is too long.')
        return value


class ForumPostSerializer(serializers.ModelSerializer):
    author = PublicUserSerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    recent_comments = serializers.SerializerMethodField()
    preview_text = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = ForumPost
        fields = [
            'id',
            'author',
            'title',
            'content',
            'rich_content',
            'preview_text',
            'is_active',
            'likes_count',
            'comments_count',
            'liked_by_me',
            'recent_comments',
            'can_edit',
            'can_delete',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'author', 'preview_text', 'is_active', 'likes_count', 'comments_count', 'liked_by_me', 'recent_comments', 'can_edit', 'can_delete', 'created_at', 'updated_at']
        extra_kwargs = {
            'content': {'required': False, 'allow_blank': True},
            'rich_content': {'required': False},
            'title': {'required': False, 'allow_blank': True},
        }

    def validate_title(self, value):
        return (value or '').strip()

    def validate_content(self, value):
        value = (value or '').strip()
        if len(value) > 5000:
            raise serializers.ValidationError('Post content is too long.')
        return value

    def validate_rich_content(self, value):
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Rich content must be a list of editor blocks.')
        return value

    def validate(self, attrs):
        rich_content = attrs.get('rich_content', serializers.empty)
        content = attrs.get('content', serializers.empty)

        if rich_content is not serializers.empty:
            plain_text = self._extract_plain_text(rich_content)
            if plain_text:
                attrs['content'] = plain_text[:5000]
            elif content is serializers.empty or not (content or '').strip():
                raise serializers.ValidationError({'rich_content': 'Post content cannot be empty.'})
        elif content is not serializers.empty:
            trimmed = (content or '').strip()
            if not trimmed:
                raise serializers.ValidationError({'content': 'Post content cannot be empty.'})
            attrs['content'] = trimmed
        elif self.instance is None:
            raise serializers.ValidationError({'content': 'Post content cannot be empty.'})

        return attrs

    def _extract_plain_text(self, blocks):
        parts = []

        def walk(value):
            if isinstance(value, str):
                text = value.strip()
                if text:
                    parts.append(text)
                return
            if isinstance(value, list):
                for item in value:
                    walk(item)
                return
            if isinstance(value, dict):
                if 'text' in value:
                    walk(value.get('text'))
                if 'content' in value:
                    walk(value.get('content'))
                if 'children' in value:
                    walk(value.get('children'))

        walk(blocks)
        return ' '.join(parts).strip()

    def get_likes_count(self, obj):
        return getattr(obj, 'likes_count', obj.likes.count())

    def get_comments_count(self, obj):
        return getattr(obj, 'comments_count', obj.comments.filter(is_active=True).count())

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()

    def get_recent_comments(self, obj):
        comments = obj.comments.filter(is_active=True).select_related('author')[:3]
        return ForumCommentSerializer(comments, many=True, context=self.context).data

    def get_preview_text(self, obj):
        return (obj.content or '').strip()

    def get_can_edit(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return user.role == 'admin' or user.is_staff or obj.author_id == user.id

    def get_can_delete(self, obj):
        return self.get_can_edit(obj)


class ForumNotificationSerializer(serializers.ModelSerializer):
    actor = PublicUserSerializer(read_only=True)
    post_title = serializers.SerializerMethodField()
    post_url = serializers.SerializerMethodField()

    class Meta:
        model = ForumNotification
        fields = [
            'id',
            'notification_type',
            'message',
            'is_read',
            'created_at',
            'read_at',
            'actor',
            'post',
            'post_title',
            'post_url',
        ]
        read_only_fields = fields

    def get_post_title(self, obj):
        return obj.post.title if obj.post else ''

    def get_post_url(self, obj):
        if not obj.post_id:
            return ''
        return f'/forum?post={obj.post_id}'


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


class ProfileTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileType
        fields = ['id', 'slug', 'title', 'description', 'home_content', 'order', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


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
    payment_link = serializers.SerializerMethodField()

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

    def get_payment_link(self, obj):
        if not obj.payment_link:
            return None
        return build_frontend_url(
            self.context.get('request'),
            f"/public-payment/{obj.booking_id}",
        )


class AdhocPaymentHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AdhocPaymentHistory
        fields = [
            'id',
            'amount',
            'status',
            'razorpay_order_id',
            'razorpay_payment_id',
            'created_at',
        ]


class AdhocPaymentSerializer(serializers.ModelSerializer):
    payment_histories = AdhocPaymentHistorySerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    payment_link = serializers.SerializerMethodField()

    class Meta:
        model = AdhocPayment
        fields = [
            'id',
            'payment_id',
            'title',
            'description',
            'client_name',
            'client_email',
            'client_phone',
            'amount',
            'payment_link',
            'payment_status',
            'payment_date',
            'payment_histories',
            'razorpay_order_id',
            'razorpay_payment_id',
            'razorpay_signature',
            'created_by',
            'created_by_name',
            'created_by_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'payment_id',
            'payment_link',
            'payment_date',
            'payment_histories',
            'razorpay_order_id',
            'razorpay_payment_id',
            'razorpay_signature',
            'created_by',
            'created_by_name',
            'created_by_email',
            'created_at',
            'updated_at',
        ]

    def validate_amount(self, value):
        if value < Decimal('1.00'):
            raise serializers.ValidationError('Amount must be at least ₹1.00.')
        return value

    def get_payment_link(self, obj):
        if not obj.payment_link:
            return None
        return build_frontend_url(
            self.context.get('request'),
            f"/public-payment/{obj.payment_id}?type=adhoc",
        )


class QuestionBankQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionBankQuestion
        fields = [
            'id',
            'topic',
            'question',
            'answer',
            'source_label',
            'source_url',
            'order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuestionBankTopicSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = QuestionBankTopic
        fields = [
            'id',
            'course',
            'course_title',
            'title',
            'slug',
            'summary',
            'order',
            'is_active',
            'question_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'question_count', 'course_title']

    def get_question_count(self, obj):
        return obj.questions.filter(is_active=True).count()

    def create(self, validated_data):
        validated_data['slug'] = self._generate_unique_slug(
            validated_data['course'],
            validated_data['title']
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        title = validated_data.get('title')
        course = validated_data.get('course', instance.course)
        if title and title != instance.title:
            validated_data['slug'] = self._generate_unique_slug(course, title, instance.pk)
        return super().update(instance, validated_data)

    def _generate_unique_slug(self, course, title, instance_id=None):
        base_slug = slugify(title) or 'topic'
        slug = base_slug
        suffix = 1
        queryset = QuestionBankTopic.objects.filter(course=course)
        if instance_id:
            queryset = queryset.exclude(pk=instance_id)
        while queryset.filter(slug=slug).exists():
            suffix += 1
            slug = f'{base_slug}-{suffix}'
        return slug


class QuestionBankCourseSerializer(serializers.ModelSerializer):
    topic_count = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = QuestionBankCourse
        fields = [
            'id',
            'title',
            'slug',
            'subject',
            'profileTypes',
            'grade_label',
            'class_label',
            'description',
            'syllabus_label',
            'syllabus_source_url',
            'is_active',
            'created_by',
            'created_by_name',
            'topic_count',
            'question_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'slug',
            'created_by',
            'created_by_name',
            'topic_count',
            'question_count',
            'created_at',
            'updated_at',
        ]

    def get_topic_count(self, obj):
        return obj.topics.filter(is_active=True).count()

    def get_question_count(self, obj):
        return QuestionBankQuestion.objects.filter(
            topic__course=obj,
            topic__is_active=True,
            is_active=True
        ).count()

    def create(self, validated_data):
        validated_data['slug'] = self._generate_unique_slug(validated_data['title'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        title = validated_data.get('title')
        if title and title != instance.title:
            validated_data['slug'] = self._generate_unique_slug(title, instance.pk)
        return super().update(instance, validated_data)

    def _generate_unique_slug(self, title, instance_id=None):
        base_slug = slugify(title) or 'course'
        slug = base_slug
        suffix = 1
        queryset = QuestionBankCourse.objects.all()
        if instance_id:
            queryset = queryset.exclude(pk=instance_id)
        while queryset.filter(slug=slug).exists():
            suffix += 1
            slug = f'{base_slug}-{suffix}'
        return slug


class QuestionBankCourseManageDetailSerializer(QuestionBankCourseSerializer):
    topics = QuestionBankTopicSerializer(many=True, read_only=True)

    class Meta(QuestionBankCourseSerializer.Meta):
        fields = QuestionBankCourseSerializer.Meta.fields + ['topics']


class PublicQuestionBankQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionBankQuestion
        fields = ['id', 'question', 'answer', 'source_label', 'source_url', 'order']


class PublicQuestionBankTopicSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = QuestionBankTopic
        fields = ['id', 'title', 'slug', 'summary', 'order', 'is_active', 'question_count']

    def get_question_count(self, obj):
        return obj.questions.filter(is_active=True).count()


class PublicQuestionBankCourseSerializer(serializers.ModelSerializer):
    topic_count = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = QuestionBankCourse
        fields = [
            'id',
            'title',
            'slug',
            'subject',
            'profileTypes',
            'grade_label',
            'class_label',
            'description',
            'syllabus_label',
            'syllabus_source_url',
            'is_active',
            'topic_count',
            'question_count',
        ]

    def get_topic_count(self, obj):
        return obj.topics.filter(is_active=True).count()

    def get_question_count(self, obj):
        return QuestionBankQuestion.objects.filter(
            topic__course=obj,
            topic__is_active=True,
            is_active=True
        ).count()


class PublicQuestionBankCourseDetailSerializer(PublicQuestionBankCourseSerializer):
    topics = serializers.SerializerMethodField()

    class Meta(PublicQuestionBankCourseSerializer.Meta):
        fields = PublicQuestionBankCourseSerializer.Meta.fields + ['topics']

    def get_topics(self, obj):
        topics = obj.topics.filter(is_active=True).order_by('order', 'title')
        return PublicQuestionBankTopicSerializer(topics, many=True).data


class PublicQuestionBankTopicDetailSerializer(serializers.ModelSerializer):
    course = PublicQuestionBankCourseSerializer(read_only=True)
    questions = serializers.SerializerMethodField()

    class Meta:
        model = QuestionBankTopic
        fields = [
            'id',
            'title',
            'slug',
            'summary',
            'order',
            'course',
            'questions',
        ]

    def get_questions(self, obj):
        questions = obj.questions.filter(is_active=True).order_by('order', 'id')
        return PublicQuestionBankQuestionSerializer(questions, many=True).data

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

# ============= Master Class Serializers =============
class MasterClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = Masterclass
        fields = [
            'id',
            'name',
            'time',
            'class_link',
            'image',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
        ]

class CourseSpecificClassSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    
    # Custom fields for frontend logic
    # link is a model field, handled by to_representation for security
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

    def to_representation(self, instance):
        """
        Custom representation to hide link if not allowed
        """
        data = super().to_representation(instance)
        
        user = self.context['request'].user
        should_show_link = False

        # Always return link for Admin/Teacher
        if hasattr(user, 'role') and user.role in ['admin', 'teacher']:
            should_show_link = True
        elif self.get_join_allowed(instance):
            should_show_link = True
            
        if not should_show_link:
            data['link'] = None
            
        return data

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


class TestQuestionSerializer(serializers.ModelSerializer):
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = TestQuestion
        fields = [
            'id', 'test', 'order', 'title', 'prompt', 'question_type', 'marks',
            'is_required', 'options', 'correct_options', 'attachment', 'attachment_url',
            'allowed_file_types', 'starter_code', 'coding_language', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'attachment_url']

    def get_attachment_url(self, obj):
        request = self.context.get('request')
        if not obj.attachment:
            return None
        if request:
            return request.build_absolute_uri(obj.attachment.url)
        return obj.attachment.url

    def validate(self, attrs):
        question_type = attrs.get('question_type') or getattr(self.instance, 'question_type', None)
        options = attrs.get('options', getattr(self.instance, 'options', [])) or []
        correct_options = attrs.get('correct_options', getattr(self.instance, 'correct_options', [])) or []

        if question_type == 'multiple_choice' and len(options) < 2:
            raise serializers.ValidationError({'options': 'Multiple choice questions require at least two options.'})

        if question_type != 'multiple_choice':
            attrs['correct_options'] = []
            attrs['options'] = []

        if question_type != 'file_upload':
            attrs['allowed_file_types'] = ''

        if question_type != 'coding':
            attrs['starter_code'] = ''
            attrs['coding_language'] = ''

        for item in correct_options:
            if item not in options:
                raise serializers.ValidationError({'correct_options': 'Correct options must exist in options.'})

        return attrs


class TestAnswerSerializer(serializers.ModelSerializer):
    question_id = serializers.IntegerField(source='question.id', read_only=True)
    question_prompt = serializers.CharField(source='question.prompt', read_only=True)
    uploaded_file_url = serializers.SerializerMethodField()
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)

    class Meta:
        model = TestAnswer
        fields = [
            'id', 'question', 'question_id', 'question_prompt', 'selected_options',
            'subjective_answer', 'code_answer', 'code_language',
            'uploaded_file', 'uploaded_file_url', 'awarded_marks', 'review_comment',
            'reviewed_at', 'reviewed_by', 'reviewed_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'question_id', 'question_prompt', 'uploaded_file_url',
            'reviewed_at', 'reviewed_by', 'reviewed_by_name', 'created_at', 'updated_at'
        ]

    def get_uploaded_file_url(self, obj):
        request = self.context.get('request')
        if not obj.uploaded_file:
            return None
        if request:
            return request.build_absolute_uri(obj.uploaded_file.url)
        return obj.uploaded_file.url


class StudentVisibleTestQuestionSerializer(serializers.ModelSerializer):
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = TestQuestion
        fields = [
            'id', 'order', 'title', 'prompt', 'question_type', 'marks', 'is_required',
            'options', 'attachment_url', 'allowed_file_types', 'starter_code', 'coding_language'
        ]

    def get_attachment_url(self, obj):
        request = self.context.get('request')
        if not obj.attachment:
            return None
        if request:
            return request.build_absolute_uri(obj.attachment.url)
        return obj.attachment.url


class TestSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    question_count = serializers.SerializerMethodField()
    total_marks = serializers.SerializerMethodField()
    locked_attempt_count = serializers.SerializerMethodField()
    my_attempt = serializers.SerializerMethodField()
    questions = TestQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Test
        fields = [
            'id', 'title', 'description', 'instructions', 'product', 'product_name',
            'created_by', 'created_by_name', 'status', 'duration_minutes',
            'lock_on_window_blur', 'available_from', 'available_until', 'is_active',
            'question_count', 'total_marks', 'locked_attempt_count', 'my_attempt',
            'questions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'question_count', 'total_marks', 'locked_attempt_count', 'my_attempt', 'questions', 'created_at', 'updated_at']

    def get_question_count(self, obj):
        return obj.questions.count()

    def get_total_marks(self, obj):
        return str(sum(question.marks for question in obj.questions.all()))

    def get_locked_attempt_count(self, obj):
        return obj.attempts.filter(status='locked').count()

    def get_my_attempt(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated or user.role != 'student':
            return None
        attempt = obj.attempts.filter(student=user).order_by('-updated_at').first()
        if not attempt:
            return None
        return {
            'id': attempt.id,
            'status': attempt.status,
            'locked_at': attempt.locked_at,
            'submitted_at': attempt.submitted_at,
            'current_question_index': attempt.current_question_index,
            'total_awarded_marks': str(attempt.total_awarded_marks or 0),
            'reviewed_at': attempt.reviewed_at,
            'reviewed_count': attempt.answers.filter(reviewed_at__isnull=False).count(),
        }


class TestAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    test_title = serializers.CharField(source='test.title', read_only=True)
    product_name = serializers.CharField(source='test.product.name', read_only=True)
    can_unlock = serializers.SerializerMethodField()
    answered_count = serializers.SerializerMethodField()
    reviewed_count = serializers.SerializerMethodField()

    class Meta:
        model = TestAttempt
        fields = [
            'id', 'test', 'test_title', 'product_name', 'student', 'student_name', 'status',
            'started_at', 'last_resumed_at', 'submitted_at', 'last_activity_at',
            'locked_at', 'unlocked_at', 'unlocked_by', 'locked_reason',
            'window_violation_count', 'current_question_index', 'time_spent_seconds',
            'answered_count', 'reviewed_count', 'total_awarded_marks', 'reviewed_at',
            'can_unlock', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'student_name', 'test_title', 'product_name', 'answered_count',
            'reviewed_count', 'total_awarded_marks', 'reviewed_at', 'can_unlock',
            'created_at', 'updated_at'
        ]

    def get_can_unlock(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated or obj.status != 'locked':
            return False
        if user.role == 'admin':
            return True
        return user.role == 'teacher' and obj.test.created_by_id == user.id

    def get_answered_count(self, obj):
        return obj.answers.count()

    def get_reviewed_count(self, obj):
        return obj.answers.filter(reviewed_at__isnull=False).count()


class TestAttemptDetailSerializer(TestAttemptSerializer):
    test_detail = TestSerializer(source='test', read_only=True)
    questions = serializers.SerializerMethodField()
    answers = TestAnswerSerializer(many=True, read_only=True)

    class Meta(TestAttemptSerializer.Meta):
        fields = TestAttemptSerializer.Meta.fields + ['test_detail', 'questions', 'answers']

    def get_questions(self, obj):
        serializer = StudentVisibleTestQuestionSerializer(
            obj.test.questions.all(),
            many=True,
            context=self.context
        )
        return serializer.data


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


class MicrosoftCourseSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='course_type', required=False, allow_blank=True)
    typeLabel = serializers.CharField(source='type_label', required=False, allow_blank=True)
    learningObjectives = serializers.JSONField(source='learning_objectives', required=False)

    class Meta:
        model = MicrosoftCourse
        fields = [
            'id',
            'uid',
            'slug',
            'title',
            'summary',
            'subtitle',
            'url',
            'icon_url',
            'social_image_url',
            'duration_in_minutes',
            'levels',
            'roles',
            'products',
            'subjects',
            'last_modified',
            'type',
            'typeLabel',
            'popularity',
            'locale',
            'learningObjectives',
            'prerequisites',
            'source_url',
            'scraped',
            'scraped_duration_label',
            'raw_payload',
            'is_active',
            'synced_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'synced_at', 'created_at', 'updated_at']

    def validate_levels(self, value):
        return self._validate_string_list(value, 'levels')

    def validate_roles(self, value):
        return self._validate_string_list(value, 'roles')

    def validate_products(self, value):
        return self._validate_string_list(value, 'products')

    def validate_subjects(self, value):
        return self._validate_string_list(value, 'subjects')

    def _validate_string_list(self, value, field_name):
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError(f'{field_name} must be a list.')
        return [str(item).strip() for item in value if str(item).strip()]


class ResourceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    download_url = serializers.SerializerMethodField()
    has_file = serializers.SerializerMethodField()
    has_external_url = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = [
            'id',
            'title',
            'description',
            'subject',
            'curriculum',
            'grade_or_course',
            'topic',
            'resource_type',
            'tags',
            'external_url',
            'source_url',
            'imported_at',
            'file',
            'visibility',
            'uploaded_by',
            'uploaded_by_name',
            'has_file',
            'has_external_url',
            'download_url',
            'can_edit',
            'can_delete',
            'created_at',
            'updated_at',
        ]
        extra_kwargs = {
            'file': {'write_only': True, 'required': False, 'allow_null': True},
        }
        read_only_fields = [
            'id',
            'uploaded_by',
            'uploaded_by_name',
            'has_file',
            'has_external_url',
            'download_url',
            'can_edit',
            'can_delete',
            'source_url',
            'imported_at',
            'created_at',
            'updated_at',
        ]

    def validate_tags(self, value):
        if value in (None, ''):
            return []
        if isinstance(value, str):
            return [item.strip() for item in value.split(',') if item.strip()][:30]
        if not isinstance(value, list):
            raise serializers.ValidationError('Tags must be a list or comma-separated string.')
        cleaned = []
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError('Each tag must be a string.')
            item = item.strip()
            if item:
                cleaned.append(item)
        return cleaned[:30]

    def validate(self, attrs):
        file_value = attrs.get('file', getattr(self.instance, 'file', None))
        external_url = attrs.get('external_url', getattr(self.instance, 'external_url', None))
        if not file_value and not external_url:
            raise serializers.ValidationError({'file': 'Upload a file or provide an external URL.'})
        return attrs

    def get_download_url(self, obj):
        request = self.context.get('request')
        if not request or not obj.file:
            return None
        return request.build_absolute_uri(f'/api/lms/resources/{obj.pk}/download/')

    def get_has_file(self, obj):
        return bool(obj.file)

    def get_has_external_url(self, obj):
        return bool(obj.external_url)

    def get_can_edit(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return bool(user and user.is_authenticated and user.role == 'admin')

    def get_can_delete(self, obj):
        return self.get_can_edit(obj)


class ApprovedResourceDomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovedResourceDomain
        fields = ['id', 'domain', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_domain(self, value):
        value = (value or '').strip().lower()
        if not value:
          raise serializers.ValidationError('Domain is required.')
        if '://' in value:
          raise serializers.ValidationError('Enter only the hostname, for example example.com.')
        return value


class ResourceImportJobSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    progress_percent = serializers.SerializerMethodField()
    is_finished = serializers.SerializerMethodField()
    can_abort = serializers.SerializerMethodField()

    class Meta:
        model = ResourceImportJob
        fields = [
            'id',
            'source_url',
            'subject',
            'curriculum',
            'grade_or_course',
            'topic',
            'visibility',
            'status',
            'progress_current',
            'progress_total',
            'progress_percent',
            'created_resources_count',
            'log_lines',
            'error_message',
            'can_abort',
            'created_by',
            'created_by_name',
            'is_finished',
            'created_at',
            'started_at',
            'finished_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_progress_percent(self, obj):
        if obj.progress_total <= 0:
            return 0
        return min(100, int((obj.progress_current / obj.progress_total) * 100))

    def get_is_finished(self, obj):
        return obj.status in ('completed', 'failed', 'aborted')

    def get_can_abort(self, obj):
        return obj.status in ('queued', 'running')
