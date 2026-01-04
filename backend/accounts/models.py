from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.


class User(AbstractUser):
    """
    Custom User model with role-based access
    """
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('seller', 'Seller'),
        ('student', 'Student'),
        ('teacher', 'Teacher'),
    )

    STUDENT_STATUS_CHOICES = [
        ('in_process', 'In Process'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('completed', 'Completed'),
        ('suspended', 'Suspended'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    phone = models.CharField(max_length=15, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    
    # Student specific fields
    student_status = models.CharField(
        max_length=20, 
        choices=STUDENT_STATUS_CHOICES, 
        default='in_process',
        blank=True,
        null=True
    )
    
    # Profile fields
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True)
    bio = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
