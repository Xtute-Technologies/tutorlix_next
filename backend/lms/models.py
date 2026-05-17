from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.files.storage import FileSystemStorage
from django.utils import timezone
from django.utils.text import slugify
from datetime import timedelta
import uuid
import uuid

from lms.currency import PAYMENT_CURRENCY_CHOICES, INR, payment_pricing


# Create your models here.

protected_resource_storage = FileSystemStorage(location=settings.BASE_DIR / 'protected_resources')


def test_answer_upload_path(instance, filename):
    stem, dot, extension = filename.rpartition('.')
    base_name = slugify(stem or filename)[:80] or 'answer'
    suffix = f".{extension.lower()}" if dot else ''
    attempt_id = instance.attempt_id or 'new-attempt'
    question_id = instance.question_id or 'new-question'
    return f"tests/answers/attempt_{attempt_id}/question_{question_id}/{uuid.uuid4().hex}_{base_name}{suffix}"


class Category(models.Model):
    name = models.CharField(max_length=200, unique=True)
    heading = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    profileTypes = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['name']


class ProfileType(models.Model):
    slug = models.SlugField(unique=True, max_length=100)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    home_content = models.JSONField(default=dict, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'Profile Type'
        verbose_name_plural = 'Profile Types'
        ordering = ['order', 'title']



# 1. Curriculum JSON Example: When saving data to the curriculum field, you can structure it like this:

# JSON

# [
#   {
#     "title": "Module 1: Introduction",
#     "duration": "45 mins",
#     "lessons": [
#       { "title": "Welcome to the course", "type": "video" },
#       { "title": "Setting up environment", "type": "article" }
#     ]
#   },
#   {
#     "title": "Module 2: Core Concepts",
#     "duration": "2 hours",
#     "lessons": [
#       { "title": "Variables and Data Types", "type": "video" }
#     ]
#   }
# ]

# Features JSON Example:
[
  "Full Lifetime Access",
  "Certificate of Completion",
  "15 Downloadable Resources",
  "Access on Mobile and TV"
]
class Product(models.Model):
    """
    Products/Courses offered
    """
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True, null=True) # Recommended for SEO friendly URLs
    
    # Basic Info
    category = models.ForeignKey(
        'Category', 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='products'
    )
    total_seats = models.IntegerField(validators=[MinValueValidator(1)])
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    discounted_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        blank=True, 
        null=True, 
        validators=[MinValueValidator(0)]
    )

    manual_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True, 
        null=True, 
        default=0
    )

    # 0. Duration (Days)
    duration_days = models.IntegerField(
        default=30,
        blank=True,
        null=True,
        validators=[MinValueValidator(0)],
        help_text="Duration in days. Leave 0 or empty for lifetime access."
    )
    
    # Content Fields
    description = models.TextField(help_text="Short description for cards/previews")
    
    # 1. Overview (Rich Text)
    # in templates use: {{ product.overview|safe }}
    overview = models.TextField(
        blank=True, 
        help_text="Full HTML/Rich text content for the course overview tab"
    )

    # 2. Curriculum (JSON Structure)
    # Stores nested data like: [{'title': 'Module 1', 'lessons': ['Intro', 'Setup']}]
    curriculum = models.JSONField(
        default=list, 
        blank=True, 
        help_text="JSON structure containing modules and lessons"
    )

    # 3. Features / Key Highlights
    # Stores simple list: ["Self-Paced Learning", "Certificate of Completion", "Lifetime Access"]
    features = models.JSONField(
        default=list, 
        blank=True, 
        help_text="List of course features/highlights"
    )

    # 4. Teachers (Many-to-Many)
    # Allows multiple instructors per course
    instructors = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='courses_taught',
        limit_choices_to={'role': 'teacher'},
        blank=True
    )

    # Meta
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            base_slug = slugify(self.name) or 'course'
            slug = base_slug
            suffix = 2
            while Product.objects.exclude(pk=self.pk).filter(slug=slug).exists():
                slug = f'{base_slug}-{suffix}'
                suffix += 1
            self.slug = slug
        super().save(*args, **kwargs)
    
    def get_effective_price(self):
        """Returns discounted price if available, otherwise regular price"""
        return self.discounted_price if self.discounted_price is not None else self.price
    
    def get_discount_percentage(self):
        """Calculate discount percentage for UI badges"""
        if self.discounted_price and self.price > 0:
            discount = ((self.price - self.discounted_price) / self.price) * 100
            return round(discount)
        return 0

    class Meta:
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['-created_at']


