# Spec 5a: шов рульової системи, percentile-тести, характеристики персонажа

Дата: 2026-11-03. Етап 5 конструктора (WFRP), частина 5a. Дослідження: [2026-11-03-wfrp-rule-system.md](../research/2026-11-03-wfrp-rule-system.md). Гілка `feat/wfrp`, worktree `../dnd-tracker-wfrp`, локальна БД `wfrp` (`./scripts/db/prodcopy-db.sh wfrp`).

Мета 5a: рушій знає, за якою рульовою системою грає кампанія; HOMM і 5e працюють як раніше (паритет); з'являється d100-тест, модель характеристик WFRP, тести з листа і базовий лист. Бій на wfrp — 5b.

## 0. Закриті питання (§9 дослідження)

| # | Питання | Рішення |
|---|---|---|
| 1 | Масштаб клітинки | 1 клітинка = 2 ярди (крок = Move клітинок, біг = Move×2). У 5a система лише декларує `distance`; шов у grid-хелперах — 5b |
| 2 | Характеристики | JSON `characteristics` у `characters` **і** `units`; 6 старих колонок лишаються для d20 |
| 3 | Wounds | `resources.hp` = Wounds, нового поля немає; `maxHp` через формулу системи |
| 4 | 4e-перемикач | Не закладати; при потребі — нова секція `rules.wfrp.edition` з дефолтом `5e` |
| 5 | `Character.level` | = tier кар'єри (1–4), похідний; у 5a фіксований 1 і прихований; XP-пороги й level-up вимкнені хуком |
| 6 | Назва шаблону | **Grim d100** (`templateKey: grim-d100`, порожній у 5a — `grim-d100-empty`); терміни: characteristics/«характеристики», skills/«навички», Wounds/«рани», Fate/Fortune/«Доля/Удача», SL/«рівні успіху», lore/«школа магії» (5d) |
| 7 | Fortune за сесію | Дія ДМ «Нова сесія» як `RestAction.kind = "session"` у меню відпочинку партії |
| 8 | Баланс fair | Хук `balance`; wfrp = `none` (setup ховає перемикач, старт бою не масштабує). SL-оцінка — 5h |

Підхід (затверджено): кампанійний ключ `rules.system`, три ключі (`homm`, `dnd5e`, `wfrp`), **дві** реалізації — `d20/` (обслуговує homm і dnd5e, делегує в наявний код, який і далі гілкується по `damageModel` учасника) і `wfrp/`. Система на рівні учасника й «повний інтерфейс зі стабами» відхилені.

## 1. Реєстр рульових систем

### 1.1 Секція правил `system`

- `lib/utils/rules/schema.ts`: нова секція `system: z.strictObject({ key: z.enum(["homm","dnd5e","wfrp"]) })` у `RulesetSchema`/`RulesetPatchSchema`; `DEFAULT_RULES.system = { key: "homm" }`.
- `parseRules`: якщо `system` відсутня або невалідна — `{ key: classes.enabled ? "dnd5e" : "homm" }` (після розбору секції `classes`). Явне поле має пріоритет. Бекфіл БД не потрібен; `createCampaignFromBundle` уже проганяє `bundle.rules` через `parseRules`, тож кампанії з шаблонів успадковують ключ.
- `system` **не механіка**: `MechanicKey = Exclude<keyof Ruleset, "system">`, `MECHANIC_REGISTRY` без неї → sync шаблон→кампанія (`sync/hash.ts`) і вкладки сторінки правил її не бачать.
- Пресети: `SRD_RULES` явно `system: { key: "dnd5e" }`; новий `WFRP_RULES` (`lib/utils/rules/systems/wfrp/rules-preset.ts`): `system wfrp`, `classes.enabled=false`, `deathSaves.enabled=false`, `concentration.enabled=false`, `heroScaling` без таблиць, `outOfCombat { persistResources: true, xp: true, inspiration: false }`, `encounters.balance="fair"` (ігнорується хуком), `morale.enabled=false`, `conditions.enabled=false`, `actions.enabled=false`.
- Блокування: `updateCampaignRules` (`lib/server/campaigns/rules.ts`) у транзакції рахує `characters` + `units` кампанії; якщо >0 і патч змінює `system.key` → 409 `API_ERRORS.SYSTEM_LOCKED`. Патч без зміни ключа проходить. `rules.get` повертає `systemLocked: boolean` поруч із правилами.

