# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

D&D 5e combat tracker — Next.js 16 (App Router) + React 19 + TypeScript (strict) + Prisma 6 + PostgreSQL via Supabase + Pusher for real-time. Package manager: **pnpm** (`pnpm@9.15.5`, `pnpm install --frozen-lockfile` is enforced on Vercel).

The README, ARCHITECTURE.md, and most in-repo docs are written in Ukrainian. Match the existing language when editing existing docs/comments; new code identifiers stay English.

## Common commands

```bash
pnpm dev                       # next dev with BATTLE_TURN_TIMING=1 (extra battle timing logs)
pnpm build                     # prisma generate && next build (Vercel uses scripts/vercel-build.mjs — see gotchas)
pnpm lint                      # eslint
pnpm test                      # vitest watch
pnpm test:run                  # vitest run (single pass, used in CI)
pnpm test:run path/to/file.test.ts   # run a single test file
pnpm test:run -t "name pattern"      # filter by test name
```

Prisma:

```bash
pnpm exec prisma generate              # regenerate client (also runs in postinstall, but skipped on Vercel)
pnpm exec prisma migrate dev --name X  # create + apply a new migration locally
pnpm migrate:deploy                    # apply migrations against DIRECT_URL from .env.local
pnpm exec prisma studio
```

Many one-off ops live in `scripts/` and run via `tsx` (e.g. `pnpm import-docs-spells`, `pnpm seed-mock-battle`, `pnpm migrate-spell-icons-to-supabase`). Check `package.json` scripts before writing new tooling.

## Architecture

### Layering (request flow)

1. **`app/campaigns/[id]/...`** — pages. Server component (`page.tsx`) fetches/forwards data, then renders a `*-client.tsx` (or `page-client.tsx`) marked `"use client"` for interactive UI. DM-only pages live under `app/campaigns/[id]/dm/`.
2. **`app/api/campaigns/[id]/...`** — route handlers. `route.ts` should stay thin: Zod validation, session check, then delegate to a sibling handler/helper file (e.g. `attack-handler.ts`, `build-character-update-data.ts`). Heavy logic does **not** belong in `route.ts`.
3. **`lib/api/<domain>.ts`** — thin client wrappers (`get`/`create`/`update`/`delete`) used by client components/hooks. Do not call `fetch` directly from components — extend the matching `lib/api` module.
4. **`lib/hooks/<domain>/`** — TanStack Query hooks and form/state hooks per domain (`battles`, `battle` (single-battle scene), `characters`, `skills`, `spells`, `units`, `races`, `campaigns`, `common`). Each domain folder has an `index.ts` barrel; import from the folder, not deep paths.
5. **`lib/utils/<domain>/`** — pure domain logic (esp. `battle/` for attacks, damage, spells, participants, balance; `abilities/` for the unified ability model (schema, registry, `runAbilities`, `collectModifiers`, `read.ts` — the only reader of `abilities` columns); `spells/` for learning rules). Tests sit in sibling `__tests__/` folders.

### Key cross-cutting modules

- **`lib/db.ts`** — singleton `PrismaClient`. `withSafePoolLimits` rewrites `DATABASE_URL` to add `connection_limit` (1 on Vercel/pgbouncer, 10 in dev). Always import `prisma` from here, never `new PrismaClient()`.
- **`lib/supabase/{client,server,middleware}.ts`** — Supabase Auth. Use `client.ts` from `"use client"` code, `server.ts` (cookie-aware) from server components / route handlers.
- **`lib/pusher.ts`** + **`app/api/pusher/auth/route.ts`** — Pusher channels for real-time battle sync. Battle pages fall back to polling if Pusher env vars are missing; in production the server-side env vars (`PUSHER_APP_ID`, `PUSHER_SECRET`) must be set or events silently no-op.
- **`lib/providers/query-provider.tsx`** — TanStack Query provider; wired into `app/layout.tsx`.
- **`types/index.ts`** — single barrel for cross-domain TS types. Prefer adding to an existing domain file in `types/` over creating new top-level types.

### Battle data flow (the most complex part)

Page `app/campaigns/[id]/battles/[battleId]/page.tsx` (server: `userId` from `getClaims`) → `BattlePageClient` → `useBattleSceneValue` + `BattleSceneProvider` (`lib/hooks/battle`, read with `useBattleScene()`) → `BattleScreen` (`components/battle/scene`: mobile layout < 1024 px, desktop three columns ≥ 1024 px) → mutations in `lib/hooks/battles/useBattles.ts` (all through `useBattleAction`) → `lib/api/battles.ts` → route in `app/api/campaigns/[id]/battles/[battleId]/<action>/route.ts`.

