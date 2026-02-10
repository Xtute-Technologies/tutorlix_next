import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils import timezone
from datetime import timedelta


class Note(models.Model):
    """
    Main Notes Model
    - Can be course-specific (attached to products, accessible by enrolled students)
    - Can be individual (privacy determines access: public, logged-in only, or purchaseable)
    """
    NOTE_TYPE_CHOICES = [
        ('course_specific', 'Course Specific'),
        ('individual', 'Individual'),
    ]
    
    PRIVACY_CHOICES = [
        ('public', 'Public'),
        ('logged_in', 'Logged In Users Only'),
        ('purchaseable', 'Purchaseable'),
    ]
    
    # Basic Info
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True, null=True)
    
    # Content (BlockNote JSON structure)
    content = models.JSONField(
        default=dict,
        blank=True,
        help_text="BlockNote editor content as JSON"
    )
    
    # Creator
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_notes',
        limit_choices_to={'role__in': ['teacher', 'admin']}
    )
    
    # Note Type & Privacy
    note_type = models.CharField(
        max_length=20,
        choices=NOTE_TYPE_CHOICES,
        default='individual',
        help_text="Course Specific: tied to a product. Individual: privacy field applies."
    )
    privacy = models.CharField(
        max_length=20,
        choices=PRIVACY_CHOICES,
        default='logged_in',
        help_text="Only applies to individual notes. Ignored for course-specific notes."
    )
    
    # Course/Product Association (for course-specific notes)
    product = models.ForeignKey(
        'lms.Product',
        on_delete=models.CASCADE,
        related_name='notes',
        null=True,
        blank=True,
        help_text="Link to product/course for course-specific notes"
    )
    
    # Pricing (for paid notes)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    discounted_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0)]
    )
    
    # Access Duration (for paid notes)
    access_duration_days = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Duration in days after purchase. 0 = lifetime access."
    )
    
    # Description/Preview
    description = models.TextField(
        blank=True,
        help_text="Short description for preview/listing"
    )
    
    # Status
    is_draft = models.BooleanField(
        default=True,
        help_text="Auto-save draft feature"
    )
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} ({self.get_note_type_display()})"
    
    def get_effective_price(self):
        """Return the price to be charged (discounted if available)"""
        return self.discounted_price if self.discounted_price else self.price
    
    def can_user_access(self, user):
        """
        Centralized logic to check if a user can view this note.
        """
        # Handle AnonymousUser
        if not user or not user.is_authenticated:
            return (
                self.note_type == 'individual' and 
                self.privacy == 'public' and 
                self.is_active and 
                not self.is_draft
            )

        # Admin and creator always have access
        if user.role == 'admin' or self.creator == user:
            return True
        
        # If note is not active or is draft, only creator/admin can access
        if not self.is_active or self.is_draft:
            return False
        
        # Course-specific notes: check if user has active booking for the product
        if self.note_type == 'course_specific':
            if not self.product:
                return False
            from lms.models import CourseBooking
            has_active_booking = CourseBooking.objects.filter(
                student=user,
                product=self.product,
                payment_status='paid',
                student_status='active'
            ).exists()
            return has_active_booking
        
        # Individual notes: check privacy setting
        if self.note_type == 'individual':
            # Public: anyone can access
            if self.privacy == 'public':
                return True
            
            # Logged in: any authenticated user can access if they are enrolled
            if self.privacy == 'logged_in' and user.is_authenticated:
                 # Check for valid access
                valid_accesses = self.accesses.filter(
                    student=user,
                    is_active=True
                )
                return any(access.is_valid() for access in valid_accesses)
            
            # Purchaseable: check for valid access (purchase or manual grant)
            if self.privacy == 'purchaseable':
                # Check for valid access (purchase or manual grant)
                valid_accesses = self.accesses.filter(
                    student=user,
                    is_active=True
                )
                return any(access.is_valid() for access in valid_accesses)
        
        return False
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['note_type', 'is_active']),
            models.Index(fields=['creator', 'is_draft']),
        ]


class NoteAttachment(models.Model):
    """
    Attachments for Notes (Images/PDFs)
    """
    FILE_TYPE_CHOICES = [
        ('image', 'Image'),
        ('pdf', 'PDF Document'),
    ]
    
    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(
        upload_to='notes/attachments/%Y/%m/',
        help_text="Upload image or PDF"
    )
    file_type = models.CharField(
        max_length=10,
        choices=FILE_TYPE_CHOICES,
        default='image'
    )
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.IntegerField(
        blank=True,
        null=True,
        help_text="File size in bytes"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.note.title} - {self.file_name or self.file.name}"
    
    def save(self, *args, **kwargs):
        # Auto-populate file_name and file_size
        if self.file:
            if not self.file_name:
                self.file_name = self.file.name
            if not self.file_size:
                self.file_size = self.file.size
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-created_at']


