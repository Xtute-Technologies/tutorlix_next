from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NoteViewSet,
    NoteAttachmentViewSet,
    NotePurchaseViewSet,
    NoteAccessViewSet
)

router = DefaultRouter()
router.register(r'attachments', NoteAttachmentViewSet, basename='noteattachment')
router.register(r'purchases', NotePurchaseViewSet, basename='notepurchase')
router.register(r'access', NoteAccessViewSet, basename='noteaccess')
router.register(r'', NoteViewSet, basename='note')

urlpatterns = [
    path('', include(router.urls)),
]
