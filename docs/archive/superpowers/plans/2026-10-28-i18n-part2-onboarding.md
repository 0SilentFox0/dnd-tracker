# i18n частина 2: Onboarding — план

> **Для виконавців:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Задачі послідовно, суміжні можна одним диспатчем (Sonnet). Кроки — чекбокси.

**Мета:** тексти whats-new, hints, чек-листів, help і `components/onboarding` — у `messages/{uk,en}`; не-React код віддає ключі/id, переклад на межі.

**Архітектура:** у TS лишаються `id`, `date`, `audience`, `href`, `helpSlug`, `optional`, `informational`, `isDone` і скелет help-статей. Тексти — у трьох namespace: `onboarding`, `whatsNew`, `help`. Чекліст-API віддає `id` + `descriptionVariant`/`params`, клієнт перекладає. Help перекладається на сервері, решта на клієнті через `useTranslator`.

**Стек:** next-intl/use-intl (`lib/i18n/*`), Vitest, TanStack Query.

**Спека:** `docs/archive/superpowers/specs/2026-10-28-i18n-core-design.md` (розділ «Не-React реєстри», «Тести», «ESLint-храповик»). Правила: `docs/architecture/i18n.md`, `docs/architecture/onboarding.md`.

## Global Constraints

- Ключі англійські, dot-нотація; `uk` — еталон, `en` — повний переклад, ті самі ICU-плейсхолдери (тест паритету `lib/i18n/__tests__/parity.test.ts` автоматично охоплює `NAMESPACES`). Масивів у JSON немає (паритет-тест кидає на не-рядок).
- Текст `uk` у JSON = поточний текст з TS слово в слово (не переписувати).
- Кирилиця в `.ts/.tsx` каталогів з `i18n-migrated.json` заборонена ESLint (крім `__tests__` і коментарів).
- `lib/api/*` не з компонентів; хуки в `lib/hooks/onboarding`, імпорт через barrel `index.ts`.
- Мінімум коментарів (глобальне правило); відступи/`padding-line-between-statements` як у сусідів.
- Імпортований контент не перекладається. Прапорці в БД (`flag-keys`) не змінюються.
- Не запускати повний `test:run` по задачах: `pnpm test:related <файли>` / `pnpm test:run <файл>`.
- Коміт-повідомлення закінчувати: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Робота лише у воркрі `/Users/silentfox/Work/dnd-tracker-i18n2` (гілка `feat/i18n-part2`); перед git-кроками `git branch --show-current`.

## Review Focus

- Кожен `id` реєстру (кроки, хінти, whats-new) має ключі в обох мовах, зайвих ключів немає; новий запис whats-new без ключів ламає тест, а не UI.
- Крок `characters` з `pendingDrafts > 0` і крок `character` гравця з `ownCharacter === "pending"` дають variant `pending` (+ `{count}`); англійською без сирих ключів.
- Користувач з `NEXT_LOCALE=en`: у `Header` кнопка «What's new» і список записів англійською без сирих ключів (namespace `whatsNew` у статичному бандлі).
- Невідомий `helpSlug`/`id` хінта не ламає рендер (`OnboardingHint` повертає `null`, як раніше).
- `/help/[slug]` англійською: заголовки, список, посилання; скелет ↔ JSON розбіжність ловиться тестом, а не 500 на проді.

---

## File Structure

