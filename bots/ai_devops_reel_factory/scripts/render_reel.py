from __future__ import annotations

import argparse
import logging
import random
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from utils import (
    PROJECT_ROOT,
    PipelineError,
    choose_random_file,
    config_path,
    load_config,
    load_script_metadata,
    output_dir,
    read_text,
    setup_logging,
)


LOGGER = logging.getLogger("ai-devops-reel-factory.render_reel")
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}
VIDEO_SUFFIXES = {".mp4", ".mov", ".mkv", ".webm"}
AUDIO_SUFFIXES = {".mp3", ".wav", ".m4a", ".aac", ".flac"}


def _moviepy() -> SimpleNamespace:
    try:
        from moviepy import (
            AudioFileClip,
            ColorClip,
            CompositeAudioClip,
            CompositeVideoClip,
            ImageClip,
            VideoFileClip,
        )
    except ImportError:
        try:
            from moviepy.editor import (
                AudioFileClip,
                ColorClip,
                CompositeAudioClip,
                CompositeVideoClip,
                ImageClip,
                VideoFileClip,
            )
        except ImportError as exc:
            raise PipelineError(
                "MoviePy is not installed. Install dependencies with: "
                "pip install -r requirements.txt"
            ) from exc
    return SimpleNamespace(
        AudioFileClip=AudioFileClip,
        ColorClip=ColorClip,
        CompositeAudioClip=CompositeAudioClip,
        CompositeVideoClip=CompositeVideoClip,
        ImageClip=ImageClip,
        VideoFileClip=VideoFileClip,
    )


def _clip_method(clip: Any, modern: str, legacy: str) -> Any:
    method = getattr(clip, modern, None)
    if method is not None:
        return method
    method = getattr(clip, legacy, None)
    if method is None:
        raise PipelineError(f"MoviePy clip does not support {modern} or {legacy}")
    return method


def _with_duration(clip: Any, duration: float) -> Any:
    return _clip_method(clip, "with_duration", "set_duration")(duration)


def _with_start(clip: Any, start: float) -> Any:
    return _clip_method(clip, "with_start", "set_start")(start)


def _with_position(clip: Any, position: Any) -> Any:
    return _clip_method(clip, "with_position", "set_position")(position)


def _with_audio(clip: Any, audio: Any) -> Any:
    return _clip_method(clip, "with_audio", "set_audio")(audio)


def _with_opacity(clip: Any, opacity: float) -> Any:
    return _clip_method(clip, "with_opacity", "set_opacity")(opacity)


def _subclip(clip: Any, start: float, end: float) -> Any:
    method = getattr(clip, "subclipped", None)
    if method is not None:
        return method(start, end)
    return clip.subclip(start, end)


def _resize(clip: Any, *, width: int | None = None, height: int | None = None, factor: float | None = None) -> Any:
    method = getattr(clip, "resized", None) or getattr(clip, "resize", None)
    if method is None:
        raise PipelineError("MoviePy clip does not support resize")
    if factor is not None:
        return method(factor)
    if width is not None:
        return method(width=width)
    if height is not None:
        return method(height=height)
    return clip


def _crop(clip: Any, *, x1: float, y1: float, width: int, height: int) -> Any:
    method = getattr(clip, "cropped", None) or getattr(clip, "crop", None)
    if method is None:
        raise PipelineError("MoviePy clip does not support crop")
    return method(x1=x1, y1=y1, width=width, height=height)


def _volume(audio: Any, factor: float) -> Any:
    method = getattr(audio, "with_volume_scaled", None)
    if method is not None:
        return method(factor)
    method = getattr(audio, "volumex", None)
    if method is not None:
        return method(factor)
    return audio


def _fit_to_canvas(clip: Any, width: int, height: int) -> Any:
    if clip.w / clip.h < width / height:
        clip = _resize(clip, width=width)
    else:
        clip = _resize(clip, height=height)
    x1 = max(0, (clip.w - width) / 2)
    y1 = max(0, (clip.h - height) / 2)
    return _crop(clip, x1=x1, y1=y1, width=width, height=height)


