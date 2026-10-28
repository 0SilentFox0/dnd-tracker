# 4f-5a Tasks 1–3 report

## Delivered

- Recorded the user-authorized working decisions for 4f-5a in the design and implementation plan; confirmed the `feat/constructor` worktree and migration sequence.
- Added expand-only migration `20261104000000_monster_5e_full`: `units.statblock`, `units.spellcasting`, `spells.fixedDice`, and `spells.damageBonus`. It does not alter RLS.
- Added client-safe unit/spell/battle types and spell-definition readers/writers. Missing new DB columns remain optional in readers, so legacy HOMM records preserve their behavior.
- Added strict Zod contracts and bounded values for statblocks, spellcasting grants, `fixedDice`, and `damageBonus`; import/export resolves nested `spellcasting.spells[].spellId` references by name or id and exports names.
- Wired the fields through unit/spell content resources, imports, and JSON-schema/OpenAPI generation. Shared OpenAPI components and compact operation descriptions hold the document under the project cap.

## Changed files

- Design/plan: `docs/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md`, `docs/superpowers/plans/2026-10-23-constructor-4f5a-monsters.md`
- Persistence/types: `prisma/schema.prisma`, `prisma/migrations/20261104000000_monster_5e_full/migration.sql`, `types/{units,spells,battle}.ts`
- Schemas/readers/resources/import/OpenAPI: `lib/schemas/{units,spells}.ts`, `lib/utils/spells/model/{schema,read}.ts`, `lib/utils/units/{to-unit,unit-create-data}.ts`, `lib/server/content/{json-schema,openapi}.ts`, resource and import field files for units/spells.
- Focused tests: migration, unit 5e schema/resource, spell reader, content import, nested refs, import fields/values, and OpenAPI.

## TDD evidence

RED command:

`pnpm vitest run lib/utils/spells/model/__tests__/read-5e.test.ts lib/schemas/__tests__/units-5e.test.ts prisma/__tests__/migration-choices-feats.test.ts`

Observed expected failures: absent migration file; `fixedDice`/`damageBonus` were not read or written; `statblock`/`spellcasting` were discarded and invalid JSON was accepted.

GREEN command:

`pnpm vitest run lib/utils/spells/model/__tests__/read-5e.test.ts lib/schemas/__tests__/units-5e.test.ts prisma/__tests__/migration-choices-feats.test.ts lib/server/content/__tests__/units-resource-5e.test.ts lib/server/content/__tests__/import-content.test.ts lib/server/content/__tests__/openapi.test.ts lib/utils/content/import/__tests__/units-fields.test.ts lib/utils/content/import/__tests__/values.test.ts lib/server/content/__tests__/import-nested-ref.test.ts`

Result: 9 files passed, 141 tests passed. `git diff --check` passed. `pnpm prisma generate` passed.

## Self-review and concerns

- Confirmed no transaction code was touched, no RLS statement exists in the new migration, no client battle reader imports Zod, and the HOMM import compatibility guard remains green.
- The static OpenAPI endpoint is generated from `buildOpenApi()` under `app/api/openapi.json/route.ts`; there is no checked-in JSON artifact in this repository. The focused OpenAPI test measured the generated document and passed the existing `<145000` cap.
- Full test/lint/build was deliberately not run, per the grouped SDD instruction; later task groups should run it once at the end.
