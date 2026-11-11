# WFRP 5d: магія (spec)

Дата: 2026-11-05. Гілка `feat/wfrp` (HEAD `cdc59a866`; у main не мерджити до кінця епіку). Попереднє: [5c-3](2026-11-05-wfrp-5c3-design.md), реєстр і межі — [rule-systems.md](../../architecture/rule-systems.md), правила — [research §4.6, §7, §8](../research/2026-11-03-wfrp-rule-system.md) (рядок 5d: лори, CN, channelling, overcast, miscast на дублях, lore attribute, броня, інгредієнти, prayers/Sin, book UI). Міграцій немає.

**Числа правил.** Книги 5e в репозиторії немає (як і для каталогу станів у 5c-3). Усі числа нижче — припущення з research і 4e-пам'яті, позначені **«звірити з книгою»**; у коді вони живуть в одному файлі `wfrp/magic/constants.ts` з коментарем `verify against 5e book`, щоб звірка була одним патчем.

## Мета й успіх

1. Заклинач wfrp кидає заклинання в бою: тест **Language (Magick)** (d100) проти **CN** заклинання; успіх = SL (+ накопичене channelling) ≥ CN, зайві SL дають **overcast**; провал — дія витрачена, ефектів немає.
2. **Channelling** — окрема дія за хід: тест Channelling (WP), SL накопичуються на наступне заклинання.
3. **Miscast** на дублях касту/channelling: кидок у таблиці minor/major, наслідки — стани й Wounds на заклиначі.
4. Лор = `SpellGroup`; **lore attribute** (стан на цілі) з даних заклинання; броня штрафує каст (поки AP = 0 — заглушка).
5. UI: каст у бою (d100-кидок як у атаці, CN, SL, channelling, Fortune), книга заклинань на листі wfrp, поля магії в редакторі заклинань ДМ.
6. 5d-3: молитви (Pray, Blessings/Miracles) і Sin, інгредієнти як захист від miscast, хвости.

Критерії: d20-системи без змін поведінки (наявні тести спел-рушія без правок; `castSpellSchema` для d20 приймає те саме); `wfrp-magic-e2e.test.ts` проходить сценарій channel → cast з overcast → дублі → miscast; `scope-size` у бюджеті; live-run у браузері.

## Підчастини

| Частина | Зміст | Задач у плані |
|---|---|---|
| **5d-1. Рушій** | дані магії в JSON заклинання, контракт `RuleSystemMagic`, тест касту (CN, SL, Fortune, броня, overcast), channelling (мутація + роут), miscast-таблиці (спільний `rollTable` з критами), lore attribute, шов у `castSpell`/`spell-mutation`, e2e | 6 |
| **5d-2. UI** | `spells: true` для wfrp, діалог касту d100 у книзі бою, плитка «Channelling», підсумок касту, вкладка «Магія» на листі wfrp, поля магії в редакторі заклинань, i18n/whats-new/help | 4 |
| **5d-3. Молитви, Sin, інгредієнти, хвости** | Pray-тест (Blessing/Miracle), `resources.sin` + гнів богів, інгредієнт скасовує miscast, хвости 5d-1/5d-2 | 3 |

Кожна підчастина — окрема сесія (контекст), Sonnet-виконавці, без per-task рев'ю; live-run після 5d-2 і після 5d-3; **одне** Opus-рев'ю всього 5d у кінці.

## Рішення (пропоновані; відкриті — у «Питання»)

