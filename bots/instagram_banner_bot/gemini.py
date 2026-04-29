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


class GeminiImageGenerationError(RuntimeError):
    """Raised when Gemini cannot produce an image for the banner."""


class GeminiImageGenerator:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        model: str,
        timeout_seconds: int,
        prompt_template: str = "",
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model.strip()
        self.timeout_seconds = timeout_seconds
        self.prompt_template = prompt_template.strip()

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
        filename = f"{timestamp}_{content_index:02d}_{_slugify(post.headline)}_gemini.jpg"
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
                raise GeminiImageGenerationError(
                    f"GEMINI_IMAGE_PROMPT has unknown placeholder: {exc}"
                ) from exc

        return (
            f"Create a fresh square 1:1 Instagram image for {brand_name}, an online "
            f"learning platform. Brand tagline: {brand_tagline}. Campaign headline: "
            f"{post.headline}. Supporting idea: {post.subheadline or post.caption}. "
            f"Call to action: {post.cta or 'Start learning with Tutorlix'}. Make it "
            "look like a polished education brand social post with a modern digital "
            "learning theme, clean composition, strong contrast, and space for the "
            "main message. Use a different visual concept from previous runs. "
            f"Variation seed: {variation_seed}. Do not include QR codes, fake UI, "
            "contact details, spelling mistakes, or visible watermarks."
        )

    def _request_image(self, prompt: str) -> dict[str, Any]:
        if not self.api_key:
            raise GeminiImageGenerationError("GEMINI_API_KEY is required")
        if not self.model:
            raise GeminiImageGenerationError("GEMINI_IMAGE_MODEL is required")

        url = f"{self.base_url}/models/{self.model}:generateContent"
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt,
                        },
                    ],
                },
            ],
            "generationConfig": {
                "imageConfig": {
                    "aspectRatio": "1:1",
                },
            },
        }
        response = requests.post(
            url,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": self.api_key,
            },
            json=payload,
            timeout=self.timeout_seconds,
        )

        try:
            data = response.json()
        except ValueError as exc:
            raise GeminiImageGenerationError(
                f"Gemini returned non-JSON response {response.status_code}: "
                f"{response.text[:300]}"
            ) from exc

        if response.status_code >= 400 or "error" in data:
            raise GeminiImageGenerationError(
                f"Gemini image API error {response.status_code}: {data}"
            )
        if not isinstance(data, dict):
            raise GeminiImageGenerationError(f"Unexpected Gemini response: {data}")
        return data

    @staticmethod
    def _extract_image_bytes(data: dict[str, Any]) -> bytes:
        text_parts = []
        for candidate in data.get("candidates", []):
            content = candidate.get("content", {})
            for part in content.get("parts", []):
                inline_data = part.get("inlineData") or part.get("inline_data")
                if inline_data and inline_data.get("data"):
                    return base64.b64decode(inline_data["data"])
                if part.get("text"):
                    text_parts.append(str(part["text"]))

        message = "Gemini response did not include image data"
        if text_parts:
            message += f"; text response: {' '.join(text_parts)[:300]}"
        raise GeminiImageGenerationError(message)

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
