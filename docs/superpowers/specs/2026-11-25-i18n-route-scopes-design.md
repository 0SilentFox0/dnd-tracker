# Скоупи перекладів за маршрутом — design

Дата: 2026-11-25. Гілка `feat/i18n-route-scopes` (worktree `../dnd-tracker-i18n`). Підхід A (ручні скоупи розділів + сторожі) обрав власник; system-слоти — у scope.

## Проблема

- Кожна сторінка під `app/campaigns/**` отримує весь `CAMPAIGN_NAMESPACES` (37 ns, **113 KB uk gzip**); бій додає `BATTLE_NAMESPACES`; system-слоти `campaign`/`member`/`dm` (wfrp ≈15 KB) — теж на кожній сторінці кампанії.
- Аудит 61 сторінки (звіт і скрипт: scratchpad сесії, переноситься в `lib/i18n/test/`): у середньому маршрут вантажить 122 KB, з них **~81 KB не використовує** (32–110). На ≥80 % маршрутів клієнт читає лише `common`, `gameTerms`, `inventory` (+`demoTours` лише для демо).
- `scope-size` рахує суму, тож будь-яка фіча будь-де піднімає ліміт усім (`LIMIT_KB` 112.9, запас ~0.3 KB).
- Знайдено діру: `components/rules/system/SummaryStep.tsx` читає `battleCommon` на `dm/rules`, де його немає (маскується `.has()`). Давня проблема — сирі ключі `dashboard.*`/`gameTerms.*` на дашборді: простір читається там, де не завантажений, і це видно лише в рантаймі.

## Мета і критерії успіху

1. Базовий скоуп кампанії ≤ ~25 KB uk gzip (замість 113).
2. Бюджет — на маршрут (сегмент) і на system-пакет; нова фіча піднімає лише бюджет свого розділу.
3. Тест падає, якщо код маршруту читає простір поза скоупом маршруту (замість MISSING_MESSAGE/сирих ключів у рантаймі), і якщо в скоупі маршруту є простір, якого ніхто на маршруті не читає (крім перевіреного списку).
4. Живий прогін: усі розділи кампанії (ДМ, гравець), бій, профіль — без сирих ключів і MISSING_MESSAGE; розмір повідомлень у HTML до/після в STATUS.

## Reuse

- `ExtendLocaleScope`/`ExtendMessages` (`lib/i18n/`) — механізм вкладеного злиття лишається, `RouteScope` — тонка обгортка.
- `loadMessages`, `trimWhatsNew` — без змін.
- `systemScope`/`logScope`/`rulesFormScope` (`lib/i18n/system-scope.ts`) — розширюються ключем пакета замість нових функцій.
- `systemOfCampaign` (`lib/server/systems/campaign-system.ts`) — джерело системи для `RouteScope`.
- `lib/i18n/test/import-graph.ts` + скрипт аудиту — основа сторожа; `battle-scope-imports.test.ts` поглинається новим тестом (його правила стають окремим випадком).
- `scope-size.test.ts` — переписується, не дублюється.

## Дизайн

### 1. Модель скоупів — `lib/i18n/route-scopes.ts`

- `CAMPAIGN_BASE` — простори, які рендерить оболонка на кожній сторінці кампанії (GameShell, шапка, підказки онбордингу, звукова панель, кубики, сповіщення): орієнтовно `common`, `validation`, `gameTerms`, `inventory`, `onboarding`, `soundboard`, `abilities`. Остаточний склад визначає сторож (п. 4) — що читає код, досяжний з `app/campaigns/[id]/layout.tsx` і оболонки.
- `PACKS: Record<PackKey, Namespace[]>` — групи, що ходять разом (склад уточнює план за аудитом):
  - `campaigns` — `campaigns`;
  - `dashboard` — `dashboard`, `campaigns` (+ пакет `rules`);
  - `characterSheet` — `characters`, `characterProfile`, `choices`, `classes`, `feats`, `backgrounds`, `races`, `skills`, `rest`, `artifacts`, `spells`;
  - `abilityDisplay` — `abilityRegistry`, `abilityText`, `battleTerms`, `battleCommon`;
  - `abilityEditor` — `abilityEditor` (новий, п. 5), `spellEditor`, `editors`;
  - `contentLibrary` — `compendium`, `contentImport`, `contentCopy`;
  - `story` — `scenario`, `scenarioGraph`, `world`, `show`, `music`, `acquaintances`, `quests`;
  - `battle` — `BATTLE_NAMESPACES`, `maps`, `tileLabels`;
  - `rules`, `ai`, `units` — окремі дрібні пакети.
