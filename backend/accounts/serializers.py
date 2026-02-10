from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer as BaseRegisterSerializer
from dj_rest_auth.serializers import LoginSerializer as BaseLoginSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.conf import settings
try:
    from allauth.account.models import EmailAddress
except ImportError:
    EmailAddress = None
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """
    Basic user serializer for listing
    """
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'phone', 'role','is_active']
        read_only_fields = ['id', 'username','is_active']
    
    def get_full_name(self, obj):
        return obj.get_full_name()

class UserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for user details.
    Used by: Admin (UserDetailView) and Self (UserProfileView)
    """
    full_name = serializers.SerializerMethodField()
    email_verified = serializers.BooleanField(required=False, default=False)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'state', 'role', 'student_status',
            'profile_image', 'bio', 'created_at', 'updated_at', 'is_active', 'allow_manual_price',
            'email_verified'
        ]
        # REMOVED 'is_active' from read_only_fields so it can be updated
        read_only_fields = ['id', 'username', 'created_at', 'updated_at']
    
    def get_full_name(self, obj):
        return obj.get_full_name()

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if EmailAddress:
            try:
                email_obj = EmailAddress.objects.filter(user=instance, email=instance.email).first()
                ret['email_verified'] = email_obj.verified if email_obj else False
            except Exception:
                ret['email_verified'] = False
        else:
            ret['email_verified'] = False
        return ret

    def validate_is_active(self, value):
        """
        Security Check 1: Only Admins can change is_active status
        """
        request = self.context.get('request')
        if request and request.user.role != 'admin' and not request.user.is_staff:
            raise serializers.ValidationError("You do not have permission to change the account status.")
        return value

    def update(self, instance, validated_data):
        """
        Security Check 2: Users cannot change their OWN active status (even admins)
        """
        request = self.context.get('request')
        if 'is_active' in validated_data:
            if request and request.user.id == instance.id:
                raise serializers.ValidationError({"is_active": "You cannot activate/deactivate your own account."})

        # --- Handle Email Verification Status Update (Admin Only) ---
        if 'email_verified' in validated_data:
            # Check permissions (admins or staff only)
            if request and (request.user.role == 'admin' or request.user.is_staff):
                new_status = validated_data.pop('email_verified')
                if EmailAddress:
                    try:
                        email_obj = EmailAddress.objects.filter(user=instance, email=instance.email).first()
                        if email_obj:
                            email_obj.verified = new_status
                            email_obj.save()
                        elif new_status:
                            # If no email address record exists, create one if setting to verified
                            EmailAddress.objects.create(
                                user=instance,
                                email=instance.email,
                                verified=True,
                                primary=True
                            )
                    except Exception:
                        pass
            else:
                # Remove it if not authorized
                validated_data.pop('email_verified', None)
        
        return super().update(instance, validated_data)
    
    def validateManualPricePermission(self, data):
        role = self.instance.role if self.instance else None

        if "allow_manual_price" in data and role != "seller":
            raise serializers.ValidationError(
                "Manual override permission can be set only for sellers."
            )

        return data
    
class SimpleUserSerializer(serializers.ModelSerializer):
    """
    Simple user serializer for teacher/seller expense details
    """
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'full_name', 'profile_image', 'email', 'phone', 'role', 'allow_manual_price']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class PublicUserSerializer(serializers.ModelSerializer):
    """
    Minimal user serializer for public display (notes, comments, etc.)
    Only exposes id, name, and email
    """
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'full_name',"profile_image"]
    
    def get_full_name(self, obj):
        return obj.get_full_name()

class CustomRegisterSerializer(BaseRegisterSerializer):
    """
    Custom registration serializer limited to Student and Seller roles only.
    """
    # Define the allowed roles explicitly for the registration dropdown/field
    ALLOWED_ROLES = (
        ('student', 'Student'),
        ('seller', 'Seller'),
    )

    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    phone = serializers.CharField(required=True, max_length=15)
    state = serializers.CharField(required=False, max_length=100, allow_blank=True)
    # Use the restricted choices here
    role = serializers.ChoiceField(choices=ALLOWED_ROLES, default='student')
    
    def validate_role(self, value):
        """
        Extra security layer: explicitly block 'teacher' or 'admin'
        even if someone tries to inject the value via API.
        """
        if value not in ['student', 'seller']:
            raise serializers.ValidationError(
                "Registration is only allowed for Students and Sellers."
            )
        return value

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data['first_name'] = self.validated_data.get('first_name', '')
        data['last_name'] = self.validated_data.get('last_name', '')
        data['phone'] = self.validated_data.get('phone', '')
        data['state'] = self.validated_data.get('state', '')
        data['role'] = self.validated_data.get('role', 'student')
        return data
    
    def validate_phone(self, value):
        """Validate phone number is unique"""
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return value
    
    def save(self, request):
        user = super().save(request)
        user.first_name = self.validated_data.get('first_name', '')
        user.last_name = self.validated_data.get('last_name', '')
        user.phone = self.validated_data.get('phone', '')
        user.state = self.validated_data.get('state', '')
        user.role = self.validated_data.get('role', 'student')
        user.save()
        return user
    
class CustomLoginSerializer(BaseLoginSerializer):
    """
    Custom login serializer that allows login with email or phone
    """
    username = None
    email = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(style={'input_type': 'password'})
    
    def validate(self, attrs):
        email = attrs.get('email', '')
        phone = attrs.get('phone', '')
        password = attrs.get('password')
        
        if not email and not phone:
            raise serializers.ValidationError('Must include either "email" or "phone"')
        
        # Try to authenticate with email or phone
        identifier = email if email else phone
        
        user = authenticate(
            request=self.context.get('request'),
            username=identifier,
            password=password
        )
        
        if not user:
            raise serializers.ValidationError('Unable to log in with provided credentials.')
        
        # Did we get back an active user?
        if not user.is_active:
            raise serializers.ValidationError('User account is disabled.')

        # Check Email Verification if mandatory
        if getattr(settings, 'ACCOUNT_EMAIL_VERIFICATION', 'optional') == 'mandatory' and EmailAddress:
            # Skip verification check for admins
            if user.role != 'admin':
                try:
                    email_address = EmailAddress.objects.get(user=user, email=user.email)
                    if not email_address.verified:
                        raise serializers.ValidationError('E-mail is not verified.')
                except EmailAddress.DoesNotExist:
                    # If no email address record exists (rare if registered properly), treat as unverified or safe fall through depending on policy.
                    # Usually allauth creates it. If mandatory, we should panic. 
                    # But if created by admin or superuser without allauth flow, might happen.
                    if not user.is_superuser:
                        raise serializers.ValidationError('E-mail is not verified.')
        
        attrs['user'] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change endpoint
    """
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    
    def validate_new_password(self, value):
        # Add password validation here if needed
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        
        # Set student status to in_process for students
        if user.role == 'student':
            user.student_status = 'in_process'
            user.save()
        
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for login with email/phone and password
    """
    identifier = serializers.CharField(required=True, help_text="Email, phone number, or username")
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        identifier = attrs.get('identifier')
        password = attrs.get('password')

        if identifier and password:
            # Try to find user by email, phone, or username
            user = None
            
            # Check if identifier is email
            if '@' in identifier:
                try:
                    user = User.objects.get(email=identifier)
                except User.DoesNotExist:
                    pass
            
            # Check if identifier is phone
            if not user and identifier.replace('+', '').replace('-', '').replace(' ', '').isdigit():
                try:
                    user = User.objects.get(phone=identifier)
                except User.DoesNotExist:
                    pass
            
            # Check if identifier is username
            if not user:
                try:
                    user = User.objects.get(username=identifier)
                except User.DoesNotExist:
                    pass
            
            if user:
                # Verify password
                if user.check_password(password):
                    if not user.is_active:
                        raise serializers.ValidationError('User account is disabled.')
                    attrs['user'] = user
                else:
                    raise serializers.ValidationError('Invalid credentials.')
            else:
                raise serializers.ValidationError('User not found.')
        else:
            raise serializers.ValidationError('Must include "identifier" and "password".')

        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change
    """
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for password reset request
    """
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for password reset confirmation
    """
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile update
    """
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'state', 'profile_image', 'bio']


class CreateUserSerializer(serializers.ModelSerializer):
    """
    Serializer for Admins to create new users with a password.
    """
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'phone', 'role', 'password', 'is_active', 'profile_image'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        # Create user instance
        user = User.objects.create(**validated_data)
        # Set password properly (hashes it)
        user.set_password(password)
        user.save()
        return user
    

from dj_rest_auth.serializers import PasswordResetSerializer
from django.conf import settings
from django.contrib.auth.forms import PasswordResetForm

class CustomPasswordResetSerializer(PasswordResetSerializer):
    """
    Custom serializer to inject the Frontend URL into the reset email.
    """
    password_reset_form_class = PasswordResetForm

    def save(self):
        request = self.context.get('request')
        # Set up options for the Email
        opts = {
            'use_https': request.is_secure(),
            'from_email': getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@tutorlix.com'),
            'request': request,
            # Point to your custom email template
            'email_template_name': 'password_reset_email.html',
            # Pass the frontend URL to the template
            'extra_email_context': {
                'frontend_url': getattr(settings, 'FRONTEND_URL', 'https://dev.tutorlix.com')
            }
        }
        # Save the form (sends the email)
        self.reset_form.save(**opts)