class NotePurchase(models.Model):
    """
    Note Purchase Transactions (similar to CourseBooking)
    Tracks student purchases of paid notes
    """
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    # Unique identifier for this purchase
    purchase_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True
    )
    
    # Student & Note
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='note_purchases',
        limit_choices_to={'role': 'student'}
    )
    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='purchases'
    )
    
    # Pricing
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Original price at time of purchase"
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    final_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Final amount paid"
    )
    
    # Payment Details (Razorpay)
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='pending'
    )
    payment_link = models.URLField(blank=True, null=True)
    payment_date = models.DateTimeField(null=True, blank=True)
    
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=200, blank=True, null=True)
    
    # Access Management
    access_valid_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the access expires (null = lifetime)"
    )
    
    # Tracking
    purchased_by = models.CharField(
        max_length=200,
        blank=True,
        help_text="Name of sales rep or system (for admin-created purchases)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.student.email} - {self.note.title} ({self.payment_status})"
    
    def save(self, *args, **kwargs):
        # Calculate access_valid_until on payment
        # NOTE: User requested strict lifetime access enforcing for purchased notes
        # So we force access_valid_until to None (Lifetime) regardless of note configuration.
        if self.payment_status == 'paid':
             self.access_valid_until = None
        
        super().save(*args, **kwargs)
    
    def is_access_valid(self):
        """Check if the access is still valid"""
        if self.payment_status != 'paid':
            return False
        if not self.access_valid_until:
            return True  # Lifetime access
        return timezone.now() <= self.access_valid_until
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['student', 'note']  # One purchase per student per note
        indexes = [
            models.Index(fields=['student', 'payment_status']),
            models.Index(fields=['note', 'payment_status']),
        ]


class NoteAccess(models.Model):
    """
    Manual Access Management by Admin
    Tracks who has access to which notes (can be granted manually)
    """
    ACCESS_TYPE_CHOICES = [
        ('purchase', 'Via Purchase'),
        ('course_booking', 'Via Course Booking'),
        ('manual', 'Manual Grant by Admin'),
        ('free_enrollment', 'Free Enrollment'),
    ]
    
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='note_accesses',
        limit_choices_to={'role': 'student'}
    )
    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='accesses'
    )
    
    access_type = models.CharField(
        max_length=20,
        choices=ACCESS_TYPE_CHOICES,
        default='manual'
    )
    
    # Related records
    purchase = models.ForeignKey(
        NotePurchase,
        on_delete=models.CASCADE,
        related_name='accesses',
        null=True,
        blank=True,
        help_text="Link to purchase if access_type is 'purchase'"
    )
    course_booking = models.ForeignKey(
        'lms.CourseBooking',
        on_delete=models.CASCADE,
        related_name='note_accesses',
        null=True,
        blank=True,
        help_text="Link to course booking if access_type is 'course_booking'"
    )
    
    # Access validity
    valid_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When access expires (null = lifetime)"
    )
    is_active = models.BooleanField(default=True)
    
    # Tracking
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='granted_note_accesses',
        limit_choices_to={'role__in': ['admin']}
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.student.email} -> {self.note.title} ({self.access_type})"
    
    def save(self, *args, **kwargs):
        """Auto-set valid_until based on the source (Purchase or Manual)"""
        if self.access_type == 'purchase' and self.purchase:
            self.valid_until = self.purchase.access_valid_until
        elif self.access_type == 'course_booking' and self.course_booking:
            # Sync with course booking expiry
            if self.course_booking.course_expiry_date:
                from django.utils import timezone
                self.valid_until = timezone.make_aware(
                    timezone.datetime.combine(
                        self.course_booking.course_expiry_date,
                        timezone.datetime.min.time()
                    )
                )
        super().save(*args, **kwargs)
    
    def is_valid(self):
        """Check if access is currently valid"""
        if not self.is_active:
            return False
        if not self.valid_until:
            return True  # Lifetime access
        return timezone.now() <= self.valid_until
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', 'is_active']),
            models.Index(fields=['note', 'is_active']),
        ]
