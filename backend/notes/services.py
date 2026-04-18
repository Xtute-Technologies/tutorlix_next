import json
import requests
from django.conf import settings
from rest_framework.exceptions import ValidationError


def _block_to_text(block):
    pieces = []
    if isinstance(block, dict):
        for content in block.get('content') or []:
            if isinstance(content, str):
                pieces.append(content)
            elif isinstance(content, dict):
                text = content.get('text')
                if text:
                    pieces.append(text)
        props = block.get('props') or {}
        for key in ['caption', 'title', 'url', 'src']:
            value = props.get(key)
            if isinstance(value, str):
                pieces.append(value)
        for child in block.get('children') or []:
            pieces.append(_block_to_text(child))
    elif isinstance(block, list):
        for item in block:
            pieces.append(_block_to_text(item))
    elif isinstance(block, str):
        pieces.append(block)
    return ' '.join(part for part in pieces if part).strip()


def extract_note_text(content):
    if not content:
        return ""
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except Exception:
            return content[:8000]
    text = _block_to_text(content)
    return ' '.join(text.split())[:12000]


class GroqNoteAIService:
    def __init__(self):
        self.api_key = getattr(settings, 'GROQ_API_KEY', '')
        self.model = getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile')
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    def answer_note_question(self, note, question):
        if not self.api_key:
            raise ValidationError("Groq is not configured. Set GROQ_API_KEY in backend .env.")

        note_text = extract_note_text(note.content)
        if not note_text:
            raise ValidationError("This note has no readable content for Ask AI.")

        system_prompt = (
            "You are a tutoring assistant answering doubts strictly about one study note. "
            "Use only the provided note context. If the answer is not clearly supported by the note, "
            "say that the note does not fully cover it and point the student back to the relevant covered concepts. "
            "Keep answers accurate, structured, and educational."
        )
        user_prompt = (
            f"Note title: {note.title}\n"
            f"Note description: {note.description or 'N/A'}\n\n"
            f"Note content:\n{note_text}\n\n"
            f"Student question:\n{question}\n\n"
            "Answer in clear teaching language with short paragraphs and, when useful, a brief bullet list."
        )

        response = requests.post(
            self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.model,
                "temperature": 0.3,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
            timeout=45,
        )
        if response.status_code >= 400:
            raise ValidationError(f"Groq request failed: {response.text[:300]}")

        data = response.json()
        choices = data.get('choices') or []
        message = choices[0].get('message', {}) if choices else {}
        content = message.get('content')
        if not content:
            raise ValidationError("Groq returned an empty response.")
        return {
            "answer": content.strip(),
            "model_name": data.get('model') or self.model,
        }