def _load_font(size: int, *, bold: bool = False, mono: bool = False, font_path: str | None = None) -> Any:
    from PIL import ImageFont

    candidates: list[str] = []
    if font_path:
        candidates.append(font_path)
    if mono:
        candidates.extend(
            [
                "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
                "/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf",
            ]
        )
    elif bold:
        candidates.extend(
            [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf",
                "/usr/share/fonts/opentype/noto/NotoSansDevanagari-Bold.ttf",
            ]
        )
    else:
        candidates.extend(
            [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
                "/usr/share/fonts/opentype/noto/NotoSansDevanagari-Regular.ttf",
            ]
        )

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def _text_size(draw: Any, text: str, font: Any) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _wrap_text(draw: Any, text: str, font: Any, max_width: int, *, preserve_lines: bool = False) -> list[str]:
    wrapped: list[str] = []
    paragraphs = text.splitlines() or [text]
    for paragraph in paragraphs:
        if preserve_lines:
            if _text_size(draw, paragraph, font)[0] <= max_width:
                wrapped.append(paragraph)
                continue
            current = ""
            for character in paragraph:
                if _text_size(draw, current + character, font)[0] <= max_width:
                    current += character
                else:
                    if current:
                        wrapped.append(current)
                    current = character
            if current:
                wrapped.append(current)
            continue

        words = paragraph.split()
        if not words:
            wrapped.append("")
            continue
        line = words[0]
        for word in words[1:]:
            candidate = f"{line} {word}"
            if _text_size(draw, candidate, font)[0] <= max_width:
                line = candidate
            else:
                wrapped.append(line)
                line = word
        wrapped.append(line)
    return wrapped


def _text_image(
    text: str,
    *,
    width: int,
    font_size: int,
    color: tuple[int, int, int] = (255, 255, 255),
    bg_color: tuple[int, int, int] = (9, 16, 28),
    border_color: tuple[int, int, int] | None = None,
    padding: int = 28,
    align: str = "center",
    bold: bool = False,
    mono: bool = False,
    max_height: int | None = None,
    font_path: str | None = None,
    preserve_lines: bool = False,
) -> Any:
    from PIL import Image, ImageDraw

    if not text.strip():
        text = " "

    selected_size = max(16, font_size)
    for candidate_size in range(selected_size, 15, -2):
        font = _load_font(candidate_size, bold=bold, mono=mono, font_path=font_path)
        scratch = Image.new("RGB", (width, 10), bg_color)
        draw = ImageDraw.Draw(scratch)
        lines = _wrap_text(draw, text, font, width - padding * 2, preserve_lines=preserve_lines)
        line_height = max(_text_size(draw, "Ag", font)[1] + 12, candidate_size + 12)
        height = padding * 2 + max(1, len(lines)) * line_height
        if max_height is None or height <= max_height:
            selected_size = candidate_size
            break

    font = _load_font(selected_size, bold=bold, mono=mono, font_path=font_path)
    scratch = Image.new("RGB", (width, 10), bg_color)
    draw = ImageDraw.Draw(scratch)
    lines = _wrap_text(draw, text, font, width - padding * 2, preserve_lines=preserve_lines)
    line_height = max(_text_size(draw, "Ag", font)[1] + 12, selected_size + 12)
    height = padding * 2 + max(1, len(lines)) * line_height
    if max_height is not None:
        height = min(height, max_height)

    image = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(image)
    if border_color is not None:
        draw.rectangle((0, 0, width - 1, height - 1), outline=border_color, width=3)

    y = padding
    for line in lines:
        line_width, _ = _text_size(draw, line, font)
        if align == "left":
            x = padding
        elif align == "right":
            x = width - padding - line_width
        else:
            x = (width - line_width) / 2
        if y + line_height > height - padding + line_height:
            break
        draw.text((x, y), line, font=font, fill=color)
        y += line_height
    return image


def _image_clip(mp: SimpleNamespace, image: Any, *, duration: float, position: Any, start: float = 0) -> Any:
    import numpy as np

    clip = mp.ImageClip(np.array(image))
    clip = _with_duration(clip, duration)
    clip = _with_start(clip, start)
    return _with_position(clip, position)


