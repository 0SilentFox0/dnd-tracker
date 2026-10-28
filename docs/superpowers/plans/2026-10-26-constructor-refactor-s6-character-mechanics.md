# S6. Класи, choices, grants і ресурси персонажа — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven execution is available only when separately chosen by the user. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Відділити pure character derivation від loading/writes та прибрати повторні reference lookups.

**Architecture:** Server wrappers зберігають auth/storage; чисті class/choice/grant helpers живуть у наявних utils. CampaignSpellContext розширюється optional preloaded maps без зміни HTTP DTO.

**Tech Stack:** TypeScript strict, Next.js 16 / React 19, Zod 4, Prisma 6 / PostgreSQL, TanStack Query 5, Vitest 4, pnpm.

**Spec:** [roadmap, S6](2026-10-26-constructor-refactor-roadmap.md#сесії); [спільний контракт виконання](2026-10-26-constructor-refactor-execution-guide.md); чинні subsystem docs у `docs/architecture/`.

**Dependencies:** S5 повністю перевірено після інтеграції; S2–S4 adapters стабільні.

**Status:** S6.1–S6.3 виконано та змерджено у `feat/constructor` комітом `4ad9011b` за дорученням користувача. Base S5: `70825040`; гілка S6: `refactor/constructor-s6-character-mechanics`, HEAD до merge: `17c680be`. Усі кроки задач 6.1–6.3 позначено нижче; evidence — у [checkpoint S6](2026-10-26-constructor-refactor-s6-progress.md). S6.4 залишається відкритою до перевірки повного об’єднаного стану; виконано лише її документаційний пункт.

## Global Constraints

- Виконувати спільний контракт execution guide; змінювати тільки файли поточної задачі.
- Зберігати API/MCP ids, payloads, persisted JSON, errors/defaults, HOMM і 5e.
- DB writes тільки на guarded local constructor з перевіркою обох URLs; без secrets у logs.
- Не запускати prod/prodcopy, HOMM gateway, merge/push/deploy; застосовані міграції не редагувати.
- Зберігати scoped transaction, lock order, live auth, atomic write+receipt і idempotent effects.
- Прості extraction перевіряти чинними тестами; нова поведінка/дефект потребує RED→GREEN regression.

## Review Focus

- Серверний невідомий classId лишається 422, battle snapshot fallback лишається HOMM — задача 1.
- Повторний PUT choices не подвоює ASI і не дублює grants — задача 2.
- Shared pool/sourceKey і item/scroll costs стабільні — задача 3.
- Preloaded порожня map не провокує повторний fetch або чужі refs — задача 2.
- Rest/battle/finish повертають правильні поточні ресурси — задача 4.

---

### Task 6.1: Виділити pure derivation класів

**Files:**

- Create: `lib/utils/characters/classes/application.ts`
- Modify: `lib/server/characters/apply-classes.ts`, `lib/utils/characters/classes/index.ts`
- Test: `lib/server/characters/__tests__/apply-classes.test.ts`, `lib/utils/spells/__tests__/class-slots.test.ts`

**Interfaces:**
- Consumes: ClassesApplied/ClassesApplyResult, validateClassEntries, classSpellSlots та rules із S5.
- Produces: `ClassApplicationInput = { rules: Ruleset; maxLevel: number; entries: CharacterClassEntry[]; spellcastingAbility: string | null }`; `deriveClassApplication(input: ClassApplicationInput, byId: Record<string, GameClassData>): ClassesApplyResult`; existing types/validateClassEntries re-export із server file.

- [x] **Крок 1.** Зафіксувати existing assertions: []→{ok:true,data:null}; disabled+nonempty→422; wrong class/subclass/early subclass/max sum level→попередні error text; manual spellcasting ability не перезаписується.

- [x] **Крок 2.** Перенести validation/labels/slot derivation у client-safe utils без DB/cache imports. applyClasses лишає refs loading і делегує pure helper.

- [x] **Крок 3.** Зберегти classTotalLevel, spellSlots current=max, pact metadata; не змішувати серверне reject невідомого класу з battle resolver, який ігнорує unknown refs.

- [x] **Крок 4.** Перевірити full/half/third single vs multiclass rounding і pact на existing class-slots fixtures; counters/labels ті самі.

- [x] **Перевірка.** `pnpm exec vitest run lib/server/characters/__tests__/apply-classes.test.ts lib/utils/spells/__tests__/class-slots.test.ts lib/utils/battle/participant/__tests__/from-character-classes.test.ts lib/utils/battle/participant/__tests__/from-character-damage-model.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(characters): isolate class derivation from loading`.

### Task 6.2: Перевикористати preloaded choice refs у participant builder

**Files:**

- Modify: `lib/utils/battle/types/participant.ts`, `lib/utils/battle/participant/from-character.ts`, `lib/utils/battle/participant/load-character-context.ts`, `lib/utils/battle/participant/load-feats.ts`
- Read: `lib/server/characters/choices/load-refs.ts`, `lib/server/characters/choices/resolve-choices.ts`, `lib/utils/characters/choices/plan.ts`
- Test: `lib/utils/battle/participant/__tests__/from-character-choices.test.ts`, `lib/server/characters/choices/__tests__/resolve-choices.test.ts`

**Interfaces:**
- Consumes: CampaignSpellContext, choiceSelections, selectionNeedsFeats, loadBackground/loadFeatsById та план choices.
- Produces: Optional `CampaignSpellContext.featsById?: Record<string, FeatData>` і `backgroundsById?: Record<string, BackgroundData>`; public createBattleParticipantFromCharacter signature незмінна.

- [x] **Крок 1.** Порахувати cached-loader invocations і mapping work при повторних heroes з однаковими refs; не називати cached lookup SQL-запитом без Prisma measurement.

- [x] **Крок 2.** Додати test `preloadedChoiceRefsAvoidFallbackReads`: explicit {}→немає loader call; undefined→поточний fallback; refs не з іншої кампанії, відсутній background→null за контрактом.

- [x] **Крок 3.** Завантажувати maps у чинному context loader тільки коли selectionNeedsFeats/background needs цього потребують; builder споживає preloaded maps, не вводить global state.

- [x] **Крок 4.** Не переносити server write validation у builder. У choices tests before=after дає нульовий ASI delta; changed picks застосовують лише різницю.

- [x] **Крок 5.** На stored fixtures порівняти participant abilities/choices/grants до/після зі frozen clock; ids/sourceKey і порядок groups зберегти.

- [x] **Перевірка.** `pnpm exec vitest run lib/utils/battle/participant/__tests__/from-character-choices.test.ts lib/utils/battle/participant/__tests__/from-character-learned-spells.test.ts lib/server/characters/choices/__tests__/resolve-choices.test.ts lib/utils/characters/choices/__tests__`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `perf(characters): reuse preloaded choice references`.

### Task 6.3: Винести побудову grants і pools із participant assembly

**Files:**

- Create: `lib/utils/battle/participant/character-spell-grants.ts`
- Modify: `lib/utils/battle/participant/from-character.ts`
- Test: `lib/utils/battle/participant/__tests__/from-character-items.test.ts`, `lib/utils/battle/participant/__tests__/from-character-consumables.test.ts`, `lib/utils/battle/participant/__tests__/from-character-choices.test.ts`

**Interfaces:**
- Consumes: ChoiceSelections, EquippedArtifactRow, ConsumableEntry, SelectedSpellGrant, SpellGrant, AbilityPool.
- Produces: `buildCharacterSpellGrants(input: { selections: ChoiceSelections | null; artifactRows: EquippedArtifactRow[]; consumables: ConsumableEntry<Prisma.ArtifactGetPayload<object>>[]; proficiencyBonus: number }): { grants: SpellGrant[]; pools: Record<string, AbilityPool> }`.

- [x] **Крок 1.** Перенести heroGrantPool і hero/item/scroll grant/pool mapping у pure module; type-only Prisma import допустимий, runtime DB/cache imports заборонені.

- [x] **Крок 2.** Зберегти classPools merge на попередньому місці та порядок precedence: class→item→consumable→grant; keys pool:grant/item/consumable, sharedPool grouping і encodeURIComponent незмінні.

- [x] **Крок 3.** Assert existing cases: grant uses=proficiency, uses=0 без pool, shared pool, duplicate equipped item, scroll linked spellId, castLevel/dc/attackBonus/upcast fields.

- [x] **Крок 4.** Зі frozen time порівняти весь participant, не лише підмножину grants; knownSpells dedup/order та persisted resource application не змінювати.

- [x] **Перевірка.** `pnpm exec vitest run lib/utils/battle/participant/__tests__/from-character-items.test.ts lib/utils/battle/participant/__tests__/from-character-consumables.test.ts lib/utils/battle/participant/__tests__/from-character-choices.test.ts lib/utils/battle/participant/__tests__/from-character-resources.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(characters): isolate spell grants and pools`.

### Task 6.4: Перевірити character lifecycle і передати engine consumers

**Files:**

- Test: `app/api/__tests__/character-patch-choices.test.ts`, `app/api/__tests__/character-sheet-choices.test.ts`, `app/api/__tests__/character-level-up-api.test.ts`, `app/api/__tests__/character-create-slots.test.ts`
- Test: `lib/server/assistant/__tests__/character-progression-storage.integration.test.ts`
- Create: `docs/superpowers/plans/2026-10-26-constructor-refactor-s6-progress.md`

**Interfaces:**
- Consumes: Pure helpers і preloaded context попередніх задач, чинні rest/resource writers.
- Produces: Evidence create→choices→level-up→rest→battle→finish→sheet; stable public exports для S7/S8.

- [x] **Крок 1.** Перевірити повтор choices update, multiclass level-up, background origin feat, pact/regular slot spending, attunement і consumable decrement.

- [x] **Крок 2.** Для DB writer changes — guarded integration rollback/cross-campaign assertions; для loading-only extraction не додавати зайвих storage tests.

- [x] **Крок 3.** Заміряти кількість loader/DB calls для small/large character sets, зафіксувати джерело кожної метрики.

- [x] **Крок 4.** Записати checkpoint із signatures, results і відкладеними consumer replacements S7/S8; TypeScript/lint/diff check. Виконано для S6.1–S6.3 та повторено після їх merge; lifecycle та інші пункти S6.4 ще не завершені.

- [x] **Перевірка.** `pnpm exec vitest run app/api/__tests__/character-patch-choices.test.ts app/api/__tests__/character-sheet-choices.test.ts app/api/__tests__/character-level-up-api.test.ts app/api/__tests__/character-create-slots.test.ts lib/utils/battle/participant/__tests__`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `docs(characters): record mechanics refactor evidence`.

## Критерій завершення

Class/choice/grant derivation має чисті межі, повторні lookup виміряно, lifecycle/unknown-ref/resource semantics сумісні.

## Передача наступній сесії

Оновити `docs/superpowers/plans/2026-10-26-constructor-refactor-s6-progress.md` за execution guide. Передати branch/start-end HEAD, виконані task ids, commits, результати перевірок і залишки. Новий контекст читає roadmap, execution guide, цей план і checkpoint попередника.

Наступний залежний план: [S7](2026-10-26-constructor-refactor-s7-battle-mechanics.md). Паралельний порядок і залежності визначає execution guide.
