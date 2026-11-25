# Ops

Self-monitoring of the app: application metrics in Postgres, a collector that adds DB and provider gauges, alert rules with a state machine, notifications (Telegram, email) and an external watchdog on Cloudflare. Phase P1 (data, collector, alerts, watchdog) and P2 (read API, `/ops` dashboard, Supabase/Upstash/Vercel adapters) are in code.

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
| `OPS_SUPABASE_ACCESS_TOKEN` (or `SUPABASE_API_TOKEN`), `OPS_SUPABASE_PROJECT_REF` (default: derived from `NEXT_PUBLIC_SUPABASE_URL`) | Supabase adapter (disk usage; verified live 2026-11-25, HTTP 200) |
| `OPS_UPSTASH_EMAIL`, `OPS_UPSTASH_API_KEY`, `OPS_UPSTASH_DB_ID` | Upstash adapter (commands, bandwidth, storage) |
| `OPS_VERCEL_TOKEN`, `OPS_VERCEL_PROJECT_ID`, `OPS_VERCEL_TEAM_ID` | Vercel adapter (monthly cost) |
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
7. Optional adapter tokens (Supabase, Upstash, Vercel) are listed in the Environment table; without them the dashboard shows "n/a" and a link to the provider panel.

## Provider adapters

Adapters live in `lib/server/ops/adapters/` (`PROVIDER_ADAPTERS`). Each returns `ProviderReading[]` (`metric` is the suffix; the collector writes `provider.<name>.<metric>`) or `'unavailable'` (no env, HTTP/GraphQL error, network failure; never throws).

Findings (checked 2026-11-24 against the public docs):

- Cloudflare: GraphQL Analytics API (`https://api.cloudflare.com/client/v4/graphql`), dataset `viewer.accounts[].workersInvocationsAdaptive`, filter `scriptName`, `datetime_geq/leq`, sums `requests`, `errors`, `subrequests`. We query from UTC midnight to now: `requests_day`, `errors_day`. Env: `OPS_CLOUDFLARE_API_TOKEN` (Analytics read), `OPS_CLOUDFLARE_ACCOUNT_ID`, `OPS_CLOUDFLARE_WORKER_NAME`.
- Supabase (Management API, `Authorization: Bearer <personal access token>`): `GET /v1/projects/{ref}/config/disk/util` returns `metrics.fs_used_bytes` / `fs_size_bytes` (documented, needs `infra_disk_config_read`); we write `disk_used_bytes` and `disk_size_bytes`. Not available through any documented endpoint: egress / bandwidth of the billing period and auth MAU (so the `provider.supabase.egress_bytes` rule stays silent; use the dashboard). Logical DB size is already measured by the collector (`db.size_bytes`); the `database/query` endpoint is beta and not used. Compute size (`GET /v1/projects/{ref}/billing/addons`) is a name, not a number, so it is not collected. Checked 2026-11-24, API spec read only partly (last ~68k characters unread).
- Upstash (Developer API, HTTP Basic `email:api_key`): `GET /v2/redis/stats/{id}?period=1h` returns `total_monthly_requests`, `daily_net_commands`, `total_monthly_bandwidth`, `current_storage`; we write `commands_month`, `commands_day`, `bandwidth_month_bytes`, `storage_bytes`. Upstash is not used in production (rate limit falls back to memory) and its Developer API is unavailable for accounts created through the Vercel integration, so this adapter stays `unavailable` until a native account is used. The plan limit is not read from the API (`PROVIDER_LIMITS` holds it). Field names come from the docs; the response was not called live.
- Vercel (REST, `Bearer`): the only documented usage endpoint is `GET /v1/billing/charges?from&to[&teamId]` (FOCUS v1.3 JSONL, daily granularity). We sum `EffectiveCost` of the month (filtered by `Tags.ProjectId` when `OPS_VERCEL_PROJECT_ID` is set) into `cost_month_usd`. Raw invocation and bandwidth counts are not exposed, so the `provider.vercel.invocations` / `bandwidth_bytes` rules stay silent. Unit strings and Hobby-plan behaviour are unconfirmed; the response was not called live.
- Pusher: the HTTP API has no total connection count. `GET /channels` lists occupied channels (used: `channels_occupied`); `subscription_count` is per single non-presence channel (opt-in in app settings) and `user_count` is presence-only, so a connection total is `unavailable` in v1.

## Notifiers

`sendAlert` (`lib/server/ops/notify.ts`): Telegram (`OPS_TELEGRAM_BOT_TOKEN`, `OPS_TELEGRAM_CHAT_ID`) and Resend (`RESEND_API_KEY`, `OPS_ALERT_EMAIL`, `OPS_ALERT_FROM`); a channel without env is `off`; failures never throw and secrets are never logged. `POST /api/ops/test-notify` (platform admin) returns per-channel results.

## Dashboard (`/ops`)

