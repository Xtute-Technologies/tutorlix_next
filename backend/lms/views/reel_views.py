import os

from django.utils import timezone
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from lms.models import ReelGenerationJob
from lms.permissions import IsAdmin
from lms.serializers import ReelGenerationJobSerializer


def _normalize_topic(value):
    text = (value or '').strip()
    return text or 'General Topic'


def _topic_keywords(prompt, topic):
    base = f"{topic} {prompt}".replace('\n', ' ')
    tokens = []
    for raw_word in base.split():
        word = ''.join(ch for ch in raw_word if ch.isalnum())
        if len(word) < 4:
            continue
        lower = word.lower()
        if lower in tokens:
            continue
        tokens.append(lower)
        if len(tokens) == 6:
            break
    return tokens or ['concept', 'example', 'practice']


def _build_script(topic, prompt, tone, cta):
    cta_line = cta or 'Follow Tutorlix for more quick concept explainers.'
    return (
        f"Hi everyone, today we are learning {topic}. "
        f"We will break it down in a {tone.lower()} and visual way so it feels easy to remember. "
        f"First, I will explain what {topic} means in simple language. "
        f"Then I will connect it to the prompt focus: {prompt.strip()}. "
        f"After that, I will show one fast example on the digital board, highlight the common mistake, "
        f"and finish with one interview or exam-ready takeaway. "
        f"{cta_line}"
    )


