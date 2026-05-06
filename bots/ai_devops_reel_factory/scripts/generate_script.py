from __future__ import annotations

import argparse
import json
import logging
import random
from pathlib import Path
from typing import Any

from utils import (
    PROJECT_ROOT,
    PipelineError,
    load_config,
    metadata_path,
    output_dir,
    read_json,
    setup_logging,
    write_json,
    write_text,
)


LOGGER = logging.getLogger("ai-devops-reel-factory.generate_script")
DEFAULT_CTA = "Follow for more DevOps concepts."


def _load_list(path: Path, label: str) -> list[Any]:
    data = read_json(path)
    if not isinstance(data, list) or not data:
        raise PipelineError(f"{label} must be a non-empty JSON array: {path}")
    return data


def _concept_script(concept: dict[str, Any]) -> str:
    script = str(concept.get("script", "")).strip()
    if script:
        return script

    title = str(concept.get("title", "")).strip()
    topic = str(concept.get("topic", "this concept")).strip()
    diagram = concept.get("diagram") or []
    flow = " to ".join(str(item).strip() for item in diagram if str(item).strip())
    if flow:
        return f"{title or topic}: {topic} ko samajhne ke liye flow dekho: {flow}."
    return f"{title or topic}: Is DevOps concept ko simple aur practical tarike se samjho."


def _trim_words(text: str, max_words: int) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]).rstrip(".,") + "."


def build_caption(concept: dict[str, Any], hook: str) -> str:
    topic = str(concept.get("topic", "DevOps")).strip() or "DevOps"
    title = str(concept.get("title", topic)).strip() or topic
    hashtags = "#DevOps #CloudComputing #SRE #Kubernetes #Docker #TechLearning"
    return f"{hook}\n\n{title}\n\n{hashtags}"


def generate_script(config: dict[str, Any] | None = None) -> dict[str, Any]:
    config = config or load_config()
    concepts = _load_list(PROJECT_ROOT / "data" / "concepts.json", "concepts.json")
    hooks = _load_list(PROJECT_ROOT / "data" / "hooks.json", "hooks.json")

    concept = random.choice(concepts)
    if not isinstance(concept, dict):
        raise PipelineError("Each concept entry must be a JSON object")

    hook = str(random.choice(hooks)).strip()
    if not hook:
        raise PipelineError("Selected hook is empty")

    cta = str(config.get("cta", DEFAULT_CTA)).strip() or DEFAULT_CTA
    max_words = int(config.get("max_script_words", 120))
    narration = "\n".join(
        part
        for part in [
            hook,
            _trim_words(_concept_script(concept), max_words),
            cta,
        ]
        if part.strip()
    )

    outputs = output_dir(config)
    script_path = outputs / "script.txt"
    write_text(script_path, narration)

    metadata = {
        "hook": hook,
        "cta": cta,
        "script": narration,
        "caption": build_caption(concept, hook),
        "concept": concept,
    }
    write_json(metadata_path(config), metadata)
    LOGGER.info(
        "Selected concept id=%s topic=%s and wrote %s",
        concept.get("id", "unknown"),
        concept.get("topic", "unknown"),
        script_path,
    )
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a Reel narration script.")
    parser.add_argument("--config", default=None, help="Path to config.json")
    args = parser.parse_args()

    setup_logging()
    config = load_config(args.config)
    metadata = generate_script(config)
    print(
        json.dumps(
            {
                "script_path": str(output_dir(config) / "script.txt"),
                "metadata_path": str(metadata_path(config)),
                "concept_id": metadata["concept"].get("id"),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
