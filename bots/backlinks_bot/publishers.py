from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any

from .config import BacklinkItem, BotConfig, TargetSite
from .content import build_backlink_html, build_post_title


@dataclass(frozen=True)
class PublishResult:
    target_id: str
    backlink_id: str
    remote_id: str
    remote_url: str
    status: str
    dry_run: bool


class PublishError(RuntimeError):
    """Raised when a configured target rejects a backlink publication."""


def publish_backlink(
    config: BotConfig,
    target: TargetSite,
    backlink: BacklinkItem,
) -> PublishResult:
    if target.type == "wordpress":
        return _publish_wordpress(config, target, backlink)
    if target.type == "webhook":
        return _publish_webhook(config, target, backlink)
    raise PublishError(f"Unsupported target type: {target.type}")


def dry_run_result(target: TargetSite, backlink: BacklinkItem) -> PublishResult:
    return PublishResult(
        target_id=target.id,
        backlink_id=backlink.id,
        remote_id="dry-run",
        remote_url="",
        status=target.status,
        dry_run=True,
    )


def _publish_wordpress(
    config: BotConfig,
    target: TargetSite,
    backlink: BacklinkItem,
) -> PublishResult:
    import requests

    username = os.getenv(target.username_env, "")
    password = os.getenv(target.password_env, "")
    endpoint = f"{target.base_url}/wp-json/wp/v2/posts"
    payload: dict[str, Any] = {
        "title": build_post_title(backlink, target),
        "content": build_backlink_html(backlink, target, link_rel=config.link_rel),
        "status": target.status,
    }
    if target.category_ids:
        payload["categories"] = list(target.category_ids)
    if target.tag_ids:
        payload["tags"] = list(target.tag_ids)

    response = requests.post(
        endpoint,
        json=payload,
        auth=(username, password),
        headers={"User-Agent": config.user_agent},
        timeout=config.request_timeout_seconds,
    )
    if response.status_code >= 400:
        raise PublishError(
            f"WordPress target {target.id} failed with HTTP {response.status_code}: "
            f"{response.text[:500]}"
        )

    data = response.json()
    return PublishResult(
        target_id=target.id,
        backlink_id=backlink.id,
        remote_id=str(data.get("id", "")),
        remote_url=str(data.get("link", "")),
        status=str(data.get("status", target.status)),
        dry_run=False,
    )


def _publish_webhook(
    config: BotConfig,
    target: TargetSite,
    backlink: BacklinkItem,
) -> PublishResult:
    import requests

    endpoint = target.endpoint or target.base_url
    headers = {
        "Content-Type": "application/json",
        "User-Agent": config.user_agent,
    }
    if target.token_env:
        headers["Authorization"] = f"Bearer {os.getenv(target.token_env, '')}"

    payload = {
        "target_id": target.id,
        "title": build_post_title(backlink, target),
        "content_html": build_backlink_html(backlink, target, link_rel=config.link_rel),
        "status": target.status,
        "backlink": {
            "id": backlink.id,
            "url": backlink.url,
            "anchor_text": backlink.anchor_text,
            "description": backlink.description,
            "keywords": list(backlink.keywords),
        },
    }
    response = requests.post(
        endpoint,
        json=payload,
        headers=headers,
        timeout=config.request_timeout_seconds,
    )
    if response.status_code >= 400:
        raise PublishError(
            f"Webhook target {target.id} failed with HTTP {response.status_code}: "
            f"{response.text[:500]}"
        )

    data: dict[str, Any]
    try:
        data = response.json()
    except ValueError:
        data = {}

    return PublishResult(
        target_id=target.id,
        backlink_id=backlink.id,
        remote_id=str(data.get("id", "")),
        remote_url=str(data.get("url", data.get("link", ""))),
        status=str(data.get("status", target.status)),
        dry_run=False,
    )
