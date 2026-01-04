from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Category, Product, ProductImage, Offer, CourseBooking,
    StudentSpecificClass, CourseSpecificClass, Recording,
    Attendance, TestScore, Expense, ContactFormMessage
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'heading', 'created_at']
    search_fields = ['name', 'heading']
    ordering = ['name']


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


@admin.register(CourseSpecificClass)
class CourseSpecificClassAdmin(admin.ModelAdmin):
    list_display = ['name', 'teacher', 'time', 'is_active', 'created_at']
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
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser or request.user.role == 'admin':
            return qs
        elif request.user.role == 'teacher':
            return qs.filter(teacher=request.user)
        elif request.user.role == 'student':
            return qs.filter(student=request.user)
        return qs.none()


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
            'fields': ('status', 'admin_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
