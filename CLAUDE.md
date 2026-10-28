# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It holds rules, layering and gotchas only; subsystem details live in `docs/architecture/` (index: `docs/architecture/README.md`), current work in `docs/STATUS.md`.

## Project

D&D 5e combat tracker — Next.js 16 (App Router) + React 19 + TypeScript (strict) + Prisma 6 + PostgreSQL via Supabase + Pusher for real-time. Package manager: **pnpm** (`pnpm@9.15.5`, `pnpm install --frozen-lockfile` is enforced on Vercel).

The README, ARCHITECTURE.md, and most in-repo docs are written in Ukrainian. Match the existing language when editing existing docs/comments; new code identifiers stay English.

## Common commands

```bash
pnpm dev                       # next dev
pnpm build                     # prisma generate && next build (Vercel uses scripts/vercel-build.mjs — see gotchas)
pnpm lint                      # eslint
pnpm test                      # vitest watch
pnpm test:run                  # vitest run (single pass, used in CI)
pnpm test:run path/to/file.test.ts   # run a single test file
pnpm test:run -t "name pattern"      # filter by test name
pnpm test:changed              # only tests affected by uncommitted changes (vitest module graph)
pnpm test:changed main         # only tests affected by the branch vs main
pnpm test:related lib/a.ts lib/b.ts  # only tests that import these files
```

Prisma:

```bash
pnpm exec prisma generate              # regenerate client (also runs in postinstall, but skipped on Vercel)
pnpm exec prisma migrate dev --name X  # create + apply a new migration locally
pnpm migrate:deploy                    # apply migrations against DIRECT_URL from .env.local
pnpm exec prisma studio
```

End-to-end battle check on a copy of prod: `./scripts/db/prodcopy-db.sh` (reads prod, recreates local DB `prodcopy`), then `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep` — 5-round battles through the real mutations, targeted triggers, unit control and 5th-level spells; report in `<tmp>/battle-sweep/battle-sweep.md`, exit 1 on errors.

Many one-off ops live in `scripts/` and run via `tsx` (e.g. `pnpm import-units`, `pnpm seed-mock-battle`, `pnpm upload-assets-to-supabase`). Check `package.json` scripts before writing new tooling.

## Working on a feature

- **Reuse before writing.** Before a spec/plan, search `lib/utils`, `lib/hooks`, `components/common`, `components/ui`, `components/hud` and `lib/utils/api` for an existing solution, and list in the spec what is reused (and why something new is needed). Duplication here comes mostly from parallel sessions solving the same thing twice.
- **End of branch:** run `/simplify` on the branch diff (besides the review), then update the touched `docs/architecture/*.md` and `docs/STATUS.md`.
- **Specs/plans:** active ones in `docs/superpowers/{specs,plans}`; when the feature is merged, `git mv` them to `docs/archive/superpowers/` in the merge commit.
- **CRUD routes** (`races`, `spells`, `main-skills`, `units`, `artifact-sets`, …) are not refactored on main: a shared CRUD route factory is the first step of constructor stage 2 (`feat/constructor`). Keep new CRUD logic in schemas/helpers, not in `route.ts` bodies.

## Architecture

### Layering (request flow)

1. **`app/campaigns/[id]/...`** — pages. Server component (`page.tsx`) fetches/forwards data, then renders a `*-client.tsx` (or `page-client.tsx`) marked `"use client"` for interactive UI. DM-only pages live under `app/campaigns/[id]/dm/`.
2. **`app/api/campaigns/[id]/...`** — route handlers. `route.ts` should stay thin: Zod validation, session check, then delegate to a sibling handler/helper file (e.g. `attack-handler.ts`, `build-character-update-data.ts`). Heavy logic does **not** belong in `route.ts`. Shared helpers in `lib/utils/api`: `parseBody(schema, req)` (400 on malformed JSON or a Zod error), `loadOwned(query, campaignId)` (404/403 for entities of another campaign), `requireCampaignAccess`/`requireDM` (`isDM` on the result), `errorResponse` — every error is `{ error: string, issues? }` with the Ukrainian texts from `lib/constants/api-errors.ts`.
3. **`lib/api/<domain>.ts`** — thin client wrappers (`get`/`create`/`update`/`delete`) used by client components/hooks. Do not call `fetch` directly from components — extend the matching `lib/api` module.
4. **`lib/hooks/<domain>/`** — TanStack Query hooks and form/state hooks per domain (`battles`, `battle` (single-battle scene), `characters`, `skills`, `spells`, `units`, `races`, `campaigns`, `common`). Each domain folder has an `index.ts` barrel; import from the folder, not deep paths. Query keys are factories in the domain's `keys.ts` (`spellKeys.list(campaignId)`, kebab-case names) — never inline arrays.
5. **`lib/utils/<domain>/`** — pure domain logic (esp. `battle/`, `abilities/`, `spells/`). Tests sit in sibling `__tests__/` folders.

