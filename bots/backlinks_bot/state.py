from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

from .config import BacklinkItem, TargetSite
from .publishers import PublishResult


class StateStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def load(self) -> dict[str, Any]:
        if not self.path.exists():
            return {"cursor": 0, "history": []}
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {"cursor": 0, "history": []}
        if not isinstance(data, dict):
            return {"cursor": 0, "history": []}
        data.setdefault("cursor", 0)
        data.setdefault("history", [])
        return data

    def choose_batch(
        self,
        targets: tuple[TargetSite, ...],
        backlinks: tuple[BacklinkItem, ...],
        posts_per_run: int,
    ) -> tuple[tuple[TargetSite, BacklinkItem], ...]:
        pairs = [(target, backlink) for target in targets for backlink in backlinks]
        if not pairs:
            return ()

        state = self.load()
        cursor = int(state.get("cursor", 0)) % len(pairs)
        batch = []
        for offset in range(min(posts_per_run, len(pairs))):
            batch.append(pairs[(cursor + offset) % len(pairs)])
        return tuple(batch)

    def record_results(self, results: tuple[PublishResult, ...]) -> None:
        if not results:
            return

        state = self.load()
        history = state.get("history", [])
        if not isinstance(history, list):
            history = []

        now = datetime.now(timezone.utc).isoformat()
        for result in results:
            history.append(
                {
                    "created_at": now,
                    "target_id": result.target_id,
                    "backlink_id": result.backlink_id,
                    "remote_id": result.remote_id,
                    "remote_url": result.remote_url,
                    "status": result.status,
                    "dry_run": result.dry_run,
                }
            )

        state["cursor"] = int(state.get("cursor", 0)) + len(results)
        state["history"] = history[-500:]
        self.path.write_text(
            json.dumps(state, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