- `ROUTE_SCOPES: Record<RouteKey, readonly PackKey[]>` — запис на кожен сегмент маршруту (`dashboard`, `character`, `characterDraft`, `dmSpells`, `dmBattles`, `battle`, `journal`, …; ~30). Скоуп маршруту = `CAMPAIGN_BASE` ∪ ns пакетів ∪ system-ns тих самих пакетів для системи кампанії.
- `CAMPAIGN_NAMESPACES` як «завантажити все» зникає; `NAMESPACES`/`CORE_NAMESPACES` (типи, паритет) — без змін.

### 2. Підключення — `<RouteScope route>`

- Серверний компонент `lib/i18n/route-scope.tsx`: `({ route, campaignId?, children })` → `ExtendLocaleScope` з ns пакетів маршруту, без ns, що вже є в предках (база). System-ns бере через `systemOfCampaign(campaignId)` (запит уже кешується на запит; якщо ні — `react` `cache`).
- `app/campaigns/layout.tsx` вантажить `CAMPAIGN_BASE` (сторінки `/campaigns` і `/campaigns/new` — свій `RouteScope` з пакетом `campaigns`).
- Кожен сегмент під `app/campaigns/[id]/` отримує `RouteScope` у своєму `layout.tsx`; де layout немає — додається мінімальний (лише `RouteScope`). Наявні точкові `ExtendLocaleScope` (`journal`, `dm/{ai,assistant,scenario}`, `dm/maps/[mapId]`, `battles`, `dm/battles`, `dm/rules`, `dm/characters*`, `character*`, `dm/layout` `contentCopy`) замінюються на `RouteScope`.
- Лишаються як є: `whatsNew` у `GameShell`, `demoTours` для демо в `[id]/layout.tsx`, `logScope` у бойових layout-ах (переїжджає в пакет `battle`), root/`(auth)`/`settings`/`profile`/`help`/`ops`/`library` — поза кампанією, не змінюються.
- Розмітку, класи й стилі не чіпаємо (паралельний Ч8a): зміни лише в `layout.tsx`/`page.tsx` обгортках і `lib/i18n/**`.

### 3. System-слоти за пакетами

- `SystemI18n` отримує `packs?: Partial<Record<PackKey, readonly string[]>>`; слоти `campaign`/`member`/`dm`/`battle` переносяться в пакети і видаляються (wfrp: `battleWfrp` → `battle`, `wfrpEquipment` → `characterSheet`, `wfrpCareers`/`wfrpCreation`/`wfrpTraits`/`wfrpTables`/`wfrpEquipmentEditor` → `contentLibrary` або `characterSheet` за фактичним використанням, `wfrpMagic`/`wfrpAdvancement` → `characterSheet`; `inspiration` і `skillTree` — за використанням; d20 `battleD20` → `battle` і `abilityDisplay`, якщо сторож це підтвердить).
- `pages` (`character`, `draft`, `dmCharacter`, `dmCharacters`, `dmRules`) і `rules`/`log`/`legacyKeys` лишаються; `pages` стають ключами `RouteKey` там, де збігаються.
- DM-only розрізнення: пакет, що зустрічається лише в DM-маршрутах, автоматично DM-only; окремого слота `dm` не потрібно.
- `system-contract` перевіряє, що кожен ns з `packs` має JSON і що ключ пакета існує.

### 4. Сторожі — `lib/i18n/__tests__/route-scopes.test.ts`

Аналізатор (`lib/i18n/test/route-namespaces.ts`, з аудиту): граф імпортів від `page.tsx` і ланцюжка layout-ів, з відносними імпортами, barrel-ами по імені, межею `"use client"`, зупинкою на `lib/server`/`app/api`/`server-only`; системний UI — через `systems/*/ui` для пакетів, які система оголошує.

- **(а)** Кожна `page.tsx` під `app/campaigns/**` має `RouteScope` (або базу) у своєму ланцюжку; ключ `route` існує в `ROUTE_SCOPES`.
- **(б) «використовує поза скоупом» — падає.** Простір, який читає хук/транслятор (`useTranslations`, `useTranslator`, `getTranslations`, `getTranslator`, кореневий `t('ns.x')`), має бути в скоупі маршруту. Ключі-літерали з чистого коду (TextRef, реєстри) — лише з перевіреного списку винятків `ROUTE_SCOPE_LITERAL_EXEMPT` з причиною (рушій бою, досяжний з аркуша, але не рендерить лог; серверні `errors.*`/`compendium.errors.*` з `api-errors`).
- **(в) «у скоупі, але не використовується» — падає**, крім списку `ROUTE_SCOPE_UNUSED_ALLOWED` з причиною (сторінки, що рендеряться через реєстри систем і невидимі для графа: `dm/classes`, `dm/skills`, `dm/npc-heroes`, `dm/system/*`).
- Сервер: синхронний `useTranslations` у серверному компоненті — як і зараз, лише `ROOT_NAMESPACES` (`server-component-hooks` без змін).
- `battle-scope-imports.test.ts` видаляється: його правило (бойові ns поза бойовими сегментами) — окремий випадок (б).
- Відомий розрив (не ловиться графом): ключі, що приходять з API в клієнтський стан — уже перекладені на сервері (`apiErrorJson`), тож поза ризиком.

