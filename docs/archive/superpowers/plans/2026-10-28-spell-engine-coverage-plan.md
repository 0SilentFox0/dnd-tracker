# План: покриття заклинань рушієм, фази P1–P5

Дата: 2026-10-28. Спек: [`2026-10-28-spell-engine-coverage-spec.md`](../specs/2026-10-28-spell-engine-coverage-spec.md). Гілка `feat/spell-engine-coverage` (worktree `../dnd-tracker-spells`, від `main` `6f3beac5`). P0 уже в `main`: 27/50 native (11 M/M+R + 16 N), 23 manual.

Рішення користувача (не переглядаємо): «чесні 100 %» = 0 manual, ядро виконує рушій, вторинне — `SPELL_RIDER_MANUAL`, без бойових чисел — N; P5 у скоупі (Forest Guard, Beast Transmutation); Tamh Gon лишається N; Monkey's Grasp — рятівний кидок проти СК заклинання (без резолюції `contest`); реакцію Rageful Nimbus рушій виконує **автоматично**; висоту Plummet кастер вводить у діалозі касту (`inputCount`, обрізання 20d6).

## 0. Правила для виконавців (Sonnet, кожна задача — один dispatch)

- TDD: спершу тест, потім код. Під час роботи — `pnpm test:related <файли>` / `pnpm test:changed`; повний `pnpm test:run` — один раз наприкінці фази. `pnpm lint` і `pnpm exec tsc --noEmit` перед комітом.
- **Без міграцій**: усе в наявних JSON-колонках (`spells.definition`, `battle_participants.snapshot`, `battle_scenes.map`, `campaigns.rules`). Не запускати `prisma migrate` у жодній формі.
- **Тестові дані лише синтетичні**: рядки 5etools пишемо вручну в тестах або в `lib/server/compendium-import/__tests__/fixtures/universal.synthetic.json`. Реальний файл Obojima в репо не потрапляє (ні цілком, ні цитатами абзаців). Імпортер generic: кожне правило — шаблон тексту/тегу 5etools з позитивним і негативним тестом, жодних перевірок назви заклинання чи книги.
- **Інваріанти battle.md**: snapshot пишемо лише через `saveBattle` (`snapshotHash`); кожен примітив шкоди → **одразу** `applyDamageConsequences` (у флоу — `applyFlowDamage`); зняття ефектів/станів — лише `removeEffects`; хід — лише `advanceTurn` (тригери початку ходу — у `turn/turn-start.ts`); відповіді — дельти (`upserted`/`patched`); усі кидки сервера — через `ctx.rng`/`state.rng`, ключі crit-тригерів стабільні, нова гілка не споживає rng до паузи crit-choice; концентрація — тег `concentrationOf`, згасання ліниве.
- Нові поля опційні: HOMM і SRD без змін. Вміння читаються лише через `collectModifiers`/`read.ts`.
- Новий вид ефекту = Zod у `lib/utils/abilities/schema/effects.ts` (або спел-only схема, див. 1.0) + рядок `EFFECT_REGISTRY` (`lib/utils/abilities/registry/effects/index.ts`: `label`, `fields`, `describe`, `apply`) — так його бачить `AbilityListEditor`. `registry/labels.ts` — лише спільні підписи (стати, цілі, стани).
- Нові тексти помилок — `lib/constants/api-errors.ts` (якщо до мерджу в `main` потрапить i18n part 1 — ключі в `messages/{uk,en}/errors.json`).
- Коментарі — мінімальні (лише «чому»).

## 1. Корекції спеки (звірено з кодом 2026-10-28)

1. **SRD**: заклинань 498, не 488. SRD-конвертер (`scripts/srd/convert/spells.ts`) використовує лише `lib/utils/spells/derive/mechanics.ts`; `adapters/spell-derive.ts` на SRD не впливає. Джерело open5e в репо немає (`pnpm srd:build` його завантажує), тож снапшот «усіх 498» у CI неможливий → охорона: снапшот-тест на фікстурі `scripts/srd/__tests__/fixtures/Spell.json` (15 заклинань) + локальний `pnpm srd:build && git diff --exit-code data/templates/srd-5.2/spells.json` у фазі, що чіпає `mechanics.ts`. `DIE_SIDES` у `mechanics.ts` **не** розширюємо (d20 лише в імпортері).
2. **OpenAPI**: тести мають поріг `146_000` (`lib/server/content/__tests__/openapi{,-4f2,-4f4}.test.ts`), документ у `content-api.md` каже 145 000. Поточний розмір — **145 573** (запас ~430 символів, 145 000 уже перевищено). Див. 1.0 і ризик R1.
3. Підписи ефектів живуть у `EFFECT_REGISTRY` (`registry/effects/index.ts`), а не в `registry/labels.ts`.
4. `targetCreatureType` — це **умова вміння** (`registry/conditions.ts`), а не фільтр цілей заклинання; у `spell-targeting.ts` фільтра типу немає. CR у snapshot **немає** (`isMonster5e` читає рядок юніта) → треба `abilities.cr` у `participant/from-unit.ts` і `refresh-from-source.ts`. Політ — `abilities.movement.fly`; `isAirborne` — HOMM-пікірування, з 5e-польотом не конфліктує.
5. `modifyStat.atLeast` зараз застосовує лише `abilities/build/bake.ts` (характеристики). Броня й тимчасова швидкість читаються через `statWithModifiers` (`engine/core/collect-modifiers.ts`) → `atLeast` для `armor`/`speed` іде туди.
6. `damageBonus.flat` — `FlatSchema` (число/формула/scale), `spellRoll` там немає; `Amount.spellRoll` — додатний відсоток. `{spellRoll:-100}` потребує окремого варіанта схеми.
7. `syncMapAuras` лише синхронізує статичні аури з фіксованим `AURA_RADIUS_CELLS`; тригери «вхід/початок ходу» для аури на учаснику ставимо в `move-mutation` + `turn-start.ts` (як небезпеки), не в `syncMapAuras`.
8. Каст завантажує рядок `Spell` за `spellId` (`spell-mutation.ts`, `deps.loadSpell`), а `resolveSpellSource` вважає кілька грантів одного `spellId` неоднозначністю. Inline-підкаст `grantCast` потребує визначення на самому гранті (`SpellGrant.inline`) і підміни `definition` **до** перевірок `executionMode`/`cost` у мутації.
9. Місцевість: `TerrainCell.kind` один на клітинку (зона-небезпека не може бути ще й складною) → прапорці на клітинці. `wall` ніколи не згасає (`grid/terrain.ts` `isExpired` — лише `barrier`/`hazard`). Схема мапи (`lib/schemas/battles.ts`) обрізає невідомі поля клітинки (уже губить `damage.concentrationOf` при збереженні ДМ).
10. `grid/path.ts` `searchPaths` — BFS з одиничною вартістю → складна місцевість потребує зваженого пошуку.
11. `pendingHits` краще тримати на **кастері** (виконується на початку його ходу) і з уже кинутим числом — тоді на початку ходу rng не потрібен (реплей-безпечно).
12. P0 зберіг каскад блокерів у `deriveSpell`; нові розпізнавачі P1–P5 мають іти **до** блокерів.
13. `rules.conditions` — `z.strictObject` (`lib/utils/rules/schema.ts`) → `custom` вимагає зміни схеми; розібрані правила спільні (`parseRulesCached`), не мутувати.
14. «Вирватися» (`runEscape`) кидає змагання проти власного СК схоплювача → схоплення заклинанням потребує `escapeDc` на ефекті.

