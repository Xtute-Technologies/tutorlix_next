from __future__ import annotations

from dataclasses import dataclass
import json
import logging
from pathlib import Path
import random
import re
from typing import Any
from urllib.parse import urljoin

from .networking import install_ipv4_only_networking


install_ipv4_only_networking()

try:
    import requests
except ImportError as exc:  # pragma: no cover - exercised by runtime setup.
    raise RuntimeError(
        "requests is required. Install bot dependencies with: "
        "pip install -r bots/av_bot/requirements.txt"
    ) from exc


LOGGER = logging.getLogger("av-bot")


class NoteFetchError(RuntimeError):
    """Raised when Tutorlix notes cannot be loaded."""


@dataclass(frozen=True)
class NoteItem:
    id: str
    title: str
    slug: str
    description: str
    profile_types: tuple[str, ...]
    url: str
    content_excerpt: str = ""

    @classmethod
    def from_mapping(
        cls,
        item: dict[str, Any],
        *,
        site_base_url: str,
    ) -> "NoteItem":
        title = str(item.get("title", "")).strip()
        slug = str(item.get("slug", "")).strip()
        note_id = str(item.get("id", slug)).strip()
        description = _clean_text(str(item.get("description", "")).strip())
        profile_types = _normalize_profile_types(item.get("profileTypes"))
        url = item.get("url") or item.get("absolute_url") or ""
        if not url and slug:
            url = f"{site_base_url.rstrip('/')}/notes/{slug}"

        return cls(
            id=note_id,
            title=title,
            slug=slug,
            description=description,
            profile_types=profile_types,
            url=str(url).strip(),
            content_excerpt=_clean_text(_extract_content_excerpt(item.get("content"))),
        )

    def matches_profile(self, profile_type: str) -> bool:
        wanted = profile_type.strip().casefold()
        return wanted in {value.casefold() for value in self.profile_types}


class TutorlixNoteClient:
    def __init__(
        self,
        *,
        api_base_url: str,
        site_base_url: str,
        timeout_seconds: int,
        page_size: int,
        max_pages: int,
    ):
        self.api_base_url = api_base_url.rstrip("/")
        self.site_base_url = site_base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.page_size = page_size
        self.max_pages = max(1, max_pages)

    def fetch_notes(self, *, profile_type: str) -> tuple[NoteItem, ...]:
        notes = []
        url = self._notes_endpoint()
        params: dict[str, Any] | None = {
            "profile_type": profile_type,
            "page_size": self.page_size,
            "page": 1,
        }

        for _page in range(self.max_pages):
            payload = self._get_json(url, params=params)
            items, next_url = _extract_items_and_next(payload)
            for item in items:
                if not isinstance(item, dict):
                    continue
                note = NoteItem.from_mapping(item, site_base_url=self.site_base_url)
                if note.title and note.slug and note.matches_profile(profile_type):
                    notes.append(note)

            if not next_url:
                break
            url = next_url
            params = None

        deduped = {note.slug: note for note in notes}
        LOGGER.info("Loaded %s Tutorlix notes for profile_type=%s", len(deduped), profile_type)
        return tuple(deduped.values())

    def fetch_detail(self, note: NoteItem) -> NoteItem:
        if not note.slug:
            return note

        payload = self._get_json(
            self._note_detail_endpoint(note.slug),
            params=None,
        )
        if not isinstance(payload, dict):
            return note

        detailed = NoteItem.from_mapping(payload, site_base_url=self.site_base_url)
        return detailed if detailed.title and detailed.slug else note

    def _notes_endpoint(self) -> str:
        return _api_url(self.api_base_url, "notes/public/browse/")

    def _note_detail_endpoint(self, slug: str) -> str:
        return _api_url(self.api_base_url, f"notes/{slug}/public_detail/")

    def _get_json(self, url: str, *, params: dict[str, Any] | None) -> Any:
        last_error = None
        for attempt in range(1, 6):
            try:
                response = requests.get(
                    url,
                    params=params,
                    timeout=self.timeout_seconds,
                    headers={"User-Agent": "TutorlixAvBot/1.0"},
                )
                return self._json_or_raise(response)
            except requests.exceptions.RequestException as exc:
                last_error = exc
                LOGGER.warning("Tutorlix notes request attempt %s failed: %s", attempt, exc)

        raise NoteFetchError(f"Tutorlix notes request failed after retries: {last_error}")

    @staticmethod
    def _json_or_raise(response: requests.Response) -> Any:
        try:
            payload = response.json()
        except ValueError as exc:
            raise NoteFetchError(
                f"Tutorlix returned non-JSON response {response.status_code}: "
                f"{response.text[:300]}"
            ) from exc

        if response.status_code >= 400:
            raise NoteFetchError(
                f"Tutorlix API error {response.status_code}: {payload}"
            )
        return payload


