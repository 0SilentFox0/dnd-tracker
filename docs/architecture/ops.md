# Ops

Self-monitoring of the app: application metrics in Postgres, a collector that adds DB and provider gauges, alert rules with a state machine, notifications (Telegram, email) and an external watchdog on Cloudflare. Phase P1 (data, collector, alerts, watchdog) is in code; the dashboard UI and the remaining provider adapters are later phases.

## Metrics and tables

Catalog: `lib/ops/metrics-catalog.ts` (`METRICS`). A metric has a `kind` (`counter`, `gauge`, `timing`) and optional label specs (a fixed list or a regexp). Provider gauges are not listed one by one: any `provider.<name>.<metric>` with `<name>` in `PROVIDER_NAMES` (`cloudflare`, `pusher`, `supabase`, `upstash`, `vercel`) is a gauge. `canonicalLabels` sorts the labels and drops any key or value outside the spec, which bounds cardinality; an unknown metric throws outside production and is dropped silently in production.

API (import from `@/lib/server/ops/metrics`, a re-export of `lib/ops/metrics.ts`): `incr(key, by?, labels?)`, `gauge(key, value, labels?)`, `observe(key, ms, labels?)` (timing only: writes `<key>:count`, `<key>:sum` and `<key>:le` with a `le` bucket label from `LATENCY_BOUNDS` 50…3200 ms and `inf`). Current call sites: `lib/pusher/safe-trigger.ts`, `lib/server/battles/run-mutation.ts`, `lib/utils/api/error-handler.ts`, `lib/utils/api/rate-limit.ts`, and the collector itself.

Tables (migration `20261225000000_ops_metrics`, all with RLS enabled, no policies: only the server role reads them):

- `ops_metric_buckets`: one row per minute, `(bucket, metric, labels)` is the key, columns `n`, `sum`, `max`. Kept 48 h.
- `ops_metric_hourly`: the same shape per hour, rolled up from the minute rows. Kept 90 days.
- `ops_alert_state`: one row per rule (`status`, `since`, `breachSince`, `lastValue`, `lastNotifiedAt`, `lastNotifiedStatus`, `silencedUntil`).
- `ops_alert_events`: status transitions (`from`, `to`, `value`, `at`, `notified`). Kept 90 days.

Gauges are stored like everything else: `n` counts samples, `sum` their total, `max` the peak. Read a gauge with `max` (or `sum / n` for an average).

## Buffer and flush

`incr/gauge/observe` write into an in-process `Map` keyed by minute, metric and labels (no I/O on the request path). `maybeFlush` runs on every call; at most once per 30 s it schedules `flushMetrics` through `after()` from `next/server` (falls back to a plain call outside a request scope). The flush swaps the buffer, then upserts in chunks of 500 rows with `INSERT ... ON CONFLICT DO UPDATE` adding `n`/`sum` and taking `GREATEST` of `max`. A failed flush is logged and the batch is lost (metrics are best-effort). The buffer is per serverless instance, so the data of an instance that dies between flushes is lost; the table merges all instances.

## Collector

`POST /api/ops/collect` (`app/api/ops/collect/route.ts`, `maxDuration` 60 s). Auth: `Authorization: Bearer <OPS_COLLECT_SECRET>`, compared with `safeEqual`; no secret in env gives 503, a wrong token 401. Steps per call:

1. `collectDbGauges` (`collect-db.ts`): `db.connections{state}`, `db.max_connections`, `db.longest_tx_s`, `db.waiting_locks`, `db.size_bytes`, `db.deadlocks`, `db.cache_hit_ratio`, `app.active_battles` (from `pg_stat_*` and `battle_scenes`). A failure is logged and reported as `ok: false`.
2. In parallel, every adapter from `PROVIDER_ADAPTERS` with an 8 s timeout (details below); each result is reported as `ok`, `unavailable` or `error` in the response.
3. `collector.heartbeat` gauge (unix seconds), then `flushMetrics`.
4. On the minute 0 of each hour: `rollupAndPrune` (hourly rollup of the last 3 hours, idempotent, then deletes expired rows).
5. `evaluateAlerts`.

