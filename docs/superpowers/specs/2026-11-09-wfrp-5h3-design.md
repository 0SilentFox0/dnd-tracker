# WFRP 5h-3: Corruption і мутації (spec)

Частина епіку WFRP (`feat/wfrp`, не мерджити в main). Попередні: [5h-2 таблиці](2026-11-07-wfrp-5h2-tables-design.md), [5h-4 простій](2026-11-08-wfrp-5h4-design.md). Далі: 5g (шаблон, імпорт, sync). Дослідження: [§4.5](../research/2026-11-03-wfrp-rule-system.md) (Corruption: пороги за WPB/TB, таблиці мутацій).

## Мета

ДМ нараховує герою пункти порчі однією дією. Якщо сума перевищила поріг (TB + WPB), сервер кидає Endurance; при провалі кидає тип мутації та рядок таблиці й додає постійну мутацію з механічними ефектами. Гравець бачить свої пункти, поріг і мутації на листі. Критерій успіху: e2e (нарахування нижче порогу → вище порогу з провалом → мутація змінює характеристики/Wounds/Move → undo) проходить; у homm/dnd5e немає ні блоку, ні маршрутів (409).

## Рішення (узгоджено з користувачем 2026-11-09; решту обрано за рекомендаціями, «підправимо на практиці»)

- **Джерела — лише вручну (A):** ДМ нараховує пункти з причиною (як Sin). Автоджерел у рушії немає.
- **Ефекти мутацій структуровані (B):** рядок несе текст і до 3 ефектів `characteristic{key,amount}`, `move{amount}`, `maxWounds{amount}`.
- **Тест автоматичний (A):** одна дія `corruption.grant` робить нарахування, тест і мутацію в одній транзакції.
- **Тип мутації:** d100, 1–50 фізична, 51–100 ментальна; далі кидок рядка відповідної таблиці.
- **Після мутації пункти лишаються (B):** кожне наступне нарахування, поки сума > порогу, знову тестує.
- **Приватність (A):** гравець бачить власні пункти, поріг, мутації; таблиці й журнал порчі — лише ДМ і власник.
- **Без міграції:** стан у `characteristics.corruption` (JSON). Таблиці — у `rules.tables`.
- Усі числа (поріг, складність тесту, межі нарахування, дефолтні рядки таблиць) — заглушки `// verify against 5e book` і запис у «Звірити з книгою» в `rule-systems.md`.

**Поза межами:** автоджерела в бою (miscast Chaos, Trait юніта), зняття порчі/мутацій (Fate, простій), порча NPC/юнітів, Dissolution, позначка мутації на токені, шаблонний контент і sync (5g).

## Що перевикористовуємо

| Наявне | Як використовуємо |
|---|---|
| `lib/utils/rules/tables-schema.ts` (`TABLE_SLOTS`, `SLOT_EFFECTS`, `EffectSchema`, `slotRows`), `wfrp/tables/{defaults,resolve,roll-table}.ts` | Два нові слоти `mutationPhysical`/`mutationMental`, нові типи ефектів; `rollSlot`/`rowText`/`DEFAULT_TABLES` без змін API |
| `components/rules/sections/TablesSection.tsx` | Слоти з'являються в селекторі через `TABLE_SLOTS`; редактор ефектів розширюється трьома типами |
| `stripPlayerHiddenRules` | Уже вирізає весь `rules.tables` для не-ДМ — нові слоти покриті |
| `wfrp/downtime/{schema,read,types}.ts` | Зразок «ключ у `characteristics`, ручний `readX` для клієнта + `z.custom` у схемі» |
| `lib/server/characters/operations/downtime*.ts`, `core/downtime-handler.ts`, `defineCharacterOperation`/`characterRoute`/`campaignGate` | Каркас операцій; `lockCharacters`, `assertNotInActiveBattle`, `writeCharacterLog` |
| `PeriodSnapshot` + `DOWNTIME_STALE` + `undo` у `downtime-period-undo.ts` | Патерн відкату лише останнього з 409 при ручних змінах після нього |
| `preserveServerOwned` (`wfrp/advancement/privacy.ts`), `reconcileCharacteristics` (`operations/patch.ts`) | Клієнт не може писати `corruption` через PATCH персонажа; розширюємо |
| `resolvePercentileTest` (`wfrp/percentile/resolve.ts`), `skillTarget(c,"endurance")` | Тест Endurance |
| `bonus`/`value`/`woundsMax`/`walkYards` (`wfrp/characteristics/derive.ts`) | Єдина точка для модифікаторів мутацій |
| `ExtendLocaleScope` + `wfrpDowntime` як зразок namespace | `wfrpCorruption` посторінково |
| Sin (`resources.sin`, 5d-3) | Лише як зразок «редагує ДМ, бачить гравець»; не змішуємо, окремий ключ |

