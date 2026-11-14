---
paths:
  - "prisma/**"
  - "scripts/**"
  - "vercel.json"
  - "lib/db.ts"
  - "lib/cache/**"
---

# Database & deployment gotchas

These trip people up repeatedly — read before touching the DB or `vercel.json`.

- **Migrations run automatically only in production builds.** `vercel.json` runs `node scripts/vercel-build.mjs`: `prisma generate` (placeholder URL) → `prisma migrate deploy` (only when `VERCEL_ENV=production`, via `DIRECT_URL`) → `next build`. Preview builds never migrate because they share the same DB. New migration: `pnpm exec prisma migrate dev --name X` against a local/shadow DB, then merge to `main`. History was squashed into `20261005000000_init` when moving to the new Supabase project.
- **`DIRECT_URL` (port 5432) is required in Vercel Production** — without it the build fails with an explanatory error.
- **Production builds from a branch other than `main`** fail on purpose, so an unmerged migration never reaches the prod DB. Override with `ALLOW_PROD_MIGRATE=1` only deliberately.
- **Migrations must be expand-only** (add columns/tables, backfill, drop later): `migrate deploy` runs before `next build`, and a Vercel rollback does not revert the schema.
- **Contract step (DROP column/table) — a separate migration in a separate deploy**, once at least one earlier deploy has no readers left (grep the code + `scripts/`) and the table/column is verified empty or its data moved; the commit message links the commit that removed the readers. Precedent: `20261201000000_drop_race_profiles`.
- **Every `CREATE TABLE` migration must also `ALTER TABLE … ENABLE ROW LEVEL SECURITY`** — Supabase exposes `public` tables to the anon key otherwise. `prisma/__tests__/migrations-rls.test.ts` enforces it.
- **Regions:** Supabase `eu-central-1`, Vercel functions `fra1`, Pusher cluster `eu`. Don't move one without the others — every DB round trip across continents adds ~100 ms.
- **`DATABASE_URL` for Vercel = Transaction pooler (port 6543) with `?pgbouncer=true&sslmode=require`.** The Direct connection (port 5432) is only for one-off DDL/backups (`scripts/db/backup-database.sh`, manual migrations).
- **Local dev uses a Docker Postgres** (`pnpm db:local`, port 54322) so `pnpm dev` doesn't burn the Supabase free-tier egress quota. Prod connection strings live in `.env.production-db.local`; Supabase Auth/Storage and Pusher stay cloud even in dev.
- **Local dev pointing at the prod DB is intentional in some setups** — see `docs/DATABASE-SYNC.md`. Don't assume divergence is a bug without checking which `DATABASE_URL` is set.
- **Vercel build placeholder URL.** `scripts/vercel-build.mjs` runs `prisma generate` with `DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build` to avoid Prisma CLI hanging on the real Supabase pooler from the build region. Do not "fix" this by removing the placeholder.
- **`scripts/` imports can't invalidate the Next data cache.** Reference data cached in `lib/cache/reference-data.ts` (`unstable_cache` + tags from `lib/cache/tags.ts`) is revalidated only by app writes (`invalidateReference`); after a `tsx` import it may stay stale for up to `REFERENCE_REVALIDATE_SECONDS` = 300 s.
- **`postinstall`** is `node scripts/postinstall.mjs`, which skips `prisma generate` when `VERCEL` env is set (build runs it explicitly with the placeholder URL).
- **Schema edits:** after changing `prisma/schema.prisma` run `pnpm exec prisma generate`, plus a migration if the change is structural.
- **Content FK drift (`20261121000001_content_base`).** The migration drops 12 FKs between content models (and `character_skills.skillTreeId`, `characters.backgroundId`) but their `@relation` fields stay in `schema.prisma`, so `prisma migrate dev` / `migrate diff` will always propose `ADD CONSTRAINT` for exactly these 12 (`prisma/__tests__/content-base-fk-drift.test.ts` lists them). Delete those statements from any auto-generated migration; never apply them.
