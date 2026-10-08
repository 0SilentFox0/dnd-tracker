# Skills & Spells Library + Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Typed, validated library files for all skills (8 branches × 9, 7 races × 4, 10 personal) and all spells (4 schools × 12 + specials) with balanced numbers and two-part Ukrainian descriptions, plus one idempotent seed script that fills a campaign (schools, spells, branches, skills, races, race skill trees).

**Architecture:** Content lives in `data/` as TypeScript (`data/library/`): `spells.ts`, `branches.ts` (branch meta + level/slot skills), `races.ts` (race meta + racial skills + ultimates), `personal.ts`. Entries reference each other by stable `key` (never DB ids). A pure `buildLibrary()` validates and cross-links; `scripts/seed-library.ts <campaignId>` maps keys → rows (find-by-name then update/create, idempotent) and builds 7 race trees with `buildTreeJson`. Icons are public Storage URLs from `data/skill-icons.ts` (`iconPublicUrl`).

**Tech Stack:** TypeScript, Zod (`AbilitySchema`, `SpellDefinitionSchema`), Prisma via `@/lib/db` (tsx with `tsconfig.scripts.json`), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-07-skills-rebalance-design.md` (§3–§4, §7), `docs/superpowers/specs/2026-10-08-spells-design.md` (§1–§2)

## Global Constraints

- Every skill/spell has `description` («Що робить», exact mechanics in plain Ukrainian, numbers taken from the data) and `appearanceDescription` («Як це виглядає», fantasy-flavoured paragraph of 2–4 sentences, Heroes V mood, vivid but no purple prose).
- Numbers follow the specs; damage/heal/DoT of abilities in % of owner attack (`percentOf: "ownerAttack"`); spells use `dice` (base count) per the spec mapping.
- Skill ability JSON must pass `AbilitySchema`; spell definitions must pass `SpellDefinitionSchema`; tests enforce it.
- Seed never runs against prod without the user's explicit OK; default target is the LOCAL DB (script refuses non-localhost unless `--allow-remote` is passed).
- Idempotent: rerun updates by name, never duplicates; prints a summary (created/updated per kind).
- After seeding: note that reference caches refresh within 300 s (scripts can't revalidate).

## Review Focus

- A tree must not contain the same skill twice; the same skill may appear in all 7 trees.
- `SkillTree.race` string must equal the `Race.name` exactly.
- Skill → spell links by key resolve (Вічне світло, Аватар, Поклик звіра, Беатріс control list, «Повелитель X» spellTargeting lists).
- Rerun produces 0 creates.

---

### Task 1: Library types, validators, cross-links

**Files:** `data/library/types.ts` (`LibrarySpell`, `LibraryBranch`, `LibrarySkill`, `LibraryRace`, `LibraryPersonal` — all with `key`, `name`, `description`, `appearanceDescription`, `iconKey?`), `data/library/build.ts` (`buildLibrary()` → validated, cross-linked; throws with a list of issues), `data/library/__tests__/library.test.ts` (schema validity, unique keys/names, 8 branches × (3 levels + 3/2/1 slots), 7 races × 4, 10 personal, all `iconKey`s exist in `SKILL_ICONS`/`BRANCH_ICONS`, all spell-key references resolve, descriptions non-empty and ≥ 80 chars for appearance).
- [ ] Commit `feat(library): library types and validation`.

### Task 2: Spells content (`data/library/spells.ts`)

All 4 schools from the spells spec §2 with `school`, `level`, `cost`, `dice`, `targeting`, `resolution`, `effects`, `raceModifiers` (by race key), both descriptions. Effects use the engine effect kinds (hot, berserk, charm, falloff, summon unitId — the unitId is set by the DM later: leave summon spells with `unitKey: null` and a `note` effect explaining the DM must pick the unit).
- [ ] Tests from Task 1 pass; commit `feat(library): spells`.

### Task 3: Branch skills content (`data/library/branches.ts`)

8 branches (Напад, Стрільба, Захист, Лідерство, Світло, Темрява, Хаос, Природа) with colors, branch icon keys, `spellSchool` for magic branches; 3 level skills + 6 slot skills each per the skills spec §4 tables (including rulings: Жорстокість, marks, guard, readiness cancel, Шипи…); spare skills as a separate `spares` list (not in trees).
- [ ] Commit `feat(library): branch skills`.

### Task 4: Races and personal abilities content

`data/library/races.ts`: 7 races (Люди, Демони, Ельфи, Некроманти, Маги, Темні ельфи, Гноми) — racial skill levels + ultimate per spec §4 «Раси», icon keys `racial-*`; `data/library/personal.ts`: 10 personal abilities (no icon) under branch «Персональні».
- [ ] Commit `feat(library): races, ultimates and personal abilities`.

### Task 5: Seed script

**Files:** `scripts/seed-library.ts`, `scripts/seed-library-lib.ts` (pure planning: diff library vs existing rows → create/update ops), tests for the planner, `package.json` script `seed-library`.
- Order: SpellGroups (4) → Spells → Races (find by name case-insensitive, create missing with icon) → MainSkills (8 branches + «Раса», «Ультимат», «Персональні») → Skills (branch, spare, racial, ultimate, personal; `spellNewSpellId` resolved by key) → SkillTrees: one per race, all 8 branches + that race's racial levels + ultimate (built with `buildTreeJson`; existing tree for the race is replaced only with `--replace-trees`, otherwise skipped and reported).
- Local-only guard; `--dry-run` prints the plan.
- [ ] Run against the local DB twice (second run: 0 creates); open a local campaign in the app: DM → Скіли / Заклинання / Раси / дерево раси; character progression shows branches.
- [ ] Commit `feat(library): idempotent seed script`.

### Task 6: Spell icons (if spells have none)

H5 spell icons from the wiki via the user's Chrome bundle (Cloudflare blocks scripts) — `data/spell-icons.ts` map + `import-wiki-icons` support for `spell-icons` bucket; upload needs the user's OK.
- [ ] Commit `feat(library): spell icons map`.

### Task 7: Simulation balance pass

Run `pnpm simulate-battle` scenarios with seeded library heroes (levels 3, 6, 10) vs Tier 1/4/7 units; adjust numbers so fights land near `TARGET_ROUNDS` (3.5); record before/after in the report.
- [ ] Commit `chore(library): balance pass from simulation`.
