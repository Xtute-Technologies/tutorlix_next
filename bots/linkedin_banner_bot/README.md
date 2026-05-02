# LinkedIn Banner Bot

This bot creates a branded square JPEG banner, builds LinkedIn post text, and publishes the image post through Buffer's API.

The bot is standalone and does not depend on the Django or Next.js runtime.

## Important Buffer Requirement

Buffer does not upload the local image file from this bot directly. The generated JPEG must be reachable from a public HTTPS URL. Serve or upload `bots/linkedin_banner_bot/output/` from a public static host, CDN, S3 bucket, or web server, then set `PUBLIC_MEDIA_BASE_URL` to that public directory.

The target LinkedIn profile or page must already be connected to Buffer. Put that Buffer channel id in `BUFFER_CHANNEL_IDS`.

## Setup

```bash
cd /Users/apple/tutorlix_next
python3 -m venv bots/linkedin_banner_bot/.venv
source bots/linkedin_banner_bot/.venv/bin/activate
pip install -r bots/linkedin_banner_bot/requirements.txt
cp bots/linkedin_banner_bot/.env.example bots/linkedin_banner_bot/.env
```

Edit `bots/linkedin_banner_bot/.env` and set:

```dotenv
BUFFER_API_KEY=your_buffer_api_key
BUFFER_CHANNEL_IDS=your_linkedin_buffer_channel_id
PUBLIC_MEDIA_BASE_URL=https://your-public-host.example/linkedin-banners
BOT_DRY_RUN=false
BOT_LOGO_URL=https://tutorlix.com/logo.png
BOT_POST_SCHEDULE_TIMES=11:00,17:00
BOT_SCHEDULE_TIMEZONE=Asia/Kolkata
BOT_RUN_ON_START=true
BUFFER_POST_MODE=shareNow
```

Get the Buffer API key from Buffer Settings -> API. Use Buffer's channels query or API explorer to find the LinkedIn channel id.

## Scheduled Posting

In loop mode, the bot posts once immediately on container start by default, then waits for the next configured posting time.

```dotenv
BOT_POST_SCHEDULE_TIMES=11:00,17:00
BOT_SCHEDULE_TIMEZONE=Asia/Kolkata
BOT_RUN_ON_START=true
```

Times can be written as 24-hour values (`11:00,17:00`) or 12-hour values (`11:00 AM,5:00 PM`). Set `BOT_POST_SCHEDULE_TIMES=` to fall back to `BOT_POST_INTERVAL_SECONDS`.

## Run

Generate one banner without publishing:

```bash
python -m bots.linkedin_banner_bot --env-file bots/linkedin_banner_bot/.env --once --dry-run
```

Publish one banner:

```bash
python -m bots.linkedin_banner_bot --env-file bots/linkedin_banner_bot/.env --once --publish
```

Run forever and publish at the configured schedule times:

```bash
python -m bots.linkedin_banner_bot --env-file bots/linkedin_banner_bot/.env --loop --publish
```

Manual Docker run on the VPS:

```bash
docker rm -f linkedin-banner-bot-prod

docker run -d \
  --name linkedin-banner-bot-prod \
  --restart unless-stopped \
  --network host \
  --env-file /var/www/tutorlix-prod/linkedin-bot.env \
  -v /var/www/tutorlix-prod/linkedin-bot-output:/app/bots/linkedin_banner_bot/output \
  ankitvashishta7/linkedin-banner-bot-prod:latest
```

The container starts in `--loop --publish` mode, so it posts once immediately when the Docker container starts, then continues posting at 11:00 AM and 5:00 PM in `BOT_SCHEDULE_TIMEZONE`.

## Edit Banner Content

Update `bots/linkedin_banner_bot/content.json`. The bot rotates through the list and stores progress in `bots/linkedin_banner_bot/output/state.json`.

Each item supports:

```json
{
  "headline": "Master one concept today",
  "subheadline": "Short lessons, clear notes, and focused practice.",
  "cta": "Start learning with Tutorlix",
  "caption": "Your LinkedIn post text.",
  "hashtags": ["#Tutorlix", "#OnlineLearning"]
}
```

## How Publishing Works

The bot calls Buffer's GraphQL API at `https://api.buffer.com` with the `createPost` mutation, `channelId`, `schedulingType=automatic`, `mode=shareNow`, and `assets.images[].url`.

Relevant Buffer docs:

- https://developers.buffer.com/guides/authentication.html
- https://developers.buffer.com/examples/create-image-post.html
- https://developers.buffer.com/guides/posts-and-scheduling.html
