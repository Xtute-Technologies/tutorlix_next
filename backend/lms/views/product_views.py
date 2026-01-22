from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

from lms.models import Category, Product, ProductImage, Offer
from lms.serializers import (
    CategorySerializer,
    CategoryListSerializer,
    ProductSerializer,
    ProductListSerializer,
    OfferSerializer,
)
from lms.permissions import IsAdmin, IsAdminOrReadOnly


class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Category CRUD operations.
    - List/Retrieve: All authenticated users
    - Create/Update/Delete: Admin only
    """

    queryset = Category.objects.all()
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "heading", "description", "profileTypes"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_serializer_class(self):
        if self.action == "list":
            return CategoryListSerializer
        return CategorySerializer

    @action(detail=True, methods=["get"])
    def products(self, request, pk=None):
        """Get all products in this category"""
        category = self.get_object()
        products = category.products.filter(is_active=True)
        serializer = ProductListSerializer(
            products, many=True, context={"request": request}
        )
        return Response(serializer.data)


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product CRUD operations.
    - List/Retrieve: Public/Authenticated
    - Create/Update/Delete: Admin only
    """

    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]

    # Filtering & Searching
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["category", "is_active"]
    search_fields = ["name", "slug", "description", "overview", "features"]
    ordering_fields = ["name", "price", "created_at", "total_seats"]
    ordering = ["-created_at"]

    # Allow lookup by ID (default) or Slug if you prefer
    lookup_field = "pk"

    def get_queryset(self):
        """
        Optimized queryset with relationship prefetching
        """
        # Base query with optimizations
        queryset = Product.objects.select_related("category").prefetch_related(
            "images", "instructors"
        )

        user = self.request.user
        # Logic: Admins see all, others see only active products
        if self.action == "list":
            if user.is_authenticated and user.role == "admin":
                pass  # Admin sees all
            elif user.is_authenticated and user.role == "teacher":
                # Teacher sees all active public products + their own products (even if inactive?)
                # Use query param to filter for "My Courses" in dashboard
                if self.request.query_params.get("my_products") == "true":
                    queryset = queryset.filter(instructors=user)
                else:
                    queryset = queryset.filter(is_active=True)
            else:
                queryset = queryset.filter(is_active=True)

        # Custom filtering for price range
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")

        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        return queryset

    def get_serializer_class(self):
        """Use lightweight serializer for lists to improve performance"""
        if self.action == "list" or self.action == "featured":
            return ProductListSerializer
        return ProductSerializer

    # --- Custom Actions ---

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def featured(self, request):
        """Get featured products (active & has discount)"""
        featured = (
            self.get_queryset()
            .filter(is_active=True, discounted_price__isnull=False)
            .exclude(discounted_price__exact=0)[:10]
        )

        serializer = self.get_serializer(featured, many=True)
        return Response(serializer.data)

    @action(
        detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdmin]
    )
    def upload_images(self, request, pk=None):
        """Upload multiple images for a product (max 5)"""
        product = self.get_object()

        # Check current image count
        current_count = product.images.count()
        if current_count >= 5:
            return Response(
                {"error": "Maximum 5 images allowed per product"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        images = request.FILES.getlist("images")
        if not images:
            return Response(
                {"error": "No images provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        if len(images) + current_count > 5:
            return Response(
                {"error": f"Can only upload {5 - current_count} more images"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_images = []
        for idx, image_file in enumerate(images):
            # First image is primary if no images exist
            is_primary = current_count == 0 and idx == 0

            product_image = ProductImage.objects.create(
                product=product, image=image_file, is_primary=is_primary
            )
            uploaded_images.append(product_image)

        # We need a serializer for ProductImage if you want to return the data properly
        # Assuming you have one, or return simple success message
        return Response(
            {"message": f"{len(uploaded_images)} images uploaded successfully"},
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True, methods=["patch"], permission_classes=[IsAuthenticated, IsAdmin]
    )
    def set_primary_image(self, request, pk=None):
        """Set a specific image as primary"""
        product = self.get_object()
        image_id = request.data.get("image_id")

        if not image_id:
            return Response(
                {"error": "image_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Atomic update to ensure only one primary exists
            image = product.images.get(id=image_id)
            product.images.exclude(id=image_id).update(is_primary=False)
            image.is_primary = True
            image.save()

            return Response({"message": "Primary image updated successfully"})
        except ProductImage.DoesNotExist:
            return Response(
                {"error": "Image not found"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(
        detail=True, methods=["delete"], permission_classes=[IsAuthenticated, IsAdmin]
    )
    def delete_image(self, request, pk=None):
        """Delete a specific product image"""
        product = self.get_object()
        image_id = request.data.get("image_id")

        if not image_id:
            return Response(
                {"error": "image_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            image = product.images.get(id=image_id)
            was_primary = image.is_primary
            image.delete()

            # If deleted image was primary, set first remaining image as primary
            if was_primary:
                first_image = product.images.first()
                if first_image:
                    first_image.is_primary = True
                    first_image.save()

            return Response({"message": "Image deleted successfully"})
        except ProductImage.DoesNotExist:
            return Response(
                {"error": "Image not found"}, status=status.HTTP_404_NOT_FOUND
            )


class OfferViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Offer/Voucher CRUD operations.
    - List/Retrieve: Authenticated users
    - Create/Update/Delete: Admin only
    """

    queryset = Offer.objects.all()
    serializer_class = OfferSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["product", "is_active"]
    search_fields = ["voucher_name", "code"]
    ordering_fields = ["created_at", "valid_to"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter only valid offers if requested
        only_valid = self.request.query_params.get("only_valid", "").lower() == "true"
        if only_valid:
            now = timezone.now()
            queryset = queryset.filter(
                is_active=True,
                valid_from__lte=now,
            ).filter(Q(valid_to__isnull=True) | Q(valid_to__gte=now))
        return queryset

    @action(detail=False, methods=["post"])
    def validate_code(self, request):
        """Validate a coupon code"""
        code = request.data.get("code", "").upper()
        product_id = request.data.get("product_id")

        if not code:
            return Response(
                {"error": "Code is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            offer = Offer.objects.get(code=code, product_id=product_id)
            if offer.is_valid():
                return Response(
                    {
                        "valid": True,
                        "offer": OfferSerializer(
                            offer, context={"request": request}
                        ).data,
                    }
                )
            else:
                return Response(
                    {"valid": False, "message": "This offer is no longer valid"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Offer.DoesNotExist:
            return Response(
                {"valid": False, "message": "Invalid coupon code"},
                status=status.HTTP_404_NOT_FOUND,
            )
