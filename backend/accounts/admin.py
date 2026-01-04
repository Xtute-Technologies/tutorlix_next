from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom User Admin with role-based filtering and student status
    """
    list_display = ['username', 'email', 'get_full_name_display', 'phone', 'role', 'student_status', 'is_active', 'date_joined']
    list_filter = ['role', 'student_status', 'is_active', 'is_staff', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone']
    ordering = ['-date_joined']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role & Status', {
            'fields': ('role', 'student_status')
        }),
        ('Contact Information', {
            'fields': ('phone', 'state')
        }),
        ('Profile', {
            'fields': ('profile_image', 'bio')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('email', 'first_name', 'last_name', 'role', 'phone', 'state')
        }),
    )
    
    def get_full_name_display(self, obj):
        return obj.get_full_name()
    get_full_name_display.short_description = 'Full Name'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Admin sees everything, others see based on role
        if request.user.is_superuser:
            return qs
        elif request.user.role == 'admin':
            return qs
        elif request.user.role == 'teacher':
            return qs.filter(role='student')
        elif request.user.role == 'seller':
            return qs.filter(role='student')
        return qs.filter(id=request.user.id)