- Create: `messages/{uk,en}/onboarding.json` (`checklist.{dm,player}.<id>.{title,description[,descriptionPending]}`, `hints.<id>.{title,body}` вкладені по крапці id, `ui.*`), `messages/{uk,en}/whatsNew.json` (`<id>.{title,body}`), `messages/{uk,en}/help.json` (`<slug>.title|summary|sections.s<i>.heading|b<j>`; `list` → об'єкт `i0..iN`).
- Create: `lib/onboarding/step-text.ts` (спільний переклад кроку для клієнта й MCP).
- Modify: `lib/i18n/config.ts` (`NAMESPACES`), `global.d.ts`, `app/layout.tsx` (static `whatsNew`), `app/campaigns/layout.tsx`, `app/help/layout.tsx`, `i18n-migrated.json`.
- Modify: `lib/onboarding/{types,checklists,hints,whats-new,progress}.ts`, `lib/onboarding/help/{dm,player}.ts`, `lib/server/campaigns/action-service.ts`, `lib/hooks/onboarding/useWhatsNew.ts`, `components/onboarding/*.tsx`, `app/help/page.tsx`, `app/help/[slug]/page.tsx`, відповідні `__tests__`.
- Test: `lib/onboarding/__tests__/{registry,progress,step-text,help-skeleton}.test.ts`, `components/onboarding/__tests__/*`, `app/api/__tests__/onboarding-api.test.ts`.

---

### Task 1: Namespaces + реєстри (whats-new, hints, checklists) + API/MCP

**Interfaces:**
- Produces (types, `lib/onboarding/types.ts`):
  ```ts
  export interface StepVariant { name: string; params?: Record<string, number> }
  export interface OnboardingStep<F> { id: string; href?: (campaignId: string) => string; helpSlug?: string; optional?: boolean; informational?: boolean; variant?: (facts: F) => StepVariant | undefined; isDone: (facts: F) => boolean }
  export interface OnboardingHintDef { id: string; audience: OnboardingRole; helpSlug?: string }
  export interface WhatsNewEntry { id: string; date: string; audience: OnboardingAudience; href?: string }
  ```
  `StepStatus` (progress.ts): `{ id; variant?: StepVariant; href?; helpSlug?; optional; informational; done }` — без `title`/`description`.
- Produces (`lib/onboarding/step-text.ts`):
  ```ts
  export function stepText(t: Translator, role: OnboardingRole, step: Pick<StepStatus, "id" | "variant">): { title: string; description: string }
  ```
  title = `checklist.${role}.${id}.title`; description = `checklist.${role}.${id}.description` або, якщо є `variant`, `…description${Capitalized(variant.name)}` з `variant.params`. `t` має namespace `onboarding`.
- Consumes: `Translator` з `@/lib/i18n/translator`.

- [ ] **Step 1: Namespaces.** `NAMESPACES` += `"onboarding" | "whatsNew" | "help"`; `global.d.ts` — три типи-імпорти з `messages/uk/*`; `app/layout.tsx` — `loadStaticMessages(["common","validation","whatsNew"])`; `app/campaigns/layout.tsx` += `"onboarding"`; `app/help/layout.tsx` += `"onboarding","help"`. Створити порожні `{}`-заглушки лише на час кроку 2 (зразу заповнюються).
- [ ] **Step 2: JSON.** Перенести тексти з `checklists.ts` (10 DM + 4 player кроків; `description`-функції → `description` + `descriptionPending` з `{count}` для DM `characters` (`"Гравці надіслали чернеток на схвалення: {count}."`) і `description`+`descriptionPending` для player `character`), `hints.ts` (17), `whats-new.ts` (поточні записи всі) у `uk`; зробити повний `en`. Структура: див. File Structure. Хінти id з крапкою → вкладено (`hints.dm.races.title`). UI-рядки в `onboarding.ui`: `howTo`, `go`, `hide`, `moreFeatures`, `firstStepsTitle`, `firstStepsDone`, `help`, `learnMore`, `closeHint`, `whatsNew`, `new`, `open`, `showHintsAgain`, `hideAllHints`, `restoreChecklists`, `helpTitle`, `helpSubtitle`, `forDm`, `forPlayers`, `hintsHeading`, `allHelp` (останні п'ять для Task 2/3 — додати тут, щоб JSON правився один раз). `whatsNew.json` — `<id>.title|body`; рядок «Що нового»/кнопка лишається в `onboarding.ui`, але `WhatsNewButton` стоїть у root-chrome де `onboarding` немає → ключі кнопки (`button`, `new`, `open`, `title`) покласти в `whatsNew.json` під `ui.*`.
- [ ] **Step 3: Failing tests.** `registry.test.ts`: для кожного `id` з `DM_STEPS`/`PLAYER_STEPS`/`HINTS`/`WHATS_NEW` ключі існують у `uk` і `en` JSON (завантажити через `localSource.load`, пройти за path); зворотна перевірка — у JSON немає id, яких нема в реєстрі (для `checklist.*`, `hints.*` (flatten вкладених), whatsNew верхній рівень без `ui`). `step-text.test.ts` (мок-`t` з `lib/i18n/test/mock-t.ts`): без variant → `checklist.dm.races.title/description`; з `variant {name:"pending", params:{count:2}}` → ключ `…descriptionPending` з params. `progress.test.ts`: `checklistProgress` для `pendingDrafts:2` віддає `variant {name:"pending", params:{count:2}}` на кроці `characters`, а при 0 — `variant` відсутній; для `ownCharacter:"pending"` — `variant {name:"pending"}`. Запустити — FAIL.
- [ ] **Step 4: Реалізація.** Прибрати тексти з TS-реєстрів (лишаються `id`/метадані; `description`-функція → `variant`). `statuses()` у `progress.ts` віддає `variant` замість `title/description`. Написати `step-text.ts`. `useWhatsNew` не змінюється за формою (записи без текстів). `lib/server/campaigns/action-service.ts` операція `onboarding`: перед поверненням перекласти кроки: `const t = await getTranslator(await getRequestLocale().catch(() => DEFAULT_LOCALE), "onboarding")` і віддати `steps: progress.steps.map((s) => ({ ...s, ...stepText(t, facts.role, s) }))` (AI бачить текст). `readCampaignOnboarding` (HTTP) віддає кроки як є (клієнт перекладає). Оновити `types/onboarding.ts` лише якщо тип `StepStatus` реекспортується з іншими полями. `lib/schemas/onboarding.ts` (`key in HINTS`) без змін.
- [ ] **Step 5: Тести.** `pnpm test:run lib/onboarding lib/i18n app/api/__tests__/onboarding-api.test.ts` → PASS (паритет теж). Поправити `onboarding-api.test.ts`, якщо перевіряв `title`.
- [ ] **Step 6: Commit** `feat(i18n): onboarding registries and API as keys`.

### Task 2: Help (скелет + help.json + сторінки)

**Interfaces:**
- Consumes: Task 1 namespaces.
- Produces (types):
  ```ts
  export type HelpBlockDef = { kind: "p" } | { kind: "list"; count: number } | { kind: "link"; href: string }
  export interface HelpArticleDef { slug: string; audience: OnboardingAudience; sections: { blocks: HelpBlockDef[] }[] }
  ```
  (`HelpArticle`/`HelpBlock` з текстами видаляються; `getHelpArticle(slug): HelpArticleDef | undefined`, `HELP_ARTICLES: HelpArticleDef[]` лишаються.)
- Produces (ключі): `help.<slug>.title`, `.summary`, `.sections.s<i>.heading`, `.sections.s<i>.b<j>` (p/link → рядок; list → об'єкт `i0..i<count-1>`).
- Produces: `HelpArticleView({ article: HelpArticleDef, t: Translator })` (чистий, `t` з namespace `help`).

- [ ] **Step 1: Failing test** `lib/onboarding/__tests__/help-skeleton.test.ts`: для кожної статті й мови (`uk`,`en`) з JSON: є `title`,`summary`; кількість секцій у JSON = у скелеті; для кожного блоку тип значення (рядок для p/link, об'єкт рівно з `count` ключами `i0..` для list); зайвих ключів немає. FAIL.
- [ ] **Step 2: Міграція** `dm.ts`/`player.ts` → скелет (kind/count/href; `href` лишається в TS), тексти слово в слово → `messages/uk/help.json`, переклад → `en`. Можна скриптом одноразово (`tsx` у scratchpad, не комітити) згенерувати uk-JSON зі старих масивів, потім en руками.
- [ ] **Step 3: Компоненти й сторінки.** `HelpArticleView` приймає `t`; `app/help/page.tsx` і `[slug]/page.tsx`: `const t = await getTranslator(await getRequestLocale(), "help")` (+ `onboarding` для ui-рядків `helpTitle`, `helpSubtitle`, `forDm`, `forPlayers`, `hintsHeading`, `allHelp`); `HelpPage` стає `async`. Типи `OnboardingRole` групи — заголовки з ключів. Оновити `HelpArticleView.test.tsx` на ключі/мок.
- [ ] **Step 4:** `pnpm test:run lib/onboarding components/onboarding/__tests__/HelpArticleView.test.tsx lib/i18n` → PASS. Оновити `registry.test.ts` (перевірка «статті не порожні» тепер по скелету).
- [ ] **Step 5: Commit** `feat(i18n): help articles as structured keys`.

### Task 3: Компоненти, хуки, храповик

**Interfaces:** Consumes `stepText`, ключі `onboarding.ui.*` і `whatsNew.ui.*` з Task 1.

- [ ] **Step 1: Компоненти** (`useTranslator("onboarding")`; `WhatsNewButton` — `useTranslator("whatsNew")`): `OnboardingChecklist` (`StepRow` бере `stepText(t, data.role, step)`; рядки «Як це?», «Перейти», «Сховати», «Більше можливостей», «Перші кроки», «Перші кроки пройдено ✓», «Довідка» → `ui.*`), `OnboardingHint` (`t(\`hints.${id}.title\`)`, `.body`, «Детальніше», aria «Закрити підказку»), `WhatsNewButton` (`t(\`${e.id}.title\`)`, `.body`, «Що нового»/«нове»/«Відкрити»; дата як є), `HelpSettings`. Динамічні ключі — через нетипізований `Translator`.
- [ ] **Step 2: Тести** оновити на ключі мока (`checklist.dm.races.title` тощо). Додати один тест `renderWithIntl` (`namespaces:["onboarding"]`, `locale:"en"`): `OnboardingHint` для `dm.races` показує англійський заголовок, не містить кирилиці й сирого ключа; і для `WhatsNewButton` з `whatsNew`.
- [ ] **Step 3: `i18n-migrated.json`** += `lib/onboarding/**`, `components/onboarding/**`, `app/help/**`, `lib/hooks/onboarding/**`. `pnpm exec eslint lib/onboarding components/onboarding app/help lib/hooks/onboarding lib/server/campaigns/action-service.ts` → чисто (`--fix` для порядку імпортів). Виправити реальні кириличні літерали, що залишились (у `lib/hooks/onboarding` — якщо є).
- [ ] **Step 4:** `pnpm test:related components/onboarding/*.tsx lib/hooks/onboarding/*.ts lib/onboarding/*.ts` + `pnpm exec tsc --noEmit` → PASS (споживачі `HINTS`/`OnboardingHint` у battle/world/character-profile не змінилися за API).
- [ ] **Step 5: Commit** `feat(i18n): onboarding components on translations`.

### Task 4: Документація

- [ ] Оновити `docs/architecture/onboarding.md` (тексти в трьох namespace, скелет help, чекліст віддає id/variant, whats-new: новий запис = id у TS + ключі `whatsNew.json` обох мов), `docs/architecture/i18n.md` (namespaces, форма help-блоків, `whatsNew` у статичному бандлі), `docs/STATUS.md` (частина 2 → готово на гілці), CLAUDE.md-рядок про whats-new (`lib/onboarding/whats-new.ts` + JSON) якщо він згадує лише TS. Пам'ять `project-i18n` оновлюється наприкінці сесії.
- [ ] Commit `docs: i18n part 2`.

---

## Після задач (контролер)
Один Opus-рев'ю (subagent) → один fix wave (Sonnet) → одне обмежене re-review. Повний `pnpm test:run` раз; повний lint у фоні (`timeout 600000`). Перед merge — запитати користувача; merge лише в тимчасовій воркрі, після пушу `git merge-base --is-ancestor <sha> origin/main`.