## Фаза P1 — малі примітиви (→ 35/50)

Заклинання: Gift, Control Animal, Summon Vehicle, Swallow Magic, Resilient Friendship, Whelm Weapon, Water Bullet, Plummet (+ rider-апгрейд Pillar of Force: `push`).

### T1.0 + T1.1 (один dispatch): охорона, каркас розпізнавачів, d20, Gift
- **Охорона SRD**: `scripts/srd/__tests__/spells-derive-snapshot.test.ts` — `convertSpells` на фікстурі → `toMatchFileSnapshot` полів `{slug,targeting,resolution,dice,dieSides,upcastDice,upcastTargets,addAbilityMod,spellEffects}`.
- **Охорона OpenAPI**: спел-only схеми. `lib/utils/spells/model/schema.ts`: `SpellEffectSchema = z.discriminatedUnion("kind", [...BASE_EFFECTS, RandomOf, ...SPELL_ONLY_EFFECTS])`, `SpellDefinitionSchema.effects: z.array(SpellEffectSchema)`. Спел-only види (chooseOne, grantCast, anchoredZone, createTerrain, summonInline, transform, moveSelf, hitRider) **не** входять в `Ability`, не роздувають кожен `$ref` вмінь і не потрапляють у HOMM-редактор вмінь. У компоненті OpenAPI — один `$ref` `SpellEffect`. Записати розмір до/після в опис коміту.
- **Каркас**: `lib/server/compendium-import/adapters/spell-patterns/index.ts`:
  ```ts
  export interface SpellPatternInput { row: Record<string, unknown>; raw: string; text: string; higher: string; cast: SpellCast; ability: AbilityKey | null; damageTypes: string[] }
  export type SpellRecognizer = (i: SpellPatternInput) => SpellDerivation | null;
  export const SPELL_RECOGNIZERS: SpellRecognizer[] = [/* порядок: від вужчих до ширших */];
  ```
  Виклик у `deriveSpell` одразу після N-перевірок, до `SMN`/`BUFF`/`ZONE`/… блокерів. Хелпер тестів `spellRow(entries, extra)` у `spell-patterns/__tests__/helpers.ts`.
- **d20**: `SpellDieSidesSchema` += `20`; перевірити `casterSpellDice`, `assertSpellRolls`, поля кидків у `SpellCastDialog` (d20 — уже є для атак, не сплутати UI). `DIE_SIDES` у `mechanics.ts` — без змін.
- **eventDamage у касті**: `SpellCastState.dealt: number` (сума `finalDamage` усіх `dealSpellDamage` цього касту); у `runEffect` подія отримує `damage: state.dealt`, тож `heal {percentOf:"eventDamage"}` уже працює через `eventDamage(event)` у `registry/effects/hp.ts`. `dealDamage target:"self"`: ціль-кастер не має `outcome` від рятівного — `outcomeFor` для ідентифікатора поза `targetIds` → авто (без кидка).
- **Розпізнавач `selfDamageTransfer`**: «you take XdY … damage» + «regains hit points equal to …» → `effects: [dealDamage {target:"self", amount:{spellRoll:100}, damageType}, heal {target:"eventTarget", amount:{percentOf:"eventDamage", value:100}}]`, `dieSides` з тегу (у т. ч. 20).
- **Тести**: d20 у схемі й `assertSpellRolls`; Gift-фікстура: кастер −N з опором (опір → N/2, ціль +N/2), обидва проходять `applyDamageConsequences` (кастер на 0 HP — непритомний); негатив: «you take 2d6 fire damage» без «regains» → лишається `SELF_DAMAGE`; SRD-снапшот без змін.

### T1.2: фільтр цілей, CR у snapshot, `atLeast` для armor/speed
- `SpellTargetFilterSchema = z.object({ creatureTypes: z.array(z.string().trim().min(1).max(40)).min(1).max(10).optional(), maxCr: z.number().min(0).max(30).optional(), maxCrPerLevel: z.number().min(0).max(5).optional(), movement: z.literal("fly").optional() })`, поле `filter?` у варіантах `ally|enemy|area|template` `SpellTargetingSchema`.
- `lib/utils/battle/spell/target-filter.ts`: `matchesTargetFilter(p, filter, { spellLevel, castLevel }): boolean` — тип через ту саму нормалізацію, що `targetCreatureType` (`trim().toLowerCase()`); без типу/CR → не підходить; `maxCr + maxCrPerLevel × upcastSteps`; `movement:"fly"` → `abilities.movement?.fly > 0`. Виклик у `resolveRaw` (`spell-targeting.ts`) для обраних і для шаблонних цілей (шаблон тихо відкидає невідповідних). Клієнт використовує той самий `resolveSpellTargets` — перевірити, що мапа підсвічує невалідні як `invalid-target`. Помилка `API_ERRORS.BATTLE_SPELL_TARGET_FILTER`.
- `abilities.cr?: number` у `BattleParticipantAbilities`; писати в `from-unit.ts` для `isMonster5e`, оновлювати в `refresh-from-source.ts`.
- `modifyStat.atLeast`: refine дозволяє `stat ∈ ABILITY_KEYS ∪ {armor, speed}`; для `armor`/`speed` — лише з `duration`. `collectModifiers` збирає `atLeast` (max); `statWithModifiers` → `Math.max(base+flat+percent, atLeast)`. `bake.ts` без змін. Поле редактора `visibleWhen` — додати armor/speed.
- **Розпізнавачі**: «beast … challenge rating N or lower» (+ «for each slot level above» → `maxCrPerLevel`) → `filter`; Control Animal-шаблон: `charmed` на ціль + «you are/become {@condition incapacitated}» → другий ефект `applyCondition incapacitated target:self`; «your speed becomes at least N» / «you have a speed of N» на себе → `modifyStat speed atLeast N` (Summon Vehicle; rider «один вершник» лишається).
- **Тести**: фільтр `beast maxCr 2` відхиляє CR 3 і HOMM-юніт без типу, на колі +1 пропускає CR 3 (`maxCrPerLevel 1`); `movement:"fly"` відхиляє ходока; `atLeast armor 20` дає 20 з 15 і не знижує 21; швидкість ≥ 60 у `movementBudget`; HOMM-учасник без `cr` поводиться як раніше.

