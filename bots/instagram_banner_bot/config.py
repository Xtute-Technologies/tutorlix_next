from __future__ import annotations

from dataclasses import dataclass, replace
import os
from pathlib import Path


PACKAGE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_DIR.parents[1]


class ConfigError(RuntimeError):
    """Raised when required bot configuration is missing or invalid."""


def load_env_file(path: Path) -> None:
    """Load KEY=VALUE pairs from a dotenv-style file without overwriting env."""
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_optional_bool(name: str) -> bool | None:
    value = os.getenv(name)
    if value is None or not value.strip():
        return None
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise ConfigError(f"{name} must be an integer") from exc


def _env_schedule_times(name: str, default: str) -> tuple[str, ...]:
    raw_value = os.getenv(name)
    if raw_value is None:
        raw_value = default
    raw_value = raw_value.strip()
    if not raw_value:
        return ()

    schedule_times = []
    for item in raw_value.replace(";", ",").split(","):
        value = item.strip()
        if not value:
            continue
        schedule_times.append(_normalize_schedule_time(value, name))

    return tuple(dict.fromkeys(schedule_times))


def _normalize_schedule_time(value: str, env_name: str) -> str:
    normalized = value.strip().lower().replace(".", "")
    meridiem = ""
    if normalized.endswith("am") or normalized.endswith("pm"):
        meridiem = normalized[-2:]
        normalized = normalized[:-2].strip()

    parts = normalized.split(":")
    if len(parts) not in {1, 2}:
        raise ConfigError(f"{env_name} entries must use HH:MM, e.g. 11:00,17:00")

    try:
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) == 2 else 0
    except ValueError as exc:
        raise ConfigError(f"{env_name} entries must use numeric times") from exc

    if meridiem:
        if hour < 1 or hour > 12:
            raise ConfigError(f"{env_name} 12-hour entries must use hours 1-12")
        if meridiem == "am":
            hour = 0 if hour == 12 else hour
        else:
            hour = 12 if hour == 12 else hour + 12

    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        raise ConfigError(f"{env_name} entries must be valid 24-hour times")

    return f"{hour:02d}:{minute:02d}"


def _env_path(name: str, default: Path) -> Path:
    value = os.getenv(name)
    path = Path(value) if value else default
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    return path


