# WFRP 5h-4: Downtime (spec)

Частина епіку WFRP (`feat/wfrp`, не мерджити в main). Попередні: [5h-1](2026-11-07-wfrp-5h1-design.md), [5h-2](2026-11-07-wfrp-5h2-tables-design.md). Далі: 5h-3 Corruption/мутації, 5g (шаблон, імпорт, sync). Дослідження: [§4.3, §4.8](../research/2026-11-03-wfrp-rule-system.md).

## Мета

ДМ однією дією «Минув період» проводить партію через N днів простою: Wounds загоюються, недуги спливають або загострюються, кожен герой виконує обране заняття (endeavour), а таблиця Character Events дає подію. Гравець обирає заняття на вкладці «Простій» і бачить підсумок. Останній період ДМ може відкотити. Критерій успіху: e2e wfrp-періоду (лікування, дохід у гаманці, недуга, подія, відкат) проходить; у homm/dnd5e немає ні вкладки, ні маршрутів (409).

## Рішення (узгоджено з користувачем 2026-11-08)

- **Обсяг — ядро:** крок «минув період», лікування Wounds, недуги в днях, endeavours, таблиця Character Events.
- **Модель C (гібрид без міграції):** стан простою — ключ `characteristics.downtime` (JSON), кидки лише на сервері. Міграцій і нових таблиць БД немає.
- **Шов:** `RuleSystemDefinition.downtime?` лише у wfrp; homm/dnd5e = `undefined`. Ядро не імпортує wfrp (ESLint-правило з [rule-systems.md](../../architecture/rule-systems.md)).
- **Дохід** — через наявну грошову операцію інвентарю (`gain` → `InventoryLogKind.MONEY_GAIN`), без нової операції `creditCp`.
- **Усі числа** — заглушки `// verify against 5e book`, записуються в єдиний перелік «Звірити з книгою» в `rule-systems.md`.
- **Поза межами:** леджер постійних травм/ампутацій після критів, Corruption (5h-3), шаблонний контент (5g), звірка чисел із книгою (немає джерела).

## Що перевикористовуємо і чому нове потрібне

Перевірено в коді (2026-11-08):

