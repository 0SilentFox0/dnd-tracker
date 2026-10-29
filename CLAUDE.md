# CLAUDE.md

Rules, layering and gotchas only; subsystem details live in `docs/architecture/` (index: `docs/architecture/README.md`), current work in `docs/STATUS.md`. Path-scoped rules load on demand from `.claude/rules/` (`components.md` for UI, `db-deploy.md` for DB/Vercel).

## Project

D&D 5e combat tracker — Next.js 16 (App Router) + React 19 + TypeScript (strict) + Prisma 6 + PostgreSQL via Supabase + Pusher for real-time. Package manager: **pnpm** (`pnpm@9.15.5`, `pnpm install --frozen-lockfile` is enforced on Vercel).

The README, ARCHITECTURE.md, and most in-repo docs are written in Ukrainian. Match the existing language when editing existing docs/comments; new code identifiers stay English.

## Commands

Scripts are in `package.json` (many one-off ops in `scripts/` via `tsx` — check there before writing new tooling). Worth knowing:

```bash
pnpm test:run path/to/file.test.ts   # single file; -t "name" filters by test name
pnpm test:changed [main]             # only tests affected by uncommitted changes / the branch vs main
pnpm test:related lib/a.ts lib/b.ts  # only tests that import these files
pnpm exec prisma migrate dev --name X  # create + apply a migration locally
```

## Working on a feature

- **Reuse before writing.** Before a spec/plan, search `lib/utils`, `lib/hooks`, `components/common`, `components/ui`, `components/hud` and `lib/utils/api` for an existing solution, and list in the spec what is reused (and why something new is needed). Duplication here comes mostly from parallel sessions solving the same thing twice.
- **End of branch:** run `/simplify` on the branch diff (besides the review), then update the touched `docs/architecture/*.md` and `docs/STATUS.md`.
- **Specs/plans:** active ones in `docs/superpowers/{specs,plans}`; when the feature is merged, `git mv` them to `docs/archive/superpowers/` in the merge commit.
- **CRUD routes** (`races`, `spells`, `main-skills`, `units`, `artifact-sets`, …) are not refactored on main: a shared CRUD route factory is the first step of constructor stage 2 (`feat/constructor`). Keep new CRUD logic in schemas/helpers, not in `route.ts` bodies.
- **D&D rule constants** (abilities, alignments, spell slots, hero scaling, critical effects, artifacts) live in `lib/constants/` — reuse before adding.

## Architecture

### Layering (request flow)

1. **`app/campaigns/[id]/...`** — pages. Server component (`page.tsx`) fetches/forwards data, then renders a `*-client.tsx` (or `page-client.tsx`) marked `"use client"` for interactive UI. DM-only pages live under `app/campaigns/[id]/dm/`.
2. **`app/api/campaigns/[id]/...`** — route handlers. `route.ts` stays thin: Zod validation, session check, then delegate to a sibling handler/helper file (e.g. `attack-handler.ts`, `build-character-update-data.ts`). Shared helpers in `lib/utils/api`: `parseBody(schema, req)` (400 on malformed JSON or a Zod error), `loadOwned(query, campaignId)` (404/403 for entities of another campaign), `requireCampaignAccess`/`requireDM` (`isDM` on the result), `errorResponse` — every error is `{ error: string, issues? }` with the Ukrainian texts from `lib/constants/api-errors.ts`.
3. **`lib/api/<domain>.ts`** — thin client wrappers (`get`/`create`/`update`/`delete`). Components and `app/**` never import `@/lib/api/*` or call `fetch` (ESLint-enforced): loading, mutations and non-trivial logic live in hooks; a component calls a hook and renders.
4. **`lib/hooks/<domain>/`** — TanStack Query hooks and form/state hooks per domain. Each domain folder has an `index.ts` barrel; import from the folder, not deep paths. Query keys are factories in the domain's `keys.ts` (`spellKeys.list(campaignId)`, kebab-case names) — never inline arrays.
5. **`lib/utils/<domain>/`** — pure domain logic (esp. `battle/`, `abilities/`, `spells/`). Tests sit in sibling `__tests__/` folders.

New endpoint = route → `lib/api/<domain>.ts` → hook → `types/<domain>.ts`. Cross-domain types: `@/types/<domain>` (no barrel); prefer an existing domain file over a new one.

### Cross-cutting rules