def _build_scene_plan(topic, prompt, tone, cta, duration_seconds):
    beat_seconds = max(duration_seconds // 5, 5)
    return [
        {
            'order': 1,
            'duration_seconds': beat_seconds,
            'shot': 'Medium portrait shot of the teacher avatar beside the smart board',
            'board_text': f'{topic}: Quick Start',
            'voiceover': f'Let us learn {topic} in under a minute.',
            'visual_direction': 'Teacher smiles, points at the board, clean classroom lighting',
        },
        {
            'order': 2,
            'duration_seconds': beat_seconds,
            'shot': 'Board-focused explanation shot with teacher writing key terms',
            'board_text': f'Core Idea\n{prompt.strip()[:120]}',
            'voiceover': f'Here is the main idea behind {topic}.',
            'visual_direction': f'{tone} delivery with bold handwritten annotations on the board',
        },
        {
            'order': 3,
            'duration_seconds': beat_seconds,
            'shot': 'Over-the-shoulder board teaching shot',
            'board_text': 'Step 1\nStep 2\nStep 3',
            'voiceover': 'We move through the concept in three simple steps.',
            'visual_direction': 'Teacher circles the important line and underlines the formula or rule',
        },
        {
            'order': 4,
            'duration_seconds': beat_seconds,
            'shot': 'Example-solving shot with teacher facing camera intermittently',
            'board_text': 'Worked Example\nMistake to Avoid',
            'voiceover': 'Now let us apply it in one clean example and avoid the common mistake.',
            'visual_direction': 'Board updates with a worked example and a red warning note',
        },
        {
            'order': 5,
            'duration_seconds': duration_seconds - beat_seconds * 4,
            'shot': 'Closing shot with teacher beside final summary board',
            'board_text': 'Summary\nOne Key Takeaway',
            'voiceover': cta or 'Save this reel and follow for more topic explainers.',
            'visual_direction': 'Teacher nods and gestures toward the summary and CTA',
        },
    ]


def _build_board_notes(topic, prompt):
    keywords = _topic_keywords(prompt, topic)
    return [
        f'{topic} definition in one line',
        f'3 key points: {", ".join(keywords[:3])}',
        '1 worked example on the digital board',
        '1 mistake students usually make',
        '1 recap line for retention',
    ]


def _build_hashtags(topic, prompt):
    keywords = _topic_keywords(prompt, topic)
    tags = ['#Tutorlix', '#ReelLearning', '#StudyWithMe']
    for word in [topic, *keywords]:
        compact = ''.join(ch for ch in word.title() if ch.isalnum())
        if compact:
            tags.append(f'#{compact}')
    seen = []
    for tag in tags:
        if tag not in seen:
            seen.append(tag)
    return seen[:12]


def _build_caption(topic, prompt, cta):
    closing = cta or 'Follow for the next quick concept breakdown.'
    return (
        f'Quick reel on {topic}.\n\n'
        f'Focus: {prompt.strip()}\n\n'
        f'{closing}'
    )


def _build_provider_payload(job):
    avatar_prompt = (
        f'Realistic young Indian female teacher avatar, white shirt, expressive teaching gestures, '
        f'professional classroom lighting, standing beside a modern digital smart board, vertical 9:16 reel format.'
    )
    scene_prompts = []
    for scene in job.scene_plan:
        scene_prompts.append(
            {
                'order': scene['order'],
                'prompt': (
                    f"{avatar_prompt} Scene {scene['order']}: {scene['shot']}. "
                    f"Board shows: {scene['board_text']}. Visual direction: {scene['visual_direction']}."
                ),
            }
        )

    instagram_ready = bool(
        job.include_instagram_post
        and os.getenv('INSTAGRAM_GRAPH_API_TOKEN')
        and os.getenv('INSTAGRAM_ACCOUNT_ID')
    )

    return {
        'avatar_provider': os.getenv('REEL_AVATAR_PROVIDER', 'not_configured'),
        'tts_provider': os.getenv('REEL_TTS_PROVIDER', 'not_configured'),
        'instagram_provider': 'meta_graph_api' if instagram_ready else 'not_configured',
        'instagram_ready': instagram_ready,
        'voice_direction': job.voice_style,
        'board_style': job.board_style,
        'scene_prompts': scene_prompts,
        'next_step': (
            'Send scene_prompts and script_text to your avatar video provider, then upload the final MP4 to Instagram.'
        ),
    }


def _populate_generated_fields(job):
    topic = _normalize_topic(job.topic)
    prompt = (job.prompt or '').strip()
    cta = (job.call_to_action or '').strip()

    if not job.title:
        job.title = f'{topic} Reel Draft'
    job.topic = topic
    job.script_text = _build_script(topic, prompt, job.tone, cta)
    job.scene_plan = _build_scene_plan(topic, prompt, job.tone, cta, job.duration_seconds)
    job.board_notes = _build_board_notes(topic, prompt)
    if not job.instagram_caption:
        job.instagram_caption = _build_caption(topic, prompt, cta)
    if not job.hashtags:
        job.hashtags = _build_hashtags(topic, prompt)
    job.status = 'queued_to_publish' if job.include_instagram_post else 'ready_for_review'
    job.provider_status = 'ready'
    job.provider_name = os.getenv('REEL_AVATAR_PROVIDER', 'provider_not_configured')
    job.error_message = ''
    job.provider_payload = _build_provider_payload(job)


class ReelGenerationJobViewSet(viewsets.ModelViewSet):
    queryset = ReelGenerationJob.objects.select_related('created_by')
    serializer_class = ReelGenerationJobSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'provider_status', 'include_instagram_post', 'language']
    search_fields = ['title', 'topic', 'prompt', 'instagram_caption']
    ordering_fields = ['created_at', 'updated_at', 'published_at', 'duration_seconds']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        job = serializer.save(created_by=self.request.user)
        _populate_generated_fields(job)
        job.save()

    def perform_update(self, serializer):
        job = serializer.save()
        _populate_generated_fields(job)
        job.save()

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        job = self.get_object()
        _populate_generated_fields(job)
        job.save()
        return Response(self.get_serializer(job).data)

    @action(detail=True, methods=['post'])
    def publish_instagram(self, request, pk=None):
        job = self.get_object()
        if not job.include_instagram_post:
            raise serializers.ValidationError(
                {'include_instagram_post': 'Enable Instagram posting on the reel job before publishing.'}
            )

        if not (
            os.getenv('INSTAGRAM_GRAPH_API_TOKEN') and os.getenv('INSTAGRAM_ACCOUNT_ID')
        ):
            job.provider_status = 'not_configured'
            job.status = 'ready_for_review'
            job.error_message = (
                'Instagram publish credentials are not configured. '
                'Set INSTAGRAM_GRAPH_API_TOKEN and INSTAGRAM_ACCOUNT_ID to enable autopost.'
            )
            job.save(update_fields=['provider_status', 'status', 'error_message', 'updated_at'])
            return Response(
                self.get_serializer(job).data,
                status=status.HTTP_400_BAD_REQUEST,
            )

        job.provider_status = 'queued'
        job.status = 'queued_to_publish'
        job.published_at = None
        job.error_message = (
            'Instagram credentials are present, but the actual Meta Graph API upload step is still a stub. '
            'Wire the media container creation and publish call into this action next.'
        )
        job.instagram_media_id = None
        job.instagram_permalink = None
        job.save(
            update_fields=[
                'provider_status',
                'status',
                'published_at',
                'error_message',
                'instagram_media_id',
                'instagram_permalink',
                'updated_at',
            ]
        )
        return Response(self.get_serializer(job).data, status=status.HTTP_202_ACCEPTED)