### 5. Розбиття `abilityRegistry`

- `abilityRegistry` лишає відображення (`summary`, `effects`, `triggers`, `conditionTypes`, `duration`, `stats`, `damageTypes`, `targets`) — ≈9 KB, потрібен аркушу, бою, довідці.
- Новий `abilityEditor` — тексти редактора (`fields`, `flags`, `options`, `optionGroups`, `templates`, `triggerGroups`, `damageFilters`) — ≈6 KB, лише редактори. Точний поділ — за використанням (план), ключі переносяться з `messages/{uk,en}/abilityRegistry.json` в `abilityEditor.json`, виклики оновлюються; `label-keys-abilityRegistry` ділиться відповідно.
- Інші файли не розбиваються: `errors`, `help`, `landing` у кампанійний скоуп не входять; `whatsNew` уже обрізається (`WHATS_NEW_BUNDLED`); `compendium` — увесь у `contentLibrary` (його «використання» з `api-errors` серверне); `common.json` не змінюється (конфлікти з Ч8a).

### 6. Бюджети — `scope-size.test.ts`

- Бюджет бази (`CAMPAIGN_BASE_LIMIT_KB`) і бюджет кожного `RouteKey` (`ROUTE_BUDGETS_KB`, uk gzip, ~0.5 KB запасу над виміряним) — рахується база ∪ пакети маршруту.
- System: `budgetKb.packs[PackKey]` — лише власні ns системи в пакеті (без ядра); `budgetKb.battle/member/dm` видаляються.
- Root-бюджет (`ROOT_LIMIT_KB`) і перевірка «d20-кампанія отримує лише свої ns» — лишаються (оновлені під пакети).
- У тесті — таблиця розмірів у `console.info` (як зараз), щоб видно було, який маршрут виріс.

### 7. Поведінка під час навігації

Скоупи — у layout-ах сегментів, тож перехід між розділами передає повідомлення нового сегмента в RSC-payload один раз; спільні предки не перерендерюються. Компоненти, що живуть в оболонці (діалоги з шапки, звук, підказки), мусять читати лише базу — це ловить (б) через ланцюжок `[id]/layout.tsx`.

## Тестування

- Нові/змінені тести: `route-scopes.test.ts` (а/б/в), `scope-size.test.ts`, `system-contract` (пакети), `label-keys-abilityRegistry` + `label-keys-abilityEditor`, тести layout-ів, що мокають `ExtendLocaleScope` (`app/campaigns/[id]/__tests__/layout.test.tsx`, `battles/__tests__/layout.test.tsx`, `character/__tests__/page.test.tsx`, `dm/characters/[characterId]/__tests__/page.test.tsx`) — на `RouteScope`.
- Агенти тести не запускають (крім `pnpm test:related`); один повний `pnpm test:run` наприкінці; lint по папках; `pnpm cycles`.
- Живий прогін: `next build` + `next start` на вільному порту (не 3100), локальна БД; ДМ і гравець; кожен розділ кампанії, бій (у т.ч. wfrp-кампанія, якщо є локально), профіль; консоль без MISSING_MESSAGE; розмір `self.__next_f` повідомлень у HTML до/після на 5–6 ключових сторінках.

## Ризики

- **Неповний скоуп маршруту → сирі ключі.** Мітигація: сторож (б) суворий; живий прогін по всіх розділах.
- **Сторінки через реєстри систем невидимі для графа** — скоуп для них оголошується консервативно (з запасом) і в списку (в).
- **Діалоги/модалки, що відкриваються з іншого розділу** (наприклад, редактор здібностей з аркуша героя) — граф їх бачить, якщо імпорт статичний; `dynamic()`-імпорти аналізатор має проходити.
- **Конфлікти з Ч8a** — лише `layout.tsx`/`page.tsx`-обгортки й `lib/i18n/**`; `messages/*/common.json` не змінюється.

## Поза scope

- Ліниве підвантаження просторів на клієнті.
- Розбиття `errors`/`help`/`whatsNew`/`common`.
- Скоупи поза кампанією (`settings`, `profile`, `help`, `(auth)`, `ops`, `library`).
