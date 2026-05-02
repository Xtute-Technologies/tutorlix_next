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

from .buffer import BufferPublisher
from .config import BotConfig, ConfigError
from .notes import NoteItem, NoteStateStore, TutorlixNoteClient, build_linkedin_text


LOGGER = logging.getLogger("av-bot")
STOP_REQUESTED = False


@dataclass(frozen=True)
class RunResult:
    note: NoteItem
    text: str
    buffer_post_ids: tuple[str, ...]


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
        "Starting AV bot; interval=%ss profile_type=%s dry_run=%s",
        config.interval_seconds,
        config.profile_type,
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
        "Starting AV bot; schedule=%s timezone=%s profile_type=%s run_on_start=%s dry_run=%s",
        ",".join(config.post_schedule_times),
        config.schedule_timezone,
        config.profile_type,
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


def run_once(config: BotConfig) -> RunResult:
    if not config.dry_run:
        missing = config.missing_publish_settings()
        if missing:
            raise ConfigError(
                "Publishing needs these environment variables: " + ", ".join(missing)
            )

    client = TutorlixNoteClient(
        api_base_url=config.tutorlix_api_base_url,
        site_base_url=config.tutorlix_site_base_url,
        timeout_seconds=config.request_timeout_seconds,
        page_size=config.note_page_size,
        max_pages=config.note_fetch_max_pages,
    )
    state = NoteStateStore(
        config.state_file,
        recent_history_limit=config.recent_history_limit,
    )
    notes = client.fetch_notes(profile_type=config.profile_type)
    note = state.choose_random_note(notes)
    note = client.fetch_detail(note)
    text = build_linkedin_text(note)

    if config.dry_run:
        LOGGER.info("Dry run selected note: %s", note.title)
        LOGGER.info("Dry run note URL: %s", note.url)
        LOGGER.info("Dry run LinkedIn text: %s", text.replace("\n", " / "))
        state.mark_posted(note, dry_run=True)
        return RunResult(note=note, text=text, buffer_post_ids=())

    publisher = BufferPublisher(
        api_key=config.buffer_api_key,
        api_base_url=config.buffer_api_base_url,
        channel_ids=config.buffer_channel_ids,
        post_mode=config.buffer_post_mode,
        scheduling_type=config.buffer_scheduling_type,
        timeout_seconds=config.request_timeout_seconds,
    )
    try:
        results = publisher.publish_text_posts(text=text)
    except Exception:
        LOGGER.exception("Buffer publish failed; keeping bot alive")
        return RunResult(note=note, text=text, buffer_post_ids=())

    post_ids = tuple(result.post_id for result in results)
    state.mark_posted(note, buffer_post_ids=post_ids)
    LOGGER.info(
        "Published professional note to LinkedIn through Buffer post_ids=%s note_url=%s",
        ",".join(post_ids),
        note.url,
    )
    return RunResult(note=note, text=text, buffer_post_ids=post_ids)


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


def _config_from_args(args: argparse.Namespace) -> BotConfig:
    env_file = args.env_file.resolve() if args.env_file else None
    config = BotConfig.from_env(env_file=env_file)

    dry_run = None
    if args.dry_run:
        dry_run = True
    if args.publish:
        dry_run = False

    return config.with_overrides(
        output_dir=args.output_dir,
        interval_seconds=args.interval_seconds,
        dry_run=dry_run,
    )


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Post random Tutorlix professional notes to LinkedIn through Buffer.",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--once", action="store_true", help="Run once and exit. This is the default.")
    mode.add_argument("--loop", action="store_true", help="Run forever using BOT_POST_SCHEDULE_TIMES or BOT_POST_INTERVAL_SECONDS.")

    publish_mode = parser.add_mutually_exclusive_group()
    publish_mode.add_argument("--dry-run", action="store_true", help="Select and format only; do not publish.")
    publish_mode.add_argument("--publish", action="store_true", help="Publish through Buffer.")

    parser.add_argument("--env-file", type=Path, help="Path to dotenv file.")
    parser.add_argument("--output-dir", type=Path, help="Directory for state files.")
    parser.add_argument("--interval-seconds", type=int, help="Loop interval. Defaults to 7200.")
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