Response: `{ ok, adapters, evaluated, notified }`. Nothing schedules it inside the app: the watchdog calls it every minute (there is no Vercel cron for it).

## Alert rules and state machine

Rules: `lib/ops/alert-rules.ts` (`ALERT_RULES`). A rule reads one value per evaluation:

- `metric`, optional `labels` (exact canonical string such as `state=total`), `window` (`1m`…`24h`), `agg`: `sum`, `avg`, `max`, `p95` (from the `:le` buckets), `age` (minutes since the max of a heartbeat gauge), `expiryDays` (days to the nearest date in `lib/ops/expiries.ts`).
- `per`: divide by another metric over the same window (ratio rules: connections / `max_connections`, conflicts / mutations).
- `limit`: divide by a provider limit from `lib/ops/limits.ts` (`limitFor`, tier from `OPS_TIER_<PROVIDER>=paid`, default free); `null` limit gives no value. Rules for `PROVIDER_METRIC_LIMITS` gauges are generated.
- `fanout`: multiply by `OPS_PUSHER_FANOUT` (default 6), because `pusher.trigger` counts calls, not recipients.
- `direction: 'below'` inverts the comparison (expiry). `warn`/`crit` thresholds, `forMinutes` (how long a breach must hold before the status rises), `cooldownMinutes` (re-notify interval for crit).

A missing value (no data) is treated as `ok`. State machine (`lib/utils/ops/alert-state.ts`, pure): the target status is `crit`/`warn`/`ok` from the thresholds; a drop applies immediately, a rise only after `forMinutes` of continuous breach (`breachSince`). The notification decision compares the status with `lastNotifiedStatus`: a change gives `up`, `down` or `resolved`; staying `crit` past the cooldown gives `renotify`; `warn` is not repeated. `silencedUntil` suppresses notifications, but nothing writes it yet (set it by hand in the table; a UI is planned). `evaluateAlerts` sends through `sendAlert`; `lastNotified*` are stored only if a channel delivered. Every status change is appended to `ops_alert_events`.

## Watchdog

`infra/ops-watchdog/` is a Cloudflare Worker on a one-minute cron, independent of Vercel. It calls `POST /api/ops/collect` and `GET /api/health?deep=1` (3 attempts of 5 s). On failure it sends one Telegram message, deduplicated by a KV flag `STATE` with a 30 min TTL, and a "recovered" message when both pass again (`logic.ts`, `decide`). The `collector.silent` rule is the second line: it fires when the heartbeat is older than 3 min (warn) or 10 min (crit), but only the watchdog can tell that the app itself is down. Deploy steps: `infra/ops-watchdog/README.md`.

## Environment

All optional unless noted; a missing variable switches the part off, it does not break the app.

| Variable | Used by |
|---|---|
| `OPS_COLLECT_SECRET` | collector auth (required for the collector, also set in the worker) |
| `HEALTH_SECRET` | `/api/health?deep=1`; the worker sends it |
| `OPS_TELEGRAM_BOT_TOKEN`, `OPS_TELEGRAM_CHAT_ID` | Telegram notifier (app and worker) |
| `RESEND_API_KEY`, `OPS_ALERT_EMAIL`, `OPS_ALERT_FROM` | email notifier |
| `OPS_CLOUDFLARE_API_TOKEN`, `OPS_CLOUDFLARE_ACCOUNT_ID`, `OPS_CLOUDFLARE_WORKER_NAME` | Cloudflare adapter |
| `PUSHER_APP_ID`, `PUSHER_SECRET` (+ the existing Pusher key/cluster) | Pusher adapter |
| `OPS_PUSHER_FANOUT` | recipients per trigger for the daily messages estimate (default 6) |
| `OPS_TIER_<SUPABASE\|VERCEL\|PUSHER\|UPSTASH\|CLOUDFLARE>` | `paid` selects the paid limits |