- **Every battle route** is a Zod schema + `runBattleMutation` (`lib/utils/battle/pipeline/`) with a sibling `<action>-mutation.ts`. The pipeline does auth (`getClaims`), loads the battle in one query (`lib/utils/battle/store/loadBattle`), checks access (`dm` / `turnController` / `currentController` / `member`) and status, runs `mutate` (pure engine code from `lib/utils/battle/*`, `lib/utils/abilities/*`), checks victory once, saves with an optimistic `version` lock (`saveBattle`: changed `battle_participants` rows in one `UPDATE … FROM (VALUES …)` without reading rows back, append-only `battle_events`, `battle_snapshots` for rollback — pruned to the last 20 when the battle completes) and answers `{ delta, response? }` (`ClientBattleDelta` from `pipeline/client-delta.ts`: new participants and those whose snapshot changed go in `upserted`, the rest as `patched` with only the column/state fields from `PATCHABLE_PARTICIPANT_FIELDS`); Pusher gets `battle-delta` (or `{ refetch: true }` above 9 500 bytes) after the response (`after()`). `GET /` and `dryRun` still return the full `BattleScene` with the last 30 events; older ones come from `GET /events?before=<seq>` («Показати раніші», `useBattleLogHistory`), and `GET /?versionOnly=1` answers `{ version }`.
- **Turn advance** has one engine: `lib/utils/battle/turn/advanceTurn` (used by next-turn and attack with `endTurn`).
- **Client cache:** `applyBattleDelta` (`lib/utils/battle/client`) patches the cached `BattleScene` (old version ignored, gap or patch for an unknown id → one GET). After a Pusher gap or a tab hidden > 15 s, `usePusherBattleSync` asks for the version and refetches only when it is newer. `useBattleAction` sends `expectedVersion`; 409 → refetch + battle toast. `actionIndex` in the client log is the event `seq` (rollback target).
- **Player UI logic:** wizards (attack, spellbook, player turn) are reducers in `lib/utils/battle/flows` driven by hooks in `lib/hooks/battle`; what a player may see (health states instead of enemy HP, AC known from attacks, observed traits from `actionDetails.damageSteps`, turn queue with morale extra turns) is `lib/utils/battle/view`. Hiding is client-side.
- **Abilities** (skills, races, artifacts, sets, units) share one model in `lib/utils/abilities/`: engine code fires typed events into `runAbilities` (limits, chance, `lethalDamage` → `kill`) and reads every stat/damage/resistance/flag bonus via `collectModifiers` — never from raw skill JSON. Owners have an `abilities JSONB` column; edit forms write `abilities` directly through `AbilityListEditor` (`components/abilities`); read them with `lib/utils/abilities/read.ts` (column is `NOT NULL DEFAULT '[]'`). Old-format converters live only in `scripts/legacy-convert/` (for `import-skills-library`).
- When changing battle behavior, expect to touch the mutation, the engine util, and possibly the hook and UI under `components/battle/`.

### Path alias & imports

- Alias: `@/*` → repo root (set in both `tsconfig.json` and `vitest.config.mts`). Always use `@/lib/...` rather than relative `../../`.
- Import order is enforced by `simple-import-sort` (see `eslint.config.mjs`): react/next/external → `@/`-rooted internal groups (`utils`, `services`, `hooks`, `types`, `pages`, `gql`, `components`, `layouts`, `styles`, `app-constants`, `lib`) → relative → assets. `pnpm lint --fix` will reorder for you.
- `import/no-cycle` is on at maxDepth 1 — fix circular imports rather than working around them.
- `padding-line-between-statements` requires a blank line around `const`/`let`/`var`/`if`/`function`/`class`/`return`/blocks — auto-fixable but easy to miss when hand-editing.

### Component API conventions

