# Аудит канону D&D 5e (SRD) проти реалізації — 2026-11-19

Статус: **тільки дослідження**. Код, дані й прод не змінювались. Виправлення починаються лише після «так» власника.

## (a) Обсяг і метод

- Обсяг: лише 5e (база `systems/d20` + модулі `deathsaves`, `opportunity`, core `lib/utils/battle/**`, `lib/utils/abilities/**`, `lib/utils/spells/**`, шаблон `data/templates/srd-5.2/*`). Пресет SRD = варіант 2024 (`rules.json`: exhaustion 2024, actions 2024, doubleDice, deathSaves, concentration).
- Смуга Grim/WFRP відкладена власником: у репозиторії немає джерела WFRP, а 8th.whfb.app — це варгейм Warhammer Fantasy Battles, не WFRP.
- Канон цитовано з пам'яті SRD 5.1/5.2 (PHB/MM/DMG 2024), без кешованого джерела. Юніти не порівнювались з Open5e построчно (~35 статблоків вибірково + системні перевірки всіх 331).
- Три смуги (Sonnet): бій, заклинання, здібності/юніти/герої. Консолідація (Opus): дублікати зведено, тяжкість узгоджено, ~15 найтяжчих знахідок перевірено читанням коду/даних (позначка **re-verified**), решта — **lane-only** (лише звіт смуги). Номери рядків виправлено там, де смуга помилилась.
- Під час аудиту основна тека була перемкнута іншою сесією на `chore/w4b-contract`; файли, на які посилається звіт, у цій гілці не відрізняються від `main` (diff гілки — 2 файли поза зоною аудиту).

Шкала тяжкості: **Critical** — неправильний результат у звичайній грі; **Major** — неправильний результат у правдоподібному випадку; **Minor** — край/косметика; **Info** — довідково.

## (b) Підсумок

| Тяжкість | Кількість (після дедуплікації) |
|---|---|
| Critical | 1 |
| Major | 24 |
| Minor | 28 (S-25 «Minor–Major» зараховано сюди) |
| Info | 12 |

Зведено дублікати: hit-тригерний `dealDamage` без подвоєння на криті й без резистів (C-1 + C-2 + A-4 → **X-1**); Paladin/Ranger 0 слотів на 1 рівні (S-9 + A-1 → **X-2**); округлення мультикласу (S-10 + A-2 → **X-3**); дальня атака заклинанням по сусідній цілі (C-9 Minor + S-8 Major → **X-4**, узгоджено Major); temp HP (C-5 + A-15 → **X-5**); Action Surge (C-8 + свідоме відхилення в A).

Топ-знахідки:
1. **S-1 (Critical)** Magic Missile / Scorching Ray: снаряди не можна зосередити на одній цілі (dedupe id), один кидок на всі, у MM немає +1 за дротик.
2. **X-1 (Major)** Шкода від здібностей на `hit` (Sneak Attack, Smite-подібні, Goliath, предмети): не подвоюється на криті й ігнорує резист/імунітет/вразливість.
3. **C-4 (Major)** Резисти сумуються у відсотках: два джерела 50% = імунітет; резист + вразливість = ×1,5 замість ×1.
4. **A-6/A-7 (Major)** Відновлення на короткому відпочинку: Channel Divinity і Wild Shape повертають усе (канон — 1), Rage — нічого (канон — 1).
5. **S-12 (Major, агрегат)** 161 з 349 заклинань SRD не мають жодного ефекту (Misty Step, Counterspell, Aid, False Life, Raise Dead…): слот витрачено, нічого не сталося.

## (c) Основна таблиця

ID: префікс смуги (C — бій, S — заклинання, A — здібності/юніти), X — зведені між смугами. «Перевірка»: re-verified / lane-only.

### Зведені (між смугами)

| ID | механіка | канон | як у коді (файл:рядок) | розбіжність | тяжкість | перевірка | рекомендація | обсяг |
|---|---|---|---|---|---|---|---|---|
| X-1 | Шкода здібностей на подію `hit` (Sneak Attack, Fire's Burn, Frost's Chill, Sun Blade тощо) | Усі кубики атаки, включно з Sneak Attack, подвоюються на криті; шкода має тип (Sneak = тип зброї) і проходить резист/імунітет/вразливість | `lib/utils/abilities/registry/effects/hp.ts:33-102` (`applyDealDamage` → `applyRawDamage`, `effect.damageType` не читається, резисту немає); подія `hit` у `lib/utils/battle/attack/process/hit.ts:156-168` без `crit` і без типу шкоди атаки (тоді як `applyHitRiders` на :170-175 отримує `crit`) | Крит Sneak Attack Rogue 5 = 3d6 замість 6d6; Sneak по люті варвара / імунній цілі — повна шкода. Hit-riders і криты заклинань подвоюють правильно — непослідовність | Major | re-verified | Додати в подію `hit` поля `crit` і `damageType`; в `applyDealDamage` подвоювати кубики за `critDoublesDice(rules, crit)` і вести шкоду через `dealResistedDamage` (`lib/utils/battle/damage/resisted-ability-damage.ts`) з `effect.damageType ?? event.damageType`; передавати `crit` в `applyDamageConsequences` (концентрація/death saves) | M |
| X-2 | Слоти Paladin/Ranger на 1 рівні | 2024: Spellcasting з 1 рівня, 2 слоти 1 кола | `lib/utils/spells/class-slots.ts:32-33` (`level >= 2 ? ceil(level/2) : 0`); дані `classes.json` дають 2 підготовлені на L1 | 2 підготовлені заклинання, 0 слотів | Major | re-verified | Прибрати гард `>= 2` для `half` (лишити `>= 3` для `third`); оновити рядок «з 2-го рівня» в `docs/architecture/battle.md` | S |
| X-3 | Мультиклас: рівень заклинателя від half-caster | 2024: рівні Paladin/Ranger ділити навпіл з округленням **вгору** (2014 — вниз) | `lib/utils/spells/class-slots.ts:41` (`Math.floor(level / 2)`) | Непарні рівні Paladin/Ranger у мультикласі дають на 1 рівень заклинателя менше | Minor | re-verified (код); канон з пам'яті | `Math.ceil` для `half` у сумі — після рішення власника про варіант (див. h) | S |
| X-4 | Дальня атака заклинанням по сусідній цілі | Дальня атака (і заклинанням) з ворогом у 5 футах — з перешкодою; тип атаки задає заклинання, не відстань | `lib/utils/battle/spell/cast/outcome.ts:97-108` (`type: adjacent ? 'melee' : 'ranged'`, `adjacent` = заклинатель поруч із ЦІЛЛЮ) | Fire Bolt / Guiding Bolt у сусіда класифікується як ближня: немає перешкоди «ворог поруч»; touch-заклинання на відстані — навпаки | Major | re-verified | Тип із `targeting` заклинання (touch/self = melee, інакше ranged); перевірка сусідства — лише для правила «ворог поруч» | S |
| X-5 | Тимчасові хіти: надання | False Life, Heroism, Armor of Agathys, Wild Shape (2024), Inspiring Leader, Adrenaline Rush дають temp HP; не сумуються (беремо більше) | Поглинання правильне (`lib/utils/battle/attack/process/damage.ts:12-36`); у схемі ефектів немає видачі temp HP; False Life `spellEffects: []`; Wild Shape `heal {formula: class_level}` | Temp HP у бою неможливо отримати; Wild Shape лікує замість буфера. Задокументована прогалина (`docs/architecture/abilities.md:88`) | Major | lane-only | Новий ефект `tempHp` (max, не сума) + заповнити дані перелічених заклинань/здібностей | M |

