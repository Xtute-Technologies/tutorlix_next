from __future__ import annotations

import argparse
import logging
import os
import time
from pathlib import Path
from typing import Any

from utils import (
    PipelineError,
    load_config,
    load_dotenv_file,
    load_script_metadata,
    output_dir,
    read_text,
    setup_logging,
    str_to_bool,
)


LOGGER = logging.getLogger("ai-devops-reel-factory.instagram")
DEFAULT_GRAPH_API_VERSION = "v25.0"


class InstagramPublishError(PipelineError):
    """Raised when the Instagram Graph API publish flow fails."""


def _requests() -> Any:
    try:
        import requests
    except ImportError as exc:
        raise PipelineError(
            "requests is not installed. Install dependencies with: "
            "pip install -r requirements.txt"
        ) from exc
    return requests


def _json_or_raise(response: Any) -> dict[str, Any]:
    try:
        data = response.json()
    except ValueError as exc:
        raise InstagramPublishError(
            f"Meta returned non-JSON response {response.status_code}: {response.text[:300]}"
        ) from exc

    if response.status_code >= 400 or (isinstance(data, dict) and "error" in data):
        raise InstagramPublishError(f"Meta API error {response.status_code}: {data}")
    if not isinstance(data, dict):
        raise InstagramPublishError(f"Unexpected Meta API response: {data}")
    return data


def _api_request(
    method: str,
    url: str,
    *,
    data: dict[str, Any] | None = None,
    params: dict[str, Any] | None = None,
    timeout: int = 60,
    retries: int = 4,
) -> dict[str, Any]:
    requests = _requests()
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            response = requests.request(method, url, data=data, params=params, timeout=timeout)
            return _json_or_raise(response)
        except requests.exceptions.RequestException as exc:
            last_error = exc
            LOGGER.warning("Meta API %s request failed on attempt %s/%s: %s", method, attempt, retries, exc)
        except InstagramPublishError as exc:
            last_error = exc
            if attempt == retries:
                break
            LOGGER.warning("Meta API rejected request on attempt %s/%s: %s", attempt, retries, exc)
        time.sleep(min(30, 3 * attempt))
    raise InstagramPublishError(f"Meta API {method} request failed after retries: {last_error}")


def _public_video_url(final_video: Path, base_url: str) -> str:
    base_url = base_url.strip()
    if not base_url:
        raise InstagramPublishError("PUBLIC_VIDEO_BASE_URL is required for real Instagram publishing")
    if "{filename}" in base_url:
        url = base_url.format(filename=final_video.name)
    elif base_url.lower().endswith((".mp4", ".mov")):
        url = base_url
    else:
        url = f"{base_url.rstrip('/')}/{final_video.name}"
    if not url.startswith(("https://", "http://")):
        raise InstagramPublishError(f"PUBLIC_VIDEO_BASE_URL must produce an HTTP(S) URL: {url}")
    return url


def _caption(config: dict[str, Any], metadata: dict[str, Any]) -> str:
    caption = str(metadata.get("caption", "")).strip()
    if caption:
        return caption
    script_path = output_dir(config) / "script.txt"
    if script_path.exists():
        first_line = read_text(script_path).splitlines()[0]
        return f"{first_line}\n\n#DevOps #CloudComputing #TechLearning"
    return "#DevOps #CloudComputing #TechLearning"


def _preflight_public_url(video_url: str, timeout: int) -> None:
    requests = _requests()
    LOGGER.info("Preflight public video URL for Meta: %s", video_url)
    try:
        response = requests.head(
            video_url,
            allow_redirects=True,
            timeout=timeout,
            headers={"User-Agent": "facebookexternalhit/1.1"},
        )
        if response.status_code == 405:
            response = requests.get(
                video_url,
                stream=True,
                timeout=timeout,
                headers={"User-Agent": "facebookexternalhit/1.1"},
            )
    except requests.exceptions.RequestException as exc:
        raise InstagramPublishError(f"Public video URL is not reachable: {exc}") from exc

    content_type = response.headers.get("Content-Type", "")
    content_length = response.headers.get("Content-Length", "")
    LOGGER.info(
        "Public video URL status=%s content_type=%s content_length=%s",
        response.status_code,
        content_type or "(missing)",
        content_length or "(missing)",
    )
    if response.status_code >= 400:
        raise InstagramPublishError(f"Public video URL returned HTTP {response.status_code}")


def _create_reel_container(
    *,
    base_url: str,
    version: str,
    ig_user_id: str,
    access_token: str,
    video_url: str,
    caption: str,
    share_to_feed: bool,
    timeout: int,
) -> str:
    url = f"{base_url}/{version}/{ig_user_id}/media"
    payload = {
        "media_type": "REELS",
        "video_url": video_url,
        "caption": caption,
        "share_to_feed": "true" if share_to_feed else "false",
        "access_token": access_token,
    }
    data = _api_request("POST", url, data=payload, timeout=timeout)
    container_id = str(data.get("id", "")).strip()
    if not container_id:
        raise InstagramPublishError(f"Container creation response did not include id: {data}")
    LOGGER.info("Created Instagram Reel container id=%s", container_id)
    return container_id