### T1.3: `chooseOne`, `help`, `damageBonus {spellRoll}`
- Спел-only `{ kind: "chooseOne", options: NonRandomEffect[] (2..7) }`. `spellSchema` (`cast-spell-schema.ts`) += `optionIndex: z.number().int().min(0).max(6).optional()`. `spell-mutation`: є `chooseOne` і немає індексу або він поза межами → 422 `BATTLE_SPELL_OPTION_REQUIRED` (до будь-яких змін стану, до `runWithCritChoice`). `castSpell` отримує `optionIndex` і перед циклом замінює `chooseOne` на `options[i]` (`expandChosen(effects, i)` поруч із `flatEffects`). Прев'ю/`dryRun` — те саме.
- Клієнт: `spell-flow` стан `optionIndex` + дія `SET_OPTION`; `SpellCastDialog` — список опцій (`describeEffect`) радіокнопками, кнопка касту неактивна без вибору; `lib/api/battles` передає поле.
- `{ kind: "help", target? }` (у `BASE_EFFECTS`, бо корисний і вмінням): аплаєр бере `helpEffect(casterId)` з `actions/effects.ts` і той самий шлях накладання timed-ефекту, що core-дія «Допомога» (`coreTimedKey("help", casterId)`) — без копії логіки.
- `damageBonus.flat` += спел-варіант `{ spellRoll: z.number().int().min(-500).max(500).refine(n => n !== 0) }` (лише в `DamageBonusSchema`, `FlatSchema` не чіпати). У `runEffect` касту перед `applyEffect` — `freezeSpellRoll(effect, roll)` → число (`Math.trunc(roll × pct / 100)`), тож у `ActiveEffect.abilityEffects` лежить число. Поза кастом (вміння) `validateAbilities` дає проблему, рушій — 0.
- **Розпізнавачі**: «choose one of the following» + список `entries` з підпунктами, кожен з яких розпізнається відомим шаблоном (лікування XdY+мод, «speed increases by N», нерозпізнаний → `note`) → `chooseOne`; нерозпізнана опція = rider (`SPELL_RIDER_MANUAL`). Divine Arrow: опції `flag resistance percent:-100` (імунітет→опір лишається rider-ом). «Help action» / «advantage on the next attack roll» союзнику → `help`. «roll a dN and subtract the number rolled from … damage» → `dice:1, dieSides:N, damageBonus {filter: weapon, flat:{spellRoll:-100}}`, `concentration` з тегу.
- **Тести**: без `optionIndex` → 422 без зміни версії; з індексом — лише ця опція; `help` дає перевагу рівно на одну атаку і знімається після неї; `{spellRoll:-100}` при кидку 3 → на ефекті `flat:-3`, наступні атаки цілі −3 до кінця концентрації; HOMM-вміння з `chooseOne` не проходить схему `Ability`.

