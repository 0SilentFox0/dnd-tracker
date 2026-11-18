# Quality wave 4, lane B: modularity + schema eviction (design)

Base: main `0a425469c`. Inputs: re-audit §2 Important 4 (`docs/superpowers/research/2026-11-18-quality-reaudit.md`), slices `F3-boundary.md` (I1–I6, M1–M5), `S6-addons.md`, `S4-d20.md`; `system-surface-exempt.json`, `system-literals-exempt.json`, `scripts/shared/system-ratchet.ts`, `lib/__tests__/system-surface.test.ts`, `docs/architecture/{rule-systems,battle,abilities}.md`, `.claude/rules/db-deploy.md`.

Owner decisions applied: migrations/backfills in scope; full eviction of the 18 schema entries; expand → dual-write/read-fallback → backfill (dry-run, `--apply`, compare-and-set, version guard, prodcopy rehearsal) → contract (DROP) as a later separate deploy after prod confirmation; every new table gets `ENABLE ROW LEVEL SECURITY`; migrations deploy separately with no active battle.

**Status: design only, stop for owner confirmation.** The recommendation is to run **Slice 1** (code-only + the already-scripted `pendingMoraleCheck` backfill) in this wave and schedule the data evictions as their own lane (§5).

---

## 1. Inventory (measured on `0a425469c`, `rg`, tests/`__tests__` excluded)

### 1.1 Module names in core (`lib components app types`, generated roots excluded)

| Pattern (case-insensitive, camel/kebab/snake) | Files | Hits |
|---|---|---|
| `morale` | 57 | 132 |
| `inspiration` | 42 | 182 |
| `artifactSet / artifact-set / artifact_set / artifactsets` | 73 | 304 |
| `skillTree / skill-tree / skill_tree / skilltrees` | 65 | 230 |
| `\blair\b` | 22 | 63 |
| `offHand / off-hand / offhand` | 26 | 108 |
| `retaliation` | 16 | 49 |
| `deathSave / death-save / deathsaves` | 8 | 13 |
| `heroScaling / heroscaling` | 6 | 20 |
| `unitstacks` | 1 | 3 |

Upper bound (comments and i18n keys included). Today's surface ratchet sees only 57 files / 77 hits because of the blind spots in §1.4.

### 1.2 Module pages/API/hooks/types/messages still in core

- Pages: `app/campaigns/[id]/dm/skill-trees/{layout,page}.tsx`, `app/campaigns/[id]/dm/artifact-sets/{layout,page,new/page,[setId]/page}.tsx`. They are already thin `SystemDmPage` delegates; `[setId]/page.tsx` queries `prisma.artifactSet` directly.
- API: `app/api/campaigns/[id]/skill-trees/{route,[treeId]/route}.ts` (`operationRoute(CONTENT_OPERATIONS['skill-trees.list'])`), `app/api/campaigns/[id]/artifact-sets/{route,[setId]/route}.ts`, `app/api/campaigns/[id]/characters/[characterId]/inspiration/route.ts` (re-exports `lib/server/characters/operations/inspiration`).
- Generic targets already exist: `app/campaigns/[id]/dm/system/[section]/page.tsx` (gated by `dmSectionsOf`) and `app/api/campaigns/[id]/system/[action]/route.ts` (`systemRoutes('campaign')`).
- Client: `lib/api/{skill-trees,artifact-sets}.ts`, `lib/hooks/artifact-sets/*` (6 files), `lib/hooks/skills/{useSkillTrees,useMainSkills,useRacialSkills}.ts`, `types/{skill-tree,artifact-sets}.ts`.
- Server: 24 `lib/server` files name skill trees (`skills/skill-tree-service.ts`, `skills/progress-move.ts`, `content/{operations,operation-service,tool-schemas,detach-refs}.ts`, `templates/{bundle,localize-template-bundle,sync/diff,sync/apply}.ts`, `assistant/actions/content-*` ×6, `battles/participant/load-character-context.ts`, `battles/mutations/start/{start-build-context,start-fair-scaling}.ts`, `characters/{operations/create,core/sheet-handler}.ts`, `races/update-race.ts`, `campaigns/action-service.ts`, `systems/types.ts`); 25 files in `lib/server|hooks|api` name artifact sets.
- Prisma delegates of module models called outside `systems/`: `skillTree` 11 files, `artifactSet` 13, `characterSkills` 3, `mainSkill` 17 (systems: 3/2/0/4).
- Messages: 110 key paths whose segment contains a module id, in 23 of 65 `en` namespaces (top: `abilityRegistry` 20, `errors` 17, `battleLog` 14, `rules` 11, `rest` 7). Namespace files named after modules: `skillTree.json`, `battleMorale.json`.

### 1.3 Key hotspots (file:line)