- Aim for ≤ ~7 props. Pass domain objects (`participant`, `character`, `form`) instead of exploding their fields into separate props.
- Group related callbacks into one object prop (`actions={{ onRename, onDelete }}`) rather than many `onX` props.
- Deep trees (battle scene, character view, skill tree) use a context provider instead of drilling `battle`/`handlers`/`mutations` bags through 3+ levels.
- Shared UI goes in `components/common` or `components/ui`; check there before writing a new card, dialog, avatar or empty state.
- Dialogs: `ResponsiveDialog` (`components/ui/responsive-dialog`) — modal on desktop, `vaul` bottom sheet on phones. Never Radix `Dialog`/`AlertDialog` or `vaul` directly (ESLint enforces outside `components/ui`). Buttons go in its `footer`; a footer submit button needs `form="<form id>"`.
- Confirmations and notices: `useConfirm()` / `useNotify()` from `@/lib/hooks/common` (provider in `app/layout.tsx`), never `window.confirm`/`alert` (ESLint enforces). Component tests render them inside `ConfirmProvider` (`components/ui/__tests__/render-with-confirm.tsx`).
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
- **Production builds from a branch other than `main`** (`vercel --prod` from a branch, CLI without git ref) fail on purpose, so an unmerged migration never reaches the prod DB. Override with `ALLOW_PROD_MIGRATE=1` only deliberately.
- **Migrations must be expand-only** (add columns/tables, backfill, drop later): `migrate deploy` runs before `next build`, and a Vercel rollback does not revert the schema.
- **Every `CREATE TABLE` migration must also `ALTER TABLE … ENABLE ROW LEVEL SECURITY`** — Supabase exposes `public` tables to the anon key otherwise. `prisma/__tests__/migrations-rls.test.ts` enforces it.
- **Regions:** Supabase `eu-central-1`, Vercel functions `fra1`, Pusher cluster `eu`. Don't move one without the others — every DB round trip across continents adds ~100 ms.
- **`DATABASE_URL` for Vercel = Transaction pooler (port 6543) with `?pgbouncer=true&sslmode=require`.** The Direct connection (port 5432) is only for one-off DDL/backups (`scripts/backup-database.sh`, manual migrations).
- **Local dev uses a Docker Postgres** (`pnpm db:local`, port 54322) so `pnpm dev` doesn't burn the Supabase free-tier egress quota. Prod connection strings live in `.env.production-db.local`; Supabase Auth/Storage and Pusher stay cloud even in dev.
- **Egress is a hard constraint (Supabase free tier).** Avoid re-reading large rows, prefer deltas over refetches, keep polling slow, serve Storage images through `next/image` (cached by Vercel) with long `cacheControl` on immutable uploads.
- **Local dev pointing at the prod DB is intentional in some setups** — see `docs/DATABASE-SYNC.md` for the "one DB" vs "dev + prod" tradeoffs and the backup/restore scripts. Don't assume divergence is a bug without checking which `DATABASE_URL` is set.
- **Vercel build placeholder URL.** `scripts/vercel-build.mjs` runs `prisma generate` with `DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build` to avoid Prisma CLI hanging on the real Supabase pooler from the build region. The real `DATABASE_URL` from Vercel env is still used by `next build` and at runtime. Do not "fix" this by removing the placeholder.
- **`scripts/` imports can't invalidate the Next data cache.** Reference data cached in `lib/cache/reference-data.ts` (spells, skills, units, races, main skills; `unstable_cache` + tags from `lib/cache/tags.ts`) is revalidated only by app writes (`invalidateReference`); after a `tsx` import it may stay stale for up to `REFERENCE_REVALIDATE_SECONDS` = 300 s unless something writes through the app again.
- **`postinstall`** is `node scripts/postinstall.mjs`, which skips `prisma generate` when `VERCEL` env is set (build runs it explicitly with the placeholder URL).

## Testing

- **Vitest** with `environment: "node"` (not jsdom by default) — UI tests that need a DOM should set `// @vitest-environment happy-dom` or jsdom at the top of the file. `happy-dom` and `jsdom` are both available.
- Tests live in sibling `__tests__/` folders next to the code they cover (`lib/utils/battle/__tests__`, `lib/hooks/battle/__tests__`, `app/api/__tests__`, `components/skills/__tests__`, etc.). Match this convention rather than adding a top-level `tests/` dir.
- Coverage target is `lib/**/*.ts` (excluding tests). Run `pnpm test:run --coverage` for an HTML report in `coverage/`.

## Where to look first

- New API endpoint → `app/api/campaigns/[id]/<domain>/route.ts`, then `lib/api/<domain>.ts`, then a hook in `lib/hooks/<domain>/`, then types in `types/<domain>.ts`.
- New battle mechanic → start in `lib/utils/battle/` (server-side rules) and the matching handler under `app/api/campaigns/[id]/battles/[battleId]/`. UI lives in `components/battle/`.
- D&D rule constants (abilities, alignments, spell slots, hero scaling, critical effects, artifacts) → `lib/constants/`. Reuse before adding new ones.
- Prisma schema lives in `prisma/schema.prisma`; migrations in `prisma/migrations/`. After editing the schema, run `pnpm exec prisma generate` (and create a migration if the change is structural).
