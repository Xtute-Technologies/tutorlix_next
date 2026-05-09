from __future__ import annotations

import argparse
from dataclasses import dataclass
import logging
from pathlib import Path
import signal
import sys
import time

from .config import BotConfig, ConfigError
from .content import build_backlink_html, build_post_title
from .publishers import PublishResult, dry_run_result, publish_backlink
from .state import StateStore


LOGGER = logging.getLogger("backlinks-bot")
STOP_REQUESTED = False


@dataclass(frozen=True)
class RunResult:
    results: tuple[PublishResult, ...]


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
        "Starting backlinks bot; interval=%ss posts_per_run=%s dry_run=%s",
        config.interval_seconds,
        config.posts_per_run,
        config.dry_run,
    )
    while not STOP_REQUESTED:
        started_at = time.monotonic()
        try:
            run_once(config)
        except Exception:
            LOGGER.exception("Backlink bot run failed")

        elapsed = time.monotonic() - started_at
        sleep_seconds = max(0, config.interval_seconds - elapsed)
        if sleep_seconds:
            LOGGER.info("Next run in %.0f seconds", sleep_seconds)
            _sleep_interruptibly(sleep_seconds)


def run_once(config: BotConfig) -> RunResult:
    config.validate_for_run()
    targets = config.enabled_targets()

    if not config.dry_run:
        missing = config.missing_publish_settings(targets)
        if missing:
            raise ConfigError(
                "Publishing needs these settings/environment variables: "
                + ", ".join(missing)
            )

    state = StateStore(config.state_file)
    batch = state.choose_batch(targets, config.backlinks, config.posts_per_run)
    results: list[PublishResult] = []

    for target, backlink in batch:
        title = build_post_title(backlink, target)
        content_html = build_backlink_html(
            backlink,
            target,
            link_rel=config.link_rel,
        )
        if config.dry_run:
            LOGGER.info(
                "Dry run backlink target=%s backlink=%s title=%s url=%s",
                target.id,
                backlink.id,
                title,
                backlink.url,
            )
            LOGGER.debug("Dry run HTML: %s", content_html)
            results.append(dry_run_result(target, backlink))
            continue

        result = publish_backlink(config, target, backlink)
        LOGGER.info(
            "Published backlink target=%s backlink=%s status=%s remote_url=%s",
            result.target_id,
            result.backlink_id,
            result.status,
            result.remote_url or "(no URL returned)",
        )
        results.append(result)

    state.record_results(tuple(results))
    return RunResult(results=tuple(results))


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
        posts_per_run=args.posts_per_run,
        dry_run=dry_run,
    )


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Publish approved backlink resources to authorized websites.",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--once", action="store_true", help="Run once and exit. This is the default.")
    mode.add_argument("--loop", action="store_true", help="Run forever using BACKLINKS_BOT_INTERVAL_SECONDS.")

    publish_mode = parser.add_mutually_exclusive_group()
    publish_mode.add_argument("--dry-run", action="store_true", help="Build payloads only; do not publish.")
    publish_mode.add_argument("--publish", action="store_true", help="Publish to configured authorized targets.")

    parser.add_argument("--env-file", type=Path, help="Path to dotenv file.")
    parser.add_argument("--output-dir", type=Path, help="Directory for state files.")
    parser.add_argument("--interval-seconds", type=int, help="Loop interval. Defaults to 14400.")
    parser.add_argument("--posts-per-run", type=int, help="How many target/link pairs to process per run.")
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

