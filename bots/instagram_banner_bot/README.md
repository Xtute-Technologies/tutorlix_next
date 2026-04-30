# Instagram Banner Bot

This bot creates a branded square JPEG banner, builds an Instagram caption, converts the banner into a short MP4 Reel by default, and can publish it through the Instagram content publishing API at 11:00 AM and 5:00 PM.

The bot is standalone and does not depend on the Django or Next.js runtime.

## Important Instagram Requirement

Instagram's publishing API does not upload the local media file directly. The generated MP4 Reel, or JPEG if `BOT_PUBLISH_MEDIA_TYPE=image`, must be reachable by Meta from a public HTTPS URL. Serve or upload `bots/instagram_banner_bot/output/` from a public static host, CDN, S3 bucket, or web server, then set `PUBLIC_MEDIA_BASE_URL` to that public directory.

The Instagram account must be eligible for API publishing, and the access token must include the current Meta permissions for Instagram content publishing.

## Setup

```bash
cd /Users/apple/tutorlix_next
python3 -m venv bots/instagram_banner_bot/.venv
source bots/instagram_banner_bot/.venv/bin/activate
pip install -r bots/instagram_banner_bot/requirements.txt
cp bots/instagram_banner_bot/.env.example bots/instagram_banner_bot/.env
```

Edit `bots/instagram_banner_bot/.env` and set:

```dotenv
IG_USER_ID=your_instagram_user_id
IG_ACCESS_TOKEN=your_long_lived_access_token
PUBLIC_MEDIA_BASE_URL=https://your-public-host.example/instagram-banners
BOT_DRY_RUN=false
BOT_LOGO_URL=https://tutorlix.com/logo.png
OPENAI_API_KEY=your_openai_api_key
OPENAI_IMAGE_ENABLED=true
OPENAI_IMAGE_MODEL=gpt-image-1
BOT_PUBLISH_MEDIA_TYPE=reel
BOT_REEL_DURATION_SECONDS=8
BOT_REEL_SHARE_TO_FEED=true
BOT_REEL_AUDIO_FILE=bots/instagram_banner_bot/bombinsound-trending-instagram-reels-music-499599.mp3
BOT_POST_SCHEDULE_TIMES=11:00,17:00
BOT_SCHEDULE_TIMEZONE=Asia/Kolkata
```

When `OPENAI_API_KEY` is set, `designer.py` uses OpenAI to create a no-text
visual background, then draws the final banner text locally. Set
`OPENAI_IMAGE_ENABLED=false` to fall back to the fully local Pillow renderer.

Optional OpenAI image settings:

```dotenv
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_IMAGE_PROMPT=Create a square no-text IB Maths course background for {brand_name}. Leave room for text overlays.
OPENAI_IMAGE_SIZE=1024x1024
OPENAI_IMAGE_QUALITY=medium
OPENAI_IMAGE_OUTPUT_FORMAT=png
OPENAI_IMAGE_TIMEOUT_SECONDS=180
```

The generated background prompt should ask for no text, letters, logos, or
watermarks because the readable copy is added by `designer.py`.

`OPENAI_IMAGE_PROMPT` supports `{brand_name}`, `{brand_tagline}`, `{headline}`,
`{subheadline}`, `{cta}`, `{caption}`, `{hashtags}`, `{content_index}`,
`{variation_seed}`, and `{date}`.

## Reel Publishing

By default, the bot publishes a Reel. It first creates the normal square banner
image, then uses `ffmpeg` to produce a 1080x1920 MP4 with the banner centered on
a blurred background.

Relevant settings:

```dotenv
BOT_PUBLISH_MEDIA_TYPE=reel
BOT_REEL_DURATION_SECONDS=8
BOT_REEL_SHARE_TO_FEED=true
BOT_REEL_AUDIO_FILE=bots/instagram_banner_bot/bombinsound-trending-instagram-reels-music-499599.mp3
BOT_PUBLISH_WAIT_SECONDS=180
```

Set `BOT_PUBLISH_MEDIA_TYPE=image` if you need to publish the JPEG as a normal
image post again.

## Scheduled Posting

In loop mode, the bot waits for the next configured posting time instead of
posting immediately on container start.

```dotenv
BOT_POST_SCHEDULE_TIMES=11:00,17:00
BOT_SCHEDULE_TIMEZONE=Asia/Kolkata
```

Times can be written as 24-hour values (`11:00,17:00`) or 12-hour values
(`11:00 AM,5:00 PM`). Set `BOT_POST_SCHEDULE_TIMES=` to fall back to
`BOT_POST_INTERVAL_SECONDS`.

## Run

Generate one banner without publishing:

```bash
python -m bots.instagram_banner_bot --env-file bots/instagram_banner_bot/.env --once --dry-run
```

Publish one banner:

```bash
python -m bots.instagram_banner_bot --env-file bots/instagram_banner_bot/.env --once --publish
```

Run forever and publish at the configured schedule times:

```bash
python -m bots.instagram_banner_bot --env-file bots/instagram_banner_bot/.env --loop --publish
```

Manual Docker run on the VPS:

```bash
docker rm -f instagram-banner-bot-prod

docker run -d \
  --name instagram-banner-bot-prod \
  --restart unless-stopped \
  --network host \
  --env-file /var/www/tutorlix-prod/instagram-bot.env \
  -v /var/www/tutorlix-prod/instagram-bot-output:/app/bots/instagram_banner_bot/output \
  ankitvashishta7/tutorlix-instagram-banner-bot-prod:latest
```

The container starts in `--loop --publish` mode, so it waits until the next
configured schedule time. With the default schedule, it posts at 11:00 AM and
5:00 PM in `BOT_SCHEDULE_TIMEZONE`.

For a cron-based deployment instead of a long-running process:

```cron
0 */2 * * * cd /Users/apple/tutorlix_next && /Users/apple/tutorlix_next/bots/instagram_banner_bot/.venv/bin/python -m bots.instagram_banner_bot --env-file bots/instagram_banner_bot/.env --once --publish >> bots/instagram_banner_bot/bot.log 2>&1
```

## Edit Banner Content

Update `bots/instagram_banner_bot/content.json`. The bot rotates through the list and stores progress in `bots/instagram_banner_bot/output/state.json`.

Each item supports:

```json
{
  "headline": "Master one concept today",
  "subheadline": "Short lessons, clear notes, and focused practice.",
  "cta": "Start learning with Tutorlix",
  "caption": "Your Instagram caption text.",
  "hashtags": ["#Tutorlix", "#OnlineLearning"]
}
```

## How Publishing Works

The bot calls Meta's Graph API in two steps:

1. `POST /{ig-user-id}/media` with `media_type=REELS`, `video_url`, `caption`, and `share_to_feed` when publishing a Reel. For image mode, it sends `image_url` and `caption`.
2. `POST /{ig-user-id}/media_publish` with the returned container id.

Relevant Meta docs:

- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/
- https://www.postman.com/meta/instagram/request/ka3qt0z/create-a-media-container
