# WFRP 5e-1: таланти й XP-леджер (spec)

Частина 5e епіку WFRP ([дослідження](../research/2026-11-03-wfrp-rule-system.md), декомпозиція 5a–5h). 5e розбито на три: **5e-1** (цей spec: таланти + XP-леджер), 5e-2 (кар'єри), 5e-3 (створення персонажа). Гілка `feat/wfrp`, без merge/push у main (feedback-wfrp-no-main).

## Мета й успіх

Гравець або ДМ витрачає XP на advances характеристик, навичок і на таланти за прогресивними цінами. Сервер перевіряє баланс, ціну й ліміти, історія витрат зберігається, ДМ може відкотити останню покупку. Набуті таланти впливають на бій через наявний ability-DSL. Успіх: покупка на листі змінює значення в наступному d100-тесті й у бою; повторний клік не списує XP двічі; чужий гравець не бачить журнал.

## Рішення (узгоджено 2026-11-05)

| # | Рішення |
|---|---|
| Р1 | Каталог талантів = таблиця `feats` + nullable `xpCost`, `maxRank` (expand-only міграція). Нового content kind немає. |
| Р2 | Набуті таланти — `characteristics.talents: { featId: rank }`, не `Character.feats` (той працює лише в `classMode` і не має рангів). Choices-пайплайн 5e не чіпаємо. |
| Р3 | Купувати може власник листа або ДМ; відкотити останню покупку — лише ДМ. |
| Р4 | Таблиці цін і ліміти — в `rules.progression` пресету `WFRP_RULES` (ДМ редагує). Числа — заглушки `verify against 5e book`. |
| Р5 | Передумови талантів: автоматично лише `maxRank` і баланс; `prerequisite.manualText` — підказка. |
| Р6 | `ledger` бачать власник і ДМ; для інших гравців сервер його прибирає. |
| Р7 | Одна таблиця цін; знижки за кар'єрою — 5e-2. |

## Reuse

- Операції персонажа: `defineCharacterOperation` + `characterRoute` + `registry.ts` (`lib/server/characters/operation-runner.ts`, `operations/*`) — HTTP-маршрут і асистент/MCP діляться одним ядром. Нові `advance` і `advance-undo` — за зразком `arcane-recovery.ts` / `experience.ts`.
- Конкурентність: `lockCharacters` (`lib/server/characters/lock.ts`, `SELECT … FOR UPDATE`) — розширити вибірку полем `characteristics`; журнал дій — `writeCharacterLog` + `CharacterLogKind` (додати `ADVANCE`).
- Доступ: `requireCharacterAccess`, `dmCharacterGate`, `gateOptions` (`operation-runner`/`access`), `parseBody`, `ContentError`, тексти — `lib/constants/api-errors.ts`.
- Дані листа: `CharacteristicsSchema` / `readCharacteristics` (`wfrp/characteristics/{schema,keys}.ts`; рукописне дзеркало для клієнта), `SKILL_CATALOG`, `characteristics/derive.ts`.
- Ability-DSL: `featAbilities` (`lib/utils/abilities/read.ts`), група `{ source: {type:"feat",…}, abilities }` (`choices/selections.ts`), `toFeatData` (`lib/utils/feats/row.ts`), `collectModifiers`.
- Шов системи: `ruleSystemOf(rules)` (`lib/utils/rules/systems`), `WFRP_RULES`/`RulesetSchema`; точка підстановки в бою — `lib/utils/battle/participant/from-character.ts`.
- Клієнт: `lib/api/characters`, `lib/hooks/characters/*` (barrel, ключі в `keys.ts`), компоненти wfrp — `components/systems/wfrp/*` (`StatsTab`, `SkillsList`, `CharacteristicsGrid`, `MagicTab` як зразок вкладки), редактор feats — `lib/hooks/feats/useFeatForm`.
- i18n: `WFRP_CAMPAIGN_EXTRA` у `lib/i18n/scopes.ts` (за зразком `wfrpMagic`), `scope-size.test.ts`; онбординг: `lib/onboarding/whats-new.ts`.
- Нове, бо немає аналога: ціни/покупка/відкат (`wfrp/progression/`), поле леджера, адаптер талантів у бій, вкладка «Розвиток».

## Дизайн

### 1. Дані

- Міграція: `feats.xpCost Int?`, `feats.maxRank Int?` (null → 1). Нових таблиць немає; `ENABLE ROW LEVEL SECURITY` не потрібен.
- `characteristics` (JSON): `talents: Record<featId, rank 1..maxRank>` і `ledger: LedgerEntry[]`, `LedgerEntry = { id, at, kind: "characteristic"|"skill"|"talent", key, from, to, cost }`, ліміт довжини 200 (старі скорочуються разом з правилом «відкотити можна лише останню»).
- `Character.experience` = зароблено всього. Доступний XP **похідний**: `experience − Σ ledger.cost`, не зберігається.
- Оновити `CharacteristicsSchema`, `readCharacteristics` (дзеркало), `DEFAULT_CHARACTERISTICS`; бекфіл не потрібен (відсутні поля → `{}`/`[]`).

### 2. Рушій (`lib/utils/rules/systems/wfrp/progression/`)

Чисті модулі, без Prisma:
- `rules.ts`: `ProgressionRulesSchema` у `RulesetSchema` (`rules.progression`): `characteristic: { brackets: [{upTo, cost}] , max }`, `skill: { brackets, max }`, `talentCostMultiplier`. Дефолти — у `WFRP_RULES`.
- `cost.ts`: `advanceCost(kind, currentAdvances, progression)` → число або `null` (ліміт).
- `plan.ts`: `planPurchase(characteristics, available, request, catalog)` → `{ ok, next, entry } | { error }`; помилки — коди (`INSUFFICIENT_XP`, `AT_LIMIT`, `MAX_RANK`, `UNKNOWN_TALENT`/`UNKNOWN_SKILL`).
- `undo.ts`: `planUndo(characteristics)` відновлює `from` для останнього запису. Якщо стан розійшовся із записом (DM змінив advances вручну), відкат відмовляє (`LEDGER_STALE`).
- Контракт у `RuleSystem`: опційний хук `progression` (`undefined` у d20-системах).

### 3. Сервер

- Операції `advance` (`POST …/characters/[characterId]/advance`, body `{ kind, key, spec? }`) і `advance-undo` (`DELETE`, лише ДМ) у `lib/server/characters/operations/`, зареєстровані в `registry.ts` для асистента.
- Handler у `core/advance-handler.ts`: транзакція → `lockCharacters` (з `characteristics`) → `planPurchase` → запис `characteristics` + `writeCharacterLog(kind: ADVANCE)`. Гонка: другий паралельний запит після `FOR UPDATE` бачить уже витрачений XP.
- Гейт: власник листа або ДМ (`requireCharacterAccess`); система кампанії має бути `wfrp` (інакше 409). Відповідь — оновлені `characteristics` (дельта).
- Прямі правки `characteristics` через `patch`/`CharacteristicsEditor` залишаються доступними ДМ; вони не пишуть у леджер (відомий розрив, див. «Межі»).
- Приватність (Р6): у відповідях читання листа (`read-sheet.ts`, `get.ts`, `list.ts`) для не-власника не-ДМ `ledger` замінюється на `[]`; тест на кожен шлях читання.

### 4. Таланти в бою

- `wfrp/progression/talent-groups.ts`: `talentGroups(characteristics.talents, featsById)` → `{ source, abilities }[]`; ранг — через наявний `scale` групи, якщо DSL його підтримує (інакше група повторюється `rank` разів; рішення в плані після читання `collectModifiers`).
- `from-character.ts`: для `rules.system.key === "wfrp"` додає ці групи до решти; гілка homm/dnd5e без змін, `feats: classMode ? … : []` не чіпаємо.

### 5. UI

- Вкладка «Розвиток» на wfrp-листі (`components/systems/wfrp/ProgressionTab.tsx`, реєстрація як у `MagicTab`): баланс XP; таблиця 10 характеристик (поточне / advances / ціна наступного / «Купити»); навички (за каталогом, спеціалізації); вибір таланта з каталогу (ціна, ранг/ліміт, `manualText`-підказка); журнал витрат із «Відкотити» для ДМ.
- Хуки: `useAdvance` (`lib/hooks/characters/`, у barrel) для покупки/відкату; компоненти без `fetch`/`@/lib/api/*` (ESLint). Оптимістичного оновлення нема: сервер — істина, відповідь оновлює кеш листа.
- Редактор feats у wfrp-кампаніях (`useFeatForm` + форма): поля `xpCost`/`maxRank`, D&D-специфічні (`type`, рівень, choices) приховані; в інших системах `xpCost`/`maxRank` не показуються.
- Адаптивність: таблиці вміщаються на 375 px; дії — кнопки ≥ 44 px.

### 6. i18n, онбординг

- Namespace `wfrpProgression` у `WFRP_CAMPAIGN_EXTRA` (лише wfrp-кампанії); `scope-size` uk ≤ 105 KB gzip (зараз 103.8 / 83.6 KB; якщо не влізає — розсунути терміни між `wfrpMagic`/`wfrpProgression`, не піднімати ліміт).
- Терміни uk узгоджуються з наявними (Скерування, РУ, Оверкаст, збій магії); нові: «Розвиток», «Досвід», «Талант», «Ранг», «Відкотити». en не ламаємо.
- `whats-new` запис + одна довідкова стаття (`help`), ключі `whatsNew.<id>` у обох `messages/*/whatsNew.json`.

## Межі (свідомо не робиться)

- Кар'єри, тіки, зміна кар'єри і знижки за кар'єрою — 5e-2; створення персонажа — 5e-3; валюта, статус, trappings — 5f.
- Автоперевірка структурних передумов талантів (характеристика ≥ N, інший талант) — не в 5e-1.
- Ціни, ліміти й `xpCost` талантів не звірені з книгою 5e (немає джерела); це дані, ДМ їх редагує.
- Прямі правки `characteristics` ДМ не потрапляють у леджер; відкат такої правки неможливий (`LEDGER_STALE`).
- Заклинання як «таланти» (Lore, Magick) — як є в 5d, не змінюємо.

## Тестування

- Юніти: `cost`, `plan` (баланс, ліміт, ранги, помилки), `undo` (звичайний, застарілий), схеми й дзеркало `readCharacteristics`; `talentGroups`.
- Сервер: `advance`/`advance-undo` — власник, ДМ, чужий гравець (403), чужа кампанія, не-wfrp (409), гонка двох паралельних покупок, відкат; редакція `ledger` на кожному шляху читання.
- e2e `wfrp-progression-e2e.test.ts`: купівля таланта → група здібностей у учасника → змінений бонус у бою.
- Регрес: dnd5e/homm — `from-character` без змін; повний `test:run` один раз наприкінці; live-run (Sonnet, claude-in-chrome; `get_page_text`/`javascript_tool`; змішані герої й юніти; тестові дані видалити; мову Chrome повернути на uk).

## Ризики

- `characteristics` JSON росте (леджер); ліміт 200 і лише-останній-відкат тримають розмір під контролем.
- Розрив «прямі правки ДМ ↔ леджер» (див. «Межі»); зафіксовано, не усунуто.
- `scale` ранга в ability-DSL може не підтримуватись — тоді повтор групи; перевіряється першою задачею плану.
- `battle-sweep` homm/dnd5e не потрібен: спільний пайплайн не змінюється (лише wfrp-гілка в `from-character`).
