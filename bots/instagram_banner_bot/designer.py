from __future__ import annotations

from datetime import datetime
import hashlib
from pathlib import Path
import random
import textwrap

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:  # pragma: no cover - exercised by runtime setup.
    raise RuntimeError(
        "Pillow is required. Install bot dependencies with: "
        "pip install -r bots/instagram_banner_bot/requirements.txt"
    ) from exc

from .content import PostSpec


CANVAS_SIZE = (1080, 1080)

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
        "background": "#f7fee7",
        "panel": "#ffffff",
        "primary": "#1f2933",
        "secondary": "#52606d",
        "accent": "#0f766e",
        "accent_dark": "#115e59",
        "soft": "#ccfbf1",
    },
    {
        "background": "#fff7ed",
        "panel": "#ffffff",
        "primary": "#1f2937",
        "secondary": "#4b5563",
        "accent": "#2563eb",
        "accent_dark": "#1d4ed8",
        "soft": "#dbeafe",
    },
    {
        "background": "#fdf2f8",
        "panel": "#ffffff",
        "primary": "#111827",
        "secondary": "#4b5563",
        "accent": "#7c3aed",
        "accent_dark": "#6d28d9",
        "soft": "#ede9fe",
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
    output_dir: Path,
    content_index: int,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    palette = PALETTES[content_index % len(PALETTES)]
    seed = _stable_seed(post.headline, content_index)
    rng = random.Random(seed)

    image = Image.new("RGB", CANVAS_SIZE, palette["background"])
    draw = ImageDraw.Draw(image)

    _draw_background(draw, palette, rng)
    _draw_brand(draw, brand_name, brand_tagline, palette)
    _draw_main_copy(draw, post, palette)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    slug = _slugify(post.headline)[:42] or "banner"
    filename = f"{timestamp}_{content_index:02d}_{slug}.jpg"
    output_path = output_dir / filename
    image.save(output_path, "JPEG", quality=92, optimize=True, progressive=True)
    return output_path


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
