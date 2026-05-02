from __future__ import annotations

import base64
from datetime import datetime
import hashlib
from io import BytesIO
from pathlib import Path
import random
import textwrap
from typing import Any

try:
    from PIL import Image, ImageDraw, ImageFont, ImageOps
except ImportError as exc:  # pragma: no cover - exercised by runtime setup.
    raise RuntimeError(
        "Pillow is required. Install bot dependencies with: "
        "pip install -r bots/yehp_banner_bot/requirements.txt"
    ) from exc

from .content import PostSpec
from .networking import install_ipv4_only_networking


install_ipv4_only_networking()

try:
    import requests
except ImportError as exc:  # pragma: no cover - exercised by runtime setup.
    raise RuntimeError(
        "requests is required. Install bot dependencies with: "
        "pip install -r bots/yehp_banner_bot/requirements.txt"
    ) from exc


CANVAS_SIZE = (1080, 1080)
FOOTER_TOP = 932
OPENAI_TEXT_PANEL = (72, 170, 616, 912)

PALETTES = [
    {
        "background": "#f8fafc",
        "panel": "#ffffff",
        "primary": "#102a43",
        "secondary": "#486581",
        "accent": "#f97316",
        "accent_dark": "#c2410c",
        "soft": "#dbeafe",
    },
    {
        "background": "#f5faff",
        "panel": "#ffffff",
        "primary": "#1f2933",
        "secondary": "#52606d",
        "accent": "#0f766e",
        "accent_dark": "#115e59",
        "soft": "#dbeafe",
    },
    {
        "background": "#f1f8ff",
        "panel": "#ffffff",
        "primary": "#1f2937",
        "secondary": "#4b5563",
        "accent": "#2563eb",
        "accent_dark": "#1d4ed8",
        "soft": "#dbeafe",
    },
    {
        "background": "#f7fbff",
        "panel": "#ffffff",
        "primary": "#111827",
        "secondary": "#4b5563",
        "accent": "#7c3aed",
        "accent_dark": "#6d28d9",
        "soft": "#e0f2fe",
    },
]

FONT_CANDIDATES = {
    "regular": [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    ],
    "bold": [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    ],
}


