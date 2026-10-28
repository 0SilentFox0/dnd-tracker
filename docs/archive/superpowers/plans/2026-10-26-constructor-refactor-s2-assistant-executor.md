# S2. Assistant executor, стани та константи — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven execution is available only when separately chosen by the user. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Спростити execution orchestration, зберігши transaction/replay/recovery behavior.

**Architecture:** execute.ts лишається public facade. Внутрішні transaction outcome та effects/external continuation отримують окремі модулі; shared limits і persisted envelope мають одного власника.

**Tech Stack:** TypeScript strict, Next.js 16 / React 19, Zod 4, Prisma 6 / PostgreSQL, TanStack Query 5, Vitest 4, pnpm.

**Spec:** [roadmap, S2](2026-10-26-constructor-refactor-roadmap.md#сесії); [спільний контракт виконання](2026-10-26-constructor-refactor-execution-guide.md); чинні subsystem docs у `docs/architecture/`.

**Dependencies:** S1 завершено; підтверджені security fixes інтегровані. Не є другою паралельною сесією.

**Status:** Завершено та інтегровано в `feat/constructor` 2026-10-27. Start HEAD `0fd56e76`; end code/test HEAD `7183b7ef`; merge commit зафіксовано в Git. Evidence: [S2 checkpoint](2026-10-26-constructor-refactor-s2-progress.md). Наступна задача — S3.1.

## Global Constraints

- Виконувати спільний контракт execution guide; змінювати тільки файли поточної задачі.
- Зберігати API/MCP ids, payloads, persisted JSON, errors/defaults, HOMM і 5e.
- DB writes тільки на guarded local constructor з перевіркою обох URLs; без secrets у logs.
- Не запускати prod/prodcopy, HOMM gateway, merge/push/deploy; застосовані міграції не редагувати.
- Зберігати scoped transaction, lock order, live auth, atomic write+receipt і idempotent effects.
- Прості extraction перевіряти чинними тестами; нова поведінка/дефект потребує RED→GREEN regression.

## Review Focus

- Legacy receipt JSON без external читається як раніше — задача 1.
- Дві confirm, revoke і expired/stale intent не допускають повторного write — задача 2.
- Платна external operation не повторюється при unknown/crash — задача 3.
- After-commit failure не скасовує успішний domain commit — задача 3.
- Terminal stale не випадає з retention allowlists — задача 1.

---

### Task 2.1: Виділити limits/statuses та typed envelope

**Files:**

- Create: `lib/constants/assistant.ts`, `lib/server/assistant/execution-state.ts`
- Modify: `lib/server/assistant/execute.ts`, `lib/server/assistant/intent-store.ts`, `lib/server/assistant/runs.ts`, `lib/server/assistant/cleanup.ts`, `lib/server/assistant/types.ts`, `lib/server/assistant/receipts.ts`, `lib/schemas/assistant.ts`
- Create: `lib/server/assistant/__tests__/execution-state.test.ts`
- Test: `lib/server/assistant/__tests__/cleanup.test.ts`, `lib/server/assistant/__tests__/intent-store.test.ts`

**Interfaces:**
- Consumes: receiptEffectsSchema, AI_LIMITS.requestDeadlineMs, IntentStatus та persisted row formats.
- Produces: ASSISTANT_LIMITS, ASSISTANT_INTENT_STATUSES, ASSISTANT_EFFECT_STATUSES; `externalRun(expected: JsonValue): string | undefined`, `actionExpected(expected: JsonValue): JsonValue`, `readExternalState(value: unknown): { phase: "started" | "result"; runId: string; result?: JsonValue } | undefined`.

- [x] **Крок 1.** Зафіксувати значення: intentTtlMs=900000, maxPayloadBytes=3000000, transactionTimeoutMs=30000, transactionMaxWaitMs=5000, runGraceMs=30000, intentRedactionDays=7, receiptRetentionDays=90; external deadline брати з AI_LIMITS.requestDeadlineMs=270000.

- [x] **Крок 2.** В execution-state test перевірити `readExternalState({items:[],completed:[]}) === undefined`, валідні started/result з result:null, null/malformed input без небезпечного cast; помилка parsing не запускає external call.

Контрактні assertions для нового `execution-state.test.ts`:

```ts
expect(externalRun({ assistantExternalRun: "run-1", action: null })).toBe("run-1");
expect(actionExpected({ assistantExternalRun: "run-1", action: null })).toBeNull();
expect(actionExpected({ snapshot: "existing-hash" })).toEqual({ snapshot: "existing-hash" });
expect(readExternalState({ items: [], completed: [] })).toBeUndefined();
expect(readExternalState({
  items: [], completed: [],
  external: { phase: "result", runId: "run-1", result: null },
})).toEqual({ phase: "result", runId: "run-1", result: null });
```

- [x] **Крок 3.** Перенести helpers з executor; для persisted envelopes використовувати чинну Zod boundary. Intent/receipt/run terminal groups не зливати в один набір.

- [x] **Крок 4.** Використати константи в поточних owners, лишити RUN_GRACE_MS як compatibility re-export; зберегти JSON null semantics і попередні errors для supported rows.

- [x] **Крок 5.** У cleanup tests перевірити stale у двох allowlists і виключення unknown/executing/incomplete effects; TTL/retention threshold values рівні старим.

- [x] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__/execution-state.test.ts lib/server/assistant/__tests__/cleanup.test.ts lib/server/assistant/__tests__/intent-store.test.ts lib/server/assistant/__tests__/execute.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(assistant): centralize execution limits and envelope parsing`.

### Task 2.2: Винести транзакційну частину execution

**Files:**

- Create: `lib/server/assistant/executor-deps.ts`, `lib/server/assistant/execution-transaction.ts`
- Modify: `lib/server/assistant/execute.ts`
- Test: `lib/server/assistant/__tests__/execute.test.ts`, `lib/server/assistant/__tests__/execution.integration.test.ts`

**Interfaces:**
- Consumes: Helper-и task 1, createActionCatalog, scoped DB context і нинішній createAssistantExecutor options.
- Produces: `ExecutorDeps = { db: PrismaClient; catalog: ReturnType<typeof createActionCatalog>; now: () => Date; effects: EffectHandlers }`; `executeIntentTransaction(deps: ExecutorDeps, caller: AssistantCaller, intentId: string, human: boolean, callbacks: Array<() => void>, signal?: AbortSignal): Promise<IntentTransactionOutcome>`.

- [x] **Крок 1.** Визначити discriminated outcome у execution-transaction.ts: receipt `{kind:"receipt",receipt:AssistantReceipt,effects?:DurableEffect[]}`, external `{kind:"external",receipt:AssistantReceipt,action:AssistantWriteAction,input:unknown}`, conflict `{kind:"conflict",error:ContentError}`; exports цих типів не виходять у client.

- [x] **Крок 2.** Перенести поточне $transaction тіло без зміни query/lock order: campaigns → assistant_intents → membership → origin token. Зберегти repeated reads, fresh prepare, stale handling, campaign-delete cascade branch.

- [x] **Крок 3.** Передавати один tx через runContentWriteContext; callbacks лишаються в масиві facade, timeout/maxWait беруться з task 1. Не починати external або effects під lock.

- [x] **Крок 4.** Перевірити concurrent confirm → один receipt/domain update; prepare 404/409 → stale і нуль часткових writes; revoked origin token → відмова. Використати existing regression tests, додати лише відсутній case.

У real-PostgreSQL regression два `confirmIntent` виклики мають завершитися з однаковим receipt id; після них count receipts для intent дорівнює `1`, domain update застосовано `1` раз. Для revoked token перевірити відсутність змін domain row і нового applied receipt. Ці assertions належать `execution.integration.test.ts`; unit mock не замінює перевірку locks.

- [x] **Крок 5.** Звірити diff public createAssistantExecutor injection/defaults та всі callsites; поведінка confirm/reject/status незмінна.

- [x] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__/execute.test.ts lib/server/assistant/__tests__/authorize.test.ts lib/server/assistant/__tests__/battle-pipeline.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(assistant): isolate atomic intent execution`.

### Task 2.3: Винести external continuation та settlement effects

**Files:**

- Create: `lib/server/assistant/execution-effects.ts`
- Modify: `lib/server/assistant/execute.ts`
- Test: `lib/server/assistant/__tests__/execute.test.ts`, `lib/server/assistant/__tests__/effects.test.ts`, `lib/server/assistant/__tests__/runtime-effects.test.ts`, `lib/server/assistant/__tests__/execution.integration.test.ts`

**Interfaces:**
- Consumes: IntentTransactionOutcome та ExecutorDeps задачі 2; runDurableEffects, readReceipt.
- Produces: `completeIntentOutcome(deps: ExecutorDeps, caller: AssistantCaller, intentId: string, outcome: IntentTransactionOutcome, callbacks: Array<() => void>, resume: () => Promise<ReceiptDto>, signal?: AbortSignal): Promise<ReceiptDto>`.

- [x] **Крок 1.** Перенести external invocation/result persistence і after-commit handling у helper; resume передавати callback-ом, без import facade і циклу.

- [x] **Крок 2.** Зберегти claim-before-external, deadline/abort signal, started→result durable mapping, unknown outcome без retry; callback order та deterministic effect keys не змінювати.

- [x] **Крок 3.** Перевірити crash після external result до finalize, після effect delivery до receipt update; retry використовує той самий key, domain write/payment не повторюється.

- [x] **Крок 4.** Перевірити callback throw: persisted domain commit лишається applied, effectsStatus відображає нинішній unknown/failed contract; reconcile не повторює external.

- [x] **Крок 5.** Залишити dispatch/confirm/reject/reconcile exports у facade; не вводити другий executor instance для continuation.

- [x] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__/execute.test.ts lib/server/assistant/__tests__/effects.test.ts lib/server/assistant/__tests__/runtime-effects.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(assistant): separate external execution and settlement`.

### Task 2.4: Підтвердити сумісність executor після extraction

**Files:**

- Test: `lib/server/assistant/__tests__/execution.integration.test.ts`, `lib/server/assistant/__tests__/runs-storage.integration.test.ts`, `app/api/__tests__/assistant-intents-api.test.ts`, `app/api/__tests__/assistant-run-api.test.ts`
- Create: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s2-progress.md`

**Interfaces:**
- Consumes: Tracked runner S1 і нові internal boundaries S2.
- Produces: Checkpoint із lock/state diagram у тексті та сумісними public signatures.

- [x] **Крок 1.** Запустити unit/API suites та guarded local integration files з connection_limit=1; зафіксувати passed/skipped, cleanup та migration list.

- [x] **Крок 2.** Перевірити старі pending intent/receipt fixtures і deletion tombstone; `confirmIntent(actor,id)` та dispatchAction result envelope незмінні.

- [x] **Крок 3.** Виконати tsc/lint changed files/diff check. Записати модуль-власник кожного state transition і точний наступний task S3.1.

- [x] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__ app/api/__tests__/assistant-intents-api.test.ts app/api/__tests__/assistant-run-api.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `docs(assistant): checkpoint executor refactor contracts`.

## Критерій завершення

Єдиний public facade, typed internal outcomes, ті самі persisted formats/locks і свіжі concurrency/recovery integration results.

## Передача наступній сесії

Оновити `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s2-progress.md` за execution guide. Передати branch/start-end HEAD, виконані task ids, commits, результати перевірок і залишки. Новий контекст читає roadmap, execution guide, цей план і checkpoint попередника.

Наступний залежний план: [S3](2026-10-26-constructor-refactor-s3-assistant-performance.md). Паралельний порядок і залежності визначає execution guide.
