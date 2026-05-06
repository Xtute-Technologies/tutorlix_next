from __future__ import annotations

import argparse
import logging
from typing import Any

from generate_script import generate_script
from generate_voice import generate_voice
from post_instagram import post_instagram
from render_reel import render_reel
from run_liveportrait import run_liveportrait
from run_wav2lip import run_wav2lip
from utils import PipelineError, load_config, setup_logging


LOGGER = logging.getLogger("ai-devops-reel-factory.main")


def run_pipeline(
    config: dict[str, Any] | None = None,
    *,
    skip_post: bool = False,
    dry_run_post: bool = False,
) -> dict[str, Any]:
    config = config or load_config()
    LOGGER.info("Starting AI DevOps Reel Factory pipeline")

    metadata = generate_script(config)
    voice_path = generate_voice(config)
    liveportrait_path = run_liveportrait(config)
    synced_face_path = run_wav2lip(config)
    final_reel_path = render_reel(config, metadata)

    post_result: dict[str, Any] | None = None
    if config.get("auto_post_instagram", False) and not skip_post:
        post_result = post_instagram(config, metadata, dry_run=dry_run_post)
    else:
        LOGGER.info("Instagram auto-posting skipped")

    result = {
        "script": "outputs/script.txt",
        "voice": str(voice_path),
        "liveportrait": str(liveportrait_path),
        "synced_face": str(synced_face_path),
        "final_reel": str(final_reel_path),
        "instagram": post_result,
    }
    LOGGER.info("Pipeline completed. Final Reel: %s", final_reel_path)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the full AI DevOps Reel pipeline.")
    parser.add_argument("--config", default=None, help="Path to config.json")
    parser.add_argument("--skip-post", action="store_true", help="Render only; do not post to Instagram")
    parser.add_argument("--dry-run-post", action="store_true", help="Run posting step without calling Meta APIs")
    args = parser.parse_args()

    setup_logging()
    try:
        run_pipeline(load_config(args.config), skip_post=args.skip_post, dry_run_post=args.dry_run_post)
    except PipelineError:
        LOGGER.exception("Pipeline failed")
        raise


if __name__ == "__main__":
    main()