| Наявне | Як використовуємо | Чому цього мало |
|---|---|---|
| `restParty` (`lib/server/characters/core/rest-handler.ts`) | Зразок period-обробника: `findMany` активних героїв кампанії → `assertNotInActiveBattle` → `$transaction` + `lockCharacters` → `writeCharacterLog`; `applyWorldRest` (`lib/server/world/rest.ts`) лише делегує в нього | `restParty` пише тільки `resources` і не має кидків, грошей і знімка відкату; змішувати d20-відпочинок із downtime не варто — окремий обробник за тим самим каркасом |
| `lockCharacters` (`lib/server/characters/lock.ts`) | `FOR UPDATE` по `characters`, повертає `resources`, `experience`, `characteristics` | Не блокує гаманець: він у `character_inventory` (див. «Дохід») |
| `assertNotInActiveBattle` (`lib/server/characters/battle-lock.ts`) | Перевірка «не в активному бою» для PUT і period | Кидає `CHARACTER_IN_BATTLE`; додаємо необов'язковий параметр тексту помилки, щоб віддати `DOWNTIME_IN_BATTLE` |
| `writeCharacterLog` (`lib/server/characters/log.ts`) | Журнал з новим `CharacterLogKind.DOWNTIME` | — |
| `resolveTable`/`rollSlot`/`rowText` (`wfrp/tables/resolve.ts`), `DEFAULT_TABLES`, `TablesRulesSchema` | Подія = восьмий слот `downtimeEvent` | Слота немає; додається |
| `TablesSection` (`components/rules/sections/TablesSection.tsx`) | Редагування таблиці подій без нового UI: слот з'являється в селекторі (`TABLE_SLOTS`), ефекти — `SLOT_EFFECTS` | — |
| `stripPlayerHiddenRules` (`lib/utils/rules/player-hidden.ts`) | Уже вирізає весь `rules.tables` для не-ДМ, отже й новий слот | — |
| `resolvePercentileTest` (`wfrp/percentile/resolve.ts`), `skillTarget`/`bonus`/`value` (`wfrp/characteristics/derive.ts`) | Усі тести простою (Trade/Charm, Research, Heal, Endurance) | — |
| Патерн `advance-undo` (`wfrp/advancement/undo.ts`, `ADVANCE_LEDGER_STALE`) | Відкат лише останнього, 409 при ручних змінах після нього | Леджер XP не підходить для періоду; окремий знімок `lastPeriod` |
| `preserveServerOwned`/`redactLedger` (`wfrp/advancement/privacy.ts`), `reconcileCharacteristics` (`lib/server/characters/operations/patch.ts`) | Захист серверних полів і приватність | Потрібно розширити на `downtime` (див. «Дані») |
| `applyStashAction(state, {action:"gain"})` + `writeInventoryLog` (`lib/utils/inventory/stash-actions.ts`, `lib/server/inventory/log.ts`), `currencyValueOf` | Нарахування доходу з журналом `MONEY_GAIN`, переповнення → `MONEY_OVERFLOW` | `gainAction` приватна, а `loadStashState` — приватна в `stash-update.ts`; виносимо `loadStashState` у спільний модуль |
| `characterBaseHp` (`lib/utils/characters/hero-hp.ts`), `withHp`/`currentHp` (`resources/hp.ts`) | Кап лікування = те саме число, що бачать лист і бій | `woundsMax` із `derive.ts` не враховує модифікаторів, що проходять через `progression.maxHp` |
| `characterKeys` (`lib/hooks/characters/keys.ts`), `useCrudMutation` | Ключі й мутації хуків downtime | Нова фабрика ключів не потрібна |
| `defineCharacterOperation`/`characterRoute`/`campaignGate` (`lib/server/characters/operation-runner.ts`), `CHARACTER_OPERATIONS` | Маршрути (так зроблено `rest`, `advance`); операції доступні асистенту/MCP | — |

## Дані

### Схема

`wfrp/downtime/schema.ts`, вбудовується в `CharacteristicsSchema` як `downtime: DowntimeSchema.optional()`. `CharacteristicsSchema` — `z.object`, тож без явного поля ключ відсікається. Те саме стосується рукописного дзеркала `readCharacteristics` (`wfrp/characteristics/keys.ts`, без zod для клієнта): додаємо `readDowntime(raw.downtime)`. Невалідне значення → `undefined` (поводиться як «простою ще не було»).

```ts
type DowntimeState = {
  endeavour?: Endeavour;
  ailments: Ailment[];          // ≤ 20
  training?: TrainingCredit;    // знижка від успішного train, ще не використана
  lastPeriod?: PeriodSnapshot;
};
type Ailment = { id: string; kind: "festering" | "disease" | "injury"; daysLeft: number /* 1..365 */; label: string /* ≤ 80 */ };
type Endeavour =
  | { kind: "earn"; params: { skill: "trade"; spec: string } | { skill: "charm" } }
  | { kind: "train"; params: { kind: "characteristic" | "skill"; key: string } }
  | { kind: "tend"; params: { patientId: string } }
  | { kind: "rest"; params: {} }
  | { kind: "custom"; params: { text: string /* ≤ 200 */ } };
type TrainingCredit = { kind: "characteristic" | "skill"; key: string; discount: number };
type PeriodSnapshot = {
  id: string; at: string; days: number;
  before: { hp?: number; ailments: Ailment[]; training?: TrainingCredit };
  after: { hp?: number; ailmentIds: string[]; training?: TrainingCredit };
  coins?: { coin: Coin; amount: number };
  summary: PeriodSummary;
};
type PeriodSummary = {
  skipped?: "dead" | "incapacitated";
  healed: number;
  endeavour?: { kind: Endeavour["kind"]; test?: TestOutcome; coins?: { coin: Coin; amount: number }; discount?: number; patientId?: string };
  ailments: { id: string; label: string; kind: Ailment["kind"]; daysLeft: number; expired?: boolean; test?: TestOutcome; wounds?: number }[];
  event?: { roll: number; index: number; text: LogLine; wounds?: number; conditions: { key: WfrpConditionKey; levels: number }[] };
};
type TestOutcome = { roll: number; target: number; sl: number; outcome: PercentileOutcome };
```