class ProductImage(models.Model):
    """
    Product Images (up to 5 per product)
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for {self.product.name}"
    
    class Meta:
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'


class Offer(models.Model):
    """
    Vouchers/Offers for Products
    """
    voucher_name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='offers')
    amount_off = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(blank=True, null=True)
    max_usage = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(1)])
    current_usage = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.voucher_name} ({self.code})"
    
    def is_valid(self):
        """Check if offer is still valid"""
        if not self.is_active:
            return False
        if self.valid_to and timezone.now() > self.valid_to:
            return False
        if self.max_usage and self.current_usage >= self.max_usage:
            return False
        return True
    
    class Meta:
        verbose_name = 'Offer'
        verbose_name_plural = 'Offers'
        ordering = ['-created_at']


class CourseBooking(models.Model):
    """
    Course Bookings by Students
    """
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('expired', 'Expired'),
    )

    STUDENT_STATUS_CHOICES = [
        ('in_process', 'In Process'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Student reference (can be created by sales rep before full registration)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='course_bookings',
        limit_choices_to={'role': 'student'}
    )
    
    # Course details
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='bookings')
    course_name = models.CharField(max_length=200)  # Can differ from product name
    price = models.DecimalField(max_digits=10, decimal_places=2)
    manual_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    # Coupon/Offer
    coupon_code = models.ForeignKey(Offer, on_delete=models.SET_NULL, null=True, blank=True, related_name='used_in_bookings')
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2)
    international_student = models.BooleanField(default=False)
    payment_currency = models.CharField(max_length=3, choices=PAYMENT_CURRENCY_CHOICES, default=INR)
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True)
    
    # Payment details
    payment_link = models.URLField(blank=True, null=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_date = models.DateTimeField(null=True, blank=True)

    # Razorpay Details
    booking_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=200, blank=True, null=True)
    payment_history = models.JSONField(default=list, blank=True)
    
    # Sales and tracking
    sales_representative = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='sales_bookings',
        limit_choices_to={'role__in': ['seller', 'admin']}
    )
    booked_by = models.CharField(max_length=200)  # Name of person who created booking
    
    # Student status in the course
    student_status = models.CharField(max_length=20, choices=STUDENT_STATUS_CHOICES, default='in_process')
    
    # Dates
    booking_date = models.DateTimeField(auto_now_add=True)
    course_expiry_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.student.get_full_name()} - {self.course_name}"
    
    def save(self, *args, **kwargs):
        if self.pk is None:  # ONLY on create
            total_discount = Decimal(0)

            if self.coupon_code and self.coupon_code.is_valid():
                total_discount += self.coupon_code.amount_off

            total_discount += self.manual_discount or Decimal(0)

            self.discount_amount = total_discount
            self.final_amount = max(self.price - total_discount, Decimal(0))

        if self.pk is None or not self.razorpay_order_id or self.payment_amount is None:
            self.sync_payment_pricing()
        super().save(*args, **kwargs)

    def sync_payment_pricing(self):
        pricing = payment_pricing(self.final_amount, self.international_student)
        self.payment_currency = pricing["currency"]
        self.payment_amount = pricing["payment_amount"]
        self.exchange_rate = pricing["exchange_rate"]

    def get_payment_currency(self):
        return self.payment_currency or INR

    def get_payment_amount(self):
        return self.payment_amount if self.payment_amount is not None else self.final_amount

    
    class Meta:
        verbose_name = 'Course Booking'
        verbose_name_plural = 'Course Bookings'
        ordering = ['-booking_date']

class PaymentHistory(models.Model):
    """
    Immutable payment attempts for a booking
    """

    PAYMENT_STATUS_CHOICES = (
        ('created', 'Created'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    )

    booking = models.ForeignKey(
        CourseBooking,
        on_delete=models.CASCADE,
        related_name="payment_histories"  # ✅ SAFE
    )

    # SNAPSHOT (never FK product/user again)
    course_name = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    charged_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=3, choices=PAYMENT_CURRENCY_CHOICES, default=INR)
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True)

    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=200, blank=True, null=True)

    status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='created'
    )

    sales_representative = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_histories_as_sales_rep",  # ✅ UNIQUE
        limit_choices_to={'role__in': ['seller', 'admin']}
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        display_amount = self.charged_amount if self.charged_amount is not None else self.amount
        return f"{self.booking.booking_id} - {self.status} - {self.currency} {display_amount}"


class AdhocPayment(models.Model):
    """
    Admin-created payment links for non-course client payments.
    """

    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('expired', 'Expired'),
    )

    payment_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    client_name = models.CharField(max_length=200)
    client_email = models.EmailField(blank=True)
    client_phone = models.CharField(max_length=20, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    international = models.BooleanField(default=False)
    payment_currency = models.CharField(max_length=3, choices=PAYMENT_CURRENCY_CHOICES, default=INR)
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True)
    payment_link = models.URLField(blank=True, null=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_date = models.DateTimeField(null=True, blank=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=200, blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_adhoc_payments',
        limit_choices_to={'role': 'admin'},
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Adhoc Payment'
        verbose_name_plural = 'Adhoc Payments'
        ordering = ['-created_at']

    def __str__(self):
        display_amount = self.payment_amount if self.payment_amount is not None else self.amount
        return f"{self.title} - {self.client_name} - {self.payment_currency} {display_amount}"

    def save(self, *args, **kwargs):
        if self.pk is None or not self.razorpay_order_id or self.payment_amount is None:
            self.sync_payment_pricing()
        super().save(*args, **kwargs)

    def sync_payment_pricing(self):
        pricing = payment_pricing(self.amount, self.international)
        self.payment_currency = pricing["currency"]
        self.payment_amount = pricing["payment_amount"]
        self.exchange_rate = pricing["exchange_rate"]

    def get_payment_currency(self):
        return self.payment_currency or INR

    def get_payment_amount(self):
        return self.payment_amount if self.payment_amount is not None else self.amount


class AdhocPaymentHistory(models.Model):
    PAYMENT_STATUS_CHOICES = (
        ('created', 'Created'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    )

    adhoc_payment = models.ForeignKey(
        AdhocPayment,
        on_delete=models.CASCADE,
        related_name='payment_histories',
    )
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    charged_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=3, choices=PAYMENT_CURRENCY_CHOICES, default=INR)
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4, blank=True, null=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=200, blank=True, null=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='created')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        display_amount = self.charged_amount if self.charged_amount is not None else self.amount
        return f"{self.adhoc_payment.payment_id} - {self.status} - {self.currency} {display_amount}"

class StudentSpecificClass(models.Model):
    """
    Classes specific to students
    """
    name = models.CharField(max_length=255)
    time = models.CharField(max_length=100, help_text="Class time as text")
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='student_classes',
        limit_choices_to={'role': 'student'}
    )
    class_link = models.URLField(blank=True, default='')
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='teaching_student_classes',
        limit_choices_to={'role': 'teacher'}
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.time}"
    
    class Meta:
        verbose_name = 'Student Specific Class'
        verbose_name_plural = 'Student Specific Classes'
        ordering = ['name']

class Masterclass(models.Model):
    """
    Classes specific to students
    """
    name = models.CharField(max_length=255)
    time = models.CharField(max_length=100, help_text="Class time as text")
    class_link = models.URLField()
    teacher = models.CharField(max_length=255, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image = models.ImageField(upload_to='masterclasses/', null=True, blank=True)
    
    def __str__(self):
        return f"{self.name} - {self.time}"
    
    class Meta:
        verbose_name = 'Student Specific Class'
        verbose_name_plural = 'Student Specific Classes'
        ordering = ['name']


class CourseSpecificClass(models.Model):
    """
    Classes specific to courses
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='course_classes')
    name = models.CharField(max_length=255)
    
    # Scheduling
    start_time = models.DateTimeField(default=timezone.now, help_text="Class Start Time")
    end_time = models.DateTimeField(default=timezone.now, help_text="Class End Time")
    
    link = models.URLField(blank=True, default='')
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='teaching_course_classes',
        limit_choices_to={'role': 'teacher'}
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.product.name} - {self.name}"
    
    class Meta:
        verbose_name = 'Course Specific Class'
        verbose_name_plural = 'Course Specific Classes'
        ordering = ['product', 'name']


