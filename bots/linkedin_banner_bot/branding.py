from __future__ import annotations

from io import BytesIO
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError as exc:  # pragma: no cover - exercised by runtime setup.
    raise RuntimeError(
        "Pillow is required. Install bot dependencies with: "
        "pip install -r bots/linkedin_banner_bot/requirements.txt"
    ) from exc

from .networking import install_ipv4_only_networking


install_ipv4_only_networking()

try:
    import requests
except ImportError as exc:  # pragma: no cover - exercised by runtime setup.
    raise RuntimeError(
        "requests is required. Install bot dependencies with: "
        "pip install -r bots/linkedin_banner_bot/requirements.txt"
    ) from exc


class LogoOverlayError(RuntimeError):
    """Raised when the configured logo cannot be applied to the banner."""


def apply_logo_overlay(
    image_path: Path,
    *,
    logo_url: str,
    timeout_seconds: int,
) -> None:
    if not logo_url:
        return

    logo = _download_logo(logo_url, timeout_seconds=timeout_seconds)

    with Image.open(image_path) as image:
        base = image.convert("RGBA")
        logo = _fit_logo(logo, max_width=230, max_height=92)

        padding_x = 34
        padding_y = 24
        margin = 54
        plate_width = logo.width + padding_x * 2
        plate_height = logo.height + padding_y * 2
        plate_x = margin
        plate_y = margin

        overlay = Image.new("RGBA", base.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(overlay)
        draw.rounded_rectangle(
            (
                plate_x,
                plate_y,
                plate_x + plate_width,
                plate_y + plate_height,
            ),
            radius=30,
            fill=(255, 255, 255, 232),
            outline=(226, 232, 240, 230),
            width=2,
        )
        overlay.alpha_composite(logo, (plate_x + padding_x, plate_y + padding_y))
        branded = Image.alpha_composite(base, overlay).convert("RGB")
        branded.save(image_path, "JPEG", quality=92, optimize=True, progressive=True)


def _download_logo(logo_url: str, *, timeout_seconds: int) -> Image.Image:
    try:
        response = requests.get(logo_url, timeout=timeout_seconds)
        response.raise_for_status()
    except requests.exceptions.RequestException as exc:
        raise LogoOverlayError(f"Could not download logo from {logo_url}: {exc}") from exc

    try:
        return Image.open(BytesIO(response.content)).convert("RGBA")
    except Exception as exc:
        raise LogoOverlayError(f"Logo response from {logo_url} was not a valid image") from exc


def _fit_logo(
    logo: Image.Image,
    *,
    max_width: int,
    max_height: int,
) -> Image.Image:
    fitted = logo.copy()
    fitted.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    return fitted
