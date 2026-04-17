from rest_framework import viewsets, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from lms.models import QuestionBankCourse, QuestionBankTopic, QuestionBankQuestion
from lms.permissions import IsAdminOrTeacherOrPublicRead
from lms.serializers import (
    PublicQuestionBankCourseSerializer,
    PublicQuestionBankCourseDetailSerializer,
    PublicQuestionBankTopicDetailSerializer,
    QuestionBankCourseSerializer,
    QuestionBankCourseManageDetailSerializer,
    QuestionBankTopicSerializer,
    QuestionBankQuestionSerializer,
)


class QuestionBankCourseViewSet(viewsets.ModelViewSet):
    queryset = QuestionBankCourse.objects.all().prefetch_related('topics__questions')
    permission_classes = [IsAdminOrTeacherOrPublicRead]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['subject', 'grade_label', 'class_label', 'is_active']
    search_fields = ['title', 'subject', 'grade_label', 'class_label', 'description', 'syllabus_label']
    ordering_fields = ['title', 'created_at', 'updated_at']
    ordering = ['title']
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        profile_type = self.request.query_params.get('profile_type') or self.request.query_params.get('type')

        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            if user.is_authenticated and user.role == 'admin':
                if profile_type:
                    queryset = queryset.filter(profileTypes__icontains=profile_type)
                return queryset
            if user.is_authenticated and user.role == 'teacher':
                queryset = (queryset.filter(created_by=user) | queryset.filter(is_active=True)).distinct()
            else:
                queryset = queryset.filter(is_active=True)

            if profile_type:
                queryset = queryset.filter(profileTypes__icontains=profile_type)
            return queryset

        if user.role == 'teacher':
            return queryset.filter(created_by=user)
        return queryset

    def get_serializer_class(self):
        user = self.request.user
        is_manager = user.is_authenticated and user.role in ('admin', 'teacher')

        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            if self.action == 'retrieve':
                if is_manager:
                    return QuestionBankCourseManageDetailSerializer
                return PublicQuestionBankCourseDetailSerializer
            if is_manager:
                return QuestionBankCourseSerializer
            return PublicQuestionBankCourseSerializer
        return QuestionBankCourseSerializer

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(created_by=user)

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user
        if user.role == 'teacher' and instance.created_by_id != user.id:
            raise serializers.ValidationError({'detail': 'You can only edit courses you created.'})
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == 'teacher' and instance.created_by_id != user.id:
            raise serializers.ValidationError({'detail': 'You can only delete courses you created.'})
        instance.delete()


class QuestionBankTopicViewSet(viewsets.ModelViewSet):
    queryset = QuestionBankTopic.objects.select_related('course').prefetch_related('questions')
    serializer_class = QuestionBankTopicSerializer
    permission_classes = [IsAdminOrTeacherOrPublicRead]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['course', 'is_active']
    search_fields = ['title', 'summary', 'course__title']
    ordering_fields = ['order', 'title', 'created_at']
    ordering = ['course', 'order', 'title']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            if user.is_authenticated and user.role == 'admin':
                return queryset
            if user.is_authenticated and user.role == 'teacher':
                return (queryset.filter(course__created_by=user) | queryset.filter(is_active=True, course__is_active=True)).distinct()
            return queryset.filter(is_active=True, course__is_active=True)

        if user.role == 'teacher':
            return queryset.filter(course__created_by=user)
        return queryset

    def _validate_teacher_ownership(self, course):
        user = self.request.user
        if user.role == 'teacher' and course.created_by_id != user.id:
            raise serializers.ValidationError({'course': 'You can only manage topics for courses you created.'})

    def perform_create(self, serializer):
        course = serializer.validated_data['course']
        self._validate_teacher_ownership(course)
        serializer.save()

    def perform_update(self, serializer):
        course = serializer.validated_data.get('course', serializer.instance.course)
        self._validate_teacher_ownership(course)
        serializer.save()

    def perform_destroy(self, instance):
        self._validate_teacher_ownership(instance.course)
        instance.delete()

    @action(detail=True, methods=['get'])
    def public_detail(self, request, pk=None):
        topic = self.get_object()
        serializer = PublicQuestionBankTopicDetailSerializer(topic)
        return Response(serializer.data)


class QuestionBankQuestionViewSet(viewsets.ModelViewSet):
    queryset = QuestionBankQuestion.objects.select_related('topic', 'topic__course')
    serializer_class = QuestionBankQuestionSerializer
    permission_classes = [IsAdminOrTeacherOrPublicRead]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['topic', 'is_active']
    search_fields = ['question', 'answer', 'topic__title', 'topic__course__title']
    ordering_fields = ['order', 'created_at', 'updated_at']
    ordering = ['topic', 'order', 'id']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            if user.is_authenticated and user.role == 'admin':
                return queryset
            if user.is_authenticated and user.role == 'teacher':
                return (queryset.filter(topic__course__created_by=user) | queryset.filter(is_active=True, topic__is_active=True, topic__course__is_active=True)).distinct()
            return queryset.filter(is_active=True, topic__is_active=True, topic__course__is_active=True)

        if user.role == 'teacher':
            return queryset.filter(topic__course__created_by=user)
        return queryset

    def _validate_teacher_ownership(self, topic):
        user = self.request.user
        if user.role == 'teacher' and topic.course.created_by_id != user.id:
            raise serializers.ValidationError({'topic': 'You can only manage questions for courses you created.'})

    def perform_create(self, serializer):
        topic = serializer.validated_data['topic']
        self._validate_teacher_ownership(topic)
        serializer.save()

    def perform_update(self, serializer):
        topic = serializer.validated_data.get('topic', serializer.instance.topic)
        self._validate_teacher_ownership(topic)
        serializer.save()

    def perform_destroy(self, instance):
        self._validate_teacher_ownership(instance.topic)
        instance.delete()