@dataclass(frozen=True)
class BotConfig:
    brand_name: str
    brand_tagline: str
    logo_url: str
    content_file: Path
    output_dir: Path
    state_file: Path
    public_media_base_url: str
    ig_user_id: str
    ig_access_token: str
    graph_api_base_url: str
    graph_api_version: str
    publish_media_type: str
    reel_duration_seconds: int
    reel_share_to_feed: bool
    reel_audio_file: Path
    post_schedule_times: tuple[str, ...]
    schedule_timezone: str
    interval_seconds: int
    dry_run: bool
    request_timeout_seconds: int
    publish_poll_seconds: int
    publish_wait_seconds: int
    openai_image_enabled: bool
    openai_api_key: str
    openai_api_base_url: str
    openai_image_model: str
    openai_image_prompt: str
    openai_image_size: str
    openai_image_quality: str
    openai_image_output_format: str
    openai_image_timeout_seconds: int

    @classmethod
    def from_env(cls, env_file: Path | None = None) -> "BotConfig":
        if env_file:
            load_env_file(env_file)
        else:
            load_env_file(PACKAGE_DIR / ".env")

        output_dir = _env_path(
            "BOT_OUTPUT_DIR",
            Path("bots/instagram_banner_bot/output"),
        )
        openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        openai_image_enabled = _env_optional_bool("OPENAI_IMAGE_ENABLED")
        if openai_image_enabled is None:
            openai_image_enabled = bool(openai_api_key)

        publish_media_type = os.getenv("BOT_PUBLISH_MEDIA_TYPE", "reel").strip().lower()
        if publish_media_type not in {"image", "reel"}:
            raise ConfigError("BOT_PUBLISH_MEDIA_TYPE must be either image or reel")

        return cls(
            brand_name=os.getenv("BOT_BRAND_NAME", "Tutorlix"),
            brand_tagline=os.getenv(
                "BOT_BRAND_TAGLINE",
                "Learn smarter. Grow faster.",
            ),
            logo_url=os.getenv(
                "BOT_LOGO_URL",
                "https://tutorlix.com/logo.png",
            ).strip(),
            content_file=_env_path(
                "BOT_CONTENT_FILE",
                Path("bots/instagram_banner_bot/content.json"),
            ),
            output_dir=output_dir,
            state_file=_env_path("BOT_STATE_FILE", output_dir / "state.json"),
            public_media_base_url=os.getenv("PUBLIC_MEDIA_BASE_URL", "").strip(),
            ig_user_id=os.getenv("IG_USER_ID", "").strip(),
            ig_access_token=os.getenv("IG_ACCESS_TOKEN", "").strip(),
            graph_api_base_url=os.getenv(
                "META_GRAPH_API_BASE_URL",
                "https://graph.facebook.com",
            ).rstrip("/"),
            graph_api_version=os.getenv("META_GRAPH_API_VERSION", "v25.0").strip("/"),
            publish_media_type=publish_media_type,
            reel_duration_seconds=_env_int("BOT_REEL_DURATION_SECONDS", 8),
            reel_share_to_feed=_env_bool("BOT_REEL_SHARE_TO_FEED", True),
            reel_audio_file=_env_path(
                "BOT_REEL_AUDIO_FILE",
                Path("bots/instagram_banner_bot/bombinsound-trending-instagram-reels-music-499599.mp3"),
            ),
            post_schedule_times=_env_schedule_times(
                "BOT_POST_SCHEDULE_TIMES",
                "11:00,17:00",
            ),
            schedule_timezone=os.getenv("BOT_SCHEDULE_TIMEZONE", "Asia/Kolkata").strip()
            or "Asia/Kolkata",
            interval_seconds=_env_int("BOT_POST_INTERVAL_SECONDS", 7200),
            dry_run=_env_bool("BOT_DRY_RUN", True),
            request_timeout_seconds=_env_int("BOT_REQUEST_TIMEOUT_SECONDS", 30),
            publish_poll_seconds=_env_int("BOT_PUBLISH_POLL_SECONDS", 5),
            publish_wait_seconds=_env_int("BOT_PUBLISH_WAIT_SECONDS", 180),
            openai_image_enabled=openai_image_enabled,
            openai_api_key=openai_api_key,
            openai_api_base_url=os.getenv(
                "OPENAI_API_BASE_URL",
                "https://api.openai.com/v1",
            ).rstrip("/"),
            openai_image_model=os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1").strip(),
            openai_image_prompt=os.getenv("OPENAI_IMAGE_PROMPT", "").strip(),
            openai_image_size=os.getenv("OPENAI_IMAGE_SIZE", "1024x1024").strip(),
            openai_image_quality=os.getenv("OPENAI_IMAGE_QUALITY", "medium").strip(),
            openai_image_output_format=os.getenv(
                "OPENAI_IMAGE_OUTPUT_FORMAT",
                "png",
            ).strip(),
            openai_image_timeout_seconds=_env_int(
                "OPENAI_IMAGE_TIMEOUT_SECONDS",
                180,
            ),
        )

    def with_overrides(
        self,
        *,
        content_file: Path | None = None,
        output_dir: Path | None = None,
        interval_seconds: int | None = None,
        public_media_base_url: str | None = None,
        dry_run: bool | None = None,
    ) -> "BotConfig":
        updates = {}
        if content_file is not None:
            updates["content_file"] = content_file.resolve()
        if output_dir is not None:
            updates["output_dir"] = output_dir.resolve()
            updates["state_file"] = output_dir.resolve() / "state.json"
        if interval_seconds is not None:
            updates["interval_seconds"] = interval_seconds
        if public_media_base_url is not None:
            updates["public_media_base_url"] = public_media_base_url.strip()
        if dry_run is not None:
            updates["dry_run"] = dry_run
        return replace(self, **updates)

    def missing_publish_settings(self) -> list[str]:
        missing = []
        if not self.ig_user_id:
            missing.append("IG_USER_ID")
        if not self.ig_access_token:
            missing.append("IG_ACCESS_TOKEN")
        if not self.public_media_base_url:
            missing.append("PUBLIC_MEDIA_BASE_URL")
        if self.openai_image_enabled and not self.openai_api_key:
            missing.append("OPENAI_API_KEY")
        return missing
