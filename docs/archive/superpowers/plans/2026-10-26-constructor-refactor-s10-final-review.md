# S10. Фінальна регресія, security review і handoff — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven execution is available only when separately chosen by the user. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевірити об’єднаний результат S1–S9 і зафіксувати фактичні гарантії та залишки.

**Architecture:** Фінальна сесія перевіряє серію на одному integrated HEAD. Дефекти виправляються точково з regression evidence; performance і security висновки прив’язані до відтворюваних даних.

**Tech Stack:** TypeScript strict, Next.js 16 / React 19, Zod 4, Prisma 6 / PostgreSQL, TanStack Query 5, Vitest 4, pnpm.

**Spec:** [roadmap, S10](2026-10-26-constructor-refactor-roadmap.md#сесії); [спільний контракт виконання](2026-10-26-constructor-refactor-execution-guide.md); чинні subsystem docs у `docs/architecture/`.

**Dependencies:** Усі S1–S9 реалізовано та інтегровано coordinator-ом; немає незавершеної S5.4.

**Status:** Виконано локально; фактичні commands, commits, незалежний review і межі — у [S10 checkpoint](2026-10-26-constructor-refactor-s10-progress.md). Series base: `73c5de1a`.

## Global Constraints

- Виконувати спільний контракт execution guide; змінювати тільки файли поточної задачі.
- Зберігати API/MCP ids, payloads, persisted JSON, errors/defaults, HOMM і 5e.
- DB writes тільки на guarded local constructor з перевіркою обох URLs; без secrets у logs.
- Не запускати prod/prodcopy, HOMM gateway, merge/push/deploy; застосовані міграції не редагувати.
- Зберігати scoped transaction, lock order, live auth, atomic write+receipt і idempotent effects.
- Прості extraction перевіряти чинними тестами; нова поведінка/дефект потребує RED→GREEN regression.

## Review Focus

- Перевірки різних branches не підміняють перевірку integrated HEAD — задача 1.
- Legacy intents/receipts/snapshots і exports лишаються читабельними — задача 2.
- Unknown external/failed effects не провокують повторну оплату — задача 2.
- Skipped browser/DB/provider checks видимі як обмеження доказів — задача 3.
- Погіршення великого fixture не приховано загальним середнім — задача 4.

## Вхідні findings для S10

За дорученням від 2026-10-27 всі відкриті findings S9.1–S9.4 та межі evidence передано в [реєстр S10](2026-10-27-constructor-refactor-s10-findings.md). Кожен рядок потребує disposition у S10.1–S10.4: виконана перевірка/fix із evidence або явне відкладення з owner/причиною. Реєстр також посилається на залишки інших доступних checkpoints; S4 artifacts та інтеграцію підтверджено в S10 checkpoint.

S9.3–S9.4 вже входять у `feat/constructor` через commits `a818f829`, `e5e1c435`, `55b93d7f`; додаткового merge для них немає. Це не закриває S9.5 чи інші залежності S10. Це історичний intake; актуальне виконання S10 наведено в checkpoint.

---

### Task 10.1: Звірити інтеграцію й повний diff серії

**Files:**

- Read: усі S1–S9 progress files і `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-execution-guide.md`
- Create: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s10-progress.md`

**Interfaces:**
- Consumes: Series start HEAD, integrated end HEAD, per-task commits/checkpoints.
- Produces: Manifest серії: task→commit→files→tests→remaining findings.

- [x] **Крок 1.** Перевірити branch/status, common base і присутність усіх commits без duplicated cherry-picks. Чужі незакомічені зміни не включати до серії.

- [x] **Крок 2.** Переглянути diff від зафіксованого series base, окремо integration/merge changes; переконатися, що немає gameplay/contract/DDL/dependency upgrades поза описаним scope.

- [x] **Крок 3.** Для кожного roadmap requirement указати task/evidence; S5 parallel local-pass не вважати combined-pass без S5.4.

- [x] **Крок 4.** Перевірити ignored outputs, fixture/process cleanup, generated assets/secrets у Git diff. До перевірок записати exact integrated HEAD.

- [x] **Перевірка.** `git diff --check`. Очікування: exit 0; manifest містить S1–S9 coverage і точний combined HEAD.

### Task 10.2: Повторити security і compatibility checks на integrated HEAD

**Files:**

- Test: `lib/server/assistant/__tests__/authorize.test.ts`, `lib/server/assistant/__tests__/execute.test.ts`, `lib/server/assistant/__tests__/cleanup.test.ts`, `lib/server/assistant/__tests__/handoffs.test.ts`, `lib/server/assistant/__tests__/transport-catalog.test.ts`
- Test: `lib/ai/context/__tests__/assistant-context.test.ts`, `app/api/__tests__/assistant-intents-api.test.ts`, `app/api/__tests__/assistant-mcp.test.ts`, `lib/server/compendium-import/__tests__/service.test.ts`, `lib/server/compendium-import/__tests__/parse.test.ts`
- Modify: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s10-progress.md`

**Interfaces:**
- Consumes: S1 security matrix, legacy fixtures, S2/S3 hashes та S9 preview/ref contracts.
- Produces: Updated security matrix із confirmed findings disposition на одному HEAD.

- [x] **Крок 1.** Перевірити identity/campaign/scopes/sessionOnly/CSRF/rate/body limits для всіх entrypoints; policy auto не дозволяє dangerous/paid operation без чинного human approval.

- [x] **Крок 2.** Перевірити legacy persisted JSON, pending hash, action ids, error/status, token revoke, author-only tombstone, retention stale та unknown/incomplete effects.

- [x] **Крок 3.** Перевірити selected source notes/privacy/signed URL і HMAC confirm ownership/freshness, parser bounds; matrix row посилається на конкретний executed test.

- [x] **Крок 4.** Confirmed blocker: RED regression у domain owner → мінімальний fix → affected suite; оновити diff і results. Hypotheses не видавати за знайдені vulnerabilities.

- [x] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__/authorize.test.ts lib/server/assistant/__tests__/execute.test.ts lib/server/assistant/__tests__/cleanup.test.ts lib/server/assistant/__tests__/handoffs.test.ts lib/server/assistant/__tests__/transport-catalog.test.ts lib/ai/context/__tests__/assistant-context.test.ts app/api/__tests__/assistant-intents-api.test.ts app/api/__tests__/assistant-mcp.test.ts lib/server/compendium-import/__tests__/service.test.ts lib/server/compendium-import/__tests__/parse.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `test(constructor): close final refactor regressions`.

### Task 10.3: Виконати фінальні unit/type/lint/build, DB і browser перевірки

**Files:**

- Read/Execute: `package.json`, `scripts/constructor/assistant-check.ts`, named local integration suites змінених DB domains
- Modify: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s10-progress.md`

**Interfaces:**
- Consumes: Stable final source state і tracked harness S1.
- Produces: Фактичні command/exit/passed/skipped/build/browser/local DB results.

- [x] **Крок 1.** Запустити один раз `pnpm test:run`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`, `git diff --check`; читати повні результати й не зупинятися після першої зеленої команди.

- [x] **Крок 2.** Запустити S1 guarded assistant-check --run та named integrations для S6/S9 storage changes з connection_limit=1. Не запускати загальний integration config без file filter.

- [x] **Крок 3.** Browser 1440/390: assistant review/auto/Stop/recovery, class/background choices, rules, spell/attack flow. Писати тільки фактично виконані cases; synthetic HTTP не є доказом реальних DB writes.

- [x] **Крок 4.** Якщо новий fix змінює code після перевірки — повторити affected checks; full suite повторювати тільки коли зміна/ризик це виправдовує. Не посилатися на результати іншого HEAD.

- [x] **Крок 5.** Непрогнані provider/Storage/Pusher/Redis/live paid flows записати як межі evidence. Немає production або HOMM gateway claims.

- [x] **Перевірка.** `git diff --check`. Очікування: exit 0; усі п’ять named final commands і додаткові перевірки мають записаний фактичний результат.

### Task 10.4: Зіставити продуктивність і завершити документацію

**Files:**

- Modify: `docs/architecture/ai.md`, `docs/architecture/battle.md`, `docs/architecture/abilities.md`, `docs/architecture/characters.md`, `docs/architecture/content-api.md`, `docs/STATUS.md`, `docs/archive/superpowers/constructor-handoff.md`
- Modify: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-roadmap.md`, `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s10-progress.md`

**Interfaces:**
- Consumes: Baseline/final raw samples S3/S6/S7/S8/S9 та completed security/regression evidence.
- Produces: Final report із порівнянням метрик, актуальними module owners і явним backlog.

- [x] **Крок 1.** Повторити benchmark на тому самому fixture/environment/warmup protocol; подати small/large окремо, query/serialization/time/refetch/render metrics з джерелами.

- [x] **Крок 2.** Відсутня метрика/невідтворений baseline→unavailable. Не заявляти скорочення network egress за resultJsonBytes або lock improvement за wall time.

- [x] **Крок 3.** Оновити architecture imports/module owners і STATUS/handoff так, щоб не було суперечливих старих checkpoint statuses. Історичні обмеження зберегти як history, current summary — один.

- [x] **Крок 4.** Залишки: severity, file/сценарій, reproducer/evidence, owner/next action. Окремо вказати майбутній HOMM gateway та module migration epic.

- [x] **Крок 5.** Фінальна відповідь: що змінено, як перевірено, виміряний результат, що не перевірено. Закриття серії не означає merge/deploy.

- [x] **Перевірка.** `git diff --check`. Очікування: exit 0; всі links resolve, docs/status/performance statements відповідають записаним evidence.

- [x] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `docs(constructor): finalize refactor evidence and handoff`.

## Критерій завершення

На одному integrated HEAD немає неврахованих blockers, перевірки й measurements свіжі/відтворювані, docs узгоджені; rollout лишається окремим завданням.

## Передача наступній сесії

Оновити `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s10-progress.md` за execution guide. Передати branch/start-end HEAD, виконані task ids, commits, результати перевірок і залишки. Новий контекст читає roadmap, execution guide, цей план і checkpoint попередника.
