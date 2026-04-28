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


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise ConfigError(f"{name} must be an integer") from exc


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
    content_file: Path
    output_dir: Path
    state_file: Path
    public_media_base_url: str
    ig_user_id: str
    ig_access_token: str
    graph_api_base_url: str
    graph_api_version: str
    interval_seconds: int
    dry_run: bool
    request_timeout_seconds: int
    publish_poll_seconds: int
    publish_wait_seconds: int

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

        return cls(
            brand_name=os.getenv("BOT_BRAND_NAME", "Tutorlix"),
            brand_tagline=os.getenv(
                "BOT_BRAND_TAGLINE",
                "Learn smarter. Grow faster.",
            ),
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
            interval_seconds=_env_int("BOT_POST_INTERVAL_SECONDS", 7200),
            dry_run=_env_bool("BOT_DRY_RUN", True),
            request_timeout_seconds=_env_int("BOT_REQUEST_TIMEOUT_SECONDS", 30),
            publish_poll_seconds=_env_int("BOT_PUBLISH_POLL_SECONDS", 5),
            publish_wait_seconds=_env_int("BOT_PUBLISH_WAIT_SECONDS", 60),
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
        return missing
