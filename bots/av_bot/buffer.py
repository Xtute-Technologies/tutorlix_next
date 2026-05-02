from __future__ import annotations

from dataclasses import dataclass
import logging
import time
from typing import Any

from .networking import install_ipv4_only_networking


install_ipv4_only_networking()

try:
    import requests
except ImportError as exc:  # pragma: no cover - exercised by runtime setup.
    raise RuntimeError(
        "requests is required. Install bot dependencies with: "
        "pip install -r bots/av_bot/requirements.txt"
    ) from exc


LOGGER = logging.getLogger("av-bot")
CREATE_POST_ATTEMPTS = 4
CREATE_POST_RETRY_SECONDS = (30, 60, 120)


class BufferPublishError(RuntimeError):
    """Raised when Buffer rejects or cannot complete a publish call."""


@dataclass(frozen=True)
class BufferPostResult:
    channel_id: str
    post_id: str
    raw: dict[str, Any]


CREATE_IMAGE_POST_MUTATION = """
mutation CreateAvLinkedInImagePost($input: CreatePostInput!) {
  createPost(input: $input) {
    __typename
    ... on PostActionSuccess {
      post {
        id
        text
        dueAt
        status
        channelId
        assets {
          id
          mimeType
        }
      }
    }
    ... on MutationError {
      message
    }
  }
}
"""


class BufferPublisher:
    def __init__(
        self,
        *,
        api_key: str,
        api_base_url: str,
        channel_ids: tuple[str, ...],
        post_mode: str,
        scheduling_type: str,
        timeout_seconds: int,
    ):
        self.api_key = api_key
        self.api_base_url = api_base_url.rstrip("/")
        self.channel_ids = channel_ids
        self.post_mode = post_mode
        self.scheduling_type = scheduling_type
        self.timeout_seconds = timeout_seconds

    def publish_image_posts(
        self,
        *,
        image_url: str,
        text: str,
    ) -> tuple[BufferPostResult, ...]:
        self._preflight_image_url(image_url)
        results = []
        for channel_id in self.channel_ids:
            results.append(
                self.publish_image_post(
                    channel_id=channel_id,
                    image_url=image_url,
                    text=text,
                )
            )
        return tuple(results)

    def publish_image_post(
        self,
        *,
        channel_id: str,
        image_url: str,
        text: str,
    ) -> BufferPostResult:
        last_error = None
        for attempt in range(1, CREATE_POST_ATTEMPTS + 1):
            try:
                return self._publish_image_post_once(
                    channel_id=channel_id,
                    image_url=image_url,
                    text=text,
                )
            except BufferPublishError as exc:
                last_error = exc
                if attempt >= CREATE_POST_ATTEMPTS or not _is_transient_create_error(exc):
                    raise

                sleep_seconds = CREATE_POST_RETRY_SECONDS[
                    min(attempt - 1, len(CREATE_POST_RETRY_SECONDS) - 1)
                ]
                LOGGER.warning(
                    "Buffer image post create attempt %s/%s failed with transient error: %s; retrying in %ss",
                    attempt,
                    CREATE_POST_ATTEMPTS,
                    exc,
                    sleep_seconds,
                )
                time.sleep(sleep_seconds)

        raise BufferPublishError(f"Buffer image post failed after retries: {last_error}")

    def _publish_image_post_once(
        self,
        *,
        channel_id: str,
        image_url: str,
        text: str,
    ) -> BufferPostResult:
        payload = {
            "text": text,
            "channelId": channel_id,
            "schedulingType": self.scheduling_type,
            "mode": self.post_mode,
            "source": "tutorlix-av-bot",
            "assets": {
                "images": [
                    {
                        "url": image_url,
                    }
                ],
            },
        }
        data = self._graphql(CREATE_IMAGE_POST_MUTATION, {"input": payload})
        result = data.get("createPost")
        if not isinstance(result, dict):
            raise BufferPublishError(f"Unexpected Buffer createPost response: {data}")

        typename = str(result.get("__typename", "")).strip()
        if typename != "PostActionSuccess":
            message = str(result.get("message", "")).strip()
            raise BufferPublishError(
                f"Buffer createPost failed"
                f"{f' ({typename})' if typename else ''}: {message or result}"
            )

        post = result.get("post")
        if not isinstance(post, dict):
            raise BufferPublishError(f"Buffer success response did not include post: {result}")

        post_id = str(post.get("id", "")).strip()
        if not post_id:
            raise BufferPublishError(f"Buffer post response did not include id: {post}")

        LOGGER.info("Created Buffer post id=%s channel_id=%s", post_id, channel_id)
        return BufferPostResult(channel_id=channel_id, post_id=post_id, raw=result)

    def _preflight_image_url(self, image_url: str) -> None:
        if not image_url:
            raise BufferPublishError("Missing public banner image URL")

        LOGGER.info("Preflight public banner image URL for Buffer: %s", image_url)
        try:
            response = requests.head(
                image_url,
                allow_redirects=True,
                timeout=self.timeout_seconds,
                headers={"User-Agent": "BufferBot/1.0"},
            )
            if response.status_code == 405:
                response = requests.get(
                    image_url,
                    stream=True,
                    timeout=self.timeout_seconds,
                    headers={"User-Agent": "BufferBot/1.0"},
                )
        except requests.exceptions.RequestException as exc:
            raise BufferPublishError(
                f"Public banner image URL is not reachable from the bot: {exc}"
            ) from exc

        content_type = response.headers.get("Content-Type", "")
        content_length = response.headers.get("Content-Length", "")
        LOGGER.info(
            "Public banner image URL preflight status=%s content_type=%s content_length=%s",
            response.status_code,
            content_type or "(missing)",
            content_length or "(missing)",
        )
        if response.status_code >= 400:
            raise BufferPublishError(
                f"Public banner image URL returned HTTP {response.status_code}"
            )

    def _graphql(self, query: str, variables: dict[str, Any]) -> dict[str, Any]:
        payload = {
            "query": query,
            "variables": variables,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        last_error = None
        for attempt in range(1, 6):
            try:
                response = requests.post(
                    self.api_base_url,
                    json=payload,
                    headers=headers,
                    timeout=self.timeout_seconds,
                )
                return self._json_or_raise(response)
            except requests.exceptions.RequestException as exc:
                last_error = exc
                time.sleep(2 * attempt)

        raise BufferPublishError(f"Buffer API request failed after retries: {last_error}")

    @staticmethod
    def _json_or_raise(response: requests.Response) -> dict[str, Any]:
        try:
            payload = response.json()
        except ValueError as exc:
            raise BufferPublishError(
                f"Buffer returned non-JSON response {response.status_code}: "
                f"{response.text[:300]}"
            ) from exc

        if response.status_code >= 400:
            raise BufferPublishError(
                f"Buffer API HTTP error {response.status_code}: {payload}"
            )
        if not isinstance(payload, dict):
            raise BufferPublishError(f"Unexpected Buffer API response: {payload}")
        if payload.get("errors"):
            raise BufferPublishError(f"Buffer GraphQL errors: {payload['errors']}")

        data = payload.get("data")
        if not isinstance(data, dict):
            raise BufferPublishError(f"Buffer response did not include data: {payload}")
        return data


def _is_transient_create_error(exc: BufferPublishError) -> bool:
    message = str(exc).casefold()
    transient_fragments = (
        "unexpectederror",
        "service unavailable",
        "failed to fetch image dimensions",
        "temporarily unavailable",
        "timeout",
        "timed out",
        "502",
        "503",
        "504",
    )
    return any(fragment in message for fragment in transient_fragments)