### Бій (C)

| ID | механіка | канон | як у коді (файл:рядок) | розбіжність | тяжкість | перевірка | рекомендація | обсяг |
|---|---|---|---|---|---|---|---|---|
| C-3 | Авто-крит по паралізованому/непритомному в 5 футах для **атак заклинанням** | Будь-яка влучна атака з 5 футів — крит, включно із заклинаннями | Зброя: `systems/d20/rules/attack/resolve.ts:134-147` (`autoCritAdjacent`); заклинання: `lib/utils/battle/spell/cast/outcome.ts`, `systems/d20/rules/magic/spell-roll.ts:9-23` — лише `roll >= critOn`; прапорець більше ніде не читається | Inflict Wounds / Fire Bolt по сплячому сусіду не критує | Major | re-verified | Винести спільний хелпер (`autoCritAdjacent` + `cancelCritIfImmune`) і викликати в `resolveSpellAttack` | S |
| C-4 | Складання резистів/вразливостей | Кілька резистів до типу = один; резист + вразливість = звичайна шкода | `lib/utils/battle/resistance/index.ts:98-109` (`getCombinedResistancePercent`) і `:209-211` (`applyResistance`): відсотки сумуються з кліпом ±100; petrified = резист 50 (`systems/d20/rules/conditions/registry.ts:77`) | Rage + Stoneskin або Rage + petrified = імунітет; резист 50 + вразливість −100 = ×1,5 | Major | re-verified | Для 5e — схлопувати прапорці по типу (max один резист, одна вразливість, обидва = ×1) через хук системи; відсоткова арифметика лишається для HoMM/інших баз | M |
| C-6 | Frightened / Charmed, накладені DM | Frightened: перешкода на атаки/перевірки, не можна наближатись до джерела; Charmed: не можна атакувати чарівника | Ефект працює лише через `e.source` (`lib/utils/battle/attack/bonus-math.ts:160-171`, `lib/utils/battle/grid/path.ts:204-218`, `lib/utils/battle/attack/assert-allowed.ts:25-33`); DM-маршрут ставить `source: undefined` (`lib/server/battles/mutations/conditions/conditions-mutation.ts:97`) | Стан із `ConditionsDialog` механічно нічого не робить; через заклинання працює | Major | re-verified | Дати DM обрати джерело або фолбек «без джерела = проти всіх ворожих» | S |
| C-7 | Poisoned / Frightened: перешкода на перевірки | Poisoned — перешкода на атаки І перевірки здібностей | `systems/d20/rules/conditions/registry.ts:81` (лише `disadvantage` для атак); `systems/d20/rules/checks/roll-check.ts:43-81` читає тільки `checkDisadvantage` | Отруєні роблять перевірки (Hide, grapple-контести, кидки аркуша) без перешкоди | Minor | lane-only | Додати `checkDisadvantage skills:'all'` до poisoned (і frightened із джерелом) | S |
| C-8 | Action Surge | Додаткова дія в будь-який момент свого ходу; 2024 — не для дії Magic | Тригер `action` + `extraActions: 2` (`classes.json`), відхиляється, якщо дію вже витрачено (`lib/utils/battle/pipeline/ability-use.ts:55-80`) | Треба натискати ДО дії (нетто +1 — коректно); заборона Magic-дії не застосована | Minor | lane-only | Безкоштовний тригер у свій хід, `extraActions: 1`; опційний прапорець «без заклинань» | M |
| C-10 | Grapple/shove: обмеження розміру | Ціль не більше ніж на 1 розмір більша | `systems/d20/rules/actions/availability.ts:62-84`, `grapple.ts:247-298` — розмір не перевіряється | Small-герой хапає Gargantuan | Minor | lane-only | Перевірка `sizeOf` у `validateCoreAction` | S |
| C-11 | Grappled (2024) | Перешкода на атаки лише проти НЕ-хапуна | `registry.ts:50-53` (загальний `disadvantage`) | Перешкода і проти хапуна | Minor | lane-only | Виключення за `source.participantId` | S |
| C-12 | «Ворог поруч» для дальніх атак | Лише вороги, що не incapacitated і бачать | `lib/utils/battle/grid/reach-check.ts:99-105` (без `isActive`/incapacitated) | Ворог на 0 HP чи паралізований поруч заважає лучнику | Minor | lane-only | Фільтр `isActive(p) && !hasCondition(p,'incapacitated')` | S |
| C-13 | Досяжність атаки при нагоді | Досяжність зброї, яку реактор може використати (найдовша) | `systems/opportunity/rules/opportunity.ts:100-117` + `systems/d20/rules/reactions/reaction.ts:23-30` (перша ближня атака) | Зброя з досяжністю ігнорується, якщо вона не перша | Minor | lane-only | Обирати атаку з max reach | S |
| C-14 | Help | Перевага на наступну атаку союзника по цілі в 5 футах від помічника, до початку наступного ходу помічника | `lib/utils/battle/actions/effects.ts:41-52` (`rounds: 1`, будь-яка ціль) | Будь-яка ціль; інший час завершення | Minor | lane-only | Обмеження цілі й завершення | M |
| C-15 | DC заклинань при exhaustion 2024 | d20-тести і DC заклинань −2×рівень | `systems/d20/rules/magic/save-dc.ts:5-19` (без exhaustion) | Виснажений заклинатель має повний DC | Minor | lane-only | Додати штраф у `d20SpellSaveDc` (варіант 2024) | S |
| C-16 | Модифікатори ініціативи | Ініціатива = перевірка DEX: перевага/перешкода, exhaustion, surprise = перешкода | `systems/d20/rules/initiative/index.ts:13-35` (d20 + DEX + бонус) | Немає режимів кидка / exhaustion / surprise | Minor | lane-only | Перевикористати `checkFlags`/`modeFrom` з `roll-check.ts`; surprise — перемикач DM | M |
| C-17 | Incapacitated блокує рух | Incapacitated: без дій/реакцій, швидкість не змінюється | `registry.ts:27-31,54` → пропуск ходу (`turn-start.ts:333-370`) | Sleep-подібні без speed 0 не дають рухатись | Info | lane-only | Задокументувати або обмежити пропуск діями | S |
| C-18 | Hide / Dodge | Hide — потрібна схованка, 2024 DC 15; Dodge — лише видимі атакувальники | `systems/d20/rules/actions/run.ts:218-255`, `effects.ts:27-58` | Спрощено (глобальний поріг) | Info | lane-only | Прийнятне спрощення; задокументувати | — |
| C-19 | Довгий відпочинок на 0 HP | 2014: потрібно ≥1 HP; 2024: правила немає | `lib/utils/characters/resources/rest.ts:35-65` | Відповідає 2024 | Info | lane-only | — | — |

