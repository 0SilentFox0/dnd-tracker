# 4f-5b Spell Grants and Item Casting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add hero and item spell grants, breath weapon, parameterized items, and creature-type effect conditions through the existing 4f-5a/4d/4f-3 systems.

**Architecture:** Extend stable grant identity through character snapshot, cast request, validation, and UI. Derive item spell grants from currently active item refs and consumable stacks, using existing item and consumable pools and persistence. Extend existing item refs and condition evaluation with validated parameters and creature types.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/PostgreSQL, Zod, Vitest, existing ability and spell engines.

**Spec:** `docs/archive/superpowers/specs/2026-10-23-constructor-4f5b-design.md`

## Global Constraints

- Use only `/Users/silentfox/Work/dnd-tracker-constructor` on `feat/constructor`.
- Use only localhost:54322/constructor for DB writes; verify target without printing secrets first.
- Reuse 4f-5a grants/cast, 4d resources/rest, and 4f-3 item inventory/pools.
- Preserve HOMM behavior when 5e fields are absent.
- Keep non-automated mechanics explicit as text/warnings.
- No phase 6, main, production, prodcopy, push, merge, or deploy.
- Keep the three pre-existing HOMM-gate documentation edits.

## Review Focus

- Same spell from multiple grant sources and ordinary slots: test separate charges and require explicit source when ambiguous (Tasks 2–4).
- Forged source, cast level, charge cost, inactive item, or stale parameter: server derives/validates values (Tasks 3, 6, 8).
- Charge state across battle completion, refresh, short/long rest, and removed grants: preserve or clear only the matching stable key (Tasks 2, 5, 7).
- Parameterized consumables and stacked scrolls: preserve selected metadata and prevent spending a different stack's grant (Tasks 7–8).
- Creature conditions on area casts, unknown types, and legacy HOMM participants: filter by each target without changing untyped content (Tasks 9–10).

---

## File map

| Area | Files / responsibility |
|---|---|
| Grant source and character snapshot | `types/battle.ts`, `types/choices.ts`, `lib/utils/characters/choices/selections.ts`, `lib/utils/battle/participant/from-character.ts`: stable identity and runtime grants/pools |
| Cast contract and charges | spell mutation schema/handler, `lib/utils/battle/spell/cast/`, `lib/utils/items/pools.ts`: source selection, level/cost validation, one-time spend |
| Spellbook and sheet | `lib/hooks/battle/useSpellBook.ts`, `components/battle/wizards/SpellBook.tsx`, character sheet resource components: source choices and counters |
| Artifact/item data | `types/abilities.ts` or the existing artifact content type, artifact schema/resource/import/export/sync, item refs and resolvers, grant dialog: spells, parameters, and choice on grant |
| Consumable item state | `types/inventory.ts`, `lib/utils/inventory/items.ts`, stash grant/action/persistence, special-item UI: per-stack parameter and spell selection |
| Conditions | `lib/utils/abilities/schema`, ability runtime condition collection, target snapshot: target creature type |
| SRD data | `scripts/srd/convert/race-choices.ts`, class/feat overrides, `scripts/srd/convert/magic-items.ts`, fixture and generated template pipeline |

Exact component and test filenames are to be confirmed in each task before editing; follow sibling test conventions and do not restructure unrelated large files.

## Task 1: Extend source choices with grant metadata

**Files:** Modify `types/choices.ts`, choice schema used by races/classes/feats, `lib/utils/characters/choices/selections.ts`; sibling schema and selection tests.

**Interfaces:** Choice-level selected spells can describe a grant policy. Selection output carries `{ spellId, label, sourceKey, grantPolicy }[]` alongside the existing deduplicated list of known spell IDs. Source keys derive from owner ID, choice ID, option ID, and spell ID; they never use display names or array positions.

- [x] Add failing tests: two owners selecting the same spell yield one known ID and two grants with stable distinct keys; same selection after display rename/order change preserves keys; normal spell choices still add known spells.
- [x] Run the selection/schema tests and confirm the new assertions fail.
- [x] Add validated `grant` metadata to spell selections and propagate source identity through nested race/feat/class options.
- [x] Run selection/schema tests and targeted lint on changed files.