class Recording(models.Model):
    """
    Class recordings
    """
    STATUS_CHOICES = (
        ('ready', 'Ready'),
        ('recording', 'Recording'),
        ('processing', 'Processing'),
        ('failed', 'Failed'),
    )

    class_name = models.CharField(max_length=255)
    recording_link = models.URLField(blank=True, null=True)
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='recordings',
        limit_choices_to={'role': 'student'}
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='uploaded_recordings',
        limit_choices_to={'role': 'teacher'}
    )
    note = models.TextField(blank=True, null=True)
    recording_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ready')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.class_name
    
    class Meta:
        verbose_name = 'Recording'
        verbose_name_plural = 'Recordings'
        ordering = ['-uploaded_at']


class Attendance(models.Model):
    """
    Student attendance tracking - One record per student per class
    """
    STATUS_CHOICES = (
        ('P', 'Present'),
        ('AB', 'Absent'),
        ('Partial', 'Partial'),
    )
    
    class_name = models.CharField(max_length=255)
    class_time = models.CharField(max_length=100)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendances',
        limit_choices_to={'role': 'student'}
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='AB')
    date = models.DateField(default=timezone.now)
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.student.get_full_name()} - {self.class_name} - {self.date}"
    
    class Meta:
        verbose_name = 'Attendance'
        verbose_name_plural = 'Attendances'
        ordering = ['-date']
        # unique_together = ['class_name', 'class_time', 'date', 'student']


