# S1. Baseline, відтворюваність і security audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven execution is available only when separately chosen by the user. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Отримати відтворюваний assistant check і перевірений список ризиків до структурних змін.

**Architecture:** Чинний CLI лишається точкою входу. Browser source files переходять у scripts/constructor/assistant-check/, outputs відокремлюються від sources; domain writers не змінюються без окремого підтвердженого дефекту.

**Tech Stack:** TypeScript strict, Next.js 16 / React 19, Zod 4, Prisma 6 / PostgreSQL, TanStack Query 5, Vitest 4, pnpm.

**Spec:** [roadmap, S1](2026-10-26-constructor-refactor-roadmap.md#сесії); [спільний контракт виконання](2026-10-26-constructor-refactor-execution-guide.md); чинні subsystem docs у `docs/architecture/`.

**Dependencies:** Немає. Може виконуватися паралельно із S5.1–S5.3; див. execution guide.

**Status:** План підготовлено; у цій сесії реалізацію не запускали. Стан паралельних робіт звірити за checkpoint-ами. Базовий HEAD для звірки: `73c5de1a`.

## Global Constraints

- Виконувати спільний контракт execution guide; змінювати тільки файли поточної задачі.
- Зберігати API/MCP ids, payloads, persisted JSON, errors/defaults, HOMM і 5e.
- DB writes тільки на guarded local constructor з перевіркою обох URLs; без secrets у logs.
- Не запускати prod/prodcopy, HOMM gateway, merge/push/deploy; застосовані міграції не редагувати.
- Зберігати scoped transaction, lock order, live auth, atomic write+receipt і idempotent effects.
- Прості extraction перевіряти чинними тестами; нова поведінка/дефект потребує RED→GREEN regression.

## Review Focus

- Чистий checkout без .superpowers запускає harness — задача 2.
- Невірний DIRECT_URL або залишки fixtures не маскуються як успіх — задача 2.
- Cross-campaign refs, revoked token, sessionOnly перевіряються перед domain write — задача 3.
- Source notes/секрети/signed links не витікають у model/HTTP outputs — задача 3.
- Пропущена DB/browser suite відображається як неперевірена — задача 4.

---

### Task 1.1: Зафіксувати базу й ownership

**Files:**

- Read: `CLAUDE.md`, `docs/STATUS.md`, `docs/architecture/ai.md`, `docs/archive/superpowers/constructor-handoff.md`
- Create: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s1-progress.md`

**Interfaces:**
- Consumes: Чинні HEAD/base/status та roadmap.
- Produces: Checkpoint: current baseline, scope, known evidence/неперевірені припущення.

- [ ] **Крок 1.** Виконати `git status --short`, `git branch --show-current`, `git rev-parse HEAD main`, `git merge-base main HEAD` та записати results без зміни refs.

- [ ] **Крок 2.** Зіставити останні T19/T20/невидимість checkpoints із кодом; не запускати історичні operational commands із handoff.

- [ ] **Крок 3.** Скласти inventory constructor-owned paths через `git diff --name-only main...HEAD`; merged/generated/scripts групувати окремо.

- [ ] **Крок 4.** Зафіксувати, що паралельна S5 володіє тільки дозволеними rules/constants, загальні документи не редагує.

- [ ] **Перевірка.** `git diff --check`. Очікування: exit 0; checkpoint має start HEAD, branch, ownership і next task S1.2.

### Task 1.2: Зробити runner незалежним від локальної історії сесії

**Files:**

- Modify: `scripts/constructor/assistant-check.ts`, `package.json`, `pnpm-lock.yaml`
- Create: `scripts/constructor/assistant-check/browser-server.mjs`, `scripts/constructor/assistant-check/browser-check.mjs`, `scripts/constructor/assistant-check/browser-app.tsx`, `scripts/constructor/assistant-check/README.md` у цій самій директорії
- Create: `scripts/constructor/assistant-check/__tests__/preflight.test.ts`
- Test: `lib/server/assistant/__tests__/test-support.test.ts`

**Interfaces:**
- Consumes: Чинні ui-browser-server.mjs/task19-browser-check.mjs/task19-browser-app.tsx у локальній .superpowers; guard із test-support.ts.
- Produces: Незмінні --check-target/--run; нові --output-dir і --chrome-path; tracked sources без outputs.

- [ ] **Крок 1.** Прочитати й перенести тільки три named sources; не переносити logs, process metadata, images, profiles чи bundled assets.

- [ ] **Крок 2.** Додати preflight test `sourcesAreTrackedAndOutputsAreSeparate`: source root не містить `.superpowers`; output/profile paths всередині explicit output dir; malformed/missing browser path завершує runner ненульовим exit.

- [ ] **Крок 3.** Додати `esbuild` як direct devDependency версії `0.27.3`, уже наявної в lockfile; імпортувати за package name, прибрати пошук через node_modules/.pnpm. Оновити lockfile без unrelated version upgrades.

- [ ] **Крок 4.** Вивести source root від розташування script, output dir створювати до запуску; прокинути output/entry/profile paths аргументами без shell interpolation. Зберегти 9 cases × 2 viewport і separation synthetic HTTP/real DB.

- [ ] **Крок 5.** Зберегти both-URL guard до DB init, connection_limit=1 на обох URLs, fixture marker та migration-list comparison. Виправити exception paths: після owned process spawn кожна помилка readiness/check завершує тільки власні процеси; не kill за випадковим PID із чужого файла.

- [ ] **Крок 6.** Виконати --check-target, targeted preflight/guard tests, build для CSS prerequisites, guarded --run з новим output dir. Перевірити відсутність fixture leftovers і unchanged migration list; відсутні prerequisites показати явною помилкою. Counts/skip брати з фактичного machine-readable Vitest/browser report, прибрати hardcoded integration=6/6.

- [ ] **Перевірка.** `pnpm exec vitest run scripts/constructor/assistant-check/__tests__/preflight.test.ts lib/server/assistant/__tests__/test-support.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `test(constructor): make assistant verification reproducible`.

### Task 1.3: Провести аудит entrypoints і закрити підтверджені порушення

**Files:**

- Read: `lib/server/assistant/authorize.ts`, `lib/server/assistant/http.ts`, `lib/server/assistant/context-http.ts`, `lib/server/assistant/execute.ts`, `lib/ai/tools/projection.ts`, `lib/schemas/assistant-handoff.ts`
- Read: `app/api/mcp/route.ts`, `app/api/cron/assistant-cleanup/route.ts`, `app/api/campaigns/[id]/ai/threads/[threadId]/chat/route.ts`
- Test: `lib/server/assistant/__tests__/authorize.test.ts`, `lib/server/assistant/__tests__/handoffs.test.ts`, `app/api/__tests__/assistant-intents-api.test.ts`, `app/api/__tests__/assistant-mcp.test.ts`, `app/api/__tests__/assistant-cleanup-cron.test.ts`
- Modify: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s1-progress.md`

**Interfaces:**
- Consumes: ActorNeed, live caller validation, transport guards та наявні negative tests.
- Produces: Security matrix: entrypoint/action → identity/scope/ownership/validation/output → test evidence.

- [ ] **Крок 1.** Простежити chat/MCP/session/cron від request до writer; включити post-preview token revoke, membership removal, sessionOnly prepare/execute distinction і author-only deletion receipt.

- [ ] **Крок 2.** Для кожного непокритого authority сценарію додати test у named suite: `wrongCampaignDoesNotWrite`, `revokedOriginDoesNotConfirm`, `bearerCannotHumanConfirm`; assertions: 403/404 за чинним контрактом, writer count=0.

- [ ] **Крок 3.** Для output boundary перевірити unselected notes, signed URL, provider key/Bearer та foreign handoff ids; очікування — відсутність секретів у serialized response, без provider call.

- [ ] **Крок 4.** Підтверджений security defect: спершу RED regression, мінімальний fix окремим commit. Нові affected files записати в checkpoint і не перетинати S5 ownership без координації.

- [ ] **Крок 5.** Кожну знахідку записати як confirmed/hypothesis/structural; додати severity, exact file, reproducer, expected/actual та disposition.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__/authorize.test.ts lib/server/assistant/__tests__/handoffs.test.ts app/api/__tests__/assistant-intents-api.test.ts app/api/__tests__/assistant-mcp.test.ts app/api/__tests__/assistant-cleanup-cron.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `test(assistant): pin transport authority boundaries`.

### Task 1.4: Зберегти baseline і передати результат залежним сесіям

**Files:**

- Modify: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s1-progress.md`
- Test: `lib/server/assistant/__tests__/`, `lib/utils/rules/__tests__/`, `lib/server/characters/__tests__/`, `lib/utils/battle/participant/__tests__/`, `lib/utils/battle/turn/__tests__/`

**Interfaces:**
- Consumes: Runner і security matrix попередніх задач.
- Produces: Tracked evidence; readiness для S2 та інтеграції S5.

- [ ] **Крок 1.** Запустити наведений targeted baseline, TypeScript і lint фактично змінених TS/TSX.

- [ ] **Крок 2.** Через зміну direct dependency у S1.2 виконати повний `pnpm test:run` один раз та `pnpm build`; надалі не повторювати без нової причини.

- [ ] **Крок 3.** Запустити tracked guarded --run; записати фактичні DB/browser results, migration counts, cleanup, mocked integrations. Skip або unavailable не позначати PASS.

- [ ] **Крок 4.** Записати branch/commits, security blockers, точний next task S2.1 та потребу S5.4 після інтеграції. Не merge чужих worktree.

- [ ] **Перевірка.** `pnpm exec vitest run lib/server/assistant/__tests__ lib/utils/rules/__tests__ lib/server/characters/__tests__ lib/utils/battle/participant/__tests__ lib/utils/battle/turn/__tests__`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `docs(constructor): record refactor baseline and security findings`.

## Критерій завершення

S1 checkpoint містить відтворювані sources, результати перевірок і security matrix; жоден confirmed authority blocker не приховано за статусом ready.

## Передача наступній сесії

Оновити `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s1-progress.md` за execution guide. Передати branch/start-end HEAD, виконані task ids, commits, результати перевірок і залишки. Новий контекст читає roadmap, execution guide, цей план і checkpoint попередника.

Наступний залежний план: [S2](2026-10-26-constructor-refactor-s2-assistant-executor.md). Паралельний порядок і залежності визначає execution guide.