| Питання | Рішення |
|---|---|
| Де дані магії заклинання | Без міграції: `casting` (JSON-колонка `spells.casting`, уже у шарах контенту `spells_base`, імпорті й API) отримує необов'язковий `magic: { cn, kind, overcast, attribute? }`. Не нова колонка: шари/синк шаблонів/експорт копіюють JSON без змін |
| Лор | `SpellGroup` як є (назва, колір, іконка). Lore attribute — у кожному заклинанні (`casting.magic.attribute`), заповнює шаблон/імпорт (П2) |
| Резолюція цілей | Ортогональна до CN: тест касту — один на каст (ворота), цілі далі через наявну `resolution`. У wfrp дозволено лише `auto` (save/attack — d20-рушій) |
| Слоти | Немає: `magic.slots = false` вимикає `usesSlot`, `beginLongCast`-перевірку й `SlotSelect`; `level` заклинання в wfrp ігнорується (рівень апкасту = overcast) |
| Overcast | Кожні `OVERCAST_SL_STEP` зайвих SL = +1 рівень апкасту в наявній механіці `upcastDice`/`upcastTargets` (`castLevel`); Petty — без overcast. Дальність/площа/тривалість — поза межами |
| Miscast | Таблиці в коді системи (`MISCAST_TABLE.minor/major`, як `CRIT_TABLE`), спільний пошук рядка `rollTable`; редагований контент `tables` — 5g (П3) |
| Fortune | Та сама семантика, що в атаці (reroll невдалого / +1 SL), списання з `battleData.fortune` |
| Channelling | `battleData.channelledSl` (JSON знімка), обнуляється кастом (успіх чи провал) і шкодою по заклиначу; max = `CHANNEL_MAX_SL` |
| i18n | Новий namespace `wfrpMagic` (uk/en); не `battleWfrp`, не `spells`/`spellEditor`/`campaigns` |
| Приватність | Тест касту — дані самого заклинача (як кидок атакувальника): рядки публічні; стани від miscast пишуться через `applyWfrpConditionTo` і приховуються наявним `concealLine` (5c-2) |

## Reuse

| Є | Використовуємо | Чому нове |
|---|---|---|
| `resolvePercentileTest`, `reverseRoll`, `DIFFICULTY_SL` (`wfrp/percentile`) | тест касту, channelling, Pray; `doubles` уже повертається | — |
| `skillTarget`/`value`/`readCharacteristics` (`wfrp/characteristics`), каталог навичок (`channelling` wp, `pray` fel, `language` open) | цілі тестів; Language (Magick) = `language:magick` | спец `magick` лише константа |
| `selfTestMod` (`conditions/test-mod.ts`) | стани заклинача знижують ціль | — |
| `applyWfrpConditionTo`, `concealWfrpLine`, `applyDamageConsequences` | наслідки miscast, lore attribute, приховування рівнів | — |
| `CRIT_TABLE`/`rollCrit` (`wfrp/combat/crit-table.ts`) | патерн `max`-рядків → виносимо `rollTable` у `wfrp/tables/` і переводимо `rollCrit` на нього | дві таблиці не дублюють пошук |
| Fortune з `resolve-attack.ts` + списання в `attack/process/run.ts:236-241` | хелпер `applyFortune` у `wfrp/percentile/fortune.ts` для атаки й касту | винесення, без зміни поведінки атаки |
| `castSpell` (`lib/utils/battle/spell/cast/index.ts`), `spendCastCost` (`cast/finish.ts`), upcast `castLevel`, `spell-mutation.ts`, `castSpellSchema` | шов касту, витрата дії, overcast | лише гілка `ruleSystemOf(rules).magic` |
| `conditionTestMutation` + `operations.ts` + `battleOps`/`makeBattleHook` (`lib/api/battle-ops.ts`, `lib/hooks/battles/useBattles.ts`) | шаблон мутації/роута/хука `channel` | нова дія |
| `D100RollBody`, `percentile-input.ts` (`composePercentile`, пара d10, «Авто»), `ActionResultCard`, `useBattleRules` | діалог касту й підсумок | — |
| `SpellBook`, `SpellCastDialog`, `useSpellBook`, `useSpellCastSubmit` | книга бою; wfrp ховає `SlotSelect`/`SaveRolls`, додає тіло d100 | — |
| `SystemUi` (`components/systems/types.ts`), `systemUiOf` | `MagicTab` wfrp на листі | слот у реєстрі UI |
| `ingredientsGate`/`planIngredients`/`spendIngredients` (`lib/utils/battle/spell/ingredients.ts`, `lib/utils/spells/ingredients/`) | 5d-3: необов'язковий інгредієнт скасовує miscast | режим «optional» через контракт |
| `ExtendLocaleScope`, `isWfrpCampaign`, `WFRP_BATTLE_NAMESPACES` | `wfrpMagic` лише у wfrp-кампаніях | — |
| `lib/utils/api` (`parseBody`, `requireCampaignAccess`, `errorResponse`), `API_ERRORS` | роут `channel` через `runBattleMutation` | нові коди помилок |

`components/common`, `components/ui`, `components/hud`, `lib/hooks/spells` — нових примітивів не потрібно (діалоги/бейджі наявні).

