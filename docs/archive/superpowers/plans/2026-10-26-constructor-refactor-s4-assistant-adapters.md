# S4. Assistant adapters, handoffs і run recovery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven execution is available only when separately chosen by the user. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Розділити навігацію/compendium reads та спростити adapters без другого domain writer.

**Architecture:** handoffs.ts стає composition/compatibility facade. Navigation і compendium projections мають окремі server-only modules; runs залишає public store interface.

**Tech Stack:** TypeScript strict, Next.js 16 / React 19, Zod 4, Prisma 6 / PostgreSQL, TanStack Query 5, Vitest 4, pnpm.

**Spec:** [roadmap, S4](2026-10-26-constructor-refactor-roadmap.md#сесії); [спільний контракт виконання](2026-10-26-constructor-refactor-execution-guide.md); чинні subsystem docs у `docs/architecture/`.

**Dependencies:** S2–S3. Не змінювати executor interfaces або hashes із попередніх планів.

**Status:** План підготовлено; у цій сесії реалізацію не запускали. Стан паралельних робіт звірити за checkpoint-ами. Базовий HEAD для звірки: `73c5de1a`.

## Global Constraints

- Виконувати спільний контракт execution guide; змінювати тільки файли поточної задачі.
- Зберігати API/MCP ids, payloads, persisted JSON, errors/defaults, HOMM і 5e.
- DB writes тільки на guarded local constructor з перевіркою обох URLs; без secrets у logs.
- Не запускати prod/prodcopy, HOMM gateway, merge/push/deploy; застосовані міграції не редагувати.
- Зберігати scoped transaction, lock order, live auth, atomic write+receipt і idempotent effects.
- Прості extraction перевіряти чинними тестами; нова поведінка/дефект потребує RED→GREEN regression.

## Review Focus

- MCP не отримує session-only compendium notes — задача 2.
- Foreign deckId/unsafe href не відкриває доступ і не запускає mutation — задача 1.
- Порожній recovery list повертає порожні intents/receipts — задача 3.
- Stop не відкочує commit і не створює duplicate usage/message — задача 3.
- Legacy/canonical action catalog зберігає ids/scopes/results — задача 4.

---

### Task 4.1: Відокремити navigation handoffs

**Files:**

- Create: `lib/server/assistant/actions/handoff-navigation.ts`
- Modify: `lib/server/assistant/actions/handoffs.ts`
- Test: `lib/server/assistant/__tests__/handoffs.test.ts`
- Read: `lib/schemas/assistant-handoff.ts`

**Interfaces:**
- Consumes: HANDOFF_INPUTS і buildAssistantHandoff; існуючий href validator.
- Produces: HANDOFF_INPUTS і `buildAssistantHandoff(actor: Actor, kind: string, target?: unknown): HandoffResult` у navigation module; старі exports re-export із handoffs.ts.

- [ ] **Крок 1.** Зафіксувати всі нинішні kind→href/reason pairs у existing table tests; невідомий kind/invalid id відхиляються чинними errors.

- [ ] **Крок 2.** Перенести тільки inputs/reasons/build function; зберегти sessionOnly metadata у composition layer.

- [ ] **Крок 3.** Перевірити foreign deck/campaign id, absolute URL і encoded path injection через нинішні validators; opening handoff не робить POST/confirm/provider calls.

- [ ] **Крок 4.** Знайти imports через rg і лишити compatibility exports, щоб context/tools не потребували синхронного переписування.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__/handoffs.test.ts components/ai/__tests__/AssistantHandoff.test.tsx`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(assistant): separate navigation handoffs`.

### Task 4.2: Відокремити compendium read projections

**Files:**

- Create: `lib/server/assistant/actions/compendium-reads.ts`
- Modify: `lib/server/assistant/actions/handoffs.ts`, `lib/ai/context/prompt.ts`
- Test: `lib/server/assistant/__tests__/handoffs.test.ts`, `lib/ai/context/__tests__/assistant-context.test.ts`

**Interfaces:**
- Consumes: COMPENDIUM_READ_INPUTS, readCompendiumSummary, jsonContent S3, existing repository authorization.
- Produces: `CompendiumRead = keyof typeof COMPENDIUM_READ_INPUTS`; `readCompendiumSummary(actor: Actor, operation: CompendiumRead, raw: unknown): Promise<ActionResult>` у compendium-reads.ts; старий re-export лишається.

- [ ] **Крок 1.** Перенести schemas/projection-specific safeText і reader; зберегти explicit membership check і repository.authorize.

- [ ] **Крок 2.** Перевірити selectedKeys 1..5, duplicates, pagination defaults/max20, чужий targetId, unselected source notes: нема raw JSON/source notes у загальному reports/options.

- [ ] **Крок 3.** Зберегти різницю safeText і publicToolData: не замінювати два sanitizer-и одним лише через схожість. Test signed URL/Bearer/provider-key masking і output length.

- [ ] **Крок 4.** Оновити prompt.ts import на compendium reader, лишити composition handoffs.ts без DB read implementation.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__/handoffs.test.ts lib/ai/context/__tests__/assistant-context.test.ts app/api/__tests__/assistant-context-api.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(assistant): isolate bounded compendium reads`.

### Task 4.3: Звузити recovery selects без зміни run lease semantics

**Files:**

- Modify: `lib/server/assistant/runs.ts`
- Test: `lib/ai/chat/__tests__/assistant-run.test.ts`, `lib/server/assistant/__tests__/runs-storage.integration.test.ts`, `app/api/__tests__/assistant-run-api.test.ts`

**Interfaces:**
- Consumes: createAssistantRunStore, RUN_GRACE_MS S2, publicToolData та trusted request key.
- Produces: Незмінні beginAssistantRun/recordAssistantRunUsage/finishAssistantRun/readAssistantRuns/cancelAssistantRun; current run result DTO.

- [ ] **Крок 1.** Додати/звірити `emptyRunHistoryHasNoIntentsOrReceipts`: own thread без runs повертає {runs:[],receipts:[],intents:[]}; не запитувати broader owner history через випадковий OR omission.

- [ ] **Крок 2.** Профілювати recovery list; застосувати явні select тільки для фактично використаних fields і зберегти 30 runs/100 receipts/100 intents, порядок і ownership.

- [ ] **Крок 3.** Зберегти lease deadline270s+grace30s, resultRefs terminal mapping, same requestId hash conflict, one user message per run; unresolved unknown не звільняє claim.

- [ ] **Крок 4.** Перевірити usage null/partial при crash, cancel під час model/tool, committed receipt recovery без resend. Paid/provider calls у unit mocked.

- [ ] **Перевірка.** `pnpm exec vitest run lib/ai/chat/__tests__/assistant-run.test.ts app/api/__tests__/assistant-run-api.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(assistant): narrow run recovery reads`.

### Task 4.4: Звірити adapters із canonical writers і transport catalog

**Files:**

- Read: `lib/server/assistant/action-definitions.ts`, `actions/characters.ts`, `actions/character-progression.ts`, `actions/battle-actions.ts`, `actions/scenario.ts`, `actions/show.ts`
- Test: `lib/server/assistant/__tests__/transport-catalog.test.ts`, `lib/server/assistant/__tests__/coverage.test.ts`, `lib/server/assistant/__tests__/character-actions.test.ts`, `lib/server/assistant/__tests__/character-progression-actions.test.ts`, `lib/server/assistant/__tests__/battle-actions.test.ts`, `lib/server/assistant/__tests__/scenario-actions.test.ts`, `lib/server/assistant/__tests__/show-actions.test.ts`
- Create: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s4-progress.md`

**Interfaces:**
- Consumes: Canonical domain services і catalog S1 inventory.
- Produces: Action→writer→scope→transport→tests matrix та scoped adapter cleanup.

- [ ] **Крок 1.** Побудувати matrix за реальними execute functions; catalog/coverage row сама по собі не є доказом domain implementation.

- [ ] **Крок 2.** Для кожного family перевірити prepare read-only та execute canonical writer раз; прибирати дублікати mapper/validation тільки в конкретних названих adapters після baseline.

- [ ] **Крок 3.** Порівняти ids, need/sessionOnly/confirmation і result envelope до/після; запустити transport tests і guarded handoff/runs integration для змінених storage paths.

- [ ] **Крок 4.** Зберегти checkpoint із результатами та ownership нових module exports; на S8 передати keyless review/Stop/recovery UI contracts.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__/transport-catalog.test.ts lib/server/assistant/__tests__/coverage.test.ts lib/server/assistant/__tests__/character-actions.test.ts lib/server/assistant/__tests__/character-progression-actions.test.ts lib/server/assistant/__tests__/battle-actions.test.ts lib/server/assistant/__tests__/scenario-actions.test.ts lib/server/assistant/__tests__/show-actions.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `docs(assistant): record adapter and transport contracts`.

## Критерій завершення

Navigation/projections розділено, action catalog і recovery DTO сумісні, privacy/sessionOnly boundary підтверджені тестами.

## Передача наступній сесії

Оновити `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s4-progress.md` за execution guide. Передати branch/start-end HEAD, виконані task ids, commits, результати перевірок і залишки. Новий контекст читає roadmap, execution guide, цей план і checkpoint попередника.

Наступний залежний план: [S5](2026-10-26-constructor-refactor-s5-rules-constants.md). Паралельний порядок і залежності визначає execution guide.