class NoteStateStore:
    def __init__(self, state_file: Path, *, recent_history_limit: int):
        self.state_file = state_file
        self.recent_history_limit = max(0, recent_history_limit)

    def choose_random_note(self, notes: tuple[NoteItem, ...]) -> NoteItem:
        if not notes:
            raise NoteFetchError("No professional Tutorlix notes are available to post")

        state = self._load_state()
        recent_slugs = [
            str(item.get("slug", ""))
            for item in state.get("history", [])[-self.recent_history_limit :]
            if isinstance(item, dict)
        ]
        recent_slug_set = {value for value in recent_slugs if value}
        candidates = [note for note in notes if note.slug not in recent_slug_set]
        if not candidates:
            candidates = list(notes)
        return random.SystemRandom().choice(candidates)

    def mark_posted(
        self,
        note: NoteItem,
        *,
        buffer_post_ids: tuple[str, ...] = (),
        dry_run: bool = False,
    ) -> None:
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        state = self._load_state()
        history = list(state.get("history", []))
        history.append(
            {
                "note_id": note.id,
                "slug": note.slug,
                "title": note.title,
                "url": note.url,
                "buffer_post_ids": list(buffer_post_ids),
                "dry_run": dry_run,
            }
        )
        state = {
            "history": history[-100:],
        }
        self.state_file.write_text(json.dumps(state, indent=2), encoding="utf-8")

    def _load_state(self) -> dict[str, Any]:
        if not self.state_file.exists():
            return {}
        try:
            state = json.loads(self.state_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
        return state if isinstance(state, dict) else {}


def build_linkedin_text(note: NoteItem) -> str:
    body = note.description or note.content_excerpt
    if body:
        body = _truncate(body, 700)

    parts = [
        "Hi Linkedin family is curated a note on " + note.title,
    ]
    if body:
        parts.append(body)
    parts.extend(
        [
            f"Read it here: {note.url}",
            "#Tutorlix #ProfessionalLearning #CareerGrowth #TechLearning",
        ]
    )

    text = "\n\n".join(part for part in parts if part.strip()).strip()
    return _truncate(text, 3000)


def _api_url(base_url: str, path: str) -> str:
    normalized_base = base_url.rstrip("/")
    normalized_path = path.strip("/")
    if normalized_base.endswith("/api"):
        return f"{normalized_base}/{normalized_path}/"
    return urljoin(f"{normalized_base}/", f"api/{normalized_path}/")


def _extract_items_and_next(payload: Any) -> tuple[list[Any], str | None]:
    if isinstance(payload, list):
        return payload, None
    if isinstance(payload, dict):
        results = payload.get("results")
        if isinstance(results, list):
            next_url = payload.get("next")
            return results, str(next_url) if next_url else None
    raise NoteFetchError(f"Unexpected Tutorlix notes response: {payload}")


def _normalize_profile_types(value: Any) -> tuple[str, ...]:
    if isinstance(value, list):
        return tuple(str(item).strip() for item in value if str(item).strip())
    if isinstance(value, str):
        return tuple(item.strip() for item in value.split(",") if item.strip())
    return ()


def _extract_content_excerpt(content: Any) -> str:
    if not isinstance(content, list):
        return ""

    parts = []
    for block in content:
        text = _extract_block_text(block)
        if text:
            parts.append(text)
        if len(" ".join(parts)) > 900:
            break
    return " ".join(parts)


def _extract_block_text(block: Any) -> str:
    if not isinstance(block, dict):
        return ""
    content = block.get("content")
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""

    parts = []
    for item in content:
        if isinstance(item, dict):
            text = item.get("text")
            if isinstance(text, str) and text.strip():
                parts.append(text.strip())
        elif isinstance(item, str) and item.strip():
            parts.append(item.strip())
    return " ".join(parts)


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _truncate(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    return value[: limit - 3].rstrip() + "..."
