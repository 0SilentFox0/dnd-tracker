# Platform: auth, fonts, Pusher, prefetch

## Server-side session

`getClaims` (`lib/auth.ts`: `getSessionUserId` / `getAuthUser`; `requireAuth` in `lib/utils/api/api-auth.ts`) is verified locally against the project's asymmetric (ES256) JWT keys, no Supabase Auth round trip. `getUser` only where fresh email/metadata are written (`requireAuthUser`: create/join campaign; auth callback). The proxy runs only the CSRF check on `/api` — routes answer 401 themselves; pages get the session refresh and `/sign-in` redirects. Trade-off (accepted): a revoked session's JWT is trusted until it expires (≤ 1 h).

`lib/supabase/{client,server,middleware}.ts`: `client.ts` from `"use client"` code, `server.ts` (cookie-aware) from server components / route handlers.

## Fonts

Self-hosted (`public/fonts/*.woff2` + `@font-face` in `app/fonts.css`; latin+cyrillic subsets of OFL Google Fonts). Builds never fetch fonts — `next/font/google` broke Vercel builds and is banned by ESLint. First-paint faces are preloaded via `HUD_PRELOAD_FONTS`; files are cached immutable, so rename a file when its content changes.

## Pusher

`lib/pusher/server.ts` (`server-only`, routes/pipeline) / `lib/pusher/client.ts` (`pusher-js`, lazy-imported by `usePusherBattleSync`) / `lib/pusher/channels.ts` (names, safe for both) + `app/api/pusher/auth/route.ts`. Battle pages fall back to polling if Pusher env vars are missing; in production `PUSHER_APP_ID`/`PUSHER_SECRET` must be set or events silently no-op. Channels: `private-battle-<id>` (all members), `private-battle-dm-<id>` (DM only, full unredacted battle delta; auth route checks the DM role), `private-user-<id>`.

## Data in the first HTML

Server pages call the GET handler's own function (`readBattleScene`, `readCharacterSheet`), take the body with `readOkJson` and wrap the client tree in `PrefetchedQuery` (`lib/providers/prefetched-query.tsx`) under the hook's query key; an error status just leaves the client to load as before. Query keys used on the server live in hook `keys.ts` files without `"use client"`.

## Egress

- Public Storage images and audio can be served through a Cloudflare cache Worker (`infra/media-worker`, host in `NEXT_PUBLIC_MEDIA_BASE_URL`). `toMediaUrl` rewrites the host at render time only; stored URLs stay canonical Supabase URLs, uploads still go to Supabase, unsetting the variable rolls back. Free Workers plan: 100k requests/day.

Supabase free tier egress is a hard constraint: avoid re-reading large rows, prefer deltas over refetches, keep polling slow, serve Storage images through `next/image` (cached by Vercel) with long `cacheControl` on immutable uploads.

### Shared assets

Template icons shared between campaigns are immutable. New seeder uploads go to `sets/<template-key>/<sha1><ext>` in the `*-icons` buckets (`ICON_BUCKETS`, `lib/constants/storage.ts`); the same content gives the same path, so re-uploads are skipped (`upsert: false`). Deleting objects in those buckets is forbidden (`lib/__tests__/icon-buckets-immutable.test.ts`), and existing URLs stay valid forever. A DM's local replacement is a new file under their own `{campaignId}/…` prefix and never overwrites a template file.

### Connection pool

`withSafePoolLimits` (`lib/db.ts`) adds `connection_limit` and `pool_timeout` to pooled URLs (Vercel, `pooler.` host or `pgbouncer=true`) without overwriting values already in the URL. Default is 5 connections per instance on Vercel (Fluid Compute serves several requests per instance; Supavisor transaction mode holds many clients) and 10 in dev. Override with `PRISMA_CONNECTION_LIMIT`. After a deploy, check the client count in Supabase → Database → Pooler.

## Profile and avatar

`useSessionUser` returns `SessionUser { id, email, name, avatarUrl }` (`lib/utils/auth/session-user.ts`) and re-derives on `onAuthStateChange`. Avatar resolution order: `user_metadata.custom_avatar_url` (own upload) (accepted only when hosted in our `user-avatars` bucket, since `user_metadata` is client-writable) > OAuth `avatar_url`/`picture` > initials on a hue derived from the user id (`lib/utils/auth/avatar.ts`; `UserAvatar` in `components/auth`). Removing the custom photo falls back to the Google photo, not straight to initials.

Upload goes through the signed-ticket flow into the public bucket `user-avatars` (not `avatars`, which holds campaign character images): `POST` ticket route (`ensureBucket` creates the bucket lazily on the first upload, so no prod setup) -> the browser crops to a 256x256 WebP, or JPEG when the browser (Safari/iOS) cannot encode WebP (`cropSquareToBlob`; the ticket route takes the real `contentType`, is rate-limited per user) and `uploadToSignedUrl` -> commit route accepts only a URL under `user-avatars/<own userId>/` (400 otherwise) and writes `custom_avatar_url` with the admin client; a second upload deletes the previous object, remove clears the metadata and the object. `useAvatar` (`lib/hooks/auth`) guards against double clicks and refreshes the session so the header updates at once.