- Rules sections: `lib/utils/rules/section-shapes.ts:31` (morale), `:48` (heroScaling), `:65` (deathSaves), `:87` (outOfCombat.inspiration); `lib/utils/rules/defaults.ts:6,16,29,41`; `lib/utils/rules/inspiration-on.ts:5`.
- Contract slots named after modules: `lib/utils/rules/systems/types-combat.ts:54,195-201,287,289,301` (`inspiration`, `lair`, `offHand`); `components/systems/types.ts:269` (`artifactSets`); `lib/server/systems/types.ts:101` (`skillTreeProgress`).
- Base names addons: `systems/d20/rules/state.ts:35` (`EXT_KEYS = ['deathsaves','inspiration','offhand']`) and `:37-42` (legacy flat keys).
- Battle: `lib/schemas/battles.ts:388` (`moraleCheckSchema`), `:429` (`offHand` flag); `lib/utils/battle/turn/act-gate.ts:44` (`skipMorale`); `lib/utils/abilities/schema/kinds.ts:75,90` (stat `'morale'`); `types/battle.ts:240-241` (`combatStats.morale/moraleCap`), `:275` (kind `'lair'`); `lib/utils/battle/store/split-participant.ts:30,123,169-192`; `lib/server/battles/store/save-battle.ts:63`, `load-battle.ts:103`.
- `unitstacks`: `systems/unitstacks/index.ts:4` = `defineAddon(() => ({}))`, `meta.ts` claims `combat.hitModel.damage`; docs `rule-systems.md:12,161` claim it wraps the scalar.

### 1.4 Ratchet blind spots (`scripts/shared/system-ratchet.ts`)

- `literalTokens()` (:73-75) takes `m.keys` for addons, all `[]` → addon ids never counted as literals.
- `countModuleSurface` (:240-254) matches the exact lowercase id in 5 shapes; `skillTree`, `artifactSets`, `deathSaves`, `offHand`, `heroScaling` (camel), identifiers (`skipMorale`, `moraleCheck`) and array items are invisible.
- `scanCoreMessageKeys` (:330-352): `en` only, last segment only, exact match; namespace file names not checked.
- `scanSchemaColumns`: single file `prisma/schema.prisma`, cannot express module ownership.
- `system-module-subsets.test.ts:87`: masks step 7, cap 8 of 11 modules.
- `system-literals-exempt.json` = 5; 4 are the die/brand `d20` (`lib/constants/site.ts:14`, `lib/utils/battle/log/codec.ts:47`, `types/characters.ts:449`, `SheetRollDialog.tsx:77`), 1 real (`lib/utils/rules/defaults.ts:52`, `DEFAULT_RULES.system.key = 'homm'`, test fixture).

### 1.5 Schema entries (18) by eviction class

| Class | Entries | DB change needed |
|---|---|---|
| A. Module-owned models (move to module schema file) | `model SkillTree`, `model SkillTreeBase`, `model ArtifactSet`, `model ArtifactSetBase`, `CharacterSkills.skillTree`, `CharacterSkills.skillTreeId`, `MainSkill.isEnableInSkillTree`, `MainSkillBase.isEnableInSkillTree` (MainSkill = skilltrees content kind `main-skills`) | none |
| B. Relation fields on core models (virtual) | `Campaign.skillTrees`, `Campaign.artifactSets`, `Artifact.artifactSet` | none (`artifacts_setId_fkey` already dropped in `20261121000001_content_base`; campaign FKs stay in DB) |
| C. Data columns on core tables | `BattleScene.pendingMoraleCheck`, `Character.inspiration`, `Character.morale`, `Unit.morale`, `UnitBase.morale`, `Character.skillTreeProgress`, `BattleParticipant.morale` | backfill + contract |

11 of 18 entries leave core without moving a byte of data. Only class C carries data risk.

Precedents to reuse (not rewrite): `scripts/db/backfill-pending-morale.ts` + `lib/backfill-pending-morale-plan.ts` (version guard), `scripts/db/backfill-d20-characteristics.ts` (+ `-plan`, `-db`: batches, byte-exact snapshot + `--revert`, `contentRowHash` guard, `--report --expect-zero`, active-battle refusal), `scripts/db/active-battles-report.ts --expect-idle`, `scripts/db/prodcopy-db.sh`, `scripts/db/backup-database.sh`, `readD20Columns` dual-read pattern (`systems/d20/rules/characteristics/codec.ts`).

---

## 2. Packages

Type legend: **code** = code-only, **expand** = expand migration, **dual** = dual-write/read-fallback code, **backfill** = script + prod run, **contract** = later DROP deploy.

