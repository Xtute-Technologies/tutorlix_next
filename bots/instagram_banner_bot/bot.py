from __future__ import annotations

import argparse
from dataclasses import dataclass
import logging
from pathlib import Path
import signal
import sys
import time

from .branding import apply_logo_overlay
from .config import BotConfig, ConfigError
from .content import ContentStore
from .designer import render_banner
from .gemini import GeminiImageGenerator
from .instagram import InstagramPublisher


LOGGER = logging.getLogger("instagram-banner-bot")
STOP_REQUESTED = False


@dataclass(frozen=True)
class RunResult:
    image_path: Path
    image_url: str
    caption: str
    media_id: str | None


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    _configure_logging(args.verbose)
    _install_signal_handlers()

    try:
        config = _config_from_args(args)
        if args.loop:
            run_loop(config)
        else:
            run_once(config)
        return 0
    except (ConfigError, ValueError, RuntimeError) as exc:
        LOGGER.error("%s", exc)
        return 1
    except KeyboardInterrupt:
        LOGGER.info("Stopped")
        return 130


def run_loop(config: BotConfig) -> None:
    LOGGER.info(
        "Starting Instagram banner bot; interval=%ss dry_run=%s",
        config.interval_seconds,
        config.dry_run,
    )
    while not STOP_REQUESTED:
        started_at = time.monotonic()
        try:
            run_once(config)
        except Exception:
            LOGGER.exception("Bot run failed")

        elapsed = time.monotonic() - started_at
        sleep_seconds = max(0, config.interval_seconds - elapsed)
        if sleep_seconds:
            LOGGER.info("Next run in %.0f seconds", sleep_seconds)
            _sleep_interruptibly(sleep_seconds)


def run_once(config: BotConfig) -> RunResult:
    if not config.dry_run:
        missing = config.missing_publish_settings()
        if missing:
            raise ConfigError(
                "Publishing needs these environment variables: " + ", ".join(missing)
            )

    store = ContentStore(config.content_file, config.state_file)
    content_index, post = store.next_post()
    if config.gemini_image_enabled:
        LOGGER.info(
            "Generating banner with Gemini image model %s",
            config.gemini_image_model,
        )
        image_path = GeminiImageGenerator(
            api_key=config.gemini_api_key,
            base_url=config.gemini_api_base_url,
            model=config.gemini_image_model,
            timeout_seconds=config.request_timeout_seconds,
            prompt_template=config.gemini_image_prompt,
        ).generate_banner(
            post,
            brand_name=config.brand_name,
            brand_tagline=config.brand_tagline,
            output_dir=config.output_dir,
            content_index=content_index,
        )
    else:
        image_path = render_banner(
            post,
            brand_name=config.brand_name,
            brand_tagline=config.brand_tagline,
            output_dir=config.output_dir,
            content_index=content_index,
        )
    apply_logo_overlay(
        image_path,
        logo_url=config.logo_url,
        timeout_seconds=config.request_timeout_seconds,
    )
    image_url = _public_url_for(config, image_path)
    caption = post.instagram_caption()

    if config.dry_run:
        LOGGER.info("Dry run generated banner: %s", image_path)
        LOGGER.info("Dry run image URL: %s", image_url or "(set PUBLIC_MEDIA_BASE_URL)")
        LOGGER.info("Dry run caption: %s", caption.replace("\n", " / "))
        store.mark_used(content_index, image_path)
        return RunResult(image_path=image_path, image_url=image_url, caption=caption, media_id=None)

    publisher = InstagramPublisher(
        ig_user_id=config.ig_user_id,
        access_token=config.ig_access_token,
        graph_api_base_url=config.graph_api_base_url,
        graph_api_version=config.graph_api_version,
        timeout_seconds=config.request_timeout_seconds,
        poll_seconds=config.publish_poll_seconds,
        wait_seconds=config.publish_wait_seconds,
    )
    try:
        result = publisher.publish_image(image_url=image_url, caption=caption)
    except Exception:
        LOGGER.exception("Instagram publish failed; keeping bot alive")
        return RunResult(
            image_path=image_path,
            image_url=image_url,
            caption=caption,
            media_id=None,
        )

    store.mark_used(content_index, image_path, media_id=result.media_id)
    LOGGER.info("Published Instagram media id=%s from %s", result.media_id, image_url)
    return RunResult(
        image_path=image_path,
        image_url=image_url,
        caption=caption,
        media_id=result.media_id,
    )


def _public_url_for(config: BotConfig, image_path: Path) -> str:
    if not config.public_media_base_url:
        return ""
    try:
        relative_path = image_path.relative_to(config.output_dir)
    except ValueError:
        relative_path = Path(image_path.name)
    return f"{config.public_media_base_url.rstrip('/')}/{relative_path.as_posix()}"


def _config_from_args(args: argparse.Namespace) -> BotConfig:
    env_file = args.env_file.resolve() if args.env_file else None
    config = BotConfig.from_env(env_file=env_file)

    dry_run = None
    if args.dry_run:
        dry_run = True
    if args.publish:
        dry_run = False

    return config.with_overrides(
        content_file=args.content_file,
        output_dir=args.output_dir,
        interval_seconds=args.interval_seconds,
        public_media_base_url=args.public_media_base_url,
        dry_run=dry_run,
    )


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate branded banners and publish them to Instagram.",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--once", action="store_true", help="Run once and exit. This is the default.")
    mode.add_argument("--loop", action="store_true", help="Run forever on BOT_POST_INTERVAL_SECONDS.")

    publish_mode = parser.add_mutually_exclusive_group()
    publish_mode.add_argument("--dry-run", action="store_true", help="Generate only; do not publish.")
    publish_mode.add_argument("--publish", action="store_true", help="Publish to Instagram.")

    parser.add_argument("--env-file", type=Path, help="Path to dotenv file.")
    parser.add_argument("--content-file", type=Path, help="Path to JSON content queue.")
    parser.add_argument("--output-dir", type=Path, help="Directory for generated JPEG banners.")
    parser.add_argument("--interval-seconds", type=int, help="Loop interval. Defaults to 7200.")
    parser.add_argument("--public-media-base-url", help="Public HTTPS base URL for output-dir files.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
    return parser.parse_args(argv)


def _configure_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )


def _install_signal_handlers() -> None:
    signal.signal(signal.SIGINT, _request_stop)
    signal.signal(signal.SIGTERM, _request_stop)


def _request_stop(signum: int, _frame: object) -> None:
    del signum
    global STOP_REQUESTED
    STOP_REQUESTED = True


def _sleep_interruptibly(seconds: float) -> None:
    deadline = time.monotonic() + seconds
    while not STOP_REQUESTED and time.monotonic() < deadline:
        time.sleep(min(1.0, deadline - time.monotonic()))


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