- **`lib/db.ts`** — singleton `PrismaClient` (`withSafePoolLimits` adds `connection_limit`). Always import `prisma` from here, never `new PrismaClient()`.
- **Auth/platform** ([platform.md](docs/architecture/platform.md)): server session = `getClaims` (`lib/auth.ts`, `requireAuth`), `getUser` only where fresh email/metadata are written; Supabase `client.ts` from client code, `server.ts` from server; fonts are self-hosted (`next/font/google` is banned); Pusher via `lib/pusher/{server,client,channels}.ts`; first-HTML data via `PrefetchedQuery`.
- **Egress is a hard constraint** (Supabase free tier): prefer deltas over refetches, keep polling slow, images through `next/image`.
- **Alias:** `@/*` → repo root; always `@/lib/...`, never `../../`. `import/no-cycle` is on — fix cycles, don't work around them.

### Subsystems — rules that must not be broken

Details in `docs/architecture/`; read the file before changing the subsystem.

- **Battle** ([battle.md](docs/architecture/battle.md)): every battle route = Zod schema + `runBattleMutation` (`lib/server/battles/run-mutation.ts`, pure engine in `lib/utils/battle/pipeline/`) + `<action>-mutation.ts` in `lib/server/battles/mutations/<action>/` with pure engine code. Anything writing `battle_participants.snapshot` must write `snapshotHash` too. Turn advance only through `lib/utils/battle/turn/advanceTurn`. Damage → `applyDamageConsequences` right after the primitive; effect removal via `removeEffects`. Responses are deltas (`ClientBattleDelta`), not full scenes. Server rules in `lib/utils/battle/`, UI in `components/battle/`.
- **Balance** ([balance.md](docs/architecture/balance.md)): no difficulty setting; setup UI and battle start call the same `computeFairScaling`.
- **Map modes** ([map-modes.md](docs/architecture/map-modes.md)): core never imports a mode directly (ESLint); a new mode = folders + registry rows.
- **Abilities** ([abilities.md](docs/architecture/abilities.md)): engine reads bonuses only via `collectModifiers`/`runAbilities`, the `abilities` column only via `lib/utils/abilities/read.ts`.
- **Show/music** ([show.md](docs/architecture/show.md)): `campaign_shows` rows are never deleted, `seq` only grows.
- **AI** ([ai.md](docs/architecture/ai.md)): the provider key never leaves the server (no logs/errors/responses); scenario changes only via `ai_proposals` + apply; a new tool = file in `lib/ai/tools` + row in `AI_TOOLS` (serves both chat and `/api/mcp`).
- **Onboarding** ([onboarding.md](docs/architecture/onboarding.md)): checklist progress is derived from DB facts, never stored; `user_onboarding_flags` holds only dismissed/seen keys. A user-facing feature adds an entry to `lib/onboarding/whats-new.ts` plus `whatsNew.<id>` keys in both `messages/*/whatsNew.json` (and a hint/help article when it adds a screen).
- **i18n** ([i18n.md](docs/architecture/i18n.md)): `uk`/`en` via `next-intl`, texts in `messages/<locale>/<ns>.json`. Non-React code returns keys, translation happens at the boundary (`t()`, `getTranslator`, `translateIssue`); all of the code is under ESLint (Cyrillic forbidden) except the ratchet list in `i18n-exempt.json`; tests check keys; the root layout reads no cookies/headers (landing stays static).

## Database & deployment

Full gotchas are in `.claude/rules/db-deploy.md` (loads when touching `prisma/`, `scripts/`, `vercel.json`). The ones that must never be forgotten:

- Migrations are **expand-only** and every `CREATE TABLE` also needs `ENABLE ROW LEVEL SECURITY`.
- They run only in production builds from `main`; never remove the placeholder URL in `scripts/vercel-build.mjs`.
- Vercel `DATABASE_URL` = pooler (6543); `DIRECT_URL` (5432) only for DDL/backups.

## Testing

- **Don't run the full suite after every step** (~5k tests, ~50 s, heavy CPU). While working — `pnpm test:changed` / `pnpm test:related <files>`; the full `pnpm test:run` once before merge/push (and in a subagent-driven run — once at the end, not per task). Fall back to the full suite when changing `vitest.config.mts`, `vitest-setup.ts`, shared test helpers, or `package.json` deps — the module graph can't see those.
- **No repo-wide `pnpm lint` / `--fix` while working** — it pegs a core for minutes (once nearly overheated the machine). While working: `pnpm exec eslint --fix <touched files>`; the repo-wide run happens once before merge/push, never per task or per subagent. Before a repo-wide lint or the full suite check `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`: if another heavy run is active (other worktree/session), wait or pause it — never two in parallel. A lint/test process running > ~5 min is hung: kill it and rerun narrower.
- **Vitest** runs `environment: "node"`; UI tests needing a DOM put `// @vitest-environment happy-dom` at the top. Tests live in sibling `__tests__/` folders (no top-level `tests/`).
- Coverage target is `lib/**/*.ts`: `pnpm test:run --coverage`.
