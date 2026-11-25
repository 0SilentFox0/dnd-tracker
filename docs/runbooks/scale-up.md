# Runbook: switching from free to paid tiers

Source of truth for capacity values: `lib/config/capacity.ts` (`CAPACITY_PROFILE=free|paid`, any field overridden by `CAP_<NAME>`). Dashboard scales and alert thresholds follow `OPS_TIER_<PROVIDER>=paid` (`lib/ops/limits.ts`). Env changes in Vercel need a redeploy to apply.

## Trigger → action

| Trigger on `/ops` | Action | What to change | How to verify |
|---|---|---|---|
| `db.connections` ratio > 0.7 for 2 min, or any `db.pool_timeout` | Raise the Supabase compute size (https://supabase.com/dashboard/project/_/settings/compute-and-disk), then raise the per-instance pool | Vercel env: `CAPACITY_PROFILE=paid` (pool 15) or `PRISMA_CONNECTION_LIMIT=<n>`; keep `n × instances` below `db.max_connections` | `db.max_connections` gauge grew; `db.pool_timeout` stays 0 for an hour |
| `db.size` > 70% of the plan limit | Upgrade the Supabase plan or prune metrics/media | `OPS_TIER_SUPABASE=paid` after the upgrade | Limit gauge shows the new ceiling |
| `pusher.messages_day` > 70% or `pusher.trigger_fail` | Upgrade Pusher (https://pusher.com/channels/pricing) or move to a self-hosted Pusher-protocol server (Soketi) | Server: `PUSHER_HOST`, `PUSHER_PORT`, `PUSHER_USE_TLS`; client: `NEXT_PUBLIC_PUSHER_WS_HOST`, `NEXT_PUBLIC_PUSHER_WS_PORT`, `NEXT_PUBLIC_PUSHER_FORCE_TLS`; `OPS_TIER_PUSHER=paid` for a plan upgrade | Open a battle in two tabs, a delta arrives without polling; `pusher.trigger{result=fail}` stays 0 |
| `provider.cloudflare.requests_day` > 70% | Workers Paid plan (https://developers.cloudflare.com/workers/platform/pricing/) | `OPS_TIER_CLOUDFLARE=paid` | Gauge limit changes |
| `ratelimit.degraded` > 0 | Upstash Redis is down or missing: expensive scopes answer 503 in production. Restore the Redis env (`UPSTASH_REDIS_REST_URL/TOKEN`) or upgrade the plan (https://upstash.com/pricing) | `OPS_TIER_UPSTASH=paid` after an upgrade | `ratelimit.degraded` returns to 0 |
| Vercel function limits, bandwidth or build minutes | Vercel Pro (https://vercel.com/pricing) | `OPS_TIER_VERCEL=paid` | Limit gauge changes |
| Supabase/Vercel egress near the monthly cap | Serve images through `next/image`, recompress slides/images, move media to R2 | see `docs/product/infra-prod-plan-2026-10-28.md` | Egress gauge trend flattens |
| More than one app instance (Vercel Pro scaling, VPS) | Shared Next cache handler on Redis. Reference caches already key on `contentVersion`, so correctness no longer depends on `revalidateTag` across instances; the handler only recovers the hit rate | `cacheHandler` in `next.config` (not wired yet) | Reference reads hit across instances |
| `battle.p95` high with slow-query list full of lock waits | Do not add an advisory lock blindly: first measure `battle.conflict_rate` (P4/T4.3) | n/a | n/a |

## Heavy jobs and batching

`CAP_MAX_HEAVY_JOBS_PER_INSTANCE` limits concurrent import/publish/copy per instance (extra requests get 503 + `Retry-After: 5`). `CAP_COPY_TARGETS_BATCH` sets how many target campaigns one content-copy request handles; the client continues through `next`.

## If the database is unreachable

1. `/ops` alert `db.unreachable` or the watchdog "app down" message arrives.
2. Check the Supabase status page and project dashboard (paused free projects must be restored there).
3. Check `DATABASE_URL` (pooler, port 6543) and `DIRECT_URL` in Vercel env; a rotated password breaks both.
4. If pool exhaustion rather than outage (`db.pool_timeout` without `db.unreachable`): temporarily raise `PRISMA_CONNECTION_LIMIT` or shed load (pause heavy jobs via `CAP_MAX_HEAVY_JOBS_PER_INSTANCE=1`).
5. Battles keep working on cached client state; Pusher deltas stop with the writes, polling backs off by itself (`CAP_POLL_BACKOFF_MAX_MS`).
6. After recovery confirm `collector.heartbeat` is fresh and alerts resolved.

## After any upgrade

Set `OPS_TIER_<PROVIDER>=paid` so dashboard scales and alert thresholds use the new limits, redeploy, then confirm the numbers on `/ops`.
