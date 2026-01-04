from django.urls import path, include
from .views import ChangePasswordView, UserProfileView, UserListView

app_name = 'accounts'

urlpatterns = [
    # Dj-Rest-Auth URLs (includes login, logout, password reset, etc.)
    path('', include('dj_rest_auth.urls')),
    
    # Registration
    path('registration/', include('dj_rest_auth.registration.urls')),
    
    # Custom endpoints
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('users/', UserListView.as_view(), name='user_list'),
]