`hp` у знімку дзеркалить `resources.hp` (відсутній = повні Wounds, як у `withHp`).

### Хто що змінює

- Endeavour — лише через `PUT …/downtime` (власник або ДМ). Обране заняття лишається між періодами, доки його не змінять або не знімуть (`null`).
- `ailments` — лише ДМ (той самий PUT, поле `ailments`; новим записам без `id` сервер дає `randomUUID`), а також сервер у періоді.
- `training`, `lastPeriod` — лише сервер (період, відкат, `advance`).
- PATCH персонажа `downtime` не змінює ні для кого: `preserveServerOwned` додає `downtime: existing.downtime` (гравець), а гілка ДМ у `reconcileCharacteristics` також повертає `{ ...incoming, downtime: stored.downtime }` — інакше збереження редактора ДМ із застарілою формою затерло б результат періоду.
- Приватність: `redactLedger` (перейменувати на `redactPrivate` або розширити) прибирає `downtime` для не-власника й не-ДМ у `list`; `wfrpAbilitiesOf` (`wfrp/combat/participant.ts`) не копіює `downtime` в учасника бою (як уже не копіює `ledger`).

### Журнал

`CharacterLogKind.DOWNTIME = "downtime"`; `data` = `{ periodId, days, summary }` або `{ periodId, undo: true }`, рядок у `describe-log.ts` (`rest.log.downtime` / `rest.log.downtimeUndo`, текст у `rest`). Дохід додатково пишеться в журнал інвентарю (`MONEY_GAIN`, `note` = текст `wfrpDowntime.log.income`).

## Рушій (чисті функції, `wfrp/downtime/`)

- `constants.ts` — усі числа, кожне з `// verify against 5e book`: `MAX_DAYS = 30`, `REST_HEAL_MULTIPLIER = 2`, `TEND_HEAL_PER_SL = 1` (мін. 1 при успіху), `TEND_DAYS_PER_SL = 1`, `FESTERING_FAIL_WOUNDS = 2`, `FESTERING_RENEW_DAYS = 7`, `TRAIN_DISCOUNT_BASE = 5`, `TRAIN_DISCOUNT_PER_SL = 5`, `EARN_STATUS_DEFAULT = { tier: "brass", level: 1 }`, ставки статусу `STATUS_COIN = { brass: "cp", silver: "sp", gold: "gp" }`, `ENDEAVOUR_DIFFICULTY = "challenging"`.
- `endeavours.ts` — каталог `ENDEAVOURS: Record<kind, { test?: { skill, spec? } | "byParams"; resolve }>`:
  - `earn` — тест Trade (спеціалізація з `params.spec`, `open`) або Charm (basic). Дохід = `max(1, SL) × status.level` монет `STATUS_COIN[status.tier]`; провал — 0. Статус — з `status` поточного рівня кар'єри (`CareerTier.status`, вільний рядок; парсер `parseStatus("Silver 3")` → `{tier, level}`), без кар'єри або непарсабельний → `EARN_STATUS_DEFAULT`.
  - `train` — тест `research` (Int, advanced). Learning-навички в каталозі `wfrp/skills/catalog.ts` немає. Успіх → `training = { kind, key, discount: TRAIN_DISCOUNT_BASE + SL × TRAIN_DISCOUNT_PER_SL }` (замінює попередній). Прямого XP немає.
  - `tend` — лікар кидає Heal (int, advanced) на `params.patientId`; успіх → пацієнту `+max(1, SL) × TEND_HEAL_PER_SL` Wounds і `−max(1, SL) × TEND_DAYS_PER_SL` днів найближчій недузі (найменший `daysLeft`). Пацієнт має бути серед `characterIds` періоду, інакше заняття пропускається з позначкою.
  - `rest` — без тесту, природне лікування × `REST_HEAL_MULTIPLIER`.
  - `custom` — без тесту й механіки, текст іде в підсумок.
  - Нетренована advanced-навичка (Research, Heal, Trade без просувань) — заняття не можна обрати: PUT → 409 наявний `SKILL_UNTRAINED` (`skillTarget(...).trained`).