## Дизайн

### 1. Дані (`lib/utils/spells/model/schema.ts`)

```ts
export const SPELL_MAGIC_KINDS = ["petty", "arcane", "hedge", "witchcraft", "chaos", "blessing", "miracle"] as const;
export const SpellMagicSchema = z.object({
  cn: z.number().int().min(0).max(30),
  kind: z.enum(SPELL_MAGIC_KINDS),
  overcast: z.enum(["dice", "targets"]).nullable().default(null),
  attribute: z.object({ condition: z.string().min(1).max(40), levels: z.number().int().min(1).max(3) }).optional(),
});
SpellCastingTimeSchema += { magic: SpellMagicSchema.optional() }
```
`readSpellDefinition`/`spellDefinitionColumns` уже переносять `casting` цілком. `attribute.condition` перевіряється на касті (`isWfrpConditionKey`), не в схемі (ядро не знає wfrp-ключів). Персонаж: відомі заклинання — наявний `characters.knownSpells`; юніти — `units.knownSpells`. Знімок: `battleData.channelledSl?: number`. Sin (5d-3): `resources.sin` (JSON `characters.resources`, як `fortune`).

### 2. Контракт (`lib/utils/rules/systems/types.ts`)

```ts
export interface CastTestCtx { caster: BattleParticipant; spell: CastableSpell; magic: SpellMagic; rules: Ruleset; rng: Rng; presetRoll?: number; fortune?: { kind: FortuneKind; manualReroll?: number } }
export interface CastTestResult {
  success: boolean; sl: number; overcastSteps: number;
  miscast: "minor" | "major" | null;
  percentile: PercentileCastDetails;   // roll, target, sl, cn, channelled, armourSl, doubles
  lines: LogLine[]; fortune?: { kind: FortuneKind; firstRoll?: number };
}
export interface RuleSystemMagic {
  slots: false;
  castTest(ctx: CastTestCtx): CastTestResult;
  channel(p: BattleParticipant, ctx: { rules: Ruleset; rng: Rng; presetRoll?: number }): { participant: BattleParticipant; lines: LogLine[]; miscast: "minor" | "major" | null };
  miscast(ps: BattleParticipant[], casterId: string, kind: "minor" | "major", ctx: { round: number; rng: Rng; rules: Ruleset; applyDamage: ApplyDamageConsequences }): SystemConditionResult;
  attribute(ps: BattleParticipant[], targetIds: string[], magic: SpellMagic, round: number): SystemConditionResult;
  /** Channelled SL lost when the caster takes damage */
  onDamaged(p: BattleParticipant): BattleParticipant;
}
RuleSystemDefinition.magic?: RuleSystemMagic;   // d20: undefined → поведінка як зараз
```

### 3. Рушій wfrp (`lib/utils/rules/systems/wfrp/magic/`)

- `constants.ts` (усе **«звірити з книгою»**): `CAST_SKILL = { key: "language", spec: "magick" }`, `PRAY_SKILL = "pray"`, `OVERCAST_SL_STEP = 2`, `ARMOUR_SL_PER_AP = 1` (за найбільшим AP голова/тіло), `CHANNEL_MAX_SL = 10`, miscast: дублі + провал → `minor`, кидок 100 (або дублі в 96–99) → `major`, дублі + успіх → «критичний каст» (CN вважається виконаним) + `minor`; channelling: miscast лише на найгіршому результаті (100) → `minor`.
- `cast-test.ts` `wfrpCastTest(ctx)`: ціль = `skillTarget(language:magick) + selfTestMod(caster, "test")`; `slModifier = channelledSl − armourSl(caster)`; Fortune через спільний `applyFortune`; `success = outcome ∈ {success, critical} && sl ≥ cn` (крит касту — успіх незалежно від SL); `overcastSteps = kind === "petty" || overcast === null ? 0 : floor((sl − cn) / OVERCAST_SL_STEP)`.
- `armour.ts` `armourSl(p)`: `max(ap.head, ap.body) × ARMOUR_SL_PER_AP`; поки AP = 0 (5f), завжди 0 — прапорця не треба, тест фіксує формулу на штучному AP.
- `channel.ts` `wfrpChannel(p, ctx)`: тест `channelling` (WP) + `selfTestMod`; `channelledSl = min(CHANNEL_MAX_SL, channelledSl + max(0, sl))`; провал — без змін; miscast за правилом вище.
- `miscast-table.ts` + `miscast.ts`: `MISCAST_TABLE: Record<"minor"|"major", TableRow<MiscastEffect>[]>`, `MiscastEffect = { condition?: { key; levels }; wounds?: number; textKey }`; застосування: стан → `applyWfrpConditionTo`, Wounds → `applyDamageConsequences` (небойове джерело; 0 Wounds → наявний `wfrpOnZeroHp`). Рядки `wfrpMagic.miscast.<kind>.<n>`. Власні grimdark-тексти (без назв GW).
- `attribute.ts`: для кожної цілі з `outcome` «вражено» — `applyWfrpConditionTo(key, levels)`; невідомий ключ — ігнор.
- `wfrp/tables/roll-table.ts`: `rollTable<T>(rows: readonly ({ max: number } & T)[], rng, preset?) => { index, row, roll }`; `rollCrit` переходить на нього (тексти/ids без змін).

