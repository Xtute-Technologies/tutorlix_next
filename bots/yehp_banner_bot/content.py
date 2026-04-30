from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
import random
from typing import Any


DEFAULT_POSTS = [
    {
        "headline": "Herbal Weight Management",
        "subheadline": "Doctor-guided herbal wellness plans for healthy weight goals.",
        "cta": "Book a consultation",
        "caption": "Explore doctor-guided herbal wellness support for weight management. Individual results vary; consult a qualified healthcare professional before starting any herbal plan.",
        "hashtags": ["#YEHP", "#HerbalWellness", "#WeightManagement", "#HolisticHealth"],
    },
    {
        "headline": "Kidney Wellness Support",
        "subheadline": "Herbal care conversations for kidney-related concerns under guidance.",
        "cta": "Talk to our doctor",
        "caption": "Kidney-related symptoms need proper medical evaluation. YEHP offers consultation-led herbal wellness support that should not replace urgent or specialist medical care.",
        "hashtags": ["#YEHP", "#KidneyWellness", "#HerbalCare", "#DoctorGuided"],
    },
    {
        "headline": "High Fever Care Guidance",
        "subheadline": "Doctor-led herbal wellness support with timely medical attention.",
        "cta": "Get guided care",
        "caption": "High fever can need urgent medical attention. Seek timely care and use herbal wellness support only with qualified guidance.",
        "hashtags": ["#YEHP", "#FeverCare", "#HerbalWellness", "#HealthGuidance"],
    },
    {
        "headline": "Herbal Skin Wellness",
        "subheadline": "Gentle consultation-led support for common skin wellness concerns.",
        "cta": "Book your visit",
        "caption": "Skin concerns can have many causes. YEHP offers doctor-guided herbal wellness conversations and encourages proper diagnosis for persistent or severe symptoms.",
        "hashtags": ["#YEHP", "#SkinWellness", "#HerbalCare", "#HealthySkin"],
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
        next_index = random.randrange(len(self.posts))
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