- `healWounds({ current, max, tb, days, multiplier, bonus })` → нове значення: `current + tb × days × multiplier + bonus`, кап `max`; мертвий не лікується (перевіряє обробник).
- `tickAilments(ailments, days, { rng, endurance })` → `{ ailments, report, wounds }`: `daysLeft −= days`; спливла `disease`/`injury` — знімається; спливла `festering` — тест Endurance (T): успіх — знімається, провал — `−FESTERING_FAIL_WOUNDS` Wounds і `daysLeft = FESTERING_RENEW_DAYS`.
- `resolveEndeavour(endeavour, ctx)` — `ctx = { characteristics, career status, rng, presetRoll? }`, d100 через `resolvePercentileTest` (складність `ENDEAVOUR_DIFFICULTY`, дублі не рахуються як у тесті з листа). Повертає `{ test?, coins?, training?, tend? }`.
- `rollEvent(rules, rng, preset?)` = `rollSlot(rules, "downtimeEvent", …)` → `{ roll, index, text: rowText(row), wounds, conditions }`. Ефект `wounds` віднімає Wounds (мін. 0, смерті поза боєм немає). Ефект `condition` поза боєм ніде не зберігається (у персонажа немає станів поза боєм): він лише показується в підсумку й журналі, ДМ накладає його в бою вручну.
- `planPeriod(input)` — чиста композиція для одного героя (порядок нижче), повертає нові `resources`, `downtime`, `coins`, `summary`, `snapshot`. Обробник лише вантажить/пише.

Порядок на героя: (1) мертвий (`resources.dead`) — пропуск усього, `skipped: "dead"`; (2) 0 Wounds — `skipped: "incapacitated"`: заняття не виконується (лікар теж не лікує інших), лікування, недуги й подія — так; (3) заняття всіх героїв (вклад `tend` у пацієнтів рахується першим); (4) лікування; (5) недуги; (6) подія.

### Слот `downtimeEvent`

- `TABLE_SLOTS` += `"downtimeEvent"`; `SLOT_EFFECTS.downtimeEvent = ["wounds", "condition"]`; `DEFAULT_TABLES.downtimeEvent` — 10 рядків по 10 (`textKey: "wfrpDowntime.events.N"`, більшість без ефектів, 2–3 з `wounds 1..2`/`condition`), `// verify against 5e book`.
- Невалідна секція → `parseRules` уже повертає `{}` → дефолт (вимога «невалідна таблиця → дефолт» виконується наявним механізмом).
- Підпис слота — `wfrpTables.slots.downtimeEvent` (uk/en).
- Бюджет OpenAPI: `rules.tables` 7 слотів ≈ 7.2 KB, слот ≈ 1 KB → доку ≈ 191.3 KB при ліміті 192 000; піднімаємо до 194 000 у трьох тестах (`openapi.test.ts`, `openapi-4f2.test.ts`, `openapi-4f4.test.ts`) з виміряним числом у коментарі.

### Знижка `train` у леджері