def render_banner(
    post: PostSpec,
    *,
    brand_name: str,
    brand_tagline: str,
    website_url: str = "",
    contact_address: str = "",
    contact_phone: str = "",
    output_dir: Path,
    content_index: int,
    openai_image_enabled: bool = False,
    openai_api_key: str = "",
    openai_api_base_url: str = "https://api.openai.com/v1",
    openai_image_model: str = "gpt-image-1",
    openai_image_prompt: str = "",
    openai_image_size: str = "1024x1024",
    openai_image_quality: str = "medium",
    openai_image_output_format: str = "png",
    openai_image_timeout_seconds: int = 180,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    palette = PALETTES[content_index % len(PALETTES)]
    seed = _stable_seed(post.headline, content_index)
    rng = random.Random(seed)

    if openai_image_enabled:
        image = _generate_openai_background(
            post,
            brand_name=brand_name,
            brand_tagline=brand_tagline,
            api_key=openai_api_key,
            api_base_url=openai_api_base_url,
            model=openai_image_model,
            prompt_template=openai_image_prompt,
            size=openai_image_size,
            quality=openai_image_quality,
            output_format=openai_image_output_format,
            timeout_seconds=openai_image_timeout_seconds,
        )
        _draw_openai_text_panel(image, palette)
    else:
        image = Image.new("RGB", CANVAS_SIZE, palette["background"])
        draw = ImageDraw.Draw(image)
        _draw_background(draw, palette, rng)

    draw = ImageDraw.Draw(image)
    if openai_image_enabled:
        _draw_brand_on_dark_panel(draw, brand_name, brand_tagline)
        _draw_main_copy_on_dark_panel(draw, post)
    else:
        _draw_brand(draw, brand_name, brand_tagline, palette)
        _draw_main_copy(draw, post, palette)

    _draw_contact_footer(
        image,
        website_url=website_url,
        contact_address=contact_address,
        contact_phone=contact_phone,
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    slug = _slugify(post.headline)[:42] or "banner"
    filename = f"{timestamp}_{content_index:02d}_{slug}.jpg"
    output_path = output_dir / filename
    image.save(output_path, "JPEG", quality=92, optimize=True, progressive=True)
    return output_path


class OpenAIBackgroundError(RuntimeError):
    """Raised when OpenAI cannot produce a background for the banner."""


def _generate_openai_background(
    post: PostSpec,
    *,
    brand_name: str,
    brand_tagline: str,
    api_key: str,
    api_base_url: str,
    model: str,
    prompt_template: str,
    size: str,
    quality: str,
    output_format: str,
    timeout_seconds: int,
) -> Image.Image:
    if not api_key:
        raise OpenAIBackgroundError("OPENAI_API_KEY is required")
    if not model:
        raise OpenAIBackgroundError("OPENAI_IMAGE_MODEL is required")

    prompt = _build_openai_background_prompt(
        post,
        brand_name=brand_name,
        brand_tagline=brand_tagline,
        prompt_template=prompt_template,
    )
    payload = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "quality": quality,
        "output_format": output_format,
        "n": 1,
    }

    try:
        response = requests.post(
            f"{api_base_url.rstrip('/')}/images/generations",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=timeout_seconds,
        )
    except requests.exceptions.RequestException as exc:
        raise OpenAIBackgroundError(f"OpenAI image API request failed: {exc}") from exc

    try:
        data = response.json()
    except ValueError as exc:
        raise OpenAIBackgroundError(
            f"OpenAI returned non-JSON response {response.status_code}: "
            f"{response.text[:300]}"
        ) from exc

    if response.status_code >= 400 or "error" in data:
        raise OpenAIBackgroundError(f"OpenAI image API error {response.status_code}: {data}")

    image_bytes = _extract_openai_image_bytes(data)
    with Image.open(BytesIO(image_bytes)) as image:
        image = image.convert("RGB")
        return ImageOps.fit(
            image,
            CANVAS_SIZE,
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )


def _build_openai_background_prompt(
    post: PostSpec,
    *,
    brand_name: str,
    brand_tagline: str,
    prompt_template: str,
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
        "variation_seed": variation_seed,
        "date": datetime.now().strftime("%Y-%m-%d"),
    }
    if prompt_template:
        try:
            return prompt_template.format(**values)
        except KeyError as exc:
            raise OpenAIBackgroundError(
                f"OPENAI_IMAGE_PROMPT has unknown placeholder: {exc}"
            ) from exc

    return (
        "Create a square 1:1 realistic premium Instagram banner background for a "
        "doctor-guided herbal wellness clinic. Composition: the right side shows a "
        f"realistic, premium medical-wellness visual directly related to: {post.headline}. "
        "Use disease-relevant but non-graphic imagery such as liver or kidney wellness "
        "concepts, herbal treatment elements, anatomical silhouettes, diagnostic-care "
        "motifs, medicinal herbs, soft clinical props, or symbolic healing visuals. "
        "The image must feel professional, trustworthy, and clinic-appropriate. "
        "Do not show disturbing symptoms, blood, surgery, organs in a graphic way, "
        "or frightening medical scenes. Keep the overall background "
        "subtle white or very pale clinical blue with soft daylight, minimal texture, "
        "and only faint herbal hints if needed; avoid green-heavy or busy scenery. "
        "The left side must stay simple, subtle, and uncluttered with soft depth for "
        "a dark text overlay; make the text area more visually important than the "
        "image area. Background should feel clean, premium, calming, and "
        "medical-wellness oriented. Do not include any text, "
        "letters, numbers, formulas, readable symbols, logos, watermarks, QR codes, "
        "contact details, URLs, or signage. Generate only the no-text photographic "
        "background. "
        f"Variation seed: {variation_seed}."
    )

def _extract_openai_image_bytes(data: dict[str, Any]) -> bytes:
    items = data.get("data")
    if not isinstance(items, list) or not items:
        raise OpenAIBackgroundError(f"OpenAI response did not include image data: {data}")

    encoded = items[0].get("b64_json") if isinstance(items[0], dict) else None
    if not encoded:
        raise OpenAIBackgroundError(
            f"OpenAI response did not include b64_json image data: {data}"
        )
    return base64.b64decode(encoded)


def _draw_openai_text_panel(image: Image.Image, palette: dict[str, str]) -> None:
    base = image.convert("RGBA")
    overlay = Image.new("RGBA", CANVAS_SIZE, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)

    draw.rectangle((0, 0, CANVAS_SIZE[0], CANVAS_SIZE[1]), fill=(247, 251, 255, 18))
    panel = OPENAI_TEXT_PANEL
    draw.rounded_rectangle(
        panel,
        radius=46,
        fill=(5, 10, 20, 179),
        outline=(255, 255, 255, 48),
        width=2,
    )
    draw.rounded_rectangle(
        (panel[0] + 2, panel[1] + 2, panel[2] - 2, panel[3] - 2),
        radius=44,
        outline=(255, 255, 255, 24),
        width=1,
    )
    draw.rounded_rectangle(
        (106, 214, 244, 220),
        radius=3,
        fill=(249, 115, 22, 220),
    )
    draw.rounded_rectangle(
        (106, 790, 576, 792),
        radius=1,
        fill=(255, 255, 255, 42),
    )
    composed = Image.alpha_composite(base, overlay).convert("RGB")
    image.paste(composed)


def _draw_background(draw: ImageDraw.ImageDraw, palette: dict[str, str], rng: random.Random) -> None:
    width, height = CANVAS_SIZE
    draw.rectangle((0, 0, width, height), fill=palette["background"])
    draw.ellipse((-160, -120, 320, 340), fill=palette["soft"])
    draw.ellipse((820, 760, 1220, 1160), fill=palette["soft"])

    for _ in range(10):
        x = rng.randint(60, width - 80)
        y = rng.randint(80, height - 100)
        size = rng.randint(10, 28)
        draw.rounded_rectangle(
            (x, y, x + size, y + size),
            radius=6,
            fill=palette["soft"],
        )

    draw.rounded_rectangle((74, 116, 1006, 980), radius=44, fill=palette["panel"])
    draw.rectangle((74, 116, 1006, 172), fill=palette["accent"])
    draw.rounded_rectangle((74, 116, 1006, 980), radius=44, outline="#d9e2ec", width=3)
    draw.line((126, 822, 954, 822), fill="#e5e7eb", width=3)


def _draw_brand(
    draw: ImageDraw.ImageDraw,
    brand_name: str,
    brand_tagline: str,
    palette: dict[str, str],
) -> None:
    brand_font = _font(40, bold=True)
    tagline_font = _font(24)
    draw.text((124, 200), brand_name, font=brand_font, fill=palette["primary"])
    draw.text((126, 252), brand_tagline, font=tagline_font, fill=palette["secondary"])
    draw.rounded_rectangle((800, 198, 952, 246), radius=24, fill=palette["soft"])
    draw.text((830, 207), "DAILY", font=_font(24, bold=True), fill=palette["accent_dark"])


def _draw_brand_on_dark_panel(
    draw: ImageDraw.ImageDraw,
    brand_name: str,
    brand_tagline: str,
) -> None:
    eyebrow_font = _font(22, bold=True)
    tagline_font = _font(24)
    draw.text((108, 242), brand_name.upper(), font=eyebrow_font, fill="#f8fafc")
    draw.text((108, 278), brand_tagline, font=tagline_font, fill="#cbd5e1")


def _draw_main_copy(
    draw: ImageDraw.ImageDraw,
    post: PostSpec,
    palette: dict[str, str],
) -> None:
    headline_font, headline_lines = _fit_text(
        draw,
        post.headline,
        max_width=804,
        max_lines=4,
        start_size=90,
        min_size=58,
        bold=True,
    )
    y = 352
    for line in headline_lines:
        draw.text((126, y), line, font=headline_font, fill=palette["primary"])
        y += _line_height(headline_font, 1.08)

    if post.subheadline:
        y += 22
        sub_font, sub_lines = _fit_text(
            draw,
            post.subheadline,
            max_width=804,
            max_lines=3,
            start_size=38,
            min_size=30,
            bold=False,
        )
        for line in sub_lines:
            draw.text((128, y), line, font=sub_font, fill=palette["secondary"])
            y += _line_height(sub_font, 1.22)

    cta = post.cta or "Learn more"
    cta_font = _font(34, bold=True)
    cta_text_width = _text_width(draw, cta, cta_font)
    cta_width = min(804, max(390, cta_text_width + 84))
    cta_box = (126, 866, 126 + cta_width, 930)
    draw.rounded_rectangle(cta_box, radius=32, fill=palette["accent"])
    draw.text((cta_box[0] + 42, 878), cta, font=cta_font, fill="#ffffff")


def _draw_main_copy_on_dark_panel(
    draw: ImageDraw.ImageDraw,
    post: PostSpec,
) -> None:
    headline_font, headline_lines = _fit_text(
        draw,
        post.headline,
        max_width=430,
        max_lines=3,
        start_size=64,
        min_size=46,
        bold=True,
    )
    y = 370
    for line in headline_lines:
        draw.text((108, y), line, font=headline_font, fill="#ffffff")
        y += _line_height(headline_font, 1.06)

    if post.subheadline:
        y += 26
        sub_font, sub_lines = _fit_text(
            draw,
            post.subheadline,
            max_width=430,
            max_lines=4,
            start_size=28,
            min_size=23,
            bold=False,
        )
        for line in sub_lines:
            draw.text((110, y), line, font=sub_font, fill="#dbe4ef")
            y += _line_height(sub_font, 1.25)

    _draw_dark_panel_feature_row(draw)

    cta = post.cta or "Learn more"
    cta_font = _font(28, bold=True)
    cta_text_width = _text_width(draw, cta, cta_font)
    cta_width = min(430, max(286, cta_text_width + 68))
    cta_box = (108, 826, 108 + cta_width, 884)
    draw.rounded_rectangle(cta_box, radius=30, fill="#f97316")
    draw.text((cta_box[0] + 34, 840), cta, font=cta_font, fill="#ffffff")


def _draw_contact_footer(
    image: Image.Image,
    *,
    website_url: str,
    contact_address: str,
    contact_phone: str,
) -> None:
    base = image.convert("RGBA")
    overlay = Image.new("RGBA", CANVAS_SIZE, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)

    footer_box = (0, FOOTER_TOP, CANVAS_SIZE[0], CANVAS_SIZE[1])
    draw.rectangle(footer_box, fill=(0, 0, 0, 179))
    draw.line((0, FOOTER_TOP, CANVAS_SIZE[0], FOOTER_TOP), fill=(255, 255, 255, 42), width=2)

    max_width = CANVAS_SIZE[0] - 96
    title = website_url or "YEHP Herbal Wellness"
    title_parts = [title]
    if contact_phone:
        title_parts.append(f"Phone: {contact_phone}")
    title_text = " | ".join(title_parts)

    title_font, title_lines = _fit_text(
        draw,
        title_text,
        max_width=max_width,
        max_lines=1,
        start_size=23,
        min_size=16,
        bold=True,
    )
    address_font, address_lines = _fit_text(
        draw,
        contact_address,
        max_width=max_width,
        max_lines=2,
        start_size=22,
        min_size=15,
        bold=False,
    )

    title_line_height = _line_height(title_font, 1.15)
    address_line_height = _line_height(address_font, 1.16)
    gap = 8 if contact_address else 0
    total_height = (
        len(title_lines) * title_line_height
        + gap
        + len(address_lines) * address_line_height
    )
    y = FOOTER_TOP + max(14, ((CANVAS_SIZE[1] - FOOTER_TOP) - total_height) // 2)

    for line in title_lines:
        _draw_centered_text(draw, line, title_font, y, fill="#f8fafc", max_width=max_width)
        y += title_line_height

    if contact_address:
        y += gap
        for line in address_lines:
            _draw_centered_text(draw, line, address_font, y, fill="#dbe4ef", max_width=max_width)
            y += address_line_height

    composed = Image.alpha_composite(base, overlay).convert("RGB")
    image.paste(composed)


def _draw_dark_panel_feature_row(draw: ImageDraw.ImageDraw) -> None:
    font = _font(20, bold=True)
    items = ["Doctor Guided", "Herbal Care", "Consult First"]
    x = 108
    for item in items:
        text_width = _text_width(draw, item, font)
        pill = (x, 748, x + text_width + 30, 790)
        draw.rounded_rectangle(
            pill,
            radius=22,
            fill="#111827",
            outline="#334155",
            width=1,
        )
        draw.text((x + 15, 758), item, font=font, fill="#e5e7eb")
        x = pill[2] + 10


def _draw_centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    y: int,
    *,
    fill: str,
    max_width: int,
) -> None:
    text_width = _text_width(draw, text, font)
    x = (CANVAS_SIZE[0] - text_width) // 2
    draw.text((x, y), text, font=font, fill=fill)


def _fit_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    *,
    max_width: int,
    max_lines: int,
    start_size: int,
    min_size: int,
    bold: bool,
) -> tuple[ImageFont.ImageFont, list[str]]:
    for size in range(start_size, min_size - 1, -2):
        font = _font(size, bold=bold)
        lines = _wrap_text(draw, text, font, max_width=max_width)
        if len(lines) <= max_lines:
            return font, lines

    font = _font(min_size, bold=bold)
    lines = _wrap_text(draw, text, font, max_width=max_width)
    return font, _clamp_lines(draw, lines, font, max_width, max_lines)


