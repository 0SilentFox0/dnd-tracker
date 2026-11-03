# Platform: auth, fonts, Pusher, prefetch

## Server-side session

`getClaims` (`lib/auth.ts`: `getSessionUserId` / `getAuthUser`; `requireAuth` in `lib/utils/api/api-auth.ts`) is verified locally against the project's asymmetric (ES256) JWT keys, no Supabase Auth round trip. `getUser` only where fresh email/metadata are written (`requireAuthUser`: create/join campaign; auth callback). The proxy runs only the CSRF check on `/api` — routes answer 401 themselves; pages get the session refresh and `/sign-in` redirects. Trade-off (accepted): a revoked session's JWT is trusted until it expires (≤ 1 h).

`lib/supabase/{client,server,middleware}.ts`: `client.ts` from `"use client"` code, `server.ts` (cookie-aware) from server components / route handlers.

## Fonts

Self-hosted (`public/fonts/*.woff2` + `@font-face` in `app/fonts.css`; latin+cyrillic subsets of OFL Google Fonts). Builds never fetch fonts — `next/font/google` broke Vercel builds and is banned by ESLint. First-paint faces are preloaded via `HUD_PRELOAD_FONTS`; files are cached immutable, so rename a file when its content changes.

## Pusher

`lib/pusher/server.ts` (`server-only`, routes/pipeline) / `lib/pusher/client.ts` (`pusher-js`, lazy-imported by `usePusherBattleSync`) / `lib/pusher/channels.ts` (names, safe for both) + `app/api/pusher/auth/route.ts`. Battle pages fall back to polling if Pusher env vars are missing; in production `PUSHER_APP_ID`/`PUSHER_SECRET` must be set or events silently no-op.

## Data in the first HTML

Server pages call the GET handler's own function (`readBattleScene`, `readCharacterSheet`), take the body with `readOkJson` and wrap the client tree in `PrefetchedQuery` (`lib/providers/prefetched-query.tsx`) under the hook's query key; an error status just leaves the client to load as before. Query keys used on the server live in hook `keys.ts` files without `"use client"`.

## Egress

Supabase free tier egress is a hard constraint: avoid re-reading large rows, prefer deltas over refetches, keep polling slow, serve Storage images through `next/image` (cached by Vercel) with long `cacheControl` on immutable uploads.

### Shared assets

Template icons shared between campaigns are immutable. New seeder uploads go to `sets/<template-key>/<sha1><ext>` in the `*-icons` buckets (`ICON_BUCKETS`, `lib/constants/storage.ts`); the same content gives the same path, so re-uploads are skipped (`upsert: false`). Deleting objects in those buckets is forbidden (`lib/__tests__/icon-buckets-immutable.test.ts`), and existing URLs stay valid forever. A DM's local replacement is a new file under their own `{campaignId}/…` prefix and never overwrites a template file.

### Connection pool

`withSafePoolLimits` (`lib/db.ts`) adds `connection_limit` and `pool_timeout` to pooled URLs (Vercel, `pooler.` host or `pgbouncer=true`) without overwriting values already in the URL. Default is 5 connections per instance on Vercel (Fluid Compute serves several requests per instance; Supavisor transaction mode holds many clients) and 10 in dev. Override with `PRISMA_CONNECTION_LIMIT`. After a deploy, check the client count in Supabase → Database → Pooler.

## User palettes

`User.palette` stores one of six validated IDs (`tavern`, `midnight`, `forest`, `parchment`, `amethyst`, `frost`). Authenticated `GET`/`PUT /api/theme` return private no-store responses and scope writes to `getSessionUserId()`. `lib/theme/palettes.ts` owns the allowed IDs and labels are in `messages/{uk,en}/common.json`. `ThemeProvider` uses an account-keyed local cache for first paint and cross-tab changes; the authenticated profile remains authoritative. The root layout stays static: a validated, path-aware bootstrap script applies the active cached preference before paint. Landing, authentication and print routes use their original colors. `app/palettes.css` defines the shared HUD and shadcn tokens, with `--book-*` tokens inherited by the shared spellbook used in profiles and battle. `User.palette` is nullable: null/unknown values use `tavern` during migration/backfill windows.

Themed surfaces use Tailwind tokens from `app/globals.css` (`bg-hud-page/surface/raised/panel`, `text-hud-soft/text/muted`, `--color-hud-edge*`/`glow`), never tavern hex values. The language dropdown and the swatch-only palette select live in the footer (`components/layout/Footer.tsx`, hidden on landing/auth/battle/print). The spell book keeps a light paper page with dark ink in every palette (only the cover/accent follow the theme). List cards use `HudCard href` (stretched link) and `ZoomableEntityIcon` (icon click opens it).

## End-to-end battle check on a copy of prod

`./scripts/db/prodcopy-db.sh` (reads prod, recreates local DB `prodcopy`), then `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep` — 5-round battles through the real mutations, targeted triggers, unit control and 5th-level spells; report in `<tmp>/battle-sweep/battle-sweep.md`, exit 1 on errors.
