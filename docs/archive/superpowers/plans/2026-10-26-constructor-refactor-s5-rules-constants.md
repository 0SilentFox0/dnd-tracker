# S5. Rules, defaults і константи механік — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven execution is available only when separately chosen by the user. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Визначити власників rule values та усунути підтверджене дублювання без зміни gameplay.

**Architecture:** Чисті rule modules лишаються client-safe. DEFAULT_RULES/schema отримують спільне джерело значень, registry лишається чинним, domain constants зберігають compatibility exports.

**Tech Stack:** TypeScript strict, Next.js 16 / React 19, Zod 4, Prisma 6 / PostgreSQL, TanStack Query 5, Vitest 4, pnpm.

**Spec:** [roadmap, S5](2026-10-26-constructor-refactor-roadmap.md#сесії); [спільний контракт виконання](2026-10-26-constructor-refactor-execution-guide.md); чинні subsystem docs у `docs/architecture/`.

**Dependencies:** S5.1–S5.3 можуть виконуватися паралельно із S1 в окремому worktree з власним targeted baseline. S5.4 — після інтеграції результатів S1.

**Status:** План підготовлено; у цій сесії реалізацію не запускали. Стан паралельних робіт звірити за checkpoint-ами. Базовий HEAD для звірки: `73c5de1a`.

## Global Constraints

- Виконувати спільний контракт execution guide; змінювати тільки файли поточної задачі.
- Зберігати API/MCP ids, payloads, persisted JSON, errors/defaults, HOMM і 5e.
- DB writes тільки на guarded local constructor з перевіркою обох URLs; без secrets у logs.
- Не запускати prod/prodcopy, HOMM gateway, merge/push/deploy; застосовані міграції не редагувати.
- Зберігати scoped transaction, lock order, live auth, atomic write+receipt і idempotent effects.
- Прості extraction перевіряти чинними тестами; нова поведінка/дефект потребує RED→GREEN regression.

## Review Focus

- Некоректна одна секція не скидає валідні інші — задача 1.
- Patch не підставляє defaults у відсутні поля — задача 2.
- HOMM/5e і 2014/2024 defaults/формули не змінюються — задачі 1–3.
- Array defaults не утворюють непомічених mutable aliases — задача 2.
- Consumers і frozen battle rules сумісні після інтеграції — задача 4.

---

### Task 5.1: Зняти локальний baseline й карту правил

**Files:**

- Read: `lib/utils/rules/schema.ts`, `lib/utils/rules/defaults.ts`, `lib/utils/rules/registry.ts`, `lib/utils/rules/formulas.ts`, `docs/architecture/battle.md`, `docs/architecture/abilities.md`
- Test: `lib/utils/rules/__tests__/schema.test.ts`, `lib/utils/rules/__tests__/schema-4a.test.ts`, `lib/utils/rules/__tests__/schema-4b.test.ts`, `lib/utils/rules/__tests__/schema-4c1.test.ts`, `lib/utils/rules/__tests__/formulas.test.ts`
- Create: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s5-progress.md`

**Interfaces:**
- Consumes: Власний worktree від pinned constructor HEAD; S1 спільні outputs не потрібні.
- Produces: Mechanic→default/schema/formula/engine/UI/API matrix та baseline власного commit.

- [ ] **Крок 1.** Через using-git-worktrees створити ізоляцію; записати own branch/base. Не редагувати вихідну constructor working copy або файли S1.

- [ ] **Крок 2.** Прочитати consumers через rg без їх редагування; скласти matrix для всіх ключів MECHANIC_REGISTRY та позначити editable campaign data.

- [ ] **Крок 3.** В existing tests зафіксувати `parseRules(null)` deep-equal DEFAULT_RULES; partial invalid morale section не змінює valid actions/classes; unknown field behavior відповідає чинному schema.

- [ ] **Крок 4.** Запустити baseline наведеною командою, записати count/exit; failures до зміни позначити baseline failure і локалізувати перед extraction.

- [ ] **Перевірка.** `pnpm exec vitest run lib/utils/rules/__tests__ lib/constants/__tests__/choices.test.ts`. Очікування: exit 0; baseline на чинних rules/choices suites записано до extraction.

### Task 5.2: Усунути дублювання default values між schema та DEFAULT_RULES

**Files:**

- Create: `lib/utils/rules/default-values.ts`
- Modify: `lib/utils/rules/schema.ts`, `lib/utils/rules/defaults.ts`
- Test: `lib/utils/rules/__tests__/schema.test.ts`, `lib/utils/rules/__tests__/schema-4b.test.ts`, `lib/utils/rules/__tests__/schema-4d.test.ts`, `lib/utils/rules/__tests__/schema-4e.test.ts`, `lib/utils/rules/__tests__/schema-4f3.test.ts`

**Interfaces:**
- Consumes: Current DEFAULT_RULES exact values і schema .default/.prefault behavior.
- Produces: RULE_DEFAULT_VALUES у default-values.ts без runtime/type imports schema; незмінні `parseRules(raw: unknown): Ruleset`, `mergeRules(current: Ruleset, patch: Record<string, Record<string, unknown> | undefined>): MergeRulesResult` та DEFAULT_RULES.

- [ ] **Крок 1.** Зафіксувати assert `RulesetSchema.parse({})` deep-equal старому DEFAULT_RULES; `RulesetPatchSchema.parse({actions:{enabled:true}})` дорівнює `{actions:{enabled:true}}`, без opportunityAttacks/variant defaults.

- [ ] **Крок 2.** Перенести всі exact values в literal-only RULE_DEFAULT_VALUES; enum literals зберегти вузькими, empty arrays явно типізувати string[]. Модуль не імпортує schema, щоб уникнути inference/runtime cycle.

- [ ] **Крок 3.** Зібрати DEFAULT_RULES і schema defaults із common values; mutable array defaults копіювати в тих точках, де чинний schema вже створював незалежні масиви. Не змінювати fallback reference semantics без окремого тесту.

- [ ] **Крок 4.** Зберегти міжпольові initiative/criticals validation, error messages/paths, trim і min/max. Перевірити два незалежні schema.parse outputs: зміна disabledSuccess першого не впливає на другий.

- [ ] **Крок 5.** Typecheck має підтвердити відсутність circular type inference і незмінний Ruleset тип; consumers не редагувати.

- [ ] **Перевірка.** `pnpm exec vitest run lib/utils/rules/__tests__`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(rules): share schema and ruleset default values`.

### Task 5.3: Звірити domain constants і формули у дозволених файлах

**Files:**

- Modify: `lib/utils/rules/formulas.ts`, `lib/utils/rules/registry.ts`, `lib/constants/classes.ts`, `lib/constants/choices.ts`, `lib/constants/spells.ts`, `lib/constants/weapon-traits.ts`, `lib/constants/hero-scaling.ts` тільки за підтвердженим дублюванням
- Test: `lib/utils/rules/__tests__/formulas.test.ts`, `lib/constants/__tests__/choices.test.ts`, `lib/constants/__tests__/spells.test.ts`, `lib/constants/__tests__/hero-archetypes.test.ts`

**Interfaces:**
- Consumes: Existing MAX_CLASS_LEVEL=20, HIT_DICE, CLASS_CASTERS, domain helper/label exports.
- Produces: Сумісні domain exports; карта ownership і список downstream replacements для інтегратора.

- [ ] **Крок 1.** Звірити MAX_CLASS_LEVEL=20, HIT_DICE=[6,8,10,12], CLASS_CASTERS=["none","full","half","third","pact"] через наявні schema/consumer tests. Не додавати тести, які лише переписують literal arrays; новий regression лише для непокритої поведінки.

- [ ] **Крок 2.** У дозволених модулях замінити literal duplicates лише де сенс і одиниці тотожні. Не замінювати всі 20/9/3 однією константою; незмінний rule table не робити campaign setting.

- [ ] **Крок 3.** Формули перевірити на level1/4/5/20, disabled morale, custom dice/hp rules; existing proficiencyForLevel/heroDiceTable/heroHpFormula/moraleCapFromRules exports зберегти.

- [ ] **Крок 4.** Якщо duplicate consumers поза allowlist — додати точні шляхи/replacements до checkpoint, зберегти старі exports і не редагувати consumers у паралельній фазі.

- [ ] **Перевірка.** `pnpm exec vitest run lib/schemas/__tests__/classes.test.ts lib/constants/__tests__/choices.test.ts lib/constants/__tests__/spells.test.ts lib/utils/rules/__tests__/formulas.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(rules): clarify domain constant ownership`.

### Task 5.4: Завершити локально і перевірити об’єднаний стан після S1

**Files:**

- Test: `lib/utils/rules/__tests__/`, `lib/schemas/__tests__/constructor-fields.test.ts`, `components/rules/__tests__/`, `lib/utils/battle/participant/__tests__/from-character-rules.test.ts`
- Modify: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s5-progress.md`

**Interfaces:**
- Consumes: S5 commits та завершений S1 checkpoint; інтеграцію виконує coordinator.
- Produces: Локальна готовність S5.1–3; після інтеграції — перевірена readiness для S6.

- [ ] **Крок 1.** До завершення S1 виконати tsc/lint власних змін, записати branch/commits/interfaces, не змінювати STATUS/roadmap/README. Статус S5.4=очікує інтеграцію.

- [ ] **Крок 2.** Після інтеграції S1+S5 запустити consumer suites наведеною командою; звірити active-battle frozen rules test через related pipeline tests.

- [ ] **Крок 3.** Downstream replacements із task 3 передати S6/S7/S8 owners; якщо вони потребують зміни payload/defaults — окрема задача, не механічна заміна.

- [ ] **Крок 4.** Зафіксувати combined HEAD і results. Лише тоді позначити S5 повністю завершеним та передати S6.

- [ ] **Перевірка.** `pnpm exec vitest run lib/utils/rules/__tests__ lib/schemas/__tests__/constructor-fields.test.ts components/rules/__tests__ lib/utils/battle/participant/__tests__/from-character-rules.test.ts lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `docs(rules): checkpoint compatibility and parallel handoff`.

## Критерій завершення

S5.1–3 ізольовані від S1; default/patch/formula semantics збережені. Повне завершення S5 потребує consumer verification на інтегрованому HEAD.

## Передача наступній сесії

Оновити `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s5-progress.md` за execution guide. Передати branch/start-end HEAD, виконані task ids, commits, результати перевірок і залишки. Новий контекст читає roadmap, execution guide, цей план і checkpoint попередника.

Наступний залежний план: [S6](2026-10-26-constructor-refactor-s6-character-mechanics.md). Паралельний порядок і залежності визначає execution guide.