### T1.4: `byDistance`, кубики з введення (Plummet), `push`
- `dealDamage.byDistance?: { maxFeet: number(5..600, кратне 5); dice: DICE }[]` (2..6, зростання `maxFeet`). У `dealSpellDamage`: відстань = `footprintDistance(cellsOf(caster), cellsOf(target)) × CELL_FEET`; перший діапазон з `maxFeet ≥ d`, далі — останній; без мапи — перший + рядок у лозі «без мапи — найближчий діапазон». Кубики діапазону кидає сервер `rollDice(dice, state.rng)` у фіксованому порядку цілей; `upcastDice` додає кубики до кожного діапазону. `definition.dice` = кубики першого діапазону (лише для прев'ю).
- **Висота Plummet** — на рівні визначення, не в `AmountSchema` (щоб не чіпати вміння й OpenAPI `Ability`): `SpellDefinition.diceFromInput?: { label: string(≤40); max: 1..40 }`; запит `inputCount: z.number().int().min(0).max(40).optional()`. `casterSpellDice` → `count = min(inputCount, max)`; без `inputCount` → 422 `BATTLE_SPELL_INPUT_REQUIRED`. Кидки — звичайні `diceRolls` (клієнт або сервер), ефект лишається `amount:{spellRoll:100}`. UI: числове поле з `label` у `SpellCastDialog` (кількість полів кубиків оновлюється).
- `{ kind: "push", feet: 5..30 (кратне 5), from: "caster", target? }` у `BASE_EFFECTS`. `lib/utils/battle/grid/push.ts`: `pushAway(map, ps, fromCells, target, cells): { position, steps }` — крок за кроком по напрямку від центру кастера (та сама геометрія, що `runShove` у `actions/grapple.ts`, винести спільну функцію напрямку), зупинка перед `!canStand`. Після приземлення — `hazardUnder` → `hazardHit` (сам викликає `applyDamageConsequences`, ставить `hazardHitRound`). Без мапи — лише рядок у лозі.
- **Розпізнавачі**: таблиця «N-M feet: XdY» (`VARIABLE`) → `byDistance`; «XdY … for every 10 feet» + «(maximum of NdY)» → `diceFromInput {label:"Висота, ×10 фт", max:N}` + `filter.movement:"fly"` якщо «flying creature»; «pushed up to N feet away from you» → `push`; rider «поштовх» тоді не пишеться.
- **Тести**: `byDistance` на 5/30/85 фт → 5d6/4d6/3d6, без мапи — перший; upcast +1 кубик у кожному; `diceFromInput` обрізає 25 → 20; Plummet: провал — шкода + `prone`, успіх — 0; `push 10` зупиняється перед стіною; приземлення в небезпеку → шкода + наслідки, другий раз за раунд — ні.

### Приймання P1
- `COMPENDIUM_REAL_FILE=… DATABASE_URL=…/obojima pnpm compendium:coverage` (локально, реальний файл поза репо): **35/50 native**, manual 15, жодного нового `MANUAL_*` у 35.
- Регрес: `pnpm test:related` змінених файлів; `scripts/srd/__tests__` (снапшот без змін); OpenAPI-тести (поріг — див. R1); HOMM-сценарії `lib/utils/battle/**/__tests__` зелені; повний `pnpm test:run` наприкінці фази.
- Документи: `docs/architecture/battle.md` — новий розділ «5e: покриття заклинань (P1–P5)» (фільтр цілей, `optionIndex`, `inputCount`, `byDistance`, `push`); `abilities.md` — `help`, `push`, `atLeast` armor/speed, спел-only ефекти; `content-api.md` — `SpellEffect` `$ref` і розмір; `docs/STATUS.md` — рядок фази; `lib/onboarding/whats-new.ts` — «вибір варіанта заклинання і висота падіння в діалозі касту».
- **Живий прогін** (Sonnet-субагент, браузер, локальна БД `obojima`, кампанія з `--keep`, герой 5e з цими заклинаннями + монстри 5e різних типів/CR + один літун): Gift (HP обох, лог); Control Animal на звірі CR ≤ 2 (успіх) і на гуманоїді/CR 3 (мапа показує невалідну ціль); Swallow Magic — діалог вимагає вибір, застосовується лише вибране; Resilient Friendship → перевага на першій атаці; Whelm Weapon −1d4 до шкоди цілей; Water Bullet на трьох відстанях; Plummet з висотою 30/250 фт (20d6), рятівний; Summon Vehicle — бюджет руху. Мобільна ширина: діалог касту з опціями/полем висоти без горизонтального скролу. Перевірити JS/текст, а не лише скрін.

## Фаза P2 — власні стани з книги (→ 37/50)

Заклинання: Pacify Monster, Pacify Person.

### T2.1: власні стани в правилах і рушії
- `lib/utils/rules/schema.ts`: `conditions` += `custom: z.array(CustomConditionSchema).max(50).optional()`; `CustomConditionSchema = z.object({ key: z.string().regex(/^custom:[a-z0-9-]{1,40}$/), name: z.string().min(1).max(60), description: z.string().max(2000), markers: z.array(z.enum(CONDITION_KEYS)).max(10), abilityEffects: z.array(StaticEffectSchema).max(10).optional() })`. `DEFAULT_RULES` без змін; patch-семантика: масив `custom` зливається за `key` (не заміна) — перевірити `patchSection`.
- `ApplyConditionSchema.condition: z.union([AnyConditionSchema, CustomConditionKeySchema])` (лише тут; `AnyConditionSchema`/`AnyConditionKey` не розширювати — інакше лавина `Record<AnyConditionKey,…>`).
- `lib/utils/battle/conditions/registry.ts`: `conditionDefinition(key, rules)` → 5e-реєстр або `rules.conditions.custom`; `applyCondition5e` бере rules з `ctx.rules` (зафіксована копія `battle.rules`). Невідомий custom-ключ → no-op + рядок «стан не визначено в правилах кампанії». Підпис стану: `name` з правил.
- Маркери (`EffectMarker`, `CONDITION_KEYS`): `no_hostile_spells` — у `spell-mutation` до таргетингу: кастер з маркером і `hostile(targeting)` або будь-яка ціль-ворог → 422 `BATTLE_CASTER_PACIFIED`; клієнтська книга заклинань показує причину (спільна функція з `spell-targeting.ts`). `no_damage_dealt` — `dealsNoDamage(ps, id)` через `collectModifiers`; перевірка в `dealSpellDamage` (кастер), обробці влучання атаки (`attack/process/hit.ts`) і `hazardHit` (власник зони: `TerrainDamage.casterId?`, пишеться в `spellZoneHazard`) → шкода 0, рядок у лозі.
- `ConditionsDialog` ДМ показує custom-стани кампанії (накласти/зняти).
- **Тести**: `pacified` (маркери `disable_melee_attacks`, `disable_ranged_attacks`, `no_hostile_spells`, `no_damage_dealt`) блокує атаку і ворожий каст, лікування союзника дозволено, шкода зони кастера → 0; `saveEnds wisdom` знімає; кампанія без custom і HOMM — без змін (снапшот існуючих тестів станів); невідомий custom → no-op.

### T2.2: імпорт кореня `condition`
- Імпортер: корінь `condition` 5etools → `recommendedRulesPatch.conditions.custom` (злиття з наявним патчем `classes`). Текст → маркери шаблонами: «can't attack» → `disable_melee_attacks`+`disable_ranged_attacks`; «cast a spell that (?:affects|targets) an enemy» → `no_hostile_spells`; «deal damage» (у запереченні) → `no_damage_dealt`; «speed (?:is|becomes) 0|can't move» → `immobilized`; «can't take actions» → `skip_action`. Нерозпізнана фраза → стан лише з описом + issue `MANUAL_CONDITION_TEXT` (warning).
- `spell-derive`: `{@condition X}`, де X є в корені `condition` файлу, не блокер `UNSUPPORTED_CONDITION`, а `applyCondition custom:x` (+ `saveEnds` з «repeat the saving throw», `upcastTargets`, «humanoid» → `filter.creatureTypes:["humanoid"]`).
- Застосування патча: перевірити, що повторний імпорт не дублює й не затирає ручні правки ДМ (злиття за `key`; змінений опис → звичайний `LOCAL_CONFLICT`-шлях, якщо є).
- **Тести**: синтетичний корінь з двома станами (один повністю розпізнаний, один — ні → `MANUAL_CONDITION_TEXT`); повторний preview — 0 змін; заклинання з custom-станом → native.

### Приймання P2
- Покриття **37/50**. Регрес як у P1 + `lib/utils/rules/__tests__`, `lib/utils/battle/conditions/__tests__`.
- Документи: `battle.md` (власні стани, два маркери), `abilities.md` (`applyCondition custom:*`), `content-api.md` (rules patch), STATUS, whats-new «стани з книги в правилах кампанії».
- **Живий прогін**: імпорт оновлює правила кампанії (сторінка `dm/rules` показує стани); Pacify Monster на монстра: його атака відхиляється, ворожий каст — помилка, лікування союзника працює; повторний рятівний наприкінці ходу знімає; Pacify Person не дозволяє ціль-звіра; ДМ знімає стан через діалог станів.

## Фаза P3 — тимчасові дії й rider-и влучання (→ 44/50)

Заклинання: Sprout Foliage, Vegetable Blade, Crustacean Form, Mushroom Ballista, Wind Sprint, Monkey's Grasp, Rageful Nimbus.

### T3.1: `grantCast` (тимчасовий підкаст)
- Спел-only `GrantCastSchema = { kind: "grantCast", label: string(≤60), cost: "action"|"bonusAction"|"reaction", uses?: 1..20, duration: DurationSchema, target?: "self"|"eventTarget" (default self), cast: InlineCastSchema }`; `InlineCastSchema = { targeting: SpellTargetingSchema, resolution, dice, dieSides?, addAbilityMod?, damageBonus?, effects: NonRandomEffect[] (1..6), anchorMarkId?: string, auto?: { on: "attackAgainstMarked" } }`. Вкладений `grantCast` неможливий конструктивно (`NonRandomEffect` його не містить).
- `SpellGrant` += `inline?: InlineCast; expiresRound?: number; concentrationOf?: {casterId; castId}; castCost?: SpellCost`. Ключ `cast:<castId>:<effectIndex>`; `castId` = `castIdFor(...)` завжди (не лише при концентрації). `uses` → пул `pool:cast:<castId>:<i>` у `battleData.pools` (`rest: null`); без `uses` — ціна 0.
- Аплаєр — у касті (`lib/utils/battle/spell/cast/grant-cast.ts`, викликається з `castSpell` після ефектів, бо потребує `castId`/`spellId`), пише грант у `spellcasting.grants` носія.
- `spell-mutation`: ранній `peekGrant(caster, data)`; якщо `grant.inline` → `spell = withInlineDefinition(toCastableSpell(row), grant)` **до** перевірок `executionMode`/`cost`/`requireActor` (`anyTurn` для reaction). `resolveSpellSource`: inline-гранти — лише за явним `grantKey`, не беруть участі в автовиборі й неоднозначності; без слота.
- Згасання: `isGrantLive(grant, round, ps)` (`expiresRound`, `isZoneConcentrationLive`) у `resolveSpellSource` і в списку клієнта; фізичне прибирання мертвих inline-грантів — у `turn-start.ts` власника (пише snapshot → `saveBattle`).
- Персистенс: `persistCharacterResources` пропускає `pool:cast:*` і inline-гранти (не потрапляють у `Character.resources`).
- Клієнт: `useBattleSpellLibrary` показує живі inline-гранти окремими плитками з `label` і визначенням з гранту (не з бібліотеки за `spellId`).
- **Розпізнавачі**: «you can use (?:a|your) (bonus action|action) to make a (melee|ranged) spell attack … XdY + your spellcasting ability modifier» → `grantCast` (Sprout Foliage); «a creature you touch can use … to make a melee … attack … XdY slashing» → `grantCast target:eventTarget` з модифікатором власника (Vegetable Blade).
- **Тести**: грант з'являється, не витрачає слот, витрачає `uses`; зникає після `duration` і після втрати концентрації (ліниво — каст відхиляється `BATTLE_SPELL_SOURCE_UNAVAILABLE`); каст без `grantKey` того ж заклинання не стає неоднозначним; атака гранту проходить crit-choice; бій завершується без запису `pool:cast:*` у ресурси.

### T3.2: `hitRider`, `moveSelf`
- Спел-only `{ kind: "hitRider", attackKind: "melee"|"ranged"|"any", extraDice: DICE, damageType, charges: 1..10, consumeOnMiss?: boolean, save?: { ability, onFail: NonRandomEffect[] (≤3) }, expireAtTurnEnd?: boolean, duration }` → `ActiveEffect.hitRider { …, chargesLeft }` на носії (`consumeOn` не використовуємо — потрібен лічильник).
- Обробка в `attack/process/hit.ts` (і промах — у місці, де викликається `consumeAttackEffects`): збіг виду атаки → `rollDice(extraDice, ctx.rng)` (крит — подвоєні кубики за `rules.criticals.doubleDice`), `applyResistance` → `applyRawDamage` → `applyFlowDamage` **одразу**; рядок «Вміння: +N» у `damageBreakdown`; `save` → `rollSave` проти СК кастера (зберегти `dc` на ефекті), провал → `applyEffect` для `onFail` (`push`, `applyCondition`). Заряд −1 (промах — лише з `consumeOnMiss`), на 0 — `removeEffects`. `expireAtTurnEnd` — наявний механізм.
- Спел-only `{ kind: "moveSelf", to: "adjacentToTarget" }`: найближча вільна клітинка поруч із ціллю (`canStand`, той самий пошук, що місце приземлення `squall`/`grid/placement.ts`); без атак при відході (як телепорт), без мапи — лише лог.
- **Розпізнавачі**: «the next N times you hit … with a ranged weapon attack … extra XdY» (+ рятівний/поштовх) → `hitRider`; «(teleport|move) to an unoccupied space (?:adjacent to|within 5 feet of)» → `moveSelf`; «until the end of your turn» → `expireAtTurnEnd`.
- **Тести**: 3 заряди — три влучання, промах не витрачає; «hits or misses» витрачає; крит подвоює кубики; провал рятівного → поштовх ≤ 15 фт; `moveSelf` не провокує атак при відході (`resolveMovement5e` не викликається); ціль оточена → найближча вільна або відмова з лог-рядком.

### T3.3: поріг шкоди, DoT прив'язаний до стану, схоплення заклинанням, рятівний «Сил або Спр»
- Прапорець `{ flag: "damageThreshold", value: 1..100 }` (`FlagSchema`): останній крок `applyResistance` (`lib/utils/battle/resistance`) — `finalDamage < max(value)` → 0, крок «Поріг шкоди» у `steps`. Перевірити, що всі шляхи шкоди (атака, каст, небезпека, DoT, `hitRider`, `push`) ідуть через `applyResistance`; `applyDamageConsequences` усе одно викликається з 0.
- `ApplyConditionSchema` += `escapeDc?: true` → ефект зберігає `escapeDc = state.saveDc`; ключ ефекту `spell:<castId>` (не `core:grapple:`, тож `releaseInvalidGrapples` не чіпає). `runEscape`: якщо в ефекту `escapeDc` → `rollCheck` (Атлетика/Акробатика, краща) проти `escapeDc`, інакше як було.
- `DotSchema` += `linkedToCondition?: true` → `ActiveEffect.linkedTo = <id ефекту стану цього касту на цій цілі>`. `removeEffects` (`conditions/query.ts`) каскадно знімає ефекти з `linkedTo` ∈ знятих id (один прохід, без рекурсії).
- `SpellResolutionSchema.save` += `orAbility?: AbilityKey` → ціль кидає з кращим бонусом із двох (один d20, той самий ключ crit-тригера). Монстр: рішення «краще» — за бонусом.
- Crustacean Form стає native тут: `modifyStat armor atLeast 20` (P1) + `flag sense blindsight 30` + `grantCast` бонусною (кіготь 1d10, T3.1) + `damageThreshold 15`.
- **Розпізнавачі**: «damage threshold of N» → прапорець; «is {@condition grappled} (escape DC equals your spell save DC)» + «takes XdY necrotic … at the start of each of its turns» → `applyCondition grappled escapeDc` + `dot linkedToCondition`; «a Strength or Dexterity saving throw» → `save {ability:"str", orAbility:"dex"}`; «your Armor Class becomes at least N» більше не `BUFF_OR_TRANSFORM`, якщо решта тексту розпізнана.
- **Тести**: поріг 15: 14 → 0, 15 → 15, опір застосовується до порогу; «Вирватися» проти СК заклинання знімає `grappled` і DoT одним `removeEffects`; кастер відійшов — схоплення лишається; `orAbility` бере кращий бонус; HOMM-шкода без порогу — без змін.

### T3.4: автоматична реакція (Rageful Nimbus) + решта розпізнавачів P3
- `InlineCast.auto: { on: "attackAgainstMarked" }` з `cost: "reaction"` і `anchorMarkId`. Новий `lib/utils/battle/spell/auto-reaction.ts`: `runAutoReactions(flow, { attackerId, targetId })` — для носіїв живих auto-грантів, чия мітка (`mark` з `markId = anchorMarkId`, джерело — носій) стоїть на `targetId`: носій `canReact` (`actions/reaction.ts`), нападник ворожий носію і в межах `inline.targeting.range` **від цілі з міткою** (`footprintDistance`) → `castSpell` з inline-визначенням на `[attackerId]`, кидки атаки й кубиків — `flow.ctx.rng` (ключ crit `nimbus:<holder>:<attacker>:<n>`), `hasUsedReaction = true`, рядок у лозі. Шкода — звичайний шлях касту (вже з `applyFlowDamage`).
- Виклик: після завершення атаки в пайплайні атаки (поруч із відсіччю/`consumeAttackEffects`) і після атаки заклинанням по цілі з міткою. Глибина 1: реакційний каст не запускає `runAutoReactions`. У `advanceTurn` (берсерк) — теж викликається, крит там випадковий (відоме обмеження battle.md).
- **Розпізнавачі** (решта P3): «when a creature (?:within N feet of the target )?makes an attack (?:roll )?against the target, you can use your reaction to … XdY lightning» → `mark` + `grantCast {cost:"reaction", auto, anchorMarkId}`; оновити `universal.synthetic.json` позитивними/негативними рядками для всіх шаблонів P3.
- **Тести**: реакція лише на нападника ≤ 60 фт від мітки; не спрацьовує без реакції носія або після її витрати; не спрацьовує на союзника-нападника; той самий seed → ті самі кубики (реплей crit-choice); немає рекурсії.

### Приймання P3
- Покриття **44/50**. Регрес + `lib/utils/battle/attack/**/__tests__`, `actions/__tests__` (grapple/escape), `concentration/__tests__`; `pnpm battle-sweep` на `prodcopy` (HOMM-регрес атак і реакцій).
- Документи: `battle.md` (гранти-підкасти, `hitRider`, auto-реакції, поріг шкоди, схоплення заклинанням, `orAbility`), `abilities.md` (`damageThreshold`, `linkedToCondition`, `escapeDc`), STATUS, whats-new «тимчасові дії від заклинань».
- **Живий прогін**: Sprout Foliage → нова плитка «постріл» на годину, не витрачає слот, зникає після втрати концентрації; Vegetable Blade — союзник атакує 1d12 з модом власника; Crustacean Form — КЗ ≥ 20, удар 14 → 0, бонусний кіготь; Mushroom Ballista — три влучання з +1d6 і рятівним; Wind Sprint — переміщення до цілі без атак при відході, +2d6 лише до кінця ходу; Monkey's Grasp — схоплення, DoT на початку ходу, «Вирватися» знімає обидва; Rageful Nimbus — ворог атакує ціль з міткою → автоматична блискавка в лозі, реакція кастера витрачена. Перевірити crit-choice ДМ на реакції (налаштування `critChoiceByDm` увімкнено).

## Фаза P4 — зони, аури, місцевість, відкладений удар (→ 48/50)

Заклинання: Butterfly Storm, Sand Structure, Festival King, Origami Bird Swarm (+ rider-апгрейд Pillar of Force: лінія складної місцевості). Найбільший ризик фази — шлях руху й розмір дельти.

### T4.1: складна місцевість і «заслонено»
- `TerrainCell` += `difficult?: true; obscured?: true; zoneId?: string`; `TerrainKind` += `"difficult"` (лише пензель ДМ). Схема мапи `lib/schemas/battles.ts` += ці поля **і** `damage.concentrationOf`/`casterId` (щоб збереження мапи ДМ їх не обрізало). `terrainId` (групування `TerrainDiff`) враховує нові поля.
- `grid/path.ts` `searchPaths`: зважений пошук (вартість входу в клітинку з `difficult` = 2, інакше 1; черга з кошиками 0..budget, без зовнішніх залежностей). Публічний API (`reachable`, `pathFrom`, `pathTo` у `actions/movement.ts`, `moveBudget`, `hazardOnMove`) не змінюється; перевірити, що всі використовують один граф (у т. ч. мапа-режими через `lineBlocked` не чіпаються).
- `obscured`: у `rollModeReasons` (`attack/bonus.ts`) — нападник або ціль у такій клітинці → «не бачить ціль» (перешкода) / «ціль не бачить нападника» (перевага), взаємно гасяться як у 5e; сліпочуття/істинний зір у межах дальності знімають (наявна логіка `sense`). Через `collectModifiers`-подібний хелпер, не прямі читання в атаці.
- Рендер мапи: штрихування для `difficult`, туман для `obscured` (компонент шару місцевості в `components/battle/map`).
- **Тести**: вартість ×2 однакова в `reachable` і `pathTo` (той самий кінцевий набір клітинок); діагональ/межі; HOMM-мапа без `difficult` — ідентичні результати на наявних фікстурах шляхів; `obscured` дає перешкоду/перевагу, сліпочуття знімає; збереження мапи ДМ не губить `concentrationOf`.

### T4.2: тригери зон і `createTerrain`
- `SpellZoneSchema` += `terrain?: ("difficult"|"obscured")[]` (1..2), `side?: "enemies"|"all"`, `onEnter?`, `onTurnStart?`, `onExit?`: `ZoneTrigger = { save?: { ability }, effects: NonRandomEffect[] (≤4), pull?: "centre" }`.
- Рантайм: `map.spellZones?: Record<zoneId, SpellZoneRuntime>` (`{ casterId, spellId, castId, dc, side, centre, triggers, untilRound, concentrationOf? }`), клітинки мають `zoneId`. Пише `spellZoneHazard` (перейменувати не треба; додати параметри). Прибирання осиротілих зон — у `pruneExpiredTerrain`. **Дельта**: знайти, як зміни мапи йдуть у `ClientBattleDelta` (`TerrainDiff`), і передавати `spellZones` цілим записом (малий); перевірити поріг 9 500 байт тестом на зоні 49 клітинок.
- Виконання: `lib/utils/battle/spell/zone-triggers.ts`: `zoneEntered/zoneExited(map, before, after, path)` — у `move-mutation` (поруч із `hazardOnMove`; вихід = клітинка шляху поза зоною після клітинки в зоні) і `turn-start.ts` (`onTurnStart`, після небезпеки). Захист від повтору: `battleData.zoneHits?: Record<zoneId, round>` (раз на зону за раунд, як `hazardHitRound`). Рятівний — `rollSave` проти `zone.dc` з rng мутації/ходу (crit-choice тут не пропонується — як небезпеки; задокументувати). Ефекти — `applyEffect` із синтетичним вмінням `spell:<spellId>` (шкода в `registry/effects/hp.ts` уже викликає `applyDamageConsequences`). `pull:"centre"` — провал → мувер зупиняється на найближчій вільній клітинці до `centre` у зоні, решта руху втрачається. Концентрація: `isZoneConcentrationLive`.
- Спел-only `{ kind: "createTerrain", terrain: "wall"|"difficult", shape: "cell"|"line", cells: 1..20, rounds }` → клітинки з шаблону касту (`targetCell`/лінія від кастера) → `applyTerrain` з `untilRound`, `concentrationOf`; клітинки з учасниками для `wall` пропускаються. `isExpired`: `wall` з `untilRound` теж згасає (стіни ДМ без строку — постійні, як були).
- **Розпізнавачі**: «the area is difficult terrain» / «heavily obscured» у зоні → `terrain`; «when a creature (?:leaves|tries to leave) … Strength saving throw … pulled» → `onExit`; «a wall/structure … one 5-foot cube … for N minutes» → `createTerrain wall`; Pillar of Force «line … difficult terrain» → `createTerrain difficult line` (rider «складна місцевість» знімається).
- **Тести**: зона з `onExit` — провал тягне до центру, успіх — вихід; вхід двічі за раунд — один тригер; `createTerrain wall` блокує рух і лінію вогню (`grid/line-of-fire.ts`) до `untilRound`, потім зникає; зона гасне з концентрацією (ліниво); дельта < 9 500 байт для зони r=20 фт.

### T4.3: аура на учаснику (Festival King)
- Спел-only `{ kind: "anchoredZone", radiusFeet: 5..60, side: "enemies"|"allies"|"all", excludeBearer?: true, onEnter?: ZoneTrigger, onTurnStart?: ZoneTrigger, endsWhenStartOutside?: true, duration }` → `ActiveEffect.anchoredZone { …, castId, casterId, dc }` на носії (ціль заклинання).
- Тригери в `zone-triggers.ts`: `move-mutation` — після руху будь-кого порівняти «в радіусі до/після» для пар (носій, інші) — і коли рухається носій, і коли рухається інший; `turn-start.ts` — `onTurnStart` для того, хто починає хід у радіусі. Повтор: `zoneHits` з ключем `anchor:<effectId>`.
- Накладені тригером ефекти отримують `linkedTo = <id anchoredZone-ефекту>` → зникають разом з аурою (каскад `removeEffects` з T3.3); `endsWhenStartOutside` — у `turn-start.ts` цілі: поза радіусом → `removeEffects` цих ефектів.
- Розпізнавач: «each creature … within N feet of the target … Charisma saving throw … can't take actions or bonus actions … ends if it starts its turn outside» → `anchoredZone` з `applyCondition skip_action` + `no_bonus_action`.
- **Тести**: вхід → рятівний раз за хід; стан знімається на початку ходу поза аурою; носій рухається до ворога → тригер ворогу; аура гасне з концентрацією разом з накладеними станами; HOMM-аури (`syncMapAuras`) не змінюються.

### T4.4: відкладений удар + Origami Bird Swarm + battle-sweep
- `dealDamage.delayIfBeyond?: { feet: 5..120; perRoundFeet: 5..120 }` (спел-контекст). У `dealSpellDamage`: відстань > `feet` → замість шкоди `battleData.pendingHits[]` **на кастері**: `{ id, targetId, atRound: round + ⌈d/perRoundFeet⌉ − 1, amount (уже кинуте й помножене на outcome), damageType, spellId, castId }`; лог «удар прибуде в раунді N». Поєднується з `byDistance` (T1.4).
- `turn-start.ts` кастера: для `atRound ≤ currentRound` — ціль жива й у бою → `applyResistance` → `applyRawDamage` → `applyDamageConsequences` **одразу**; запис прибирається. rng не потрібен (число вже кинуте) → rollback/replay детерміновані. Кастер загинув — удари однаково прибувають (зафіксувати в battle.md).
- Розпізнавач Origami: діапазони відстаней + «if the target is more than 30 feet away … arrive at the start of your next turn for every 30 feet» → `byDistance` + `delayIfBeyond`; rider «рій можна атакувати».
- `scripts/sim/battle-sweep.ts`: додати синтетичні заклинання P1–P4 (без тексту Obojima) у набір касту.
- **Тести**: удар у правильному раунді й лише раз; rollback до касту і повтор з тим самим seed → той самий результат; ціль мертва/втекла — запис прибирається без шкоди; ≤ 30 фт — миттєво.

### Приймання P4
- Покриття **48/50**. Регрес: повний `pnpm test:run`; `lib/utils/battle/grid/__tests__` (шляхи, небезпеки), `actions/__tests__` (атаки при відході з новою вартістю); `pnpm battle-sweep` на `prodcopy` — 0 нових помилок; тест розміру дельти.
- Документи: `battle.md` (складна місцевість, `obscured`, `spellZones`, тригери зон, аура на учаснику, `pendingHits`), `map-modes.md` (core-місцевість, режими не чіпаються), `abilities.md` (спел-only ефекти), STATUS, whats-new «складна місцевість і зони заклинань».
- **Живий прогін**: Butterfly Storm — підсвітка мапи: складна місцевість подвоює вартість (бюджет руху в UI збігається з сервером), заслонення змінює перевагу, вихід з провалом тягне назад; Sand Structure — стіна блокує рух і прикриття, зникає через 10 раундів; Festival King — ворог входить в ауру, рятівний, втрачає дії; Origami на 20 і 70 фт (миттєво / через раунд на початку ходу кастера); ДМ малює складну місцевість пензлем і зберігає мапу — зони кастера не губляться. Мобільна ширина: штрихування/туман читаються.

## Фаза P5 — inline-виклик і перетворення (→ 50/50)

Заклинання: Forest Guard, Beast Transmutation.

### T5.1: inline-виклик
- Спел-only `{ kind: "summonInline", name: string(≤60), size: SIZE, ac: number(1..30)|"spellDc", hp: number(1..500)|null, speed: 0, attacks?: InlineAttack[] (≤2), count: 1..4, duration }`. `SummonRequest` += `inline?: InlineUnit; atCell?: GridPoint; expiresRound?; concentrationOf?`.
- `applyAbilitySummons`: `inline` → in-memory рядок юніта → `createBattleParticipantFromUnit` (без БД; id `inline:<castId>:<n>`), `summonedBy`, кінець ініціативи, розміщення біля `targetCell` (`grid/placement.ts`). `hp: null` → `battleData.object = true`: `isAttackable`/`isTargetable` false, не рахується в перевірці перемоги/поразки сторони, не дає XP (`unitXp` null), не кидає кидків смерті.
- Згасання: крок пайплайну після мутації (поруч із `releaseInvalidGrapples`) `dismissExpiredSummons(ps, round)` — `expiresRound`/мертва концентрація → `status: dead` + `battleData.dismissed = true`, знято з мапи; дельта — `patched` статус (клієнт не показує «загинув», а «зник»).
- Forest Guard: кущ = `summonInline` (`hp:null`, `speed:0`) + `anchoredZone` на кущі (T4.3, вороги ≤ 10 фт, `onEnter`/`onTurnStart` → рятівний/шкода за текстом) + `grantCast` кастеру (бонусна атака, T3.1). Ефект, що вимагає носія-кущ: `target: "summoned"` — нове значення лише в спел-контексті (застосувати до щойно викликаних цього касту); rider «кілька кущів сумують кубики».
- **Тести**: кущ з'являється біля точки, не рухається, не є ціллю атаки/заклинання, аура б'є ворогів при вході; бій закінчується, коли інша сторона мертва, попри живий кущ; зникає з тривалістю і з втратою концентрації; дельта — `upserted` при появі, `patched` при зникненні.

### T5.2: перетворення
- Спел-only `{ kind: "transform", unitId: string, revertAtZero: true, duration }` (у визначенні після імпорту — id юніта кампанії). Застосування асинхронне (потрібен рядок юніта) — як виклики: `SpellCastState.transforms` → у `spell-mutation` після `castSpell` `applyTransforms(order, requests, deps.loadPool)`.
- `battleData.transform = { unitId, saved: { combatStats, physicalAbilities (str/dex/con), attacks, abilities.size, movement }, expiresRound?, concentrationOf? }`; форма: HP/КЗ/фізичні характеристики/атаки/швидкість з юніта, ментальні — свої; маркер-ефект `transform:<castId>`.
- Відкат на 0 HP: у **початку** `applyDamageConsequences` — `after.currentHp ≤ 0 && transform` → відновити збережене, надлишок `amount − before.currentHp` відняти від справжнього HP, далі наслідки для справжньої форми (кидки смерті, концентрація). Так відкат працює для всіх примітивів шкоди.
- Відкат за часом/концентрацією: крок пайплайну `revertExpiredTransforms` (поруч із `dismissExpiredSummons`); снапшот через `saveBattle`.
- Імпорт: `{@creature X}` → залежність через `COMPENDIUM_REF_KINDS.monster` → `units` (кампанія → SRD-шаблон, той самий авто-зв'язувач refs); нерозв'язано → issue `MANUAL_SPELL_TRANSFORM_REF`, заклинання manual (чесно). `targetFilter beast` (P1).
- **Тести**: transform на commoner: HP/КЗ форми, ментальні свої; шкода 15 при 4 HP форми → відкат і −11 справжнім HP, наслідки на справжній формі; закінчення тривалості відновлює все; без юніта → manual з `MANUAL_SPELL_TRANSFORM_REF`.

### T5.3: розпізнавачі P5, повне покриття, фінальні перевірки
- Розпізнавачі Forest Guard («a … bush/plant … in an unoccupied space … AC equal to your spell save DC … can't be targeted») і Beast Transmutation («transform … into a {@creature X}» + «reverts … when it drops to 0 hit points»). `BUFF` блокер більше не спрацьовує, коли розпізнавач `transform` повертає результат.
- `scripts/import/compendium-coverage-report.ts` — розбивка M / M+R / N у підсумку.
- **Тести**: синтетичні позитив/негатив для обох; `real-file.integration.test.ts` (skipIf без файлу) очікує 0 `MANUAL_SPELL_*`.

### Приймання P5
- Покриття **50/50 native**, 0 `MANUAL_SPELL_*`; класи M/M+R/N у звіті (ціль спеки: 34 M/M+R + 16 N). Повний `pnpm test:run`, `pnpm lint`, `tsc`, `pnpm battle-sweep` на `prodcopy`, SRD-снапшот, OpenAPI.
- Документи: `battle.md` (inline-виклик, об'єкти, перетворення), `content-api.md` (залежність `{@creature}` у заклинаннях), STATUS, whats-new «виклик об'єктів і перетворення».
- **Живий прогін**: Forest Guard — кущ на мапі, ворог входить у 10 фт → атака/шкода, бонусна атака кастера, бій закінчується попри кущ; Beast Transmutation на звіра → картка учасника показує форму commoner, нокаут форми → відкат із перенесенням шкоди; закінчення тривалості. Плюс повний регрес-прогін усіх 34 механічних заклинань Obojima у двох боях (ДМ і гравець), десктоп + мобільна ширина.

## Завершення гілки

1. Фінальне Opus-ревю всієї гілки (одне, не по задачах), виправлення Sonnet-виконавцем.
2. `/simplify` на diff гілки (1–2 агенти).
3. Оновити зачеплені `docs/architecture/*.md`, `docs/STATUS.md`; `git mv` спек і план у `docs/archive/superpowers/` у merge-коміті.
4. Merge/push — лише з явного дозволу користувача. Міграцій немає; після деплою — повторний імпорт Obojima в кампанії, де він потрібен (рішення користувача).

## Ризики й відкриті питання

- **R1 — OpenAPI**: 145 573 при порозі 146 000. Навіть зі спел-only `$ref` кожна фаза додає 0,5–3 КБ. Пропозиція: у T1.0 виміряти; якщо не влазить — **одним комітом** підняти поріг до 160 000 у трьох тестах і `content-api.md` з поясненням, або (альтернатива) винести спел-only схеми в окремий компонент без описів. Потрібне підтвердження користувача до P1.
- **R2 — зважений пошук шляху (P4)** змінює ядро руху для всіх режимів. Обов'язково порівняльний тест на наявних фікстурах + battle-sweep; при розбіжностях — лише на мапах із `difficult`.
- **R3 — crit-choice**: нові серверні кидки (byDistance, hitRider, auto-реакції) мають стабільні ключі; тригери зон/аур при русі й на початку ходу ДМ не пропонуються (як небезпеки) — задокументувати.
- **R4 — авто-реакція в чужій мутації** (атака гравця запускає каст ворожого кастера): права доступу не перевіряються (рушій діє сам), але лог має чітко називати джерело.
- **R5 — об'єкти-виклики** (`battleData.object`) зачіпають перевірку перемоги, баланс, XP, ініціативу — потрібен пошук усіх місць, що рахують «живих на стороні».
- **R6 — rules patch `custom`** при повторному імпорті й ручних правках ДМ: злиття за `key`, без затирання.
- **R7 — `diceFromInput` замість `dealDamage.amount.dicePerInput`** (відхилення від спеки, щоб не чіпати `AmountSchema` вмінь) — узгоджено з рішенням «висоту вводить кастер».
- Оцінка: P1 ~2 дні, P2 ~1,5, P3 ~3, P4 ~4, P5 ~3 (≈ 14 днів Sonnet, 17 dispatch-ів + 5 живих прогонів + фінальне ревю). Перед стартом ланцюга нагадати про `/usage`.
