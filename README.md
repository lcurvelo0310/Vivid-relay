# VIVID Relay Server

A lightweight CORS relay that forwards requests from the VIVID preconstruction tool to Make.com webhooks.

## Endpoint

**POST /relay**
```json
{
  "_webhookUrl": "https://hook.us1.make.com/your-webhook-id",
  "_data": { ...your full VIVID JSON... }
}
```

Only forwards to make.com domains for security.

**GET /health** — returns `{ "status": "ok" }`

## Deploy on Railway

1. Push this folder to a GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub
3. Select the repo → Railway auto-detects and deploys
4. Copy your Railway URL (e.g. https://vivid-relay.up.railway.app)
5. Paste it into the VIVID tool's relay field

## Environment Variables (optional)
- `PORT` — auto-set by Railway
- `ALLOWED_ORIGIN` — restrict to your Claude artifact domain (default: *)