### 1.2 Реєстр `lib/utils/rules/systems/`

```ts
// types.ts
export type RuleSystemKey = "homm" | "dnd5e" | "wfrp";
export interface RuleSystemDefinition {
  key: RuleSystemKey;
  distance: { unit: "ft" | "yd"; perCell: number };          // d20: ft/5, wfrp: yd/2 (у 5a — лише для UI)
  balance: { kind: "fair" } | { kind: "none" };
  progression: {
    levels: boolean;                                          // level-up/XP-пороги в UI і rest-block
    maxHp(input: { character: CharacterHpInput; characteristics: Characteristics; rules: Ruleset }): { total: number; breakdown: HpBreakdownLine[] } | null; // null → поточний розрахунок d20
  };
  characteristics: { kind: "d20" | "wfrp"; sheetBlock(input: SheetBlockInput): SheetWfrpBlock | undefined };
  sheetTest: { accepts(body: SheetRollInput): boolean; roll(input: SheetTestInput): SheetRollResult };
  rest: { onSession?(r: CharacterResources, c: Characteristics): CharacterResources }; // відсутній → 409 REST_KIND_UNSUPPORTED
  battle: { supported: boolean };                              // wfrp=false у 5a → старт бою 409 SYSTEM_BATTLE_UNSUPPORTED
}
```
- `registry.ts`: `RULE_SYSTEM_REGISTRY = { homm: d20System("homm"), dnd5e: d20System("dnd5e"), wfrp: WFRP_SYSTEM }`, `ruleSystemOf(rules: Pick<Ruleset,"system">)`, `systemKeyOf(rules)`.
- `d20/index.ts`: `distance {ft,5}`, `balance fair`, `progression { levels: true, maxHp: () => null }`, `characteristics { kind: "d20", sheetBlock: () => undefined }`, `sheetTest` → `rollFromSheet` як є, `rest` без `onSession`, `battle.supported = true`. Жодної нової логіки.
- `wfrp/`: `index.ts`, `rules-preset.ts`, `percentile/`, `characteristics/`, `skills/`, `sheet-test.ts`, `session.ts`.
- ESLint (`eslint.config.*`, за зразком `MODE_IMPORT_PATTERN`/`MODE_OWNED_FILES`): патерни `@/lib/utils/rules/systems/wfrp*`, `@/lib/utils/rules/systems/d20*`, `@/lib/hooks/systems/wfrp*`, `@/components/systems/wfrp*` заборонені поза теками `lib/utils/rules/systems/**`, `lib/hooks/systems/**`, `components/systems/**`; тест правила як у режимів.

### 1.3 Гейти в наявному коді

| Де | Що |
|---|---|
| `lib/utils/characters/hero-hp.ts:characterBaseHp` | спершу `ruleSystemOf(rules).progression.maxHp(...)`; `null` → наявні `classHp`/`heroBaseHp`. `from-character` переводиться з прямого `heroBaseHp`/`classHp` на `characterBaseHp` (лист і бій — одне число) |
| `lib/constants/experience.ts:levelUpAvailable` споживачі (`sheet/rest-block.ts`, `DmCharacterCard`) | `progression.levels` |
| `start-fair-scaling.ts`, `balance/balance-post.ts`, `balance/setup.ts` | `balance.kind === "none"` → без масштабування, setup без перемикача |
| `lib/server/battles/mutations/start/*` | `battle.supported === false` → 409 `SYSTEM_BATTLE_UNSUPPORTED`; setup-сторінка показує повідомлення |
| `restParty`, `rollForSheet`, `resources-handler` | див. §4 |

`CELL_FEET` і 10 його споживачів (`grid/path`, `attack-reach`, `template`, `attack/bonus`, `spell/anchored-zone`, `cast/effects`, `summon/objects-near`, `abilities/registry/effects/push`, `spell/auto-reaction` з локальною копією, `useAbilityMapAim`) **не чіпаються** в 5a — вони не отримують `rules`, протягування масштабу належить 5b.

### 1.4 Клієнт