def _wait_for_container(
    *,
    base_url: str,
    version: str,
    container_id: str,
    access_token: str,
    timeout: int,
    poll_seconds: int,
    wait_seconds: int,
) -> dict[str, Any]:
    url = f"{base_url}/{version}/{container_id}"
    deadline = time.monotonic() + wait_seconds
    last_status: dict[str, Any] = {}
    while time.monotonic() < deadline:
        status = _api_request(
            "GET",
            url,
            params={"fields": "status_code,status", "access_token": access_token},
            timeout=timeout,
            retries=2,
        )
        last_status = status
        status_code = str(status.get("status_code", "")).upper()
        LOGGER.info("Instagram container %s status=%s", container_id, status)
        if status_code == "FINISHED":
            return status
        if status_code in {"ERROR", "EXPIRED"}:
            raise InstagramPublishError(f"Instagram container failed: {status}")
        time.sleep(poll_seconds)
    raise InstagramPublishError(
        f"Instagram container {container_id} was not ready after {wait_seconds}s. "
        f"Last status: {last_status}"
    )


def _publish_container(
    *,
    base_url: str,
    version: str,
    ig_user_id: str,
    access_token: str,
    container_id: str,
    timeout: int,
) -> str:
    url = f"{base_url}/{version}/{ig_user_id}/media_publish"
    data = _api_request(
        "POST",
        url,
        data={"creation_id": container_id, "access_token": access_token},
        timeout=timeout,
    )
    media_id = str(data.get("id", "")).strip()
    if not media_id:
        raise InstagramPublishError(f"Publish response did not include id: {data}")
    LOGGER.info("Published Instagram Reel media id=%s", media_id)
    return media_id


def post_instagram(
    config: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
    *,
    dry_run: bool | None = None,
) -> dict[str, Any]:
    config = config or load_config()
    metadata = metadata or load_script_metadata(config)
    load_dotenv_file()

    outputs = output_dir(config)
    final_video = outputs / "final_reel.mp4"
    if not final_video.exists() or final_video.stat().st_size == 0:
        raise InstagramPublishError(f"Final Reel video missing: {final_video}")

    env_dry_run = str_to_bool(os.getenv("INSTAGRAM_DRY_RUN"), default=False)
    dry_run = env_dry_run if dry_run is None else dry_run
    public_base_url = os.getenv("PUBLIC_VIDEO_BASE_URL", "").strip()
    caption = _caption(config, metadata)

    if dry_run:
        video_url = ""
        if public_base_url:
            video_url = _public_video_url(final_video, public_base_url)
        LOGGER.info(
            "Dry run enabled. Would publish %s as Instagram Reel using public URL %s",
            final_video,
            video_url or "(PUBLIC_VIDEO_BASE_URL not set)",
        )
        return {
            "dry_run": True,
            "final_video": str(final_video),
            "video_url": video_url,
            "caption": caption,
        }

    ig_user_id = os.getenv("INSTAGRAM_USER_ID", "").strip()
    access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN", "").strip()
    if not ig_user_id:
        raise InstagramPublishError("INSTAGRAM_USER_ID is required")
    if not access_token:
        raise InstagramPublishError("INSTAGRAM_ACCESS_TOKEN is required")

    graph_base_url = os.getenv("INSTAGRAM_GRAPH_API_BASE_URL", "https://graph.facebook.com").rstrip("/")
    graph_version = os.getenv("INSTAGRAM_GRAPH_API_VERSION", DEFAULT_GRAPH_API_VERSION).strip("/")
    timeout = int(config.get("instagram_timeout_seconds", 60))
    poll_seconds = int(config.get("instagram_poll_seconds", 15))
    wait_seconds = int(config.get("instagram_wait_seconds", 300))
    share_to_feed = str_to_bool(config.get("instagram_share_to_feed"), default=True)

    video_url = _public_video_url(final_video, public_base_url)
    _preflight_public_url(video_url, timeout=timeout)

    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            container_id = _create_reel_container(
                base_url=graph_base_url,
                version=graph_version,
                ig_user_id=ig_user_id,
                access_token=access_token,
                video_url=video_url,
                caption=caption,
                share_to_feed=share_to_feed,
                timeout=timeout,
            )
            _wait_for_container(
                base_url=graph_base_url,
                version=graph_version,
                container_id=container_id,
                access_token=access_token,
                timeout=timeout,
                poll_seconds=poll_seconds,
                wait_seconds=wait_seconds,
            )
            media_id = _publish_container(
                base_url=graph_base_url,
                version=graph_version,
                ig_user_id=ig_user_id,
                access_token=access_token,
                container_id=container_id,
                timeout=timeout,
            )
            return {
                "dry_run": False,
                "container_id": container_id,
                "media_id": media_id,
                "video_url": video_url,
            }
        except InstagramPublishError as exc:
            last_error = exc
            LOGGER.warning("Instagram publish attempt %s/3 failed: %s", attempt, exc)
            if attempt < 3:
                time.sleep(30 * attempt)
    raise InstagramPublishError(f"Instagram publish failed after retries: {last_error}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish final_reel.mp4 as an Instagram Reel.")
    parser.add_argument("--config", default=None, help="Path to config.json")
    parser.add_argument("--dry-run", action="store_true", help="Validate locally without calling Meta APIs")
    args = parser.parse_args()

    setup_logging()
    result = post_instagram(load_config(args.config), dry_run=args.dry_run)
    print(result)


if __name__ == "__main__":
    main()
