# Спек: покриття заклинань рушієм (Obojima → 100 % native)

Дата: 2026-10-28. Статус: чернетка дизайну, коду немає. Основа: гілка `feat/obojima-import-fixes` (`b8b216e1`), де `deriveSpell` дає 18/50 native (8 механічних і 10 наративних) і 32 manual.

## 1. Мета й що вважаємо «чесним 100 % native»

- **Метрика**: у всіх 50 заклинань реального файлу `executionMode = "native"` і **0** `MANUAL_SPELL_*`. Звіт `pnpm compendium:coverage` ділить їх на три класи:
  - **M** — ядро механіки виконує рушій (шкода, лікування, стан, бафф, зона, виклик);
  - **M+R** — ядро виконує рушій, а другорядні частини лишаються як `SPELL_RIDER_MANUAL` з переліком (у бою їх застосовує ДМ);
  - **N** — у заклинання немає бойових чисел, тож воно чесно наративне (`SPELL_NARRATIVE_ONLY`): каст лише витрачає ресурси.
- **Правило чесності**: рушій має виконувати **ядро** заклинання, тобто його головну шкоду, стан чи бафф. Rider — це лише вторинний ефект. Якщо ядро не виражається в рушії, заклинання лишається manual, а не «native з rider-ом». N дозволено лише тоді, коли в заклинання немає бойових чисел, які впливають на HP, кидки, стани чи рух у бою.
- **Імпортер лишається generic**: жодних override за назвою чи книгою. Кожне правило виводу — це шаблон тексту або тегу 5etools, і для нього є синтетичний позитивний і негативний тест. Реальний файл у репо не потрапляє.
- **SRD під захистом**: `lib/utils/spells/derive` використовує і SRD-конвертер (`scripts/srd`), тож кожна фаза проганяє регрес-тест SRD (див. §6).

Ціль за класами: **34 M/M+R + 16 N** (зараз 8 + 10).

## 2. Класифікація 32 manual (реальний файл) і цільовий стан

Позначки блоків: P0 — лише імпортер; P1.x — малі примітиви; P2 — власні стани; P3 — тимчасові дії й rider-и влучання; P4 — зони, аури, місцевість, відкладений удар; P5 — inline-виклик і перетворення.