- `lib/hooks/systems/useRuleSystem(key)` → запис клієнтського реєстру `components/systems/registry.ts` (`{ d20, wfrp }` зі слотами `HeroStats`, `StatsTab`, `RollDialogBody`, `StatsFields`, `UnitStatsFields`). Ключ береться з `CharacterSheet.system`, `battle.rules.system`, правил кампанії.
- Усе wfrp-UI — у `components/systems/wfrp/`; d20-слоти — тонкі обгортки над наявними компонентами (`CharacterAbilityScores`, `CharacterCombatParams`, блоки `ProfileHero`/`CombatTab`).

## 2. PercentileTest

`lib/utils/rules/systems/wfrp/percentile/{roll,resolve,difficulty}.ts` + `__tests__/`, без залежностей від бою.

```ts
export type TestMode = "normal" | "advantage" | "disadvantage";
export interface PercentileTestInput { target: number; slModifier?: number; mode?: TestMode; doubles?: boolean; rng: Rng; presetRoll?: number }
export interface PercentileTestResult {
  rawRoll: number; roll: number; reversed: boolean; target: number;
  outcome: "critical" | "success" | "failure" | "fumble";
  sl: number; auto: "success" | "failure" | null; doubles: boolean; mode: TestMode;
}
export function rollPercentile(rng: Rng, preset?: number): number;        // 1..100, 00 = 100
export function reverseRoll(n: number): number;                            // 71→17, 20→2, 100→100
export function resolvePercentileTest(input: PercentileTestInput): PercentileTestResult;
```

Правила:
- успіх — `roll ≤ target`; `target` може бути > 100;
- удача: 01–05 завжди успіх, 96–100 завжди провал (`auto`), незалежно від цілі;
- `sl = tens(target) − tens(roll) + slModifier`; на успіху `max(0, …)`, на провалі `min(0, …)` — складність не перевертає результат;
- дублі (11…99, 100) лише при `doubles=true`: успіх → `critical`, провал → `fumble`; 05 не дубль, 100 — fumble;
- advantage: порахувати результат для `rawRoll` і для `reverseRoll(rawRoll)`, взяти кращий (порядок: `outcome` critical > success > failure > fumble, потім `sl`); disadvantage — гірший; `reversed=true`, якщо обрано перевернутий;
- `presetRoll` — для тестів і ручного кидка (аналог `presetRoll` у `rollD20WithMode`).

`difficulty.ts`: `DIFFICULTY_KEYS = ["veryEasy","easy","average","challenging","difficult","hard","veryHard"]`, `DIFFICULTY_SL = { veryEasy: 6, easy: 4, average: 2, challenging: 0, difficult: -1, hard: -2, veryHard: -3 }` (4e-модифікатори цілі / 10; одне місце з коментарем «звірити з книгою 5e»). i18n `gameTerms.difficulty.<key>`.

Поза 5a: opposed (два `resolvePercentileTest` + порівняння SL), extended, assisted, channelling/miscast.

## 3. Характеристики, навички, Wounds

### 3.1 Дані

Міграція (expand-only, одна): `characters.characteristics JSONB NOT NULL DEFAULT '{}'`, `units.characteristics JSONB NOT NULL DEFAULT '{}'`.

`lib/utils/rules/systems/wfrp/characteristics/schema.ts`:
```ts
export const CHARACTERISTIC_KEYS = ["ws","bs","s","t","i","ag","dex","int","wp","fel"] as const;
export const CharacteristicsSchema = z.object({
  base: z.record(z.enum(CHARACTERISTIC_KEYS), z.number().int().min(1).max(100)).default(all 30),
  advances: z.record(z.enum(CHARACTERISTIC_KEYS), z.number().int().min(0).max(100)).default(all 0),
  move: z.number().int().min(1).max(12).default(4),
  skillAdvances: z.record(z.string().regex(SKILL_ADVANCE_KEY_RE), z.number().int().min(0).max(100)).default({}),
  fate: z.number().int().min(0).max(9).default(0),
  extraWounds: z.number().int().min(0).max(3).default(0),
});
export function readCharacteristics(row: { characteristics?: unknown }): Characteristics; // єдина точка читання колонки
```
`SKILL_ADVANCE_KEY_RE` = `^<skill>$` або `^<skill>:<spec>$` (`spec` — `[a-z0-9-]{1,40}`).

### 3.2 Похідні (`derive.ts`, чисті)