| # | Package | Type | Size | Depends on | Parallel with |
|---|---|---|---|---|---|
| P1 | Scanner upgrade + honest baseline | code | M | – | – (merge first) |
| P2 | Literals ≤ 2 | code | S | P1 | P3, P4, P7, P8 |
| P3 | Neutral contract slots + addon-owned ext codecs | code | M | P1 | P2, P4, P7, P8 |
| P4 | Rules sections owned by modules | code | M | P1 | P2, P3, P7, P8 |
| P5 | Battle core de-naming (morale gate, offHand, retaliation/lair labels, log keys) | code | L | P3, P4 | P6b, P6c |
| P6.0 | Content-kind/operation/template/assistant registry seam | code | M | P1 | P2–P4 |
| P6a | skilltrees: pages/API/hooks/types/messages/server into `systems/skilltrees` | code | L | P6.0 | P6b, P6c |
| P6b | artifactsets: same | code | M | P6.0 | P6a, P6c |
| P6c | inspiration: route → system action, `inspiration-on`, rest UI slots | code | S | P4 | P6a, P6b |
| P7 | unitstacks: drop the claim, fix docs | code | S | – | all |
| P8 | Composition tests ×4 + full masks | code (tests) | S | – | all |
| P9 | Prisma multi-file schema, module schema files (class A) | code (+ no-op migration check) | M | P6a, P6b | P11, P12 |
| P10 | Drop class B relation fields | code (Prisma only) | M | P9 | P11, P12 |
| P11 | `pendingMoraleCheck`: prod backfill, remove fallback | backfill → contract | S | – (script exists) | all |
| P12 | `Character.inspiration` → `characteristics.ext.inspiration` | dual + backfill | M | P6c | P13 |
| P13 | `morale` stat (Character/Unit/UnitBase) → `characteristics.ext.morale` | dual + backfill | L | P4, P5 | P12 |
| P14 | `Character.skillTreeProgress` → module table `skill_tree_progress` | expand + dual + backfill | L | P6a, P9 | P12 |
| P15 | `BattleParticipant.morale` → participant slot `ext.morale` | expand + dual + backfill | L | P5, P13 | none |
| P16 | Contract deploy (DROP) | contract | S | prod confirmation of P11–P15 | – |

### P1 Scanner upgrade + honest baseline (code, M)
- `SystemMeta.aliases?: readonly string[]` (explicit extras, e.g. skilltrees `['skillTree','mainSkill?']` decided per module); `moduleNames(meta)` derives id + stem without trailing `s` + camel/kebab/snake/Pascal variants + aliases.
- `countModuleSurface(text, names)`: case-insensitive, matches identifier fragments (`skipMorale`, `artifactSets`), string literals, array items, keys, `case`; comments stripped first (Cyrillic/doc comments are not code). Keep the 5 existing shapes as a subset (existing tests stay).
- `literalTokens()`: addons contribute `m.module` + aliases to `literal`.
- `scanCoreMessageKeys`: both locales, every segment, plus namespace file names; module-owned namespaces from `meta.i18n` stay exempt.
- `scanSchemaColumns(files)`: scans only core schema files (after P9: `prisma/schema/core.prisma`); module files `prisma/schema/systems/<id>.prisma` must only name their own module (new test).
- New `scanModuleModelAccess`: `prisma|tx|db.<moduleModel>` outside `systems/<owner>/` counts as surface.
- `system-ratchet.ts --write` regenerates `system-surface-exempt.json`. **The baseline grows once** (expect ~600–900 code hits, ~110 message keys) because today's number is undercounted. The ratchet rule says these files "only shrink": **owner sign-off needed** for this one-time honest reset (commit message states old/new counts).

### P2 Literals ≤ 2 (code, S)
- `DEFAULT_RULES` (`lib/utils/rules/defaults.ts:49-53`) moves to a test fixture module (`lib/utils/rules/__tests__/fixtures/default-rules.ts`; scanner skips `__tests__`); update test imports. ESLint already bans prod imports, so no prod caller changes.
- `SheetD20RollResult.kind: 'd20'` → `'check'`; reader accepts both (stored sheet-roll results in `character_logs.data` may carry `'d20'`; verify with `rg` on `describe-log.ts` and a prodcopy query `select count(*) from character_logs where data->>'kind' = 'd20'`).
- `codec.ts:47` long name `d20` → `checkRoll` (persisted form is the short key `q`, so in-memory only).
- `site.ts:14` brand mark: scanner allow-comment `// system-literal-ok: brand` (one line, counted as allowed, listed in the test).
- Target: exempt file ≤ 1 entry.

