# Backlinks Bot

This bot publishes backlink resource entries to websites that you own or are explicitly authorized to manage. It is not designed for spam comments, forum posts, or arbitrary third-party websites.

The default interval is every 4 hours (`14400` seconds). The bot starts in dry-run mode so you can verify payloads before publishing.

## Supported Targets

- `wordpress`: creates a post through the WordPress REST API using an application password.
- `webhook`: sends a JSON payload to your own endpoint.

Each target must be marked with `"authorized": true` in `targets.json`; publish mode refuses to run if an enabled target is not authorized.

## Setup

```bash
cd /Users/apple/tutorlix_next
python3 -m venv bots/backlinks_bot/.venv
source bots/backlinks_bot/.venv/bin/activate
pip install -r bots/backlinks_bot/requirements.txt
cp bots/backlinks_bot/.env.example bots/backlinks_bot/.env
cp bots/backlinks_bot/targets.example.json bots/backlinks_bot/targets.json
```

Edit:

- `bots/backlinks_bot/backlinks.json` for the links you want to place.
- `bots/backlinks_bot/targets.json` for websites you own or have permission to update.
- `bots/backlinks_bot/.env` for credentials and scheduler settings.

## Run

Dry-run one backlink payload:

```bash
python -m bots.backlinks_bot --env-file bots/backlinks_bot/.env --once --dry-run
```

Publish one backlink to the next configured target:

```bash
python -m bots.backlinks_bot --env-file bots/backlinks_bot/.env --once --publish
```

Run continuously every 4 hours:

```bash
python -m bots.backlinks_bot --env-file bots/backlinks_bot/.env --loop --publish
```

## WordPress Target

Use a WordPress application password, not your main login password.

```json
{
  "id": "owned-wordpress-site",
  "type": "wordpress",
  "base_url": "https://example.com",
  "enabled": true,
  "authorized": true,
  "status": "draft",
  "username_env": "OWNED_WORDPRESS_USERNAME",
  "password_env": "OWNED_WORDPRESS_APP_PASSWORD",
  "category_ids": [],
  "tag_ids": []
}
```

Keep `status` as `draft` until you have verified the content on each site.

## Webhook Target

The webhook receives:

```json
{
  "target_id": "owned-custom-site",
  "title": "Post title",
  "content_html": "<p>...</p>",
  "status": "draft",
  "backlink": {
    "id": "tutorlix-devops",
    "url": "https://tutorlix.com",
    "anchor_text": "learn DevOps with Tutorlix",
    "description": "Resource description",
    "keywords": ["DevOps"]
  }
}
```

## Docker

```bash
docker build -f bots/backlinks_bot/Dockerfile.prod -t tutorlix-backlinks-bot .
docker run -d \
  --name tutorlix-backlinks-bot \
  --restart unless-stopped \
  --env-file /path/to/backlinks-bot.env \
  -v /path/to/backlinks-targets.json:/app/bots/backlinks_bot/targets.json:ro \
  -v /path/to/backlinks-output:/app/bots/backlinks_bot/output \
  tutorlix-backlinks-bot
```

