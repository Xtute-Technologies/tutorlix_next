from __future__ import annotations

import argparse
import logging
from pathlib import Path

from utils import (
    PipelineError,
    config_path,
    load_config,
    output_dir,
    python_executable,
    run_command,
    setup_logging,
)


LOGGER = logging.getLogger("ai-devops-reel-factory.wav2lip")


def _checkpoint_path(config: dict, wav2lip_dir: Path) -> Path:
    configured = config.get("wav2lip_checkpoint") or config.get("wav2lip_checkpoint_path")
    candidates: list[Path] = []
    if configured:
        candidates.append(Path(str(configured)).expanduser())
    candidates.extend(
        [
            wav2lip_dir / "wav2lip_gan.pth",
            wav2lip_dir / "checkpoints" / "wav2lip_gan.pth",
            wav2lip_dir / "checkpoints" / "wav2lip.pth",
        ]
    )
    resolved = []
    for candidate in candidates:
        path = candidate if candidate.is_absolute() else wav2lip_dir / candidate
        resolved.append(path)
        if path.exists():
            return path
    raise PipelineError(
        "Wav2Lip checkpoint is missing. Expected one of: "
        + ", ".join(str(path) for path in resolved)
    )


def run_wav2lip(config: dict | None = None) -> Path:
    config = config or load_config()
    outputs = output_dir(config)
    liveportrait_video = outputs / "liveportrait.mp4"
    voice_audio = outputs / "voice.wav"
    if not liveportrait_video.exists():
        raise PipelineError(f"LivePortrait output missing: {liveportrait_video}")
    if not voice_audio.exists():
        raise PipelineError(f"Generated voice audio missing: {voice_audio}")

    wav2lip_dir = config_path(config, "wav2lip_dir", must_exist=True)
    wav2lip_python = str(config.get("wav2lip_python") or python_executable())
    inference_py = wav2lip_dir / "inference.py"
    if not inference_py.exists():
        raise PipelineError(f"Wav2Lip inference.py not found: {inference_py}")

    checkpoint = _checkpoint_path(config, wav2lip_dir)
    output_path = outputs / "synced_face.mp4"
    command = [
        wav2lip_python,
        "inference.py",
        "--checkpoint_path",
        str(checkpoint),
        "--face",
        str(liveportrait_video),
        "--audio",
        str(voice_audio),
        "--outfile",
        str(output_path),
    ]
    run_command(command, cwd=wav2lip_dir, logger=LOGGER)
    if not output_path.exists() or output_path.stat().st_size == 0:
        raise PipelineError(f"Wav2Lip did not create a valid output: {output_path}")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Lip sync LivePortrait video with Wav2Lip.")
    parser.add_argument("--config", default=None, help="Path to config.json")
    args = parser.parse_args()

    setup_logging()
    path = run_wav2lip(load_config(args.config))
    print(path)


if __name__ == "__main__":
    main()
