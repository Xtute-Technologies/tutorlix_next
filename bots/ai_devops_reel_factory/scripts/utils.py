from __future__ import annotations

import json
import logging
import os
import random
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "config.json"
SCRIPT_METADATA_FILENAME = "script_metadata.json"


class PipelineError(RuntimeError):
    """Raised for expected pipeline failures with actionable messages."""


def setup_logging(level: int = logging.INFO) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def load_config(config_path: str | Path | None = None) -> dict[str, Any]:
    path = resolve_project_path(config_path or DEFAULT_CONFIG_PATH)
    if not path.exists():
        raise PipelineError(f"Config file not found: {path}")
    try:
        config = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise PipelineError(f"Invalid JSON in config file {path}: {exc}") from exc
    if not isinstance(config, dict):
        raise PipelineError("config.json must contain a JSON object")
    return config


def resolve_project_path(value: str | Path, *, base_dir: Path | None = None) -> Path:
    path = Path(value).expanduser()
    if path.is_absolute():
        return path
    return (base_dir or PROJECT_ROOT) / path


def config_path(config: dict[str, Any], key: str, *, must_exist: bool = False) -> Path:
    if key not in config or not str(config[key]).strip():
        raise PipelineError(f"Missing required config key: {key}")
    path = resolve_project_path(str(config[key]))
    if must_exist and not path.exists():
        raise PipelineError(f"Configured path for {key} does not exist: {path}")
    return path


def output_dir(config: dict[str, Any]) -> Path:
    path = config_path(config, "output_dir")
    path.mkdir(parents=True, exist_ok=True)
    return path


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise PipelineError(f"JSON file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise PipelineError(f"Invalid JSON in {path}: {exc}") from exc


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8").strip()
    except FileNotFoundError as exc:
        raise PipelineError(f"Text file not found: {path}") from exc


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def choose_random_file(directory: Path, suffixes: Iterable[str]) -> Path:
    suffix_set = {suffix.lower() for suffix in suffixes}
    if not directory.exists():
        raise PipelineError(f"Directory does not exist: {directory}")
    candidates = sorted(
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix.lower() in suffix_set
    )
    if not candidates:
        suffix_text = ", ".join(sorted(suffix_set))
        raise PipelineError(f"No files with suffixes {suffix_text} found in {directory}")
    return random.choice(candidates)


def run_command(
    command: list[str],
    *,
    cwd: Path | None = None,
    logger: logging.Logger | None = None,
    timeout: int | None = None,
) -> subprocess.CompletedProcess[str]:
    log = logger or logging.getLogger("ai-devops-reel-factory")
    log.info("Running command in %s: %s", cwd or Path.cwd(), " ".join(command))
    started = time.monotonic()
    completed = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    elapsed = time.monotonic() - started
    if completed.stdout.strip():
        log.info("Command stdout: %s", completed.stdout.strip()[-1200:])
    if completed.stderr.strip():
        log.info("Command stderr: %s", completed.stderr.strip()[-1200:])
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "").strip()
        raise PipelineError(
            f"Command failed with exit code {completed.returncode} after {elapsed:.1f}s: "
            f"{' '.join(command)}\n{detail[-1600:]}"
        )
    return completed


def find_newest_file(
    roots: Iterable[Path],
    *,
    suffixes: Iterable[str],
    modified_after: float | None = None,
) -> Path | None:
    suffix_set = {suffix.lower() for suffix in suffixes}
    candidates: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        iterator = root.rglob("*") if root.is_dir() else [root]
        for path in iterator:
            if not path.is_file() or path.suffix.lower() not in suffix_set:
                continue
            if modified_after is not None and path.stat().st_mtime < modified_after:
                continue
            candidates.append(path)
    if not candidates:
        return None
    return max(candidates, key=lambda candidate: candidate.stat().st_mtime)


def copy_to_output(source: Path, destination: Path) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if source.resolve() != destination.resolve():
        shutil.copy2(source, destination)
    if not destination.exists():
        raise PipelineError(f"Expected output was not created: {destination}")
    return destination


def metadata_path(config: dict[str, Any]) -> Path:
    return output_dir(config) / SCRIPT_METADATA_FILENAME


def load_script_metadata(config: dict[str, Any]) -> dict[str, Any]:
    path = metadata_path(config)
    if not path.exists():
        return {}
    data = read_json(path)
    return data if isinstance(data, dict) else {}


def str_to_bool(value: str | bool | None, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return value.strip().lower() in {"1", "true", "yes", "on"}


def load_dotenv_file() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(PROJECT_ROOT / ".env")


def python_executable() -> str:
    return sys.executable or "python"