- `value(c, key) = base[key] + advances[key]`; `bonus(c, key) = floor(value / 10)`;
- `woundsMax(c) = SB + 2·TB + WPB + extraWounds·TB`;
- `walkYards(c) = move·2`, `runYards(c) = move·4`;
- `skillTarget(c, skillKey, spec?) = { target, trained }`: basic → `value(characteristic) + advances` (`trained=true`); advanced без advances → `trained=false`, `target` = value характеристики (для показу).

### 3.3 Каталог навичок (`skills/catalog.ts`, константа системи)

`{ key, characteristic: CharacteristicKey, kind: "basic"|"advanced", spec: "none"|"fixed"|"open", specs?: readonly string[] }`, ≈40 записів із generic-назвами (climb, cool, dodge, endurance, gossip, haggle, intimidate, intuition, leadership, perception, ride, stealth, melee, ranged, heal, lore, language, trade, channelling, pray, …). `fixed`-спеціалізації перелічені в каталозі (melee: basic|cavalry|fencing|flail|parry|polearm|two-handed|brawling; ranged: bow|crossbow|blackpowder|engineering|entangling|explosives|sling|throwing); `open` (lore, language, trade) — довільний рядок ДМ. Підписи `gameTerms.wfrpSkills.<key>`, `gameTerms.wfrpSpecs.<skill>.<spec>`; відкриті спеціалізації показуються як введено. Назви навичок — загальні англійські слова, без текстів GW.

### 3.4 Wounds і ресурси

- `progression.maxHp` для wfrp → `woundsMax` із breakdown-рядком `SB + 2·TB + WPB (+ extra)`; підключено в `characterBaseHp` (§1.3).
- Поточні Wounds — `resources.hp`; `tempHp` для wfrp не редагується (гейт у `resources-handler` і UI).
- `CharacterResources.fortune?: number` (поточний запас, максимум `characteristics.fate`); при створенні персонажа й `reset` ресурсів `fortune = fate`. `resourcesEditSchema` + поле `fortune` (0..9), для d20 ігнорується. Fate у 5a лише зберігається й показується.
- `experience` лишається леджером отриманого XP; витрати — 5e.

### 3.5 Створення/редагування

- `createCharacterSchema`/`updateCharacterSchema`: `characteristics: CharacteristicsSchema.optional()`. У wfrp-кампанії сервер вимагає `characteristics`, а `strength…charisma`, `armorClass`, `archetype`, `classes`, `initiative`, `speed` пише дефолтами (не валідує). У d20 `characteristics` ігнорується. Гейт — `ruleSystemOf(access.campaign.rules).characteristics.kind`.
- Юніти: `lib/schemas/units.ts` + `characteristics`; у 5a лише зберігання/редагування; `UNITS_IMPORT` отримує JSON-поле `characteristics`. Персонажі не імпортуються (як і зараз).
- `level` для wfrp при створенні = 1, у формах приховано.

Поза 5a: таланти, кар'єри, статус, corruption, травми (5c/5e), генерація 2d10 за видом (5e).

## 4. Тести з листа, «Нова сесія»

- `sheetRollSchema` (`lib/schemas/out-of-combat.ts`): наявні три d20-варіанти + `{ kind: "test"; characteristic; difficulty? }` і `{ kind: "test"; skill; spec?; difficulty? }` (`difficulty` default `challenging`). `rollForSheet` перевіряє `sheetTest.accepts(body)` → інакше 400 `ROLL_KIND_MISMATCH`; `useInspiration` для `test` заборонений схемою.
- `wfrp/sheet-test.ts`: `target` з `skillTarget`/`value`; `trained=false` → 409 `SKILL_UNTRAINED`; `resolvePercentileTest({ target, slModifier: DIFFICULTY_SL[difficulty], doubles: false, mode: "normal", rng })`. Advantage на листі в 5a не задається.
- `SheetRollResult` → discriminated union: наявна форма + `kind: "d20"`; нова `{ kind: "percentile"; label; rawRoll; roll; reversed; target; sl; outcome; auto; difficulty; mode }`. Лог `CharacterLogKind.TEST` з тими самими полями в `data`.
- `restSchema.kind` → `"short" | "long" | "close" | "session"`; `restParty` для `session` → `rest.onSession` (wfrp: `fortune = fate`), відсутній хук → 409 `REST_KIND_UNSUPPORTED`; лог `CharacterLogKind.SESSION`; блокування активним боєм — як у наявних rest-дій. У 5a сесія скидає лише Fortune.