### Заклинання (S)

| ID | механіка | канон | як у коді (файл:рядок) | розбіжність | тяжкість | перевірка | рекомендація | обсяг |
|---|---|---|---|---|---|---|---|---|
| S-1 | Багатоснарядні: Magic Missile, Scorching Ray | MM: 3 дротики по 1d4+1, довільний розподіл, +1 дротик за коло. SR: 3 промені, кожен — окрема атака 2d6, можна в одну ціль | `spells.json` MM: `dice 1, dieSides 4`, `damageBonus null`, `targeting {kind: area, maxTargets 3}`, `upcastTargets 1`; SR: `maxTargets 3`, `resolution attack`; `lib/utils/battle/spell/spell-targeting.ts:416` — `[...new Set(chosenIds)]`; один кидок на всі цілі (`cast/index.ts`) | MM у одну ціль = 1d4 замість 3d4+3; SR у одну ціль = 1 промінь; немає +1; один кидок на всі снаряди | **Critical** | re-verified | Модель снарядів (`projectiles: n`, повтори id у списку цілей, кидок на снаряд) + `damageBonus: 1` для MM | M |
| S-2 | Eldritch Blast (5/11/17) | 2/3/4 промені, кожен — окрема атака 1d10, можна розділити | `lib/utils/spells/model/dice.ts:63-69` множить кубики на тир; одна атака | Одна атака 2d10..4d10: все-або-нічого, крит подвоює все, без розподілу | Major | lane-only | Та сама модель снарядів, що S-1 | M (з S-1) |
| S-3 | Heat Metal | Початкові 2d8 вогню автоматично; рятівний кидок CON лише щоб не впустити предмет; бонусна дія повторює шкоду | `spells.json`: `resolution {save, constitution, onSuccess: none}` | Успішний кидок скасовує всю шкоду; повтору немає | Major | re-verified | `resolution: auto` для шкоди (повтор — у S-7) | S |
| S-4 | Disintegrate, Finger of Death | 10d6 + 40; 7d8 + 30 | `spells.json`: лише кубики, `damageBonus null` (механізм є: `lib/utils/battle/spell/power.ts:51`) | Середнє 35 замість 75 і 31,5 замість 61,5 | Major | re-verified | `damageBonus` 40 / 30 (через `scripts/srd/overrides/spells.ts`) | S |
| S-5 | Два типи шкоди: Flame Strike, Ice Storm, Meteor Swarm, Prismatic Spray | FS 5d6 вогонь + 5d6 radiant; IS 2d10 дробильна + 4d6 холод; MS 20d6 + 20d6; PS 12d6 за кольором | `spells.json`: FS лише fire 5d6; IS лише 2d10; MS лише 20d6 fire; PS `1d8` (кубик кольору як шкода) | −50% шкоди; Prismatic Spray 1d8 замість 12d6 | Major | re-verified (Flame Strike), решта lane-only | Два `dealDamage` з власними кубиками (потрібне поле кубиків на ефект, зараз лише `spellRoll`) | M |
| S-6 | Divine Smite / Shining Smite — підсилення | DS 2d8 +1d8 за коло вище 1 (max 5d8); SS 2d6 +1d6 за коло вище 2 | `spells.json`: `hitRider extraDice "2d8"`, без `upcastDice`; `lib/utils/battle/spell/cast/hit-rider.ts:59` копіює фіксований `extraDice`, `castLevel` не читається | Слот будь-якого кола = завжди 2d8 | Major | re-verified | Рахувати `extraDice` з `castLevel` у `applyHitRiders` | S |
| S-7 | Постійна шкода як разова | Spirit Guardians, Flaming Sphere, Call Lightning, Cloudkill, Wall of Fire, Insect Plague, Incendiary Cloud, Vampiric Touch, Spiritual Weapon, Heat Metal — повтор щоходу/при вході | `spells.json`: один `dealDamage` при касті; зони `onEnter/onTurnStart` є (`lib/utils/spells/model/schema.ts:83-84`), використовують лише Spike Growth і Antimagic Field | Після касту нічого; концентрація витрачена на один удар | Major | lane-only | Перевести ~8 найважливіших на `zone`/`anchoredZone` з `onTurnStart`/`onEnter` | M–L |
| S-11 | Hypnotic Pattern | Charmed + Incapacitated + speed 0; кінчається від шкоди | `spells.json`: лише `charmed 10 rounds` | Контролю немає | Major | re-verified | Додати incapacitated + speed 0, кінець від шкоди | S |
| S-12 | Заклинання без ефектів | — | 161 з 349 заклинань SRD мають порожні `spellEffects` і без зони: Misty Step, Counterspell, Dispel Magic, Sanctuary, Aid, False Life, Silence, Polymorph, Raise Dead, Resurrection, Time Stop, Wish… | Каст витрачає слот/реакцію, логується, нічого не робить; із воскресінь працює лише Revivify | Major (агрегат) | re-verified (161) | Рішення власника (h): реалізувати пріоритетні або позначити `executionMode: manual` («вирішує DM») | M–L |
| S-13 | Power Word Kill | ≤100 HP — смерть; інакше 12d12 | `spells.json`: лише `dealDamage 12d12` | Ніколи не вбиває | Major | re-verified | Умовний ефект `currentHp <= 100` | S |
| S-25 | Призови | Conjure Animals/Elemental/Fey…, Find Familiar/Steed, Animate Dead тощо створюють істот | У `spells.json` немає ефекту `summon` (рушій підтримує `summon-inline.ts`); Conjure Animals = разові 3d10 | Решта нічого не робить | Minor–Major | lane-only | `summon` + посилання на статблоки | L |
| S-14 | Vitriolic Sphere, Acid Arrow | VS: успіх = половина, плюс відкладені 5d4; AA: промах = половина, плюс 2d4 у кінці ходу | VS `onSuccess: none`, без відкладеної; AA промах = 0 | Втрата частини шкоди | Minor | lane-only | `onSuccess: half`, відкладена шкода, `onMiss: half` | M |
| S-15 | Vampiric Touch | Лікує половину завданої шкоди; повтор щоходу | лише `dealDamage` | Без вампіризму | Minor | lane-only | `heal` з `percentOf: eventDamage` | S |
| S-16 | Супутні ефекти атакуючих заклинань | Guiding Bolt — перевага на наступну атаку; Ray of Sickness — poisoned; Thunderwave — поштовх 10 фт; Ice Knife — вибух 2d6 | лише шкода (ефект `push` існує) | Втрата вторинного ефекту | Minor | lane-only | Додати прапорець/стан/поштовх/другу шкоду | S кожне |
| S-17 | Barkskin, Mage Armor | Barkskin: AC не менше 17; Mage Armor: 13 + DEX без обладунку | обидва `modifyStat armor +3` | Barkskin слабший; Mage Armor сумується з обладунком | Minor | lane-only | `atLeast: 17`; умова `armorWorn` для Mage Armor | S |
| S-18 | Searing Smite / Ensnaring Strike | Бонусна дія, спрацьовує на наступному влучанні зброєю | шкода одразу при касті з рятівним кидком | Шкода без удару | Minor | lane-only | Переробити на `hitRider` | M |
| S-19 | Sleep | Incapacitated → при провалі повторного кидка Unconscious; кінець від шкоди | лише `incapacitated`, `saveEnds` | Немає стадії Unconscious | Minor | lane-only | Ланцюжок станів | S |
| S-20 | Наближення баффів/дебаффів | Bless/Bane ±1d4; Haste швидкість ×2 + летаргія; Slow −2 AC і DEX-кидки, без реакцій; Hold Person — лише гуманоїди; Fly — швидкість польоту 60 | Bless/Bane ±2; Haste без швидкості/летаргії; Slow −2 на всі кидки; Hold Person без фільтра; Fly `speed +30` | Наближення | Minor | lane-only | Беклог; фільтр Hold Person — S | S–M |
| S-21 | Кап DC концентрації | 2024: max DC 30 | `systems/d20/rules/concentration/check.ts:45` (`dcCap ?? Infinity`), `data/templates/srd-5.2/rules.json:44` `"dcCap": null` | 80 шкоди → DC 40 | Minor | re-verified (дані); канон з пам'яті | `dcCap: 30` у пресеті | S |
| S-24 | Дорогі компоненти | Astral Projection, Clone, Legend Lore, Secret Chest, Create Undead — дорогі/витратні | `ingredients: []` або без `minGp` | Без перевірки запасу | Minor | lane-only | Додати рядки інгредієнтів | S |
| S-28 | `side: enemy` для площ | Faerie Fire, Web, Sleep, Fireball… зачіпають і союзників | усі шаблонні заклинання `side: enemy` | Дружнього вогню немає | Minor | lane-only | Може бути UX-рішенням (h); опційний `side: all` | S |
| S-22 | Тривалість зон | Darkness 10 хв, Fog Cloud 1 год, Spike Growth 10 хв | `zone.rounds 10` | Кінчаються через 1 хв | Info | lane-only | Задокументувати як бойовий кап | S |
| S-23 | Thunderwave / Moonbeam геометрія | Куб від краю заклинателя; циліндр радіуса 5 фт | куб по центру точки; «плюс» з 5 клітинок | Косметика | Info | lane-only | — | S |
| S-26 | Shield проти Magic Missile | MM не діє на заклинателя під Shield | Shield лише `armor +5` (`participantImmuneToSpell` існує) | MM влучає | Info | lane-only | Прапорець імунітету в даних Shield | S |
| S-27 | Ритуали, V/S | Ритуал +10 хв без слота; V потребує мови, S — вільної руки | `ritual`/`componentFlags` у бою не читаються | Silence не заважає | Info | lane-only | Поза обсягом бойового трекера | M |

