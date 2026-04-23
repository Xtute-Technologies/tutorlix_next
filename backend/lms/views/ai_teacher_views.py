import requests

from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from lms.models import QuestionBankCourse, QuestionBankQuestion, QuestionBankTopic
from notes.models import Note
from notes.services import extract_note_text, looks_like_prompt_injection


STOPWORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'do', 'for', 'from', 'how',
    'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'the', 'to', 'what',
    'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your',
}


def _tokenize(value):
    if not value:
        return []
    text = ''.join(ch.lower() if ch.isalnum() else ' ' for ch in str(value))
    return [token for token in text.split() if len(token) > 2 and token not in STOPWORDS]


def _score_text(query_tokens, text):
    if not query_tokens or not text:
        return 0
    haystack = set(_tokenize(text))
    return sum(1 for token in query_tokens if token in haystack)


def _normalize_ollama_base_url(value):
    base_url = (value or 'http://localhost:11434').strip()
    if not base_url:
        return 'http://localhost:11434'

    if ' ' in base_url:
        base_url = base_url.split()[0]

    if '://' not in base_url:
        if ':' in base_url and not base_url.startswith('['):
            return f'http://[{base_url}]'
        return f'http://{base_url}'

    scheme, remainder = base_url.split('://', 1)
    if '/' in remainder:
        host_port, path = remainder.split('/', 1)
        suffix = f'/{path}'
    else:
        host_port = remainder
        suffix = ''

    if (
        ':' in host_port and
        not host_port.startswith('[') and
        host_port.count(':') > 1
    ):
        host_port = f'[{host_port}]'

    return f'{scheme}://{host_port}{suffix}'


def _note_candidates_for_user(user, profile_type=''):
    queryset = Note.objects.filter(is_active=True, is_draft=False).select_related('product', 'creator')
    if profile_type:
        queryset = queryset.filter(profileTypes__icontains=profile_type)
    return [note for note in queryset[:40] if note.can_user_access(user)]


def _question_bank_candidates(profile_type=''):
    course_queryset = QuestionBankCourse.objects.filter(is_active=True)
    if profile_type:
        course_queryset = course_queryset.filter(profileTypes__icontains=profile_type)
    courses = list(course_queryset[:24])
    topics = list(
        QuestionBankTopic.objects.filter(is_active=True, course__in=courses)
        .select_related('course')[:80]
    )
    questions = list(
        QuestionBankQuestion.objects.filter(is_active=True, topic__in=topics)
        .select_related('topic', 'topic__course')[:120]
    )
    return courses, topics, questions


def _build_grounding_context(user, question, profile_type=''):
    query_tokens = _tokenize(question)
    note_entries = []
    question_entries = []
    source_entries = []

    for note in _note_candidates_for_user(user, profile_type=profile_type):
      note_text = extract_note_text(note.content)
      search_text = ' '.join(filter(None, [note.title, note.description, note_text]))
      score = _score_text(query_tokens, search_text)
      if score > 0:
          note_entries.append({
              'score': score,
              'title': note.title,
              'slug': note.slug,
              'description': note.description or '',
              'content': note_text[:1200],
          })

    courses, topics, questions = _question_bank_candidates(profile_type=profile_type)

    for topic in topics:
        score = _score_text(query_tokens, f'{topic.title} {topic.summary or ""} {topic.course.title}')
        if score > 0:
            question_entries.append({
                'score': score,
                'type': 'topic',
                'course_slug': topic.course.slug,
                'topic_slug': topic.slug,
                'course_title': topic.course.title,
                'title': topic.title,
                'summary': topic.summary or '',
            })

    for item in questions:
        score = _score_text(query_tokens, f'{item.question} {item.answer} {item.topic.title} {item.topic.course.title}')
        if score > 0:
            question_entries.append({
                'score': score,
                'type': 'question',
                'course_slug': item.topic.course.slug,
                'topic_slug': item.topic.slug,
                'course_title': item.topic.course.title,
                'title': item.topic.title,
                'question': item.question[:360],
                'answer': item.answer[:480],
            })

    note_entries.sort(key=lambda item: item['score'], reverse=True)
    question_entries.sort(key=lambda item: item['score'], reverse=True)

    top_notes = note_entries[:2]
    top_qbank = question_entries[:3]

    context_parts = []

    for note in top_notes:
        context_parts.append(
            f'[NOTE] {note["title"]} (/notes/{note["slug"]})\n'
            f'Description: {note["description"]}\n'
            f'Content: {note["content"]}'
        )
        source_entries.append({
            'type': 'note',
            'label': note['title'],
            'url': f'/notes/{note["slug"]}',
        })

    for item in top_qbank:
        if item['type'] == 'topic':
            context_parts.append(
                f'[QUESTION_BANK_TOPIC] {item["course_title"]} -> {item["title"]} '
                f'(/question-bank/{item["course_slug"]}/{item["topic_slug"]})\n'
                f'Summary: {item["summary"]}'
            )
        else:
            context_parts.append(
                f'[QUESTION_BANK_QA] {item["course_title"]} -> {item["title"]} '
                f'(/question-bank/{item["course_slug"]}/{item["topic_slug"]})\n'
                f'Question: {item["question"]}\n'
                f'Answer: {item["answer"]}'
            )
        source_entries.append({
            'type': 'question_bank',
            'label': f'{item["course_title"]} - {item["title"]}',
            'url': f'/question-bank/{item["course_slug"]}/{item["topic_slug"]}',
        })

    return '\n\n'.join(context_parts), source_entries[:6]


