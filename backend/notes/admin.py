from django.contrib import admin
from django.utils.html import format_html
from .models import Note, NoteAttachment, NotePurchase, NoteAccess


class NoteAttachmentInline(admin.TabularInline):
    model = NoteAttachment
    extra = 0
    fields = ['file', 'file_type', 'file_name', 'file_size', 'created_at']
    readonly_fields = ['file_size', 'created_at']


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = [
        'title', 
        'note_type', 
        'privacy', 
        'creator', 
        'product',
        'price_display',
        'is_draft', 
        'is_active', 
        'created_at'
    ]
    list_filter = [
        'note_type', 
        'privacy', 
        'is_draft', 
        'is_active', 
        'created_at',
        'creator'
    ]
    search_fields = ['title', 'description', 'creator__email', 'product__name']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['created_at', 'updated_at']
    inlines = [NoteAttachmentInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'slug', 'description', 'creator')
        }),
        ('Content', {
            'fields': ('content',)
        }),
        ('Type & Privacy', {
            'fields': ('note_type', 'privacy', 'product')
        }),
        ('Pricing & Access', {
            'fields': ('price', 'discounted_price', 'access_duration_days')
        }),
        ('Status', {
            'fields': ('is_draft', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def price_display(self, obj):
        if obj.note_type == 'paid':
            if obj.discounted_price:
                return format_html(
                    '<span style="text-decoration: line-through;">₹{}</span> <strong>₹{}</strong>',
                    obj.price,
                    obj.discounted_price
                )
            return f"₹{obj.price}"
        return "-"
    price_display.short_description = "Price"
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.role == 'teacher':
            return qs.filter(creator=request.user)
        return qs
    
    def save_model(self, request, obj, form, change):
        if not change:  # Creating new note
            obj.creator = request.user
        super().save_model(request, obj, form, change)


@admin.register(NoteAttachment)
class NoteAttachmentAdmin(admin.ModelAdmin):
    list_display = ['note', 'file_name', 'file_type', 'file_size_display', 'created_at']
    list_filter = ['file_type', 'created_at']
    search_fields = ['note__title', 'file_name']
    readonly_fields = ['file_size', 'created_at']
    
    def file_size_display(self, obj):
        if obj.file_size:
            # Convert bytes to KB/MB
            size_kb = obj.file_size / 1024
            if size_kb > 1024:
                return f"{size_kb / 1024:.2f} MB"
            return f"{size_kb:.2f} KB"
        return "-"
    file_size_display.short_description = "Size"


@admin.register(NotePurchase)
class NotePurchaseAdmin(admin.ModelAdmin):
    list_display = [
        'purchase_id_short',
        'student',
        'note',
        'final_amount',
        'payment_status',
        'payment_date',
        'access_status',
        'created_at'
    ]
    list_filter = [
        'payment_status',
        'payment_date',
        'created_at',
        'note__note_type'
    ]
    search_fields = [
        'student__email',
        'student__first_name',
        'student__last_name',
        'note__title',
        'purchase_id',
        'razorpay_order_id',
        'razorpay_payment_id'
    ]
    readonly_fields = [
        'purchase_id',
        'created_at',
        'updated_at',
        'razorpay_order_id',
        'razorpay_payment_id',
        'razorpay_signature'
    ]
    
    fieldsets = (
        ('Purchase Details', {
            'fields': ('purchase_id', 'student', 'note')
        }),
        ('Pricing', {
            'fields': ('price', 'discount_amount', 'final_amount')
        }),
        ('Payment Information', {
            'fields': (
                'payment_status',
                'payment_date',
                'payment_link',
                'razorpay_order_id',
                'razorpay_payment_id',
                'razorpay_signature'
            )
        }),
        ('Access Management', {
            'fields': ('access_valid_until',)
        }),
        ('Tracking', {
            'fields': ('purchased_by',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def purchase_id_short(self, obj):
        return str(obj.purchase_id)[:8] + "..."
    purchase_id_short.short_description = "Purchase ID"
    
    def access_status(self, obj):
        if obj.is_access_valid():
            if obj.access_valid_until:
                return format_html(
                    '<span style="color: green;">✓ Valid until {}</span>',
                    obj.access_valid_until.strftime("%Y-%m-%d")
                )
            return format_html('<span style="color: green;">✓ Lifetime</span>')
        return format_html('<span style="color: red;">✗ Expired</span>')
    access_status.short_description = "Access"
    
    actions = ['mark_as_paid', 'mark_as_refunded']
    
    def mark_as_paid(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(payment_status='pending').update(
            payment_status='paid',
            payment_date=timezone.now()
        )
        self.message_user(request, f"{updated} purchase(s) marked as paid.")
    mark_as_paid.short_description = "Mark selected as Paid"
    
    def mark_as_refunded(self, request, queryset):
        updated = queryset.filter(payment_status='paid').update(
            payment_status='refunded'
        )
        self.message_user(request, f"{updated} purchase(s) marked as refunded.")
    mark_as_refunded.short_description = "Mark selected as Refunded"


@admin.register(NoteAccess)
class NoteAccessAdmin(admin.ModelAdmin):
    list_display = [
        'student',
        'note',
        'access_type',
        'is_active',
        'validity_status',
        'granted_by',
        'created_at'
    ]
    list_filter = [
        'access_type',
        'is_active',
        'created_at',
        'granted_by'
    ]
    search_fields = [
        'student__email',
        'student__first_name',
        'student__last_name',
        'note__title'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Access Details', {
            'fields': ('student', 'note', 'access_type')
        }),
        ('Related Records', {
            'fields': ('purchase', 'course_booking')
        }),
        ('Validity', {
            'fields': ('valid_until', 'is_active')
        }),
        ('Tracking', {
            'fields': ('granted_by',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def validity_status(self, obj):
        if obj.is_valid():
            if obj.valid_until:
                return format_html(
                    '<span style="color: green;">✓ Valid until {}</span>',
                    obj.valid_until.strftime("%Y-%m-%d")
                )
            return format_html('<span style="color: green;">✓ Lifetime</span>')
        return format_html('<span style="color: red;">✗ Invalid</span>')
    validity_status.short_description = "Status"
    
    def save_model(self, request, obj, form, change):
        if not change and obj.access_type == 'manual':
            obj.granted_by = request.user
        super().save_model(request, obj, form, change)