Owner-only page (`OPS_ADMIN_EMAILS` or `PLATFORM_ADMIN_USER_IDS`, `lib/utils/api/ops-access.ts`; the profile page shows an `/ops` link to the same set). `app/ops/layout.tsx` and `page.tsx` both call `assertOpsAdmin` (`lib/server/ops/page-guard.ts`): layouts and pages render in parallel, so the page must not rely on the layout's `notFound()` before it reads data. A non-owner gets 404; `robots.ts` disallows `/ops`, the layout sets `noindex`. Namespace `ops` (`OPS_NAMESPACES` in `lib/i18n/core-namespaces.ts`), not part of any campaign scope.

Read API (all `requirePlatformAdmin`, 404 for others, `privateJson`, `force-dynamic`):

- `GET /api/ops/summary`: `heartbeatAgeSec`, provider rows (tier, available, worst status), limit rows (`value`, `limit` of the active tier, `percent`, `status`, `forecastHours`) and non-ok alert states. Limit rows are `PROVIDER_METRIC_LIMITS` plus `db.size`.
- `GET /api/ops/series?range=1h|6h|24h|7d&metrics=a,b` (≤ 12 keys, `lib/schemas/ops.ts`): at most 240 points per series, empty bins are `null`. A key is `metric`, `metric{k=v}`, with an optional `:p50` / `:p95` (timings only) or `:rate` (counters, per minute) suffix (`parseSeriesKey`). A counter without a label adds up all label sets; a gauge without a label reads only the unlabeled row. Up to 24 h reads minute buckets, 7 d reads hourly rows plus the minute rows of the current (not yet rolled up) hour. Pure binning is `lib/utils/ops/series.ts`, loading is `lib/server/ops/read-series.ts`.
- `GET /api/ops/alerts?limit=`: every rule with its state, plus the last transitions. `POST /api/ops/alerts/[rule]/mute` `{ minutes: 0 | 60 | 1440 }` writes `silencedUntil` (0 clears it; an unknown rule is 404).
- `GET /api/ops/db-top`: top 10 `pg_stat_statements` by total time (query text cut to 200 chars) or `available: false`, plus open transactions longer than 5 s (duration, state and wait type only, no query text).

Client: `lib/api/ops.ts` -> `lib/hooks/ops/` (`opsKeys`; summary, series, alerts poll every 15 s with `refetchIntervalInBackground: false`, so a hidden tab stops) -> `components/ops/*`. One series request per chart group (`CHART_GROUPS` in `lib/ops/chart-groups.ts`, which also holds the provider panel links). `UplotChart` is loaded with `next/dynamic` (`ssr: false`) so `uplot` and its CSS stay in the `/ops` chunk. Add a chart: a row in `CHART_GROUPS` plus `charts.items.*` / `charts.series.*` keys in `messages/{uk,en}/ops.json` (a test checks both).

Live check data: `scripts/ops/seed-fake-metrics.ts` (local database only, refuses any other host; always wipes the ops tables first, `--clean` only wipes).

Limit line: a chart whose series key (or `ChartDef.limitId`, e.g. `db.size`) matches a summary limit row with a non-null `limit` gets an extra dashed red "Limit" series at the active tier's value, so the y-scale always shows the headroom. The `connections` chart carries `db.max_connections` as its own series.

Live check (2026-11-25, local `next start` + seeded fake metrics, Chrome): desktop render without raw keys or console errors, range tabs 1h/6h/24h/7d refetch `series`, mute 1h/24h and unmute, "Test notification" ("not configured" for both channels), non-owner gets 404 on the page and both APIs. Not verified: real 390 px window (checked in a 390 px iframe: no horizontal scroll), background-tab polling in a real browser (`refetchIntervalInBackground: false` is set in all three hooks). Adapters checked against live APIs: Supabase (disk/util, 200), Cloudflare (GraphQL shape, 0 requests today), Vercel (Hobby plan: charges feed answers 404 `costs_not_found`, mapped to cost 0). Upstash stays "n/a" (Developer API is not available to Vercel-provisioned accounts; Redis is unused in prod). Supabase egress/MAU and raw Vercel invocation counts are not exposed by any API.

## Capacity profile and load readiness (P3)

Runbook for switching tiers: [scale-up.md](../runbooks/scale-up.md).

