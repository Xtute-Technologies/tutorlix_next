from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Category, ProfileType, Product, ProductImage, Offer, CourseBooking,
    AdhocPayment, AdhocPaymentHistory,
    StudentSpecificClass, CourseSpecificClass, Recording,
    Attendance, TestScore, Expense, ContactFormMessage,
    SellerExpense, TeacherExpense, Masterclass,
    QuestionBankCourse, QuestionBankTopic, QuestionBankQuestion, ReelGenerationJob,
    MicrosoftCourse
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'heading', 'created_at']
    search_fields = ['name', 'heading']
    ordering = ['name']


@admin.register(ProfileType)
class ProfileTypeAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'order', 'is_active']
    list_filter = ['is_active']
    search_fields = ['title', 'slug', 'description']
    ordering = ['order', 'title']


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    max_num = 5


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'discounted_price', 'total_seats', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['-created_at']
    inlines = [ProductImageInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'category', 'description')
        }),
        ('Pricing', {
            'fields': ('price', 'discounted_price', 'total_seats')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )


@admin.register(MicrosoftCourse)
class MicrosoftCourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'course_type', 'locale', 'popularity', 'last_modified', 'synced_at', 'is_active']
    list_filter = ['course_type', 'locale', 'is_active', 'scraped']
    search_fields = ['title', 'uid', 'url', 'summary']
    readonly_fields = ['source_key_hash', 'raw_payload', 'created_at', 'updated_at']
    ordering = ['-synced_at', 'title']


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'is_primary', 'created_at']
    list_filter = ['is_primary', 'created_at']
    search_fields = ['product__name']


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ['voucher_name', 'code', 'product', 'amount_off', 'is_active', 'valid_from', 'valid_to', 'usage_display']
    list_filter = ['is_active', 'valid_from', 'valid_to']
    search_fields = ['voucher_name', 'code', 'product__name']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Offer Details', {
            'fields': ('voucher_name', 'code', 'product', 'amount_off')
        }),
        ('Validity', {
            'fields': ('is_active', 'valid_from', 'valid_to')
        }),
        ('Usage', {
            'fields': ('max_usage', 'current_usage')
        }),
    )
    
    def usage_display(self, obj):
        if obj.max_usage:
            return f"{obj.current_usage} / {obj.max_usage}"
        return f"{obj.current_usage} / Unlimited"
    usage_display.short_description = 'Usage'


