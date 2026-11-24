# Ops watchdog

Cloudflare Worker on a one-minute cron. It calls `POST /api/ops/collect` and `GET /api/health?deep=1` on the app (3 attempts of 5 s each). If either fails it sends one Telegram alert (deduplicated through a KV flag with a 30 min TTL) and sends a "recovered" message when both succeed again.

Requires Node >= 22.12 for wrangler@4 (on older Node use wrangler@3). Pass the token via env, never commit it. Run everything from this folder.

1. Create the KV namespace and paste the printed `id` into `wrangler.toml` (`[[kv_namespaces]]`):

        CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... pnpm dlx wrangler@4 kv namespace create STATE

2. Set the secrets (each command prompts for the value):

        pnpm dlx wrangler@4 secret put APP_URL                  # https://critnest.com, no trailing path
        pnpm dlx wrangler@4 secret put OPS_COLLECT_SECRET       # same value as the app env
        pnpm dlx wrangler@4 secret put HEALTH_SECRET            # same value as the app env
        pnpm dlx wrangler@4 secret put OPS_TELEGRAM_BOT_TOKEN
        pnpm dlx wrangler@4 secret put OPS_TELEGRAM_CHAT_ID

3. Deploy:

        pnpm dlx wrangler@4 deploy

4. Check the cron handler locally (no deploy needed; use a `.dev.vars` file with the same keys, git-ignored):

        pnpm dlx wrangler@4 dev --test-scheduled
        curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"

Logs: `pnpm dlx wrangler@4 tail`. The worker never logs secrets or the Telegram URL. To stop it, delete the cron trigger or run `wrangler delete`.
