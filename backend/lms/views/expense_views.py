from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

from lms.models import Expense, SellerExpense, TeacherExpense
from lms.serializers import ExpenseSerializer, SellerExpenseSerializer, TeacherExpenseSerializer
from lms.permissions import IsAdmin


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Expense CRUD operations.
    - Admin only
    """

    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["date", "created_by"]
    search_fields = ["name", "description"]
    ordering_fields = ["date", "amount", "created_at"]
    ordering = ["-date"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get expense summary statistics"""
        queryset = self.get_queryset()

        # Filter by date range if provided
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        total = queryset.aggregate(total=Sum("amount"))["total"] or 0
        count = queryset.count()

        return Response(
            {
                "total_expenses": total,
                "expense_count": count,
                "start_date": start_date,
                "end_date": end_date,
            }
        )


class SellerExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Seller Expense (Money given to sellers).
    - Admin: Full access (Create, Read, Update, Delete)
    - Seller: Read-only access to their own received expenses
    """

    queryset = SellerExpense.objects.all()
    serializer_class = SellerExpenseSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["seller", "date", "created_by"]
    search_fields = [
        "description",
        "seller__email",
        "seller__first_name",
        "seller__last_name",
    ]
    ordering_fields = ["date", "amount", "created_at"]
    ordering = ["-date"]

    def get_permissions(self):
        """
        Custom permissions:
        - Create/Update/Delete: Admin only
        - List/Retrieve: Authenticated users (filtered by role in get_queryset)
        """
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """
        - Admin: Sees all expenses
        - Seller: Sees only expenses where they are the 'seller' (recipient)
        """
        user = self.request.user
        queryset = super().get_queryset()

        if user.role == "admin":
            return queryset

        if user.role == "seller":
            return queryset.filter(seller=user)

        # Other roles (e.g. students) shouldn't see these
        return queryset.none()

    def perform_create(self, serializer):
        """
        Auto-assign the creator
        """
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """
        Get total amount given to sellers.
        Supports filtering by date range and specific seller.
        """
        queryset = self.get_queryset()

        # Apply filters manually or rely on filter_backends if configured for the action
        # Here we manually apply basic filters for the summary calculation
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        seller_id = request.query_params.get("seller")

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # If admin wants to sum up for a specific seller
        if seller_id and request.user.role == "admin":
            queryset = queryset.filter(seller_id=seller_id)

        total = queryset.aggregate(total=Sum("amount"))["total"] or 0
        count = queryset.count()

        return Response(
            {
                "total_amount": total,
                "transaction_count": count,
                "start_date": start_date,
                "end_date": end_date,
            }
        )


class TeacherExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Teacher Expense (Money given to teachers).
    - Admin: Full access (Create, Read, Update, Delete)
    - Teacher: Read-only access to their own received expenses
    """

    queryset = TeacherExpense.objects.all()
    serializer_class = TeacherExpenseSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["teacher", "date", "created_by"]
    search_fields = [
        "description",
        "teacher__email",
        "teacher__first_name",
        "teacher__last_name",
    ]
    ordering_fields = ["date", "amount", "created_at"]
    ordering = ["-date"]

    def get_permissions(self):
        """
        Custom permissions:
        - Create/Update/Delete: Admin only
        - List/Retrieve: Authenticated users (filtered by role in get_queryset)
        """
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """
        - Admin: Sees all expenses
        - Teacher: Sees only expenses where they are the 'teacher' (recipient)
        """
        user = self.request.user
        queryset = super().get_queryset()

        if user.role == "admin":
            return queryset

        if user.role == "teacher":
            return queryset.filter(teacher=user)

        # Other roles shouldn't see these
        return queryset.none()

    def perform_create(self, serializer):
        """
        Auto-assign the creator
        """
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """
        Get total amount given to teachers.
        Supports filtering by date range and specific teacher.
        """
        queryset = self.get_queryset()

        # Apply filters manually or rely on filter_backends if configured for the action
        # Here we manually apply basic filters for the summary calculation
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        teacher_id = request.query_params.get("teacher")

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # If admin wants to sum up for a specific teacher
        if teacher_id and request.user.role == "admin":
            queryset = queryset.filter(teacher_id=teacher_id)

        total = queryset.aggregate(total=Sum("amount"))["total"] or 0
        count = queryset.count()

        return Response(
            {
                "total_amount": total,
                "transaction_count": count,
                "start_date": start_date,
                "end_date": end_date,
            }
        )