`/profile` (`app/profile`) is the account hub: `AvatarEditor` plus the list from the `PROFILE_MENU` registry (`components/layout/profile-menu.ts`), the same registry feeds the header dropdown, so a new entry is one row. Unauthenticated requests redirect to `/sign-in?next=/profile`.

## User palettes

`User.palette` stores one of six validated IDs (`tavern`, `midnight`, `forest`, `parchment`, `amethyst`, `frost`). Authenticated `GET`/`PUT /api/theme` return private no-store responses and scope writes to `getSessionUserId()`. `lib/theme/palettes.ts` owns the allowed IDs and labels are in `messages/{uk,en}/common.json`. `ThemeProvider` uses an account-keyed local cache for first paint and cross-tab changes; the authenticated profile remains authoritative. The root layout stays static: a validated, path-aware bootstrap script applies the active cached preference before paint. Landing, authentication and print routes use their original colors. `app/palettes.css` defines the shared HUD and shadcn tokens, with `--book-*` tokens inherited by the shared spellbook used in profiles and battle. `User.palette` is nullable: null/unknown values use `tavern` during migration/backfill windows.

Themed surfaces use Tailwind tokens from `app/globals.css` (`bg-hud-page/surface/raised/panel`, `text-hud-soft/text/muted`, `--color-hud-edge*`/`glow`), never tavern hex values. The language dropdown and the swatch-only palette select live in the footer (`components/layout/Footer.tsx`, hidden on landing/auth/battle/print). The spell book keeps a light paper page with dark ink in every palette (only the cover/accent follow the theme). List cards use `HudCard href` (stretched link) and `ZoomableEntityIcon` (icon click opens it).

## End-to-end battle check on a copy of prod

`./scripts/db/prodcopy-db.sh` (reads prod, recreates local DB `prodcopy`), then `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep` — 5-round battles through the real mutations, targeted triggers, unit control and 5th-level spells; report in `<tmp>/battle-sweep/battle-sweep.md`, exit 1 on errors. Template profiles: `--keep-battles` leaves the run's battles (prints the campaign/template ids and the SQL to clean up by hand); before patching a campaign's rules the sweep writes `.superpowers/sweep-restore/<campaignId>.json` and restores it on the next start if the run died (`scripts/sim/battle-sweep/rules-restore.ts`). `active-battles-report --expect-idle` exits non-zero while any active scene or `pendingMoraleCheck`/`pendingChoice` pause exists (run before and after a deploy).

## Security headers and CSP

- `next.config.ts` sends on every path: an **enforced** baseline CSP (`frame-ancestors`, `object-src`, `base-uri`, `form-action`, `report-uri` + `report-to`), `Reporting-Endpoints`, `Permissions-Policy` (camera/mic/geolocation/payment/usb denied), HSTS, nosniff, Referrer-Policy. Policies live in `lib/security/csp.ts`.
- The full resource policy (`script-src`, `connect-src` for Supabase/Pusher, `img-src`, ...) is still **Report-Only**. Static pages (landing, auth, root-layout palette bootstrap) cannot carry a per-request nonce without turning dynamic, so they keep `script-src 'unsafe-inline'` in report-only; the landing stays static.
- `proxy.ts` generates a nonce only for dynamic prefixes (`NONCE_PATH_PREFIXES`, currently `/campaigns`), forwards it in the request CSP header (Next stamps it on its scripts) and sets `script-src 'nonce-... ' 'strict-dynamic'` on the response, as Report-Only while `NONCE_CSP_ENFORCED` is false. The static Report-Only header is excluded from those prefixes in `next.config.ts` to avoid two policies.
- Promotion: read `[csp-report]` lines in the Vercel logs; when clean, flip `NONCE_CSP_ENFORCED`. Known blocker: the root-layout palette bootstrap `<script>` has no nonce (it would need a hash in `script-src`).
- `POST /api/csp-report` is public (IP rate limit own `csp-report` scope, 120/min, 8 KB body cap, logs directive + origin/path only, never query strings).
- Ratchets: `lib/__tests__/route-auth-ratchet.test.ts` (every `route.ts` reaches an auth provider; public list only shrinks) and `lib/__tests__/migrations-rls.test.ts` (every `CREATE TABLE` has `ENABLE ROW LEVEL SECURITY`).

## Rate limiting deploy notes

- Upstash Redis `critnest-ratelimit` (free plan, fra1) is provisioned through the Vercel Marketplace and connected to production and preview; it injects `KV_REST_API_URL`/`KV_REST_API_TOKEN`, which `lib/redis.ts` reads. `RATE_LIMIT_ALLOW_MEMORY=1` stays as the safety net: a Redis outage degrades to per-instance memory limits instead of 503 for battles.
- Sensitive routes (`failClosed`, e.g. battle mutations, audio) answer 503 in production when Upstash is not configured. Before the first production deploy set `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, or temporarily `RATE_LIMIT_ALLOW_MEMORY=1` (per-instance memory limits instead of 503).
- It never fails closed on Vercel `preview`/`development` (`VERCEL_ENV`) or outside `NODE_ENV=production`.
- IP limits (`lib/utils/api/ip-rate-limit.ts`) trust proxy headers on Vercel only; behind a self-hosted proxy set `TRUST_PROXY=1`, otherwise all clients share one `untrusted-proxy` bucket.