Нове потрібне, бо Corruption у коді відсутній (є лише згадки в docs); ефектів «постійний модифікатор характеристики» у `TableEffect` немає (є `damage|wounds|condition|marker`).

## Дані

`wfrp/corruption/schema.ts`, вбудовується в `CharacteristicsSchema` як `corruption: z.custom<CorruptionState>(v => readCorruption(v) !== undefined).optional()`; ручне дзеркало `readCorruption` у `wfrp/corruption/read.ts` (+ виклик у `readCharacteristics`, `keys.ts`). Невалідне → `undefined` (як «порчі ще не було»).

```ts
type CorruptionState = {
  points: number;               // 0..999
  mutations: Mutation[];        // ≤ 20
  last?: GrantSnapshot;
};
type Mutation = {
  id: string; at: string;
  kind: "physical" | "mental";
  roll: number;                 // d100 рядка
  text: string;                 // ≤ 200, зафіксований у момент кидка (переклад ключа дефолту)
  effects: MutationEffect[];    // ≤ 3, копія з рядка таблиці
};
type MutationEffect =
  | { type: "characteristic"; key: CharacteristicKey; amount: number }  // -30..30, не 0
  | { type: "move"; amount: number }                                    // -3..3
  | { type: "maxWounds"; amount: number };                              // -10..10
type GrantSnapshot = {
  id: string; at: string; reason: string;           // ≤ 80
  before: { points: number };
  after: { points: number; mutationId?: string };
  summary: GrantSummary;
};
type GrantSummary = {
  points: number; total: number; threshold: number;
  test?: TestOutcome;                               // є, лише якщо total > threshold
  mutation?: { kind: "physical" | "mental"; typeRoll: number; roll: number; text: LogLine; effects: MutationEffect[] };
};
```

Модифікатори: `modifiersOf(c.corruption)` → `{ characteristics: Partial<Record<CharacteristicKey, number>>, move, maxWounds }`. `value(c,key)` додає `mods.characteristics[key]`, `woundsMax` — `mods.maxWounds`, `walkYards`/`runYards` — `mods.move`; мінімум 1 для характеристики/Move, 1 для Wounds. Поріг `corruptionThreshold(c) = bonus(c,"t") + bonus(c,"wp")` рахується з ефективних характеристик (мутація може його змінити). Збережених похідних немає — завжди з `mutations`.

## Рушій `wfrp/corruption/`

- `constants.ts`: `CORRUPTION_TEST_SKILL = "endurance"`, `CORRUPTION_TEST_DIFFICULTY`, `GRANT_MAX = 10`, `PHYSICAL_MAX_ROLL = 50`, `MUTATIONS_MAX = 20`. Усі `// verify against 5e book`.
- `threshold.ts`: `corruptionThreshold(c)`.
- `modifiers.ts`: `modifiersOf(state)`, `applyMutationEffects`.
- `plan-grant.ts`: `planGrant(input: {characteristics, rules, points, reason, rng, id, at}): { state: CorruptionState; summary: GrantSummary }`. Чиста функція: `total = points + p0`; якщо `total <= threshold` → без тесту; інакше `resolvePercentileTest` (Endurance по ефективних характеристиках); при провалі `typeRoll = rng d100`, `kind`, `rollSlot(rules, slot, rng)`, копіювання ефектів/тексту, `mutations.length >= MUTATIONS_MAX` → мутація не додається, summary позначає `capped`.
- `undo.ts`: `planUndo(state, snapshotId)` → повертає `before`, або `STALE`, якщо `points`/`mutations` змінилися після `last`.
- `index.ts`: `WFRP_CORRUPTION`. Шов: `RuleSystemDefinition.corruption?` лише у wfrp; homm/dnd5e = `undefined`. Ядро не імпортує wfrp (ESLint).

## Таблиці

`TABLE_SLOTS += mutationPhysical, mutationMental`. `TableEffect += characteristic | move | maxWounds`; `SLOT_EFFECTS` для нових слотів: `["characteristic","move","maxWounds"]`; для решти слотів нові типи заборонені. `EffectSchema` розширюється `strictObject`-варіантами; `amount` у нових типах — окремі діапазони зі знаком (не `1..20` як у наявних). `DEFAULT_TABLES`: по ~6 рядків на таблицю, тексти — ключі `textKey` в `messages/*/` (чи `wfrpCorruption`, див. нижче). Типи `TableEffect` у `TablesSection` отримують редактор ефекту з вибором `key` (характеристика) і знака.

## Сервер

