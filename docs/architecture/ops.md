# Ops

## Provider adapters

Adapters live in `lib/server/ops/adapters/` (`PROVIDER_ADAPTERS`). Each returns `ProviderReading[]` (`metric` is the suffix; the collector writes `provider.<name>.<metric>`) or `'unavailable'` (no env, HTTP/GraphQL error, network failure; never throws).

Findings (checked 2026-11-24 against the public docs):

- Cloudflare: GraphQL Analytics API (`https://api.cloudflare.com/client/v4/graphql`), dataset `viewer.accounts[].workersInvocationsAdaptive`, filter `scriptName`, `datetime_geq/leq`, sums `requests`, `errors`, `subrequests`. We query from UTC midnight to now: `requests_day`, `errors_day`. Env: `OPS_CLOUDFLARE_API_TOKEN` (Analytics read), `OPS_CLOUDFLARE_ACCOUNT_ID`, `OPS_CLOUDFLARE_WORKER_NAME`.
- Pusher: the HTTP API has no total connection count. `GET /channels` lists occupied channels (used: `channels_occupied`); `subscription_count` is per single non-presence channel (opt-in in app settings) and `user_count` is presence-only, so a connection total is `unavailable` in v1.

## Notifiers

`sendAlert` (`lib/server/ops/notify.ts`): Telegram (`OPS_TELEGRAM_BOT_TOKEN`, `OPS_TELEGRAM_CHAT_ID`) and Resend (`RESEND_API_KEY`, `OPS_ALERT_EMAIL`, `OPS_ALERT_FROM`); a channel without env is `off`; failures never throw and secrets are never logged. `POST /api/ops/test-notify` (platform admin) returns per-channel results.
