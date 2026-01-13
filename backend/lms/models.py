from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid


# Create your models here.


class Category(models.Model):
    """
    Categories for Products/Courses
    """
    name = models.CharField(max_length=200, unique=True)
    heading = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['name']


class Product(models.Model):
    """
    Products/Courses offered
    """
    name = models.CharField(max_length=255)
    total_seats = models.IntegerField(validators=[MinValueValidator(1)])
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    discounted_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, validators=[MinValueValidator(0)])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    def get_effective_price(self):
        """Returns discounted price if available, otherwise regular price"""
        return self.discounted_price if self.discounted_price else self.price
    
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
    
    # Coupon/Offer
    coupon_code = models.ForeignKey(Offer, on_delete=models.SET_NULL, null=True, blank=True, related_name='used_in_bookings')
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Payment details
    payment_link = models.URLField(blank=True, null=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_date = models.DateTimeField(null=True, blank=True)

    # Razorpay Details
    booking_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=200, blank=True, null=True)
    
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
        # Calculate final amount
        if self.coupon_code and self.coupon_code.is_valid():
            self.discount_amount = self.coupon_code.amount_off
        self.final_amount = self.price - self.discount_amount
        super().save(*args, **kwargs)
    
    class Meta:
        verbose_name = 'Course Booking'
        verbose_name_plural = 'Course Bookings'
        ordering = ['-booking_date']


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
    class_link = models.URLField()
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


class CourseSpecificClass(models.Model):
    """
    Classes specific to courses
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='course_classes')
    name = models.CharField(max_length=255)
    time = models.CharField(max_length=100, help_text="Class time as text")
    link = models.URLField()
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
    class_name = models.CharField(max_length=255)
    recording_link = models.URLField()
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