- Операції (лише ДМ, лише wfrp, не в активному бою; помилки `{ error }` з Ukrainian-текстами в `lib/constants/api-errors.ts`):
  - `corruption.grant`, `POST /api/campaigns/[id]/characters/[characterId]/corruption`, body `{ points: 1..GRANT_MAX, reason: ≤80 }`, схема в `lib/schemas/corruption.ts`; обробник `core/corruption-handler.ts` (`$transaction` + `lockCharacters`; кидки лише сервер; `writeCharacterLog` з `CharacterLogKind.CORRUPTION`).
  - `corruption.undo`, `POST …/corruption/undo`: відкат лише `last`; 409 `CORRUPTION_STALE`.
- Без `outOfCombat.persistResources` — не потрібно (ресурси не змінюємо); у homm/dnd5e — 409 `CORRUPTION_UNSUPPORTED` (як downtime).
- `preserveServerOwned`/`reconcileCharacteristics`: клієнтський PATCH не може змінити `corruption`; клієнтський PUT тих самих полів ігнорується.
- Приватність: `characteristics.corruption` повертається власнику й ДМ; для не-ДМ-сторонніх (інші гравці, публічні проєкції учасників) вирізається там, де вирізаються `ledger`/`downtime` (звірити в плані: `redactLedger`, character projections, battle snapshot). Рядок журналу `CORRUPTION` видно лише власнику й ДМ (як `DOWNTIME`). У бою модифікатори входять через `derive`; самі пункти й список мутацій у `battleData` не копіюються.
- Бій: учасник-герой будується з `characteristics` через наявний шлях; після зміни `derive` перевірити, що `woundsMax`/ціль d100-атаки/Move беруть ефективні значення (місця читання `characteristics.base/advances` напряму знайти й перевести на `value()` — у плані окрема задача-аудит).

## Клієнт і UI

- `lib/api/corruption.ts` (`grant`, `undo`), хуки `lib/hooks/characters/corruption/` (`useGrantCorruption`, `useUndoCorruption`; ключі — `characterKeys`), без нової фабрики ключів.
- `components/systems/wfrp/corruption/`: `CorruptionBlock` (пункти/поріг, список мутацій з ефектами) на `StatsTab`/`HeroStats`; `GrantCorruptionDialog` (ДМ: кількість, причина, підсумок: поріг, тест, мутація; кнопка «Відкотити» у підсумку); слот-ефекти в `TablesSection`. Компоненти лише викликають хуки (ESLint-шар).
- i18n: namespace `wfrpCorruption` посторінково через `ExtendLocaleScope` (сторінки персонажа, ДМ-персонажа, ДМ-правил); `scope-size` не чіпаємо (окремий рядок з лімітом ≈2 KB, перевірити виміром). what's new + hint/help (`lib/onboarding/whats-new.ts`, `whatsNew.<id>` в обох `messages/*/whatsNew.json`).
- OpenAPI: бюджет піднімаємо лише до виміряного + запас (зараз 193000 B).

## Тести

- Чисті: `threshold` (TB+WPB, з модифікаторами), `modifiers` (сума, мінімуми), `plan-grant`: нижче порогу — без тесту; рівно на порозі — без тесту; вище + успіх — без мутації; вище + провал → physical при typeRoll ≤ 50 / mental при > 50, текст/ефекти скопійовано; повторне нарахування вище порогу тестує знову; кап мутацій; `read` відкидає невалідне; `undo` STALE.
- Таблиці: схема приймає нові ефекти лише в мутаційних слотах, відхиляє в інших; `DEFAULT_TABLES` валідні; `mergeRules`.
- Сервер: `wfrp-corruption-e2e.test.ts` (grant без тесту → grant з тестом і мутацією → характеристика/Wounds/Move змінені → undo → STALE після ручної зміни); homm/dnd5e → 409; не-ДМ → 403; приховування `corruption` у публічних проєкціях і таблиць для гравця.
- UI (happy-dom): `CorruptionBlock`, `GrantCorruptionDialog`.
- Запуск у роботі: лише `pnpm test:changed`/`test:related`; повний прогін і repo-wide lint — на межі епіку.

## Відкриті питання плану (перевірити в коді, не рішення користувача)

1. Усі місця прямого читання `characteristics.base/advances` (бій, юніти, лист, AI-контекст) — перевести на `value()`.
2. Які проєкції `characteristics` публічні для інших гравців (де вирізати `corruption`).
3. Чи вистачає ліміту `scope-size` для DM-правил із двома новими слотами (інакше — власний namespace для лейблів слотів).
4. Тексти дефолтних рядків: `textKey` (uk/en) у `wfrpCorruption` чи в наявному `wfrpTables`.
