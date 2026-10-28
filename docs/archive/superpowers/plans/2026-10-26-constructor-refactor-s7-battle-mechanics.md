# S7. Бойові spell/attack/turn механіки — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven execution is available only when separately chosen by the user. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Декомпозувати spell flow і turn boundaries та перевірити дорогі повторні обходи.

**Architecture:** Public flow/turn barrels лишаються сумісними. Reducer/types, targeting/cost helpers і turn boundary processing розділяються без зміни порядку RNG/effects/persistence.

**Tech Stack:** TypeScript strict, Next.js 16 / React 19, Zod 4, Prisma 6 / PostgreSQL, TanStack Query 5, Vitest 4, pnpm.

**Spec:** [roadmap, S7](2026-10-26-constructor-refactor-roadmap.md#сесії); [спільний контракт виконання](2026-10-26-constructor-refactor-execution-guide.md); чинні subsystem docs у `docs/architecture/`.

**Dependencies:** S2, S5 та S6.1–S6.3 інтегровані й підтверджені ancestry. S6.4 відкрита; пряме доручення дозволило незалежні extraction-и S7.1–S7.3. Фінальна S7.4 лишається після інтеграції та необхідних попередніх перевірок.

**Status:** S7.1–S7.3 виконано та локально інтегровано у `feat/constructor` 2026-10-27 (merge `76cc17a7`). Усі 19 кроків/перевірок/commits цих задач позначено. [Checkpoint](2026-10-26-constructor-refactor-s7-progress.md) містить baseline, interfaces, measurements, review та результати. **S7.4 не виконано**: очікує інтеграції необхідних попередніх результатів і закриття потрібних перевірок, зокрема відкритої S6.4. Історичний HEAD підготовки плану: `73c5de1a`; фактичний base реалізації: `515c1f02`.

## Global Constraints

- Виконувати спільний контракт execution guide; змінювати тільки файли поточної задачі.
- Зберігати API/MCP ids, payloads, persisted JSON, errors/defaults, HOMM і 5e.
- DB writes тільки на guarded local constructor з перевіркою обох URLs; без secrets у logs.
- Не запускати prod/prodcopy, HOMM gateway, merge/push/deploy; застосовані міграції не редагувати.
- Зберігати scoped transaction, lock order, live auth, atomic write+receipt і idempotent effects.
- Прості extraction перевіряти чинними тестами; нова поведінка/дефект потребує RED→GREEN regression.

## Review Focus

- Зміна slot/grant/upcast очищує лише належні rolls — задача 1.
- AoE враховує invisible; UI token projection не є immunity — задача 2.
- Death/concentration/DOT/hazard/recharge зберігають RNG і event order — задача 3.
- Off-turn reaction/multiattack залишають чинні resource costs — задача 2.
- SnapshotHash/version/delta узгоджені після extraction — задача 4.

---

### Task 7.1: Відокремити spell state, costs і targeting від reducer

**Files:**

- Create: `lib/utils/battle/flows/spell-flow-types.ts`, `lib/utils/battle/flows/spell-costs.ts`, `lib/utils/battle/flows/spell-pick.ts`
- Modify: `lib/utils/battle/flows/spell-flow.ts`, `lib/utils/battle/flows/index.ts`
- Test: `lib/utils/battle/flows/__tests__/spell-flow.test.ts`, `lib/utils/battle/flows/__tests__/spell-blocked-by-slots.test.ts`

**Interfaces:**
- Consumes: Чинні SpellFlowState/Action/Pick/SlotOption та buildSpellPick/slotOptions helpers.
- Produces: Type definitions у spell-flow-types; costs: slotOptions/spellSlotsLeft/casterUsesUniversalSlot/spellBlockedBySlots/spellSlotCostLabel; selection: buildSpellPick/spellTargetSide/spellDefinition/spellSpec/spellAimTargets/spellTargetCandidates/spellTargetInRange/spellSaveTargets/spellWidening. Усі signatures з поточних declarations зберегти.

- [x] **Крок 1.** Зняти exports/signatures до зміни й baseline suites. Витягти типи, потім pure helpers; reducer лишити в spell-flow.ts із re-exports для deep-path compatibility.

- [x] **Крок 2.** Перевірити `spellFlow` OPEN→PICK→targets→rolls→payload: casterId/spellId/targetIds/diceRolls ті самі; FAIL/BACK/SET_LEVEL semantics зберегти.

- [x] **Крок 3.** Existing tests мають зафіксувати SET_CAST_LEVEL/SET_GRANT зі зміною dice slots, target removal очищує stale save/attack rolls, pact/regular/free slot behavior.

- [x] **Крок 4.** Нові модулі імпортують types без імпорту facade, щоб не утворити цикл; не переносити DB/react залежностей у pure logic.

- [x] **Перевірка.** `pnpm exec vitest run lib/utils/battle/flows/__tests__/spell-flow.test.ts lib/utils/battle/flows/__tests__/spell-blocked-by-slots.test.ts lib/utils/battle/spell/__tests__/slot-choice.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(battle): separate spell flow state and helpers`.

### Task 7.2: Звірити спільні attack/spell calculations і costs

**Files:**

- Read/Modify за підтвердженим дублюванням: `lib/utils/battle/spell/spell-targeting.ts`, `lib/utils/battle/attack/ability.ts`, `lib/utils/battle/flows/spell-pick.ts`, `lib/utils/battle/flows/spell-costs.ts`
- Test: `lib/utils/battle/conditions/__tests__/attack-conditions.test.ts`, `lib/utils/battle/flows/__tests__/spell-flow.test.ts`, `app/api/__tests__/battles/attack-off-hand.test.ts`, `app/api/__tests__/battles/core-action-mutation.test.ts`

**Interfaces:**
- Consumes: Чинні server attack/slot/target helpers, collectModifiers/runAbilities та S5 domain constants.
- Produces: Existing pure availability/range/cost signatures; жодного нового registry або client authority.

- [x] **Крок 1.** Зіставити UI preview і server resolver на таблиці HOMM/5e, reach/ranged, off-hand/multiattack, reaction, slot/grant; відмінність access/UI visibility не трактувати автоматично як дубль.

- [x] **Крок 2.** Спільний вираз переносити в існуючого domain owner тільки за однаковими inputs/semantics; update consumers у scope задачі, payload/error не змінювати.

- [x] **Крок 3.** Перевірити AoE із invisible participant: входить у spellAimTargets при належній геометрії; unrendered token не виключається із server damage.

- [x] **Крок 4.** Невалідні/stale targets та недостатні ресурси відхиляє сервер; off-turn reaction не витрачає action як звичайний cast.

- [x] **Перевірка.** `pnpm exec vitest run lib/utils/battle/conditions/__tests__/attack-conditions.test.ts lib/utils/battle/flows/__tests__/spell-flow.test.ts app/api/__tests__/battles/attack-off-hand.test.ts app/api/__tests__/battles/core-action-mutation.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(battle): reuse compatible mechanics calculations`.

### Task 7.3: Виділити turn boundaries зі збереженням порядку ефектів

**Files:**

- Create: `lib/utils/battle/turn/turn-start.ts`, `lib/utils/battle/turn/turn-end.ts`, `lib/utils/battle/turn/round-start.ts`
- Modify: `lib/utils/battle/turn/start-end.ts`, `lib/utils/battle/turn/run-advance-turn-loop.ts`
- Test: `lib/utils/battle/turn/__tests__/start-end.test.ts`, `lib/utils/battle/turn/__tests__/advance-turn.test.ts`, `lib/utils/battle/turn/__tests__/advance-after-removal.test.ts`

**Interfaces:**
- Consumes: processStartOfTurn/processEndOfTurn/processStartOfRound, StartOfTurnResult/Hazard і RunAdvanceTurnLoopParams.
- Produces: Exact declarations переносяться у boundary modules; start-end.ts re-export functions/types. runAdvanceTurnLoop(params: AdvanceTurnLoopParams): AdvanceTurnLoopResult лишається єдиною orchestration.

- [x] **Крок 1.** Перенести три функції в named modules без зміни statement order; module imports не йдуть назад через start-end facade.

- [x] **Крок 2.** У deterministic tests freeze clock і supply recorded RNG sequence; assert final participants, messages, nextTurnIndex/round та кількість/порядок RNG calls.

- [x] **Крок 3.** Покрити recharge→DOT/HOT→hazard→death/concentration→turn abilities, effect expiry, summon/reserve, removal current participant і round wrap.

- [x] **Крок 4.** Заміряти repeated scans у turn loop на 10/100 participants. Локальний index допустимий лише до наступної state mutation; після mutation перебудувати/оновити. Якщо виграш не доведено — не додавати cache.

- [x] **Крок 5.** Не змінювати maxAttempts, victory check frequency, event ids/clock calls, реакції або правила invisibility.

- [x] **Перевірка.** `pnpm exec vitest run lib/utils/battle/turn/__tests__/start-end.test.ts lib/utils/battle/turn/__tests__/advance-turn.test.ts lib/utils/battle/turn/__tests__/advance-after-removal.test.ts lib/utils/battle/turn/__tests__/control-effects.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(battle): separate turn boundary processing`.

### Task 7.4: Перевірити pipeline, snapshots і client delta

**Статус: виконано 2026-10-27.** Integrated pipeline/delta та guarded SQL evidence — у фінальному розділі checkpoint.

**Files:**

- Test: `lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts`, `lib/utils/battle/pipeline/__tests__/client-delta.test.ts`, `lib/utils/battle/client/__tests__/apply-delta.test.ts`, `lib/utils/battle/store/__tests__/snapshot-state.test.ts`
- Create: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s7-progress.md`

**Interfaces:**
- Consumes: Refactored engine та чинний runBattleMutation/saveBattle/delta contract.
- Produces: Engine compatibility evidence і measurements для S8 consumer extraction.

- [x] **Крок 1.** Перевірити expectedVersion conflict, changed snapshot→changed hash, unchanged participant→patch only, full upsert нового participant, delta gap→один refetch.

- [x] **Крок 2.** Прогнати targeted engine/API suites для змінених mechanics; reused assistant battle-pipeline tests підтверджують один canonical writer.

- [x] **Крок 3.** Записати deterministic seed/clock і raw performance comparisons; збіг snapshot/event outputs обов’язковий незалежно від speed.

- [x] **Крок 4.** Typecheck/lint/diff check; передати stable flow exports S8 без gameplay changes.

- [x] **Перевірка.** `pnpm exec vitest run lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts lib/utils/battle/pipeline/__tests__/client-delta.test.ts lib/utils/battle/client/__tests__/apply-delta.test.ts lib/utils/battle/store/__tests__/snapshot-state.test.ts lib/server/assistant/__tests__/battle-pipeline.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `docs(battle): checkpoint mechanics compatibility`.

## Критерій завершення

Spell/turn responsibilities розділені, deterministic behavior і persistence/delta інваріанти підтверджені; CPU improvements мають evidence.

## Передача наступній сесії

Оновити `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s7-progress.md` за execution guide. Передати branch/start-end HEAD, виконані task ids, commits, результати перевірок і залишки. Новий контекст читає roadmap, execution guide, цей план і checkpoint попередника.

Наступний залежний план: [S8](2026-10-26-constructor-refactor-s8-hooks-ui.md). Паралельний порядок і залежності визначає execution guide.
