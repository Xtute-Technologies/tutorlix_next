from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from accounts.models import User


class EmailOrPhoneBackend(ModelBackend):
    """
    Custom authentication backend that allows users to log in using either email or phone number
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Try to fetch the user by searching for email or phone
            user = User.objects.get(
                Q(email=username) | Q(phone=username) | Q(username=username)
            )
            
            # Check the password
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            return None
        except User.MultipleObjectsReturned:
            # This shouldn't happen if email and phone are unique
            return None
    
    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
