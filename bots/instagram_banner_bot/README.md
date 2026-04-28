# Instagram Banner Bot

This bot creates a branded square JPEG banner, builds an Instagram caption, and can publish it through the Instagram content publishing API every 2 hours.

The bot is standalone and does not depend on the Django or Next.js runtime.

## Important Instagram Requirement

Instagram's publishing API does not upload the local image file directly. The generated JPEG must be reachable by Meta from a public HTTPS URL. Serve or upload `bots/instagram_banner_bot/output/` from a public static host, CDN, S3 bucket, or web server, then set `PUBLIC_MEDIA_BASE_URL` to that public directory.

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
```

## Run

Generate one banner without publishing:

```bash
python -m bots.instagram_banner_bot --env-file bots/instagram_banner_bot/.env --once --dry-run
```

Publish one banner:

```bash
python -m bots.instagram_banner_bot --env-file bots/instagram_banner_bot/.env --once --publish
```

Run forever, immediately publishing once and then every 2 hours:

```bash
python -m bots.instagram_banner_bot --env-file bots/instagram_banner_bot/.env --loop --publish
```

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

1. `POST /{ig-user-id}/media` with `image_url` and `caption`.
2. `POST /{ig-user-id}/media_publish` with the returned container id.

Relevant Meta docs:

- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/
- https://www.postman.com/meta/instagram/request/ka3qt0z/create-a-media-container