### Key cross-cutting modules

- **`lib/db.ts`** — singleton `PrismaClient`. `withSafePoolLimits` rewrites `DATABASE_URL` to add `connection_limit` (1 on Vercel/pgbouncer, 10 in dev). Always import `prisma` from here, never `new PrismaClient()`.
- **`lib/supabase/{client,server,middleware}.ts`** — Supabase Auth. Use `client.ts` from `"use client"` code, `server.ts` (cookie-aware) from server components / route handlers.
- **Server-side session = `getClaims`** (`lib/auth.ts`: `getSessionUserId` / `getAuthUser`; `requireAuth` in `lib/utils/api/api-auth.ts`) — verified locally against the project's asymmetric (ES256) JWT keys, no Supabase Auth round trip. `getUser` only where fresh email/metadata are written (`requireAuthUser`: create/join campaign; auth callback). The proxy runs only the CSRF check on `/api` — routes answer 401 themselves; pages get the session refresh and `/sign-in` redirects. Trade-off (accepted): a revoked session's JWT is trusted until it expires (≤ 1 h).
- **Fonts are self-hosted** (`public/fonts/*.woff2` + `@font-face` in `app/fonts.css`; latin+cyrillic subsets of OFL Google Fonts). Builds never fetch fonts — `next/font/google` broke Vercel builds and is banned by ESLint. First-paint faces are preloaded via `HUD_PRELOAD_FONTS`; files are cached immutable, so rename a file when its content changes.
- **Pusher:** `lib/pusher/server.ts` (`server-only`, routes/pipeline) / `lib/pusher/client.ts` (`pusher-js`, lazy-imported by `usePusherBattleSync`) / `lib/pusher/channels.ts` (names, safe for both) + `app/api/pusher/auth/route.ts`. Battle pages fall back to polling if Pusher env vars are missing; in production `PUSHER_APP_ID`/`PUSHER_SECRET` must be set or events silently no-op.
- **`lib/providers/query-provider.tsx`** — TanStack Query provider; wired into `app/layout.tsx`.
- **Data in the first HTML:** server pages call the GET handler's own function (`readBattleScene`, `readCharacterSheet`), take the body with `readOkJson` and wrap the client tree in `PrefetchedQuery` (`lib/providers/prefetched-query.tsx`) under the hook's query key; an error status just leaves the client to load as before. Query keys used on the server live in hook `keys.ts` files without `"use client"`.
- **`types/<domain>.ts`** — cross-domain TS types; import from `@/types/<domain>` (there is no barrel). Prefer adding to an existing domain file over creating new top-level types.

### Subsystems — rules that must not be broken

Details in `docs/architecture/`; read the file before changing the subsystem.

- **Battle** ([battle.md](docs/architecture/battle.md)): every battle route = Zod schema + `runBattleMutation` (`lib/server/battles/run-mutation.ts`, pure engine in `lib/utils/battle/pipeline/`) + `<action>-mutation.ts` in `lib/server/battles/mutations/<action>/` with pure engine code. Anything writing `battle_participants.snapshot` must write `snapshotHash` too. Turn advance only through `lib/utils/battle/turn/advanceTurn`. Damage → `applyDamageConsequences` right after the primitive; effect removal via `removeEffects`. Responses are deltas (`ClientBattleDelta`), not full scenes.
- **Balance** ([balance.md](docs/architecture/balance.md)): no difficulty setting; setup UI and battle start call the same `computeFairScaling`.
- **Map modes** ([map-modes.md](docs/architecture/map-modes.md)): core never imports a mode directly (ESLint); a new mode = folders + registry rows.
- **Abilities** ([abilities.md](docs/architecture/abilities.md)): engine reads bonuses only via `collectModifiers`/`runAbilities`, the `abilities` column only via `lib/utils/abilities/read.ts`.
- **Show/music** ([show.md](docs/architecture/show.md)): `campaign_shows` rows are never deleted, `seq` only grows.
- **AI** ([ai.md](docs/architecture/ai.md)): the provider key never leaves the server (no logs/errors/responses); scenario changes only via `ai_proposals` + apply; a new tool = file in `lib/ai/tools` + row in `AI_TOOLS` (serves both chat and `/api/mcp`).
- **Onboarding** ([onboarding.md](docs/architecture/onboarding.md)): checklist progress is derived from DB facts, never stored; `user_onboarding_flags` holds only dismissed/seen keys. A user-facing feature adds an entry to `lib/onboarding/whats-new.ts` (and a hint/help article when it adds a screen).