class TestScore(models.Model):
    """
    Test scores for students
    """
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='test_scores',
        limit_choices_to={'role': 'student'}
    )
    test_name = models.CharField(max_length=255)
    marks_obtained = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(0)])
    total_marks = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(0)])
    remarks = models.TextField(blank=True, null=True)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='graded_tests',
        limit_choices_to={'role': 'teacher'}
    )
    test_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.student.username} - {self.test_name}"
    
    def get_percentage(self):
        """Calculate percentage score"""
        if self.total_marks > 0:
            return (self.marks_obtained / self.total_marks) * 100
        return 0
    
    class Meta:
        verbose_name = 'Test Score'
        verbose_name_plural = 'Test Scores'
        ordering = ['-test_date']


class Test(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)
    product = models.ForeignKey(
        'Product',
        on_delete=models.CASCADE,
        related_name='tests'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tests_created',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    duration_minutes = models.PositiveIntegerField(default=60)
    lock_on_window_blur = models.BooleanField(default=True)
    available_from = models.DateTimeField(blank=True, null=True)
    available_until = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    def total_marks(self):
        return sum(question.marks for question in self.questions.all())

    class Meta:
        ordering = ['-created_at']


class TestQuestion(models.Model):
    QUESTION_TYPE_CHOICES = (
        ('multiple_choice', 'Multiple Choice'),
        ('subjective', 'Subjective'),
        ('file_upload', 'File Upload'),
        ('coding', 'Coding'),
    )

    test = models.ForeignKey(
        Test,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    order = models.PositiveIntegerField(default=1)
    title = models.CharField(max_length=255, blank=True, null=True)
    prompt = models.TextField()
    question_type = models.CharField(max_length=30, choices=QUESTION_TYPE_CHOICES)
    marks = models.DecimalField(max_digits=6, decimal_places=2, default=1, validators=[MinValueValidator(0)])
    is_required = models.BooleanField(default=True)
    options = models.JSONField(default=list, blank=True)
    correct_options = models.JSONField(default=list, blank=True)
    attachment = models.FileField(upload_to='tests/questions/', blank=True, null=True)
    allowed_file_types = models.CharField(max_length=255, blank=True, null=True)
    starter_code = models.TextField(blank=True, null=True)
    coding_language = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.test.title} - Q{self.order}"

    class Meta:
        ordering = ['order', 'id']


class TestAttempt(models.Model):
    STATUS_CHOICES = (
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('locked', 'Locked'),
        ('submitted', 'Submitted'),
    )

    test = models.ForeignKey(
        Test,
        on_delete=models.CASCADE,
        related_name='attempts'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='test_attempts',
        limit_choices_to={'role': 'student'}
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    started_at = models.DateTimeField(blank=True, null=True)
    last_resumed_at = models.DateTimeField(blank=True, null=True)
    submitted_at = models.DateTimeField(blank=True, null=True)
    last_activity_at = models.DateTimeField(blank=True, null=True)
    locked_at = models.DateTimeField(blank=True, null=True)
    unlocked_at = models.DateTimeField(blank=True, null=True)
    unlocked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='test_attempts_unlocked'
    )
    locked_reason = models.TextField(blank=True, null=True)
    window_violation_count = models.PositiveIntegerField(default=0)
    current_question_index = models.PositiveIntegerField(default=0)
    time_spent_seconds = models.PositiveIntegerField(default=0)
    total_awarded_marks = models.DecimalField(max_digits=8, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    reviewed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student.username} - {self.test.title}"

    class Meta:
        ordering = ['-created_at']
        unique_together = ['test', 'student']


class TestAnswer(models.Model):
    attempt = models.ForeignKey(
        TestAttempt,
        on_delete=models.CASCADE,
        related_name='answers'
    )
    question = models.ForeignKey(
        TestQuestion,
        on_delete=models.CASCADE,
        related_name='answers'
    )
    selected_options = models.JSONField(default=list, blank=True)
    subjective_answer = models.TextField(blank=True, null=True)
    code_answer = models.TextField(blank=True, null=True)
    code_language = models.CharField(max_length=50, blank=True, null=True)
    uploaded_file = models.FileField(upload_to=test_answer_upload_path, blank=True, null=True)
    awarded_marks = models.DecimalField(max_digits=6, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    review_comment = models.TextField(blank=True, null=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='graded_test_answers'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.attempt} - {self.question_id}"

    class Meta:
        ordering = ['question__order', 'id']
        unique_together = ['attempt', 'question']


class Expense(models.Model):
    """
    Expenses tracking
    """
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    date = models.DateField(default=timezone.now)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='expenses_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.amount}"
    
    class Meta:
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
        ordering = ['-date']


class ContactFormMessage(models.Model):
    """
    Contact form messages from website
    """
    STATUS_CHOICES = (
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    )
    
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=15, blank=True, null=True)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_messages'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.subject}"
    
    class Meta:
        verbose_name = 'Contact Form Message'
        verbose_name_plural = 'Contact Form Messages'
        ordering = ['-created_at']


class SellerExpense(models.Model):
    """
    Expenses/Money given to Sellers
    """
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='seller_expenses_received',
        limit_choices_to={'role': 'seller'},
        help_text="Select the seller who received this money"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    date = models.DateField(default=timezone.now)
    description = models.TextField(blank=True, null=True, help_text="Reason for the expense")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='seller_expenses_created',
        help_text="Who created this record"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        # Using getattr to safely handle cases where seller might not have get_full_name
        seller_name = getattr(self.seller, 'get_full_name', lambda: self.seller.username)()
        return f"{seller_name} - {self.amount}"
    
    class Meta:
        verbose_name = 'Seller Expense'
        verbose_name_plural = 'Seller Expenses'
        ordering = ['-date']


class TeacherExpense(models.Model):
    """
    Expenses/Money given to Teachers
    """
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='teacher_expenses_received',
        limit_choices_to={'role': 'teacher'},
        help_text="Select the teacher who received this money"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    date = models.DateField(default=timezone.now)
    description = models.TextField(blank=True, null=True, help_text="Reason for the expense")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='teacher_expenses_created',
        help_text="Who created this record"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        # Using getattr to safely handle cases where teacher might not have get_full_name
        teacher_name = getattr(self.teacher, 'get_full_name', lambda: self.teacher.username)()
        return f"{teacher_name} - {self.amount}"
    
    class Meta:
        verbose_name = 'Teacher Expense'
        verbose_name_plural = 'Teacher Expenses'
        ordering = ['-date']


class ProductLead(models.Model):
    """
    Leads captured from the 'Enroll Now' button on course pages.
    """
    STATUS_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('in_progress', 'In Progress'),
        ('converted', 'Converted'),
        ('lost', 'Lost'),
    ]

    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    state = models.CharField(max_length=100, blank=True, null=True)
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='leads', null=True, blank=True)
    
    interest_area = models.CharField(max_length=255, blank=True, null=True)

    source = models.CharField(max_length=50, default='Course Page') # 'Home Page', 'Course Page', etc.
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='leads_assigned'
    )
    remarks = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.product.name}"
    
    class Meta:
        verbose_name = 'Product Lead'
        verbose_name_plural = 'Product Leads'
        ordering = ['-created_at']


