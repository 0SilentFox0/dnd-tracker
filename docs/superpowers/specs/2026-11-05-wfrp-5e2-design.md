# WFRP 5e-2: кар'єри (spec)

Частина 5e епіку WFRP ([дослідження](../research/2026-11-03-wfrp-rule-system.md)). 5e-1 ([spec](2026-11-05-wfrp-5e1-design.md)) дала XP-леджер і таланти; **5e-2 (цей spec)** — кар'єри; 5e-3 — створення персонажа. Гілка `feat/wfrp`, без merge/push у main (feedback-wfrp-no-main).

## Мета й успіх

ДМ призначає персонажу кар'єру з 4 рівнів. Покупки в межах кар'єри дешевші за покупки поза нею, кожна нова покупка з переліку поточного рівня дає «тік», а коли тіків достатньо, ДМ піднімає персонажа на наступний рівень. Успіх: призначена кар'єра змінює ціну наступної покупки; відкат покупки знімає її тік; піднятися на рівень без потрібних тіків можна лише явним `force` ДМ; ліміти й числа редагує ДМ у `rules.advancement`.

## Рішення (узгоджено 2026-11-05)

| # | Рішення |
|---|---|
| Р1 | Обсяг A: контент `careers` + кар'єра на персонажі + множник ціни + тіки + підвищення рівня + зміна кар'єри + UI. |
| Р2 | Підвищення рівня і зміна кар'єри — ручні, лише ДМ; сервер перевіряє тіки й підказує, `force` дозволяє обійти. Автоматики (A2) немає. |
| Р3 | Покупка поза кар'єрою дозволена, ціна множиться на `outOfCareerMultiplier` (за замовчуванням 2); персонаж без кар'єри платить базову ціну. |
| Р4 | Числа (`ticksRequired`, множник) — заглушки `verify against 5e book`, як у 5e-1. |
| Р5 | Закриваємо хвости 5e-1: `rules.advancement` у `MECHANIC_REGISTRY`, вкладка «Розвиток» у DM-редакторі профілю. |

## Reuse

- Новий вид контенту за зразком `classes`: `defineResource` (`lib/server/content/resources/classes.ts`, `define-resource.ts`, `ContentKind`), `ReferenceKind` + `lib/cache/reference-data`, `classNameTaken`-подібна перевірка імені, схеми `lib/schemas`, типи `types/`; вручну — `SYNC_TABLE_SCOPES`, `BUNDLE_TABLES`, `IMPORT_SPECS`, `json-schema.ts`, `operations.ts` (OpenAPI/MCP).
- Операції персонажа: `defineCharacterOperation` + `characterRoute` + `registry.ts`, `lockCharacters`, `writeCharacterLog` (`CharacterLogKind`) — як `advance`/`advance-undo` з 5e-1.
- Ядро цін: `wfrp/advancement/{cost,plan,undo,rules,defaults}.ts`; `CharacteristicsSchema`/`readCharacteristics` (`wfrp/characteristics/{schema,keys}.ts`).
- Клієнт: `lib/hooks/characters/useAdvance`, `AdvancementTab`, редактор `classes` як зразок CRUD-сторінки, `MECHANIC_REGISTRY` і sync шаблонів.
- Нове, бо немає аналога: таблиця кар'єр, `career` на листі, множник/тіки в `planPurchase`, операції `career-set`/`career-advance`.

## Дизайн

### 1. Дані

- Міграція `careers_table` (expand-only): таблиця `careers` — `id`, `campaignId`, `name` (унікальне в кампанії), `icon?`, `class?` (група, текст), `tiers Json` (рівно 4), `createdAt/updatedAt`; **`ENABLE ROW LEVEL SECURITY`**, індекс по `campaignId`.
- `CareerTier = { name, status?, characteristics: CharacteristicKey[], skills: string[], talents: featId[], trappings: string[] }`; навички — ключі `SKILL_CATALOG`, таланти — id з `feats`. Посилання перевіряються при записі (`assertCampaignRefs`), як заклинання в класах.
- На листі: `characteristics.career?: { careerId, tier: 1..4, ticks: string[] }`; тік = `"<kind>:<key>"` у межах поточного рівня, без дублів. Відсутнє поле = без кар'єри (бекфіл не потрібен). Оновити `CharacteristicsSchema`, клієнтське дзеркало `readCharacteristics`.
- `LedgerEntry` отримує `tick?: string` (ключ тіка, який додала ця покупка).

### 2. Правила

- `rules.advancement.career = { ticksRequired: [t1, t2, t3], outOfCareerMultiplier }` (дефолти: `[10, 12, 14]`, `2`; рівень 4 — останній, підвищення з нього немає). Розширити `AdvancementRulesSchema`/`WFRP_RULES` і `defaults.ts`.
- `advancement` у `MECHANIC_REGISTRY` (Р5): правила потрапляють у `rulesHashes` і sync шаблонів.