### Здібності, юніти, герої (A)

| ID | механіка | канон | як у коді (файл:рядок) | розбіжність | тяжкість | перевірка | рекомендація | обсяг |
|---|---|---|---|---|---|---|---|---|
| A-3 | Extra Attack з кількох класів | Не сумується (Fighter 5 + Paladin 5 = 2 атаки) | `classes.json` `extra-attack-5` = `modifyStat attacksPerAction flat 1` у кожному класі; ключ здібності містить id класу (`lib/utils/abilities/build/resolve.ts`, `collect.ts:59-92`), тож дедуплікації немає; `lib/utils/battle/attack/attacks-left.ts:6-19` сумує `collectModifiers(...).flat` | Fighter 5/Paladin 5 = 3 атаки; Fighter 11/Paladin 5 = 4 | Major | re-verified (код) | `attacksPerAction` як max по джерелах або неспадковий ключ для Extra Attack | M |
| A-6 | Пули з `rest: short` | Channel Divinity, Wild Shape: 1 використання на короткому, усі — на довгому | Колонка `channel-divinity-uses` `pool.rest = "short"` (cleric, paladin); `lib/utils/characters/resources/rest.ts:24` прибирає всі `short`-заряди; пули отримують `regain: undefined` (`lib/utils/characters/resources/battle.ts:214-219`); Wild Shape `perRest {rest: "short"}` без `shortRegain` | Повертаються всі 2–4 використання | Major | re-verified | Підтримати `regain` у пулах колонок класу; CD = `rest: long` + `regain: 1`; Wild Shape `rest: long, shortRegain: 1` | M |
| A-7 | Rage на короткому відпочинку | Повертає 1 використання | `rage-1` `perRest {rest: "long"}`, без `shortRegain` | Нічого не повертається | Major | re-verified | `shortRegain: 1` | S |
| A-9 | Bardic Inspiration | Ціль додає кубик (d6–d12) до одного d20-тесту | `bardic-inspiration-1` = лише `mark`; `bardic` у `lib/`/`systems/` не читається; колонка `bardic-die` не використовується | Витрата заряду без ефекту; не в списку задокументованих прогалин | Major | re-verified | Споживаний d20-райдер або задокументувати як «вирішує DM» (h) | L |
| A-10 | Font of Inspiration (Bard 5) | Відновлення на короткому відпочинку | `font-of-inspiration-5` — `note`; ресурс лишається `rest: long` | Bard 5+ не відновлює | Major | lane-only | Варіант здібності з `rest: short` від 5 рівня | S–M |
| A-11 | Weapon Mastery | Ключова риса 2024 для бійців (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex) | `weapon-mastery-1` — `note`; у зброї лише текст `Mastery: …`; `docs/STATUS.md` тримає як відкритий пункт | Нічого не робить | Major | lane-only | Рішення про обсяг (h): райдери + вибір майстерностей | L |
| A-12 | Вразливості монстрів | Skeleton (дробильна), Mummy (вогонь), Treant (вогонь; резист B/P) тощо | `units.json`: 0 входжень «Vulnerab» на 331 юніт; у Skeleton/Treant немає жодних резистів/вразливостей. Конвертер їх підтримує (`scripts/srd/convert/units.ts:394-405`) | Слабкості не діють | Major | re-verified (дані); канон з пам'яті | Diff із SRD 5.2 PDF; override у `scripts/srd/overrides/units.ts` | M |
| A-13 | Регенерація Troll | Вогонь/кислота вимикають регенерацію на наступний хід | `units.json` Troll `Regeneration` = `heal 15` без умов (`lib/utils/units/monster-core-traits.ts:25-35` бере лише перше речення) | Регенерує завжди; стосується й інших Regeneration | Major | re-verified (дані) | Мітка придушення за типом шкоди; перевірити поведінку на 0 HP | M |
| A-5 | Sneak Attack — вимога до зброї | Лише Finesse або дальня | умова — лише перевага/союзник поруч | Sneak із Greatsword | Minor | lane-only | Умова за `attackSource` traits / `attackKind` | S |
| A-8 | Деталі Rage | Бонус до атак на Strength; перевага на STR-перевірки/кидки; без заклинань і концентрації | `damageBonus filter {kind: melee}`, без переваги й заборон | DEX-фехтувальник отримує бонус; варвар у люті кастує | Minor | lane-only | Фільтр за `attackAbility`, STR-перевага, прапорець «без заклинань» | M |
| A-14 | Innate Sorcery | +1 DC і перевага лише на атаки заклинаннями | `flag advantage attackKind: "all"`, без DC | Перевага на зброю, без +1 DC | Minor | lane-only | `attackKind: spell` + `saveDc +1` | S |
| A-16 | Stunning Strike на 3 рівні | Лише 5 рівень | дубль `stunning-strike-3` | Показується на 2 рівні раніше (лише note) | Minor | lane-only | Видалити `stunning-strike-3` | S |
| A-18 | Soldier: інструмент | Один Gaming Set | `toolProficiencies: []` | Немає | Minor | lane-only | Додати вибір | S |
| A-19 | 113 чудових предметів без механіки | Boots of Speed, Cloak of Displacement, Ring of Free Action, Bracers of Archery… | `abilities: []` | Без ефекту в бою | Minor | lane-only | Список покриття + кілька бойових предметів | M–L |
| A-20 | Магічні обладунки/зброя частково | Dragon Scale Mail резист, Armor of Invulnerability, Mace of Smiting, Scimitar of Speed, Dagger of Venom | лише числові бонуси | Неповні ефекти | Minor | lane-only | Заповнити або позначити в покритті | M |
| A-17 | Мовчазні прогалини класів | Martial Arts, Flurry, Favored Enemy, Paladin's Smite, Tactical Mind/Shift… | `note`; не всі в `abilities.md:88` | Документація неповна | Info | lane-only | Доповнити список «Прогалини рушія» | S |
| A-21 | Heavy, Loading | Риси зброї 2024 | `lib/constants/weapon-traits.ts:1-9` без них | Ігноруються | Info | lane-only | За бажанням | S |
| A-22 | Одна швидкість монстра | Окремо walk/fly/swim/climb | `battleSpeed` = max(walk, fly) | Задокументоване обмеження | Info | lane-only | — | — |
| A-23 | Gargantuan 3×3 | ≥4×4 | `gridSize: 3` | Ймовірно свідомий кап | Info | lane-only | Підтвердити в `lib/constants/map-limits.ts` | — |
| A-24 | Danger Sense | Без переваги, якщо incapacitated | без умови | Край | Info | lane-only | Опційно | S |

