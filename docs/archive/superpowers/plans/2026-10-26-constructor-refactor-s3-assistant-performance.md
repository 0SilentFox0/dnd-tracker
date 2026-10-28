# S3. Вартість assistant preview і snapshots — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven execution is available only when separately chosen by the user. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Прибрати виміряне зайве читання/обчислення без ослаблення preconditions.

**Architecture:** Full snapshot лишається authoritative guard v1. Спільна JSON normalization та локальні immutable metadata прибирають дублікати; profiler відділено від production paths.

**Tech Stack:** TypeScript strict, Next.js 16 / React 19, Zod 4, Prisma 6 / PostgreSQL, TanStack Query 5, Vitest 4, pnpm.

**Spec:** [roadmap, S3](2026-10-26-constructor-refactor-roadmap.md#сесії); [спільний контракт виконання](2026-10-26-constructor-refactor-execution-guide.md); чинні subsystem docs у `docs/architecture/`.

**Dependencies:** S2; S1 runner доступний із tracked sources.

**Status:** План підготовлено; у цій сесії реалізацію не запускали. Стан паралельних робіт звірити за checkpoint-ами. Базовий HEAD для звірки: `73c5de1a`.

## Global Constraints

- Виконувати спільний контракт execution guide; змінювати тільки файли поточної задачі.
- Зберігати API/MCP ids, payloads, persisted JSON, errors/defaults, HOMM і 5e.
- DB writes тільки на guarded local constructor з перевіркою обох URLs; без secrets у logs.
- Не запускати prod/prodcopy, HOMM gateway, merge/push/deploy; застосовані міграції не редагувати.
- Зберігати scoped transaction, lock order, live auth, atomic write+receipt і idempotent effects.
- Прості extraction перевіряти чинними тестами; нова поведінка/дефект потребує RED→GREEN regression.

## Review Focus

- Стара pending proposal має той самий hash після extraction — задача 2.
- Зміна навіть непрямого dependency між prepare/confirm робить intent stale — задачі 3–4.
- Звичайний unrelated content update теж зберігає нинішню conservative stale behavior — задача 4.
- Delete cascade, nested JSON/name refs і + composite refs не губляться — задача 3.
- Вимірювання не залишає fixtures або приватних payloads — задача 1.

---

### Task 3.1: Побудувати локальний benchmark із контрольованими fixtures

**Files:**

- Create: `scripts/constructor/assistant-benchmark.ts`, `scripts/constructor/assistant-check/benchmark-fixtures.ts`
- Create: `scripts/constructor/assistant-check/__tests__/benchmark-report.test.ts`
- Create: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s3-progress.md`

**Interfaces:**
- Consumes: Both-URL guard S1, current content actions, execution guide measurement protocol.
- Produces: CLI `assistant-benchmark.ts --run --output-dir <dir>`; `BenchmarkSample = { scenario: string; size: "small" | "large"; queryCount: number; resultJsonBytes: number; elapsedMs: number; serializeMs?: number; transactionMs?: number }`.

- [ ] **Крок 1.** Зафіксувати сценарії rules.update, content.spells.update, content.spells.delete та source.apply; synthetic sizes, 5 warmups і 30 samples визначені execution guide.

- [ ] **Крок 2.** Виділити `summarizeSamples(samples: readonly BenchmarkSample[]): { count: number; medianMs: number; p95Ms: number }`; test для elapsedMs=[1,2,3,4,5] очікує count=5, medianMs=3, p95Ms=5 за nearest-rank. Для [] — явна помилка.

- [ ] **Крок 3.** Prisma query events рахувати тільки на owned harness client; reset/fixture seed/migration reads поза measured interval. SQL parameters не логувати. Не приписувати resultJsonBytes значення network bytes.

- [ ] **Крок 4.** Зафіксувати baseline на обох розмірах, зберегти raw samples в ignored output dir, агрегати/версії/HEAD у checkpoint; finally очищує тільки own marker.

- [ ] **Перевірка.** `pnpm exec vitest run scripts/constructor/assistant-check/__tests__/benchmark-report.test.ts lib/server/assistant/__tests__/test-support.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `test(assistant): add guarded preview performance measurements`.

### Task 3.2: Звести JSON normalization без зміни fingerprints

**Files:**

- Create: `lib/server/assistant/json.ts`, `lib/server/assistant/__tests__/json.test.ts`
- Modify: `lib/server/assistant/actions/content-snapshot.ts`, `lib/server/assistant/actions/show.ts`, `lib/server/assistant/actions/handoffs.ts`

**Interfaces:**
- Consumes: Чинні jsonContent/snapshotHash/requestDigest і JSON roundtrip callsites.
- Produces: `jsonContent(value: unknown): Prisma.JsonValue` у json.ts; compatibility re-export jsonContent/snapshotHash з content-snapshot.ts.

- [ ] **Крок 1.** Зафіксувати test `keepsJsonRoundtripAndDigest`: undefined/null→null; Date→ISO; undefined object field зникає; undefined array element→null; вкладені масиви й Unicode зберігаються; BigInt/cycle дають чинну помилку.

- [ ] **Крок 2.** Assert `requestDigest(jsonContent(value))` дорівнює результату старого JSON.parse(JSON.stringify(value ?? null)) на fixture matrix. Не змінювати stableStringify, sort order чи null handling.

- [ ] **Крок 3.** Винести jsonContent в server-only module, перевести семантично сумісні callsites, зберегти старі exports для tests/imports; для іншої undefined semantics лишити локальний adapter.

- [ ] **Крок 4.** Підготувати legacy intent до extraction, підтвердити після extraction без повторного preview; це перевіряє persisted hash compatibility.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__/json.test.ts lib/server/assistant/__tests__/content-actions.test.ts lib/server/assistant/__tests__/content-operations.test.ts lib/server/assistant/__tests__/show-actions.test.ts lib/server/assistant/__tests__/handoffs.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(assistant): share compatible JSON normalization`.

### Task 3.3: Оптимізувати dependency/cascade traversal у межах одного snapshot

**Files:**

- Modify: `lib/server/assistant/actions/content-dependencies.ts`
- Create: `lib/server/assistant/__tests__/content-dependencies.test.ts`
- Read: `lib/server/templates/bundle.ts`, `lib/server/templates/remap-ids.ts`

**Interfaces:**
- Consumes: Full state shape та Prisma.dmmf FK metadata; чинні contentDependencies/contentDeleteCascades.
- Produces: Незмінні `contentDependencies(state: unknown, kind: string, id: string | undefined, body: unknown)` та `contentDeleteCascades(state: unknown, kind: string, ids: readonly string[]): FieldChange[]`.

- [ ] **Крок 1.** На synthetic state зафіксувати порядок/повноту результатів: FK SetNull/Cascade/Restrict, spell-groups alias, nested choice refs, name refs і composite strings через +; порівняння deep equality до/після.

- [ ] **Крок 2.** За результатом task 1 прибрати повторне сканування immutable Prisma relation metadata: module-local relation lookup за target model, без кешування campaign rows чи hashes.

- [ ] **Крок 3.** У contentDependencies винести [...ids] за межі row predicate або збудувати одноопераційний Set lookup; collectKeysAndStrings та правила split("+") лишити сумісними.

- [ ] **Крок 4.** Не використовувати global memoization state, не змінювати lock/query order. Якщо CPU виграш не підтверджено, залишити characterization і простіший алгоритм.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__/content-dependencies.test.ts lib/server/assistant/__tests__/content-actions.test.ts lib/server/assistant/__tests__/content-operations.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `perf(assistant): reduce repeated dependency metadata traversal`.

### Task 3.4: Перевірити concurrency і визначити межу подальшої SQL-оптимізації

**Files:**

- Read: `lib/server/assistant/actions/content-snapshot.ts`, `lib/server/assistant/actions/content-operations.ts`, `lib/server/content/write-context.ts`
- Test: `lib/server/assistant/__tests__/content-storage.integration.test.ts`, `lib/server/assistant/__tests__/execution.integration.test.ts`
- Modify: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s3-progress.md`

**Interfaces:**
- Consumes: Benchmark task 1 та незмінний full-state hash contract.
- Produces: Before/after report; список доведених безпечних оптимізацій і відкладених змін precondition protocol.

- [ ] **Крок 1.** Зафіксувати tests `nestedRefEditMakesPreviewStale`, `unrelatedContentEditKeepsConservativeStale`, `deleteCascadeRollsBackOnConflict`: changed refs/unrelated row→409, domain writes=0, без часткового delete.

- [ ] **Крок 2.** Запустити guarded local suite з одним connection та repeated confirm; звірити hashes старих pending intents.

- [ ] **Крок 3.** Повторити benchmark і порівняти samples/queries/serialization. Скорочувати SQL select можна тільки зі збереженням повного hash input і visible preview; інакше записати як окрему future protocol/versioning задачу.

- [ ] **Крок 4.** Не вводити scoped-v2, payload flag чи grace-window як приховану зміну контракту. Додати до checkpoint кандидатів S4/S9 з measurement evidence.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__/content-actions.test.ts lib/server/assistant/__tests__/content-operations.test.ts lib/server/assistant/__tests__/content-effects.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `docs(assistant): record preview performance and guard compatibility`.

## Критерій завершення

Є повторюваний benchmark, сумісні fingerprints і ref/cascade regression evidence; зменшення вартості заявлене лише за виміряними метриками.

## Передача наступній сесії

Оновити `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s3-progress.md` за execution guide. Передати branch/start-end HEAD, виконані task ids, commits, результати перевірок і залишки. Новий контекст читає roadmap, execution guide, цей план і checkpoint попередника.

Наступний залежний план: [S4](2026-10-26-constructor-refactor-s4-assistant-adapters.md). Паралельний порядок і залежності визначає execution guide.