class MicrosoftCourse(models.Model):
    """
    Cached Microsoft Learn catalog item used when the upstream catalog API is unavailable.
    """
    uid = models.CharField(max_length=512, blank=True, db_index=True)
    source_key = models.TextField(blank=True)
    source_key_hash = models.CharField(max_length=64, unique=True)
    slug = models.TextField(blank=True)
    title = models.CharField(max_length=500)
    summary = models.TextField(blank=True)
    subtitle = models.TextField(blank=True)
    url = models.URLField(max_length=1000, blank=True)
    icon_url = models.URLField(max_length=1000, blank=True)
    social_image_url = models.URLField(max_length=1000, blank=True)
    duration_in_minutes = models.PositiveIntegerField(default=0)
    levels = models.JSONField(default=list, blank=True)
    roles = models.JSONField(default=list, blank=True)
    products = models.JSONField(default=list, blank=True)
    subjects = models.JSONField(default=list, blank=True)
    learning_objectives = models.JSONField(default=list, blank=True)
    prerequisites = models.JSONField(default=list, blank=True)
    last_modified = models.DateTimeField(blank=True, null=True)
    course_type = models.CharField(max_length=40, db_index=True)
    type_label = models.CharField(max_length=120, blank=True)
    popularity = models.FloatField(default=0)
    locale = models.CharField(max_length=20, default='en-us', db_index=True)
    source_url = models.URLField(max_length=1000, blank=True)
    scraped = models.BooleanField(default=False)
    scraped_duration_label = models.CharField(max_length=120, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    synced_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'Microsoft Course'
        verbose_name_plural = 'Microsoft Courses'
        ordering = ['-popularity', '-last_modified', 'title']
        indexes = [
            models.Index(fields=['locale', 'course_type'], name='lms_ms_course_locale_type_idx'),
            models.Index(fields=['is_active', 'synced_at'], name='lms_ms_course_active_sync_idx'),
            models.Index(fields=['popularity', 'last_modified'], name='lms_ms_course_rank_idx'),
        ]


class Resource(models.Model):
    RESOURCE_TYPE_CHOICES = [
        ('pdf', 'PDF'),
        ('worksheet', 'Worksheet'),
        ('video', 'Video'),
        ('link', 'Link'),
        ('notes', 'Notes'),
        ('question_bank', 'Question Bank'),
        ('lesson_plan', 'Lesson Plan'),
    ]

    VISIBILITY_CHOICES = [
        ('teacher', 'Teacher Only'),
        ('admin', 'Admin Only'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    subject = models.CharField(max_length=120)
    curriculum = models.CharField(max_length=120)
    grade_or_course = models.CharField(max_length=120)
    topic = models.CharField(max_length=160)
    resource_type = models.CharField(max_length=32, choices=RESOURCE_TYPE_CHOICES)
    tags = models.JSONField(default=list, blank=True)
    external_url = models.URLField(blank=True, null=True)
    source_url = models.URLField(blank=True, null=True)
    imported_at = models.DateTimeField(blank=True, null=True)
    file = models.FileField(
        upload_to='resources/%Y/%m/',
        storage=protected_resource_storage,
        blank=True,
        null=True,
    )
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='teacher')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resources_uploaded',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'Resource'
        verbose_name_plural = 'Resources'
        ordering = ['-updated_at', '-created_at']


class ApprovedResourceDomain(models.Model):
    domain = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.domain

    class Meta:
        verbose_name = 'Approved Resource Domain'
        verbose_name_plural = 'Approved Resource Domains'
        ordering = ['domain']


class ResourceImportJob(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('running', 'Running'),
        ('aborted', 'Aborted'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    source_url = models.URLField()
    subject = models.CharField(max_length=120)
    curriculum = models.CharField(max_length=120)
    grade_or_course = models.CharField(max_length=120)
    topic = models.CharField(max_length=160)
    visibility = models.CharField(max_length=20, choices=Resource.VISIBILITY_CHOICES, default='teacher')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    progress_current = models.PositiveIntegerField(default=0)
    progress_total = models.PositiveIntegerField(default=0)
    created_resources_count = models.PositiveIntegerField(default=0)
    log_lines = models.JSONField(default=list, blank=True)
    error_message = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resource_import_jobs',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(blank=True, null=True)
    finished_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Resource import {self.pk} - {self.status}'

    class Meta:
        verbose_name = 'Resource Import Job'
        verbose_name_plural = 'Resource Import Jobs'
        ordering = ['-created_at']


class QuestionBankCourse(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    subject = models.CharField(max_length=100, default='Mathematics')
    profileTypes = models.JSONField(default=list, blank=True)
    grade_label = models.CharField(max_length=100)
    class_label = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    syllabus_label = models.CharField(max_length=255, blank=True, null=True)
    syllabus_source_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='question_bank_courses_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'Question Bank Course'
        verbose_name_plural = 'Question Bank Courses'
        ordering = ['title']


class QuestionBankTopic(models.Model):
    course = models.ForeignKey(
        QuestionBankCourse,
        on_delete=models.CASCADE,
        related_name='topics'
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    summary = models.TextField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.course.title} - {self.title}"

    class Meta:
        verbose_name = 'Question Bank Topic'
        verbose_name_plural = 'Question Bank Topics'
        ordering = ['order', 'title']
        unique_together = ['course', 'slug']


class QuestionBankQuestion(models.Model):
    topic = models.ForeignKey(
        QuestionBankTopic,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    question = models.TextField()
    answer = models.TextField()
    source_label = models.CharField(max_length=255, blank=True, null=True)
    source_url = models.URLField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.topic.title} - Question {self.pk}"

    class Meta:
        verbose_name = 'Question Bank Question'
        verbose_name_plural = 'Question Bank Questions'
        ordering = ['order', 'id']


class ReelGenerationJob(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('ready_for_review', 'Ready For Review'),
        ('queued_to_publish', 'Queued To Publish'),
        ('published', 'Published'),
        ('failed', 'Failed'),
    ]

    PROVIDER_STATUS_CHOICES = [
        ('not_configured', 'Not Configured'),
        ('ready', 'Ready'),
        ('queued', 'Queued'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reel_generation_jobs'
    )
    title = models.CharField(max_length=255)
    topic = models.CharField(max_length=255)
    prompt = models.TextField()
    language = models.CharField(max_length=50, default='English')
    tone = models.CharField(max_length=100, default='Friendly')
    duration_seconds = models.PositiveIntegerField(default=30)
    avatar_style = models.CharField(max_length=255, default='Young Indian female tutor avatar')
    board_style = models.CharField(max_length=255, default='Modern digital smart board')
    voice_style = models.CharField(max_length=255, default='Warm teacher voice')
    call_to_action = models.CharField(max_length=255, blank=True, null=True)
    include_instagram_post = models.BooleanField(default=False)
    instagram_caption = models.TextField(blank=True, null=True)
    hashtags = models.JSONField(default=list, blank=True)
    script_text = models.TextField(blank=True, null=True)
    scene_plan = models.JSONField(default=list, blank=True)
    board_notes = models.JSONField(default=list, blank=True)
    provider_payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    provider_status = models.CharField(
        max_length=30,
        choices=PROVIDER_STATUS_CHOICES,
        default='not_configured'
    )
    provider_name = models.CharField(max_length=100, blank=True, null=True)
    render_preview_url = models.URLField(blank=True, null=True)
    instagram_media_id = models.CharField(max_length=255, blank=True, null=True)
    instagram_permalink = models.URLField(blank=True, null=True)
    published_at = models.DateTimeField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'Reel Generation Job'
        verbose_name_plural = 'Reel Generation Jobs'
        ordering = ['-created_at']


class ForumPost(models.Model):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='forum_posts'
    )
    title = models.CharField(max_length=180, blank=True)
    content = models.TextField()
    rich_content = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title or f"Post #{self.pk}"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active', 'created_at']),
            models.Index(fields=['author', 'created_at']),
        ]


class ForumPostLike(models.Model):
    post = models.ForeignKey(
        ForumPost,
        on_delete=models.CASCADE,
        related_name='likes'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='forum_post_likes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user_id} -> {self.post_id}"

    class Meta:
        unique_together = ['post', 'user']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['post', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]


class ForumComment(models.Model):
    post = models.ForeignKey(
        ForumPost,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='forum_comments'
    )
    content = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Comment #{self.pk} on post #{self.post_id}"

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['post', 'created_at']),
            models.Index(fields=['author', 'created_at']),
            models.Index(fields=['is_active', 'created_at']),
        ]


class ForumNotification(models.Model):
    TYPE_NEW_POST = 'new_post'
    TYPE_POST_LIKE = 'post_like'
    TYPE_POST_COMMENT = 'post_comment'
    TYPE_POST_SHARE = 'post_share'

    NOTIFICATION_TYPE_CHOICES = [
        (TYPE_NEW_POST, 'New Post'),
        (TYPE_POST_LIKE, 'Post Like'),
        (TYPE_POST_COMMENT, 'Post Comment'),
        (TYPE_POST_SHARE, 'Post Share'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='forum_notifications',
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='forum_notifications_sent',
        null=True,
        blank=True,
    )
    post = models.ForeignKey(
        ForumPost,
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True,
    )
    notification_type = models.CharField(max_length=32, choices=NOTIFICATION_TYPE_CHOICES)
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.recipient_id} - {self.notification_type}"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', 'created_at']),
            models.Index(fields=['recipient', 'created_at']),
            models.Index(fields=['notification_type', 'created_at']),
        ]