## (d) Свідомі відхилення (не баги)

Рішення власника:
- Бонусне заклинання не обмежує наступне заклинання з колом (2026-10-20, лишається безкоштовним).
- `pendingExtraActions` закрито (пул скидається на початку ходу).
- Укриття = автоматичне ×0,5 шкоди (без +2/+5 AC і без бонусу до DEX-кидків).
- Тривалість «N раундів = N ходів цілі».
- Roots блокує дальні атаки.
- Лінія шаблону заклинання зупиняється на першій заблокованій клітинці.
- Юніти, мораль, лідерство — за HoMM5 (екстра-хід, відплата, стеки, volley/cleave/chain, перешкода ×0,5, `hero-dm-multiplier`, `balance-multiplier`, відсоткові бонуси).
- Немає налаштування складності (`computeFairScaling`).

Зі звітів смуг:
- DM кастує безкоштовно лише через швидкі дії.
- Монстри помирають на 0 HP (`deathSaves.unitsDieAtZero`, опційне правило DMG).
- Ручний вибір переваги/перешкоди гравцем, коли правило не задає режим.
- Таблиці критичних ефектів (у SRD-пресеті вимкнені).
- Moonbeam — разовий шаблон 2d10 CON (перероблено за рішенням власника).
- Заклинателі-юніти: один пул `universal`, cantrip-скейл від `unit.level`.
- Reckless Attack — бонусна дія з поверненням бонусної дії; Action Surge — `extraActions: 2` компенсує саму дію.
- Frenzy без `damageType`; Step of the Wind = +100% швидкості; Adrenaline Rush temp HP як note.
- Задокументовані прогалини рушія (`docs/architecture/abilities.md:88`): перекидання d20, райдери рятівних кидків, temp HP, Jack of All Trades, Reliable Talent тощо.
- Counterspell/Shield не скасовують уже розіграний каст (немає ретроспективного відтворення, `battle.md` 4f-5b).
- Легендарні атаки не викликають HoMM-відплату.