### 3. Рушій (чисті модулі `wfrp/advancement/career/`)

- `inCareer(career, tierDef, kind, key)` → чи пункт входить у перелік поточного рівня.
- `planPurchase` приймає `career?: { state, tierDef }`: якщо кар'єра є й пункт не в переліку — ціна × `outOfCareerMultiplier` (округлення `Math.round`, як `talentCost`); якщо в переліку й тіка ще немає — додає тік у `career.ticks` і `entry.tick`. Без `career` — поведінка 5e-1 без змін.
- `planUndo` знімає `entry.tick` з `career.ticks`, якщо запис містить тік. Якщо кар'єру змінили після покупки (`careerId`/`tier` не збігаються з тими, що були, або тіка вже немає) — тік не чіпаємо, покупка відкочується як у 5e-1.
- `planCareerSet(characteristics, careerId)` → `career = { careerId, tier: 1, ticks: [] }`; `planCareerAdvance(characteristics, rules, { force })` → `tier + 1`, `ticks: []`; помилки: `NO_CAREER`, `MAX_TIER`, `TICKS_MISSING` (без `force`).
- Хук `RuleSystem.advancement` розширюється цими функціями; у homm/dnd5e без змін.

### 4. Сервер

- `careersResource` (`/careers`, `access: list member, item dm`, `invalidates: [ReferenceKind.CAREERS]`, `notFound` у `api-errors.ts`) + CSV/JSON-імпорт (`IMPORT_SPECS`) + sync/bundle + OpenAPI/MCP. Видалення кар'єри, яку мають персонажі, — 409 `careerInUse`.
- Операції `career-set` і `career-advance` (лише ДМ, система кампанії `wfrp`, інакше 409) у `lib/server/characters/operations/`, зареєстровані в `registry.ts`; handler у `core/`: транзакція → `lockCharacters` → `planCareer*` → запис `characteristics` → `writeCharacterLog` (нові `CAREER_SET`, `CAREER_ADVANCE`). Відповідь — оновлені `characteristics`.
- `advance` (5e-1) довантажує кар'єру персонажа й її рівень, передає в `planPurchase`. Видалена кар'єра на листі трактується як «без кар'єри».
- Приватність: `career` бачать усі учасники кампанії (як лист), `ledger` — як у 5e-1.

### 5. UI

- Вкладка «Розвиток»: блок «Кар'єра» — назва, рівень, прогрес `ticks / ticksRequired`, списки поточного рівня з відмітками; ціна в таблицях показує множник і мітку «поза кар'єрою». ДМ бачить кнопки «Призначити кар'єру» і «Підвищити рівень» (з підтвердженням `force`, якщо тіків бракує).
- Сторінка DM «Кар'єри» (список + форма з 4 рівнями) за зразком редактора `classes`; хуки `lib/hooks/careers/` з `keys.ts` і barrel; вибір таланта/навички з каталогів.
- DM-редактор профілю: вкладка «Розвиток» (характеристики/таланти/леджер для ручного виправлення) і редактор `rules.advancement`.
- Компоненти без `fetch`/`@/lib/api/*`; нова `lib/api/careers.ts`. Адаптивність 375 px, кнопки ≥ 44 px.

### 6. i18n, онбординг

- Тексти в `wfrpAdvancement`; `scope-size` uk зараз ≈ 104.5 / 105 KB — перед додаванням тексту звільнити ≥ 1.5 KB, перенісши терміни між `wfrpMagic` і `wfrpAdvancement` (ліміт не піднімаємо).
- Терміни uk: «Кар'єра», «Рівень кар'єри», «Тік», «Поза кар'єрою».
- `whats-new` запис + стаття довідки, ключі `whatsNew.<id>` у обох `messages/*/whatsNew.json`.

## Тести

- Рушій: множник, тік, дубль тіка, undo із тіком і зі зміненою кар'єрою, `career-advance` (ок/`TICKS_MISSING`/`force`/`MAX_TIER`), одночасні покупки.
- Сервер: ресурс (CRUD, ім'я, посилання на feats, `careerInUse`), операції (гейт ДМ, система не wfrp → 409), `advance` з кар'єрою.
- Клієнт: хуки, блок кар'єри, редактор.
- e2e: призначити кар'єру → купити в кар'єрі й поза → набрати тіки → підвищити.
- Регрес: homm/dnd5e без змін (`planPurchase` без кар'єри ідентичний 5e-1); `battle-sweep` не потрібен (бій не чіпаємо).

## Межі (свідомо не робиться)

- Автопідвищення рівня й правила зміни кар'єри (штрафи, між рівнями) — не робимо (Р2).
- Створення персонажа й випадкові таблиці кар'єр — 5e-3; валюта, статус, trappings як предмети — 5f; контент кар'єр шаблону «Grim d100» — 5g.
- Тіки лише від покупок; ручні правки ДМ у `characteristics` тіків не рахують.
- Числа `ticksRequired` і множник не звірені з книгою.
