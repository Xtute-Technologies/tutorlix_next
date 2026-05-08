from __future__ import annotations

import argparse
import logging
import time
from pathlib import Path

from utils import (
    PROJECT_ROOT,
    PipelineError,
    choose_random_file,
    config_path,
    copy_to_output,
    find_newest_file,
    load_config,
    output_dir,
    python_executable,
    run_command,
    setup_logging,
)


LOGGER = logging.getLogger("ai-devops-reel-factory.liveportrait")


def _required_weight_paths(liveportrait_dir: Path) -> list[Path]:
    root = liveportrait_dir / "pretrained_weights"
    return [
        root / "liveportrait" / "base_models" / "appearance_feature_extractor.pth",
        root / "liveportrait" / "base_models" / "motion_extractor.pth",
        root / "liveportrait" / "base_models" / "spade_generator.pth",
        root / "liveportrait" / "base_models" / "warping_module.pth",
        root / "liveportrait" / "retargeting_models" / "stitching_retargeting_module.pth",
        root / "liveportrait" / "landmark.onnx",
        root / "insightface" / "models" / "buffalo_l" / "2d106det.onnx",
        root / "insightface" / "models" / "buffalo_l" / "det_10g.onnx",
    ]


def run_liveportrait(config: dict | None = None, driving_video: Path | None = None) -> Path:
    config = config or load_config()
    face_image = config_path(config, "face_image", must_exist=True)
    liveportrait_dir = config_path(config, "liveportrait_dir", must_exist=True)
    liveportrait_python = str(config.get("liveportrait_python") or python_executable())
    inference_py = liveportrait_dir / "inference.py"
    if not inference_py.exists():
        raise PipelineError(f"LivePortrait inference.py not found: {inference_py}")
    missing_weights = [path for path in _required_weight_paths(liveportrait_dir) if not path.exists()]
    if missing_weights:
        raise PipelineError(
            "LivePortrait pretrained weights are missing. Download them from Hugging Face "
            "KlingTeam/LivePortrait into /content/LivePortrait/pretrained_weights. Missing: "
            + ", ".join(str(path) for path in missing_weights)
        )

    driving_video = driving_video or choose_random_file(
        PROJECT_ROOT / "assets" / "driving_videos",
        {".mp4", ".mov", ".mkv", ".webm"},
    )
    LOGGER.info("Using LivePortrait driving video: %s", driving_video)

    started = time.time() - 2
    command = [
        liveportrait_python,
        "inference.py",
        "-s",
        str(face_image),
        "-d",
        str(driving_video),
    ]
    run_command(command, cwd=liveportrait_dir, logger=LOGGER)

    candidate = find_newest_file(
        [
            liveportrait_dir / "animations",
            liveportrait_dir / "output",
            liveportrait_dir / "outputs",
            liveportrait_dir,
        ],
        suffixes={".mp4"},
        modified_after=started,
    )
    if candidate is None:
        raise PipelineError(
            "LivePortrait finished but no new MP4 output was found. "
            "Check the LivePortrait repo output directory and inference logs."
        )

    destination = output_dir(config) / "liveportrait.mp4"
    LOGGER.info("Copying LivePortrait output %s to %s", candidate, destination)
    return copy_to_output(candidate, destination)


def main() -> None:
    parser = argparse.ArgumentParser(description="Animate face image with LivePortrait.")
    parser.add_argument("--config", default=None, help="Path to config.json")
    parser.add_argument("--driving-video", default=None, help="Optional driving video path")
    args = parser.parse_args()

    setup_logging()
    config = load_config(args.config)
    driving_video = Path(args.driving_video).expanduser() if args.driving_video else None
    path = run_liveportrait(config, driving_video=driving_video)
    print(path)


if __name__ == "__main__":
    main()
