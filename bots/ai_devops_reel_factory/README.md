# AI DevOps Reel Factory

Python pipeline for generating short vertical DevOps/cloud reels with a face image, cloned voice, LivePortrait movement, Wav2Lip lip sync, MoviePy rendering, subtitles, code visuals, and Instagram Graph API publishing.

The pipeline is independent on every run. Concepts and hooks can repeat. There is no unused-concept tracking and no `status.json`.

## Folder Layout

```text
bots/ai_devops_reel_factory/
├── assets/
│   ├── face.png
│   ├── voice_sample.wav
│   ├── logo.png
│   ├── driving_videos/
│   ├── music/
│   └── backgrounds/
├── data/
│   ├── concepts.json
│   └── hooks.json
├── outputs/
└── scripts/
```

Upload your own `face.png`, `voice_sample.wav`, and at least one driving video into `assets/driving_videos/`. Optional files are `assets/logo.png`, background music in `assets/music/`, and background images/videos in `assets/backgrounds/`.

## Google Colab Setup

1. In Colab, open `Runtime > Change runtime type`.
2. Select `T4 GPU`.
3. Mount or upload this folder to `/content/tutorlix_next/bots/ai_devops_reel_factory`.
4. Install system packages and Python dependencies:

```bash
apt-get update
apt-get install -y ffmpeg git fonts-noto-core
cd /content/tutorlix_next/bots/ai_devops_reel_factory
pip install -r requirements.txt
```

Check GPU:

```bash
python - <<'PY'
import torch
print("CUDA:", torch.cuda.is_available())
print("GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU")
PY
```

## LivePortrait Installation

Install LivePortrait in the path configured by `config.json`:

```bash
cd /content
git clone https://github.com/KwaiVGI/LivePortrait.git
cd /content/LivePortrait
pip install -r requirements.txt
```

Download LivePortrait checkpoints exactly as described in the official LivePortrait README. The pipeline expects:

```json
"liveportrait_dir": "/content/LivePortrait"
```

The wrapper runs:

```bash
python inference.py -s assets/face.png -d assets/driving_videos/calm_explain.mp4
```

and copies the newest generated MP4 to `outputs/liveportrait.mp4`.

## Wav2Lip Installation

Install Wav2Lip in the path configured by `config.json`:

```bash
cd /content
git clone https://github.com/Rudrabha/Wav2Lip.git
cd /content/Wav2Lip
pip install -r requirements.txt
mkdir -p checkpoints
```

Download `wav2lip_gan.pth` and place it at one of:

```text
/content/Wav2Lip/wav2lip_gan.pth
/content/Wav2Lip/checkpoints/wav2lip_gan.pth
```

The wrapper creates:

```text
outputs/synced_face.mp4
```

## XTTS Voice Cloning

Put your voice sample here:

```text
assets/voice_sample.wav
```

Recommended sample quality:

- 10 to 30 seconds
- clean speech
- minimal background noise
- WAV format if possible

The voice language comes from `config.json`:

```json
"language": "hi"
```

Use `hi` for Hindi/Hinglish, `en` for English, or another XTTS-supported language code.

XTTS requires license/TOS confirmation before model download. If you have purchased a commercial Coqui license or agree to the CPML terms for your use case, add this to your env file:

```env
COQUI_TOS_AGREED=1
```

The Docker image pins `TTS==0.22.0` and `transformers==4.36.2` because newer Transformers releases removed legacy exports used by XTTS. If you see an import error for `BeamSearchScorer`, rebuild the Docker image from the latest repo instead of patching the running container.

## Assets

Required:

```text
assets/face.png
assets/voice_sample.wav
assets/driving_videos/calm_explain.mp4
```

Optional:

```text
assets/logo.png
assets/music/background.mp3
assets/backgrounds/cloud.mp4
assets/backgrounds/grid.png
```

If music, logo, or backgrounds are missing, rendering continues without failing.

## Manual Run

Render only:

```bash
cd /content/tutorlix_next/bots/ai_devops_reel_factory
python scripts/main.py --skip-post
```