### P3 Neutral contract slots (code, M)
- `types-combat.ts`: `offHand?`, `lair?`, `inspiration?` become entries of a keyed extension list (`combat.extensions: CombatExtension[]` with `id`, capability flags, hooks) or, where a capability is generic, a neutral name (`offHand` → `secondaryAttack`, `lair` → `sceneActions`, `inspiration` → `rerollToken`). Decision: neutral capability names, because callers are generic UI (attack wizard, legendary panel, roll step) and a list lookup by id would reintroduce the name.
- `components/systems/types.ts:269` `artifactSets` → `itemGroups`.
- `lib/server/systems/types.ts:101` `character: { race; skillTreeProgress? }` → `character: { race; row: unknown }`; module reads its own data.
- `systems/d20/rules/state.ts`: drop `EXT_KEYS` naming addons; each addon registers `SlotCodec.extend(<id>, parse)` and d20 `parseState` keeps `ext` opaque. Legacy flat keys (`:37-42`) stay until `backfill-d20-ext-state` is confirmed on prod (then a contract-later code removal, no DDL).

### P4 Rules sections owned by modules (code, M)
- Shapes/defaults of `morale`, `heroScaling`, `deathSaves`, `outOfCombat.inspiration` move to `systems/<id>/rules/sections.ts` via `extendSection`/`sectionItems` (already used by bases).
- **Decision: stored path in `campaigns.rules` does not change** (`rules.morale`, `rules.heroScaling`, ...). Only ownership moves, so no campaign JSON backfill. Section path names stay data, not core code.
- `lib/utils/rules/inspiration-on.ts` → `systems/inspiration/rules`; core callers ask a neutral capability from P3.
- Messages `rules.sections.{morale,heroScaling,deathSaves}`, `rules.mechanics.*`, `rules.sections.outOfCombat.inspiration` → module namespaces (`meta.i18n.dmRules`).
- `lib/hooks/campaigns/useRulesForm.ts` stops naming heroscaling (form fields come from the section registry).

### P5 Battle core de-naming (code, L)
- `moraleCheckSchema` (`lib/schemas/battles.ts:388`) → `systems/morale/server` operation via `system/[action]`; route file in core deleted after clients move.
- `act-gate.ts:44` `skipMorale` → `skipGate`; `schemas/battles.ts:429` `offHand` → `attack.system` slot payload written by the offhand module.
- Retaliation/opportunity labels (`counter-strike.ts:131`, `constants/battle.ts:80`, `types/battle-actions.ts:62`, `view/retaliation.ts`), lair kind (`types/battle.ts:275`, `actions/schema.ts:12`, `abilities/schema/ability.ts:273`, `LimitsSection.tsx:84`, `useLegendaryAction.ts:134`) → module-provided action kinds/labels through the registry.
- `abilities/schema/kinds.ts:75,90` stat `'morale'` → stat list contributed by `stats.columns` (`owns`) of the morale module.
- **D16 constraint:** log lines of morale/retaliation must render for old battles and after the module is disabled. Decision: log keys move to module namespaces, and a new `meta.i18n.log` slot is loaded for **all installed** modules in battle/log scopes regardless of composition. Cost: battle-scope gzip budget (`scope-size.test.ts`), measure before merging.
- Out of P5: `combatStats.morale/moraleCap` (bound to the `BattleParticipant.morale` column, P15).

### P6.0 Registry seam (code, M)
Core files that enumerate content kinds (`lib/server/content/{operations,operation-service,tool-schemas,detach-refs}.ts`, `lib/server/templates/{bundle,localize-template-bundle,sync/*}.ts`, `assistant/actions/content-*`, `lib/constants/source-sync.ts`) read a `contentKinds` contribution (resource definition, operations, template bundle section, assistant aliases) from `systemServerOf`/meta instead of naming kinds. Meta already lists `contentKinds`; this adds the server half. Must come before P6a/b because those files are shared (merge-conflict hotspot).

### P6a skilltrees / P6b artifactsets (code, L / M)
- Pages: delete `app/campaigns/[id]/dm/{skill-trees,artifact-sets}/**`; widen `dm/system/[section]` to `dm/system/[section]/[[...rest]]` so `artifact-sets/[setId]` and `/new` resolve inside the module UI; `next.config` permanent redirects from old URLs (bookmarks, onboarding/help links: grep `whats-new.ts`, help articles).
- API: module routes registered in `systemServerOf(...).routes`, served by `system/[action]`; delete core `route.ts` files; `lib/api/*` → `systems/<id>/api`, hooks → `systems/<id>/hooks` (+ `keys.ts`), types → `systems/<id>/types.ts`. Core consumers must stop needing these types first (ESLint `@/systems/*` ban).
- Server: `skill-tree-service.ts`, `progress-move.ts` → `systems/skilltrees/server`; battle participant assembly (`load-character-context.ts`, `start-build-context.ts`, `start-fair-scaling.ts`) gets module data through existing `ParticipantPart` hooks.
- Messages: `skillTree.json` becomes module-owned (`meta.i18n`); artifact-set keys in `campaigns`, `inventory`, `errors` move.
- Content factory resources for `skill-trees`, `main-skills`, `skills`, `artifact-sets` move to `systems/<id>/server/resources` and register through P6.0.

