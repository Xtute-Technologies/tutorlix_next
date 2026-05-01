from __future__ import annotations

from datetime import datetime
from pathlib import Path
import shutil
import subprocess


class ReelVideoError(RuntimeError):
    """Raised when the banner image cannot be converted into a Reel video."""


def render_reel_video(
    image_path: Path,
    *,
    output_dir: Path,
    duration_seconds: int,
    audio_path: Path | None = None,
) -> Path:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise ReelVideoError("ffmpeg is required to create Instagram Reels")

    if audio_path and not audio_path.exists():
        raise ReelVideoError(f"Reel audio file does not exist: {audio_path}")

    duration_seconds = max(3, min(int(duration_seconds or 8), 90))
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    video_path = output_dir / f"{image_path.stem}_{timestamp}_reel.mp4"

    filter_graph = (
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"
        "crop=1080:1920,boxblur=28:2,eq=brightness=-0.08:saturation=0.85[bg];"
        "[0:v]scale=980:980:force_original_aspect_ratio=decrease,"
        "pad=980:980:(ow-iw)/2:(oh-ih)/2:color=white[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]"
    )

    command = [
        ffmpeg,
        "-y",
        "-loop",
        "1",
        "-i",
        str(image_path),
    ]
    if audio_path:
        command.extend(
            [
                "-stream_loop",
                "-1",
                "-i",
                str(audio_path),
            ]
        )

    command.extend(
        [
            "-t",
            str(duration_seconds),
            "-r",
            "30",
            "-filter_complex",
            filter_graph,
            "-map",
            "[v]",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-profile:v",
            "high",
            "-level",
            "4.0",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
        ]
    )
    if audio_path:
        command.extend(
            [
                "-map",
                "1:a:0",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-shortest",
            ]
        )
    else:
        command.append("-an")

    command.append(str(video_path))

    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "").strip()
        raise ReelVideoError(f"ffmpeg failed to create Reel video: {detail[-800:]}")

    return video_path
