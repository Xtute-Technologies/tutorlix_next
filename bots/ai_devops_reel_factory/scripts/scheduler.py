from __future__ import annotations

import argparse
import logging
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import pytz

from utils import PROJECT_ROOT, load_config, python_executable, setup_logging


LOGGER = logging.getLogger("ai-devops-reel-factory.scheduler")
_RUN_LOCK = threading.Lock()


def _run_main(config_path: str | None = None, *, dry_run_post: bool = False) -> None:
    if not _RUN_LOCK.acquire(blocking=False):
        LOGGER.warning("Previous pipeline run is still active. Skipping this scheduled run.")
        return
    try:
        command = [python_executable(), str(PROJECT_ROOT / "scripts" / "main.py")]
        if config_path:
            command.extend(["--config", config_path])
        if dry_run_post:
            command.append("--dry-run-post")

        LOGGER.info("Starting scheduled pipeline: %s", " ".join(command))
        completed = subprocess.run(
            command,
            cwd=str(PROJECT_ROOT),
            check=False,
            text=True,
        )
        if completed.returncode != 0:
            LOGGER.error("Scheduled pipeline failed with exit code %s", completed.returncode)
        else:
            LOGGER.info("Scheduled pipeline completed successfully")
    except Exception:
        LOGGER.exception("Scheduled pipeline crashed")
    finally:
        _RUN_LOCK.release()


def _parse_schedule_time(value: str) -> tuple[int, int]:
    hour_text, minute_text = value.split(":", 1)
    hour = int(hour_text)
    minute = int(minute_text)
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        raise ValueError(f"Invalid schedule time: {value}")
    return hour, minute


def _run_with_apscheduler(config: dict[str, Any], *, config_path: str | None, dry_run_post: bool) -> None:
    try:
        from apscheduler.schedulers.blocking import BlockingScheduler
        from apscheduler.triggers.cron import CronTrigger
    except ImportError as exc:
        raise RuntimeError("APScheduler is not installed") from exc

    timezone_name = str(config.get("timezone", "Asia/Kolkata")) or "Asia/Kolkata"
    timezone = pytz.timezone(timezone_name)
    scheduler = BlockingScheduler(timezone=timezone)

    for schedule_time in config.get("schedule_times", ["09:00", "16:00"]):
        hour, minute = _parse_schedule_time(str(schedule_time))
        scheduler.add_job(
            _run_main,
            CronTrigger(hour=hour, minute=minute, timezone=timezone),
            kwargs={"config_path": config_path, "dry_run_post": dry_run_post},
            id=f"reel_factory_{hour:02d}_{minute:02d}",
            max_instances=1,
            coalesce=True,
            replace_existing=True,
        )
        LOGGER.info("Scheduled daily run at %02d:%02d %s", hour, minute, timezone_name)

    next_runs = [
        next_run
        for job in scheduler.get_jobs()
        for next_run in [getattr(job, "next_run_time", None)]
        if next_run is not None
    ]
    if next_runs:
        LOGGER.info("Next scheduled run: %s", min(next_runs))
    scheduler.start()


def _run_with_schedule(config: dict[str, Any], *, config_path: str | None, dry_run_post: bool) -> None:
    try:
        import schedule
    except ImportError as exc:
        raise RuntimeError("Install apscheduler or schedule to run the scheduler") from exc

    timezone_name = str(config.get("timezone", "Asia/Kolkata")) or "Asia/Kolkata"
    timezone = pytz.timezone(timezone_name)
    for schedule_time in config.get("schedule_times", ["09:00", "16:00"]):
        schedule.every().day.at(str(schedule_time), timezone_name).do(
            _run_main,
            config_path=config_path,
            dry_run_post=dry_run_post,
        )
        LOGGER.info("Scheduled daily run at %s %s", schedule_time, timezone_name)

    while True:
        schedule.run_pending()
        next_run = schedule.next_run()
        if next_run:
            localized = timezone.localize(next_run) if next_run.tzinfo is None else next_run
            LOGGER.info("Next scheduled run: %s", localized)
        time.sleep(30)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Reel pipeline at configured daily times.")
    parser.add_argument("--config", default=None, help="Path to config.json")
    parser.add_argument("--run-now", action="store_true", help="Run once immediately before waiting")
    parser.add_argument("--dry-run-post", action="store_true", help="Use Instagram dry-run mode for scheduled runs")
    args = parser.parse_args()

    setup_logging()
    config = load_config(args.config)
    LOGGER.info("Scheduler booted at %s", datetime.now().isoformat(timespec="seconds"))

    if args.run_now:
        _run_main(config_path=args.config, dry_run_post=args.dry_run_post)

    try:
        _run_with_apscheduler(config, config_path=args.config, dry_run_post=args.dry_run_post)
    except RuntimeError as exc:
        LOGGER.warning("%s. Falling back to schedule library.", exc)
        _run_with_schedule(config, config_path=args.config, dry_run_post=args.dry_run_post)


if __name__ == "__main__":
    main()
