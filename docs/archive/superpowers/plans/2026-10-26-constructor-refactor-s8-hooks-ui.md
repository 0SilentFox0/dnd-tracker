# S8. Спільні хуки та UI конструктора — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagent-driven execution is available only when separately chosen by the user. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Розкласти lifecycle/data loading та стандартизувати query keys без stale UI і зайвих refetches.

**Architecture:** Domain hooks залишають form validation/body builders локальними. Чинні useCrudMutation/useNavigateFresh перевикористовуються, useSpellBook facade зберігає API, receipt invalidation зберігає conservative fallback.

**Tech Stack:** TypeScript strict, Next.js 16 / React 19, Zod 4, Prisma 6 / PostgreSQL, TanStack Query 5, Vitest 4, pnpm.

**Spec:** [roadmap, S8](2026-10-26-constructor-refactor-roadmap.md#сесії); [спільний контракт виконання](2026-10-26-constructor-refactor-execution-guide.md); чинні subsystem docs у `docs/architecture/`.

**Dependencies:** S4, S5–S7; tracked browser harness S1.

**Status:** План підготовлено; у цій сесії реалізацію не запускали. Стан паралельних робіт звірити за checkpoint-ами. Базовий HEAD для звірки: `73c5de1a`.

## Global Constraints

- Виконувати спільний контракт execution guide; змінювати тільки файли поточної задачі.
- Зберігати API/MCP ids, payloads, persisted JSON, errors/defaults, HOMM і 5e.
- DB writes тільки на guarded local constructor з перевіркою обох URLs; без secrets у logs.
- Не запускати prod/prodcopy, HOMM gateway, merge/push/deploy; застосовані міграції не редагувати.
- Зберігати scoped transaction, lock order, live auth, atomic write+receipt і idempotent effects.
- Прості extraction перевіряти чинними тестами; нова поведінка/дефект потребує RED→GREEN regression.

## Review Focus

- Query prefix refresh не пропускає paginated/detail/legacy cache — задача 1.
- Unmount/caster switch прибирає map callbacks і Escape listeners — задача 2.
- Invalid choices/body не записуються; cancel не робить mutation — задача 3.
- Save-before-apply failure та repeated receipt не дублюють write/refetch — задача 4.
- Зміна campaign/thread/notes анулює попереднє disclosure approval — задача 4.

---

### Task 8.1: Звести assistant keys і polling до власників

**Files:**

- Modify: `lib/hooks/ai/keys.ts`, `lib/hooks/ai/useAssistantIntents.ts`
- Create: `lib/hooks/ai/assistant-polling.ts`, `lib/hooks/ai/__tests__/assistant-keys.test.ts`
- Test: `components/ai/__tests__/assistant-workspace.test.tsx`, `lib/hooks/ai/__tests__/assistant-effects.test.tsx`

**Interfaces:**
- Consumes: Чинні aiKeys tuple shapes і pending/recovery queries.
- Produces: Додати `aiKeys.intentsRoot(campaignId)`, `intentRoot(campaignId)`, `receiptsRoot(campaignId)`, `proposalsRoot(campaignId)`, `workspaceProposals(campaignId)`; існуючі factory signatures не змінювати. ASSISTANT_POLLING={intentsMs:10000,executingReceiptMs:2000}.

- [ ] **Крок 1.** Keys test: intentsRoot("c")→["assistant-intents","c"], intentRoot→["assistant-intent","c"], receiptsRoot→["assistant-receipt","c"], workspaceProposals→["ai-proposals","c","workspace"]; current paginated tuples незмінні.

- [ ] **Крок 2.** Замінити inline refresh/workspace keys і intervals у useAssistantIntents. Pending query і detail/receipt enabled/status behavior не розширювати.

- [ ] **Крок 3.** Покрити confirm/reject onSettled refresh для list/detail/receipt/legacy, без invalidation іншої кампанії; assert pagination identity з cursor/limit.

- [ ] **Крок 4.** Перевірити HTTP layer фактичний status filter: не додавати status до key або public hook options без узгодження чинної pending-only семантики.

- [ ] **Перевірка.** `pnpm exec vitest run lib/hooks/ai/__tests__/assistant-keys.test.ts components/ai/__tests__/assistant-workspace.test.tsx lib/hooks/ai/__tests__/assistant-effects.test.tsx`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(ai): centralize assistant query keys and polling`.

### Task 8.2: Декомпозувати useSpellBook без другого spell engine

**Files:**

- Create: `lib/hooks/battle/useSpellMapTargeting.ts`, `lib/hooks/battle/useBattleSpellLibrary.ts`
- Modify: `lib/hooks/battle/useSpellBook.ts`
- Test: `lib/hooks/battle/__tests__/useSpellBook-monster.test.tsx`, `lib/hooks/battle/__tests__/useDmCaster.test.tsx`
- Create: `lib/hooks/battle/__tests__/useSpellMapTargeting.test.tsx`

**Interfaces:**
- Consumes: Flow/cost/selection helpers S7, existing MapTargetingContext, useBattleSpellIds/useSpellsWithCost.
- Produces: `useSpellMapTargeting(state: SpellFlowState, dispatch: Dispatch<SpellFlowAction>, ctx: MapTargetingContext): GridPoint | null`; перенесені useBattleSpellIds/useSpellsWithCost у library module. useSpellBook/useSpellBookPrefetch/useBonusSpells/useReactionSpells лишаються compatibility exports.

- [ ] **Крок 1.** Перенести чинний map targeting hook разом із context type; не міняти callback refs/effect dependencies на око.

- [ ] **Крок 2.** Test mount→pick→caster switch→unmount: previous aim/pick cleared, only current caster callback fires, Escape handler видалений, немає duplicate dispatch.

- [ ] **Крок 3.** Перенести library id selection/loading та bonus/reaction filtering; player reads тільки controlled participants, DM reads current roster.

- [ ] **Крок 4.** Залишити reducer orchestration і submit у useSpellBook; не створювати generic useWizard. Значення slot/grant/legendary payload делегуються чистим S7 helpers.

- [ ] **Крок 5.** Заміряти requests і renders у synthetic scenario до/після; extraction сам по собі не оголошувати performance gain.

- [ ] **Перевірка.** `pnpm exec vitest run lib/hooks/battle/__tests__/useSpellMapTargeting.test.tsx lib/hooks/battle/__tests__/useSpellBook-monster.test.tsx lib/hooks/battle/__tests__/useDmCaster.test.tsx lib/utils/battle/flows/__tests__/spell-flow.test.ts`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(battle): separate spellbook loading and map lifecycle`.

### Task 8.3: Винести background form lifecycle і перевикористати чинні hooks

**Files:**

- Create: `lib/hooks/backgrounds/useBackgroundForm.ts`
- Modify: `lib/hooks/backgrounds/index.ts`, `components/backgrounds/BackgroundForm.tsx`, `lib/hooks/classes/useClassForm.ts`, `lib/hooks/feats/useFeatForm.ts`
- Test: `components/backgrounds/__tests__/BackgroundForm.test.tsx`, `components/classes/__tests__/ClassFeaturesEditor-choices.test.tsx`, `components/feats/__tests__/FeatForm.test.tsx`

**Interfaces:**
- Consumes: useUpdateBackground, useCrudMutation, useNavigateFresh, BackgroundData/FormData, class/feat domain validity.
- Produces: `useBackgroundForm(campaignId: string, background: BackgroundData)` повертає form `{data,set,patch}`, validation `{invalid,setInvalid}`, status `{isSaving}`, actions `{submit,cancel}`; exports через domain barrel.

- [ ] **Крок 1.** Перенести state/patch/submit/cancel із компонента; body normalization лишити background-specific, name.trim і choices validity зберегти.

- [ ] **Крок 2.** Замінити router.push+refresh після успіху чинним useNavigateFresh; class/feat hooks уже використовують його — не додавати зайвий generic wrapper.

- [ ] **Крок 3.** Existing UI tests: invalid choices→0 update calls, valid submit→один update з trimmed name, failure не навігує, cancel не робить mutation, pending disables submit.

- [ ] **Крок 4.** Зберегти класовий caster/subclass normalization і feat-specific nullable fields. Спільні hooks не уніфікують ці body builders.

- [ ] **Крок 5.** Компонент лишає HUD form rendering і choice editor; компоненти не імпортують lib/api.

- [ ] **Перевірка.** `pnpm exec vitest run components/backgrounds/__tests__/BackgroundForm.test.tsx components/classes/__tests__/ClassFeaturesEditor-choices.test.tsx components/feats/__tests__/FeatForm.test.tsx`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `refactor(forms): isolate background form lifecycle`.

### Task 8.4: Перевірити receipt refresh, disclosure races і browser flows

**Files:**

- Read/Modify за доведеним дефектом: `lib/hooks/ai/useAssistantEffects.ts`, `lib/hooks/ai/useAssistantContext.ts`, `lib/hooks/campaigns/invalidate.ts`
- Test: `lib/hooks/ai/__tests__/assistant-effects.test.tsx`, `lib/hooks/ai/__tests__/assistant-context-ui.test.tsx`, `components/ai/__tests__/assistant-workspace.test.tsx`
- Create: `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s8-progress.md`

**Interfaces:**
- Consumes: Stable receipts/domain affected refs, existing editor registrations та S1 browser harness.
- Produces: Сумісні registerAssistantBeforeApply/flushAssistantBeforeApply/useAssistantEffects; before/after refetch/render results.

- [ ] **Крок 1.** Перевірити той самий receipt двічі→одна invalidation; failed invalidation дає retry; інша campaign/QueryClient має незалежну dedup state.

- [ ] **Крок 2.** Перевірити editor flush false/throw→confirm call=0; unregister на unmount; campaign/thread/focus/selected notes change робить previous disclosure unapproved і stale async response не відновлює його.

- [ ] **Крок 3.** Зняти refetch count після receipt; зберегти поточну broad campaign invalidation для cascades/unknown domains. Звуження не робити без повної dependency matrix; дублікати прибирати existing receipt dedup механізмом.

- [ ] **Крок 4.** Прогнати tracked browser 1440/390 для review/stale/recovery, rules form, background/class choices, spell selection; browser evidence synthetic позначити окремо від DB authority.

- [ ] **Крок 5.** Записати checkpoint із performance measurements, TypeScript/lint і фактичним набором browser scenarios.

- [ ] **Перевірка.** `pnpm exec vitest run lib/hooks/ai/__tests__/assistant-effects.test.tsx lib/hooks/ai/__tests__/assistant-context-ui.test.tsx components/ai/__tests__/assistant-workspace.test.tsx`. Очікування: exit 0; усі вибрані тести пройшли, немає неочікуваних skip.

- [ ] **Checkpoint/commit.** Записати evidence; окремий commit тільки файлів задачі: `docs(ui): record hook lifecycle and refresh verification`.

## Критерій завершення

Keys/lifecycle мають власників, UI/hook behavior сумісний, no stale callbacks/approval reuse, refetch count не погіршився.

## Передача наступній сесії

Оновити `docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s8-progress.md` за execution guide. Передати branch/start-end HEAD, виконані task ids, commits, результати перевірок і залишки. Новий контекст читає roadmap, execution guide, цей план і checkpoint попередника.

Наступний залежний план: [S9](2026-10-26-constructor-refactor-s9-content-import-sync.md). Паралельний порядок і залежності визначає execution guide.