### 4. Ядро (лише через `ruleSystemOf(rules).magic`)

`castSpell` (`spell/cast/index.ts`), після `fire(spellCast, before)`:
1. `magic = ruleSystemOf(params.rules).magic`; якщо є — `usesSlot = false`.
2. Немає `def.casting?.magic` або `resolution.kind !== "auto"` → `success: false`, причина `wfrpMagic.reject.notWfrpSpell` (мутація перетворює в 422 `BATTLE_SPELL_SYSTEM_MISMATCH`). DM-каст (`isDMCast`) і легендарний — без тесту (як «безкоштовний»).
3. `test = magic.castTest(...)`; `channelledSl` заклинача → 0; Fortune списується, якщо спрацювала.
4. Провал: результат `{ success: true, fizzled: true }` — дія витрачена (`spendCastCost` без слота), ефектів немає, рядки тесту; далі miscast, якщо є.
5. Успіх: `castLevel = spell.level + test.overcastSteps` (наявний апкаст), далі звичайний конвеєр; після ефектів — `magic.attribute` по вражених цілях, потім `magic.miscast`.
6. `CastSpellResult` отримує `cast?: PercentileCastDetails` → `actionDetails.percentileCast` (для `ActionResultCard`, 3D-кубиків і журналу).

`spell-mutation.ts`: `castSpellSchema` += `castRoll?: 1..100`, `serverRoll?: true`, `fortune?: "reroll" | "sl"`, `fortuneRoll?: 1..100` (refine: лише без `free`); перевірка `castRoll ≤ combat.dice`; `beginLongCast` пропускає перевірку слота для систем з `magic`; `fizzled` → подія без помилки `BATTLE_NO_FREE_SLOT`. Шкода по заклиначу (`applyDamageConsequences`) викликає `magic.onDamaged` — один виклик у `damage/consequences.ts` через `ruleSystemOf`.

Нова дія **channel**: `app/api/campaigns/[id]/battles/[battleId]/channel/route.ts` → `operations.ts` `channel` (access MEMBER, `requireActor`, `assertCanAct`, основна дія) → `lib/server/battles/mutations/channel/channel-mutation.ts` → `magic.channel` + `magic.miscast`; d20 → 422 `BATTLE_CHANNEL_UNSUPPORTED`.

### 5. Дельта, журнал, приватність

Усе через `runBattleMutation`: змінені учасники (`battleData.channelledSl`, `fortune`, стани, Wounds) + подія; `snapshotHash` як зараз; сцена не змінюється. Рядки: `wfrpMagic.log.cast{Success,Fail,Critical}` (`{name, spell, roll, target, sl, cn}`), `overcast`, `channel{Success,Fail}`, `miscast` + рядок таблиці. Стани від miscast/attribute — рядки `battleWfrp.log.applied`, які для гравців уже приховує `concealLine` (5c-2, сервер і Pusher). Нових прихованих полів немає: тест касту публічний, як кидок атакувальника. Гард `no-system-keys` поширюється на `wfrpMagic.` у `lib/utils/battle`.

### 6. UI (5d-2)

