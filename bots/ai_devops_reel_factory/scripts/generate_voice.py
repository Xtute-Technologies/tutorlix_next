from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path
from typing import Any

from utils import PipelineError, config_path, load_config, output_dir, read_text, setup_logging


LOGGER = logging.getLogger("ai-devops-reel-factory.generate_voice")
XTTS_MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
_TTS_MODEL: Any | None = None
_TTS_DEVICE: str | None = None


def _cuda_available() -> bool:
    try:
        import torch
    except ImportError:
        return False
    return bool(torch.cuda.is_available())


def _require_compatible_torch() -> None:
    try:
        import torch
    except ImportError as exc:
        raise PipelineError("PyTorch is not installed. Rebuild the Docker image.") from exc

    version_text = torch.__version__.split("+", 1)[0]
    major_text, minor_text, *_ = version_text.split(".")
    try:
        major = int(major_text)
        minor = int(minor_text)
    except ValueError:
        LOGGER.warning("Could not parse PyTorch version: %s", torch.__version__)
        return

    if major > 2 or (major == 2 and minor >= 6):
        raise PipelineError(
            "Coqui XTTS v2 checkpoint loading is incompatible with PyTorch >= 2.6 "
            "because torch.load now defaults to weights_only=True. Rebuild with "
            "the pinned requirements: torch==2.5.1, torchvision==0.20.1, "
            "torchaudio==2.5.1."
        )


def _load_tts_model(model_name: str, use_gpu: bool) -> Any:
    global _TTS_MODEL, _TTS_DEVICE
    device = "cuda" if use_gpu else "cpu"
    if _TTS_MODEL is not None and _TTS_DEVICE == device:
        return _TTS_MODEL

    try:
        from TTS.api import TTS
    except ImportError as exc:
        raise PipelineError(
            "Coqui TTS is not installed. Install dependencies with: "
            "pip install -r requirements.txt"
        ) from exc

    LOGGER.info("Loading Coqui XTTS model on %s", device)
    try:
        model = TTS(model_name=model_name, gpu=use_gpu)
    except ImportError as exc:
        raise PipelineError(
            "Coqui XTTS failed to import its transformer dependencies. "
            "Use the pinned dependency set in requirements.txt, especially "
            "transformers==4.36.2, then rebuild the Docker image."
        ) from exc
    except TypeError:
        try:
            model = TTS(model_name=model_name)
            if hasattr(model, "to"):
                model.to(device)
        except ImportError as exc:
            raise PipelineError(
                "Coqui XTTS failed to import its transformer dependencies. "
                "Use the pinned dependency set in requirements.txt, especially "
                "transformers==4.36.2, then rebuild the Docker image."
            ) from exc

    _TTS_MODEL = model
    _TTS_DEVICE = device
    return model


def _model_name_from_config(config: dict[str, Any]) -> str:
    configured = str(config.get("voice_clone_model", "xtts_v2")).strip()
    if configured in {"xtts_v2", "coqui_xtts_v2"}:
        return XTTS_MODEL_NAME
    return configured


def _require_coqui_tos_agreement(model_name: str) -> None:
    if "xtts" not in model_name.lower():
        return
    if os.getenv("COQUI_TOS_AGREED") == "1":
        return
    raise PipelineError(
        "Coqui XTTS requires license/TOS confirmation before model download. "
        "If you have purchased a commercial Coqui license or agree to the CPML "
        "terms for your use case, set COQUI_TOS_AGREED=1 in the bot env file."
    )


def generate_voice(config: dict[str, Any] | None = None) -> Path:
    config = config or load_config()
    outputs = output_dir(config)
    script_path = outputs / "script.txt"
    script_text = read_text(script_path)
    if not script_text:
        raise PipelineError(f"Script is empty: {script_path}")

    speaker_wav = config_path(config, "speaker_wav", must_exist=True)
    if speaker_wav.suffix.lower() not in {".wav", ".mp3", ".flac", ".m4a"}:
        raise PipelineError(f"Voice sample should be an audio file: {speaker_wav}")

    language = str(config.get("language", "hi")).strip() or "hi"
    _require_compatible_torch()
    use_gpu = _cuda_available()
    if not use_gpu:
        LOGGER.warning("CUDA GPU is unavailable. XTTS will run on CPU and may be slow.")

    model_name = _model_name_from_config(config)
    _require_coqui_tos_agreement(model_name)
    tts = _load_tts_model(model_name, use_gpu)
    output_path = outputs / "voice.wav"
    LOGGER.info("Generating cloned voice to %s with language=%s", output_path, language)
    try:
        tts.tts_to_file(
            text=script_text,
            speaker_wav=[str(speaker_wav)],
            language=language,
            file_path=str(output_path),
        )
    except Exception as exc:
        raise PipelineError(f"XTTS voice generation failed: {exc}") from exc

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise PipelineError(f"XTTS did not create a valid voice file: {output_path}")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate cloned narration audio.")
    parser.add_argument("--config", default=None, help="Path to config.json")
    args = parser.parse_args()

    setup_logging()
    path = generate_voice(load_config(args.config))
    print(path)


if __name__ == "__main__":
    main()
