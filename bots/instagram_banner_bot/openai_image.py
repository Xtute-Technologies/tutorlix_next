from __future__ import annotations

import base64
from datetime import datetime
from io import BytesIO
import random
from pathlib import Path
from typing import Any

try:
    from PIL import Image, ImageOps
except ImportError as exc:  # pragma: no cover - exercised by runtime setup.
    raise RuntimeError(
        "Pillow is required. Install bot dependencies with: "
        "pip install -r bots/instagram_banner_bot/requirements.txt"
    ) from exc

from .networking import install_ipv4_only_networking


install_ipv4_only_networking()

try:
    import requests
except ImportError as exc:  # pragma: no cover - exercised by runtime setup.
    raise RuntimeError(
        "requests is required. Install bot dependencies with: "
        "pip install -r bots/instagram_banner_bot/requirements.txt"
    ) from exc

from .content import PostSpec


class OpenAIImageGenerationError(RuntimeError):
    """Raised when OpenAI cannot produce an image for the banner."""


class OpenAIImageGenerator:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        model: str,
        timeout_seconds: int,
        prompt_template: str = "",
        size: str = "1024x1024",
        quality: str = "medium",
        output_format: str = "png",
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model.strip()
        self.timeout_seconds = timeout_seconds
        self.prompt_template = prompt_template.strip()
        self.size = size.strip()
        self.quality = quality.strip()
        self.output_format = output_format.strip()

    def generate_banner(
        self,
        post: PostSpec,
        *,
        brand_name: str,
        brand_tagline: str,
        output_dir: Path,
        content_index: int,
    ) -> Path:
        output_dir.mkdir(parents=True, exist_ok=True)
        prompt = self._build_prompt(
            post,
            brand_name=brand_name,
            brand_tagline=brand_tagline,
            content_index=content_index,
        )
        response = self._request_image(prompt)
        image_bytes = self._extract_image_bytes(response)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{content_index:02d}_{_slugify(post.headline)}_openai.jpg"
        output_path = output_dir / filename
        self._save_instagram_jpeg(image_bytes, output_path)
        return output_path

    def _build_prompt(
        self,
        post: PostSpec,
        *,
        brand_name: str,
        brand_tagline: str,
        content_index: int,
    ) -> str:
        variation_seed = random.randint(100000, 999999)
        values = {
            "brand_name": brand_name,
            "brand_tagline": brand_tagline,
            "headline": post.headline,
            "subheadline": post.subheadline,
            "cta": post.cta,
            "caption": post.caption,
            "hashtags": " ".join(post.hashtags),
            "content_index": content_index,
            "variation_seed": variation_seed,
            "date": datetime.now().strftime("%Y-%m-%d"),
        }
        if self.prompt_template:
            try:
                return self.prompt_template.format(**values)
            except KeyError as exc:
                raise OpenAIImageGenerationError(
                    f"OPENAI_IMAGE_PROMPT has unknown placeholder: {exc}"
                ) from exc

        return (
            f"Create a square 1:1 Instagram education brand poster for {brand_name}. "
            f"Brand tagline: {brand_tagline}. Topic headline: {post.headline}. "
            f"Supporting idea: {post.subheadline or post.caption}. "
            f"CTA mood: {post.cta or 'Start learning with Tutorlix'}. "
            "Style: premium modern online learning campaign artwork, polished, "
            "professional, vibrant but clean, strong central visual, subtle digital "
            "classroom or study elements, not cluttered. Leave the top-left corner "
            "visually calm for the official logo overlay. Do not include embedded "
            "text, logos, QR codes, contact details, URLs, spelling, or watermarks. "
            f"Use a fresh concept. Variation seed: {variation_seed}."
        )

    def _request_image(self, prompt: str) -> dict[str, Any]:
        if not self.api_key:
            raise OpenAIImageGenerationError("OPENAI_API_KEY is required")
        if not self.model:
            raise OpenAIImageGenerationError("OPENAI_IMAGE_MODEL is required")

        payload = {
            "model": self.model,
            "prompt": prompt,
            "size": self.size,
            "quality": self.quality,
            "output_format": self.output_format,
            "n": 1,
        }

        try:
            response = requests.post(
                f"{self.base_url}/images/generations",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=self.timeout_seconds,
            )
        except requests.exceptions.RequestException as exc:
            raise OpenAIImageGenerationError(
                f"OpenAI image API request failed: {exc}"
            ) from exc

        try:
            data = response.json()
        except ValueError as exc:
            raise OpenAIImageGenerationError(
                f"OpenAI returned non-JSON response {response.status_code}: "
                f"{response.text[:300]}"
            ) from exc

        if response.status_code >= 400 or "error" in data:
            raise OpenAIImageGenerationError(
                f"OpenAI image API error {response.status_code}: {data}"
            )
        if not isinstance(data, dict):
            raise OpenAIImageGenerationError(f"Unexpected OpenAI response: {data}")
        return data

    @staticmethod
    def _extract_image_bytes(data: dict[str, Any]) -> bytes:
        items = data.get("data")
        if not isinstance(items, list) or not items:
            raise OpenAIImageGenerationError(
                f"OpenAI response did not include image data: {data}"
            )

        encoded = items[0].get("b64_json") if isinstance(items[0], dict) else None
        if not encoded:
            raise OpenAIImageGenerationError(
                f"OpenAI response did not include b64_json image data: {data}"
            )
        return base64.b64decode(encoded)

    @staticmethod
    def _save_instagram_jpeg(image_bytes: bytes, output_path: Path) -> None:
        with Image.open(BytesIO(image_bytes)) as image:
            image = image.convert("RGB")
            canvas = ImageOps.fit(
                image,
                (1080, 1080),
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
            canvas.save(output_path, "JPEG", quality=92, optimize=True, progressive=True)


def _slugify(value: str) -> str:
    lowered = value.lower()
    chars = []
    previous_dash = False
    for char in lowered:
        if char.isalnum():
            chars.append(char)
            previous_dash = False
        elif not previous_dash:
            chars.append("-")
            previous_dash = True
    return "".join(chars).strip("-")[:42] or "banner"