| Заклинання | Причина зараз | Ціль | Що потрібно | Rider (лишається ДМ) |
|---|---|---|---|---|
| Butterfly Storm | UNMODELED (Str) | M+R | P4 зона: складна місцевість, «заслонено», рятівний Сил при виході → тягне до центру | розсіює туман |
| Control Animal | UNMODELED (Wis) | M+R | P1 `targetFilter {creatureTypes:[beast], maxCr:2(+1/коло)}` + наявний `charm` + на собі `incapacitated` | перевірка при шкоді |
| Create Spirit Train Stop | UNMODELED | N | P0: «HP лише в контексті відпочинку» — це не сигнал | — |
| Dara Blocks | UNMODELED | N | P0: стан накладається на об'єкт або куби менші за клітинку — це не сигнал | — |
| Mass Levitate | UNMODELED (Con) | M+R | P0: маркер `immobilized`, Con-рятівний, `area maxTargets 6` | висота, переміщення цілей |
| Obscure Object | UNMODELED | N | P0: невидимість об'єкта — це не сигнал | — |
| Resilient Friendship | UNMODELED | M+R | P1 ефект `help` (повторне використання `actions/effects.ts`) | тимчасові HP за умови |
| Sand Structure | UNMODELED | M+R | P4 `createTerrain {kind:"wall", cells:1, rounds:10}` | AC 13 / 10 HP, ритуал — постійна |
| Sprout Foliage | UNMODELED (атака) | M+R | P3 `grantCast` (дія, дальня атака заклинанням 30 фт, 1d6+мод) на 1 год | маскування під кущ |
| Summon Jack-o'-lantern | UNMODELED (Dex) | M+R | P0: Dex-рятівний заперечує, `immobilized` до розвіювання, ≤4 цілі | 100 HP/AC 15, огляд з одного боку |
| Swallow Magic | UNMODELED | M | P1 `chooseOne` (лікування 1d4+мод / швидкість +15 на 1 раунд / +d4 до перевірки) | третя опція — нотатка, якщо `checkBonus` не додамо |
| Tamh Gon's Fiery Festival Feast | UNMODELED (Dex) | N (+R) | P0: каст ≥10 хв і ефект ≥8 год — це бафф поза боєм | бафф на 24 год (див. питання 3) |
| Armament | WEAPON | N | P0: створення звичайних предметів без чисел | видача зброї ДМ |
| Mushroom Ballista | WEAPON | M | P3 `hitRider` (3 заряди, дальня, +1d6 отрути, рятівний Спр або P1 `push` ≤15 фт) | — |
| Vegetable Blade | WEAPON | M+R | P3 `grantCast` союзнику (ближня 1d12 рубляча, finesse, мод власника) | укус-лікування зі зменшенням кістки |
| Whelm Weapon | WEAPON | M+R | P1 `damageBonus.flat: {spellRoll:-100}` (1d4 кидок при касті) на ≤3 істоти, конц. | мінімум 1 |
| Wind Sprint | WEAPON | M | P3 `moveSelf {to:"adjacentToTarget"}` + `hitRider` (ближня, +2d6 рубляча, до кінця ходу, 1 раз) | — |
| At Your Side | ZONE | M+R | P0: тригер, що лише рухає, стає rider-ом; `modifyStat speed +5` на себе і ≤3 союзників, `upcastTargets 1` | рух реакцією |
| Festival King | ZONE | M | P4 аура на цілі 20 фт: вхід/початок ходу → рятівний Хар → `skip_action`+`no_bonus_action`; знімається, коли хід починається поза аурою | — |
| Forest Guard | ZONE | M+R | P5 inline-виклик нерухомого куща + P4 аура-атака (вороги, 10 фт) + P3 бонусна атака | кілька кущів сумують кубики |
| Origami Bird Swarm | ZONE | M+R | P1 `byDistance` (≤30 фт: 8d6 +2d6/коло) + P4 відкладений удар (>30 фт: 8d6 через ⌈d/30⌉−1 раундів на початку ходу кастера) | рій можна атакувати (−1 птах) |
| Rageful Nimbus | ZONE | M | P3 `mark` на ціль + `grantCast` реакцією (дальня атака 2d8 блискавки по нападнику ≤60 фт від цілі) | — |
| Monkey's Grasp | SUMMON | M+R | P3 `applyCondition grappled` (джерело — кастер, не `core:grapple`) + `dot 1d8 necrotic` прив'язаний до стану; Вирватися знімає | змагання замість рятівного (питання 5) |
| Pogmo's Pot | SUMMON | N | P0: виклик об'єкта без AC/HP/атак | — |
| Summon Vehicle | SUMMON | M+R | P1 `modifyStat speed atLeast 60` на себе, 10 раундів | одна вільна рука, один вершник |
| Beast Transmutation | BUFF | M+R | P1 `targetFilter beast` + P5 `transform {unitRef}` (`{@creature commoner}` → залежність SRD) | обмеження дій формою |
| Crustacean Form | BUFF | M | P1 `modifyStat armor atLeast 20`, наявний `flag sense blindsight 30`, P3 `grantCast` (бонусна, кіготь 1d10), P3 `flag damageThreshold 15` | швидкість плавання (rider, якщо руху в ефектах немає) |
| Pacify Monster / Pacify Person | UNSUPPORTED_CONDITION | M | P2 власний стан із кореня `condition` книги; Person — ще й `targetFilter humanoid`; `saveEnds wisdom`, `upcastTargets 1` | — |
| Water Bullet | VARIABLE | M | P1 `byDistance` [10→5d6, 60→4d6, 90→3d6], `upcastDice 1` | — |
| Plummet | VARIABLE | M+R | P1 `targetFilter {movement:"fly"}` + `dicePerInput` (висота/10, ≤20d6), Dex: провал — шкода + `prone`, успіх — 0 | висоти в рушії немає (питання 4) |
| Gift | SELF_DAMAGE | M | P1 d20 у `dieSides`; `dealDamage target:self` + `heal amount:{percentOf:"eventDamage",value:100}` (eventDamage — шкода, завдана раніше в цьому касті) | — |
| Divine Arrow (rider) | — | M+R | P1 `chooseOne` із 7 `flag resistance percent:-100` (тривалість конц.) | «імунітет → опір» |
| Pillar of Force (rider) | — | M | P1 `push {feet:10}` + P4 складна місцевість по лінії | — |
| Storm Stallion (rider) | — | M+R | без змін | «несе з собою» лишається rider-ом |