Worker secrets (`wrangler secret put`): `APP_URL`, `OPS_COLLECT_SECRET`, `HEALTH_SECRET`, `OPS_TELEGRAM_BOT_TOKEN`, `OPS_TELEGRAM_CHAT_ID`.

## Extending

- **Metric:** add a row to `METRICS` (kind, label specs); call `incr/gauge/observe` from `@/lib/server/ops/metrics`; add a test next to the call site. A new provider gauge needs no row, only the adapter.
- **Rule:** add an object to `ALERT_RULES` (unique `id`); a provider limit goes to `PROVIDER_LIMITS` and `PROVIDER_METRIC_LIMITS` and gets its rule automatically. Cover threshold edges in `lib/server/ops/__tests__/evaluate.test.ts`.
- **Adapter:** a file in `lib/server/ops/adapters/` exporting `{ name, collect }` (a `PROVIDER_NAMES` member; never throw, return `'unavailable'`), registered in `PROVIDER_ADAPTERS`. No secret in logs or errors. Document the findings below.
- **Secret expiry:** add `{ id, at }` to `lib/ops/expiries.ts`.

## Owner checklist

1. Set the env variables above in Vercel (Production). Generate the secret with `openssl rand -base64 32` (same for `OPS_COLLECT_SECRET` in Vercel and in the worker); never commit it.
2. Deploy the migration with the next production build from `main` (expand-only, RLS included).
3. Deploy the worker: create the KV namespace, put its id in `wrangler.toml`, set the secrets, `wrangler deploy` (see the worker README).
4. Send `POST /api/ops/test-notify` as a platform admin and check both channels.
5. Rotate the Cloudflare API token by 2026-12-24 (tracked in `lib/ops/expiries.ts`, rule `secrets.expiry`); update `OPS_CLOUDFLARE_API_TOKEN` and, if the worker uses it, its secrets. After rotating, move the date in `expiries.ts`.
6. Confirm the values in `lib/ops/limits.ts` against the current provider pricing pages; they are 2026-11-24 estimates and the provider rules alert from them.
7. Adapters for Supabase, Vercel and Upstash do not exist yet: their limit rules stay silent until readings appear.

## Provider adapters

Adapters live in `lib/server/ops/adapters/` (`PROVIDER_ADAPTERS`). Each returns `ProviderReading[]` (`metric` is the suffix; the collector writes `provider.<name>.<metric>`) or `'unavailable'` (no env, HTTP/GraphQL error, network failure; never throws).

Findings (checked 2026-11-24 against the public docs):

- Cloudflare: GraphQL Analytics API (`https://api.cloudflare.com/client/v4/graphql`), dataset `viewer.accounts[].workersInvocationsAdaptive`, filter `scriptName`, `datetime_geq/leq`, sums `requests`, `errors`, `subrequests`. We query from UTC midnight to now: `requests_day`, `errors_day`. Env: `OPS_CLOUDFLARE_API_TOKEN` (Analytics read), `OPS_CLOUDFLARE_ACCOUNT_ID`, `OPS_CLOUDFLARE_WORKER_NAME`.
- Pusher: the HTTP API has no total connection count. `GET /channels` lists occupied channels (used: `channels_occupied`); `subscription_count` is per single non-presence channel (opt-in in app settings) and `user_count` is presence-only, so a connection total is `unavailable` in v1.

## Notifiers

`sendAlert` (`lib/server/ops/notify.ts`): Telegram (`OPS_TELEGRAM_BOT_TOKEN`, `OPS_TELEGRAM_CHAT_ID`) and Resend (`RESEND_API_KEY`, `OPS_ALERT_EMAIL`, `OPS_ALERT_FROM`); a channel without env is `off`; failures never throw and secrets are never logged. `POST /api/ops/test-notify` (platform admin) returns per-channel results.