### P6c inspiration (code, S)
Route `characters/[characterId]/inspiration` → system action `inspiration.set` (character scope); `DmRestActions`, `OutOfCombatSection`, `RollStep`, `DmCharacterCard` render through a module UI slot; messages `rest.*.inspiration`, `characters.card.inspiration`, `battleWizards.attack.roll.inspiration` move.

### P7 unitstacks (code, S)
Owner decision on record (E2 part 8): the stacking mechanism is core. So: remove `claims` from `systems/unitstacks/meta.ts`, document it as a marker module with no rule hooks, fix `rule-systems.md:12,161`. Not deleting the module (stored compositions with `modules: ['unitstacks']` would need a `campaigns.rules` backfill; no value).

### P8 Tests (S)
`systems/{morale,skilltrees,artifactsets,heroscaling}/__tests__/composition.test.ts` (same template as `deathsaves`). `system-module-subsets.test.ts`: enumerate all masks over 11 modules (2048) filtered by `requires`/`conflicts`; if runtime > 2 s, enumerate valid compositions per base instead (still exhaustive).

### P9 Multi-file Prisma schema (code, M)
- Prisma 6.19 supports multi-file schema: `prisma.config.ts` with `schema: 'prisma/schema'` and `migrations: { path: 'prisma/migrations' }` (keep migration history in place).
- Files: `prisma/schema/core.prisma` (datasource, generator, core models), `prisma/schema/systems/skilltrees.prisma` (`SkillTree`, `SkillTreeBase`, `CharacterSkills`, `MainSkill`, `MainSkillBase`; decide whether `Skill` follows — it is the `skills` kind of skilltrees, so yes), `prisma/schema/systems/artifactsets.prisma` (`ArtifactSet`, `ArtifactSetBase`).
- Update every reader of `prisma/schema.prisma`: `scripts/vercel-build.mjs`, `scripts/postinstall.mjs`, `scripts/db/gen-base-models.ts` (writes base models into the owning file), `scripts/db/prisma-migrate-deploy.sh`, `prisma/__tests__/*` (RLS, FK drift), scanner.
- Gate: `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema` shows only the 12 known drift statements; `prisma migrate status` on a prodcopy says "up to date"; a Vercel preview build passes (preview never migrates).

### P10 Drop class B relations (code, M)
- `Artifact.artifactSet` and its back-relation `ArtifactSet.artifacts`: FK already gone in DB, so this **removes** 1 statement from the known FK drift (update `content-base-fk-drift.test.ts`). Replace `include: { artifacts }` (e.g. `[setId]/page.tsx`) with explicit `findMany({ where: { setId } })` in the module server.
- `Campaign.skillTrees`, `Campaign.artifactSets`: drop the Prisma relation, keep scalar `campaignId`. The DB FK with `ON DELETE CASCADE` stays (campaign delete still cascades). Prisma will then propose `DROP CONSTRAINT skill_trees_campaignId_fkey / artifact_sets_campaignId_fkey` in every generated migration: add both to the drift test (inverse list) and to the gotcha in `.claude/rules/db-deploy.md`. Trade-off stated honestly: two more known-drift lines in exchange for a core `Campaign` model without module names. Alternative (keep the two back-relations and allow-list them) is acceptable if the owner prefers less drift.

### P11 `BattleScene.pendingMoraleCheck` (backfill → contract, S)
Code is already done (slot `ext.morale.pending`, upgrade-on-read via `combat.turn.upgradeScene`, script `backfill-pending-morale.ts`, report `pending-morale-report.ts`). Steps: prodcopy dry-run → apply → prod dry-run → apply → verify 0 → deploy N removes the fallback reader and the null-write in `completeMutation`/`load-battle` → deploy N+1 (P16) drops the column.

### P12 `Character.inspiration` (dual + backfill, M)
- Target: `characters.characteristics.ext.inspiration = { available: true }` (characteristics is the base's opaque `SystemData`; `writeD20Columns` already preserves unknown keys; verify wfrp's writer does too, else wfrp campaigns are out of scope because inspiration requires d20).
- Dual-write: the module operation writes both column and ext. Read: `ext ?? column`.
- Backfill: rows `inspiration = true` without ext. Guard: `updatedAt` equality (characters have no `version`). Snapshot + `--revert` (reuse d20-characteristics infra).

