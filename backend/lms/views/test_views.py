import json
from decimal import Decimal, InvalidOperation

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import filters, mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from lms.models import CourseBooking, Test, TestAnswer, TestAttempt, TestQuestion
from lms.permissions import IsAdminOrTeacher
from lms.serializers import (
    TestAnswerSerializer,
    TestAttemptDetailSerializer,
    TestAttemptSerializer,
    TestQuestionSerializer,
    TestSerializer,
)


def _teacher_can_manage_test(user, test):
    return user.role == 'admin' or (user.role == 'teacher' and test.created_by_id == user.id)


def _recalculate_attempt_review(attempt):
    total_awarded_marks = sum((answer.awarded_marks or Decimal('0')) for answer in attempt.answers.all())
    reviewed_at = timezone.now() if attempt.answers.filter(reviewed_at__isnull=False).exists() else None
    attempt.total_awarded_marks = total_awarded_marks
    attempt.reviewed_at = reviewed_at
    attempt.save(update_fields=['total_awarded_marks', 'reviewed_at', 'updated_at'])


def _student_can_take_test(student, test):
    if student.role != 'student':
        return False
    if not test.is_active or test.status != 'published':
        return False

    now = timezone.now()
    if test.available_from and now < test.available_from:
        return False
    if test.available_until and now > test.available_until:
        return False

    return CourseBooking.objects.filter(
        student=student,
        payment_status='paid',
        product=test.product,
    ).exists()


def _parse_list_payload(value):
    if value in (None, '', []):
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return []
        if stripped.startswith('['):
            try:
                payload = json.loads(stripped)
                if isinstance(payload, list):
                    return [str(item).strip() for item in payload if str(item).strip()]
            except json.JSONDecodeError:
                pass
        separator = '\n' if '\n' in stripped else ','
        return [item.strip() for item in stripped.split(separator) if item.strip()]
    return [str(value).strip()]


class TestViewSet(viewsets.ModelViewSet):
    queryset = Test.objects.select_related('product', 'created_by').prefetch_related('questions', 'attempts')
    serializer_class = TestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['product', 'status', 'created_by', 'is_active']
    search_fields = ['title', 'description', 'instructions', 'product__name']
    ordering_fields = ['created_at', 'updated_at', 'available_from', 'available_until']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminOrTeacher()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == 'admin':
            return queryset

        if user.role == 'teacher':
            return queryset.filter(created_by=user)

        if user.role == 'student':
            return queryset.filter(
                status='published',
                is_active=True,
                product__bookings__student=user,
                product__bookings__payment_status='paid',
            ).distinct()

        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        product = serializer.validated_data['product']
        if user.role == 'teacher' and not product.instructors.filter(id=user.id).exists():
            raise serializers.ValidationError({'product': 'You can only create tests for your own course.'})
        serializer.save(created_by=user)

    def perform_update(self, serializer):
        test = self.get_object()
        user = self.request.user
        if not _teacher_can_manage_test(user, test):
            raise serializers.ValidationError({'detail': 'You cannot update this test.'})

        product = serializer.validated_data.get('product', test.product)
        if user.role == 'teacher' and not product.instructors.filter(id=user.id).exists():
            raise serializers.ValidationError({'product': 'You can only assign tests to your own course.'})
        serializer.save()

    def perform_destroy(self, instance):
        if not _teacher_can_manage_test(self.request.user, instance):
            raise serializers.ValidationError({'detail': 'You cannot delete this test.'})
        instance.delete()


