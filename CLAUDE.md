# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

D&D 5e combat tracker — Next.js 16 (App Router) + React 19 + TypeScript (strict) + Prisma 6 + PostgreSQL via Supabase + Pusher for real-time. Package manager: **pnpm** (`pnpm@9.15.5`, `pnpm install --frozen-lockfile` is enforced on Vercel).

The README, ARCHITECTURE.md, and most in-repo docs are written in Ukrainian. Match the existing language when editing existing docs/comments; new code identifiers stay English.

## Common commands

```bash
pnpm dev                       # next dev with BATTLE_TURN_TIMING=1 (extra battle timing logs)
pnpm build                     # prisma generate && next build  (no migrate deploy — see "Migrations")
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
pnpm exec prisma migrate deploy        # apply migrations against $DATABASE_URL (do NOT run in Vercel build)
pnpm exec prisma studio
```

Many one-off ops live in `scripts/` and run via `tsx` (e.g. `pnpm import-spells`, `pnpm seed-mock-battle`, `pnpm migrate-spell-icons-to-supabase`). Check `package.json` scripts before writing new tooling.

## Architecture

### Layering (request flow)

1. **`app/campaigns/[id]/...`** — pages. Server component (`page.tsx`) fetches/forwards data, then renders a `*-client.tsx` (or `page-client.tsx`) marked `"use client"` for interactive UI. DM-only pages live under `app/campaigns/[id]/dm/`.
2. **`app/api/campaigns/[id]/...`** — route handlers. `route.ts` should stay thin: Zod validation, session check, then delegate to a sibling handler/helper file (e.g. `attack-handler.ts`, `build-character-update-data.ts`). Heavy logic does **not** belong in `route.ts`.
3. **`lib/api/<domain>.ts`** — thin client wrappers (`get`/`create`/`update`/`delete`) used by client components/hooks. Do not call `fetch` directly from components — extend the matching `lib/api` module.
4. **`lib/hooks/<domain>/`** — TanStack Query hooks and form/state hooks per domain (`battles`, `battle` (single-battle scene), `characters`, `skills`, `spells`, `units`, `races`, `campaigns`, `common`). Each domain folder has an `index.ts` barrel; import from the folder, not deep paths.
5. **`lib/utils/<domain>/`** — pure domain logic (esp. `battle/` for attacks, damage, spells, participants, balance; `skills/` for trigger evaluation + execution; `spells/` for learning rules). Tests sit in sibling `__tests__/` folders.

### Key cross-cutting modules

- **`lib/db.ts`** — singleton `PrismaClient`. `withSafePoolLimits` rewrites `DATABASE_URL` to add `connection_limit` (1 on Vercel/pgbouncer, 10 in dev). Always import `prisma` from here, never `new PrismaClient()`.
- **`lib/supabase/{client,server,middleware}.ts`** — Supabase Auth. Use `client.ts` from `"use client"` code, `server.ts` (cookie-aware) from server components / route handlers.
- **`lib/pusher.ts`** + **`app/api/pusher/auth/route.ts`** — Pusher channels for real-time battle sync. Battle pages fall back to polling if Pusher env vars are missing; in production the server-side env vars (`PUSHER_APP_ID`, `PUSHER_SECRET`) must be set or events silently no-op.
- **`lib/providers/query-provider.tsx`** — TanStack Query provider; wired into `app/layout.tsx`.
- **`types/index.ts`** — single barrel for cross-domain TS types. Prefer adding to an existing domain file in `types/` over creating new top-level types.

### Battle data flow (the most complex part)

Page `app/campaigns/[id]/battles/[battleId]/page.tsx` → `useBattleSceneLogic` (in `lib/hooks/battle/`) → mutations like `useAttackFlow`, `useNextTurn`, `useCastSpell`. Mutations call `lib/api/battles.ts` → server route in `app/api/campaigns/[id]/battles/[battleId]/...` → server-side helpers in `lib/utils/battle/{attack,attack-and-next-turn,damage,spell,participant,resistance,triggers,balance}/` → mutates `BattleScene` row in Postgres → server emits a Pusher event → all connected clients update via `usePusherBattleSync`. When changing battle behavior, expect to touch all four layers (api route + util + hook + UI component under `components/battle/`).