## Task 2: Build hero grants and stable resource pools

**Files:** Modify `types/battle.ts`, `lib/utils/battle/participant/from-character.ts`, existing resource persistence/rest helpers as needed; participant/resource tests.

**Interfaces:** Extend `SpellGrant` with stable `key`, `source` display metadata, and `via` policy. Character participant creation maps selection grants into the existing `spellcasting.grants`; finite grants register `AbilityPool` entries keyed `pool:grant:<sourceKey>` (the source key already includes spellId). Unlimited grants have no pool.

- [x] Test grant limits and fixed cast level in the participant snapshot; test independent resources for repeated spell IDs.
- [x] Test pool spend survives battle result and rehydrates on battle start; short/long rest resets only matching grants; source refresh does not refill a stable grant.
- [x] Implement snapshot construction using existing `itemPools`/class-pool patterns and `resources.charges` helpers.
- [x] Run participant, resource persistence, and rest tests.

## Task 3: Make cast source explicit and server-validated

**Files:** Spell route schema/mutation and `lib/utils/battle/spell/cast/{index,state,finish}.ts`; spell route/cast tests.

**Interfaces:** Add optional request `grantKey` for compatibility. Resolve a grant by both spell ID and grant key; a grant is selected only if the client names it when there are multiple usable sources. Add policy `via: "grant" | "slotOrGrant"`; slot choice remains separate. Server resolves allowed level and resource cost from the selected grant/item data.

- [x] Test slot cast and each grant cast of one spell spend exactly the selected resource; ambiguity is rejected; invalid/stale key, forged cost/level, and pool shortage spend nothing.
- [x] Test existing one-grant monster cast without `grantKey`, legendary-only cast, and DM free cast preserve their contracts.
- [x] Implement source resolution and pass the selected grant through existing cast pipeline; record source in battle action details.
- [x] Run spell mutation, cast, grant, and monster spell tests.

## Task 4: Add grant selection to battle spell UI

**Files:** Modify `lib/hooks/battle/useSpellBook.ts`, `components/battle/wizards/SpellBook.tsx`, cast dialog/components and sibling tests.

- [x] Test one spell with slot + grant shows distinct choices, one spell with several grants labels each source and remaining uses, and exhausted source is disabled while another remains available.
- [x] Add explicit selection state and submit `grantKey`; show fixed grant cast level and source label.
- [x] Run spellbook/cast UI tests at existing DOM test environment.

## Task 5: Show hero grant counters and allow DM correction

**Files:** Character sheet spell/resource view and existing resource edit route/hook; sheet/resource tests.

- [x] Test remaining/max and rest cadence display per grant, and spent values load from `resources.charges` after battle.
- [x] Expose grants in the existing resource edit model with stable key, label, and max; retain existing auth and charge editing rules.
- [x] Run focused sheet/resource tests.

## Task 6: Add item spell definition and pooled grant resolution

**Files:** Item stats schema, artifact content resource, item resolution/grant helpers, participant snapshot, import/export/source-sync schemas; tests for each existing boundary.

**Interfaces:** Item spell data is `{ spellId, cost, castLevel?, dc?, attackBonus?, upcast?: { maxLevel, extraCost } }[]`. Resolved runtime grant key uses full item ref plus spell ID; resource pool uses existing `itemPoolKey(ref)`. Costs and allowed upcast levels derive from item definition. Spells on one item share its item charge pool with item abilities.

- [x] Test malformed/duplicate spell records, cross-campaign spell refs, fixed/custom casting stat, shared charges, and allowed versus forged upcast cost.
- [x] Test only currently usable/equipped/attuned refs supply their grants, following the existing item activation contract.
- [x] Implement schema/read/write/ref mapping and runtime grants without changing the inventory pool system.
- [x] Run artifact/content, item resolve/pool, snapshot, import/export/source-sync tests.

## Task 7: Store parameter and spell choice on consumable stacks