## (e) Перевірено, ок

- Стани: blinded, deafened, invisible, paralyzed, petrified, prone, restrained, stunned, unconscious, incapacitated, grappled (2014) — прапорці відповідають SRD; авто-крит у 5 футах для зброї.
- Перевага/перешкода не сумуються і взаємно скасовуються; exhaustion 2014 і 2024; nat 1/20 для атак; рятівні кидки без авто-1/20; модифікатор здібності, бонус майстерності (рівень і CR).
- Криты: подвоєння кубиків (не модифікаторів) для зброї, серверних атак, атак заклинаннями, hit-riders; імунітет до критів.
- Порядок шкоди: кубики → крит → модифікатори → множники → резист (вниз) → temp HP → HP; масивна шкода; death saves повністю; концентрація (DC max(10, ½), одна за раз, кінець на 0 HP/incapacitated).
- Реакції, атаки при нагоді (вихід із досяжності, Disengage, примусовий рух), Dash, Disengage, Dodge, Stand up, Ready, Cunning Action; grapple/shove 2014 і 2024; Extra Attack пул, off-hand, дальність, перешкода в ближньому бою для зброї.
- Ініціатива (d20 + DEX, нічия за DEX), відпочинки: hit dice (½ для 2014, усі для 2024), пакт-слоти на короткому.
- Заклинання: DC і бонус атаки, половина вниз до резисту, таблиці `MULTICLASS_SLOTS`/`PACT_SLOTS`, третинні заклинателі, cantrip-скейл 5/11/17, підсилення `dice + upcastDice × кроки` (усі 109 рядків з текстом підсилення звірено), 12 атакуючих cantrip, рівні 1–3 шкода/лікування, заголовки всіх 349 заклинань (0 розбіжностей), дорогі компоненти 49 заклинань, геометрія шаблонів, лікування до max HP.
- Класи (12): кості хітів, рятівні кидки, навички, володіння, назви й рівні рис, колонки (Rages, Rage damage, Bardic die, cantrips/prepared, CD, Divine Spark, Wild Shape, Action Surge, Second Wind, Focus, Martial Arts, Lay on Hands, Sneak Attack, Sorcery Points…), ASI, HP за рівень, XP-таблиці 2014/2024.
- 9 видів SRD 5.2, 4 передісторії (крім Soldier), фіти (Origin, General, Fighting Style, Epic Boons).
- ~35 статблоків монстрів (AC, HP, швидкість, характеристики, CR, мультиатака, легендарні дії, DC, кубики й типи шкоди; резисти/імунітети нежиті, демонів, драконів, големів).
- Таблиці обладунків і 37 видів зброї 2024; ~20 магічних предметів; внутрішня узгодженість HoMM-шаблону.

## (f) Не перевірено / прогалини

- Рух (складна місцевість, лазіння, плавання, стрибки), освітлення/видимість, підводний бій, політ, падіння, задуха.
- Легендарні/лігвищні дії детально, обхід «немагічної» стійкості, таблиці критичних ефектів і `crit-choice`, `lib/constants/damage.ts`.
- Ready-тригери, граничні випадки Help/Dodge, серверні обробники відпочинку, похідні аркуша (AC, HP).
- Counterspell/Shield/Absorb Elements як реакції; контроль 4–9 кіл (Banishment, Polymorph, Wall of Force…) — лише пораховано як порожні; предмети із заклинаннями, `chooseOne`/`inputDice`, summon/transform, код тригерів зон.
- Підкласи (лише назви/рівні), риси класів 6–20 рівнів (лише назви/рівні), вміст списків Magic Initiate.
- Не всі 331 юніти порівняно зі статблоками; ~313 магічних предметів не звірено.
- UI (`SpellCastDialog`, вибір слота).
- Жодних runtime-перевірок (тести/dev-сервер заборонені), висновки за читанням коду.
- Смуга Grim/WFRP — відкладена (див. a).

## (g) План виправлень

Тривалість: S ≈ 0,5 сесії Sonnet, M ≈ 1, L ≈ 2–3. Тести за правилом епіка — одним прогоном у кінці хвилі; фінальне рев'ю — Opus.

### Critical + Major (пакети)

