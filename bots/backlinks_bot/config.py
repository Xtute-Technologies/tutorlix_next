from __future__ import annotations

from dataclasses import dataclass, replace
import json
import os
from pathlib import Path
from typing import Any


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


def _read_json_file(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ConfigError(f"{path} is not valid JSON: {exc}") from exc


@dataclass(frozen=True)
class BacklinkItem:
    id: str
    title: str
    url: str
    anchor_text: str
    description: str
    keywords: tuple[str, ...]

    @classmethod
    def from_mapping(cls, item: dict[str, Any]) -> "BacklinkItem":
        item_id = str(item.get("id", "")).strip()
        title = str(item.get("title", "")).strip()
        url = str(item.get("url", "")).strip()
        anchor_text = str(item.get("anchor_text", "")).strip()
        description = str(item.get("description", "")).strip()
        keywords = item.get("keywords", [])
        if isinstance(keywords, str):
            keywords = [part.strip() for part in keywords.split(",") if part.strip()]

        missing = [
            name
            for name, value in {
                "id": item_id,
                "title": title,
                "url": url,
                "anchor_text": anchor_text,
                "description": description,
            }.items()
            if not value
        ]
        if missing:
            raise ConfigError(
                f"Backlink item is missing required fields: {', '.join(missing)}"
            )

        if not url.startswith(("https://", "http://")):
            raise ConfigError(f"Backlink item {item_id} has invalid url: {url}")

        return cls(
            id=item_id,
            title=title,
            url=url,
            anchor_text=anchor_text,
            description=description,
            keywords=tuple(str(keyword).strip() for keyword in keywords if str(keyword).strip()),
        )


@dataclass(frozen=True)
class TargetSite:
    id: str
    type: str
    base_url: str
    enabled: bool
    authorized: bool
    status: str
    username_env: str
    password_env: str
    token_env: str
    endpoint: str
    category_ids: tuple[int, ...]
    tag_ids: tuple[int, ...]

    @classmethod
    def from_mapping(cls, item: dict[str, Any]) -> "TargetSite":
        target_id = str(item.get("id", "")).strip()
        target_type = str(item.get("type", "")).strip().lower()
        base_url = str(item.get("base_url", "")).strip().rstrip("/")
        status = str(item.get("status", "draft")).strip().lower() or "draft"

        if not target_id:
            raise ConfigError("Target site is missing id")
        if target_type not in {"wordpress", "webhook"}:
            raise ConfigError(
                f"Target {target_id} type must be one of: wordpress, webhook"
            )
        if not base_url.startswith(("https://", "http://")):
            raise ConfigError(f"Target {target_id} has invalid base_url: {base_url}")
        if status not in {"draft", "publish", "pending", "private"}:
            raise ConfigError(
                f"Target {target_id} status must be one of: draft, publish, pending, private"
            )

        return cls(
            id=target_id,
            type=target_type,
            base_url=base_url,
            enabled=bool(item.get("enabled", True)),
            authorized=bool(item.get("authorized", False)),
            status=status,
            username_env=str(item.get("username_env", "")).strip(),
            password_env=str(item.get("password_env", "")).strip(),
            token_env=str(item.get("token_env", "")).strip(),
            endpoint=str(item.get("endpoint", "")).strip(),
            category_ids=tuple(int(value) for value in item.get("category_ids", [])),
            tag_ids=tuple(int(value) for value in item.get("tag_ids", [])),
        )


@dataclass(frozen=True)
class BotConfig:
    output_dir: Path
    state_file: Path
    backlinks_file: Path
    targets_file: Path
    interval_seconds: int
    posts_per_run: int
    dry_run: bool
    request_timeout_seconds: int
    link_rel: str
    user_agent: str
    backlinks: tuple[BacklinkItem, ...]
    targets: tuple[TargetSite, ...]

    @classmethod
    def from_env(cls, env_file: Path | None = None) -> "BotConfig":
        if env_file:
            load_env_file(env_file)
        else:
            load_env_file(PACKAGE_DIR / ".env")

        output_dir = _env_path("BACKLINKS_BOT_OUTPUT_DIR", Path("bots/backlinks_bot/output"))
        backlinks_file = _env_path(
            "BACKLINKS_BOT_BACKLINKS_FILE",
            Path("bots/backlinks_bot/backlinks.json"),
        )
        targets_file = _env_path(
            "BACKLINKS_BOT_TARGETS_FILE",
            Path("bots/backlinks_bot/targets.json"),
        )
        backlinks = tuple(
            BacklinkItem.from_mapping(item)
            for item in _read_json_file(backlinks_file, [])
        )
        targets = tuple(
            TargetSite.from_mapping(item)
            for item in _read_json_file(targets_file, [])
        )

        return cls(
            output_dir=output_dir,
            state_file=_env_path("BACKLINKS_BOT_STATE_FILE", output_dir / "state.json"),
            backlinks_file=backlinks_file,
            targets_file=targets_file,
            interval_seconds=_env_int("BACKLINKS_BOT_INTERVAL_SECONDS", 14400),
            posts_per_run=max(1, _env_int("BACKLINKS_BOT_POSTS_PER_RUN", 1)),
            dry_run=_env_bool("BACKLINKS_BOT_DRY_RUN", True),
            request_timeout_seconds=_env_int("BACKLINKS_BOT_REQUEST_TIMEOUT_SECONDS", 30),
            link_rel=os.getenv("BACKLINKS_BOT_LINK_REL", "noopener").strip() or "noopener",
            user_agent=os.getenv(
                "BACKLINKS_BOT_USER_AGENT",
                "TutorlixBacklinksBot/1.0 (+https://tutorlix.com)",
            ).strip(),
            backlinks=backlinks,
            targets=targets,
        )

    def with_overrides(
        self,
        *,
        output_dir: Path | None = None,
        interval_seconds: int | None = None,
        posts_per_run: int | None = None,
        dry_run: bool | None = None,
    ) -> "BotConfig":
        updates = {}
        if output_dir is not None:
            updates["output_dir"] = output_dir.resolve()
            updates["state_file"] = output_dir.resolve() / "state.json"
        if interval_seconds is not None:
            updates["interval_seconds"] = interval_seconds
        if posts_per_run is not None:
            updates["posts_per_run"] = max(1, posts_per_run)
        if dry_run is not None:
            updates["dry_run"] = dry_run
        return replace(self, **updates)

    def enabled_targets(self) -> tuple[TargetSite, ...]:
        return tuple(target for target in self.targets if target.enabled)

    def validate_for_run(self) -> None:
        if not self.backlinks:
            raise ConfigError(f"No backlink items found in {self.backlinks_file}")
        if not self.targets:
            raise ConfigError(f"No target sites found in {self.targets_file}")
        if not self.enabled_targets():
            raise ConfigError(f"No enabled target sites found in {self.targets_file}")

    def missing_publish_settings(self, targets: tuple[TargetSite, ...]) -> list[str]:
        missing = []
        for target in targets:
            if not target.authorized:
                missing.append(f"{target.id}.authorized")
            if target.type == "wordpress":
                if not target.username_env:
                    missing.append(f"{target.id}.username_env")
                elif not os.getenv(target.username_env):
                    missing.append(target.username_env)
                if not target.password_env:
                    missing.append(f"{target.id}.password_env")
                elif not os.getenv(target.password_env):
                    missing.append(target.password_env)
            if target.type == "webhook":
                if not target.endpoint:
                    missing.append(f"{target.id}.endpoint")
                if target.token_env and not os.getenv(target.token_env):
                    missing.append(target.token_env)
        return missing

