# WFRP 5b-3: UI бою (spec)

Дата: 2026-11-04. Гілка `feat/wfrp` (не мерджити й не пушити в main до явного «епік готовий»). Попередні частини: [5b-1](2026-11-04-wfrp-5b1-design.md), [5b-2](2026-11-04-wfrp-5b2-design.md); реєстр систем — [rule-systems.md](../../architecture/rule-systems.md).

## Мета й успіх

Бій у wfrp можна провести з UI без d20-артефактів. DM і гравець бачать Wounds замість HP, ціль і складність, SL, Momentum сторони та локацію удару; d100 вводиться з клієнта (ручний режим) або кидається сервером (за замовчуванням); кубики на сцені падають парою d10. d20-системи (homm, dnd5e) поводяться як раніше.

Критерії:
- у wfrp-бою немає AC, бонусу атаки, бонусної дії й реакції (прапорці системи, не `if (key === "wfrp")`);
- `attackBodySchema` приймає `d20Roll` до 100 лише коли система кидає d100; для d20 межа 20;
- до готовності правил UI не показує d20-вигляд;
- живий прогін у браузері на бою з двома сторонами проходить без розбіжностей між UI й логом.

## Рішення (узгоджені)

1. d100 вводиться вручну як два d10 (десятки 00–90 + одиниці 0–9, «00+0» = 100) із запасним полем 1–100; серверний кидок лишається режимом за замовчуванням.
2. 3D-кубики: пара d10 на існуючому рушії (`components/battle/fx/dice/`), без нової геометрії.
3. Momentum сторони показується до кидка (`RollStep`); локація удару й розбивка SL — лише в підсумку (`SummaryStep`).
4. Запис пари d10 у `diceRolls` — окремий опційний пункт (див. «Опційно»), не блокує решту.

## Reuse

| Є | Використовуємо |
|---|---|
| `RuleSystemDefinition` (`combat.dice`, `combat.actionEconomy`, `d20Stats`, `distance`, `characteristics.kind`) | усі UI-прапорці; нового реєстру немає |
| `useRuleSystem`, `useCampaignRules` (`lib/hooks/systems`, `lib/hooks/campaigns`) | база для `useBattleRules` |
| `DiceGrid`, `DieInput`, `parseDieInput` (`components/battle/hud/DiceInput.tsx`, `lib/utils/battle/flows`) | ручний ввід d10; `DieInput sides=100` для запасного поля |
| `RollStep`, `SummaryStep`, `useAttackWizard` | варіант за `combat.dice`, не окремий візард |
| `scene.momentum` у дельті (5b-2), `actionDetails.percentile` | дані для Momentum/SL/локації без змін сервера |
| `HealthBar`, `hpRatio`, `MyHeroPanel`, `DmCharacterCard` (уже ховає AC за `wfrp`) | точки HUD; перехід `!wfrp` на прапорець `d20Stats` |
| 3D-рушій кубиків (`DieSides` має 10) | пара d10; нова лише мітка граней десятків у атласі |

Reuse-пошук у `components/battle` і `lib/hooks/battle` не знайшов готового вводу d100 чи Momentum-UI: `D100Input` пишемо в `components/battle/hud/`. Перед планом дошукати в `components/ui`, `components/hud`, `lib/utils/common`, `lib/utils/api`.

## Дизайн

### 1. Хуки прапорців
- `useRuleSystem` повертає `{ key, system?, ready }`: до `ready` `system` — `undefined` (а не `homm`). Споживачі (`useUnitFormFields`, `useCharacterEditor`, `NewCharacterForm`, `PartyRestActions`, `DmCharacterCard`) оновлюються під `ready`; поведінка до готовності — d20-безпечний нейтральний вигляд без миготіння прапорців wfrp.
- `useBattleRules()` (`lib/hooks/battle/`): бере `campaignId` із контексту бою, віддає `{ ready, dice, actionEconomy, d20Stats, distance, woundsLabel }`. Компоненти не імпортують реєстр.
- `systemLocked`: створення першого персонажа/юніта інвалідує ключ `campaignRules` (`keys.ts`).

### 2. d100 з клієнта
- Схема (`lib/schemas/battles.ts`): `d20Roll` до 100; перевірка `d20Roll ≤ combat.dice` у handler (`lib/utils/battle/attack-phase/request.ts`/`run-attack-phase.ts`) зі статусом 400 і текстом із `api-errors.ts`. Умова `sides !== 20 → serverD20` (`run-attack-phase.ts:163`) змінюється на: серверний кидок, якщо `serverRolls`/`serverRolled`, інакше `strikeRoll(...)` приймає значення клієнта для будь-яких `sides` (d20 і d100).
- `lib/server/battles/dice.ts` (підмінює `d20Roll: 1` для серверного режиму) і `rollKeys` лишаються; тести: d100 клієнта, d100 понад 100, d20 понад 20, серверний режим.
- Advantage/disadvantage у wfrp немає: `advantageRoll`/`disadvantageRoll` для d100 ігноруються (режим `normal` примусово, `forcedMode`).