| Пакет | Зміст | Знахідки | Обсяг | Залежності | Ймовірні файли |
|---|---|---|---|---|---|
| **P1. Снаряди** | Модель `projectiles` (повтори id, кидок на снаряд, атака на промінь), `damageBonus: 1` для MM | S-1, S-2 | M | — | `lib/utils/battle/spell/spell-targeting.ts`, `spell/cast/index.ts`, `spell/power.ts`, `lib/utils/spells/model/{schema,dice}.ts`, `scripts/srd/overrides/spells.ts`, UI вибору цілей |
| **P2. Подія `hit`: crit + тип шкоди** | `crit`/`damageType` у події, подвоєння й резист у `applyDealDamage`, `crit` в `applyDamageConsequences`; умова Sneak Attack на finesse/ranged | X-1, A-5 | M | після P3 бажано (той самий `applyResistance`) | `lib/utils/battle/attack/process/hit.ts`, `lib/utils/abilities/registry/effects/hp.ts`, `lib/utils/battle/damage/resisted-ability-damage.ts`, типи подій абіліті, `scripts/srd/overrides/classes.ts` |
| **P3. Складання резистів 5e** | Хук системи «як комбінувати резисти»: 5e — прапорці, HoMM — відсотки | C-4 | M | — | `lib/utils/battle/resistance/index.ts`, `systems/d20/rules/**`, `lib/utils/rules/systems/types-combat.ts`, `system-contract` тест |
| **P4. Атаки заклинаннями** | Авто-крит у 5 футах (спільний хелпер), тип атаки з `targeting` | C-3, X-4 | S | — | `lib/utils/battle/spell/cast/outcome.ts`, `systems/d20/rules/magic/spell-roll.ts`, `systems/d20/rules/attack/resolve.ts` |
| **P5. Дані заклинань (лише overrides)** | Heat Metal auto; Disintegrate/FoD `damageBonus`; Hypnotic Pattern; Divine/Shining Smite upcast (рушій: `castLevel` у `hit-rider.ts`); Power Word Kill (умовний ефект); `dcCap: 30`; дрібні: Barkskin/Mage Armor, Vitriolic `half`, Hold Person фільтр, Shield vs MM, Innate Sorcery, видалення `stunning-strike-3` | S-3, S-4, S-6, S-11, S-13, S-21 (+ S-17, S-14 частково, S-20 частково, S-26, A-14, A-16) | M | — | `scripts/srd/overrides/{spells,classes}.ts`, `data/templates/srd-5.2/{spells,classes,rules}.json` (через `pnpm srd:build`), `lib/utils/battle/spell/cast/hit-rider.ts` |
| **P6. Кілька компонентів шкоди** | Кубики на ефект `dealDamage` (Flame Strike, Ice Storm, Meteor Swarm, Prismatic Spray), відкладена шкода (Acid Arrow, Vitriolic), `onMiss: half`, вампіризм Vampiric Touch | S-5, S-14, S-15 | M | після P1 (спільна модель кидків) | `lib/utils/spells/model/schema.ts`, `lib/utils/battle/spell/cast/{effects,outcome}.ts`, overrides |
| **P7. Відпочинки й відновлення** | `regain` для пулів колонок; Channel Divinity, Wild Shape, Rage `shortRegain`, Font of Inspiration | A-6, A-7, A-10 | M | — | `lib/utils/characters/resources/{rest,battle}.ts`, схема колонок класу, `scripts/srd/overrides/classes.ts` |
| **P8. Таблиці слотів** | Paladin/Ranger L1; мультиклас `ceil` (після відповіді h-1) | X-2, X-3 | S | рішення власника | `lib/utils/spells/class-slots.ts`, `docs/architecture/battle.md` |
| **P9. Extra Attack** | Неспадковий max для `attacksPerAction` | A-3 | M | — | `lib/utils/abilities/engine/core/collect-modifiers.ts` або дані, `lib/utils/battle/attack/attacks-left.ts` |
| **P10. Temp HP** | Ефект `tempHp` (max), дані False Life, Heroism, Armor of Agathys, Wild Shape, Inspiring Leader, Adrenaline Rush | X-5 (+ A-15) | M | — | схема ефектів `lib/utils/abilities/schema/effects.ts`, `registry/effects/hp.ts`, overrides |
| **P11. Стани** | Джерело для frightened/charmed від DM; poisoned/frightened на перевірки; grappled 2024 | C-6, C-7, C-11 | S | — | `lib/server/battles/mutations/conditions/conditions-mutation.ts`, `systems/d20/rules/conditions/registry.ts`, `ConditionsDialog` |
| **P12. Постійні зони** | ~8 заклинань на `zone`/`anchoredZone` (Spirit Guardians, Flaming Sphere, Call Lightning, Cloudkill, Wall of Fire, Spiritual Weapon, Heat Metal повтор, Vampiric Touch повтор) | S-7 | M–L | після P5/P6 | overrides, можливо `zone-triggers.ts` |
| **P13. Порожні заклинання і призови** | За рішенням h-2: `executionMode: manual` для всіх + реалізація пріоритетних (Misty Step, Aid, False Life → P10, Raise Dead/Resurrection, Counterspell як ручний), `summon` для Conjure* | S-12, S-25 | L | P10, рішення власника | overrides, `summon-inline.ts`, UI касту |
| **P14. Риси бійців/бардів** | Bardic Inspiration (споживаний d20-райдер) і Weapon Mastery | A-9, A-11 | L | рішення власника (h-3, h-4) | рушій d20-тестів, `systems/d20`, `classes.json`, `artifacts.json` |
| **P15. Дані монстрів** | Diff резистів/вразливостей з SRD 5.2, override; придушення регенерації | A-12, A-13 | M | — | `scripts/srd/overrides/units.ts`, `scripts/srd/convert/units.ts`, `lib/utils/units/monster-core-traits.ts` |

### Minor (пакет P16, за бажанням)

Grapple розмір (C-10), фільтр «ворог поруч» (C-12), досяжність OA (C-13), Help (C-14), DC при exhaustion (C-15), ініціатива (C-16), Action Surge (C-8), деталі Rage (A-8), Sleep (S-19), супутні ефекти (S-16), Searing Smite → hitRider (S-18), компоненти (S-24), Soldier (A-18), список покриття предметів (A-19/A-20). Обсяг M–L (2–3 сесії), розбити на 2 підходи: «бій» і «дані».

### Оцінка

