# WFRP 5e-3: створення персонажа (d100-генерація)

Гілка `feat/wfrp` (від `2615aa1f9`). Епік не мерджиться в main до завершення (feedback-wfrp-no-main). Дослідження: `docs/superpowers/research/2026-11-03-wfrp-rule-system.md` §4.5.

## Мета

Гравець wfrp створює героя через d100-генерацію WFRP 4e: вид → кар'єра (кидок/вибір) → 10 характеристик (2d10 + база виду) → таланти виду → ім'я, біографія, аватар, цілі. Результат — чернетка `pending`, яку схвалює ДМ (наявний потік `review`). Бонус XP за довіру кидкам автоматичний.

Поза межами: trappings, валюта, статус (5f); контент кар'єр «Grim d100» і шари кар'єр/видів (5g); підтвердження кидків сервером (рішення: клієнт кидає, сервер довіряє й лише валідує діапазони, ДМ усе одно схвалює).

## Рішення (з брейншторму)

1. Покроковий візард з кидками, чернетка `pending`.
2. Дані виду — окрема таблиця `race_profiles` (`raceId` PK, Json `profile`, каскад з видом), **поза шарами й шаблонами** (як кар'єри 5e-2). Колонка в `races` не годиться: `Race` має двійника `RaceBase`, а `bundle`/sync/хеші беруть колонки з Prisma-enum, тож профіль із локальними `careerId`/`featId` поїхав би в шаблони. Шари — 5g.
3. d100-таблиця кар'єр виду й таблиця випадкових талантів лежать у профілі виду (`rollTable` приймає рядки `{ max }`).
4. Бонус XP за кидки — параметри `rules.advancement.creation` (MECHANIC_REGISTRY, DM-редактор), значення — заглушки `verify against 5e book`.
5. Кидки на клієнті, сервер довіряє походженню, перевіряє діапазони.
6. Серверна частина: ті самі URL і `review`, але окремий wfrp-шлях у handler'ах (підхід 2); `route.ts` — диспатчер. Прапорці лише через `RuleSystemDefinition`.

## Reuse before writing

Перевикористовуємо: `rollPercentile`/`rollTable`/`rollDie` (`lib/utils/rules/systems/wfrp/{percentile,tables}`, `lib/utils/common/dice`), `CharacteristicsSchema`/`DEFAULT_CHARACTERISTICS`, `planCareerSet` (5e-2), `rules.advancement` + `MECHANIC_REGISTRY` (5e-1), `lockPlayerDrafts`, `ACTIVE_CHARACTER`, `review`, `useDraftPortraits`/`useDraftAi`/`useRollReveal`/goals з 5e-чернеток, `defineResource` (races), патерн `careerInUse` (`lib/server/content/resources/careers.ts`). Нове потрібне, бо немає: профіль виду, d100-генерація й валідація створення, wfrp-візард (5e-форма заточена під 6 d20-характеристик і класи).

## Дані

- Таблиця `race_profiles` (`raceId` PK → `races` ON DELETE CASCADE, `campaignId`, `profile Json @default("{}")`, `createdAt`/`updatedAt`) — expand-only міграція `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY`. Схема `SpeciesProfile` (`resilience` не входить: у `CharacteristicsSchema` немає куди його зберігати):
  - `mods`: частковий запис по 10 характеристиках (додаток до бази 20; 2d10 додається при кидку);
  - `move`, `fate`, `extraWounds`;
  - `talents: featId[]` (фіксовані), `randomTalents: [{ max, featId }]`, `randomTalentCount`;
  - `careerTable: [{ max, careerId }]` (зростаючі `max`, останній 100).
- `rules.advancement.creation`: `careerBonus { rolled, choice, free }`, `statBonus { rolled, rearranged, free }`, `freeBudget`. У `MECHANIC_REGISTRY`, DM-редактор у `AdvancementEditor`. Існуючі клони без `creation` отримують дефолт (`defaults.ts`).
- Стан героя — наявні `characteristics.{base,advances,move,fate,extraWounds,talents,career}` та `experience` (бонус XP). Нових полів `Character` немає. У леджер бонус не пишеться (леджер для витрат).
- Цілісність: видалення кар'єри або фіта, що стоїть у таблиці будь-якого виду → 409 (аналог `careerInUse`); видалення виду, на який посилається герой, — наявна поведінка.
- Читання профілів: `GET …/race-profiles` (member), запис: `PUT …/races/[raceId]/profile` (DM); `getCachedRaces`, `racesResource` і `updateRaceCascade` не змінюються.

## Чиста логіка `lib/utils/rules/systems/wfrp/creation/`

- `rollCreation(rng, species)` → кар'єра (`rollTable` по `careerTable`, а також другий кидок для `choice`), 10 значень (2d10), випадкові таланти.
- `planDraft({ species, rules, picks })` → `{ characteristics, experience }` або `{ errors: key[] }`. Одна функція для прев'ю на клієнті й перевірки на сервері. Режими:
  - кар'єра: `rolled` (careerId ∈ таблиця виду), `choice` (один з двох кидків ∈ таблиця), `free` (будь-яка кар'єра кампанії, 0 XP);
  - характеристики: `rolled` (значення в `mods+2..20`), `rearranged` (мультимножина збігається з `rolls`), `free` (сума ≤ `freeBudget`, межі виду);
  - таланти: фіксовані + випадкові (∈ `randomTalents`, кількість ≤ `randomTalentCount`);
  - `experience` = сума бонусів режимів; кар'єру ставить `planCareerSet`.