### P13 morale stat on Character / Unit / UnitBase (dual + backfill, L)
- Target: `characteristics.ext.morale.value` (same pattern as the 9 d20 statblock columns, `readD20Columns`).
- Readers: abilities stat, `sheet-bonuses.ts`, `build-sheet.ts`, `lib/schemas/units.ts`, `import-aliases.ts`, compendium import, `content/resources/units.ts`, `participant/from-unit.ts`, `from-character.ts`, `unit-create-data.ts`, sim scripts.
- `units_base` is a content layer: `contentRowHash` must normalize (legacy column and ext produce the same hash) **before** the backfill, or every template sync shows diffs. Reuse the hash guard (`--expect-same-hashes`).
- Official template JSON (`data/templates/*`) and importers write ext from day one.

### P14 `Character.skillTreeProgress` (expand + dual + backfill, L)
- Target: new module table `skill_tree_progress (character_id text PK FK→characters ON DELETE CASCADE, progress jsonb not null default '{}', updated_at, version int default 0)` + `ENABLE ROW LEVEL SECURITY`; Prisma model in `prisma/schema/systems/skilltrees.prisma`. Back-relation on `Character` uses a neutral name (`moduleProgress`?) or no Prisma relation (same trade-off as P10).
- Why a table, not ext: the progress JSON is large and precious (2026-10-20 skill-wipe incident); a separate table keeps character list egress unchanged, gives a `version` for compare-and-set, and leaves the old column untouched as a natural backup until contract.
- Dual-write in `progress-move.ts`, level-up/de-level paths, create, sheet-handler; read `table ?? column`. Backfill: insert where missing; `--revert` deletes inserted rows (column untouched). Verify by byte-equality query.

### P15 `BattleParticipant.morale` (expand + dual + backfill, L, highest risk)
- Target: participant state slot `state.system.data.ext.morale.value`; `combatStats.morale` stops being a core field.
- Expand: `ALTER TABLE battle_participants ALTER COLUMN morale SET DEFAULT 0` (needed so code can stop writing it; old code still writes, compatible).
- Dual-write in `split-participant.ts`/`save-battle.ts`; read `ext ?? column`; `battle_snapshots.state` (rollback/history) also needs the fallback **permanently** unless snapshots are backfilled too.
- Touches the hot path (bulk typed update, `snapshotHash`), HUD, morale gate, abilities. Deploy only with `active-battles-report --expect-idle`.
- **Honest assessment:** highest risk, lowest audit value per line changed. Recommend deferring until after P11–P14 are confirmed on prod, or accepting a neutral rename-only outcome (see §5).

### P16 Contract (S, later)
One migration per deploy batch: `DROP COLUMN` for `battle_scenes."pendingMoraleCheck"`, `characters.inspiration`, `characters.morale`, `units.morale`, `units_base.morale`, `characters."skillTreeProgress"`, `battle_participants.morale`. Preconditions per column: readers removed in an earlier deployed commit (grep code + `scripts/`), `--report --expect-zero` green on prod, owner yes. Commit message links the reader-removal commit (precedent `20261201000000_drop_race_profiles`).

---

## 3. Eviction table (per entry)

| Entry | Current home | Target home | Write path (after) | Read path (dual window) | Backfill | Rollback |
|---|---|---|---|---|---|---|
| `model SkillTree`, `SkillTreeBase`, `CharacterSkills.*`, `MainSkill(.Base).isEnableInSkillTree` | `prisma/schema.prisma` | `prisma/schema/systems/skilltrees.prisma` (same tables) | module server | module server | none | revert commit (no DB change) |
| `model ArtifactSet`, `ArtifactSetBase` | `prisma/schema.prisma` | `prisma/schema/systems/artifactsets.prisma` | module server | module server | none | revert commit |
| `Artifact.artifactSet` | Prisma relation | removed; `setId` scalar read by module | module | module `findMany({ setId })` | none | revert commit |
| `Campaign.skillTrees`, `.artifactSets` | Prisma relation | removed; DB FK kept | – | – | none | revert commit |
| `BattleScene.pendingMoraleCheck` | column | `system_state.ext.morale.pending` (done) | slot (done) | slot ?? column (done) | existing script, version guard | before contract: code revert; column still there |
| `Character.inspiration` | column | `characteristics.ext.inspiration` | both | ext ?? column | script, `updatedAt` guard, snapshot/revert | code revert safe while dual-write ran (column current) |
| `Character.morale`, `Unit.morale`, `UnitBase.morale` | column | `characteristics.ext.morale.value` | both | ext ?? column | script, hash guard, snapshot/revert, active-battle refusal | same; `units_base` hash normalization must ship first |
| `Character.skillTreeProgress` | column (jsonb) | table `skill_tree_progress` | both | table ?? column | insert-missing, `version` guard, revert = delete inserted | code revert safe; column is the backup |
| `BattleParticipant.morale` | column (int not null) | `state.system.data.ext.morale.value` | both | ext ?? column (+ snapshots) | active/paused battles only, `battle_participants.version`-style guard per scene | code revert only with no active battles |

---

## 4. Global order, rollback, runbook