def _wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    *,
    max_width: int,
) -> list[str]:
    words = text.split()
    if not words:
        return []

    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if _text_width(draw, candidate, font) <= max_width:
            current = candidate
            continue

        if current:
            lines.append(current)
        if _text_width(draw, word, font) <= max_width:
            current = word
        else:
            split_word = textwrap.wrap(word, width=12, break_long_words=True)
            lines.extend(split_word[:-1])
            current = split_word[-1] if split_word else ""

    if current:
        lines.append(current)
    return lines


def _clamp_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    font: ImageFont.ImageFont,
    max_width: int,
    max_lines: int,
) -> list[str]:
    if len(lines) <= max_lines:
        return lines
    visible = lines[:max_lines]
    last = visible[-1]
    while last and _text_width(draw, f"{last}...", font) > max_width:
        last = last[:-1].rstrip()
    visible[-1] = f"{last}..."
    return visible


def _font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    family = "bold" if bold else "regular"
    for path in FONT_CANDIDATES[family]:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default(size=size)


def _line_height(font: ImageFont.ImageFont, multiplier: float) -> int:
    bbox = font.getbbox("Ag")
    return int((bbox[3] - bbox[1]) * multiplier)


def _text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def _stable_seed(headline: str, content_index: int) -> int:
    digest = hashlib.sha256(f"{content_index}:{headline}".encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def _slugify(value: str) -> str:
    lowered = value.lower()
    chars = []
    for char in lowered:
        if char.isalnum():
            chars.append(char)
        elif chars and chars[-1] != "-":
            chars.append("-")
    return "".join(chars).strip("-")
