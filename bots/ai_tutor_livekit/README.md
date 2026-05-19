# Tutorlix LiveKit AI Tutor

Voice agent dispatched into student AI tutor rooms.

## Environment

Set these variables in the worker environment:

```sh
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_AI_AGENT_NAME=tutorlix-ai-tutor
GROQ_API_KEY=...
GROQ_LLM_MODEL=llama-3.1-8b-instant
GROQ_STT_MODEL=whisper-large-v3-turbo
PIPER_TTS_URL=http://127.0.0.1:5000/
```

`LIVEKIT_AI_AGENT_NAME` must match the backend setting. The backend dispatches this worker when a student starts an AI tutor call for an active paid course booking.

The worker uses Groq for LLM/STT and Piper HTTP for speech output. `PIPER_TTS_URL` must point to a reachable Piper HTTP server from inside the worker container.

The worker loads env files in this order:

1. repo root `.env`
2. `backend/.env`
3. `bots/ai_tutor_livekit/.env`

Use `bots/ai_tutor_livekit/.env` for worker-specific overrides.

## Local Run

```sh
pip install -r bots/ai_tutor_livekit/requirements.txt
python -m bots.ai_tutor_livekit dev
```

## Production Run

```sh
python -m bots.ai_tutor_livekit start
```
