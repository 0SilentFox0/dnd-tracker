# Admin panel

Owner-only `/admin`: left sidebar (`AdminNav`; chip tabs below `md`) with Overview, Users, Security, Ops. All charts are Recharts through `components/admin/charts/` (`TimeSeriesChart`, `BarBreakdown`, `ChartPanel`). Access is `isAdmin` (`lib/utils/api/admin-access.ts`: `OPS_ADMIN_EMAILS` or `PLATFORM_ADMIN_USER_IDS`); a non-owner gets 404 on pages and APIs. `/ops` redirects (308) to `/admin/ops`; the header shows an admin link when `GET /api/admin/me` answers `200 { isAdmin: true }` (explicit exception to "non-admin gets 404": it never 404s and reveals only the caller's own bit; `useIsAdmin`, keyed by user id).

## Tables and retention

Expand-only migration `20261227000000_admin_panel`, every table has RLS enabled without policies.

- `user_access` (PK `userId`+`ip`): country, device, `firstSeen`, `lastSeen`, `days`; cascade on user. Pruned after 180 days by `lastSeen`.
- `user_activity_days` (PK `userId`+`day` UTC date): cascade. Pruned after 400 days.
- `account_deletions`: `by` (`self`|`admin`), `accountAgeDays`, `campaigns`, `emailHash` (HMAC-SHA256 of lower-cased email with `ADMIN_HASH_SECRET`, `null` without it). No FK, written inside the `deleteAccount` transaction.
- `admin_actions`: `ban|unban|signout|delete`, `adminUserId`, `targetUserId` (no FK), `meta` json (ban duration, target email at deletion). Never pruned.

Prune is `pruneAdminData` (`lib/server/admin/prune.ts`), called from the ops collector `/api/ops/collect`.

## Activity collection (proxy)

`updateSession` (`lib/supabase/middleware.ts`), page navigations only: when a user is signed in and cookie `cn_seen` is not `<userId>:<UTC date>`, it fires `recordActivity` and sets the cookie (httpOnly, until UTC midnight). The write runs in `waitUntil` (`@vercel/functions`) behind a **dynamic import** of `lib/server/admin/record-activity`, so Prisma stays out of the proxy bundle. `recordActivity` upserts `user_access` (`days` +1 when `lastSeen` is an earlier day) and inserts `user_activity_days` with `ON CONFLICT DO NOTHING`; failures log only the error name (never the IP) and never affect the response. IP = first `x-forwarded-for`, then `x-real-ip`; country = `x-vercel-ip-country`; without an IP only the activity day is written. Pure parts: `lib/utils/admin/{client-ip,device,seen-cookie,email-hash}.ts`. There is no history before the deploy.

## API

All `requirePlatformAdmin`, `privateJson`, `force-dynamic`, thin `route.ts` plus helpers in `lib/server/admin/`; client `lib/api/admin.ts` -> `lib/hooks/admin/` (`adminKeys`) -> `components/admin/*`. Schemas in `lib/schemas/admin.ts`.

- `GET /api/admin/me`: `{ isAdmin }`, 200 for everyone signed in or not.
- `GET /api/admin/overview?range=7d|30d|90d`: tiles with deltas (users, new, deleted, DAU/WAU/MAU, campaigns, templates, battles, AI-key users, activated %), series (signups/deletions, DAU with rolling WAU/MAU, content), weekly cohorts (weeks 1/2/4), splits by locale, rule system and country. Binning/cohort math in `lib/utils/admin/{series,cohorts}.ts`. One request on open plus a refresh button, no polling.
- `GET /api/admin/users?q&sort=created|active|campaigns&filter=all|banned|sharedIp|inactive|noCampaigns|aiKey&cursor`: 50 per page, cursor pagination.
- `GET /api/admin/users/[id]`: header, owned and joined campaigns, templates (with deletion blockers), 90-day activity, IPs/devices with other accounts on the same IP, action log.
- `POST /api/admin/users/[id]/{ban,unban,signout}` and `DELETE /api/admin/users/[id]`: see below.
- `GET /api/admin/campaigns/[id]`: read-only campaign summary (owner, members, counters, storage size, template clones/versions).
- `GET /api/admin/security?days=7|30|90`: shared-IP groups (5+ accounts flagged as likely NAT/VPN), re-registrations (`emailHash` match against `account_deletions`), recent `admin_actions`. Grouping is `lib/utils/admin/shared-ip.ts`.

## Actions and limits

`runUserAction` (`lib/server/admin/run-user-action.ts`) writes an `admin_actions` row only after the Supabase Admin call succeeds; an action on yourself is 400; Admin client unavailable (no service key / network) is 503 and nothing is logged. Ban sets `ban_duration` (24h, 168h, `876000h` = forever) and signs the user out; unban sets `none`; sign-out revokes sessions via the Admin API with `DELETE FROM auth.sessions` as fallback. Ban applies even if the following session removal fails (`meta.signedOut: false`). Delete preflights the Admin client (missing key is 503 before any DB change) and is `deleteAccount(id, { removeAuthUser }, { by: 'admin' })`; if the Supabase user removal fails after the DB commit, the row is still logged with `meta.authRemoved: false` and the answer is 503 (remove the auth user by hand). Delete is confirmed by typing the user's email; `AccountDeleteBlockedError` returns the blocking template clones. Limit: the session check is local JWT (`getClaims`), so an already issued access token keeps working until it expires (up to 1 h); only refresh stops. The UI says the action takes effect within an hour.

## `auth` schema

Ban state and last sign-in come from `auth.users` (`readAuthMeta`, `lib/server/admin/auth-meta.ts`), probed once with `to_regclass('auth.users')`. Without the schema (plain local Postgres) or on a query error the fields are `null` / `authMetaAvailable: false` and the rest of the panel works; the UI shows "n/a".

## Environment

- `ADMIN_HASH_SECRET` (optional): HMAC key for `emailHash`; generate with `openssl rand -base64 32`. Without it re-registration detection is off. Changing it breaks matching against older hashes.
- Existing: `OPS_ADMIN_EMAILS`, `PLATFORM_ADMIN_USER_IDS`, `SUPABASE_SERVICE_ROLE_KEY`.

## Extending

- New tab: page under `app/admin/<tab>/` calling `assertAdmin()` (`lib/server/admin/page-guard.ts`; layout and page render in parallel, so the page must guard itself), a tab entry in the layout, `admin.json` keys in both locales.
- New metric or table: SQL helper in `lib/server/admin/`, thin route with `requirePlatformAdmin`, type in `types/admin.ts`, hook with an `adminKeys` factory. Keep IPs out of logs and non-admin responses.
- New action: extend `runUserAction` plus the `admin_actions.action` values and a `ConfirmDialog` in `components/admin/`.

Live check data: `pnpm admin:seed` (`scripts/admin/seed-fake-activity.ts`, local database only, always wipes the four admin tables first, `--clean` only wipes).