Поза 5a: витрата Fortune (reroll / +1 SL) і Fate — 5c; opposed/assisted — 5b/5c.

## 5. UI

### 5.1 Лист

`CharacterSheet` + `system: RuleSystemKey`, `wfrp?: SheetWfrpBlock`:
```ts
interface SheetWfrpBlock {
  characteristics: { key: CharacteristicKey; base: number; advances: number; value: number; bonus: number }[];
  wounds: { max: number; breakdown: HpBreakdownLine[] };
  move: { value: number; walkYd: number; runYd: number };
  skills: { key: string; spec?: string; characteristic: CharacteristicKey; target: number; advances: number; trained: boolean; kind: "basic" | "advanced" }[];
  fate: number; fortune: number;
}
```
`build-sheet.ts` заповнює через `characteristics.sheetBlock`; для d20 — `undefined`, наявні поля без змін; для wfrp `abilities/saves/passives/armorClass/proficiency/hitDice` порожні/нульові, компоненти їх не рендерять.

Слоти реєстру: `HeroStats` у `ProfileHero` (wfrp: Wounds-підпис на `sheet.hp`, Move у ярдах, Fate/Fortune через `HudStatChip`); `StatsTab` у `CombatTab` (wfrp: `CharacteristicsGrid` — 10 чіпів значення+бонус із кнопкою тесту; `SkillsList` — ціль/advances/кнопка, untrained сірі); `RollDialogBody` у `SheetRollDialog` (wfrp: select складності, результат кидок/ціль/SL/outcome, позначки перевороту й удачі). `useOutOfCombat` + мутація `rollTest`. `SkillsTab` (шлях персонажа) і level-up для wfrp приховані (`progression.levels`, гейт у `character-form-tabs`/`ProfileTabs`). `CharacterLogTab` рендерить `TEST`/`SESSION`.

### 5.2 Форми ДМ

- `NewCharacterForm`, `ProfileEditor`/`BasicEditTab`: слот `StatsFields` — d20 без змін; wfrp: `CharacteristicsEditor` (10 рядків base/advances, Move, Fate, extraWounds) + `SkillAdvancesEditor` (пошук по каталогу, спеціалізація select/input). Архетип/клас/AC/ініціатива/швидкість приховані. `useCharacterForm` тримає `characteristics` як одне поле `{ data, set }`.
- `components/units/form`: `UnitWfrpFields` (той самий `CharacteristicsEditor` без навичок) замість `UnitFiveEFields`/d20-статів, вибір через `useRuleSystem`.
- `DmCharacterCard`: підпис Wounds, level-up прихований.

### 5.3 Правила, шаблони, відпочинок

- `components/rules/sections/SystemSection.tsx` над вкладками `RulesForm`: select із трьох систем, підказка про блокування, `disabled` при `systemLocked`. Секції, що не стосуються wfrp, показуються з позначкою «не використовується в цій системі» (не ховаємо — sync/hash і вкладки лишаються).
- `scripts/grim/empty-template.ts` (за зразком `scripts/srd/empty-template.ts`): офіційний «Grim d100 (empty)» з `WFRP_RULES`, без контенту, `templateKey: "grim-d100-empty"`; константа `EMPTY_GRIM_TEMPLATE_NAME` у `lib/constants/campaigns.ts`. Картки шаблонів і `NewCampaignForm` — бейдж системи (`gameTerms.ruleSystem.<key>`: Heroes / D&D 5e / Grim d100).
- `DmRestActions` — пункт «Нова сесія» лише для wfrp; `RestBadges` показує Fortune.

### 5.4 i18n, онбординг, документація

- Ключі в `gameTerms` (`characteristics`, `wfrpSkills`, `wfrpSpecs`, `difficulty`, `ruleSystem`, `distanceUnit`), `characterProfile`, `rest`, `rules`, `validation`, `errors` — `uk` і `en`. Тексти помилок у `lib/constants/api-errors.ts`: `SYSTEM_LOCKED`, `SYSTEM_BATTLE_UNSUPPORTED`, `ROLL_KIND_MISMATCH`, `SKILL_UNTRAINED`, `REST_KIND_UNSUPPORTED`.
- `whatsNew.<дата злиття>-rule-system-wfrp` (audience `dm`) + help-стаття `dm-rule-systems`.
- Новий `docs/architecture/rule-systems.md` (реєстр, хуки, правило «ядро не імпортує систему», що де лежить) + правки `characters.md` (characteristics, Wounds, тести з листа), `battle.md` (посилання: distance/бій wfrp — 5b), `STATUS.md`.

