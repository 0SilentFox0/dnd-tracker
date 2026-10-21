# Abilities

Skills, races, artifacts, sets and units share one model in `lib/utils/abilities/` (schema, registry, `runAbilities`, `collectModifiers`, `read.ts`).

- Engine code fires typed events into `runAbilities` (limits, chance, `lethalDamage` → `kill`) and reads every stat/damage/resistance/flag bonus via `collectModifiers` — never from raw skill JSON.
- Owners have an `abilities JSONB` column (`NOT NULL DEFAULT '[]'`). Read it only with `lib/utils/abilities/read.ts`.
- Edit forms write `abilities` directly through `AbilityListEditor` (`components/abilities`).
- Old-format converters live only in `scripts/import/legacy-convert/` (for `import-skills-library`).