### 4.1 Order
1. **P1** alone (baseline reset, owner sign-off).
2. **P2, P3, P4, P7, P8, P6.0** in parallel (disjoint files; P3 and P4 both touch `lib/utils/rules/systems/*` types: P3 owns `types-combat.ts`/`components/systems/types.ts`/`lib/server/systems/types.ts`, P4 owns `section-shapes.ts`/`defaults.ts`/`sections` registry).
3. **P5, P6a, P6b, P6c** (P6a/P6b parallel after P6.0; P5 after P3+P4).
4. **P11** prod run can happen any time (script exists), ideally with the deploy of steps 1–3.
5. **P9 → P10** (schema files; no data).
6. **P12, P13, P14** dual-write code deploy → backfills (prodcopy, then prod) → verification.
7. **P15** (optional, see §5).
8. **P16** contract deploy(s), after owner confirmation of each backfill on prod.

### 4.2 Reversibility
| Step | Reversible? | How |
|---|---|---|
| P1–P8, P10 | yes | revert commits; no DB effect |
| P9 | yes, with care | revert restores single file; migration history unchanged; risk is only the build pipeline (rehearse preview build) |
| P11 apply | conditionally | the column is nulled; code older than L4a ignores the slot (battle.md:340), so never roll code back below L4a while battles are active |
| P12/P13/P14 dual-write deploy | yes | column still written; revert code |
| P12/P13 backfill | yes | `--revert <snapshot>` (byte-exact); hash guard |
| P14 expand migration (`CREATE TABLE`) | schema stays (Vercel rollback does not revert DDL); harmless if unused | |
| P14 backfill | yes | delete inserted rows |
| P15 `SET DEFAULT` | harmless | |
| P15 backfill | partially | only with no active battles; snapshots keep old form |
| P16 DROP | **no** | needs `backup-database.sh` right before; restore = `restore-backup-to-supabase.sh` (full DB, loses later writes) |

### 4.3 Prod runbook outline (per backfill)
1. `scripts/db/prodcopy-db.sh` → `prodcopy_<suffix>`; run app against it (sweep guard accepts `prodcopy_<suffix>`).
2. On prodcopy: `active-battles-report --expect-idle`; script dry-run → review counts/divergent rows; `--apply`; `--report --expect-zero`; verification SQL (below); `battle-sweep` profiles touching morale/skilltrees; manual check of one HOMM5 hero (skill tree, morale, inspiration).
3. Owner yes. On prod: `backup-database.sh`; `active-battles-report --expect-idle`; dry-run (counts must match prodcopy ± new rows); `--apply`; `--report --expect-zero`; verification SQL; smoke (open hero, start/abort a test battle, delete it).
4. Record counts and snapshot file path in `docs/STATUS.md`.

Verification queries (must return 0):
```sql
select count(*) from battle_scenes where "pendingMoraleCheck" is not null;
select count(*) from characters where inspiration and coalesce(characteristics->'ext'->'inspiration'->>'available','') <> 'true';
select count(*) from characters where morale <> coalesce((characteristics->'ext'->'morale'->>'value')::int, -1);
-- same for units, units_base
select count(*) from characters c left join skill_tree_progress p on p.character_id = c.id
 where c."skillTreeProgress" <> '{}'::jsonb and p.progress is distinct from c."skillTreeProgress";
select count(*) from battle_participants bp join battle_scenes s on s.id = bp."battleId"
 where s.status in ('active','paused') and bp.morale <> coalesce((bp.state->'system'->'data'->'ext'->'morale'->>'value')::int, -1);
```
Migration deploys (P14 `CREATE TABLE`, P15 `SET DEFAULT`, P16 `DROP`) each go in a separate deploy with no active battle (`end-active-battles.ts` only with owner yes).

---

## 5. Risks and the minimal first slice

### Risks
- **R1 Baseline growth looks like regression.** P1 makes the numbers bigger before smaller. Mitigation: owner sign-off, commit message with old/new counts.
- **R2 Content layers.** `units_base`, `skill_trees_base`, `artifact_sets_base`, `main_skills_base` feed template sync via `contentRowHash`; any shape change without hash normalization floods sync diffs on every campaign.
- **R3 Precious hero data.** `skillTreeProgress` was wiped once (2026-10-20); prodcopy is not a backup. Snapshot + revert + separate table mitigates.
- **R4 Live battle state.** P15 touches the hot path, `snapshotHash`, rollback snapshots; mistakes corrupt running battles.
- **R5 Build pipeline.** P9 changes how Prisma finds the schema in `vercel-build.mjs`; a broken prod build blocks all deploys (migrate runs before `next build`).
- **R6 D16 vs i18n budgets.** Moving log keys into modules but loading them always can push the battle scope over the gzip budget.
- **R7 Merge conflicts.** P6a/P6b/P5 all touch content/battle hubs; without P6.0 they collide.
- **R8 Inverse FK drift (P10).** Two more statements to strip from every generated migration.