### Path alias & imports

- Alias: `@/*` → repo root (set in both `tsconfig.json` and `vitest.config.mts`). Always use `@/lib/...` rather than relative `../../`.
- Import order is enforced by `simple-import-sort` (see `eslint.config.mjs`): react/next/external → `@/`-rooted internal groups (`utils`, `services`, `hooks`, `types`, `pages`, `gql`, `components`, `layouts`, `styles`, `app-constants`, `lib`) → relative → assets. `pnpm lint --fix` will reorder for you.
- `import/no-cycle` is on at maxDepth 1 — fix circular imports rather than working around them.
- `padding-line-between-statements` requires a blank line around `const`/`let`/`var`/`if`/`function`/`class`/`return`/blocks — auto-fixable but easy to miss when hand-editing.

### Lint/TS conventions enforced by ESLint

- `no-console` allows only `info`/`warn`/`error` outside `scripts/` and `app/api/**`. Don't add `console.log` to client/lib code.
- `@typescript-eslint/no-explicit-any` is a warning — avoid `any`; prefer generics or `unknown` + narrowing.
- `react-hooks/exhaustive-deps` is `error`, not warn.
- Strict TS is on; `strictNullChecks` etc. are active.

## Database & deployment gotchas

These trip people up repeatedly — read before touching the DB or `vercel.json`.

- **`vercel.json` build is `prisma generate && next build` — not `migrate deploy`.** The Prisma `_prisma_migrations` table is not baselined against the existing Supabase schema, so adding `migrate deploy` to the build crashes with **P3005** (`database schema is not empty`). Apply schema changes via Supabase SQL editor / Supabase MCP `apply_migration`, or by running `pnpm exec prisma migrate deploy` locally against the production `DATABASE_URL` after a baseline. See `docs/VERCEL.md` for the baseline procedure.
- **`DATABASE_URL` for Vercel = Transaction pooler (port 6543) with `?pgbouncer=true&sslmode=require`.** The Direct connection (port 5432) is only for one-off DDL/backups (`scripts/backup-database.sh`, manual migrations).
- **Local dev pointing at the prod DB is intentional in some setups** — see `docs/DATABASE-SYNC.md` for the "one DB" vs "dev + prod" tradeoffs and the backup/restore scripts. Don't assume divergence is a bug without checking which `DATABASE_URL` is set.
- **Vercel build placeholder URL.** `vercel.json` runs `prisma generate` with `DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build` to avoid Prisma CLI hanging on the real Supabase pooler from the build region. The real `DATABASE_URL` from Vercel env is still used by `next build` and at runtime. Do not "fix" this by removing the placeholder.
- **`postinstall`** is `node scripts/postinstall.mjs`, which skips `prisma generate` when `VERCEL` env is set (build runs it explicitly with the placeholder URL).

## Testing

- **Vitest** with `environment: "node"` (not jsdom by default) — UI tests that need a DOM should set `// @vitest-environment happy-dom` or jsdom at the top of the file. `happy-dom` and `jsdom` are both available.
- Tests live in sibling `__tests__/` folders next to the code they cover (`lib/utils/battle/__tests__`, `lib/hooks/battle/__tests__`, `app/api/__tests__`, `components/skills/__tests__`, etc.). Match this convention rather than adding a top-level `tests/` dir.
- Coverage target is `lib/**/*.ts` (excluding tests). Run `pnpm test:run --coverage` for an HTML report in `coverage/`.

## Where to look first

- New API endpoint → `app/api/campaigns/[id]/<domain>/route.ts`, then `lib/api/<domain>.ts`, then a hook in `lib/hooks/<domain>/`, then types in `types/<domain>.ts`.
- New battle mechanic → start in `lib/utils/battle/` (server-side rules) and the matching handler under `app/api/campaigns/[id]/battles/[battleId]/`. UI lives in `components/battle/`.
- D&D rule constants (abilities, alignments, spell slots, hero scaling, skill triggers, critical effects, artifacts) → `lib/constants/`. Reuse before adding new ones.
- Prisma schema lives in `prisma/schema.prisma`; migrations in `prisma/migrations/`. After editing the schema, run `pnpm exec prisma generate` (and create a migration if the change is structural).
