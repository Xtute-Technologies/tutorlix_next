from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any


DEFAULT_POSTS = [
    {
        "headline": "Master one concept today",
        "subheadline": "Short lessons, clear notes, and focused practice for steady progress.",
        "cta": "Start learning with Tutorlix",
        "caption": "Small daily progress compounds. Pick one concept, learn it clearly, and test yourself before moving on.",
        "hashtags": ["#Tutorlix", "#OnlineLearning", "#StudyTips"],
    },
    {
        "headline": "Turn study time into results",
        "subheadline": "Use structured classes, notes, and question practice in one place.",
        "cta": "Explore Tutorlix courses",
        "caption": "A clear study plan beats random effort. Build your base, revise often, and practice with intent.",
        "hashtags": ["#Tutorlix", "#LearnOnline", "#ExamPrep"],
    },
    {
        "headline": "Practice after every lesson",
        "subheadline": "The fastest feedback loop is learn, attempt, review, and repeat.",
        "cta": "Build your learning routine",
        "caption": "Do not stop at watching lessons. Practice immediately while the idea is fresh.",
        "hashtags": ["#Tutorlix", "#StudentSuccess", "#Learning"],
    },
]


@dataclass(frozen=True)
class PostSpec:
    headline: str
    subheadline: str
    cta: str
    caption: str
    hashtags: tuple[str, ...]

    @classmethod
    def from_mapping(cls, item: dict[str, Any]) -> "PostSpec":
        headline = str(item.get("headline", "")).strip()
        subheadline = str(item.get("subheadline", "")).strip()
        cta = str(item.get("cta", "")).strip()
        caption = str(item.get("caption", "")).strip()
        hashtags = item.get("hashtags", [])

        if not headline:
            raise ValueError("Each content item needs a headline")
        if not isinstance(hashtags, list):
            raise ValueError("hashtags must be a list")

        normalized_hashtags = []
        for tag in hashtags:
            value = str(tag).strip()
            if not value:
                continue
            normalized_hashtags.append(value if value.startswith("#") else f"#{value}")

        return cls(
            headline=headline,
            subheadline=subheadline,
            cta=cta,
            caption=caption,
            hashtags=tuple(normalized_hashtags),
        )

    def instagram_caption(self) -> str:
        if self.caption:
            parts = [self.caption]
        else:
            parts = [self.headline]
            if self.subheadline:
                parts.append(self.subheadline)
            if self.cta:
                parts.append(self.cta)

        if self.hashtags:
            parts.append(" ".join(self.hashtags[:30]))

        caption = "\n\n".join(part for part in parts if part.strip()).strip()
        if len(caption) > 2200:
            return caption[:2197].rstrip() + "..."
        return caption


class ContentStore:
    def __init__(self, content_file: Path, state_file: Path):
        self.content_file = content_file
        self.state_file = state_file
        self.posts = self._load_posts()

    def next_post(self) -> tuple[int, PostSpec]:
        state = self._load_state()
        next_index = int(state.get("next_index", 0)) % len(self.posts)
        return next_index, self.posts[next_index]

    def mark_used(self, index: int, image_path: Path, media_id: str | None = None) -> None:
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        next_index = (index + 1) % len(self.posts)
        history_item = {
            "content_index": index,
            "image": str(image_path),
        }
        if media_id:
            history_item["instagram_media_id"] = media_id

        state = self._load_state()
        history = list(state.get("history", []))
        history.append(history_item)
        state = {
            "next_index": next_index,
            "history": history[-50:],
        }
        self.state_file.write_text(json.dumps(state, indent=2), encoding="utf-8")

    def _load_posts(self) -> list[PostSpec]:
        if self.content_file.exists():
            try:
                raw = json.loads(self.content_file.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON in {self.content_file}") from exc
        else:
            raw = DEFAULT_POSTS

        if not isinstance(raw, list) or not raw:
            raise ValueError("Content file must contain a non-empty JSON list")

        return [PostSpec.from_mapping(item) for item in raw]

    def _load_state(self) -> dict[str, Any]:
        if not self.state_file.exists():
            return {}
        try:
            state = json.loads(self.state_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
        return state if isinstance(state, dict) else {}
