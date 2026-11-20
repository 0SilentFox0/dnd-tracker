# WFRP 5e механіки, хвиля A: розмір, модифікатори бою, шкода заклять, overcast

Гілка `feat/wfrp5-mechanics-finish` (worktree `../dnd-tracker-mech`, від main `ce7120aa8`). Джерело правди про відкрите: [2026-11-20-wfrp5-open-mechanics-after-content-wave.md](2026-11-20-wfrp5-open-mechanics-after-content-wave.md) п. 1, 2, 3, 6. Аудит: `docs/superpowers/research/2026-11-19-wfrp5-canon-audit.md` (A/M13, A/M14, A/M19, C/M-05, C/M-07, C/B-01..03). Канон: `~/Work/wfrp-extract/out/wfrp5/pages/pNNN.md`, лише перефраз + номер сторінки.

Правила виконання (з CLAUDE.md і пам'яті): усе нове за полем профілю редакції (`editionOf(rules)`), легасі незмінне; ядро не називає систему (нові шви — у `RuleSystemCombat` / `RuleSystemTestedMagic`, через `ruleSystemOf`); англ. мінімальні коментарі; тексти через i18n-ключі `uk`+`en`; агенти пишуть тести, але не запускають повний набір — наприкінці хвилі один прогін `test:related` + eslint по папках + `pnpm cycles`, потім повний `test:run` перед мерджем; battle-sweep homm/dnd5e на prodcopy (бо зачіпаємо спільний пайплайн атаки й касту) — лише за «так».

## 0. Що вже є (reuse, не дублювати)

| Потреба | Уже існує | Де |
|---|---|---|
| Ступінь розміру | `sizeStep`, `TRAIT_SIZES` (7 ступенів), `participantStats(p).size` | `systems/wfrp/rules/traits/read.ts`, `rule…/trait-kinds.ts` |
| Розмір у бою (неканон) | `sizeHitMod` (+10/ступінь), `sizeDamageBonus` (×база/ступінь) | `traits/size.ts`, споживачі `resolve-attack.ts:708,804`, `mitigate.ts:106`, баланс `combat/hit-model.ts:33-72` |
| Outnumber / Surrounded | `engagedFoes`, `isOutnumbering` (2:1 без ваг), `isSurrounded` (≥3), лог `surroundedNote` | `combat/engagement.ts`, `resolve-attack.ts:481` |
| SL-джерела, Advantage | `resolveModeSources` (пари скасовуються), `resolveOpposed({attackerSlMod, defenderSlByKind, defenderHelpless, attackerForced})` | `percentile/advantage.ts`, `combat/opposed.ts` |
| Стан-модифікатори | `againstSl` (Prone/Blinded → Advantage, Surprised +2 SL; лише melee), `selfSlMod`, `selfModes`, `cannotDefend` (Surprised) | `conditions/test-mod.ts` |
| Захист за типом | `canonDefence(...).sl.{parry,dodge}` | `combat/defence.ts` |
| Off-hand −2 SL | `OFFHAND_SL_PENALTY` | `combat/constants.ts` |
| Вибрана локація | `fortuneInput.location` + `asLocation`, `hitLocation(rawRoll, split)`, `reverseRoll` | `combat/location.ts`, `resolve-attack.ts:587` |
| Укриття (core) | `lineOfFire(map, ps, shooter, target).blocked` (учасники + `blockedSet(map)`), core ріже шкоду навпіл `applyObstacle` | `lib/utils/battle/grid/line-of-fire.ts`, `attack-phase/run-attack-phase.ts:403`, `attack/process/compute.ts:251,281` |
| Смуги дальності (core) | `rangeBands(range, rules)` → `{normal,long}` з першого/останнього числа рядка `range`; `attackReachError` відкидає > `long` | `lib/utils/battle/grid/reach-check.ts` |
| Пересування за хід | `battleData.movementUsed` (скидається на старті ходу) | `types/battle.ts:382`, `turn/turn-state.ts:23` |
| Рельєф / погода | `map.terrain[cellKey].kind === 'difficult'`, `isObscured(map,p)`, `map.weather` (`WEATHER_KINDS`) | `lib/utils/battle/grid/terrain.ts`, `lib/constants/battle-weather.ts` |
| Таблиця overcast p236 | `OVERCAST_TABLE`, `overcastRowOf(budget)`, бюджет `min(IB+WPB, SL−CN (+десятки при totalPower))` — зараз весь іде у шкоду | `magic/constants.ts:45`, `magic/cast-test.ts:204-216` |
| Overcast молитов | `BLESSING_OVERCAST`, `prayerOvercast` (лише в деталях, не застосовується) | `magic/prayer-overcast.ts` |
| Шкода заклять (core) | `computeSpellPower` (кубики + `damageBonus` = `overcastDamage`), `dealSpellDamage` → `applyResistance` (лише відсотки) | `lib/utils/battle/spell/power.ts`, `spell/cast/effects.ts:214-316`, `spell/cast/index.ts:239-337` |
| Система-мітигація | `combat.damage(ctx).mitigated` → `MitigateResult{amount, steps, afterHit}`; конвертер кроків `mitigateHit` | `lib/utils/battle/attack/process/compute.ts:467-523`; wfrp `computeWfrpDamage` (`combat/damage.ts`), `rollCrit`/`applyWfrpCrit` |
| Вхід атаки/касту | `WfrpFortuneInputSchema` (`attackInput` і `castInput`), `FORTUNE_INPUT.read(ctx.system)` | `systems/wfrp/server/attack-input.ts`, `percentile/fortune.ts` |
| Бойова операція | зразок `channel-mutation.ts`, `WFRP_OPERATIONS` | `systems/wfrp/server/battle/`, `server/operations.ts` |
| Канон-тести | `bookExample(page, title, run)`, `CANON`, `LEGACY`, `NO_RNG` | `systems/wfrp/__tests__/canon/book-example.ts` |
| Бекфіл зі знімком | `parseExtArgs`, `writeSnapshotAtomically`, `activeBattleCampaigns`, CAS-запис, `assertSeedTarget` | `scripts/db/lib/backfill-ext-{common,db}.ts`, зразок `scripts/db/backfill-morale-ext.ts` |

Нового core-коду для укриття, дальності, рельєфу не пишемо: wfrp читає ті самі хелпери.

## 1. Рішення, спільні для хвилі

- **Профіль редакції.** Нове поле `combatModsModel: 'legacy' | 'canon5e'` у `EditionProfile` (`rules/edition/schema.ts`, `profiles.ts`; `canon5e` = `canon5e`). Покриває A1 і A2. A3/A4 — під уже наявним `magicModel: 'canon5e'`; A3 додатково вмикається даними (поле `missile` у закляття, див. A3), щоб легасі-кампанії з `spellRoll` не змінились.
- **Єдиний збирач модифікаторів атаки** (аудит A/M13: «єдиний список модифікаторів SL»): новий файл `systems/wfrp/rules/combat/attack-mods.ts`. Він замінює розкидані доданки в `resolveAttackCore` (size, outnumber, off-hand, hatred, againstSl) для `canon5e`; під `legacy` повертає рівно поточну поведінку (+10 цілі за outnumber, `sizeHitMod`), щоб легасі-тести не змінювались.
- **Лог модифікаторів**: `PercentileAttackDetails.mods?: { key: AttackModKey; sl: number }[]` (`percentile/details.ts`), рядки в `PercentileResultLines` через ключі `battleWfrp.mods.<key>`. Вікно показує, звідки SL (зараз гравець бачить лише підсумок).
- **Ситуативні модифікатори без даних мапи** (висота, тісний простір, бруд поза terrain): прапорці у вході атаки `system.data.situational` (див. A2), видимі в пікері; хто може їх ставити — питання Q8.

```ts
// systems/wfrp/rules/combat/attack-mods.ts
export type AttackModKey =
  | 'sizeRanged' | 'outnumbered' | 'surrounded' | 'offHand' | 'hatred'
  | 'highGround' | 'defenderHighGround' | 'terrain' | 'enclosed' | 'attackerProne'
  | 'targetEntangled' | 'targetSurprised' | 'targetProneRanged' | 'calledShot'
  | 'range' | 'cover' | 'aim' | 'moved' | 'weather' | 'intoMelee' | 'talent' | 'quality';
export interface AttackMod { key: AttackModKey; sl: number; advantage?: number; disadvantage?: number }
export interface AttackModCtx {
  attacker: BattleParticipant; target: BattleParticipant; attack: BattleAttack;
  participants: BattleParticipant[]; map: BattleMapConfig | null | undefined;
  edition: EditionProfile; input: WfrpAttackInput | undefined; obstacle?: boolean;
}
export function meleeAttackMods(ctx: AttackModCtx): AttackMod[];
export function rangedAttackMods(ctx: AttackModCtx): AttackMod[];
export function sumAttackMods(mods: AttackMod[]): { sl: number; advantage: number; disadvantage: number };
```

## A1. Розмір (M14, C/B-01, C/B-02, C/B-03) — S–M

### Канон
- p360 «Size Combat Modifiers»: Large і Enormous додають +SB до шкоди, Monstrous +2×SB; **абсолютно, не за різницею з ціллю**; не діє для дальніх, Free Attacks і додаткових атак; «профілі NPC уже включають» (див. Q1).
- p360 «Defending Against Big Creatures»: −2 SL на захист **Melee-навичкою** (парирування) проти більшої істоти; ухилення без штрафу.
- p166 таблиця дальніх: ціль більша за стрільця +1 SL, Monstrous +2 SL; менша −1 SL. У ближньому бою розмір влучання не змінює.
- p360 «Outnumbering Larger Creatures»: при перевірці, чи **ця** сторона в меншості, Large важить 2, Enormous 3, Monstrous 4; сторона, що переважає, рахує великих по 1 (2 огри проти людини — 2:1, не 4:1).
- p360 «five steps of Size, Small to Monstrous»; p361 Wounds: Small = 2×TB (без WPB), Average = SB+2TB+WPB, Large ×2, Enormous ×4, Monstrous ×8.
- p362 Swarm: рої ігнорують усі правила Size (сам Swarm — хвиля B).

### Рішення
- **Tiny/Little:** у книзі немає (p360). Під `combatModsModel: 'canon5e'` ступінь клампиться до `small` (`canonStep = max(sizeStep(size), sizeStep('small'))`) у всіх розмірних формулах; enum `TRAIT_SIZES` не чіпаємо (expand-only, легасі-дані). Валідатор шаблону grim (`scripts/templates/grim-d100/validate.ts`) відкидає `tiny`/`little`; 2 юніти-рої (`bog-leech-swarm`, `gloom-mite-swarm`) втрачають рядок `Size (Little)` (p362: рій ігнорує Size). Підтвердження — Q2.
- **Подвійний облік шкоди:** додаємо в `ATTACK_SLOT` прапорець `sizeBaked?: true`; `unit-build.ts` ставить його для трейт-атак істот (Weapon/Bite/Horns… з бестіарію, де «профіль уже включає»), зброя зі спорядження — без нього. `+SB` додається лише при відсутньому `sizeBaked`. Суперечність p360 vs приклад p361 (павук Large: +2 лише від росту SB) — Q1.
- **Free/extra attacks:** `ResolveAttackCtx.offTurn` (вже є) і `wfrpState.momentumAttack` → `PercentileAttackDetails.free: true`; мітигація читає це через новий `MitigateCtx.system` (див. нижче).

### Файли й сигнатури
```ts
// traits/size.ts (переписати; легасі-гілки лишаються під edition)
export const canonSizeStep = (p: BattleParticipant): number;            // clamp tiny/little → small
export function sizeRangedSl(attacker, target): number;                 // +1 / +2 (Monstrous) / −1
export function sizeDamageBonus(attacker, sb: number, edition, opts: { ranged: boolean; free: boolean; baked: boolean }): number; // canon: Large/Enormous SB, Monstrous 2·SB
export function sizeParrySl(defender, attacker, edition): number;       // −2 коли attacker більший; 0 для легасі
export function outnumberWeight(p: BattleParticipant, edition): number; // 1/1/2/3/4; легасі 1
// traits/constants.ts: SIZE_PARRY_SL = -2, SIZE_RANGED_SL = { larger: 1, monstrous: 2, smaller: -1 }, SIZE_OUTNUMBER_WEIGHT, SIZE_DAMAGE_SB = { large: 1, enormous: 1, monstrous: 2 }
// combat/engagement.ts
export function isOutnumbering(attacker, target, participants, map, edition?): boolean; // attackers (вага 1) ≥ 2 × Σ outnumberWeight(сторона цілі)
```
- `combat/defence.ts` `canonDefence`: `sl.parry += sizeParrySl(...)`; для `attackTarget !== 'skill'` (без canonDefence) — передати через `defenderSlByKind`.
- `combat/mitigate.ts`: замінити виклик `sizeDamageBonus(attacker, target, base)`.
- **Core-шов:** `MitigateCtx.system?: SystemSlot` (= `attackRoll.system`), передає `mitigateHit` у `compute.ts:485`. Узагальнене, d20 ігнорує.
- `combat/hit-model.ts:33-72` (баланс): дзеркально новим формулам під canon5e (влучання без розміру в melee; шкода +SB/+2SB). Інваріант balance.md: setup і старт бою кличуть той самий `computeFairScaling` — не порушується, але числа справедливого масштабу для wfrp зміняться → sweep.
- `scripts/templates/systems/wfrp/units.ts` `unitWounds`: Small = 2×TB (прибрати WPB, p361); `tiny`/`little` → гілка Small під canon; перегенерувати `data/templates/grim-d100/units.json` (4 small + 2 рої, перевірити diff `maxHp`).

### Тест-кейси (`systems/wfrp/__tests__/canon/size.test.ts`)
- `bookExample(360, 'four Average outnumber one Large 2:1, three do not')`.
- `bookExample(360, 'two Large ogres outnumber one human 2:1, not 4:1')` (вага лише для сторони в меншості).
- `bookExample(360, 'four Large outnumber one Monstrous')`.
- `bookExample(360, 'Large adds SB, Enormous SB, Monstrous 2xSB to melee damage')`; той самий удар дальнім/free/momentum-атакою — без бонусу; `sizeBaked` атака — без бонусу.
- `bookExample(360, 'parry against a larger foe -2 SL, dodge unaffected')`.
- `bookExample(166, 'shooting a larger target +1 SL, Monstrous +2, smaller -1')`; melee — 0 від розміру.
- `bookExample(361, 'Small wounds = 2 x TB')`; `bookExample(360, 'Little counts as Small under canon5e')`.
- Легасі: `sizeHitMod`/`sizeDamageBonus` поводяться як раніше (наявні тести `traits/__tests__` не міняються).

## A2. Модифікатори бою M13 — L

### Канон (p165-167, p302)
- Кидки атаки зазвичай Challenging (+0); модифікатори лише для тесту атакуючого, захисник не отримує дзеркального штрафу (p166).
- **Melee:** ціль outnumbered +1 **або** surrounded +2; Surprised +1; висота атакуючого +1 / захисника −1; ціль Entangled +1; атакуючий у бруді/воді/складному рельєфі −1; тісний простір зі зброєю Average −1 / довшою −2; атакуючий Prone −1; off-hand −2.
- **Ranged:** розмір (A1); Short +1, Point Blank +2, Long −1, Extreme −2; ціль Surprised +1; ціль в укритті або Prone −1; прицілювання +1; туман/сутінки −1, дощ і вітер −2, екстремальна погода/темрява −3; стрілець рухався −1.
- Смуги (p302): Point Blank = 4 ярди, Short = range/2, Medium = range, Long = ×2, Extreme = ×3.
- Aimed shot (p167): дія прицілювання → +1 SL на наступний постріл саме в цю ціль; бонус втрачається, якщо до пострілу робиш щось інше (рух, захист).
- Called shot (p167): −2 SL, при влучанні — локація на вибір.
- Shooting into melee (p167): постріл у ціль, що в сутичці, — Disadvantage; якщо саме це перетворило влучання на промах — влучає випадкового учасника сутички (Q9). Shooting into group (6+) — Advantage, випадкова ціль (відкласти, Q9).
- Helpless (p167): melee або ранжований на Point Blank проти сплячого/непритомного/Helpless — атакуючий **обирає результат кидка**, автовлучання, локація на вибір при криті; опція «летальна гра» — одразу вбиває; хто може протистояти, але відмовився, — Helpless.
- Outnumbering (p167): сторона має ≥2× учасників у сутичці; Surrounded — немає шляху відступу, зазвичай ≥3 нападників (у тісноті 2).
- Point Blank (p165): ціль може протиставити Dodge (Q12).

### Рішення
- **Outnumbered/Surrounded** під canon: `surrounded ? +2 : outnumbered ? +1` SL у `meleeAttackMods`; `OUTNUMBERING_BONUS = 10` лишається лише для legacy. Surrounded = `isSurrounded(engagedFoes(target))` (≥3, вже є); «тісний коридор = 2» не моделюємо.
- **Смуги дальності:** `extract-attacks.ts` під canon5e пише `range: '${m}/${3*m} ft'` (Medium/Extreme) для зброї й трейт-атак (`unit-build.ts`, `RANGED_DEFAULT_RANGE_FT`) — core `rangeBands`/`attackReachError` тоді пропускає до Extreme без змін ядра. Смугу рахує wfrp: `rangeBandOf(distanceYards, mediumYards)`; відстань = `footprintDistance(cellsOf(a), cellsOf(t)) * cellFeetOf(rules) / 3`. Без мапи — Medium (0).
- **Укриття — core-шов, не дублікат:** `ResolveAttackCtx.obstacle?: boolean` (core уже рахує `lineOfFire(...).blocked` для дальніх у `run-attack-phase.ts:403`; прокинути через `attack/process/run.ts` `attackCtx` і `server-attack.ts`) і `ResolvedAttack.obstacleInTest?: true` → `compute.ts` не викликає `applyObstacle`, якщо резолвер уже врахував укриття тестом. wfrp: `obstacle` → `cover −1 SL`, `obstacleInTest: true`. d20 не змінюється.
- **Рух стрільця:** `movementUsed > 0` у поточному ході → −1 SL (канон: «moved before firing»).
- **Погода:** `map.weather` → SL за таблицею `WEATHER_SL` (`fog −1`, `rain −2`, `snow −2`, `storm −3`, `blizzard −3`, `embers 0`, `crypt −1`?) і `isObscured(map, target)` → −1 — значення відображення не з книги, Q7.
- **Рельєф:** клітинка атакуючого `difficult` → −1 SL (melee).
- **Висота / тісний простір:** без висоти в моделі мапи — ситуативні прапорці `situational.highGround: 'attacker' | 'defender'`, `situational.enclosed: true` (Q8).
- **Prone/Surprised/Entangled:** розширити `againstSl(target, kind, edition)` на ranged (Surprised +1, Prone −1) і Entangled +1 melee; Attacker Prone −1 у `selfSlMod`-сусіда `selfAttackSl`. Розбіжність Surprised: `againstSl` зараз дає +2 SL (melee, посилання p185-187), таблиця p166 — +1: виконавець звіряє p187 і фіксує одне значення з тестом (не вигадувати; якщо сторінки суперечать — Q13).
- **Called shot:** вхід `system.data.calledShot?: HitSpot` → −2 SL; при влучанні `details.location = calledShot` (той самий шлях, що `pickedLocation` для `notFail`).
- **Aim:** нова бойова операція `aim` (`server/battle/aim-mutation.ts` за зразком `channel-mutation.ts`, витрачає Action; `lib/api` + хук через наявний wfrp operations-маршрут), стан `wfrpState.aim = { targetId, movementUsed }`. Валідний, якщо `targetId === target` і `movementUsed` не змінився; скидається: будь-яка атака/каст (attackerUpdate), участь у протиборчому тесті як захисник (targetUpdate), рух (перевірка snapshot). Рядок UI — кнопка «Прицілитись» у панелі дій wfrp.
- **Shooting into melee:** ціль має `engagedFoes(target)` без самого стрільця → `disadvantage +1` через `resolveModeSources`. Переадресацію промаху **відкласти** (потрібен core-ретаргет), Q9.
- **Helpless (повний):** `isHelpless(p, edition) = status UNCONSCIOUS || condition unconscious || helpless-marker` (Surprised лишається `cannotDefend`: захисник автопровалює, атакуючий кидає). Для melee і PB-ranged: атакуючий не кидає — `forced` результат (`resolvePercentileTest({ forced })`, уже є з M08) з найкращим кидком: найменший дубль ≤ цілі (крит) або 01; при криті — `calledShot`/`location` з входу. Летальна опція — правило кампанії (Q10). Блокер: core `isUp = status === ACTIVE` не дає цілити Unconscious (Q10).
- **Point Blank Dodge** (p165) — окремий підпункт, лише за «так» (Q12).

### Вхід (розширити `systems/wfrp/server/attack-input.ts`)
```ts
data: {
  ...fortune,
  calledShot?: HitSpot;
  situational?: { highGround?: 'attacker' | 'defender'; enclosed?: true; badFooting?: true };
}
```

### Тест-кейси (`canon/combat-mods.test.ts`, `canon/ranged-mods.test.ts`, `canon/helpless.test.ts`)
- `bookExample(166, 'outnumbered target +1 SL, surrounded +2 SL, not cumulative')`; захисник без −1 (`bookExample(166, 'defender gets no mirrored penalty')`).
- `bookExample(166, 'outnumbering gives no SL to a ranged attack')`.
- `bookExample(302, 'bow range 50: 4 yd PB +2, 25 Short +1, 50 Medium 0, 100 Long -1, 150 Extreme -2, 151 rejected')`; `bookExample(302, 'pistol range 20: 10 yd is Short')`.
- `bookExample(166, 'target behind cover -1 SL and damage is not halved')` (core: `obstacleInTest` вимикає `applyObstacle`; d20-регрес: половина як раніше).
- `bookExample(167, 'aim +1 SL on the next shot at that target; lost after moving')`; ціль інша — 0.
- `bookExample(166, 'attacker moved before firing -1 SL')`.
- `bookExample(167, 'called shot -2 SL, hit lands on the chosen location')`.
- `bookExample(167, 'shooting an engaged target has Disadvantage')`; з Advantage (Fortune) — скасовуються (`resolveModeSources`).
- `bookExample(167, 'melee against an unconscious target hits automatically, attacker picks the roll')`; ranged на Medium — звичайний кидок; на PB — авто.
- `bookExample(166, 'attacker in difficult terrain -1 SL melee')`.
- Легасі-регрес: `OUTNUMBERING_BONUS` +10 і `sizeHitMod` як раніше (`LEGACY`).

## A3. Шкода заклять C/M-07 — L (ядро spell-effect + 28 рядків контенту)

### Канон
- p235 Magic Missiles: шкода = заявлена Damage заклинання + WPB; зменшується TB і AP «як завжди»; локація — **перевернутий кидок касту** за таблицею локацій (p164). p164: мінімум 1 Wound.
- p235 Critical Casting «Critical Damage»: якщо закляття шкодить — ще й Critical Wound у влучену локацію (або Body).
- p240 Dart: +0; p240 Leech-touch-аналог: +0, ігнорує AP, лікує 1; p243 Blast +3 (усім у зоні), Bolt +4, Chain Attack +4 (з перескоками), Breath = WPB + лор-надбавка; p259 Coruscating Arc +10 (за аудитом).
- Молитви-шкідники (p223-228, рядки маніфесту 176, 205, 206, 215): 1d10 Wounds, **ігнорують TB і AP**, часто +1 за SL — це не magic missile.

### Рішення (дані)
- `SpellMagicSchema` (`lib/utils/spells/model/schema.ts`, загальна для tested-magic, без імені системи) + опційне:
  ```ts
  missile: z.object({
    wpb: z.boolean().default(true),               // add caster WPB
    ignore: z.array(z.enum(['tb', 'ap'])).max(2).optional(),
    perSl: z.number().int().min(0).max(5).optional(), // +N per SL of the test (prayers)
  }).optional()
  ```
- Ефект `dealDamage.amount`: число (заявлена Damage) для missile, `'1d10'` для молитов — обидві форми вже дозволені `AmountSchema`; `spellRoll`, `dice`, `upcastDice` прибираються з цих рядків.
- Поведінка: missile-шлях лише коли `magicModel === 'canon5e'` **і** `magic.missile` присутній; інакше — поточний `spellRoll` (легасі й неоновлені кампанії не ламаються).

### Рішення (рушій, core-шов)
```ts
// lib/utils/rules/systems/types-magic.ts — RuleSystemTestedMagic
spellHit?(ctx: SpellHitCtx): MitigateResult | null;  // null = core keeps its own path
export interface SpellHitCtx {
  caster: BattleParticipant; target: BattleParticipant; magic: SpellMagic;
  amount: number;            // resolved effect amount after falloff share
  overcastDamage: number;    // from CastTestResult
  cast: CastTestResult;      // system reads its own details (roll, sl, critBonus)
  rules: Ruleset; rng: Rng;
}
```
- `spell/cast/effects.ts` `dealSpellDamage`: якщо `percentile?.spellHit` повернув результат — `amount`, кроки (спільний конвертер, винесений із `compute.ts` `mitigateHit` у `lib/utils/battle/damage/mitigated-steps.ts`), далі `applyResistance` (як в атаці: спершу мітигація системи, потім відсотки), `applyRawDamage`, `applyFlowDamage`, потім `afterHit(p, round)` (новий виклик у spell-шляху; core-інваріант «шкода → `applyDamageConsequences` одразу після примітиву» зберігається, бо `applyFlowDamage` лишається поруч). `state.overcastDamage` у missile-шляху **не** йде в `computeSpellPower.damageBonus` (інакше подвійно).
- wfrp `systems/wfrp/rules/magic/spell-hit.ts`:
  ```ts
  export function wfrpSpellHit(ctx: SpellHitCtx): MitigateResult | null;
  // steps: spell (amount), wpb, overcast, sl (perSl×SL), −tb, −ap@location, minimum 1 (p164);
  // location = hitLocation(cast roll reversed, split); ignore[] drops tb/ap steps;
  // critBonus 'criticalDamage' → afterHit: rollCrit(location) + applyWfrpCrit (reuse mitigate.ts pieces)
  ```
  Реюз: `computeWfrpDamage` (`combat/damage.ts`: `weapon`=amount, `sb`=WPB, `netSl`=overcast+perSl·SL, `tb`, `ap`, `minDamage: 1`), `apAt`, `hitLocation`, `rollCrit`, `applyWfrpCrit`. Ward (`wardRoll`) — як у мітигації зброї.
- Баланс: `heroPower`/`unitStats` для заклинань wfrp (якщо hit-model рахує spellRoll) — перевірити й узгодити, інакше справедливий масштаб занижує магів.

### Міграція даних (проєкт, не запускати)
1. **Шаблон** `data/templates/grim-d100/spells.json`: генераторний скрипт `scripts/templates/systems/wfrp/spell-missiles.ts` з таблицею `slug → { amount, missile, page }`; значення **лише з книги** через маніфест `docs/superpowers/plans/wfrp5-content-manifest/spells.md` (стовпці page/CN, рядки 5, 7, 30-33, 45, 54, 56, 60-64, 72-76, 90, 105, 123, 128, 130, 136-140, 176, 205, 206, 215). Що не звіряється (Elemental Exhale за лором, Chain Attack перескоки, blessing `hearth-spark`, petty `spark-flick` vs Dart) — у Q11/Q13, рядок лишається `spellRoll` або `executionMode: manual`. Валідатор grim: missile-рядок має число/`1d10` і `cn`, без `spellRoll`.
2. **БД кампаній** (рядки `spells`, скопійовані з шаблону): `scripts/db/backfill-wfrp-spell-missile.ts` + чиста `scripts/db/lib/backfill-wfrp-spell-missile-plan.ts` (тест у `scripts/db/lib/__tests__/`). Вибір: кампанії з `rules.system.key` бази wfrp; рядок оновлюється, лише якщо його визначення дорівнює старому шаблонному (хеш); змінені DM рядки — у звіт, без запису. За замовчуванням dry-run; `--apply` відмовляє при активних боях (`activeBattleCampaigns`), CAS на текст визначення, знімок для `--revert`, `assertSeedTarget` (+`--allow-remote`). Репетиція: prodcopy (`prodcopy_<suffix>`) → звіт → «так» → прод. Точні колонки (definition JSON vs `diceCount/diceType`) виконавець звіряє з `prisma/schema/core.prisma` `model Spell` і з тим, як шаблон пише рядок (`scripts/templates/lib`).
3. **Публікація шаблону** `pnpm template publish grim-d100 --dry-run` → «так» власника.
4. Нічого не видаляємо (expand-only): `overcast: 'dice'` лишається у схемі для легасі.

### Тест-кейси (`canon/spell-damage.test.ts`, `scripts/db/lib/__tests__/backfill-wfrp-spell-missile-plan.test.ts`)
- `bookExample(243, 'Bolt +4, WPB 4 vs TB 3 and 1 AP on the struck location: 4 Wounds')`.
- `bookExample(240, 'Dart +0, WPB 2 vs TB 4: minimum 1 Wound (p164)')`.
- `bookExample(240, 'touch drain ignores AP')`; `bookExample(227, 'prayer burst 1d10 ignores TB and AP')`.
- `bookExample(235, 'location comes from the reversed casting roll')` (кидок 32 → 23 → рука).
- `bookExample(235, 'Critical Casting: Critical Damage adds a Critical Wound to the struck location')`.
- `bookExample(236, 'overcast +2 Damage adds to a magic missile, not doubled by spell power')`.
- Легасі-регрес: закляття без `missile` (dnd5e, homm, wfrp legacy) — `dealSpellDamage` без змін.
- План бекфілу: шаблонний рядок → оновлено; змінений DM — пропуск у звіті; не-wfrp кампанія — не торкається; повтор — 0 змін (ідемпотентність).

## A4. Overcast напрямки M19 / C/M-05 — M

### Канон (p236, p235, p237, p217-222)
- Зайві SL понад CN витрачаються в межах IB + WPB; можна додати дальність, зону, тривалість або цілі; magic missile — ще й шкоду; закляття можуть мати власні опції.
- Range «You» — лише заклинатель; Touch, Instant або Special — не продовжуються; без зони — зону не збільшити. Petty — без overcast (p236). Незапам'ятоване з гримуару — без overcast (p237; не моделюємо).
- Таблиця p236: цілі +1@2, +2@8, +3@18; шкода +1..+7 @1/2/3/5/8/13/18; дальність ×2@2, ×3@8, ×4@18; тривалість ×2@3, ×3@13; зона ×2@5, ×3@18 (рядок 8 зіпсований екстрактом — Q3).
- Critical Casting «Total Power» (p235): + десятки кидка до SL для overcast (уже є).
- Благословення: +6 ярдів / +1 ціль / +6 раундів за кожні +2 SL (p220; `BLESSING_OVERCAST`, уже є, але не застосовується).

### Рішення
- **План витрат до кидка**: вхід касту `system.data.overcast?: { damage?: n; targets?: n; range?: n; aoe?: n; duration?: n }` (SL на напрямок). Сервер після кидка витрачає бюджет у порядку `targets → range → aoe → duration → damage`, обрізаючи до бюджету; залишок при відсутньому плані — у шкоду (поточна поведінка для missile). Пост-кидкове вікно вибору (pending, як crit-choice) — лише якщо власник скаже (Q4). Розподіл між кількома напрямками дозволено (Q5).
- **Бонус напрямку** = рядок таблиці за **витраченими на нього** SL (`overcastRowOf(spent)[column]`), не за загальним бюджетом.
- **Допустимі напрямки** виводяться з даних закляття (canon5e ігнорує легасі-поле `overcast` для дозволу): `damage` — є `missile`; `targets` — `targeting.maxTargets`/`kind: 'enemy'|'ally'`; `range` — числовий `targeting.range` і не Touch (`range ≤ 5`)/You; `aoe` — `targeting.kind === 'template'`; `duration` — ефекти з `duration.rounds` або зона з `rounds`. Petty — нічого.
- **Core-шов** (генеричне «розширення касту»):
  ```ts
  // types-magic.ts
  export interface CastExtension { targets: number; rangeMul: number; rangeAddFt: number; aoeMul: number; durationMul: number; durationAddRounds: number }
  CastTestResult.extension?: CastExtension;                           // actual, after the roll
  RuleSystemTestedMagic.maxExtension?(caster: BattleParticipant, magic: SpellMagic): CastExtension; // upper bound before the roll
  ```
  - До кидка (`spell-targeting.ts`, клієнтський пікер і серверна валідація цілей): ліміт цілей/дальності/зони = база × `maxExtension` (бюджет IB+WPB заклинателя → рядок таблиці).
  - Після кидка (`spell/cast/index.ts`): `trimToExtension(targetIds, extension)` — зайві цілі (понад база+targets) і ті, що за фактичною дальністю/радіусом, відпадають із рядком логу `battleLog.spellFx.beyondOvercast` (Q6).
  - Тривалість: хелпер `scaledRounds(rounds, ext)` у місцях касту, що створюють ефекти/зони з `duration.rounds` (`spell/cast/anchored-zone.ts`, `hit-rider.ts`, `grant-*.ts`, застосування ефектів у `runEffect`); Instant не продовжується.
- wfrp: `magic/overcast.ts`
  ```ts
  export type OvercastDirection = 'damage' | 'targets' | 'range' | 'aoe' | 'duration';
  export function overcastDirections(magic: SpellMagic, spell: CastableSpell): OvercastDirection[];
  export function spendOvercast(budget: number, plan: Partial<Record<OvercastDirection, number>>, allowed: OvercastDirection[]): { spent: Partial<Record<OvercastDirection, number>>; extension: CastExtension; damage: number };
  export function blessingExtension(p: PrayerOvercast): CastExtension; // +6 yd → feet, +1 target, +6 rounds
  ```
  `cast-test.ts` повертає `overcastDamage` = `damage` і `extension`; `details.cast.overcast = spent` для `CastResultLines` (рядок «Overcast: +1 ціль, ×2 дальність»). `prayerOvercast` — через `blessingExtension` (закриває «не застосовується»).
- UI: у діалозі касту wfrp (`systems/wfrp/ui/battle/…` пікер Fortune) — степпери SL за напрямками, підказка бюджету з `castPreview` (`IB+WPB`); пусто = «все в шкоду».

### Тест-кейси (`canon/overcast.test.ts`)
- `bookExample(236, 'overcast budget is capped at IB + WPB')` (вже частково є — розширити).
- `bookExample(236, '2 SL buy +1 target or x2 range or +2 Damage; split 2 range + 1 damage')`.
- `bookExample(236, 'bonus is read from the SL spent on that column: 5 SL on damage = +4')`.
- `bookExample(236, 'Touch range and Instant duration cannot be extended; no area, no AoE bonus')`.
- `bookExample(236, 'Petty spells cannot be overcast')`.
- `bookExample(235, 'Total Power adds the tens digit to the overcast budget')`.
- `bookExample(220, 'blessing +2 SL: +6 yards range applied to reach')`.
- Core: зайва ціль відкинута після касту з меншим SL; d20 upcast (`overcastSteps` + кубики) без змін.

## Залежності й порядок

```
D1 (A1 + A2-melee/helpless) ──► D2 (A2-ranged + cover/aim)
D3 (A3 engine + data + backfill) ──► D4 (A4 overcast)
```
- D1 і D2 правлять той самий `resolveAttackCore` і `attack-mods.ts` → послідовно.
- D3 не перетинається з D1/D2 за файлами (лише `MitigateCtx`/`compute.ts` — D1 додає `system`, D3 виносить конвертер кроків із `mitigateHit`): D3 стартує після злиття D1 або в окремому worktree з ребейзом перед D4.
- D4 після D3: overcast-шкода переїжджає у `spellHit`, а `CastTestResult` розширюється обома.
- Під кожен dispatch — модель Sonnet; Opus — фінальне рев'ю хвилі.

## Dispatch'і для Sonnet

**D1. Розмір + melee-модифікатори + Helpless** (задачі: A1 повністю; A2: `attack-mods.ts` із melee-частиною, outnumbered/surrounded як SL, рельєф, ситуативні прапорці, called shot, Prone/Entangled; Helpless). Файли: `traits/{size,constants}.ts`, `combat/{engagement,defence,mitigate,resolve-attack,attack-mods,hit-model,constants}.ts`, `conditions/test-mod.ts`, `edition/{schema,profiles}.ts`, `percentile/details.ts`, `server/attack-input.ts`, core `types-combat.ts` (`MitigateCtx.system`) + `compute.ts`, `unit-build.ts`, `scripts/templates/systems/wfrp/units.ts`, `validate.ts`, перегенерація `units.json`, i18n `battleWfrp.mods.*`, `PercentileResultLines`. Тести: `canon/size.test.ts`, `canon/combat-mods.test.ts`, `canon/helpless.test.ts`.

**D2. Ranged-модифікатори + укриття + прицілювання** (задачі: смуги дальності через `range` `m/3m`; `rangedAttackMods` — розмір, дальність, cover, moved, weather, Surprised/Prone, into-melee Disadvantage; core-шов `obstacle`/`obstacleInTest`; операція `aim` з API/хуком/кнопкою). Файли: `combat/{attack-mods,resolve-attack,extract-attacks}.ts`, `traits/unit-build.ts`, core `types-combat.ts`, `attack/process/{run,compute}.ts`, `attack/server-attack.ts`, `server/battle/aim-mutation.ts`, `server/operations.ts`, `lib/api` + `systems/wfrp/hooks`, UI дій wfrp, i18n. Тести: `canon/ranged-mods.test.ts`, core-регрес `obstacle` для d20 у `lib/utils/battle/attack/process/__tests__`.

**D3. Шкода заклять: шов + дані + бекфіл** (задачі: `SpellMagicSchema.missile`, `spellHit` шов і `wfrpSpellHit`, `afterHit` у spell-шляху, критичне `criticalDamage`; генератор `spell-missiles.ts` + валідатор + `spells.json`; бекфіл-скрипт + план + тест). Файли: `lib/utils/spells/model/schema.ts`, `lib/utils/rules/systems/types-magic.ts`, `lib/utils/battle/spell/cast/{effects,index}.ts`, `lib/utils/battle/damage/mitigated-steps.ts` (винос із `compute.ts`), `systems/wfrp/rules/magic/spell-hit.ts`, `systems/wfrp/index.ts` (реєстрація), `scripts/templates/…`, `scripts/db/…`. Тести: `canon/spell-damage.test.ts`, план бекфілу.

**D4. Overcast-напрямки** (задачі: `magic/overcast.ts` + `cast-test.ts`; core `CastExtension`, `maxExtension`, обрізка цілей/дальності/зони, `scaledRounds`; UI степпери і рядки результату; благословення через `blessingExtension`). Файли: `magic/{overcast,cast-test,prayer-overcast,constants}.ts`, `server/attack-input.ts` (castInput), core `types-magic.ts`, `spell/spell-targeting.ts`, `spell/cast/{index,anchored-zone,hit-rider,grant-cast,grant-spell}.ts`, `ui/battle/CastResultLines.tsx` + пікер. Тести: `canon/overcast.test.ts`, core-регрес upcast d20.

Кінець хвилі: `pnpm test:related` по змінених файлах, `pnpm lint:dirs --changed`, `pnpm cycles`, `pnpm ratchet:cyrillic-comments`, оновити `docs/architecture/rule-systems.md` (нові шви `MitigateCtx.system`, `obstacle`, `spellHit`, `CastExtension`) і `battle.md` (укриття тестом), `docs/STATUS.md`, `lib/onboarding/whats-new.ts` + `whatsNew.*` (uk/en) для «модифікатори бою WFRP», `/simplify` (1 агент), Opus-рев'ю, повний `test:run`, sweep homm/dnd5e (за «так»), живий WFRP-бій на стенді гілки.

## Ризики для ядра бою

- **Ядро не називає систему:** усі нові поля ядра генеричні (`MitigateCtx.system`, `ResolveAttackCtx.obstacle`, `ResolvedAttack.obstacleInTest`, `RuleSystemTestedMagic.spellHit/maxExtension`, `CastTestResult.extension`, `SpellMagic.missile`). Ратчети `system-literals-exempt`/`system-imports-exempt` не ростуть; `lib/__tests__/system-contract.test.ts` і `d6pool-battle.test.ts` мають лишитись зеленими.
- **Укриття:** d20 різав шкоду навпіл і далі ріже; wfrp вимикає це лише своїм `obstacleInTest` — тест на обидві гілки обов'язковий.
- **Spell-шлях:** `applyDamageConsequences` одразу після примітиву (через `applyFlowDamage`) і `afterHit` після нього; `snapshotHash` не зачіпаємо (пишемо через наявний пайплайн); відповіді — дельти, як і раніше.
- **Баланс:** зміна `hit-model.ts` міняє справедливий масштаб wfrp-боїв — і setup, і старт кличуть той самий `computeFairScaling`, але потрібна перевірка на prodcopy.
- **Дальність:** зміна рядка `range` на `m/3m` змінює `attackReachError` для wfrp (далі б'ємо) — лише під canon5e; легасі лишає одне число.
- **Дані:** перегенерація `units.json` (HP Small) і `spells.json` змінює шаблон — публікація та бекфіл лише за «так»; expand-only, `--revert` зі знімка.
- **Targetability Unconscious (Helpless):** `isUp` — контракт ядра; без рішення Q10 Helpless працюватиме лише для цілей, які UI дає вибрати.

## Питання до власника

- **Q1.** Шкода від розміру: p360 каже, що профілі NPC уже містять +SB, а приклад p361 (павук Small→Large) змінює шкоду лише на зміну SB. Пропозиція: трейт-атаки юнітів бестіарію `sizeBaked` (без +SB), зброя спорядження великої істоти — з +SB. Так?
- **Q2.** Tiny/Little: під canon5e рахувати як Small, валідатор забороняє в новому контенті, двом роям прибрати Size (p362). Enum лишаємо для легасі. Так?
- **Q3.** Рядок 8 SL таблиці overcast p236 у стовпці зони нечитабельний (зараз код тримає ×2). Звірити з PDF: ×2 чи ×3 з 8 SL?
- **Q4.** Overcast: план витрат до кидка (один запит) чи пост-кидкове вікно вибору (pending, як crit-choice, дорожче)?
- **Q5.** Чи можна ділити зайві SL між кількома напрямками (книга прямо не забороняє)? Дизайн дозволяє.
- **Q6.** Якщо після кидка overcast не дотягнув до заздалегідь вибраних цілей/дальності — відкидати зайві цілі (дизайн) чи провалювати весь каст?
- **Q7.** Погода → SL: книга дає лише туман/сутінки −1, дощ і вітер −2, екстремальна/темрява −3. Відображення `snow`, `storm`, `blizzard`, `embers`, `crypt` і obscured-зон — ваше рішення.
- **Q8.** Висота, тісний простір, бруд поза terrain — ручні прапорці: ставить гравець у пікері чи лише DM?
- **Q9.** Переадресація промаху при стрільбі в сутичку і «стрільба в групу» (p167) — робимо зараз (потрібен core-ретаргет) чи відкладаємо?
- **Q10.** Helpless: дозволити цілити Unconscious учасників у wfrp (зараз `isUp = ACTIVE`)? Вмикати правило «у летальній грі атака по Helpless вбиває» (p167) як опцію кампанії?
- **Q11.** Молитви-шкідники (1d10 без TB/AP, +SL): мігрувати разом з A3 через `missile.perSl` чи лишити `spellRoll`? Elemental Exhale (лор-надбавки p243) і Chain Attack (перескоки) — `manual`?
- **Q12.** Point Blank: ціль може протиставити Dodge (p165) — включити в A2?
- **Q13.** Surprised: `againstSl` дає +2 SL (melee), таблиця p166 — +1 SL. Яке значення канонічне після звірки p187? І для grim-рядків без однозначного книжкового відповідника (`spark-flick`, blessing `hearth-spark` зі шкодою) — яка заявлена Damage?
- **Q14.** Чи є на проді кампанії з grim-закляттями (шаблон ще не опублікований)? Від цього залежить, чи бекфіл узагалі потрібен на проді, чи лише на prodcopy/локально.

## Відкриті питання D1

D1 виконано за дефолтами Q1/Q2; нижче — що вирішено на місці і що лишилось.

- **Q13 (Surprised): лишено +2 SL у melee.** p187 (текст стану) каже +2 SL, таблиця p166 — +1. Взято p187 (існуючі тести, умова стану); розбіжність книги, потребує вердикту власника. Для ranged (+1, p166) значення піде в D2.
- **Outnumbering великих істот (p360):** правило («Large = 2») і приклад («4 Large проти Monstrous — 2:1») разом не зводяться до «зважується лише сторона цілі» з розділу A1. Реалізовано: кожна істота зі сторони атакуючого рахується `min(власна вага, найбільша вага істоти сторони цілі)`; сторона цілі — за повною вагою. Дає всі три приклади p360 (4 Average vs Large, 2 Large vs human 2:1 не 4:1, 4 Large vs Monstrous). Підтвердити.
- **Гриму: рої.** Рядок `Size (Little)` не прибрано, а замінено на `Size (Small)` (рій без Size рахувався б як Average, 5×(SB+2TB+WPB), і ламав би смуги/шаблон p361). `bog-leech-swarm` maxHp 5→10; `gloom-mite-swarm` мав би 2×TB(2)×5=20 (поза смугою рівня 1 і вище за Pallid Crawler) → T 20→15, maxHp 10 (власна цифра шаблону, не канон; підтвердити). Small-юніти (4 шт.) maxHp 5/6→4 (2×TB, p361). Публікація шаблону — лише за «так».
- **Helpless:** атакуючий «обирає кидок» = кидок 01 (авто-успіх з найбільшим SL), захисник автопровалює. Вибір локації через крит (p167) не моделюється: потрібен вхід «обрати крит». Ranged на Point Blank — у D2 (потрібні смуги дальності). Q10 (цілити Unconscious: `isUp = ACTIVE` у ядрі) лишається блокером: Helpless працює, лише коли UI дозволяє вибрати ціль.
- **Пікер у UI** для `calledShot` і `situational` (висота, тісний простір, бруд) не зроблено: D1 не включав UI-файлів вводу; сервер і схема вводу готові (`system.data.calledShot`, `system.data.situational`). Q8 (хто ставить прапорці) відкрите.
- Моделі `legacy` лишились без змін: `OUTNUMBERING_BONUS` +10% і `sizeHitMod` діють лише під `combatModsModel: 'legacy'`.
