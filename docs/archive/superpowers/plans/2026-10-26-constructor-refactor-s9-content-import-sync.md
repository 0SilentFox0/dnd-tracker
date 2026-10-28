# S9. Content CRUD, compendium import і source sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven execution is available only when separately chosen by the user. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Узгодити content contracts, декомпозувати вкладений compendium resolver і перевірити атомарність імпорту/синхронізації.

**Architecture:** CONTENT_RESOURCES/CONTENT_OPERATIONS і BUNDLE_TABLES лишаються реєстрами-власниками. Feature resolution стає окремим pure module, importer transaction/HMAC/refs і provenance зберігаються.

**Tech Stack:** TypeScript strict, Next.js 16 / React 19, Zod 4, Prisma 6 / PostgreSQL, TanStack Query 5, Vitest 4, pnpm.

**Spec:** [roadmap, S9](2026-10-26-constructor-refactor-roadmap.md#сесії); [спільний контракт виконання](2026-10-26-constructor-refactor-execution-guide.md); чинні subsystem docs у `docs/architecture/`.

**Dependencies:** S3–S8, включно з combined rules/assistant verification.

**Status:** План підготовлено; у цій сесії реалізацію не запускали. Стан паралельних робіт звірити за checkpoint-ами. Базовий HEAD для звірки: `73c5de1a`.

## Global Constraints

- Виконувати спільний контракт execution guide; змінювати тільки файли поточної задачі.
- Зберігати API/MCP ids, payloads, persisted JSON, errors/defaults, HOMM і 5e.
- DB writes тільки на guarded local constructor з перевіркою обох URLs; без secrets у logs.
- Не запускати prod/prodcopy, HOMM gateway, merge/push/deploy; застосовані міграції не редагувати.
- Зберігати scoped transaction, lock order, live auth, atomic write+receipt і idempotent effects.
- Прості extraction перевіряти чинними тестами; нова поведінка/дефект потребує RED→GREEN regression.

## Review Focus

- Однакові schema/resources доступні CRUD/OpenAPI/MCP без розширення scopes — задача 1.
- Однакові feature names з різними parent/source/edition не зливаються — задача 2.
- Duplicate/forbidden keys і bounds зупиняють parse до write — задача 3.
- Підроблений/expired/foreign preview token не дозволяє confirm — задача 4.
- Source змінився після preview або nested write впав — rollback без часткового apply — задача 4.

---

### Task 9.1: Зафіксувати resource contracts і знайти повторну validation

**Files:**

- Read: `lib/server/content/define-resource.ts`, `resources/index.ts`, `resources/operations.ts`, `resources/operation-service.ts`, `resources/service.ts`, `resources/openapi.ts`
- Test: `lib/server/content/__tests__/registry.test.ts`, `lib/server/content/__tests__/openapi.test.ts`, `lib/server/content/__tests__/tool-schemas.test.ts`, `lib/server/content/__tests__/classes-resource.test.ts`, `lib/server/content/__tests__/backgrounds-resource.test.ts`
- Create: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s9-progress.md`

**Interfaces:**
- Consumes: CONTENT_RESOURCES, CONTENT_OPERATIONS, createActionCatalog та route coverage evidence.
- Produces: Content kind→schema→HTTP/OpenAPI/MCP→writer→test matrix без нового registry.

- [ ] **Крок 1.** Звірити всі ContentKind, їх create/update/apiCreate/access/listFields/invalidates, operation ids і scope/sessionOnly; звірити source/compendium handoff exclusions.

- [ ] **Крок 2.** У registry/tool-schema tests перевірити classes/backgrounds/feats і nested ids: create/update validators ті самі, HTTP/MCP не мають другорядної слабшої schema.

- [ ] **Крок 3.** Дубль validation у route/adapters прибирати тільки якщо canonical service виконує той самий check до write. Точні additional files спершу записати в checkpoint.

- [ ] **Крок 4.** Не змінювати часткову per-row семантику content.import на atomic compendium confirm — це різні чинні контракти.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/content/__tests__/registry.test.ts lib/server/content/__tests__/openapi.test.ts lib/server/content/__tests__/tool-schemas.test.ts lib/server/content/__tests__/classes-resource.test.ts lib/server/content/__tests__/backgrounds-resource.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `docs(content): map constructor resource contracts`.

### Task 9.2: Винести nested class/optional feature resolution

**Files:**

- Create: `lib/server/compendium-import/feature-resolution.ts`
- Modify: `lib/server/compendium-import/adapt.ts`, `adapters/shared.ts`
- Test: `lib/server/compendium-import/__tests__/adapters.test.ts`, `lib/server/compendium-import/__tests__/dependencies.test.ts`, `lib/server/compendium-import/__tests__/domain.test.ts`

**Interfaces:**
- Consumes: Чинні inner features/optional/visit functions, AdapterContext, Compendium/JsonRecord, canonicalKey/nestedId.
- Produces: `FeatureResolutionContext = { root: Compendium; editionFallback: unknown; issues: ImportIssue[]; embedded: Record<string, number>; usedOptionals: Set<string> }`; `resolveCompendiumFeatures(raw: unknown, kind: "classFeature" | "subclassFeature", ownerPath: string, context: FeatureResolutionContext): JsonRecord[]`; effectiveEdition helper у shared.ts зі старим re-export з adapt.ts.

- [ ] **Крок 1.** Зафіксувати same-name different parent/source/edition, unresolved/ambiguous UID, optional options count, unused optionals, excluded categories і mergeParent; body/refs/issues/embedded порядок має збігатися.

- [ ] **Крок 2.** Спочатку перенести effectiveEdition без зміни fallback; feature-resolution не імпортує adapt.ts, щоб не утворити цикл.

- [ ] **Крок 3.** Перенести features і closure state в explicit context. Rendered text/manual warnings залишити описом; не генерувати автоматичні mechanics із прози.

- [ ] **Крок 4.** Оптимізувати candidate lookup лише локальним multimap по повній identity; candidates.length!==1 залишається помилкою. Не вибирати перший запис при неоднозначності.

- [ ] **Крок 5.** Canonical/nested ids, source bindings, provenance і importPath не міняти; existing adapter registry лишається єдиним.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/compendium-import/__tests__/adapters.test.ts lib/server/compendium-import/__tests__/dependencies.test.ts lib/server/compendium-import/__tests__/domain.test.ts lib/server/compendium-import/__tests__/plan.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(import): isolate compendium feature resolution`.

### Task 9.3: Перевірити parser і output safety межі

**Files:**

- Test/Modify лише за confirmed regression: `lib/server/compendium-import/parse.ts`, `lib/server/compendium-import/service.ts`, `lib/server/compendium-import/__tests__/parse.test.ts`, `lib/server/compendium-import/__tests__/http.test.ts`, `lib/server/compendium-import/__tests__/presentation.test.ts`
- Read: `lib/server/compendium-import/types.ts`, `lib/ai/tools/projection.ts`

**Interfaces:**
- Consumes: COMPENDIUM_LIMITS, parseCompendium, ImportInputSchema, output renderers.
- Produces: Незмінні `parseCompendium(input: string | Uint8Array): Compendium` і `detectImportFormat(text: string)`; bound/security regression evidence.

- [ ] **Крок 1.** Зафіксувати чинні limits: bytes=3145728, requestBytes=3000000, depth=32, nodes=500000, stringBytes=131072, recordBytes=262144, records=10000, selected=2000, sources=100. Не зливати bytes і requestBytes.

- [ ] **Крок 2.** Додати лише відсутні boundary tests: at limit/one over для size/depth; duplicate keys, __proto__/constructor/prototype; invalid Unicode/NUL; expect CompendiumError з чинним code, repository writer count=0.

- [ ] **Крок 3.** Перевірити HTML/unsafe URLs на чинній presentation boundary; raw parser не перетворювати на sanitizer, який змінює source identity/notes.

- [ ] **Крок 4.** Підтверджений дефект: RED→мінімальний fix→GREEN; решту security hypotheses записати, не підміняти висновком про exploit.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/compendium-import/__tests__/parse.test.ts lib/server/compendium-import/__tests__/http.test.ts lib/server/compendium-import/__tests__/presentation.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `test(import): pin bounded input and output safety`.

### Task 9.4: Перевірити preview/confirm, source sync і rollback

**Files:**

- Read/Modify лише за confirmed defect: `lib/server/compendium-import/service.ts`, `lib/server/compendium-import/repository.ts`, `lib/server/templates/sync/apply.ts`
- Test: `lib/server/compendium-import/__tests__/service.test.ts`, `lib/server/compendium-import/__tests__/repository.integration.test.ts`, `lib/server/compendium-import/__tests__/sync.test.ts`, `lib/server/templates/sync/__tests__/apply.test.ts`, `app/api/__tests__/source-sync-api.test.ts`

**Interfaces:**
- Consumes: HMAC tokenFor/tokenData, repository.transaction, scoped locks, sourceHash/baseline, remapIds.
- Produces: Чинні previewImport/confirmImport/previewSourceSelection/applySourceChanges signatures, atomicity/idempotency evidence.

- [ ] **Крок 1.** Confirm tests: wrong actor/campaign/fingerprint/planHash або invalid signature→відмова до writes; expiry лишається 15хв із чинним порівнянням timestamp; secret length minimum32, token max4096.

- [ ] **Крок 2.** Same idempotency key+same request повертає попередній report без нових writes; інший requestHash→IDEMPOTENCY_CONFLICT.

- [ ] **Крок 3.** Cross-campaign binding/nested ref і source update між preview/confirm→попередні errors/409; failed second nested write rollback-ить first write, provenance, sources і run.

- [ ] **Крок 4.** Перевірити baseline/ignored/credits/dependency closure та NOWAIT behavior без зміни lock order; source apply не переносить ScenarioPage notes як нову можливість.

- [ ] **Крок 5.** Запустити named local integrations тільки після both-URL guard; connection_limit=1, owned fixture cleanup, unchanged migration list.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/compendium-import/__tests__/service.test.ts lib/server/compendium-import/__tests__/sync.test.ts lib/server/templates/sync/__tests__/apply.test.ts app/api/__tests__/source-sync-api.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `test(content): verify import and source-sync atomicity`.

### Task 9.5: Виміряти import/sync і закрити roundtrip

**Files:**

- Test: `lib/server/templates/__tests__/bundle.test.ts`, `lib/server/templates/__tests__/bundle-backgrounds.test.ts`, `lib/server/templates/__tests__/remap-ids.test.ts`, `lib/server/templates/__tests__/assert-no-leak.test.ts`, `lib/server/compendium-import/__tests__/bundle.test.ts`
- Modify: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s9-progress.md`
- Read: `prisma/schema.prisma`, `lib/server/templates/bundle.ts`

**Interfaces:**
- Consumes: Synthetic input fixtures, benchmark protocol S3, stable adapters/service/sync.
- Produces: Export→import→source-update evidence, measured query/CPU/memory results і окремі DDL candidates.

- [ ] **Крок 1.** На synthetic fixtures виконати export/import/remap roundtrip; entity identities/refs/choices/grants/backgrounds та source metadata зберігаються, credentials/чужі дані відсутні.

- [ ] **Крок 2.** Заміряти CPU resolve features і SQL/memory в import/sync на фіксованих small/large datasets; seed/reset поза measured interval.

- [ ] **Крок 3.** Для slow read query отримати локальний EXPLAIN на synthetic data; зафіксувати plan/rows/buffers, не виводити values. Не додавати індекс без окремої DDL-задачі та evidence.

- [ ] **Крок 4.** Порівняти before/after; якщо gain відсутній, не лишати складний lookup/cache. Checkpoint передає S10 resource/security/perf leftovers.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/templates/__tests__/bundle.test.ts lib/server/templates/__tests__/bundle-backgrounds.test.ts lib/server/templates/__tests__/remap-ids.test.ts lib/server/templates/__tests__/assert-no-leak.test.ts lib/server/compendium-import/__tests__/bundle.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `docs(content): checkpoint import and sync refactor`.

## Критерій завершення

Content contracts і roundtrips сумісні, nested feature responsibility виділена, parser/preview/refs/rollback перевірено; DDL не сховано в extraction.

## Передача наступній сесії

Оновити `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s9-progress.md` за execution guide. Передати branch/start-end HEAD, виконані task ids, commits, результати перевірок і залишки. Новий контекст читає roadmap, execution guide, цей план і checkpoint попередника.

Наступний залежний план: [S10](2026-10-26-constructor-refactor-s10-final-review.md). Паралельний порядок і залежності визначає execution guide.