### Path alias & imports

- Alias: `@/*` → repo root (set in both `tsconfig.json` and `vitest.config.mts`). Always use `@/lib/...` rather than relative `../../`.
- Import order is enforced by `simple-import-sort` (see `eslint.config.mjs`); `pnpm lint --fix` will reorder for you.
- `import/no-cycle` is on at maxDepth 1 — fix circular imports rather than working around them.
- `padding-line-between-statements` requires a blank line around `const`/`let`/`var`/`if`/`function`/`class`/`return`/blocks — auto-fixable but easy to miss when hand-editing.

### Component API conventions

- Aim for ≤ ~7 props. Pass domain objects (`participant`, `character`, `form`) instead of exploding their fields into separate props.
- Group related callbacks into one object prop (`actions={{ onRename, onDelete }}`) rather than many `onX` props.
- Deep trees (battle scene, character view, skill tree) use a context provider instead of drilling `battle`/`handlers`/`mutations` bags through 3+ levels.
- Shared UI goes in `components/common` or `components/ui`; check there before writing a new card, dialog, avatar or empty state.
- Dialogs: `ResponsiveDialog` (`components/ui/responsive-dialog`) — modal on desktop, `vaul` bottom sheet on phones. Never Radix `Dialog`/`AlertDialog` or `vaul` directly (ESLint enforces outside `components/ui`). Buttons go in its `footer`; a footer submit button needs `form="<form id>"`.
- Confirmations and notices: `useConfirm()` / `useNotify()` from `@/lib/hooks/common`, never `window.confirm`/`alert` (ESLint enforces). Component tests render them inside `ConfirmProvider` (`components/ui/__tests__/render-with-confirm.tsx`).
- Forms: `HudFormPage` + `HudForm` (tabs via `HudTab`, section headings via `HudSection`) from `components/hud/form`; form dialogs use `ResponsiveDialog hud`. Inside `.hud-surface` the shadcn tokens are HUD-coloured and the HUD text variable is `--hud-muted`. Accordions only in lists, never in forms.
- Pages (lists, dashboards): `HudPage` + `HudPageHeader`, items as `HudCard` / `HudTile`, filters as `HudChipTabs`, panels `HudPanel` (`components/hud/page`); the section art (`body::before`, picked in `app/globals.css` by the `data-screen-bg` marker that a segment `layout.tsx` renders via `screenBackgroundLayout` from `components/layout/screen-background.tsx`; no marker → tavern) stays visible behind the translucent panels. Print pages (`dm/print/*`) stay light.
- Page states: `components/common/states` (`QueryState`, `EmptyState`, `LoadingState`, `ErrorState`); form buttons: `ActionBar`.
- Layering: components never import `@/lib/api/*`. Requests live in `lib/api/<domain>`; loading, mutations and non-trivial logic live in hooks (`lib/hooks/<domain>`); a component calls a hook and renders. Enforced by ESLint (`no-restricted-imports` on `@/lib/api/*` in `app/**` except `app/api/**`, and in `components/**`).

### Lint/TS conventions enforced by ESLint

- `no-console` allows only `info`/`warn`/`error` outside `scripts/` and `app/api/**`. Don't add `console.log` to client/lib code.
- `@typescript-eslint/no-explicit-any` is a warning — avoid `any`; prefer generics or `unknown` + narrowing.
- `react-hooks/exhaustive-deps` is `error`, not warn.
- Strict TS is on; `strictNullChecks` etc. are active.

## Database & deployment gotchas

These trip people up repeatedly — read before touching the DB or `vercel.json`.