class TestQuestionViewSet(viewsets.ModelViewSet):
    queryset = TestQuestion.objects.select_related('test', 'test__product')
    serializer_class = TestQuestionSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['test', 'question_type']
    ordering_fields = ['order', 'created_at']
    ordering = ['order', 'id']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminOrTeacher()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == 'admin':
            return queryset
        if user.role == 'teacher':
            return queryset.filter(test__created_by=user)
        return queryset.none()

    def create(self, request, *args, **kwargs):
        payload = {
            'test': request.data.get('test'),
            'order': request.data.get('order'),
            'title': request.data.get('title'),
            'prompt': request.data.get('prompt'),
            'question_type': request.data.get('question_type'),
            'marks': request.data.get('marks'),
            'is_required': request.data.get('is_required'),
            'allowed_file_types': request.data.get('allowed_file_types'),
            'starter_code': request.data.get('starter_code'),
            'coding_language': request.data.get('coding_language'),
            'options': _parse_list_payload(request.data.get('options')),
            'correct_options': _parse_list_payload(request.data.get('correct_options')),
        }
        if request.FILES.get('attachment'):
            payload['attachment'] = request.FILES['attachment']
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        payload = {}
        scalar_fields = [
            'test',
            'order',
            'title',
            'prompt',
            'question_type',
            'marks',
            'is_required',
            'allowed_file_types',
            'starter_code',
            'coding_language',
        ]
        for field in scalar_fields:
            if field in request.data:
                payload[field] = request.data.get(field)
        if 'options' in request.data:
            payload['options'] = _parse_list_payload(request.data.get('options'))
        if 'correct_options' in request.data:
            payload['correct_options'] = _parse_list_payload(request.data.get('correct_options'))
        if request.FILES.get('attachment'):
            payload['attachment'] = request.FILES['attachment']
        serializer = self.get_serializer(instance, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_create(self, serializer):
        test = serializer.validated_data['test']
        user = self.request.user
        if not _teacher_can_manage_test(user, test):
            raise serializers.ValidationError({'test': 'You cannot add questions to this test.'})
        serializer.save()

    def perform_update(self, serializer):
        if not _teacher_can_manage_test(self.request.user, serializer.instance.test):
            raise serializers.ValidationError({'detail': 'You cannot update this question.'})
        serializer.save()

    def perform_destroy(self, instance):
        if not _teacher_can_manage_test(self.request.user, instance.test):
            raise serializers.ValidationError({'detail': 'You cannot delete this question.'})
        instance.delete()


class TestAttemptViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = TestAttempt.objects.select_related('test', 'test__product', 'student', 'unlocked_by').prefetch_related('answers', 'test__questions')
    serializer_class = TestAttemptSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['test', 'status', 'student']
    ordering_fields = ['created_at', 'updated_at', 'started_at', 'submitted_at']
    ordering = ['-updated_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == 'admin':
            return queryset
        if user.role == 'teacher':
            return queryset.filter(test__created_by=user)
        if user.role == 'student':
            return queryset.filter(student=user)
        return queryset.none()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TestAttemptDetailSerializer
        return TestAttemptSerializer

    @action(detail=False, methods=['post'])
    def start(self, request):
        if request.user.role != 'student':
            return Response({'detail': 'Only students can start tests.'}, status=status.HTTP_403_FORBIDDEN)

        test = get_object_or_404(Test, pk=request.data.get('test'))
        if not _student_can_take_test(request.user, test):
            return Response({'detail': 'You are not eligible to take this test.'}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        attempt, _ = TestAttempt.objects.get_or_create(
            test=test,
            student=request.user,
            defaults={
                'status': 'in_progress',
                'started_at': now,
                'last_resumed_at': now,
                'last_activity_at': now,
            }
        )

        if attempt.status == 'submitted':
            serializer = TestAttemptDetailSerializer(attempt, context={'request': request})
            return Response(serializer.data)

        if attempt.status == 'locked':
            serializer = TestAttemptDetailSerializer(attempt, context={'request': request})
            return Response(serializer.data, status=status.HTTP_423_LOCKED)

        if not attempt.started_at:
            attempt.started_at = now
        attempt.status = 'in_progress'
        attempt.last_resumed_at = now
        attempt.last_activity_at = now
        attempt.save(update_fields=['status', 'started_at', 'last_resumed_at', 'last_activity_at', 'updated_at'])

        serializer = TestAttemptDetailSerializer(attempt, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def save_answer(self, request, pk=None):
        attempt = self.get_object()
        if request.user.role != 'student' or attempt.student_id != request.user.id:
            return Response({'detail': 'You can only save your own answers.'}, status=status.HTTP_403_FORBIDDEN)
        if attempt.status in ['locked', 'submitted']:
            return Response({'detail': f'Cannot save answer while attempt is {attempt.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        question = get_object_or_404(TestQuestion, pk=request.data.get('question'), test=attempt.test)
        answer, _ = TestAnswer.objects.get_or_create(attempt=attempt, question=question)

        answer.selected_options = _parse_list_payload(request.data.get('selected_options'))
        answer.subjective_answer = request.data.get('subjective_answer') or ''
        answer.code_answer = request.data.get('code_answer') or ''
        answer.code_language = request.data.get('code_language') or ''
        if request.FILES.get('uploaded_file'):
            answer.uploaded_file = request.FILES['uploaded_file']
        answer.save()

        if request.data.get('current_question_index') not in [None, '']:
            try:
                attempt.current_question_index = int(request.data.get('current_question_index'))
            except (TypeError, ValueError):
                pass
        attempt.last_activity_at = timezone.now()
        attempt.save(update_fields=['current_question_index', 'last_activity_at', 'updated_at'])

        serializer = TestAnswerSerializer(answer, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        attempt = self.get_object()
        if request.user.role != 'student' or attempt.student_id != request.user.id:
            return Response({'detail': 'You can only lock your own attempt.'}, status=status.HTTP_403_FORBIDDEN)
        if attempt.status == 'submitted':
            return Response({'detail': 'Submitted attempts cannot be locked.'}, status=status.HTTP_400_BAD_REQUEST)

        attempt.status = 'locked'
        attempt.locked_at = timezone.now()
        attempt.locked_reason = request.data.get('reason') or 'Window/tab switch detected.'
        attempt.window_violation_count += 1
        attempt.last_activity_at = timezone.now()
        attempt.save(update_fields=['status', 'locked_at', 'locked_reason', 'window_violation_count', 'last_activity_at', 'updated_at'])

        serializer = TestAttemptDetailSerializer(attempt, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        attempt = self.get_object()
        user = request.user
        if user.role not in ['admin', 'teacher']:
            return Response({'detail': 'Only admin or the creating teacher can unlock attempts.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'teacher' and attempt.test.created_by_id != user.id:
            return Response({'detail': 'Only the teacher who created this test can unlock it.'}, status=status.HTTP_403_FORBIDDEN)

        attempt.status = 'in_progress'
        attempt.unlocked_at = timezone.now()
        attempt.unlocked_by = user
        attempt.last_resumed_at = timezone.now()
        attempt.locked_reason = ''
        attempt.save(update_fields=['status', 'unlocked_at', 'unlocked_by', 'last_resumed_at', 'locked_reason', 'updated_at'])

        serializer = TestAttemptDetailSerializer(attempt, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        attempt = self.get_object()
        if request.user.role != 'student' or attempt.student_id != request.user.id:
            return Response({'detail': 'You can only submit your own attempt.'}, status=status.HTTP_403_FORBIDDEN)
        if attempt.status == 'locked':
            return Response({'detail': 'Locked attempts must be unlocked before submission.'}, status=status.HTTP_400_BAD_REQUEST)

        attempt.status = 'submitted'
        attempt.submitted_at = timezone.now()
        attempt.last_activity_at = timezone.now()
        attempt.save(update_fields=['status', 'submitted_at', 'last_activity_at', 'updated_at'])

        serializer = TestAttemptDetailSerializer(attempt, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def grade_answer(self, request, pk=None):
        attempt = self.get_object()
        user = request.user
        if user.role not in ['admin', 'teacher']:
            return Response({'detail': 'Only admin or the creating teacher can grade answers.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'teacher' and attempt.test.created_by_id != user.id:
            return Response({'detail': 'Only the teacher who created this test can grade it.'}, status=status.HTTP_403_FORBIDDEN)

        question = get_object_or_404(TestQuestion, pk=request.data.get('question'), test=attempt.test)
        answer, _ = TestAnswer.objects.get_or_create(attempt=attempt, question=question)

        try:
            awarded_marks = Decimal(str(request.data.get('awarded_marks', '0')).strip() or '0')
        except (InvalidOperation, TypeError, ValueError):
            return Response({'awarded_marks': 'A valid number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if awarded_marks < 0:
            return Response({'awarded_marks': 'Marks cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)
        if awarded_marks > question.marks:
            return Response({'awarded_marks': f'Marks cannot exceed {question.marks}.'}, status=status.HTTP_400_BAD_REQUEST)

        answer.awarded_marks = awarded_marks
        answer.review_comment = request.data.get('review_comment') or ''
        answer.reviewed_at = timezone.now()
        answer.reviewed_by = user
        answer.save(update_fields=['awarded_marks', 'review_comment', 'reviewed_at', 'reviewed_by', 'updated_at'])

        _recalculate_attempt_review(attempt)
        serializer = TestAnswerSerializer(answer, context={'request': request})
        return Response(serializer.data)