### 3. Візард атаки
- `RollStep`: вибір вигляду за `dice` з `useBattleRules`. Для 100: режим сервер/ручний; ручний — `D100Input` (два поля d10 «десятки/одиниці», 00+0=100, запасне поле 1–100). До кидка: ціль кидка (характеристика/навичка + складність) і Momentum сторони з `scene.momentum` («+SL при витраті»; сторона = сторона атакувальника). Для 20 — без змін.
- `SummaryStep`: для d100 — кидок проти цілі, SL атакувальника й захисника, чистий SL, локація, хто виграв/витратив Momentum (з `actionDetails.percentile`); для d20 — без змін. Дані вже є в результаті, сервер не змінюється.
- Підписи — `messages/{uk,en}/battle.json` (`wizard.d100.*`), whats-new не додаємо.

### 4. HUD і карта
- Wounds замість HP: підпис і числа в `HealthBar`/`ParticipantDetails`/`MyHeroPanel` беруть `woundsLabel`; `characteristics.kind === "wfrp"` лишається єдиним джерелом.
- AC, бонус атаки, бонусна дія й реакція ховаються за `d20Stats` та `actionEconomy` у `MyHeroPanel`, `MyTurnControls`, `DmQuickActionsPanel`, `AttackWizard`-кроках; `DmCharacterCard` переводиться з `!wfrp` на прапорець.
- Відстань: `distance.unit` і `perCell` дають «yd» і масштаб клітинки (6 ft = 2 yd) там, де відстань підписана на карті/в HUD (точні місця уточнює план; пошук по `ft` у `components/battle` нічого не дав, шукати по `distance`/`cellFeetOf`).
- 3D-кубики: для d100 у сцену ставляться два d10 (десятки з мітками 00–90); результат складається в `DiceStage`; мітки граней десятків (00–90) додаються в атлас у `scene.ts` (`createAtlasCanvas`).

## Опційно
Запис пари d10 у `diceRolls` замість окремого `actionDetails.percentile`: зачіпає журнал і дельту. Беремо лише якщо план покаже малу вартість; інакше відкладаємо.

## Поза межами
Щит/броня (5f); стани й крит-маркери (5c); магія (5d); бестіарій (5h); звірка констант з книгою (`DIFFICULTY_SL`, `refHit`, Momentum); `berserk` (d20); смуги дальності; решта хвостів 5a (клас у wfrp, `readCharacteristics`, egress `list-templates`).

## Тестування
- Компоненти (happy-dom): `RollStep`/`SummaryStep` для d20 і d100, `D100Input` (00+0=100, межі, запасне поле), HUD-прапорці (AC/бонусна/реакція/Wounds), підписи yd.
- Хуки: `useRuleSystem` до `ready`, `useBattleRules`, інвалідація `systemLocked`.
- Схема/handler: `d20Roll` до 100 лише для d100; клієнтський d100 проходить у `run-attack-phase`; d20 без регресій; `wfrp-battle-e2e` із клієнтським d100.
- i18n: тести ключів uk/en; перевірка бюджету `scope-size` (ліміт 105 KB gzip).
- Живий прогін (субагент, масштабовані скріншоти, JS/text-перевірки): бій двох сторін, мішані раси й герої; ручний d100 + серверний; Momentum до/після; Wounds; yd; дочищення тестових боїв.
- Перед деплоєм епіку (не частина 5b-3): `battle-sweep` homm/dnd5e на prodcopy; три міграції (`characteristics`, `units_base_characteristics`, `battle_scene_momentum`).

## Ризики
- Прапорці в HUD розкидані по компонентах (`!wfrp` місцями): забути одне місце = d20-елемент у wfrp. Тест на кожну точку + живий прогін.
- `useRuleSystem` без `system` до готовності ламає споживачів, що розраховують на значення: `tsc` веде, нейтральний вигляд задається в кожному.
- Поле 1–100 і пара d10 мають давати однакове значення: одна функція складання (`composePercentile`) з тестом.
- Бюджет `scope-size` (≈101 KB із 105): нові uk-ключі в `battle.json` стежимо; запас малий.