Приріст за фазами: P0 +9 (27/50), P1 +8 (35), P2 +2 (37), P3 +7 (44), P4 +4 (48), P5 +2 (**50/50**).

## 3. Що вже є в рушії (повторне використання)

- **Ефекти** (`lib/utils/abilities/schema/effects.ts`): `dealDamage`/`heal` з `target` (тож `self` уже працює в касті через `resolveTargetIds`), `dot`, `hot`, `applyCondition` (стани 5e + маркери `CONDITION_KEYS`: `immobilized`, `skip_action`, `no_bonus_action`, `disable_*`; `saveEnds`, `breakOnDamage`), `modifyStat` (`atLeast` — поки лише характеристики), `damageBonus`, `flag` (`resistance` з від'ємним % = вразливість, `sense`, `advantage`, `castSpellOnHit`), `mark` + умова `hasMark`, `randomOf`, `charm`, `summon {unitId,count}`, `grantAction`, `guard`.
- **Каст** (`lib/utils/battle/spell/cast/*`): атака заклинанням і рятівний з crit-choice та seeded rng, концентрація з тегом `concentrationOf` для ефектів і зон, `upcastDice`/`upcastTargets`, гранти 4f-5b (`grantKey`, пули, `cost: reaction` поза ходом із підтвердженням умови користувачем), фільтр `targetCreatureType` (предмети).
- **Зони**: `targeting.template.zone {rounds}` → небезпека на клітинках (`spell/zone-hazard.ts`, `grid/hazard.ts`: вхід і початок ходу, `hazardHitRound`, `concentrationOf`, ліниве згасання). Аури області (`effects/area-aura.ts`, `map-auras.ts`, мутація `aura-zone`) — статичні ефекти з фіксованим `AURA_RADIUS_CELLS`.
- **Виклик**: `applyAbilitySummons` (юніт із пулу кампанії, кінець ініціативи, `summonedBy`, керування власника), `grid/placement.ts`.
- **Рух/штовхання**: `runShove` (крок 5 фт, `canStand`), `squall` (`rayCells`, місце приземлення), схоплення з `releaseInvalidGrapples`.
- **Ефекти, що витрачаються**: `ActiveEffect.consumeOn` (`ownAttack`/`ownHit`/`attackAgainst`) + `expireAtTurnEnd` (`attack/consume-effects.ts`, `critical.ts`).
- **Тимчасові HP**: `combatStats.tempHp` поглинається в `applyRawDamage`; ефекту, що їх видає, немає.

## 4. Розширення рушія (мінімальні, усі поля опційні)

Загальне правило: нові поля живуть у **наявних JSON-колонках** (`spellEffects`, `targeting`, `rules`, snapshot, `map`), тож міграції не потрібні. Відсутнє поле означає поточну поведінку, HOMM і SRD не змінюються. Кожен новий вид ефекту = схема Zod + аплаєр у `registry/effects` + підпис у `registry/labels.ts` + редактор `AbilityListEditor`.

### P0 — лише імпортер (`adapters/spell-derive.ts`, `derive/mechanics.ts`)
- Заміна правила «перший блокер виграє» на композицію: `deriveSpell` розбирає речення на ядро й rider-и. Сигнатура не змінюється, додається `narrativeReason?: "noCombatNumbers" | "objectOnly" | "outOfCombat" | "createdObject"`.
- Правила N: (a) HP чи кістки хітів лише поруч зі словами `short/long rest` або `travel`; (b) `{@condition}` застосовується до `object`/`blocks`, а не до істоти; (c) створення звичайних предметів або SMN без AC/HP/атаки/шкоди в тексті; (d) `castingKey ≥ 10 хв` і тривалість ≥ 8 год без `damageInflict`/`spellAttack`/`conditionInflict`.
- Нові ядра без змін рушія: «can move only by… / remain suspended» або «grows around…, no creature can pass» → `applyCondition immobilized` (+ рятівний із `savingThrow`, «up to N creatures» → `maxTargets`); речення-тригер, наслідок якого лише «move up to…», переходить у rider замість `ZONE_OR_TRIGGER`; «speed increases by N feet» → `modifyStat speed +N` (союзник, `durationRounds`).

### P1 — малі примітиви
- `SpellDieSidesSchema` + `DIE_SIDES` += 20.
- `heal.amount {percentOf:"eventDamage"}` у касті: `SpellCastState.dealt` — сума шкоди попередніх `dealDamage` цього касту, передається як `eventDamage` у `resolveAmount`.
- `modifyStat.atLeast` дозволено для `armor` і `speed` (наразі лише характеристики; `bakePassives`/динамічні стати — `max(власне, N)`).
- `targeting.filter?: { creatureTypes?: string[]; maxCr?: number; maxCrPerLevel?: number; movement?: "fly" }` — перевіряють `spell-targeting.ts` (сервер і клієнт однаково); невідомий тип не підходить (як `targetCreatureType`).
- `{ kind: "chooseOne", options: NonRandomEffect[] }` (дзеркало `randomOf`) + `optionIndex` у `cast-spell-schema.ts`; без індексу → 422.
- `dealDamage.byDistance?: { maxFeet: number; dice: string }[]` — відстань від кастера до цілі (`footprintDistance`); без мапи береться перший діапазон і ставиться позначка в лозі.
- `dealDamage.amount: { dicePerInput: { die: number; max: number; label: string } }` + `inputCount` у запиті касту (Plummet). Кидок проходить через `rng`/`diceRolls` як звичайні кубики.
- `damageBonus.flat: { spellRoll: number }` — значення фіксується при накладанні (static effect зберігається числом).
- `{ kind: "push", feet: number, from: "caster" }` — узагальнює крок `runShove` до N клітинок, зупиняється перед перешкодою. Небезпека на місці приземлення діє через `hazardUnder`, а шкода — через `applyDamageConsequences`.
- `{ kind: "help" }` — той самий `ActiveEffect`, що й core-дія «Допомога» (`coreTimedKey`), джерело — кастер.

### P2 — власні стани з книги
- Корінь `condition` у 5etools → `rules.conditions.custom: { key, name, description, markers: ConditionMarker[]; abilityEffects?: StaticEffect[] }[]` (patch правил через наявний `recommendedRulesPatch`). Ключ — `custom:<slug>`.
- `applyCondition.condition` приймає `custom:*`. `applyCondition5e` бере маркери з `battle.rules` (зафіксована копія) через реєстр, що об'єднує `CONDITION_5E_REGISTRY` і custom.
- Нові маркери: `no_hostile_spells` (каст із ціллю-ворогом → відмова в `spell-targeting`/`validateCast`) і `no_damage_dealt` (прапорець `dealsNoDamage` у `collectModifiers` → у примітивах шкоди атака/заклинання/зона дає 0).
- Текст стану зіставляється з маркерами шаблонами: «can't attack» → `disable_melee_attacks`+`disable_ranged_attacks`; «cast a spell that affects an enemy» → `no_hostile_spells`; «deal damage» → `no_damage_dealt`; «speed 0/can't move» → `immobilized`; «can't take actions» → `skip_action`. Нерозпізнана фраза → стан лише з описом + `MANUAL_CONDITION_TEXT`.

### P3 — тимчасові дії й rider-и влучання
- `{ kind: "grantCast", cast: InlineCast, cost: "action"|"bonusAction"|"reaction", uses?: number, duration, target? }`, де `InlineCast = Pick<SpellDefinition, "targeting"|"resolution"|"dice"|"dieSides"|"addAbilityMod"|"damageBonus"> & { effects: NonGrantEffect[]; anchorMarkId?: string }`. Глибина — 1 (вкладений `grantCast` заборонений Zod-ом).
- Аплаєр додає в snapshot тимчасовий `SpellGrant` (повторне використання 4f-5b): ключ `cast:<castId>:sub`, без слота, `expiresRound`/`concentrationOf`. Каст іде звичайним `castSpell` з `grantKey`, тож атака, crit-choice, реакція й концентрація вже працюють. Зняття — у кроці закінчення ефектів через `removeEffects`, разом із прив'язаним `ActiveEffect`.
- `anchorMarkId` (Rageful Nimbus): ціль реакції має бути в межах `range` від носія мітки `mark` цього касту.
- `{ kind: "hitRider", attackKind, extraDice, damageType, charges, save?: {ability, onFail: Effect[]}, expireAtTurnEnd? }` → `ActiveEffect` із `consumeOn: "ownHit"` і лічильником зарядів. Доп. шкода проходить як окремий крок (`applyResistance` → `applyDamageConsequences`), а не як `damageBonus`.
- `{ kind: "moveSelf", to: "adjacentToTarget" }` — найближча вільна клітинка поруч із ціллю (`canStand`, ті самі правила, що й місце приземлення `squall`). Атак при відході немає (як у телепорта).
- `flag damageThreshold { value }` — у примітиві шкоди: `< value` → 0 (після опорів). `applyDamageConsequences` усе одно викликається з 0.
- `dot.linkedCondition?: ConditionKey` — DoT знімається разом зі станом (Monkey's Grasp). `applyCondition grappled` від заклинання отримує ключ `spell:<castId>`, а не `core:grapple:`, щоб `releaseInvalidGrapples` не знімав його через відстань. Core-дія «Вирватися» працює за `conditionSourceIds`.

### P4 — зони, аури, місцевість, відкладений удар
- `TerrainKind += "difficult"` (рух ×2 у `grid/path.ts`, а `reachable`/`pathTo` використовують одну вартість) і прапорець клітинки `obscured` (атака в клітинку чи з неї — як від/по осліпленому, через `collectModifiers`).
- `targeting.template.zone` розширюється: `{ rounds, label?, terrain?: "difficult"|"obscured"|"wall", side?: "enemies"|"all"|"chosenExcluded", onEnter?/onTurnStart?/onExit?: { save?: {ability}, effects: NonGrantEffect[] } }`. Тригери виконує той самий шлях, що й `hazardOnMove`/`hazardUnder` (`turn-start.ts`, `resolveMovement5e`), з `hazardHitRound`-подібним захистом від повтору за хід; `isZoneConcentrationLive` діє як і раніше.
- `{ kind: "createTerrain", terrain: "wall"|"barrier"|"difficult", cells: number, rounds }` → `applyTerrain` з `untilRound` (Sand Structure; лінія складної місцевості Pillar of Force).
- **Аура на учаснику**: `{ kind: "anchoredZone", radiusFeet, side, onEnter?, onTurnStart?, endsWhenStartOutside?: boolean, duration }` → `ActiveEffect.zone`-подібний запис на носії. Перерахунок у `syncMapAuras` після кожної мутації з власним радіусом замість `AURA_RADIUS_CELLS`.
- **Відкладений удар**: `dealDamage.delayIfBeyond?: { feet: 30; perRoundFeet: 30 }` → `battleData.pendingHits[]` на цілі `{ casterId, atRound, dice, type, spellId }`. Виконується на початку ходу кастера в `turn-start.ts` (rng ходу, далі `applyDamageConsequences`).

### P5 — inline-виклик і перетворення
- `summon.inline?: { name, size, ac: number|"spellDc", hp: number|null, speed: 0, attacks?: InlineAttack[], object?: true }` — синтетичний юніт без рядка `units` (через `createBattleParticipantFromUnit` з in-memory рядком). `hp: null` означає, що ціль не можна атакувати. Тривалість/`concentrationOf` → прибирання учасника, коли ефект закінчився (через `upserted`/status у delta).
- `{ kind: "transform", unitRef: string, revertAtZero: true }` → `battleData.transform { savedStats, savedHp }`. Стати й атаки береться з юніта-залежності (`{@creature X}` → `COMPENDIUM_REF_KINDS` + SRD-шаблон), ментальні характеристики лишаються свої. На 0 HP — відкат із перенесенням надлишку шкоди (через `applyDamageConsequences` форми, потім відкат).

## 5. Правила battle.md, які не можна порушити (ризики)

- Кожен запис `battle_participants.snapshot` (гранти P3, `pendingHits`, `transform`, inline-виклик) пише й `snapshotHash`, тобто лише через `saveBattle`.
- Кожен примітив шкоди (самошкода Gift, зона, push у небезпеку, `hitRider`, відкладений удар, поріг шкоди) **одразу** викликає `applyDamageConsequences` (у флоу — `applyFlowDamage`).
- Зняття ефектів, станів і грантів — лише через `removeEffects`. Хід — лише через `advanceTurn` (тригери зон і відкладені удари сидять у `turn-start.ts`, а не в мутаціях).
- Відповіді — дельти: новий учасник іде в `upserted`, прибраний — через статус. Великі зони або багато клітинок місцевості можуть перевищити 9 500 байт → `refetch`; P4 групує `TerrainDiff`.
- Crit-choice: кожен новий кидок іде через `ctx.rng`/`CritPicker`, ключі тригерів стабільні. Збіжність потоку після розбіжностей — відоме обмеження, нові гілки не мають споживати rng до pause.
- Концентрація: зони, аури й гранти позначаються `concentrationOf` і згасають ліниво.
- HOMM і кампанії без `rules` не змінюються (нові поля опційні, власні стани читаються з `battle.rules`). Вміння читаються лише через `collectModifiers`/`read.ts`.
- Розмір OpenAPI (поріг 145 000): нові види ефектів через `$ref`, перевірити тест розміру.
- Map modes: core не імпортує режим. Складна місцевість і `obscured` — core-місцевість, а `lineBlocked` режимів не змінюється.

## 6. План фаз і тести

Кожна фаза — окремий набір комітів, що можна змерджити окремо. Тести — синтетичні рядки 5etools у `lib/server/compendium-import/__tests__/fixtures` і юніт-тести рушія в сусідніх `__tests__`. Наприкінці кожної фази: `pnpm test:related`, регрес SRD (`scripts/srd/__tests__/data-integrity.test.ts` плюс новий снапшот-тест «поля derive для 488 SRD-заклинань не змінилися, крім очікуваного списку») і `pnpm compendium:coverage` на реальному файлі (локально).

- **P0** (лише імпортер, ~0,5 дня): тести — заклинання «HP після короткого відпочинку» → N; невидимість об'єкта → N, а невидимість істоти (Transparency-подібна) лишається M; SMN без чисел → N, а SMN із «AC 15 and 100 hit points» лишається не-N; «can move only by» + Con-рятівний → `immobilized` із `save`; «whenever… use their reaction to move» → rider, а не блокер; «speed increases by 5 feet» для «up to three willing» → `area ally maxTargets 4`, `upcastTargets 1`. Покриття: 27/50.
- **P1** (~2 дні): d20 у кидку; Gift — кастер −N (з опором), ціль +N, обидва наслідки шкоди; `atLeast armor 20` не знижує 21; фільтр `beast maxCr 2` відхиляє CR 3 і HOMM-юніт без типу, а на колі 3 пропускає CR 3; `chooseOne` без `optionIndex` → 422, з індексом — лише ця опція; `byDistance` на 5/30/85 фт дає 5d6/4d6/3d6, без мапи — перший діапазон; `dicePerInput` обрізає на 20; `damageBonus {spellRoll:-100}` фіксує число на ефекті; `push 10` зупиняється перед стіною, у небезпеці — шкода й consequences; `help` дає перевагу на одну атаку. Покриття: 35/50.
- **P2** (~1,5 дня): корінь `condition` → `rules.conditions.custom`, `recommendedRulesPatch`; `pacified` блокує атаку, ворожий каст (лікування союзника можливе) і зводить шкоду зони кастера до 0; `saveEnds` знімає стан; кампанія без custom-станів і HOMM — без змін; нерозпізнана фраза → `MANUAL_CONDITION_TEXT`. Покриття: 37/50.
- **P3** (~3 дні): `grantCast` з'являється в списку кастів, не витрачає слот, зникає після тривалості й втрати концентрації; реакція Rageful Nimbus приймає лише нападника ≤60 фт від мітки; `hitRider` витрачає 1 заряд на влучання (промах не витрачає, крім «hits or misses» → витрачає), `expireAtTurnEnd`; `moveSelf` не провокує атак при відході; `damageThreshold 15`: 14 → 0, 15 → 15; DoT Monkey's Grasp зникає разом зі станом після «Вирватися», а `releaseInvalidGrapples` його не чіпає. Покриття: 44/50.
- **P4** (~4 дні, найбільший ризик): складна місцевість подвоює вартість у `reachable` і `pathTo` однаково; `obscured` дає перешкоду атаці з/у клітинку; зона з `onExit` рятівним тягне до центру; аура Festival King: вхід → рятівний один раз за хід, стан знімається на початку ходу поза аурою, згасає з концентрацією; `createTerrain wall` блокує рух і лінію вогню до `untilRound`; відкладений удар спрацьовує на початку ходу кастера в потрібному раунді, повторно не спрацьовує після rollback/replay (той самий seed). Перевірка розміру delta. Покриття: 48/50.
- **P5** (~3 дні): inline-кущ з'являється біля точки, не рухається, атакує тригером аури, зникає з тривалістю; ціль із `hp: null` не можна атакувати; `transform` на commoner: HP форми, на 0 — відкат із перенесенням надлишку, ментальні характеристики свої; без залежності commoner → `MANUAL_SPELL_TRANSFORM_REF` (manual, бо чесно). Покриття: 50/50.
- Після кожної фази: живий прогін (Sonnet-субагент, бій на prodcopy або локальній БД `obojima`) для заклинань цієї фази. Після P4 ще `pnpm battle-sweep`.

**Гілка**: окрема `feat/spell-engine-coverage` від `main` **після** мерджу `feat/obojima-import-fixes`. P1–P5 змінюють рушій бою, схему вмінь і OpenAPI, тож у поточній гілці імпорту їм не місце. P0 (лише імпортер) можна, за бажання, ще влити в поточну гілку. Оцінка: 14–15 робочих днів Sonnet-виконавців. Opus — лише план і фінальне ревю.

## 7. Відкриті питання до користувача

1. Чи приймаєте ви визначення «чесного 100 %»: 0 manual, ядро виконує рушій, вторинне лишається `SPELL_RIDER_MANUAL`, а 16 заклинань без бойових чисел — N?
2. Чи робимо P5 (inline-виклик і перетворення — найдорожча частина заради двох заклинань), чи зупиняємось на 48/50 і чесно лишаємо Forest Guard і Beast Transmutation manual?
3. Tamh Gon's Feast — бафф на 24 год поза боєм. Лишаємо N з rider-ом чи додаємо постійні баффи персонажа між боями (окрема фіча `characters.resources`)?
4. Plummet: висоти в рушії немає. Підходить, що кастер (або ДМ) вводить висоту при касті, чи краще фіксована оцінка (наприклад, швидкість польоту цілі)?
5. Monkey's Grasp: змагання «мод. заклинання проти Атлетики/Акробатики» (точно за текстом, нова `resolution: "contest"`) чи рятівний Сил/Спр проти СК (як Grapple 2024, без нової резолюції)?
6. Реакції від `grantCast` (Rageful Nimbus): гравець підтверджує їх вручну, як наявні реакційні заклинання, чи рушій виконує їх автоматично?
7. P0 влити в поточну гілку імпорту до мерджу (+9, 27/50) чи все в нову гілку?