def _grid_background_image(width: int, height: int) -> Any:
    from PIL import Image, ImageDraw

    image = Image.new("RGB", (width, height), (5, 12, 24))
    draw = ImageDraw.Draw(image)
    for x in range(0, width, 90):
        draw.line((x, 0, x, height), fill=(12, 28, 48), width=1)
    for y in range(0, height, 90):
        draw.line((0, y, width, y), fill=(12, 28, 48), width=1)
    for x in range(45, width, 180):
        for y in range(45, height, 180):
            draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(44, 116, 147))
    return image


def _background_clip(mp: SimpleNamespace, *, width: int, height: int, duration: float) -> Any:
    backgrounds_dir = PROJECT_ROOT / "assets" / "backgrounds"
    candidates = [
        path
        for path in backgrounds_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES.union(VIDEO_SUFFIXES)
    ] if backgrounds_dir.exists() else []

    if candidates:
        selected = random.choice(candidates)
        LOGGER.info("Using background asset: %s", selected)
        if selected.suffix.lower() in VIDEO_SUFFIXES:
            clip = mp.VideoFileClip(str(selected))
            if clip.duration and clip.duration > duration:
                clip = _subclip(clip, 0, duration)
            clip = _fit_to_canvas(clip, width, height)
            return _with_duration(clip, duration)
        clip = mp.ImageClip(str(selected))
        clip = _fit_to_canvas(clip, width, height)
        return _with_duration(clip, duration)

    return _image_clip(
        mp,
        _grid_background_image(width, height),
        duration=duration,
        position=(0, 0),
    )


def _diagram_image(items: list[Any], *, width: int) -> Any:
    from PIL import Image, ImageDraw

    labels = [str(item).strip() for item in items if str(item).strip()]
    labels = labels[:4] or ["Idea", "Build", "Deploy", "Monitor"]
    height = 230
    image = Image.new("RGB", (width, height), (8, 18, 32))
    draw = ImageDraw.Draw(image)
    font = _load_font(34, bold=True)
    small_font = _load_font(26)
    draw.rectangle((0, 0, width - 1, height - 1), outline=(52, 125, 151), width=3)
    draw.text((36, 22), "Cloud flow", font=small_font, fill=(136, 205, 222))

    gap = 28
    box_width = int((width - 72 - gap * (len(labels) - 1)) / len(labels))
    y1 = 92
    y2 = 176
    for index, label in enumerate(labels):
        x1 = 36 + index * (box_width + gap)
        x2 = x1 + box_width
        fill = [(25, 74, 94), (22, 96, 84), (87, 72, 32), (80, 54, 99)][index % 4]
        draw.rounded_rectangle((x1, y1, x2, y2), radius=14, fill=fill, outline=(150, 220, 232), width=2)
        text_width, text_height = _text_size(draw, label, font)
        if text_width > box_width - 24:
            label_font = _load_font(26, bold=True)
            text_width, text_height = _text_size(draw, label, label_font)
        else:
            label_font = font
        draw.text((x1 + (box_width - text_width) / 2, y1 + (y2 - y1 - text_height) / 2), label, font=label_font, fill=(255, 255, 255))
        if index < len(labels) - 1:
            arrow_x1 = x2 + 8
            arrow_x2 = x2 + gap - 8
            arrow_y = (y1 + y2) // 2
            draw.line((arrow_x1, arrow_y, arrow_x2, arrow_y), fill=(136, 205, 222), width=4)
            draw.polygon(
                [(arrow_x2, arrow_y), (arrow_x2 - 12, arrow_y - 8), (arrow_x2 - 12, arrow_y + 8)],
                fill=(136, 205, 222),
            )
    return image