`planPurchase` (`wfrp/advancement/plan.ts`) отримує `training?: TrainingCredit`; якщо `kind:key` покупки збігається, ціна = `max(0, cost − discount)`, запис леджера отримує `discount` (нове необов'язкове поле `LedgerEntrySchema` і `readLedger`), а `training` знімається. `planUndo` повертає `training` із запису. `advance-handler` передає `locked.characteristics.downtime?.training`.

## Сервер

Шар: route (лише реекспорт операції) → операція (`defineCharacterOperation`, zod-схема, гейт) → обробник `lib/server/characters/core/downtime-handler.ts` → чисті функції через `ruleSystemOf(rules).downtime`.

### Хук системи

```ts
interface RuleSystemDowntime {
  planPeriod: typeof planPeriod;
  validateEndeavour: (e: Endeavour, c: Characteristics) => "SKILL_UNTRAINED" | null;
  maxDays: number;
}
```

`RuleSystemDefinition.downtime?: RuleSystemDowntime`; wfrp — `WFRP_DOWNTIME`, d20 — відсутній. Рядок у таблиці «Реєстр і хуки».

### Маршрути

| Метод і шлях | Операція | Доступ | Тіло |
|---|---|---|---|
| `PUT /api/campaigns/[id]/characters/[characterId]/downtime` | `downtime.set` (`operations/downtime.ts`) | власник або ДМ (`requireCharacterAccess`, як `advance`) | `{ endeavour: Endeavour \| null, ailments?: Ailment[] }`; `ailments` від не-ДМ → 403 |
| `POST /api/campaigns/[id]/downtime/period` | `downtime.period` (`operations/downtime-period.ts`) | ДМ (`campaignGate`, як `rest`) | `{ days: int, characterIds: string[] (1..50) }` (межа днів — в обробнику) |
| `POST /api/campaigns/[id]/downtime/period-undo` | `downtime.period-undo` | ДМ | `{ periodId: string, characterIds: string[] }` |

Відхилення від шаблону CLAUDE.md «route = parseBody + requireDM»: персонажні маршрути проєкту йдуть через `operation-runner` (схема + гейт), тож так само; операції реєструються в `CHARACTER_OPERATIONS` і в `lib/server/assistant/actions/character-coverage.ts` (тест `coverage.test.ts`).

### Period

1. `downtime` системи відсутній → 409 `DOWNTIME_UNSUPPORTED`; `outOfCombat.persistResources` вимкнено → 409 наявний `OOC_RESOURCES_DISABLED`.
2. `findMany` активних героїв кампанії за `characterIds` (не всі знайдені → 400 `REST_CHARACTERS_INVALID`), `assertNotInActiveBattle(…, API_ERRORS.DOWNTIME_IN_BATTLE)`.
3. Поза транзакцією: правила (`campaign.rules`), кар'єри героїв (статус рівня) і `characterBaseHp` для капа.
4. `$transaction`: `lockCharacters(ids)`; для героїв із доходом — `lockCampaignArtifacts` (той самий advisory-лок, що бере `stash-update`, тож паралельна дія з гаманцем чекає) і `loadStashState(tx, id)`; `planPeriod` для всіх; запис `resources` і `characteristics` (`characteristicsJson`); дохід — `applyStashAction(state, { action: "gain", amount, coin, note }, { newItemId })`, запис лише `gold/silver/copper`, `writeInventoryLog`; `MONEY_OVERFLOW` → 409 і відкат усього періоду; `writeCharacterLog` (`DOWNTIME`, також для пропущених — з позначкою).
5. Відповідь — дельта: `{ periodId, characters: { id, resources, downtime, purse? }[] }`.

`loadStashState` переноситься з `stash-update.ts` у `lib/server/characters/core/stash-state.ts` (імпортують обидва).

### Period-undo

Під тими ж локами для кожного героя: `lastPeriod?.id !== periodId` → 409 `DOWNTIME_STALE`; стан змінився після періоду (`resources.hp ≠ after.hp`, набір id недуг ≠ `after.ailmentIds`, `training ≠ after.training`) → `DOWNTIME_STALE`; дохід повертається `spendCoins(purse, amount, coin, currencyValueOf(rules))` — не вистачає (гравець уже витратив) → `DOWNTIME_STALE`. Перевірка всіх героїв до запису: або відкочується весь період, або нічого. Відновлення: `hp`, `ailments`, `training` з `before`; `lastPeriod` видаляється (відкат лише одного періоду); журнали `DOWNTIME {undo}` і `MONEY_SPEND`.

### Помилки

`lib/constants/api-errors.ts` (ключі `errors.*`, тексти uk/en): `DOWNTIME_UNSUPPORTED` 409, `DOWNTIME_IN_BATTLE` 409, `DOWNTIME_DAYS_INVALID` 400 (zod-схема перевіряє лише ціле число; межу 1..`downtime.maxDays` перевіряє обробник і кидає `ContentError` з цим кодом, бо `parseBody` віддає загальний `INVALID_BODY`), `DOWNTIME_STALE` 409. Решта — наявні: `SKILL_UNTRAINED`, `OOC_RESOURCES_DISABLED`, `REST_CHARACTERS_INVALID`, `MONEY_OVERFLOW`, `FORBIDDEN`.

## Клієнт

- `lib/api/downtime.ts`: `putDowntime`, `postDowntimePeriod`, `postDowntimePeriodUndo`; типи — `types/downtime.ts` (контракти відповіді; доменні типи стану — з `wfrp/downtime` через `@/lib/utils/rules/systems`).
- Хуки `lib/hooks/characters/useDowntime.ts` (у барелі): `useDowntime(campaignId, characterId)` — `setQueryData` у `characterKeys.detail`, інвалідація `sheet`/`log`; `useDowntimePeriod(campaignId)` — дельта в `detail` кожного героя, інвалідація `lists`, `logs`, `stashes`, `inventoryLogs`. Ключі — наявні фабрики `characterKeys`.
- Вкладка листа «Простій»: слот `SystemUi.DowntimeTab?` (`components/systems/wfrp/downtime/DowntimeTab.tsx`), `CharacterProfile.viewTabs` додає її для власника/ДМ, якщо слот є. Вміст: вибір заняття (тип + параметри: спеціалізація Trade, ціль тренування, пацієнт), список недуг (ДМ: додати/видалити/змінити дні), підсумок `lastPeriod.summary`.
- Панель ДМ «Минув період» поруч із «Нова сесія» у `PartyRestActions` (показ лише за `system.downtime`): діалог (дні, вибір героїв; за замовчуванням — усі активні герої партії) → підсумок по героях + кнопка «Відкотити період».
- Приватність: гравець бачить свої заняття, недуги й підсумок (у т.ч. текст випалої події), але не таблицю подій (вирізана `stripPlayerHiddenRules`).

## i18n і онбординг

- Новий namespace `wfrpDowntime` (uk/en): вкладка, заняття, недуги, підсумок, тексти дефолтних подій, панель ДМ.
- Виміряно 2026-11-08 (`scope-size.test.ts`, uk gzip): учасник wfrp 106.2 / ліміт 107 (запас 0.8 KB), ДМ 110.1 / 111 (запас 0.9 KB); en 85.6 / 88.7. Окремі wfrp-namespace займають ≈ 0.7 KB gzip (`wfrpTables` 701 B, `wfrpAdvancement` 692 B), `wfrpDowntime` з 10 подіями оцінюється в ≈ 1.0–1.3 KB — не вміщається в запас учасника.
- Пропозиція: `wfrpDowntime` (те, що бачить гравець) → `WFRP_MEMBER_EXTRA`, панель ДМ і редагування недуг → `wfrpDowntimeDm` у `WFRP_DM_EXTRA`; ліміти `WFRP_MEMBER_LIMIT_KB` 107 → 108, `WFRP_DM_LIMIT_KB` 111 → 113 з фактичними числами в коментарі після вимірювання в плані. Альтернатива без підйому ліміту — підвантажувати `wfrpDowntime` лише на сторінці персонажа/ДМ-персонажів (`ExtendLocaleScope` на рівні сторінки) з окремим рядком у `scope-size`; рішення — питання до користувача.
- Динамічні ключі (`wfrpDowntime.events.N`, `endeavours.<kind>`, `ailments.<kind>`, `wfrpTables.slots.downtimeEvent`) — у `label-keys-rule-systems.test.ts`.
- What's new `2026-11-08-wfrp-downtime` (audience `all`, href `/help/dm-rule-systems`) + `whatsNew.<id>` в обох `messages/*/whatsNew.json`; розділ «Простій» у довідковій статті `dm-rule-systems`.

## Тести

- Чисті: `healWounds` (кап, нуль днів, множник `rest`, бонус лікаря); `tickAilments` (спад, зняття, festering успіх/провал з `presetRoll`); `resolveEndeavour` для кожного kind — успіх/провал/критичний/дубль (`presetRoll`), `earn` для Trade/Charm і статусів brass/silver/gold/дефолт; `rollEvent` — дефолт, кастомний рядок, невалідна секція → дефолт; `planPeriod` — мертвий, 0 Wounds, пацієнт поза періодом, порядок кроків; `parseStatus`.
- Схема: `DowntimeSchema` межі, `readDowntime` ≡ zod на тих самих фікстурах (як `guard.test`), `preserveServerOwned` і гілка ДМ `reconcileCharacteristics` зберігають `downtime`, `redact` ховає `downtime` для чужих, `wfrpAbilitiesOf` без `downtime`.
- Леджер: знижка `train` застосовується лише до збіжного `kind:key`, не нижче 0, відкат покупки повертає `training`.
- Сервер (`lib/server/characters/__tests__/wfrp-downtime-e2e.test.ts` за зразком `wfrp-careers-e2e.test.ts` — файлу `wfrp-tables-e2e` у репозиторії немає): PUT (власник/ДМ/чужий, `ailments` від гравця 403, нетренована навичка 409, у бою 409); period (транзакція, `resources`/`characteristics`/гаманець, `MONEY_GAIN` і `DOWNTIME` у журналах, пропущені герої, днів 0/31 → 400); period-undo (успіх, повторний → `DOWNTIME_STALE`, зміна HP або витрачені гроші → `DOWNTIME_STALE` без часткового запису).
- Регрес homm/dnd5e: `downtime` у реєстрі відсутній, маршрути → 409 `DOWNTIME_UNSUPPORTED`, вкладки й панелі немає (`registry.test.tsx`, `PartyRestActions`).
- Бюджети: `scope-size`, три OpenAPI-тести, `coverage.test.ts` асистента.

## Декомпозиція (для плану)

1. Схема `downtime` (zod + `readDowntime`), `preserveServerOwned`/`reconcileCharacteristics`/редакція/`wfrpAbilitiesOf`, `CharacterLogKind.DOWNTIME` + `describe-log`, коди помилок.
2. Чисті функції `wfrp/downtime/` (constants, endeavours, heal, ailments, event, planPeriod), слот `downtimeEvent` (схема, дефолти, `SLOT_EFFECTS`, підпис у `TablesSection`), знижка `train` у `planPurchase`/`planUndo`, OpenAPI-бюджет.
3. Хук `RuleSystemDowntime`, винесення `loadStashState`, параметр помилки в `assertNotInActiveBattle`, обробники PUT/period/period-undo, операції й маршрути, `CHARACTER_OPERATIONS` + coverage, `lib/api/downtime.ts`, хуки, `types/downtime.ts`.
4. UI: `DowntimeTab`, панель «Минув період» і діалог підсумку/відкату, namespace(и) `wfrpDowntime`.
5. i18n uk/en, `scope-size`, what's new, довідка, e2e, docs «Межі 5h-4» і «Звірити з книгою» в `rule-systems.md`, `docs/STATUS.md`.

Контролер: `/simplify`, повний `pnpm test:run` один раз наприкінці, `eslint` лише змінених файлів (не repo-wide), live-run, фінальне Opus-рев'ю.

## Перше завдання плану

Перевірити всі місця, де `characteristics` персонажа йде клієнтам або в бій (list/get/sheet, SSR-prefetch сторінки персонажа, `participantFields`, `refresh-from-source`, експорт кампанії), щоб `downtime` не витік чужим гравцям і не потрапив у знімки бою.

## Звірити з книгою

Усі числа `wfrp/downtime/constants.ts`, дефолтна таблиця `downtimeEvent`, формула доходу за статусом, перелік і тести endeavours, механіка festering/disease — `verify against 5e book`; рядок у єдиному переліку `rule-systems.md`.