- **Migrations run automatically only in production builds.** `vercel.json` runs `node scripts/vercel-build.mjs`: `prisma generate` (placeholder URL) → `prisma migrate deploy` (only when `VERCEL_ENV=production`, via `DIRECT_URL`) → `next build`. Preview builds never migrate because they share the same DB. New migration: `pnpm exec prisma migrate dev --name X` against a local/shadow DB, then merge to `main`. History was squashed into `20261005000000_init` when moving to the new Supabase project.
- **`DIRECT_URL` (port 5432) is required in Vercel Production** — without it the build fails with an explanatory error.
- **Production builds from a branch other than `main`** fail on purpose, so an unmerged migration never reaches the prod DB. Override with `ALLOW_PROD_MIGRATE=1` only deliberately.
- **Migrations must be expand-only** (add columns/tables, backfill, drop later): `migrate deploy` runs before `next build`, and a Vercel rollback does not revert the schema.
- **Every `CREATE TABLE` migration must also `ALTER TABLE … ENABLE ROW LEVEL SECURITY`** — Supabase exposes `public` tables to the anon key otherwise. `prisma/__tests__/migrations-rls.test.ts` enforces it.
- **Regions:** Supabase `eu-central-1`, Vercel functions `fra1`, Pusher cluster `eu`. Don't move one without the others — every DB round trip across continents adds ~100 ms.
- **`DATABASE_URL` for Vercel = Transaction pooler (port 6543) with `?pgbouncer=true&sslmode=require`.** The Direct connection (port 5432) is only for one-off DDL/backups (`scripts/db/backup-database.sh`, manual migrations).
- **Local dev uses a Docker Postgres** (`pnpm db:local`, port 54322) so `pnpm dev` doesn't burn the Supabase free-tier egress quota. Prod connection strings live in `.env.production-db.local`; Supabase Auth/Storage and Pusher stay cloud even in dev.
- **Egress is a hard constraint (Supabase free tier).** Avoid re-reading large rows, prefer deltas over refetches, keep polling slow, serve Storage images through `next/image` (cached by Vercel) with long `cacheControl` on immutable uploads.
- **Local dev pointing at the prod DB is intentional in some setups** — see `docs/DATABASE-SYNC.md`. Don't assume divergence is a bug without checking which `DATABASE_URL` is set.
- **Vercel build placeholder URL.** `scripts/vercel-build.mjs` runs `prisma generate` with `DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build` to avoid Prisma CLI hanging on the real Supabase pooler from the build region. Do not "fix" this by removing the placeholder.
- **`scripts/` imports can't invalidate the Next data cache.** Reference data cached in `lib/cache/reference-data.ts` (`unstable_cache` + tags from `lib/cache/tags.ts`) is revalidated only by app writes (`invalidateReference`); after a `tsx` import it may stay stale for up to `REFERENCE_REVALIDATE_SECONDS` = 300 s.
- **`postinstall`** is `node scripts/postinstall.mjs`, which skips `prisma generate` when `VERCEL` env is set (build runs it explicitly with the placeholder URL).

## Testing

- **Don't run the full suite after every step** (~5k tests, ~50 s, heavy CPU). While working — `pnpm test:changed` / `pnpm test:related <files>`; the full `pnpm test:run` once before merge/push (and in a subagent-driven run — once at the end, not per task). Fall back to the full suite when changing `vitest.config.mts`, `vitest-setup.ts`, shared test helpers, or `package.json` deps — the module graph can't see those.
- **Vitest** with `environment: "node"` (not jsdom by default) — UI tests that need a DOM should set `// @vitest-environment happy-dom` or jsdom at the top of the file.
- Tests live in sibling `__tests__/` folders next to the code they cover. Match this convention rather than adding a top-level `tests/` dir.
- Coverage target is `lib/**/*.ts` (excluding tests). Run `pnpm test:run --coverage` for an HTML report in `coverage/`.

## Where to look first

- New API endpoint → `app/api/campaigns/[id]/<domain>/route.ts`, then `lib/api/<domain>.ts`, then a hook in `lib/hooks/<domain>/`, then types in `types/<domain>.ts`.
- New battle mechanic → `docs/architecture/battle.md`, then `lib/utils/battle/` (server-side rules) and the matching handler under `app/api/campaigns/[id]/battles/[battleId]/`. UI lives in `components/battle/`.
- D&D rule constants (abilities, alignments, spell slots, hero scaling, critical effects, artifacts) → `lib/constants/`. Reuse before adding new ones.
- Prisma schema lives in `prisma/schema.prisma`; migrations in `prisma/migrations/`. After editing the schema, run `pnpm exec prisma generate` (and create a migration if the change is structural).
