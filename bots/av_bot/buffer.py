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


class BufferPublishError(RuntimeError):
    """Raised when Buffer rejects or cannot complete a publish call."""


@dataclass(frozen=True)
class BufferPostResult:
    channel_id: str
    post_id: str
    raw: dict[str, Any]


CREATE_TEXT_POST_MUTATION = """
mutation CreateAvLinkedInPost($input: CreatePostInput!) {
  createPost(input: $input) {
    __typename
    ... on PostActionSuccess {
      post {
        id
        text
        dueAt
        status
        channelId
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

    def publish_text_posts(self, *, text: str) -> tuple[BufferPostResult, ...]:
        results = []
        for channel_id in self.channel_ids:
            results.append(self.publish_text_post(channel_id=channel_id, text=text))
        return tuple(results)

    def publish_text_post(self, *, channel_id: str, text: str) -> BufferPostResult:
        payload = {
            "text": text,
            "channelId": channel_id,
            "schedulingType": self.scheduling_type,
            "mode": self.post_mode,
            "source": "tutorlix-av-bot",
        }
        data = self._graphql(CREATE_TEXT_POST_MUTATION, {"input": payload})
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
