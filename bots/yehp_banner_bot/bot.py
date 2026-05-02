from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, time as datetime_time, timedelta
import logging
from pathlib import Path
import signal
import sys
import time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .branding import apply_logo_overlay
from .config import BotConfig, ConfigError
from .content import ContentStore
from .designer import render_banner
from .instagram import InstagramPublisher
from .video import render_reel_video


LOGGER = logging.getLogger("yehp-banner-bot")
STOP_REQUESTED = False


@dataclass(frozen=True)
class RunResult:
    image_path: Path
    image_url: str
    caption: str
    media_id: str | None
    video_path: Path | None = None
    video_url: str = ""


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
    if config.post_schedule_times:
        _run_scheduled_loop(config)
        return

    LOGGER.info(
        "Starting YEHP banner bot; interval=%ss dry_run=%s",
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


def _run_scheduled_loop(config: BotConfig) -> None:
    timezone = _schedule_timezone(config)
    LOGGER.info(
        "Starting YEHP banner bot; schedule=%s timezone=%s run_on_start=%s dry_run=%s",
        ",".join(config.post_schedule_times),
        config.schedule_timezone,
        config.run_on_start,
        config.dry_run,
    )

    if config.run_on_start and not STOP_REQUESTED:
        LOGGER.info("Running startup publish before scheduled loop")
        try:
            run_once(config)
        except Exception:
            LOGGER.exception("Startup bot run failed")

    while not STOP_REQUESTED:
        now = datetime.now(timezone)
        next_run = _next_scheduled_run(now, config.post_schedule_times)
        sleep_seconds = max(0, (next_run - now).total_seconds())
        LOGGER.info(
            "Next scheduled run at %s; sleeping %.0f seconds",
            next_run.strftime("%Y-%m-%d %H:%M:%S %Z"),
            sleep_seconds,
        )
        _sleep_interruptibly(sleep_seconds)
        if STOP_REQUESTED:
            return

        try:
            run_once(config)
        except Exception:
            LOGGER.exception("Bot run failed")


def _schedule_timezone(config: BotConfig) -> ZoneInfo:
    try:
        return ZoneInfo(config.schedule_timezone)
    except ZoneInfoNotFoundError as exc:
        raise ConfigError(f"Unknown BOT_SCHEDULE_TIMEZONE: {config.schedule_timezone}") from exc


def _next_scheduled_run(now: datetime, schedule_times: tuple[str, ...]) -> datetime:
    parsed_times = [_parse_schedule_time(value) for value in schedule_times]
    for scheduled_time in sorted(parsed_times):
        candidate = datetime.combine(now.date(), scheduled_time, tzinfo=now.tzinfo)
        if candidate > now:
            return candidate

    return datetime.combine(
        now.date() + timedelta(days=1),
        min(parsed_times),
        tzinfo=now.tzinfo,
    )


def _parse_schedule_time(value: str) -> datetime_time:
    hour, minute = value.split(":", 1)
    return datetime_time(hour=int(hour), minute=int(minute))


def run_once(config: BotConfig) -> RunResult:
    if not config.dry_run:
        missing = config.missing_publish_settings()
        if missing:
            raise ConfigError(
                "Publishing needs these environment variables: " + ", ".join(missing)
            )

    store = ContentStore(config.content_file, config.state_file)
    content_index, post = store.next_post()
    image_path = render_banner(
        post,
        brand_name=config.brand_name,
        brand_tagline=config.brand_tagline,
        website_url=config.website_url,
        contact_address=config.contact_address,
        contact_phone=config.contact_phone,
        output_dir=config.output_dir,
        content_index=content_index,
        openai_image_enabled=config.openai_image_enabled,
        openai_api_key=config.openai_api_key,
        openai_api_base_url=config.openai_api_base_url,
        openai_image_model=config.openai_image_model,
        openai_image_prompt=config.openai_image_prompt,
        openai_image_size=config.openai_image_size,
        openai_image_quality=config.openai_image_quality,
        openai_image_output_format=config.openai_image_output_format,
        openai_image_timeout_seconds=config.openai_image_timeout_seconds,
    )
    apply_logo_overlay(
        image_path,
        logo_url=config.logo_url,
        timeout_seconds=config.request_timeout_seconds,
    )
    image_url = _public_url_for(config, image_path)
    caption = post.instagram_caption()
    video_path = None
    video_url = ""

    if config.publish_media_type == "reel":
        video_path = render_reel_video(
            image_path,
            output_dir=config.output_dir,
            duration_seconds=config.reel_duration_seconds,
            audio_path=config.reel_audio_file,
        )
        video_url = _public_url_for(config, video_path)
        LOGGER.info(
            "Generated Reel video path=%s size=%s bytes url=%s",
            video_path,
            video_path.stat().st_size,
            video_url or "(set PUBLIC_MEDIA_BASE_URL)",
        )

    if config.dry_run:
        LOGGER.info("Dry run generated banner: %s", image_path)
        LOGGER.info("Dry run image URL: %s", image_url or "(set PUBLIC_MEDIA_BASE_URL)")
        if video_path:
            LOGGER.info("Dry run generated Reel video: %s", video_path)
            LOGGER.info("Dry run video URL: %s", video_url or "(set PUBLIC_MEDIA_BASE_URL)")
        LOGGER.info("Dry run caption: %s", caption.replace("\n", " / "))
        store.mark_used(content_index, image_path)
        return RunResult(
            image_path=image_path,
            image_url=image_url,
            caption=caption,
            media_id=None,
            video_path=video_path,
            video_url=video_url,
        )

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
        if config.publish_media_type == "reel":
            result = publisher.publish_reel(
                video_url=video_url,
                caption=caption,
                share_to_feed=config.reel_share_to_feed,
            )
            published_url = video_url
        else:
            result = publisher.publish_image(image_url=image_url, caption=caption)
            published_url = image_url
    except Exception:
        LOGGER.exception("Instagram publish failed; keeping bot alive")
        return RunResult(
            image_path=image_path,
            image_url=image_url,
            caption=caption,
            media_id=None,
            video_path=video_path,
            video_url=video_url,
        )

    store.mark_used(content_index, image_path, media_id=result.media_id)
    LOGGER.info(
        "Published Instagram %s id=%s from %s",
        config.publish_media_type,
        result.media_id,
        published_url,
    )
    return RunResult(
        image_path=image_path,
        image_url=image_url,
        caption=caption,
        media_id=result.media_id,
        video_path=video_path,
        video_url=video_url,
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