- Critical + Major P1–P11: ≈ 9–10 сесій Sonnet (≈ 4–5 агенто-днів).
- P12–P15: ≈ 7–9 сесій.
- P16: ≈ 2–3 сесії.
- Разом ≈ 18–22 сесії Sonnet + 1–2 рев'ю Opus. Рекомендований перший прохід: P1, P2+P3, P4, P5, P7, P8, P11 (≈ 6–7 сесій), решта — за рішеннями з (h).

### Перетини з епіком якості та іншими гілками

- Трекер `docs/superpowers/plans/2026-11-17-quality-epic-9-10.md`: конфліктні точки `advance-turn` / `snapshot-state` / `participant-patch`, `prisma/schema.prisma`, `types/battle.ts`. Жоден пакет не потребує міграції схеми (усі зміни — у JSON-даних шаблону, Zod-схемах ефектів і рушії). P10 (temp HP) і P2 пишуть у учасника через існуючі примітиви (`applyRawDamage`, `applyDamageConsequences`), не через `participant-patch`; якщо знадобиться нове поле учасника — це `types/battle.ts` (після L9a — `types/battle*.ts`), тоді синхронізуватись з активною хвилею.
- P3 зачіпає слоти систем (`lib/utils/rules/systems/types-combat.ts`) і `system-contract` тест — перетин із L4/L4e (сканер ратчета); робити після закриття хвилі 4.
- C-13 (OA) лежить у `systems/opportunity` — L4b-2 (`[~]`, retaliation/opportunity у модулях, `counter-strike.ts`) ще у роботі; відкласти до її закриття.
- P11 (стани) — `systems/d20/rules/conditions/registry.ts`; L4b-1 переносив стан d20 в `ext`, конфлікт малоймовірний.
- `feat/soundboard` (65 файлів, аудіо) і `chore/w4b-contract` (2 файли) не перетинаються; `fix/reported-gameplay-bugs` поки без комітів відносно `main` — перед стартом перевірити її diff по `lib/utils/battle/**`.
- Пакети P1/P4/P6/P12 усі в `lib/utils/battle/spell/**` — не паралелити між собою; P2/P3 — разом в одній гілці.

### Дані, ресіди й кроки на проді (потребують погодження власника)

- Майже кожен пакет змінює шаблон SRD: правки в `scripts/srd/overrides/*`, перебудова `pnpm srd:build` → `data/templates/srd-5.2/*.json`.
- Прод: нова версія шаблону `pnpm constructor:srd-template` (публікація шару SRD; кампанії отримують оновлення через content layers) — **лише з дозволу власника**.
- P7 і P8: персонажі на проді з уже витраченими зарядами/слотами перерахуються при наступному відпочинку; окремий бекфіл не потрібен, але варто перевірити на prodcopy.
- P15: якщо кампанії мають клони юнітів SRD — оновлення через шар, не прямим записом; HoMM5-кампанія не зачіпається (HoMM — свідоме відхилення).
- Активних боїв на проді під час деплою P2/P3 краще уникати (змінюється розрахунок шкоди посеред бою, без міграції стану).

## (h) Відкриті питання власнику

1. **Варіант правил для таблиць слотів і мультикласу**: 2024 (Paladin/Ranger з 1 рівня, мультиклас half з округленням угору) чи 2014? Пресет зараз — 2024, рекомендація — 2024.
2. **161 заклинання без ефектів**: заповнювати (які пріоритетні?) чи позначити як «вирішує DM» (`executionMode: manual`) з явним написом в UI? Рекомендація — позначити всі зараз, реалізовувати поступово (Misty Step, Aid, False Life, Raise Dead, Counterspell-ручний першими).
3. **Bardic Inspiration**: робити механічний споживаний кубик до d20-тесту чи лишити як «вирішує DM» і задокументувати?
4. **Weapon Mastery**: потрібна в бою (райдери + вибір майстерностей) чи лишити note?
5. **Дружній вогонь** для площинних заклинань (`side: all`) — вмикати за каноном чи лишити UX-рішення «лише вороги»?
6. **Кап тривалості зон 10 раундів** (Darkness, Fog Cloud, Spike Growth) — свідомий бойовий кап? Якщо так — внести до свідомих відхилень.
7. **Кап DC концентрації 30** (2024) — вмикати в SRD-пресеті?
8. **Gargantuan = 3×3** — свідомий кап сітки?
9. **Порядок робіт**: стартувати з першого проходу (P1, P2+P3, P4, P5, P7, P8, P11) після закриття хвилі 4 епіка якості?

Виправлення не починаються до «так» власника.

## Статус 2026-11-19 (прохід 2, `fix/canon-audit-2`)

**Виправлено:** X-1/A-5 (hit: крит, тип, finesse), X-5/A-15 (temp HP, `hot`, thorns), S-1/S-2, S-3–S-7, S-11, S-13–S-20, S-24, S-28 (дружній вогонь за allowlist), S-12/S-25 (усі 160 порожніх заклинань, призови до 4), C-3, C-4, C-6, C-7, C-10 (розмір grapple/shove), C-11, C-12, C-14 (Help 2024), A-3, A-6/A-7/A-10, A-8 (Rage), A-9 (Bardic Inspiration), A-11 (Weapon Mastery), A-12/A-13 (вразливості, регенерація), A-14, A-16, A-18, X-2/X-3 (слоти).
**Змінено:** C-8 Action Surge — вільна додаткова дія; S-22 — канонічні тривалості зон, стеля 600 раундів; A-23 — Gargantuan 4x4 (збережений `gridSize`, наявні бої 3x3).
**Знято:** C-15 — SRD 5.2 exhaustion не змінює СК заклинань.
**Пропущено:** C-13 (OA, до закриття L4b-2); Troll на 0 HP; A-19/A-20 для предметів, що потребують нових концепцій (Mace of Smiting, Scimitar of Speed, Dagger of Venom, Cloak of Displacement, Ring of Free Action, Armor of Invulnerability), варіанти Dragon Scale Mail; Ice Knife (вибух) і рухома Flaming Sphere.
**Рішення власника (h):** 1 — 2024 для слотів і мультикласу; 2 — заповнити всі порожні заклинання; 3 — Bardic Inspiration механічно; 4 — Weapon Mastery у бою; 5 — дружній вогонь за каноном (`side: all`, allowlist, кастер включно); 6 — кап зон піднято до 600 раундів; 8 — Gargantuan 4x4.