def _optional_logo_clip(mp: SimpleNamespace, config: dict[str, Any], *, duration: float, width: int) -> Any | None:
    logo_path = PROJECT_ROOT / "assets" / "logo.png"
    if not logo_path.exists():
        return None
    clip = mp.ImageClip(str(logo_path))
    clip = _resize(clip, width=min(180, max(120, width // 6)))
    clip = _with_duration(clip, duration)
    return _with_position(clip, (width - clip.w - 42, 38))


def _face_clip(mp: SimpleNamespace, config: dict[str, Any], *, duration: float, width: int, height: int) -> Any:
    synced_face = output_dir(config) / "synced_face.mp4"
    if not synced_face.exists():
        raise PipelineError(f"Synced face video missing: {synced_face}")
    clip = mp.VideoFileClip(str(synced_face))
    if clip.duration and clip.duration > duration:
        clip = _subclip(clip, 0, duration)
    target_width = int(width * 0.34)
    clip = _resize(clip, width=target_width)
    if clip.h > int(height * 0.38):
        clip = _resize(clip, height=int(height * 0.38))
    clip = _with_duration(clip, duration)

    margin = 42
    subtitle_space = 210
    position_name = str(config.get("face_position", "bottom_right"))
    if position_name == "bottom_left":
        position = (margin, height - clip.h - subtitle_space)
    elif position_name == "bottom_center":
        position = ((width - clip.w) / 2, height - clip.h - subtitle_space)
    else:
        position = (width - clip.w - margin, height - clip.h - subtitle_space)
    return _with_position(clip, position)


def _subtitle_clips(
    mp: SimpleNamespace,
    config: dict[str, Any],
    metadata: dict[str, Any],
    *,
    duration: float,
    width: int,
    height: int,
) -> list[Any]:
    concept = metadata.get("concept") if isinstance(metadata.get("concept"), dict) else {}
    subtitles = concept.get("subtitles") if isinstance(concept, dict) else None
    if not isinstance(subtitles, list) or not subtitles:
        script = metadata.get("script") or read_text(output_dir(config) / "script.txt")
        subtitles = [line.strip() for line in str(script).splitlines() if line.strip()]
    subtitles = [str(item).strip() for item in subtitles if str(item).strip()]
    if not subtitles:
        return []

    clips: list[Any] = []
    slot = duration / len(subtitles)
    font_size = int(config.get("subtitle_font_size", 60))
    for index, subtitle in enumerate(subtitles):
        start = index * slot
        clip_duration = min(slot + 0.25, duration - start)
        image = _text_image(
            subtitle,
            width=int(width * 0.86),
            font_size=font_size,
            bg_color=(0, 0, 0),
            color=(255, 255, 255),
            padding=26,
            bold=True,
            max_height=190,
            font_path=config.get("font_path"),
        )
        clips.append(
            _image_clip(
                mp,
                image,
                duration=clip_duration,
                start=start,
                position=("center", height - image.height - 58),
            )
        )
    return clips


def _music_audio(mp: SimpleNamespace, *, duration: float) -> Any | None:
    music_dir = PROJECT_ROOT / "assets" / "music"
    if not music_dir.exists():
        return None
    candidates = [
        path
        for path in music_dir.iterdir()
        if path.is_file() and path.suffix.lower() in AUDIO_SUFFIXES
    ]
    if not candidates:
        return None
    selected = random.choice(candidates)
    LOGGER.info("Using background music: %s", selected)
    audio = mp.AudioFileClip(str(selected))
    if audio.duration and audio.duration > duration:
        audio = _subclip(audio, 0, duration)
    return _volume(audio, 0.10)


def render_reel(config: dict[str, Any] | None = None, metadata: dict[str, Any] | None = None) -> Path:
    config = config or load_config()
    metadata = metadata or load_script_metadata(config)
    outputs = output_dir(config)
    script_path = outputs / "script.txt"
    if not script_path.exists():
        raise PipelineError(f"Script missing: {script_path}")

    mp = _moviepy()
    width = int(config.get("reel_width", 1080))
    height = int(config.get("reel_height", 1920))
    fps = int(config.get("fps", 30))
    max_duration = float(config.get("max_reel_seconds", 60))

    face_source = outputs / "synced_face.mp4"
    if not face_source.exists():
        raise PipelineError(f"Synced face video missing: {face_source}")
    probe = mp.VideoFileClip(str(face_source))
    duration = float(probe.duration or 30)
    duration = min(duration, max_duration)
    probe.close()
    duration = max(5.0, duration)

    clips: list[Any] = []
    background = _background_clip(mp, width=width, height=height, duration=duration)
    clips.append(background)

    concept = metadata.get("concept") if isinstance(metadata.get("concept"), dict) else {}
    hook = str(metadata.get("hook") or "DevOps concept in 60 seconds").strip()
    title = str(concept.get("title") or concept.get("topic") or "DevOps concept").strip()
    code_visual = str(concept.get("code_visual") or "").strip()
    diagram = concept.get("diagram") if isinstance(concept, dict) else []

    hook_image = _text_image(
        hook,
        width=int(width * 0.90),
        font_size=58,
        bg_color=(8, 24, 42),
        border_color=(51, 143, 171),
        padding=30,
        bold=True,
        max_height=240,
        font_path=config.get("font_path"),
    )
    clips.append(_image_clip(mp, hook_image, duration=duration, position=("center", 74)))

    title_image = _text_image(
        title,
        width=int(width * 0.78),
        font_size=38,
        bg_color=(16, 45, 57),
        color=(198, 237, 244),
        padding=18,
        bold=True,
        max_height=112,
        font_path=config.get("font_path"),
    )
    clips.append(_image_clip(mp, title_image, duration=duration, position=("center", 318)))

    if code_visual:
        code_image = _text_image(
            code_visual,
            width=int(width * 0.84),
            font_size=38,
            bg_color=(8, 15, 24),
            border_color=(77, 182, 172),
            color=(157, 255, 204),
            padding=34,
            align="left",
            mono=True,
            preserve_lines=True,
            max_height=390,
        )
        clips.append(_image_clip(mp, code_image, duration=duration, position=("center", 545)))

    diagram_image = _diagram_image(diagram if isinstance(diagram, list) else [], width=int(width * 0.84))
    diagram_y = 965 if code_visual else 620
    clips.append(_image_clip(mp, diagram_image, duration=duration, position=("center", diagram_y)))

    face = _face_clip(mp, config, duration=duration, width=width, height=height)
    clips.append(face)

    logo = _optional_logo_clip(mp, config, duration=duration, width=width)
    if logo is not None:
        clips.append(logo)

    clips.extend(_subtitle_clips(mp, config, metadata, duration=duration, width=width, height=height))

    final = mp.CompositeVideoClip(clips, size=(width, height))
    primary_audio = getattr(face, "audio", None)
    voice_path = outputs / "voice.wav"
    if primary_audio is None and voice_path.exists():
        primary_audio = mp.AudioFileClip(str(voice_path))
    audio_tracks = []
    if primary_audio is not None:
        if getattr(primary_audio, "duration", None) and primary_audio.duration > duration:
            primary_audio = _subclip(primary_audio, 0, duration)
        audio_tracks.append(primary_audio)
    music = _music_audio(mp, duration=duration)
    if music is not None:
        audio_tracks.append(music)
    if audio_tracks:
        audio = audio_tracks[0] if len(audio_tracks) == 1 else mp.CompositeAudioClip(audio_tracks)
        final = _with_audio(final, audio)

    final_path = outputs / "final_reel.mp4"
    LOGGER.info("Rendering final Reel to %s", final_path)
    final.write_videofile(
        str(final_path),
        fps=fps,
        codec="libx264",
        audio_codec="aac",
        preset="medium",
        threads=2,
        ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    )

    for clip in clips + [final]:
        close = getattr(clip, "close", None)
        if close:
            close()

    if not final_path.exists() or final_path.stat().st_size == 0:
        raise PipelineError(f"MoviePy did not create a valid final Reel: {final_path}")
    return final_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Render the final vertical DevOps Reel.")
    parser.add_argument("--config", default=None, help="Path to config.json")
    args = parser.parse_args()

    setup_logging()
    path = render_reel(load_config(args.config))
    print(path)


if __name__ == "__main__":
    main()