- **Profile** — `lib/config/capacity.ts`: `CAPACITY_PROFILE=free|paid` (default `free`), each field overridden by `CAP_<NAME>` (`CAPACITY_ENV`). Fields: `dbConnectionLimit(+Dev)`, `dbPoolTimeoutSec(+Dev)`, `writeTxTimeoutMs`, `writeTxMaxWaitMs`, `battlePollMs`, `pollBackoffMaxMs`, `maxHeavyJobsPerInstance`, `copyTargetsBatch`. `free` reproduces the former constants (pool 5/10 dev, pool timeout 10/20 s, write tx 30 s / 5 s wait, poll 30 s). Client code reads `clientCapacity()` (`NEXT_PUBLIC_CAPACITY_PROFILE`, `NEXT_PUBLIC_CAP_BATTLE_POLL_MS`, `NEXT_PUBLIC_CAP_POLL_BACKOFF_MAX_MS`). `PRISMA_CONNECTION_LIMIT` still overrides the pool size. Other transaction timeouts (publish 120 s, source-sync apply 60 s, create-campaign 60 s, assistant) are operation-specific and stay local.
- **Pusher-compatible server** — `lib/pusher/config.ts`: `pusherServerOptions()` (`PUSHER_HOST/PORT/USE_TLS`) and `pusherClientOptions()` (`NEXT_PUBLIC_PUSHER_WS_HOST/WS_PORT/FORCE_TLS`, ws/wss transports). Without the host variables the cluster behaviour is unchanged.
- **Polling** — `useBattle` already pauses polling while the Pusher channel is `connected` (`pausePolling`). Poll delay is `nextPollDelay(failures, cfg, rand)` (`lib/utils/battle/client/poll-delay.ts`): the base `battlePollMs` while healthy, exponential backoff with +-20% jitter after consecutive failed polls (`query.state.fetchFailureCount`), capped by `pollBackoffMaxMs`. Background tabs do not poll (TanStack default). Backoff is on failed polls, not on a disconnected socket, so a healthy server keeps the 30 s freshness.
- **Caches** — `lib/cache/versioned.ts` `versionedCache` adds the campaign `contentVersion` to the `unstable_cache` key (reference data and the info reference), one PK read per cached read; the lookup is memoized per request (React `cache`); a failing lookup skips the cache and reads the DB directly. Tags stay as the same-instance fast path, but cross-instance correctness no longer relies on `revalidateTag`. Template bundle caches were already keyed by version. A shared cache handler (Redis) is for the "more than one instance" trigger (runbook), not wired.
- **Rate limits (audit)** — `isFailClosedScope` (`lib/utils/api/rate-limit.ts`) makes these scopes answer 503 `RATE_LIMIT_UNAVAILABLE` without Redis in production: `assistant-*`, `ai-*`, `mcp*`, `draft-*`, `content-import-ai-map`, `scenario-summary`, `map-background-upload`, `campaign-create`, `content-import`, `template-publish`, `content-copy`, plus compendium mutations (`failClosed: mutation`) and the battle scopes (explicit). Cheap scopes (`soundboard-play`, `demo-read`, `campaign-join`, `map-create`, show, puzzle, avatar ticket, `ip-*`) stay fail-open. An explicit `failClosed` in the input wins. Daily per-user caps: `DAILY_LIMITS` + `checkDailyLimit` (campaign creation 20, import confirm 50, template publish 30, content copy 100 per 24 h, counted on the first non-dry-run batch only).
- **Heavy jobs** — `lib/server/ops/heavy-limiter.ts` `withHeavySlot(fn)`: per-instance semaphore (`maxHeavyJobsPerInstance`); over the limit it answers 503 `errors.serverBusy` with `Retry-After: 5` and counts `ratelimit.denied{scope=heavy-busy}`. Applied to compendium preview/confirm, `template.publish`, `content-copy` POST, `content-import` POST.
- **Content copy batching** — `copyContent` handles at most `copyTargetsBatch` targets per request (`lib/server/content/copy/batch.ts` `sliceTargets`), cursor = last handled campaign id (`after` in the request, `next` in the response). `useContentCopy` loops until `next` is absent and concatenates the reports. The source export is rebuilt per batch.
- **Layered sync after publish** — publish (`publishTemplateVersion`) only writes `*_base` rows and bumps the version; no classification of layered clones runs there. Classification (`classifyLayered`) runs on demand when a clone opens the sync screen (`sync/diff.ts`), and the dashboard compares versions only. So nothing was moved; the remaining cost is the full classification per opened screen, P4 did not measure it (the layered-sync screen was outside the k6 scenarios).

## Load testing and capacity (P4)

- `scripts/loadtest/` (k6 against `next start` + a `prodcopy_<suffix>` DB; `seed.ts` creates temporary Auth users and, with `targets`, empty copy-target campaigns; `seed.ts cleanup` removes them). Scenarios: `battle.js` (BATTLES=1|20), `storm.js`, `copy.js` (content-copy + bulk import), `sizes.js` (payload breakdown). The harness refetches the full scene on every version change, so its egress is an upper bound; a real client with Pusher connected does not poll. Numbers and decisions: [capacity-baseline](../product/capacity-baseline.md).
- `scripts/ops/recompress-images.ts`: one-off storage recompression (dry-run default; `--apply` backs originals up locally first, keeps path and format). Never run on prod without the owner's go-ahead.
- Measured: `battle.conflict` 0 % (no advisory lock), no missing indexes at test volume, Pusher outage does not slow requests. `content-import` now runs inside `withHeavySlot`. `GET /battles/[id]` answers a version ETag and 304 (`readBattleScene`, `If-None-Match`); the scene carries 10 recent log events (`BATTLE_LOG_RECENT_EVENTS`).