- `WFRP_SYSTEM.spells = true`; d20-специфічне на листі/в бою ховається за `magic.slots === false` (слоти, `SlotSelect`, `SaveRolls`, рівні-закладки).
- Бій: `SpellCastDialog` для систем з `magic` показує `CastTestBody` (обгортка над `D100RollBody`: пара d10/«Авто», Fortune; рядок «CN 6 · ціль 47 · channelling +2 · броня −0»); підсумок — `ActionResultCard` з `percentileCast` (SL vs CN, overcast, miscast). Плитка «Channelling» у `MyTurnControls` (`useBattleRules().magic`), хук `useChannel` (`battleOps.channel`), бейдж «+N SL» на токені (`EffectLine`-рядок).
- Лист: `SystemUi.MagicTab?` — wfrp-варіант: відомі заклинання за лорами (`group-by-school`), CN, вид, ціль Language (Magick) і Channelling; `CharacterProfile`/`ProfileEditor` беруть `systemUiOf(key).MagicTab ?? MagicTab`.
- Редактор заклинань: для wfrp-кампаній — блок «Магія d100» (CN, вид, overcast, attribute зі списку станів системи), `resolution` зафіксовано `auto`, рівень/слоти/save/attack сховано (`SPELL_RESOLUTION_KEYS` фільтрується).

### 7. i18n, онбординг

- `messages/{uk,en}/wfrpMagic.json`: `log.*`, `miscast.{minor,major}.<n>`, `reject.*`, `ui.*` (діалог, плитка, вкладка, редактор). Підвантаження: `ExtendLocaleScope` у `app/campaigns/[id]/layout.tsx`, коли `isWfrpCampaign(id)` (кешований сирий запит, уже є) — лист, редактор і бій успадковують; `WFRP_BATTLE_NAMESPACES` не змінюється (перевірити тестом, що вкладені `ExtendLocaleScope` додаються, а не замінюють). `label-keys-wfrpMagic.test.ts` для динамічних ключів (`miscast.*.<n>`, `kind.*`).
- Бюджет `scope-size`: база uk 102.8 / en 82.8 KB (кампанія + бій + battleWfrp), ліміт 105. Новий сценарій «campaign + battle + battleWfrp + wfrpMagic». Тексти таблиць — один рядок; довгі пояснення — у довідку. Якщо > 105 — П5.
- `whats-new`: запис `2026-11-xx-wfrp-magic` (audience `dm`, `href: /help/dm-rule-systems`) + `whatsNew.<id>` в обох мовах; розділ «Магія» в довідці `dm-rule-systems` (`help.json`). Робиться в 5d-2 (перша видима частина).

### 8. 5d-3 коротко

- **Молитви:** `kind: blessing | miracle` — тест `pray` (Fel) замість Language (Magick); Blessing — успіх тесту без CN; Miracle — CN як у магії; overcast для молитов немає; без channelling. **Sin:** `resources.sin` (0–10), ДМ змінює в `ResourcesDialog`, показ на листі; гнів богів, коли кидок Pray має дублі **і** одиниці ≤ Sin → таблиця `WRATH_TABLE` (як miscast). Числа — «звірити з книгою».
- **Інгредієнти:** для `magic` режим `optional`: запит `useIngredient: true` → `ingredientsGate` у режимі «optional» (немає → 422, як зараз), витрата наявним `spendIngredients`; витрачений інгредієнт скасовує miscast цього касту (рядок «інгредієнт поглинає провал»). `rules.spellIngredients.enabled` для wfrp-пресету — так.
- **Хвости:** перелік з «Меж» 5d-1/5d-2, що виявляться на live-run.

## Межі (свідомо не робиться)