**Files:** `types/inventory.ts`, `lib/utils/inventory/items.ts`, stash grant schema/planner/actions and UI, bundle import/export mapping; tests.

**Interfaces:** Extend `SpecialItem` with validated optional `parameter` and selected `spellId`; fields are part of stack identity. Unknown legacy JSON fields are dropped as today. A stack's spell grant uses its existing consumable pool key and quantity.

- [x] Test selected parameter/spell survives normalization, grant, merge only when metadata matches, transfer, battle spend, and export/import.
- [x] Test two stacks of the same artifact have distinct grant keys and spending one does not consume the other.
- [x] Implement fields and a grant-dialog choice step; do not create a second inventory representation.
- [x] Run inventory, grant dialog, consumable, and bundle tests.

## Task 8: Cast item spells and consumable scrolls

**Files:** Extend item/consumable grant resolution, spell UI and cast mutation; SRD item converter/overrides and focused tests.

- [x] Test charge cost is spent once on success, not on rejected/no-target cast; upcast charges are validated and subtracted atomically with cast.
- [x] Test scroll cast uses stored spell/level/DC, consumes one matching stack item, has no rest reset, and asks DM to decide reading eligibility. Test legacy items without metadata.
- [x] Convert supported SRD wands/staves/scrolls to item spell data only where spell reference/cost/level is explicit; output unsupported notes for unresolved wording.
- [x] Run cast, consumable, item converter/template integrity tests.

## Task 9: Implement Breath Weapon as a granted spell action

**Files:** Dragonborn race conversion/override, spell converter helpers or generated domain spells, grant data/schema and cast selection UI; focused converter/cast tests.

- [x] Test cone15 and line30x5 may each be chosen at every cast, share one proficiency-sized long-rest pool, deal 1/2/3/4d10 at levels 1/5/11/17, use `8 + CON + proficiency` DC, DEX save and half damage on success, with ancestry controlling damage type only.
- [x] Implement both area choices through existing spell/perform targeting and shared source pool; do not encode geometry by ancestry.
- [x] Run race converter, area/spell engine, grant spend, and template reference tests.

## Task 10: Add parameterized item refs and grant flow

**Files:** `lib/utils/items/ref.ts`, `resolve.ts`, `compose.ts`, item grant API/dialog, all identified inventory/sheet/battle/attunement/ref readers and nested-ref/bundle/sync validators; focused tests.

**Interfaces:** Keep legacy `<baseId>[+<propertyId>]`; append `~<paramKey>` only when a validated parameter exists. Parse returns `{ baseId, propertyId, param }`. `item.parameter` defines finite `kind` and options; all use sites resolve against current campaign definition.

- [x] Test round-trip, invalid/reserved separators, composed+param and simple+param refs, distinct parameters, missing option, refs nested in equipped/stash/attuned, and existing unparameterized refs.
- [x] Add a guard test/search proving no raw ref reader outside the canonical resolve functions silently drops `~param`.
- [x] Extend give-item UI with parameter selection and server validation; resolve `{param}` only in allowed typed fields/name.
- [x] Update every ref consumer found by the guard, including import/export/sync and deletion checks; run item/character/battle/content tests.

## Task 11: Add target creature type conditions

**Files:** Ability condition schema/editor, ability matcher/engine condition path, character and monster snapshot, SRD magic item converters/overrides; tests.

- [x] Test matching/nonmatching/unavailable type and each target of area effects; unknown type does not pass. Untyped HOMM participant effects keep prior result.
- [x] Populate normalized hero creature type (`humanoid` fallback, selected species where available) and consume monster `abilities.creatureType` snapshot.
- [x] Convert only verified SRD effects; retain unsupported prose with a report.
- [x] Run ability schema/editor/engine, item converter, and snapshot tests.

## Task 12: Template integrity and migration/reimport checks

**Files:** SRD converters/generated data, loader integrity scripts/tests, content schema and docs as required.