- Хук системи `RuleSystemDefinition.creation?: { planDraft, rollCreation }`; `undefined` у homm/dnd5e.

## Сервер

- `app/api/campaigns/[id]/characters/draft/`: `route.ts` диспатчить за `ruleSystemOf(rules).creation` у `create-wfrp-draft.ts`; те саме для PATCH у `[characterId]/draft` → `patch-wfrp-draft.ts`. Системи без `creation` → 409 `SYSTEM_DRAFTS_UNSUPPORTED`.
- `wfrpDraftSchema` (Zod): `speciesId`, `career { mode, careerId, rolls? }`, `stats { mode, rolls[10], values }`, `talents`, ім'я/біографія/аватар/цілі. Помилки `planDraft` → 400 з ключами, тексти з `lib/constants/api-errors.ts` (uk) + i18n-ключі.
- Створення: `lockPlayerDrafts`, одна чернетка на гравця, `status: pending`, `race = name`, `raceId`, `characteristics`, `experience`, інвентар як у 5e-драфті (`EMPTY_INVENTORY`). Вид без профілю (`{}`) → 422.
- `PUT …/races/[raceId]/profile`: валідація `SpeciesProfile`, посилання `careerId`/`featId` через `assertCampaignRefs` (додається вид `career` + `FOREIGN_CAREER`).
- `lib/api/characters` (wfrp-варіанти draft), `types/characters.ts` (`WfrpDraftInput`).

## Клієнт

- `lib/hooks/characters/useWfrpDraftForm.ts` (кроки, кидки через `rollCreation`, прев'ю `planDraft`, submit); сторінка вибирає форму за хуком системи. Компоненти лише викликають hook і рендерять; `lib/api` не імпортують.
- Кроки: Вид → Кар'єра → Характеристики → Таланти → Ім'я/біографія/аватар/цілі (перевикористання 5e-хуків).
- DM: мінімальне поле профілю виду у формі виду (структуровані поля `mods`/`move`/`fate`/…, таблиці рядками); повний редактор — поза межами.
- i18n: namespace `wfrpCreation` (uk/en), вантажиться лише на сторінці чернетки wfrp-гравця й у формі виду для ДМ; `uk` `scope-size` має ~0 запасу, тому нічого в основний scope.

## Тести

- `creation/`: `rollCreation` з детермінованим `rng`; `planDraft` по кожному режиму (бонуси XP, діапазони, перестановка, бюджет, відхилення, порожні таблиці).
- Сервер: створення й PATCH wfrp-чернетки (успіх, друга чернетка, `careerId` поза таблицею, чужа кампанія, вид без профілю, d20-система без `creation` → 409); `review` без регресій; race resource із `characteristics`; 409 при видаленні кар'єри/фіта з таблиці виду.
- Схеми: `SpeciesProfile`, `rules.advancement.creation` (дефолт для старих клонів).
- Хук `useWfrpDraftForm` (happy-dom); паритет ключів `wfrpCreation` uk/en.
- Live-run (підагент Sonnet): візард на 375 px і десктопі, повний цикл гравець → чернетка → схвалення ДМ.

## Порядок задач

1. Міграція, `SpeciesProfile`, `rules.advancement.creation` (+ registry, defaults, редактор), чиста логіка `creation/`, хук системи, race resource.
2. Сервер: `wfrpDraftSchema`, `create/patch-wfrp-draft`, диспатч, 409-захисти, `lib/api`, типи.
3. Клієнт: `useWfrpDraftForm`, візард, `wfrpCreation`, поле профілю виду, документація (`rule-systems.md`, `characters.md`, STATUS), live-run.

Фінал: одне Opus-рев'ю від `2615aa1f9` з фіксом одним диспатчем, `/simplify` (1–2 агенти).

## Відомі межі й ризики

- Редагування wfrp-чернетки після створення (`PATCH …/draft`) змінює лише ідентичність (ім'я, біографія, аватар, цілі); кидки й вибір механіки фіксуються при створенні (для змін — DM правка профілю).

- Бонуси XP, `freeBudget`, `randomTalentCount` — заглушки `verify against 5e book`.
- Вид без профілю не годиться для створення; офіційні види/таблиці — 5g.
- Клієнт довіряється щодо походження кидків (бонус XP можна підробити); захист — схвалення ДМ.
- Міграція `race_profiles` додається до списку передеплойних міграцій епіку (на prod не виконується).