### What is too risky / low value (honest)
- **P15** is the worst ratio: one Int column, L effort, live-battle risk, permanent snapshot fallback. Alternative that still removes the name from core: Prisma field rename with `@map("morale")` to a neutral `gateStat`/`resolve` + type rename — zero data risk, but it is a rename, not an eviction; the owner decides.
- **P13** across content layers is the second riskiest; do it only after P12 proves the dual-write/backfill pattern on a single boolean.
- Deleting `unitstacks` (needs a `campaigns.rules` backfill) — not worth it; P7 drops the claim instead.

### Minimal first slice (recommended for wave 4)
**P1 + P2 + P3 + P4 + P6.0 + P6a + P6b + P6c + P7 + P8 + P11 (prod run only).**
- All code-only except P11, whose script is already written and rehearsable.
- Delivers: honest scanner (I3, I5 partial), literals ≤ 2 (I4), pages/API/hooks/types out of core (I2), neutral contract slots (M1, M3), unitstacks claim fixed (M2), composition tests + full masks (M4, M5), ~70–80% of module-name hits gone from core (I1).
- Schema: 0 of 18 removed in slice 1 except `pendingMoraleCheck` becoming contract-ready.

**Slice 2 (next wave):** P9 + P10 (11 of 18 schema entries, no data) + P5.
**Slice 3 (own lane, Opus plan):** P12 → P13 → P14, then P16 for those; P15 only if the owner still wants it after slice 3.

---

## 6. Ratchet and test changes

- `scripts/shared/system-ratchet.ts`: aliases + derived name variants, case-insensitive identifier matching, comment stripping, addon ids in literals, messages both locales/all segments/namespace names, multi-file schema scan with module ownership, `scanModuleModelAccess`.
- `lib/__tests__/system-surface.test.ts`: new cases (`skipMorale`, `artifactSets`, `'skilltrees'` array item, comment ignored, `prisma.skillTree` outside module); schema test reads core files only; new test "module schema files name only their module".
- `system-surface-exempt.json`: regenerated in P1 (one-time growth, owner sign-off), then only shrinks per package; each package's DoD = its files removed from `code`, its keys from `messages`.
- `system-literals-exempt.json`: ≤ 2 (target 0–1) after P2; `system-literals.test.ts:281` case `=== 'morale'` flips from 0 to 1.
- `system-module-subsets.test.ts`: exhaustive masks (P8).
- New `systems/{morale,skilltrees,artifactsets,heroscaling}/__tests__/composition.test.ts`.
- `module-disable.test.ts`: page gate now via `dm/system/[section]/[[...rest]]`; add redirect test for old URLs.
- `prisma/__tests__/content-base-fk-drift.test.ts`: −1 (`artifacts_setId_fkey`), +2 inverse (`*_campaignId_fkey`) if P10 as designed; `migrations-rls.test.ts` covers `skill_tree_progress`.
- `lib/i18n/__tests__/scope-size.test.ts`: re-measure after P5/P6 (module `log` slot).
- Backfill plan tests per script (`scripts/db/lib/__tests__/*-plan.test.ts`), pattern of `backfill-d20-characteristics-plan.test.ts`.
- Docs: `rule-systems.md` (aliases, `log` i18n slot, unitstacks), `battle.md` (morale slot), `abilities.md` (morale stat owner), `.claude/rules/db-deploy.md` (multi-file schema, inverse FK drift), `docs/STATUS.md`.

---

## 7. Cost estimate (agents × model)

Per memory rules: Sonnet implements, Opus reviews once per lane, agents do not run tests; one full gate per slice.

| Slice | Implementer dispatches (Sonnet) | Reviews | Other |
|---|---|---|---|
| Slice 1 | ~8 (P1; P2+P7+P8 batched; P3; P4; P6.0; P6a; P6b+P6c batched; fix pass) | 1 Opus final | P11 prodcopy run: 1 Sonnet; full gate once |
| Slice 2 | ~4 (P9; P10; P5 ×2) | 1 Opus | preview build + prodcopy `migrate status` |
| Slice 3 | ~7 (P12; P13 ×2; P14 ×2; scripts/tests; fix pass) | 1 Opus plan + 1 Opus review | 3 prodcopy rehearsals (Sonnet), prod runs by owner yes |
| P15 (optional) | ~3 | 1 Opus | idle-battle deploy |

Rough total: ~20–22 Sonnet dispatches + 4–5 Opus (plan/reviews) for the whole lane; slice 1 alone is ~9 Sonnet + 1 Opus and fits one fresh session (stop at ~150k context). The full lane is 3–4 sessions; check `/usage` before starting slice 3.