## 6. Паритет, тести, міграція, порядок

**Паритет d20.** (1) Наявні тести без правок, окрім тих, що читають змінені сигнатури (`characterBaseHp` у `from-character`, `SheetRollResult.kind`, `restSchema.kind`); інша правка старого тесту = сигнал зміни поведінки. (2) `pnpm battle-sweep --mode all --consistency` на prodcopy до першого коміту й після останнього: 0 нових помилок/попереджень у `battle-sweep.md` (рушій не приймає seed — кидки не порівнюються). (3) Snapshot-тест `parseRules`: `{}` → homm; `{classes:{enabled:true}}` → dnd5e; `SRD_RULES` → dnd5e; `WFRP_RULES` → wfrp; явне `system` має пріоритет.

**Тести нового коду** (сусідні `__tests__/`): `percentile` — таблиця ~25 рядків (межі 05/06, 95/96, 100, дублі з/без `doubles`, переворот в обидва боки, складність на успіху/провалі, `presetRoll`); `derive` — бонуси, Wounds, `skillTarget` basic/advanced/spec; `sheet-test` — mismatch 400, untrained 409, лог `TEST`; `session` — `fortune=fate`, d20 → 409; `rules` — lock 409, патч без зміни ключа, sync не бачить `system`; `build-sheet` — wfrp-блок і порожні d20-поля; ESLint-правило; UI (`happy-dom`): `CharacteristicsGrid`, `SkillAdvancesEditor`, `SystemSection`, percentile-гілка `SheetRollDialog`.

**Міграція.** Одна (дві колонки), без бекфілу. Іде на prod разом із гілкою; злиття в `main` — після 5a–5c (граючий бій); `feat/wfrp` ребейзиться на `main` перед кожною частиною.

**Порядок реалізації (для плану).**
1. `rules.system` + реєстр + `d20/` + ESLint + lock + `SystemSection` → sweep «до/після».
2. `percentile` + `difficulty`.
3. Міграція + `characteristics` схема/derive/каталог навичок + хук у `characterBaseHp` + `from-character` на `characterBaseHp`.
4. `sheet-test` + ресурси `fortune` + `session` + логи.
5. Лист + форми + поля юніта + бейджі шаблонів + `grim` empty-template.
6. i18n, whats-new, help, `rule-systems.md` + правки `characters.md`/`battle.md`/`STATUS.md`.
Фінал: `/simplify`, повний `pnpm test:run`, repo-wide lint, live-run у браузері (кампанія з «Grim d100 (empty)» → персонаж із характеристиками → тест із листа → «Нова сесія» → старт бою дає 409).

**Ризики.** `SheetRollResult` union зачіпає `CharacterLogTab` і рендер результату — перевірити всіх споживачів `.rolls`/`.total`. `from-character` → `characterBaseHp` — єдина правка d20-шляху, покрита sweep. Значення `DIFFICULTY_SL` і формула Wounds — константи в одному файлі кожна, звіряються з книгою 5e при реалізації без зміни інтерфейсів.

## 7. Reuse

Перевірено перед spec: `rollDie`/`parseDice` (`lib/utils/common/dice.ts`), `Rng`/`mulberry32` (`rng.ts`), `rollD20WithMode` (зразок `presetRoll`), `read(row)` у `abilities/read.ts` (зразок `readCharacteristics`), `HudStatChip`/`HudPanel`/`HudForm` для листа й форм, `AbilityScoresGrid` (зразок `CharacteristicsGrid`, не перевикористовується — інша кількість і два стовпці), `SheetRollDialog`/`useOutOfCombat`/`useRollReveal` (розширюються), `DmRestActions`/`restParty`/`applyRest` (новий kind), `parseBody`/`loadOwned`/`errorResponse`/`operationRoute` (роути без змін, лише схеми), `scripts/srd/empty-template.ts` + `template-store.ts` (шаблон), реєстр режимів карти (зразок реєстру й ESLint). Нове, бо аналога немає: percentile-тест, модель характеристик і каталог навичок, системний реєстр, `SystemSection`.