Run the full pipeline but do not call Meta APIs:

```bash
python scripts/main.py --dry-run-post
```

Expected final file:

```text
outputs/final_reel.mp4
```

Individual steps:

```bash
python scripts/generate_script.py
python scripts/generate_voice.py
python scripts/run_liveportrait.py
python scripts/run_wav2lip.py
python scripts/render_reel.py
python scripts/post_instagram.py --dry-run
```

## Scheduler

`config.json` schedules daily runs at 09:00 and 16:00 in `Asia/Kolkata`.

```bash
python scripts/scheduler.py
```

Run once immediately, then keep scheduling:

```bash
python scripts/scheduler.py --run-now
```

Use dry-run posting while scheduled:

```bash
python scripts/scheduler.py --run-now --dry-run-post
```

The scheduler prevents overlapping runs. If the 09:00 run is still active at 16:00, the 16:00 run is skipped and the scheduler continues.

## Jenkins Production Deploy

The root [JenkinsFileProd](../../JenkinsFileProd) includes a new `BUILD_TARGET`:

```text
ai_devops_reel_factory
```

It builds [Dockerfile.prod](Dockerfile.prod), pushes:

```text
<dockerhub-user>/ai-devops-reel-factory-prod:latest
```

and runs a long-lived scheduler container named:

```text
ai-devops-reel-factory-prod
```

The production Docker command runs one pipeline immediately when the container starts, then keeps the daily scheduler active for 09:00 and 16:00 in the configured timezone.

Expected production host files/directories:

```text
/var/www/tutorlix-prod/ai-devops-reel-factory.env
/var/www/tutorlix-prod/ai-devops-reel-factory-assets/face.png
/var/www/tutorlix-prod/ai-devops-reel-factory-assets/voice_sample.wav
/var/www/tutorlix-prod/ai-devops-reel-factory-assets/driving_videos/*.mp4
/var/www/tutorlix-prod/ai-devops-reel-factory-output
/var/www/tutorlix-prod/ai-devops-reel-factory-model-cache
/var/www/tutorlix-prod/LivePortrait
/var/www/tutorlix-prod/Wav2Lip
```

The Jenkins container mounts:

```text
assets  -> /app/assets
outputs -> /app/outputs
XTTS model cache -> /root/.local/share/tts
LivePortrait -> /content/LivePortrait
Wav2Lip -> /content/Wav2Lip
```

By default, the Docker run does not pass GPU flags. If the production host has NVIDIA Docker configured, set `AI_DEVOPS_REEL_GPU_ARGS` in `JenkinsFileProd` to `--gpus all`.

## Instagram Graph API Setup

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Set:

```text
INSTAGRAM_USER_ID=
INSTAGRAM_ACCESS_TOKEN=
PUBLIC_VIDEO_BASE_URL=
COQUI_TOS_AGREED=1
```

Requirements:

- Instagram professional account, usually Business or Creator depending on your Meta app flow.
- Instagram account linked to a Facebook Page.
- Meta app with content publishing permissions approved.
- Long-lived user access token.
- Public HTTPS URL where Meta can fetch `final_reel.mp4`.

Common permissions for Instagram Graph API content publishing include:

```text
instagram_basic
instagram_content_publish
pages_read_engagement
pages_show_list
```

Some newer app flows expose business-scoped permission names such as:

```text
instagram_business_basic
instagram_business_content_publish
```

Use the exact permission names shown in your Meta Developer dashboard for your selected Instagram API product.

Publishing flow implemented in `scripts/post_instagram.py`:

1. Confirm `outputs/final_reel.mp4` exists.
2. Build the public video URL from `PUBLIC_VIDEO_BASE_URL`.
3. Preflight the public URL with a Meta-like user agent.
4. Create a Reel media container with `media_type=REELS`.
5. Poll `status_code` until `FINISHED`.
6. Publish with `/{ig-user-id}/media_publish`.
7. Retry with clear errors on failures.

Meta references:

- Content Publishing guide: https://developers.facebook.com/docs/instagram-api/guides/content-publishing/
- IG User media reference: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
- Reels API announcement: https://developers.facebook.com/blog/post/2022/06/27/introducing-reels-apis-to-instagram-platform/

## Public Video URL

Instagram Graph API does not upload the local file directly in this implementation. Meta must fetch the video from a public HTTPS URL.

Examples:

```text
PUBLIC_VIDEO_BASE_URL=https://cdn.example.com/reels
```

creates:

```text
https://cdn.example.com/reels/final_reel.mp4
```

You can also set the exact file URL:

```text
PUBLIC_VIDEO_BASE_URL=https://cdn.example.com/reels/final_reel.mp4
```

Use S3, Cloud Storage, Cloudflare R2, a public CDN, or another HTTPS host. Make sure the file is reachable without cookies, auth headers, or IP allowlists.

## Long-Lived Access Token

Create a short-lived user token from Meta Developer tools or your Facebook Login flow with the required Instagram publishing permissions. Then exchange it for a long-lived token:

```bash
curl -G "https://graph.facebook.com/v25.0/oauth/access_token" \
  --data-urlencode "grant_type=fb_exchange_token" \
  --data-urlencode "client_id=YOUR_META_APP_ID" \
  --data-urlencode "client_secret=YOUR_META_APP_SECRET" \
  --data-urlencode "fb_exchange_token=SHORT_LIVED_USER_TOKEN"
```

Put the returned token in `.env`:

```text
INSTAGRAM_ACCESS_TOKEN=EA...
```

Do not commit `.env`. The project `.gitignore` excludes it.

## Config

Main settings are in `config.json`:

```json
{
  "language": "hi",
  "timezone": "Asia/Kolkata",
  "schedule_times": ["09:00", "16:00"],
  "reel_width": 1080,
  "reel_height": 1920,
  "fps": 30,
  "voice_clone_model": "xtts_v2",
  "speaker_wav": "assets/voice_sample.wav",
  "face_image": "assets/face.png",
  "liveportrait_dir": "/content/LivePortrait",
  "wav2lip_dir": "/content/Wav2Lip",
  "output_dir": "outputs",
  "subtitle_font_size": 60,
  "face_position": "bottom_right",
  "allow_concept_repeat": true,
  "auto_post_instagram": true
}
```

To render without posting, either run with `--skip-post` or set:

```json
"auto_post_instagram": false
```

## Expected Outputs

Each pipeline run writes:

```text
outputs/script.txt
outputs/voice.wav
outputs/liveportrait.mp4
outputs/synced_face.mp4
outputs/final_reel.mp4
```

It also writes `outputs/script_metadata.json` for the current run so the render and post steps know the selected hook, concept, subtitles, code snippet, and caption. This is not status tracking.

## Troubleshooting

`voice_sample.wav missing`

Upload your sample to `assets/voice_sample.wav` or change `speaker_wav` in `config.json`.

`CUDA unavailable`

Colab may have started on CPU. Change runtime to T4 GPU and restart the runtime.

`LivePortrait inference.py not found`

Clone LivePortrait into `/content/LivePortrait` or update `liveportrait_dir`.

`LivePortrait finished but no MP4 was found`

Check that checkpoints are installed and that the LivePortrait command works manually.

`Wav2Lip checkpoint is missing`

Place `wav2lip_gan.pth` in `/content/Wav2Lip/checkpoints/`.

`MoviePy or ffmpeg error`

Run `ffmpeg -version`. Reinstall with `apt-get install -y ffmpeg`.

`Hindi subtitles show square boxes`

Install Devanagari fonts:

```bash
apt-get install -y fonts-noto-core
```

You can also add a `font_path` key in `config.json` pointing to a TTF font.

`Instagram container ERROR or EXPIRED`

Check that the video URL is public HTTPS, MP4/H.264/AAC, vertical 9:16, and under the current Instagram Reels API limits. Recreate the media container instead of retrying the same expired container.

`Meta says permission denied`

Confirm the Instagram account is professional, linked to a Facebook Page, your app has the right content publishing permissions, and the long-lived access token belongs to a user with Page content permissions.