- Числа (`OVERCAST_SL_STEP`, `ARMOUR_SL_PER_AP`, `CHANNEL_MAX_SL`, правила miscast на дублях, таблиці minor/major, Sin/гнів) **не звірені з книгою** — припущення; як і каталог станів 5c-3.
- Броня: AP = 0 до 5f, тож штраф касту завжди 0 (формула є й покрита тестом).
- Overcast лише як апкаст кубиків/цілей; дальність, площа, тривалість — ні. Вибору розподілу SL гравцем немає (вид overcast задано в заклинанні).
- Шкода заклинань іде наявним ефект-рушієм (без SL касту, TB й AP, на відміну від атаки) — кандидат у хвости 5d-3 після звірки.
- Таланти (Arcane/Petty Magic, Aethyric Attunement, Instinctive Diction) — 5e (кар'єри); каст доступний будь-кому з відомими заклинаннями.
- Редагований контент `tables` (DM), Corruption, мутації, Chaos-магія як окрема механіка, розвіювання (dispel), тривалі ритуали (`cost: "long"` для wfrp не підтримується — відмова в редакторі), каст поза боєм із листа, Fortune для channelling.
- Баланс: заклинання wfrp не враховуються в `hitModel`/чесному балансі.
- Сервер не перевіряє прапорець `spells` (як і зараз); wfrp-гілка вмикається наявністю `magic`.

## Тестування

- Чисті: `wfrp/magic/__tests__/{cast-test,channel,miscast,attribute,armour}.test.ts` (детермінований rng і `presetRoll`): SL ≥ CN межа (рівно CN — успіх), channelling додає SL, Petty без overcast, крит касту на дублях-успіху + minor, 100 → major, Fortune reroll/sl, броня на штучному AP, CHANNEL_MAX_SL обрізання, miscast застосовує стан і Wounds (0 → `wfrpOnZeroHp`). `wfrp/tables/__tests__/roll-table.test.ts` + наявні тести критів без змін.
- Ядро: `spell/cast/__tests__/wfrp-cast.test.ts` — без слотів, fizzle витрачає дію без ефектів, overcast піднімає `castLevel`, `channelledSl` → 0, attribute на вражених, d20-паритет (наявні тести без правок).
- Мутації: `spell-mutation` (save/attack у wfrp → 422, `castRoll` > 100 → 400, `fizzled` не дає помилки), `channel-mutation` (не свій хід, d20 → 422, дельта).
- `wfrp-magic-e2e.test.ts`: channel → cast з overcast → дублі → miscast стан на заклиначі.
- i18n: паритет, `label-keys-wfrpMagic`, `scope-size` з новим сценарієм, `no-system-keys`.
- Під час роботи — `pnpm test:related`/`test:changed`; повний прогін — один раз у кінці 5d; ESLint — лише змінені файли.

## Ризики

- `castSpell` — великий спільний конвеєр: wfrp-гілка має бути одним `if (magic)`-блоком на початку й одним після ефектів; паритет d20 тримають наявні тести.
- `fizzled` як `success: true` без ефектів: перевірити, що `finalizeCast` не кличе summons/zone і що FX не грає повну анімацію (FX «fizzle» — коротка або жодна).
- `onDamaged` у `applyDamageConsequences` — гарячий шлях: лише `ruleSystemOf(rules).magic?.onDamaged`, учасник без `channelledSl` повертається як є (без нового об'єкта).
- `import/no-cycle` (`maxDepth: 6`): `wfrp/magic` → `battle/damage` → … → `rules/systems`; повторити схему `ApplyDamageConsequences` (передача функції в ctx), як у `turnStart`.
- Бюджет i18n (запас ~2 KB gzip) — П5.
- `battle-sweep` homm/dnd5e на prodcopy досі не запускався для епіку: зміни в `castSpell`/`consequences` — ще один привід прогнати перед деплоєм епіку.

## Питання до користувача (закрито 2026-11-05: усі п'ять — рекомендовані варіанти, «так»)

- **П1. Числа без книги.** Робимо на припущеннях (CN ≤ SL, overcast кожні +2 SL, броня −1 SL/AP, дублі-провал → minor, 100 → major, channelling miscast лише на 100), усе в `magic/constants.ts` з позначкою «звірити»? *Рекомендація: так, як для каталогу станів.*
- **П2. Lore attribute.** У кожному заклинанні (`casting.magic.attribute`, без міграції) чи на лорі (нова JSON-колонка `spell_groups.magic` + `spell_groups_base`, expand-only)? *Рекомендація: у заклинанні; на лор — лише якщо 5g покаже незручність.*
- **П3. Таблиці miscast.** Зашиті в коді системи (як крити) зараз, редагований контент `tables` — у 5g? *Рекомендація: так.*
- **П4. Провал касту.** Дія витрачається, накопичене channelling згорає? *Рекомендація: так (обидва).*
- **П5. Бюджет i18n.** Якщо `wfrpMagic` переверне 105 KB: підняти ліміт лише для wfrp-сценарію до 108 KB чи вантажити `wfrpMagic` лише на сторінках листа/бою wfrp (окремий scope)? *Рекомендація: окремий ліміт 108 KB для wfrp-сценарію (d20-кампанії не ростуть), тексти коротко.*
