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


class StableDiffusionGenerationError(RuntimeError):
    """Raised when Stable Diffusion cannot produce an image for the banner."""


class StableDiffusionImageGenerator:
    def __init__(
        self,
        *,
        base_url: str,
        timeout_seconds: int,
        prompt_template: str = "",
        negative_prompt: str = "",
        steps: int = 28,
        cfg_scale: float = 7.0,
        sampler_name: str = "DPM++ 2M Karras",
        width: int = 1024,
        height: int = 1024,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.prompt_template = prompt_template.strip()
        self.negative_prompt = negative_prompt.strip()
        self.steps = steps
        self.cfg_scale = cfg_scale
        self.sampler_name = sampler_name.strip()
        self.width = width
        self.height = height

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
        filename = f"{timestamp}_{content_index:02d}_{_slugify(post.headline)}_sd.jpg"
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
                raise StableDiffusionGenerationError(
                    f"STABLE_DIFFUSION_PROMPT has unknown placeholder: {exc}"
                ) from exc

        return (
            f"square 1:1 Instagram education brand poster for {brand_name}, "
            f"{brand_tagline}, topic: {post.headline}, "
            f"supporting idea: {post.subheadline or post.caption}, "
            f"call to action mood: {post.cta or 'Start learning with Tutorlix'}, "
            "modern online learning visual, premium clean composition, vibrant but "
            "professional color palette, clear central focal point, polished social "
            "media campaign artwork, subtle digital classroom elements, top-left "
            "area kept calm and uncluttered for official logo overlay, no embedded "
            f"text, no logo, no watermark, variation seed {variation_seed}"
        )

    def _request_image(self, prompt: str) -> dict[str, Any]:
        url = f"{self.base_url}/sdapi/v1/txt2img"
        payload = {
            "prompt": prompt,
            "negative_prompt": self.negative_prompt or DEFAULT_NEGATIVE_PROMPT,
            "steps": self.steps,
            "cfg_scale": self.cfg_scale,
            "sampler_name": self.sampler_name,
            "width": self.width,
            "height": self.height,
            "batch_size": 1,
            "n_iter": 1,
            "send_images": True,
            "save_images": False,
        }

        try:
            response = requests.post(url, json=payload, timeout=self.timeout_seconds)
        except requests.exceptions.RequestException as exc:
            raise StableDiffusionGenerationError(
                f"Stable Diffusion API request failed at {url}: {exc}"
            ) from exc

        try:
            data = response.json()
        except ValueError as exc:
            raise StableDiffusionGenerationError(
                f"Stable Diffusion returned non-JSON response {response.status_code}: "
                f"{response.text[:300]}"
            ) from exc

        if response.status_code >= 400:
            raise StableDiffusionGenerationError(
                f"Stable Diffusion API error {response.status_code}: {data}"
            )
        if not isinstance(data, dict):
            raise StableDiffusionGenerationError(
                f"Unexpected Stable Diffusion response: {data}"
            )
        return data

    @staticmethod
    def _extract_image_bytes(data: dict[str, Any]) -> bytes:
        images = data.get("images")
        if not isinstance(images, list) or not images:
            raise StableDiffusionGenerationError(
                f"Stable Diffusion response did not include images: {data}"
            )

        encoded = str(images[0])
        if "," in encoded:
            encoded = encoded.split(",", 1)[1]
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


DEFAULT_NEGATIVE_PROMPT = (
    "text, words, letters, logo, watermark, qr code, contact details, phone number, "
    "email address, url, malformed hands, distorted faces, low quality, blurry, "
    "pixelated, cluttered layout"
)


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
