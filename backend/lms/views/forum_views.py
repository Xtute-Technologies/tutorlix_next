from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from lms.models import ForumComment, ForumNotification, ForumPost, ForumPostLike
from lms.serializers import ForumCommentSerializer, ForumPostSerializer

User = get_user_model()


def create_new_post_notifications(post, actor):
    recipient_ids = list(
        User.objects.filter(is_active=True).exclude(id=actor.id).values_list('id', flat=True)
    )
    if not recipient_ids:
        return

    message = f'{actor.get_full_name()} added a new forum post.'
    ForumNotification.objects.bulk_create([
        ForumNotification(
            recipient_id=recipient_id,
            actor=actor,
            post=post,
            notification_type=ForumNotification.TYPE_NEW_POST,
            message=message,
        )
        for recipient_id in recipient_ids
    ], batch_size=500)


def create_post_owner_notification(post, actor, notification_type, message):
    if not post.author_id or post.author_id == actor.id:
        return

    ForumNotification.objects.create(
        recipient=post.author,
        actor=actor,
        post=post,
        notification_type=notification_type,
        message=message,
    )


class ForumPostViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ForumPostSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content', 'author__first_name', 'author__last_name', 'author__username']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = (
            ForumPost.objects
            .select_related('author')
            .annotate(
                likes_count=Count('likes', distinct=True),
                comments_count=Count('comments', filter=Q(comments__is_active=True), distinct=True),
            )
        )

        user = getattr(self.request, 'user', None)
        if self.action == 'mine' and user and user.is_authenticated:
            return queryset.filter(author=user, is_active=True)

        if user and user.is_authenticated and (getattr(user, 'role', None) == 'admin' or user.is_staff):
            return queryset

        if user and user.is_authenticated and self.action in ['retrieve', 'partial_update', 'update', 'destroy']:
            return queryset.filter(Q(is_active=True) | Q(author=user))

        return queryset.filter(is_active=True)

    def get_permissions(self):
        if self.action in ['create', 'toggle_like', 'share', 'mine', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        if self.action == 'comments' and self.request.method.lower() == 'post':
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        if getattr(self.request.user, 'forum_posting_blocked', False):
            raise PermissionDenied('You are blocked from posting in the forum.')
        post = serializer.save(author=self.request.user)
        create_new_post_notifications(post, self.request.user)

    def _can_manage_post(self, post):
        user = self.request.user
        return user.is_authenticated and (getattr(user, 'role', None) == 'admin' or user.is_staff or post.author_id == user.id)

    def perform_update(self, serializer):
        post = self.get_object()
        if not self._can_manage_post(post):
            raise PermissionDenied('You do not have permission to edit this post.')
        if getattr(self.request.user, 'forum_posting_blocked', False):
            raise PermissionDenied('You are blocked from posting in the forum.')
        serializer.save()

    def perform_destroy(self, instance):
        if not self._can_manage_post(instance):
            raise PermissionDenied('You do not have permission to delete this post.')
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])

    @action(detail=False, methods=['get'])
    def mine(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='toggle-like')
    def toggle_like(self, request, pk=None):
        post = self.get_object()
        like, created = ForumPostLike.objects.get_or_create(post=post, user=request.user)
        if not created:
            like.delete()
        else:
            create_post_owner_notification(
                post,
                request.user,
                ForumNotification.TYPE_POST_LIKE,
                f'{request.user.get_full_name()} liked your forum post.',
            )

        return Response({
            'liked': created,
            'likes_count': post.likes.count(),
        })

    @action(detail=True, methods=['post'], url_path='share')
    def share(self, request, pk=None):
        post = self.get_object()
        create_post_owner_notification(
            post,
            request.user,
            ForumNotification.TYPE_POST_SHARE,
            f'{request.user.get_full_name()} shared your forum post.',
        )
        return Response({'shared': True})

    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        post = self.get_object()

        if request.method.lower() == 'get':
            comments_qs = post.comments.filter(is_active=True).select_related('author').order_by('created_at')
            page = self.paginate_queryset(comments_qs)
            serializer = ForumCommentSerializer(page or comments_qs, many=True, context={'request': request})
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response(serializer.data)

        serializer = ForumCommentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(post=post, author=request.user)
        create_post_owner_notification(
            post,
            request.user,
            ForumNotification.TYPE_POST_COMMENT,
            f'{request.user.get_full_name()} commented on your forum post.',
        )
        return Response(ForumCommentSerializer(comment, context={'request': request}).data, status=status.HTTP_201_CREATED)
