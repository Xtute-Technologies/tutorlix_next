from __future__ import annotations

from dataclasses import dataclass
import time
from typing import Any

from .networking import install_ipv4_only_networking


install_ipv4_only_networking()

try:
    import requests
except ImportError as exc:  # pragma: no cover - exercised by runtime setup.
    raise RuntimeError(
        "requests is required. Install bot dependencies with: "
        "pip install -r bots/instagram_banner_bot/requirements.txt"
    ) from exc


class InstagramPublishError(RuntimeError):
    """Raised when Meta rejects or cannot complete an Instagram publish call."""


@dataclass(frozen=True)
class PublishResult:
    container_id: str
    media_id: str


class InstagramPublisher:
    def __init__(
        self,
        *,
        ig_user_id: str,
        access_token: str,
        graph_api_base_url: str,
        graph_api_version: str,
        timeout_seconds: int,
        poll_seconds: int,
        wait_seconds: int,
    ):
        self.ig_user_id = ig_user_id
        self.access_token = access_token
        self.base_url = graph_api_base_url.rstrip("/")
        self.version = graph_api_version.strip("/")
        self.timeout_seconds = timeout_seconds
        self.poll_seconds = max(1, poll_seconds)
        self.wait_seconds = max(0, wait_seconds)

    def publish_image(self, *, image_url: str, caption: str) -> PublishResult:
        container_id = self._create_image_container(image_url=image_url, caption=caption)
        self._wait_for_container(container_id)
        media_id = self._publish_container(container_id)
        return PublishResult(container_id=container_id, media_id=media_id)

    def publish_reel(
        self,
        *,
        video_url: str,
        caption: str,
        share_to_feed: bool,
    ) -> PublishResult:
        container_id = self._create_reel_container(
            video_url=video_url,
            caption=caption,
            share_to_feed=share_to_feed,
        )
        self._wait_for_container(container_id)
        media_id = self._publish_container(container_id)
        return PublishResult(container_id=container_id, media_id=media_id)

    def _create_image_container(self, *, image_url: str, caption: str) -> str:
        payload = {
            "image_url": image_url,
            "caption": caption,
        }
        data = self._post(f"{self.ig_user_id}/media", payload)
        container_id = str(data.get("id", "")).strip()
        if not container_id:
            raise InstagramPublishError(f"Media container response did not include id: {data}")
        return container_id

    def _create_reel_container(
        self,
        *,
        video_url: str,
        caption: str,
        share_to_feed: bool,
    ) -> str:
        payload = {
            "media_type": "REELS",
            "video_url": video_url,
            "caption": caption,
            "share_to_feed": "true" if share_to_feed else "false",
        }
        data = self._post(f"{self.ig_user_id}/media", payload)
        container_id = str(data.get("id", "")).strip()
        if not container_id:
            raise InstagramPublishError(f"Reel container response did not include id: {data}")
        return container_id

    def _publish_container(self, container_id: str) -> str:
        data = self._post(
            f"{self.ig_user_id}/media_publish",
            {"creation_id": container_id},
        )
        media_id = str(data.get("id", "")).strip()
        if not media_id:
            raise InstagramPublishError(f"Publish response did not include id: {data}")
        return media_id

    def _wait_for_container(self, container_id: str) -> None:
        if self.wait_seconds == 0:
            return

        deadline = time.monotonic() + self.wait_seconds
        while time.monotonic() < deadline:
            status = self._get(
                container_id,
                {
                    "fields": "status_code,status",
                },
            )
            status_code = str(status.get("status_code", "")).upper()
            if not status_code or status_code == "FINISHED":
                return
            if status_code in {"ERROR", "EXPIRED"}:
                raise InstagramPublishError(f"Media container failed: {status}")
            time.sleep(self.poll_seconds)

        raise InstagramPublishError(
            f"Media container {container_id} was not ready after {self.wait_seconds}s"
        )

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}/{self.version}/{path.lstrip('/')}"
        request_payload = {**payload, "access_token": self.access_token}

        last_error = None
        for attempt in range(5):
            try:
                response = requests.post(
                    url,
                    data=request_payload,
                    timeout=self.timeout_seconds,
                )
                return self._json_or_raise(response)

            except requests.exceptions.RequestException as exc:
                last_error = exc
                time.sleep(2 * (attempt + 1))  # exponential-ish backoff

        raise InstagramPublishError(f"Meta API POST failed after retries: {last_error}")

    def _get(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}/{self.version}/{path.lstrip('/')}"
        request_params = {**params, "access_token": self.access_token}

        last_error = None
        for attempt in range(5):
            try:
                response = requests.get(
                    url,
                    params=request_params,
                    timeout=self.timeout_seconds,
                )
                return self._json_or_raise(response)

            except requests.exceptions.RequestException as exc:
                last_error = exc
                time.sleep(2 * (attempt + 1))

        raise InstagramPublishError(f"Meta API GET failed after retries: {last_error}")

    @staticmethod
    def _json_or_raise(response: requests.Response) -> dict[str, Any]:
        try:
            data = response.json()
        except ValueError as exc:
            raise InstagramPublishError(
                f"Meta returned non-JSON response {response.status_code}: {response.text[:300]}"
            ) from exc

        if response.status_code >= 400 or "error" in data:
            raise InstagramPublishError(f"Meta API error {response.status_code}: {data}")
        if not isinstance(data, dict):
            raise InstagramPublishError(f"Unexpected Meta API response: {data}")
        return data
