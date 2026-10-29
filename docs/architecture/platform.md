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

## End-to-end battle check on a copy of prod

`./scripts/db/prodcopy-db.sh` (reads prod, recreates local DB `prodcopy`), then `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep` — 5-round battles through the real mutations, targeted triggers, unit control and 5th-level spells; report in `<tmp>/battle-sweep/battle-sweep.md`, exit 1 on errors.
