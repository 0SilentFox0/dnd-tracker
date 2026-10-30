# Scenario digest (3c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Додати блок `digest` конспектів сценарію в контекст асистента ДМа (режим scenario).

**Architecture:** `loadDigestItems` (один raw-запит) → `summariesDigest` → необов'язковий `ContextBlock` останнім у `fitContext`.

**Tech Stack:** Prisma `$queryRaw`, Vitest, next-intl.

**Spec:** `docs/superpowers/specs/2026-10-30-scenario-digest-design.md`

## Global Constraints

- Мінімум коментарів; `@/` імпорти; без repo-wide lint/test (лише `pnpm test:related`, `pnpm exec eslint --fix <files>`).
- Без міграцій. Digest лише в `buildInstructions` (ДМ-сесія).
- Коміти з трейлером `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Блок digest не має виштовхувати/різати `standing` і `focusPage` при малому бюджеті.
- Кампанія без жодного конспекту: блок відсутній, без порожнього заголовка.
- Конспект із порожнім/пробільним `digest` пропускається.
- Токен/не-сесійний актор не доходить до запиту digest.
- Режим live не отримує блок.

---

### Task 1: Дані й форматування

**Files:**
- Modify: `lib/utils/scenario/summary/digest.ts` (+ його тест у `__tests__/`)
- Modify: `lib/server/scenario/summary-store.ts`; test: `lib/server/scenario/__tests__/summary-store.test.ts` (новий, мок `@/lib/db`)
- Modify: `lib/constants/ai.ts` (`AI_LIMITS.digestChars: 4000`)

**Interfaces:**
- Produces: `DigestItem` отримує `id: string`; рядок `- ${title} [${id}]: ${digest}${stale ? " (stale)" : ""}`.
- Produces: `loadDigestItems(campaignId: string): Promise<DigestItem[]>` — `$queryRaw` `SELECT p.id, p.title, p."sortOrder", s.summary->>'digest' AS digest, s.version < p.version AS stale FROM scenario_page_summaries s JOIN scenario_pages p ON p.id = s."pageId" WHERE s."campaignId" = ${campaignId}`; фільтрує `digest?.trim()`.

- [ ] Тести: digest-рядок містить `[id]`; `loadDigestItems` мапить рядки й відкидає `null`/`"  "` digest.
- [ ] Реалізувати; `pnpm test:related lib/utils/scenario/summary/digest.ts lib/server/scenario/summary-store.ts`; eslint --fix змінених; commit.

### Task 2: Підключення в промпт і i18n

**Files:**
- Modify: `lib/ai/context/prompt.ts`, `types/ai.ts` (`ContextBlockId` += `"digest"`), `messages/uk/ai.json`, `messages/en/ai.json` (`context.blocks.digest`: «Конспекти сторінок (дані)» / «Page summaries (data)»)
- Test: `lib/ai/context/__tests__/assistant-context.test.ts` (мок `@/lib/server/scenario/summary-store`)

**Interfaces:**
- Consumes: `loadDigestItems`, `summariesDigest(items, { maxChars: AI_LIMITS.digestChars })`.

- [ ] Тести за розділом «Тести» спеки (scenario/live/порожньо/малий бюджет/токен-актор).
- [ ] У `buildInstructions`: у `Promise.all` додати `mode === "scenario" ? loadDigestItems(campaignId) : Promise.resolve([])`; після побудови `blocks` і гілок focus (перед `fitContext`) якщо `summariesDigest(...)` не порожній — `blocks.push({ id: "digest", label: "Page summaries (DM-only, only pages that have one; (stale) = page edited since; read full text via read_scenario_page)", maxChars: AI_LIMITS.digestChars + 200, text: digest })`.
- [ ] `pnpm test:related lib/ai/context/prompt.ts types/ai.ts` + i18n key test; eslint --fix; commit.

### Task 3: Документація та фінальна перевірка

**Files:** `docs/architecture/ai.md` (рядки про збирач і `summariesDigest`), `docs/STATUS.md` (епік закрито), перенести спеку/план в `docs/archive/superpowers/` після мерджу.

- [ ] Оновити docs; один повний `pnpm test:run`, repo-wide eslint, `tsc --noEmit` (перед цим `ps` на важкі процеси); commit.
