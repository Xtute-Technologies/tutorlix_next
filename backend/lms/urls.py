from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from . import views

# Create a router and register our viewsets
router = DefaultRouter()

# Core
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'profile-types', views.ProfileTypeViewSet, basename='profile-type')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'offers', views.OfferViewSet, basename='offer')
router.register(r'bookings', views.CourseBookingViewSet, basename='booking')
router.register(r'masterclasses', views.MasterclassViewSet, basename='masterclass')
router.register(r'student-classes', views.StudentSpecificClassViewSet, basename='student-class')
router.register(r'course-classes', views.CourseSpecificClassViewSet, basename='course-class')
router.register(r'recordings', views.RecordingViewSet, basename='recording')
router.register(r'attendance', views.AttendanceViewSet, basename='attendance')
router.register(r'test-scores', views.TestScoreViewSet, basename='test-score')
router.register(r'expenses', views.ExpenseViewSet, basename='expense')
router.register(r'contact-messages', views.ContactFormMessageViewSet, basename='contact-message')
router.register(r'seller-expenses', views.SellerExpenseViewSet, basename='seller-expense')
router.register(r'teacher-expenses', views.TeacherExpenseViewSet, basename='teacher-expense')
router.register(r'product-leads', views.ProductLeadViewSet, basename='product-lead')
router.register(r'question-bank-courses', views.QuestionBankCourseViewSet, basename='question-bank-course')
router.register(r'question-bank-topics', views.QuestionBankTopicViewSet, basename='question-bank-topic')
router.register(r'question-bank-questions', views.QuestionBankQuestionViewSet, basename='question-bank-question')
router.register(r'reel-jobs', views.ReelGenerationJobViewSet, basename='reel-job')
router.register(r'forum-posts', views.ForumPostViewSet, basename='forum-post')
router.register(r'forum-notifications', views.ForumNotificationViewSet, basename='forum-notification')

# 🎬 VIDEO RENDERING (ADMIN ONLY)
router.register(r'videos', views.VideoViewSet, basename='video')

urlpatterns = [
    path('', include(router.urls)),
    re_path(
        r'^webhook/payment-status/?$',
        views.RazorpayWebhookView.as_view(),
        name='razorpay-webhook'
    ),
]
