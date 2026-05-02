# AV Bot

`av_bot` picks a random published Tutorlix note for the `professional` profile type and posts it to LinkedIn through Buffer.

It does not create media. The LinkedIn post contains the note title, description or excerpt, the Tutorlix note URL, and hashtags.

## Setup

```bash
cd /Users/apple/tutorlix_next
python3 -m venv bots/av_bot/.venv
source bots/av_bot/.venv/bin/activate
pip install -r bots/av_bot/requirements.txt
cp bots/av_bot/.env.example bots/av_bot/.env
```

Edit `bots/av_bot/.env` and set:

```dotenv
BUFFER_API_KEY=your_buffer_api_key
BUFFER_CHANNEL_IDS=your_linkedin_buffer_channel_id
BOT_DRY_RUN=false
TUTORLIX_API_BASE_URL=https://tutorlix.com
TUTORLIX_SITE_BASE_URL=https://tutorlix.com
BOT_PROFILE_TYPE=professional
```

`BUFFER_CHANNEL_IDS` must be the Buffer channel id for the LinkedIn profile or page, not the LinkedIn page id.

## Run

Preview the selected note and LinkedIn text:

```bash
python -m bots.av_bot --env-file bots/av_bot/.env --once --dry-run
```

Publish once:

```bash
python -m bots.av_bot --env-file bots/av_bot/.env --once --publish
```

Run forever:

```bash
python -m bots.av_bot --env-file bots/av_bot/.env --loop --publish
```

## Docker

```bash
docker rm -f av-bot-prod

docker run -d \
  --name av-bot-prod \
  --restart unless-stopped \
  --network host \
  --env-file /var/www/tutorlix-prod/av-bot.env \
  -v /var/www/tutorlix-prod/av-bot-output:/app/bots/av_bot/output \
  ankitvashishta7/av-bot-prod:latest
```

The container posts once on startup when `BOT_RUN_ON_START=true`, then follows `BOT_POST_SCHEDULE_TIMES`.

## Note Selection

The bot calls:

```text
/api/notes/public/browse/?profile_type=professional
```

It keeps recent selections in `output/state.json` so repeated scheduled runs avoid the same note until the recent history is exhausted.