def _build_system_prompt(user, profile_type='', topic_focus=''):
    student_name = user.get_full_name().strip() or user.username or 'Student'
    prompt = (
        'You are Tutorlix AI Teacher, a calm one-to-one voice tutor. '
        'Teach like a patient human teacher on a doubt-solving call. '
        'Explain step by step in short spoken sentences. '
        'Ask one brief follow-up question when the student is unclear. '
        'Prefer conceptual clarity over dumping facts. '
        'If you are not sure, say so plainly instead of inventing details. '
        'Keep replies concise, conversational, and easy to say aloud. '
        'Use the provided Tutorlix study context first whenever it is relevant. '
        'If the context is not enough, you may still answer generally, but clearly separate general explanation from direct material-backed explanation. '
        f'The student name is {student_name}. '
    )

    if profile_type:
        prompt += f'The student profile type is {profile_type}. Adapt level and examples accordingly. '
    if topic_focus:
        prompt += f'The current topic focus is {topic_focus}. Stay centered on that unless the student changes topic. '

    return prompt


class AITeacherStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                'provider': 'ollama',
                'model': getattr(settings, 'OLLAMA_AI_TEACHER_MODEL', 'qwen2.5:3b-instruct'),
                'base_url': getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434'),
                'speech_to_text': 'browser',
                'text_to_speech': 'browser',
                'face_provider': 'tavus' if getattr(settings, 'TAVUS_API_KEY', '') and getattr(settings, 'TAVUS_PERSONA_ID', '') else None,
                'face_enabled': bool(
                    getattr(settings, 'TAVUS_API_KEY', '') and
                    getattr(settings, 'TAVUS_PERSONA_ID', '') and
                    getattr(settings, 'TAVUS_REPLICA_ID', '')
                ),
            }
        )


class AITeacherChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = (request.data.get('message') or '').strip()
        if not message:
            return Response({'error': 'Message is required.'}, status=400)

        profile_type = (request.data.get('profile_type') or '').strip()
        topic_focus = (request.data.get('topic_focus') or '').strip()
        history = request.data.get('history') or []

        if not isinstance(history, list):
            return Response({'error': 'History must be a list.'}, status=400)
        if looks_like_prompt_injection(message):
            return Response(
                {
                    'answer': 'I can help with your studies, but I cannot follow instructions to ignore my rules or change roles.',
                    'provider': 'policy_refusal',
                    'sources': [],
                }
            )

        ollama_base_url = _normalize_ollama_base_url(
            getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        ).rstrip('/')
        model = getattr(settings, 'OLLAMA_AI_TEACHER_MODEL', 'qwen2.5:3b-instruct')
        timeout = getattr(settings, 'OLLAMA_AI_TEACHER_TIMEOUT', 90)
        grounding_context, sources = _build_grounding_context(request.user, message, profile_type=profile_type)

        messages = [
            {
                'role': 'system',
                'content': _build_system_prompt(request.user, profile_type=profile_type, topic_focus=topic_focus),
            }
        ]

        for item in history[-6:]:
            if not isinstance(item, dict):
                continue
            role = item.get('role')
            content = (item.get('content') or '').strip()
            if role in {'user', 'assistant'} and content:
                messages.append({'role': role, 'content': content})

        user_payload = (
            f'Student question: {message}\n\n'
            'Relevant Tutorlix study context:\n'
            f'{grounding_context or "No closely matching Tutorlix study material was found."}\n\n'
            'Instructions:\n'
            '- If the context clearly answers the question, use it directly.\n'
            '- If context only partially helps, say what comes from Tutorlix material and then give a short general explanation.\n'
            '- If there is no matching context, still help as a teacher, but do not pretend the platform materials said it.\n'
            '- Keep the answer concise and spoken-language friendly.\n'
        )
        messages.append({'role': 'user', 'content': user_payload})

        try:
            response = requests.post(
                f'{ollama_base_url}/api/chat',
                json={
                    'model': model,
                    'messages': messages,
                    'stream': False,
                    'options': {
                        'temperature': 0.3,
                    },
                },
                timeout=timeout,
            )
        except requests.RequestException as exc:
            return Response(
                {
                    'error': (
                        'Failed to reach the open-source AI teacher model. '
                        'Make sure Ollama is running and reachable from the backend.'
                    ),
                    'details': str(exc),
                },
                status=502,
            )

        if response.status_code >= 400:
            return Response(
                {
                    'error': 'Open-source model request failed.',
                    'details': response.text[:500],
                },
                status=502,
            )

        data = response.json()
        answer = ((data.get('message') or {}).get('content') or '').strip()
        if not answer:
            return Response({'error': 'Model returned an empty response.'}, status=502)

        return Response(
            {
                'answer': answer,
                'model': model,
                'provider': 'ollama',
                'sources': sources,
            }
        )


class AITeacherFaceSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tavus_api_key = getattr(settings, 'TAVUS_API_KEY', '')
        tavus_persona_id = getattr(settings, 'TAVUS_PERSONA_ID', '')
        tavus_replica_id = getattr(settings, 'TAVUS_REPLICA_ID', '')

        if not tavus_api_key or not tavus_persona_id or not tavus_replica_id:
            return Response(
                {
                    'error': 'Realistic face is not configured. Set TAVUS_API_KEY, TAVUS_PERSONA_ID, and TAVUS_REPLICA_ID.',
                },
                status=503,
            )

        profile_type = (request.data.get('profile_type') or '').strip()
        topic_focus = (request.data.get('topic_focus') or '').strip()
        user = request.user

        contextual_prompt = (
            f'The student is {user.get_full_name().strip() or user.username or "Student"}. '
            'Act as a calm one-to-one teacher. '
        )
        if profile_type:
            contextual_prompt += f'The active profile type is {profile_type}. '
        if topic_focus:
            contextual_prompt += f'The current topic focus is {topic_focus}. '

        payload = {
            'replica_id': tavus_replica_id,
            'persona_id': tavus_persona_id,
            'conversation_name': f'Tutorlix AI Teacher - {user.username}',
            'custom_greeting': (
                f'Hi {user.first_name or user.username}, I am ready to help.'
                if not topic_focus else
                f'Hi {user.first_name or user.username}, I am ready to help you with {topic_focus}.'
            ),
            'conversational_context': contextual_prompt,
            'require_auth': False,
            'max_participants': 2,
        }

        try:
            response = requests.post(
                'https://tavusapi.com/v2/conversations',
                headers={
                    'Content-Type': 'application/json',
                    'x-api-key': tavus_api_key,
                },
                json=payload,
                timeout=30,
            )
        except requests.RequestException as exc:
            return Response(
                {
                    'error': 'Failed to initialize realistic face session.',
                    'details': str(exc),
                },
                status=502,
            )

        if response.status_code >= 400:
            return Response(
                {
                    'error': 'Tavus conversation creation failed.',
                    'details': response.text[:500],
                },
                status=502,
            )

        data = response.json()
        return Response(
            {
                'conversation_id': data.get('conversation_id'),
                'conversation_url': data.get('conversation_url'),
                'status': data.get('status'),
            }
        )


class AITeacherFaceSessionEndView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        tavus_api_key = getattr(settings, 'TAVUS_API_KEY', '')
        if not tavus_api_key:
            return Response({'ok': True})

        try:
            response = requests.post(
                f'https://tavusapi.com/v2/conversations/{conversation_id}/end',
                headers={'x-api-key': tavus_api_key},
                timeout=20,
            )
        except requests.RequestException as exc:
            return Response(
                {
                    'error': 'Failed to end realistic face session.',
                    'details': str(exc),
                },
                status=502,
            )

        if response.status_code >= 400:
            return Response(
                {
                    'error': 'Tavus conversation end failed.',
                    'details': response.text[:500],
                },
                status=502,
            )

        return Response({'ok': True})