@admin.register(CourseBooking)
class CourseBookingAdmin(admin.ModelAdmin):
    list_display = ['student', 'course_name', 'final_amount', 'payment_status', 'student_status', 'sales_representative', 'booking_date']
    list_filter = ['payment_status', 'student_status', 'booking_date', 'sales_representative']
    search_fields = ['student__email', 'student__first_name', 'student__last_name', 'course_name', 'booked_by']
    ordering = ['-booking_date']
    readonly_fields = ['booking_date', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student', 'student_status')
        }),
        ('Course Details', {
            'fields': ('product', 'course_name', 'price', 'coupon_code', 'discount_amount', 'final_amount')
        }),
        ('Payment Information', {
            'fields': ('payment_link', 'payment_status', 'payment_date')
        }),
        ('Booking Details', {
            'fields': ('booked_by', 'sales_representative', 'booking_date', 'course_expiry_date')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser or request.user.role == 'admin':
            return qs
        elif request.user.role == 'seller':
            return qs.filter(sales_representative=request.user)
        elif request.user.role == 'student':
            return qs.filter(student=request.user)
        return qs.none()


@admin.register(AdhocPayment)
class AdhocPaymentAdmin(admin.ModelAdmin):
    list_display = ['title', 'client_name', 'amount', 'payment_status', 'created_by', 'created_at']
    list_filter = ['payment_status', 'created_at', 'created_by']
    search_fields = ['title', 'client_name', 'client_email', 'client_phone']
    ordering = ['-created_at']
    readonly_fields = ['payment_id', 'payment_link', 'payment_date', 'razorpay_order_id', 'razorpay_payment_id', 'created_at', 'updated_at']


@admin.register(AdhocPaymentHistory)
class AdhocPaymentHistoryAdmin(admin.ModelAdmin):
    list_display = ['adhoc_payment', 'amount', 'status', 'razorpay_payment_id', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['adhoc_payment__title', 'razorpay_order_id', 'razorpay_payment_id']
    ordering = ['-created_at']


# class AttendanceRecordInline(admin.TabularInline):
#     model = AttendanceRecord
#     extra = 1


@admin.register(StudentSpecificClass)
class StudentSpecificClassAdmin(admin.ModelAdmin):
    list_display = ['name', 'teacher', 'time', 'is_active', 'created_at']
    list_filter = ['teacher', 'is_active', 'created_at']
    search_fields = ['name', 'teacher__username']
    filter_horizontal = ['students']
    ordering = ['name']

@admin.register(Masterclass)
class MasterclassAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'time',
        'users_count',
        'is_active',
        'image_preview',
        'created_at',
    ]

    list_filter = [
        'is_active',
        'created_at',
    ]

    search_fields = [
        'name',
        'users__username',
        'users__email',
    ]

    readonly_fields = ['image_preview']

    ordering = ['name']

    def users_count(self, obj):
        return obj.users.count()
    users_count.short_description = "Users"

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="50" height="50" style="object-fit:cover;border-radius:5px;" />',
                obj.image.url
            )
        return "No Image"
    image_preview.short_description = "Image"


@admin.register(CourseSpecificClass)
class CourseSpecificClassAdmin(admin.ModelAdmin):
    list_display = ['name', 'teacher', 'is_active', 'created_at']
    list_filter = [ 'teacher', 'is_active', 'created_at']
    search_fields = ['name', 'teacher__username']
    ordering = [ 'name']


@admin.register(Recording)
class RecordingAdmin(admin.ModelAdmin):
    list_display = ['class_name', 'teacher', 'created_at']
    list_filter = ['teacher', 'created_at']
    search_fields = ['class_name', 'teacher__username']
    filter_horizontal = ['students']
    ordering = ['-created_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser or request.user.role == 'admin':
            return qs
        elif request.user.role == 'teacher':
            return qs.filter(teacher=request.user)
        elif request.user.role == 'student':
            return qs.filter(students=request.user)
        return qs.none()


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['class_name', 'class_time', 'created_at']
    list_filter = ['class_time', 'created_at']
    search_fields = ['class_name']
    ordering = ['-class_time']
    # inlines = [AttendanceRecordInline]


# @admin.register(AttendanceRecord)
# class AttendanceRecordAdmin(admin.ModelAdmin):
#     list_display = ['attendance', 'student', 'status']
#     list_filter = ['status', 'attendance__class_time']
#     search_fields = ['student__username', 'attendance__class_name']


@admin.register(TestScore)
class TestScoreAdmin(admin.ModelAdmin):
    list_display = ['student', 'test_name', 'marks_obtained', 'total_marks', 'percentage_display', 'teacher', 'test_date']
    list_filter = ['teacher', 'test_date']
    search_fields = ['student__username', 'test_name', 'teacher__username']
    ordering = ['-test_date']
    
    def percentage_display(self, obj):
        return f"{obj.percentage:.2f}%"
    percentage_display.short_description = 'Percentage'


class QuestionBankTopicInline(admin.TabularInline):
    model = QuestionBankTopic
    extra = 0


@admin.register(QuestionBankCourse)
class QuestionBankCourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'grade_label', 'class_label', 'is_active', 'created_by', 'created_at']
    list_filter = ['subject', 'grade_label', 'class_label', 'is_active']
    search_fields = ['title', 'slug', 'subject', 'grade_label', 'class_label']
    inlines = [QuestionBankTopicInline]


class QuestionBankQuestionInline(admin.TabularInline):
    model = QuestionBankQuestion
    extra = 0


@admin.register(QuestionBankTopic)
class QuestionBankTopicAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order', 'is_active']
    list_filter = ['is_active', 'course']
    search_fields = ['title', 'slug', 'course__title']
    inlines = [QuestionBankQuestionInline]


@admin.register(QuestionBankQuestion)
class QuestionBankQuestionAdmin(admin.ModelAdmin):
    list_display = ['topic', 'order', 'is_active', 'source_label']
    list_filter = ['is_active', 'topic__course']
    search_fields = ['question', 'answer', 'topic__title', 'topic__course__title']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['name', 'amount', 'date', 'created_by', 'created_at']
    list_filter = ['date', 'created_by']
    search_fields = ['name', 'description']
    ordering = ['-date']


@admin.register(ContactFormMessage)
class ContactFormMessageAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'subject', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'email', 'subject', 'message']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Contact Information', {
            'fields': ('name', 'email', 'phone')
        }),
        ('Message', {
            'fields': ('subject', 'message')
        }),
        ('Status', {
            'fields': ('status', 'assigned_to')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SellerExpense)
class SellerExpenseAdmin(admin.ModelAdmin):
    list_display = ['seller', 'amount', 'date', 'created_by']
    list_filter = ['date']
    search_fields = ['seller__username', 'seller__email', 'description']
    ordering = ['-date']


@admin.register(TeacherExpense)
class TeacherExpenseAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'amount', 'date', 'created_by']
    list_filter = ['date']
    search_fields = ['teacher__username', 'teacher__email', 'description']
    ordering = ['-date']


@admin.register(ReelGenerationJob)
class ReelGenerationJobAdmin(admin.ModelAdmin):
    list_display = ['title', 'topic', 'status', 'provider_status', 'include_instagram_post', 'created_by', 'created_at']
    list_filter = ['status', 'provider_status', 'include_instagram_post', 'language']
    search_fields = ['title', 'topic', 'prompt', 'instagram_caption', 'created_by__username']
    readonly_fields = ['created_at', 'updated_at', 'published_at']
