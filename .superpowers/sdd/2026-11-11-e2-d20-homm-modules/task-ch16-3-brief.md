# Ч16 С3 — перемикачі модулів у «Системі», what's new і довідка

Прочитай `common-ch16.md` (особливо «Шари», «`"use client"`», «i18n»), `.claude/rules/components.md`, `part16-design.md` (Р7, Р9; пастки П4, П5; В4) і звіти `task-ch16-{1,2}-report.md` (API патча: `system.modules`, `confirm`, коди помилок, `composition` у вигляді).

## Коміти

1. **`feat(ch16): rule module switches in the System section`**
   - Новий `lib/hooks/campaigns/useCampaignModules.ts` (`"use client"`), експорт із `lib/hooks/campaigns/index.ts`. Сигнатура й поведінка — Р7:
     - дані — `useCampaignRules(campaignId).data` (сервер, П5); `toggles = moduleToggles(data.system)`; без даних — `[]`;
     - мутація — через `updateCampaignRules` з `@/lib/api/rules` (хук може імпортувати `lib/api`; компонент — ні); патч `{ system: { modules: withModule(data.system, id, on).modules }, ...(confirmed && { confirm: true }) }`;
     - підтвердження: `setup`-модуль і `data.systemLocked` → `useConfirm()` до запиту (заголовок/текст/дія — `rules.system.modules.confirm*`, назва модуля через `gameTerms.module.<id>.name`); відмова — нічого не робимо; `ApiError` з `errorKey === API_ERRORS.SYSTEM_MODULE_CONFIRM` → підтвердження й один повтор із `confirm: true`; інші помилки — `useNotify()(error.message)`;
     - успіх: `queryClient.setQueryData(campaignKeys.rules(campaignId), view)`; `queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes(campaignId) && !isRulesKey(q.queryKey), refetchType: 'active' })` (порівняння з `campaignKeys.rules(campaignId)` поелементно; за потреби — хелпер у `lib/hooks/campaigns/invalidate.ts` поруч з `invalidateCampaignQueries`); `router.refresh()` (`next/navigation`).
     - повертає `{ toggles, toggle, isPending }` (згруповано в об'єкт, як заведено в репо).
   - `components/rules/sections/SystemSection.tsx`: пропи `form`, `locked` + `modules` (результат хука) і `dirty` (`isDirty` форми). Під селектом ключа — заголовок `rules.system.modules.title`, підказка `…hint`, рядки addon-ів: `Switch`/`SwitchField` з `components/ui` (подивись, що вже вживається в `components/rules/**`), назва `gameTerms.module.<id>.name`, опис `…summary`, позначка `…setupBadge` для `toggle: 'setup'`. Вимкнений пункт: `!available` (підказка `…requires`/`…conflicts`/`…requiredBy` з `{module}` = перекладена назва), `dirty` (одна підказка `…dirtyHint` над списком), `isPending`. `toggles.length === 0` → блок не рендериться. `id`/`aria-label` на кожному перемикачі (`rules-module-<id>`), щоб live-run міг клікати.
   - `components/rules/RulesForm.tsx`: викликати `useCampaignModules(campaignId)` і передати в `SystemSection` разом з `isDirty`. Нічого більше не міняти (вкладки вже рахуються з композиції).
   - Тексти: `messages/{uk,en}/rules.json`, у наявний об'єкт `system` — вкладений `modules` з ключами з Р7. uk-приклад `confirmBody`: «Модуль «{module}» змінює розрахунок HP і прогресію наявних героїв. Дані не видаляються: модуль можна ввімкнути знову, і все повернеться. Вивчені вузли дерева понад поточний рівень лишаються.»
   - Тести:
     - `components/rules/__tests__/SystemSection.test.tsx` (доповнити; `// @vitest-environment happy-dom`): `homm` — шість перемикачів, усі увімкнені; `dnd5e` — шість вимкнених; `wfrp` — блоку немає; `dirty` → усі вимкнені й видно `dirtyHint`; клік по `rules-module-morale` викликає `modules.toggle('morale', …)`; недоступний пункт (фікстура `toggles` з `available: false`, `reason: { code: 'requiredBy', module: 'x' }`) вимкнений і з підказкою.
     - `lib/hooks/campaigns/__tests__/useCampaignModules.test.tsx` (`happy-dom`, моки `@/lib/api/rules`, `next/navigation`, `useConfirm`, `useNotify`; взірець — наявні тести хуків у цій теці): `toggle('morale', true)` → патч `{ system: { modules: ['morale'] } }` для `dnd5e`, `setQueryData` з відповіддю, інвалідація не чіпає ключ правил, `router.refresh` викликано; `setup` + `systemLocked` → `confirm` до запиту, відмова → запиту немає, згода → `confirm: true`; 409 `SYSTEM_MODULE_CONFIRM` → підтвердження й повтор; інша помилка → `notify`.
     - `components/rules/__tests__/rules-form-composition.test.tsx`: якщо мок `useRulesForm`/`lib/hooks/campaigns` ламається від нового хука — додати мок `useCampaignModules`.

2. **`docs(ch16): what's new and help for rule modules`** (Р9)
   - `lib/onboarding/whats-new.ts`: запис `2026-11-13-rule-modules` **першим** елементом `WHATS_NEW`.
   - `messages/{uk,en}/whatsNew.json`: `"2026-11-13-rule-modules": { "title", "body" }` одразу після першої `{` файлу. uk-заготовка: title «Модулі правил», body «У правилах кампанії, секція «Система», можна вмикати й вимикати модулі: мораль, відсіч, масштабування героя, дерева навичок, набори артефактів, стеки юнітів. Вимкнений модуль нічого не видаляє.»
   - `lib/onboarding/help/dm.ts`: 10-й елемент `sections` статті `dm-rule-systems` — `{ blocks: [{ kind: 'p' }, { kind: 'p' }] }`.
   - `messages/{uk,en}/help.json`: `dm-rule-systems.sections.s9.{heading,b0,b1}` (зміст — Р9) і оновлений `summary` (згадати модулі). Стиль — як у сусідніх розділах статті (коротко, другою особою, без внутрішніх термінів `addon`/`toggle`).
   - Тест `lib/onboarding/__tests__/registry.test.ts` уже вимагає ключі для кожного запису й розділу — нових тестів не треба; переконайся, що кількість розділів у `dm.ts` = кількість `sN` в обох `help.json`.

## Не чіпати

- `NewCampaignForm` (В6), серверні гейти С1, пресети С2.
- Смуга Ч12; меню ДМ і `dmSectionLayout` (оновлюються через `router.refresh()`).

## Готово, коли

- `tsc` чистий (під локом); prettier + eslint по зачеплених файлах; немає кирилиці в коді (`rg -n "[А-Яа-яІіЇїЄєҐґ]" components/rules lib/hooks/campaigns lib/onboarding -g '!**/__tests__/**'` — порожньо); ключі i18n однакові в uk/en.
- Звіт `task-ch16-3-report.md`: список нових ключів i18n, як працює підтвердження (до запиту / після 409), що саме інвалідується, і чи UI повністю на хуках (жодного `@/lib/api` у компонентах).
