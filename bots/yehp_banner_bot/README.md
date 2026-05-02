# YEHP Banner Bot

This bot creates branded square JPEG banners for YEHP herbal wellness topics,
converts them into Instagram Reel MP4 videos with the bundled background sound,
builds Instagram captions, and can publish through Instagram's content publishing
API at 12:00 PM and 6:00 PM.

The bot randomly chooses one configured topic on each run:

- Herbal weight management
- Kidney wellness support
- High fever care guidance
- Herbal skin wellness

The copy is intentionally consultation-oriented. It avoids cure and "no side
effects" claims because herbal products can have side effects, interactions, and
quality risks.

## Important Instagram Requirement

Instagram's publishing API does not upload the local video file directly. The
generated MP4 Reel must be reachable by Meta from a public HTTPS URL. Serve or
upload `bots/yehp_banner_bot/output/` from a public static host, CDN, S3 bucket,
or web server, then set `PUBLIC_MEDIA_BASE_URL` to that public directory.

## Setup

```bash
cd /Users/apple/tutorlix_next
python3 -m venv bots/yehp_banner_bot/.venv
source bots/yehp_banner_bot/.venv/bin/activate
pip install -r bots/yehp_banner_bot/requirements.txt
cp bots/yehp_banner_bot/.env.example bots/yehp_banner_bot/.env
```

Edit `bots/yehp_banner_bot/.env` and set:

```dotenv
BOT_BRAND_NAME=YEHP
BOT_BRAND_TAGLINE=Doctor-guided herbal wellness
BOT_LOGO_URL=https://your-public-logo-url/logo.png
BOT_WEBSITE_URL=https://your-website.example
BOT_CONTACT_ADDRESS=Shop No. F19-F23, Eldeco Station 1 Mall, Sector 12, Faridabad 121007
BOT_CONTACT_PHONE=+91-8168654010
BOT_DRY_RUN=false
BOT_POST_SCHEDULE_TIMES=12:00,18:00
BOT_SCHEDULE_TIMEZONE=Asia/Kolkata
BOT_RUN_ON_START=true
BOT_PUBLISH_MEDIA_TYPE=reel
BOT_REEL_AUDIO_FILE=bots/yehp_banner_bot/bombinsound-trending-instagram-reels-music-499599.mp3
PUBLIC_MEDIA_BASE_URL=https://your-public-host.example/yehp-banners

IG_USER_ID=your_instagram_user_id
IG_ACCESS_TOKEN=your_long_lived_access_token

OPENAI_API_KEY=your_openai_api_key
OPENAI_IMAGE_ENABLED=true
OPENAI_IMAGE_MODEL=gpt-image-1
```

When `OPENAI_API_KEY` is set, `designer.py` uses OpenAI to create a no-text
background with a realistic female doctor on the right, then draws the final
banner text locally on the left. Set `OPENAI_IMAGE_ENABLED=false` to fall back
to the fully local Pillow renderer.

Optional OpenAI image settings:

```dotenv
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_IMAGE_SIZE=1024x1024
OPENAI_IMAGE_QUALITY=medium
OPENAI_IMAGE_OUTPUT_FORMAT=png
OPENAI_IMAGE_TIMEOUT_SECONDS=180
```

## Run

Generate one Reel without publishing:

```bash
python -m bots.yehp_banner_bot --env-file bots/yehp_banner_bot/.env --once --dry-run
```

Publish one Reel:

```bash
python -m bots.yehp_banner_bot --env-file bots/yehp_banner_bot/.env --once --publish
```

Run forever on the fixed schedule. By default it posts once immediately on
startup, then waits until the next 12:00 PM or 6:00 PM Asia/Kolkata slot:

```bash
python -m bots.yehp_banner_bot --env-file bots/yehp_banner_bot/.env --loop --publish
```

Manual Docker run on the VPS:

```bash
docker rm -f yehp-banner-bot-prod

docker run -d \
  --name yehp-banner-bot-prod \
  --restart unless-stopped \
  --network host \
  --env-file /var/www/tutorlix-prod/yehp-bot.env \
  -e BOT_RUN_ON_START=true \
  -v /var/www/tutorlix-prod/yehpbot-output:/app/bots/yehp_banner_bot/output \
  ankitvashishta7/yehp-banner-bot-prod:latest
```

The container starts in `--loop --publish` mode. With the default schedule it
posts once when the Docker container starts, then posts at `12:00` and `18:00`
in `BOT_SCHEDULE_TIMEZONE`. The interval setting is only used if
`BOT_POST_SCHEDULE_TIMES` is empty.

## Edit Banner Content

Update `bots/yehp_banner_bot/content.json`. Each item supports:

```json
{
  "headline": "Herbal Weight Management",
  "subheadline": "Doctor-guided herbal wellness plans for healthy weight goals.",
  "cta": "Book a consultation",
  "caption": "Your Instagram caption text.",
  "hashtags": ["#YEHP", "#HerbalWellness"]
}
```

## How Publishing Works

The bot calls Meta's Graph API in two steps:

1. `POST /{ig-user-id}/media` with `media_type=REELS`, `video_url`, and `caption`.
2. `POST /{ig-user-id}/media_publish` with the returned container id.
