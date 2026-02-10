from django.urls import path, include
from .views import ChangePasswordView, UserProfileView, UserListCreateView, UserDetailView, CheckUserView
from dj_rest_auth.views import PasswordResetConfirmView

urlpatterns = [
    # Dj-Rest-Auth URLs (includes login, logout, password reset, etc.)
    path('', include('dj_rest_auth.urls')),
 path(
        'password/reset/confirm/<uidb64>/<token>/', 
        PasswordResetConfirmView.as_view(), 
        name='password_reset_confirm'
    ),
    # Registration
    path('registration/', include('dj_rest_auth.registration.urls')),
    
    # Custom endpoints
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('check-user/', CheckUserView.as_view(), name='check_user'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('users/', UserListCreateView.as_view(), name='user_list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
]