- [x] Add synthetic converter fixtures for Magic Initiate, Mystic Arcanum, Signature Spells, ancestry, a charged spell item, a scroll, parameterized resistance/slayer item, and creature-type condition.
- [x] Assert all generated IDs and nested refs resolve; unsupported mechanics are listed with category/reason; rerun template generation only after tests pass.
- [x] Verify local DB target (host localhost, database constructor) without secrets before writes. Run template import twice; first has expected updates, second creates zero duplicates/errors.
- [x] Run focused integrity, migration, generated-data, and repeat-import checks; save logs under `.superpowers/sdd/2026-10-23-constructor-4f5b/`.

## Task 13: Live/browser verification, review, and checkpoint

- [x] Before costly full checks, notify user with expected test/build/browser scope. Run changed focused suite while implementing; run full test suite, fresh `tsc`, build once at block end. Reuse recorded 4f-5a evidence; report the known battle-sweep labyrinth failure without rerunning unless changes make it relevant.
- [x] On localhost:54322/constructor, create/use a temporary test campaign only after target verification. Verify real hero grant cast and slot choice, item charge/upcast, scroll consumption, rest persistence, parameter choice, and creature-type condition. Clean up test records/processes.
- [x] Browser at 1440 and 390 px: grant-source selection, counters, item parameter grant, scroll cast, and no horizontal overflow; retain screenshots/logs in SDD.
- [x] One scoped review for the complete block; one fix wave; brief rereview; `/simplify` or documented equivalent. Update architecture, STATUS, and handoff; record next block (background design) in checkpoint; commit 4f-5b.

## Completion checkpoint

After commit, make a separate small design/plan for backgrounds from 4f-4 §9 before implementing them. Then update 4f-6 Tasks 18–21 plan after reviewing its approved design. Do not start phase 6.

## Доповнення після уточнення користувача

Перед фінальними Tasks12–13:
- [x] RED→GREEN: нульова ціна предметного гранту, порожній пул, відсутність списання; SRD cost0 зберігається.
- [x] RED→GREEN: модель часу (reaction і long/rounds/source), наскрізні schema/read/form/import/bundle/SRD.
- [x] RED→GREEN: каст реакцією поза ходом, контроль, блокери, одна реакція, незмінна основна дія.
- [x] RED→GREEN: pending long cast, концентрація, дія на продовження, успіх/переривання, списання лише на завершенні, явний fast-forward ДМ.
- [x] UI реакцій/часу/прогресу та цільові перевірки; додати до живого фінального прогону.

## Фінальні докази — 2026-10-24

Tasks1–13 та доповнення завершено; коміт checkpoint готується. Докази: `.superpowers/sdd/2026-10-23-constructor-4f5b/`. Full suite `full-tests-confirm.log`:1186 файлів/7650 тестів; `typescript-final.log`:exit0; `lint-final.log`:0 errors/5 warnings. Production build `build-final-escalated.log` та `.exit`:exit0,38/38 сторінок. Попередній перерваний build і повтор із lock error не є успішними доказами; фінальний запуск їх заміщує.

SRD498 заклинань/333 артефакти; другий import creates0/errors0. HTTP: гранти/слоти, upcast/charges, ізоляція стеків сувоїв, reaction поза ходом, long cast завершення/переривання. Persistence: завершення бою, short/long rest і наступні бої. Browser1440/390: лист/бій/вибір джерела/upcast/предмети, без overflow/JS exceptions; `browser-interactions.json`, `browser-inventory.json`. `cleanup.json` підтверджує видалення тимчасових кампанії/користувача; власні Next/auth/Chrome зупинено, Docker БД залишено.

Один scoped review, виправлено2 Important через RED→GREEN; rereview/simplify-equivalent без нових матеріальних зауважень — запис у progress.md. Coverage: `data/templates/srd-5.2/coverage-4f5b.json`; випадкове відновлення/знищення предметів, допуск до читання сувою, заміна атаки подихом та вибір характеристики деяких грантів залишаються явним рішенням ДМ. Reaction triggers підтверджує користувач, без ретроактивного перегравання застосованих подій.

Дизайн backgrounds погоджено окремо2026-10-24; виконання після цього коміту й origin/main sync. 4f-6 та етап6 не починали.
