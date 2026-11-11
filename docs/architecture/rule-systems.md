# Рульові системи (homm / dnd5e / wfrp)

Кампанія грає за однією рульовою системою: `rules.system.key` ∈ `homm | dnd5e | wfrp`. Дві реалізації: `d20/` (homm і dnd5e, делегує в наявний код) і `wfrp/` (d100, характеристики). Spec: [2026-11-03-wfrp-5a-design.md](../superpowers/specs/2026-11-03-wfrp-5a-design.md), дослідження: [2026-11-03-wfrp-rule-system.md](../superpowers/research/2026-11-03-wfrp-rule-system.md).

## Реєстр і хуки

`lib/utils/rules/systems/`: `types.ts` (`RuleSystemDefinition`), `registry.ts` (`RULE_SYSTEM_REGISTRY`, `ruleSystemOf(rules)`, `systemKeyOf`), `d20/`, `wfrp/`. UI-двійник — `components/systems/` (`SYSTEM_UI`, `systemUiOf(key)`); хук `useRuleSystem` — `lib/hooks/systems/`.

| Хук | Що робить | Де викликається |
|---|---|---|
| `distance { unit, perCell }` | одиниця й масштаб клітинки (ft/5, yd/2); у 5a лише декларація | UI одиниць, `gameTerms.distanceUnit`; шов у grid-хелперах — 5b |
| `balance { kind }` | `fair` / `none`; wfrp = `fair` (via `combat.hitModel`: offense/defense/winChance/damage/refHit; `loadUnitLibraryStats`/`heroPower` swap d20 to-hit/AC for it, `buildPartyPower(members, model)` carries `hit`/`refHit`) | `useBattleSetup` (ховає перемикач), `balance-post`, `start-battle-handler` |
| `progression.levels` / `maxHp` | level-up/XP-пороги (`levels: false` → rest-блок без `xp.next`/`levelUp`, `level-up` → 409 `SYSTEM_LEVELS_UNSUPPORTED`); формула максимуму HP (wfrp = Wounds); `null` → d20-розрахунок | `characterBaseHp` (`hero-hp.ts`: лист і бій — одне число), `HeroStats`, rest-блок |
| `characteristics { kind, sheetBlock }` | `d20` або `wfrp`; блок листа (характеристики, Wounds, Move, навички, Fate/Fortune) | `build-sheet.ts`, `resources-handler`, `system-fields.ts` (чужі поля відкидаються), `create`/`patch` |
| `sheetTest { accepts, roll }` | тест з листа: d20 `check/save` або d100 `test` | `roll-handler`, `SheetRollDialog` (тіло діалогу — `SystemUi.RollDialogBody`) |
| `rest.kinds` / `rest.onSession` | `kinds: false` ховає UI короткого/довгого відпочинку (кнопки партії, пілюля вікна відпочинку, панелі хіт-кісток і відновлення), сервер і далі приймає kinds; `onSession` — дія ДМ «Нова сесія»: `Fortune = Fate`, відсутній → 409 `REST_KIND_UNSUPPORTED` | `rest-handler`, `PartyRestActions`, `RestBadges`, `ProfileHero` |
| `spells` / `items` | вкладки «Магія» і «Інвентар» у перегляді листа та редакторі ДМ (`?tab=magic` для wfrp → бойова) | `CharacterProfile`, `ProfileEditor` |
| `d20Stats` | d20-рядки: AC/ініціатива/швидкість і мораль у «Бою», бейджі виснаження/натхнення, поля тимчасових HP та виснаження в діалозі ресурсів, перемикач натхнення | `CombatTab`, `RestBadges`, `DmRestActions`, `ResourcesDialog` |
| `combat.dice` / `actionEconomy` | розмір основного кубика (d20 / d100) і прапорці дій (`bonusAction`/`reaction`); d20 = {20, true/true}, wfrp = {100, false/false}; шов для `rollInitiative`, `reactionBlocker`/`canReact`, off-hand (wfrp → основна дія) | `turn/initiative.ts`, `turn/reaction`, `strikeRoll(max)` |
| `combat.resolveAttack` | відкрита перевірка d100 (WS/BS проти захисту, SL, Momentum, дублети, локація за відвернутим кидком); `undefined` у d20 → старий `judgeD20` | `attack/run.ts` (`judgeWfrp`), `server-attack.ts` |
| `combat.mitigateDamage` | зброя + SB + чистий SL − TB − AP (мін. 1), крит від дублетів (`rollCrit`) з `afterHit()`; викликається в `compute.ts` між опором і `totalFinalDamage` | `attack/process/compute.ts` |
| `combat.onZeroHp` | 0 Wounds → непритомність + один крит; після `revertOnZero` у `applyDamageConsequences` і в `settleStatusChange` (ручна зміна ДМ — без крита) | `damage/consequences.ts` |
| `combat.initiative` / `baseStats` | `I` (+d10) замість d20 + Dex (`InitiativeScore {total, roll, die}`), тай-брейк за `abilities.wfrp.ag`; початкові `initiative`/`speed` (Move × 3 ft) | `scoreInitiative`, `from-character`/`from-unit` |
| `combat.hitModel` | `offense/defense/winChance/damage/refHit` для чесного балансу (замість d20 to-hit/AC) | `balance/hit-model.ts`, `heroPower`, `loadUnitLibraryStats` |
| `combat.hitModel.durability?(p)` | множник ефективних HP за AP (зважено за локаціями), TB і Ward; `builtUnitsById` бере `rules` лише для систем із `hitModel` (d20 без змін) | `hitModelHeroStats/UnitStats` |
| `combat.participantFields` | додаткові поля учасника при створенні з персонажа/юніта (`abilities.characteristics`, `abilities.wfrp`: стати, AP = 0); d20 не додає ключів; `refreshFromSource` копіює | `from-character`, `from-unit`, `refresh-from-source` |
| `conditions` | 12 станів wfrp: `catalog`, `apply`/`remove`/`level` (рівень = сума маркерів, обрізання 10), `tick` на початку ходу активного носія, `endTest` (тест зняття), `selfTestMod`/`againstMod` для d100-тестів; `undefined` у d20 → `CONDITION_5E_REGISTRY` без змін | `turn/start` (`applyStartOfTurnDamage`), `resolve-attack`, `crit-effect`, `system-condition`/`condition-test` мутації, `sheet-test` |
| `magic` | `RuleSystemMagic`: `castTest` (d100 проти Int + Language (Magick), SL + канальований SL ≥ CN, броня, Fortune, дублі → miscast), `channel` (банк SL, `battleData.channelledSl`), `miscast` (таблиці minor/major з `rules.tables`), `attribute` (lore → стан), `onDamaged` (втрата канальованого SL); `slots: false`; `undefined` у d20 | `castSpell` (`spell/cast/cast-test.ts`, `finish.ts`), `spell-mutation`, `channel-mutation` (`POST …/channel`), `damage/consequences.ts` |
| `combat.fortune` | Fortune: перекинути d100 (лише атакувальник; захисник — ні) або +1 SL; `percentile.fortune` у деталях дії; `undefined` у d20 | `attack/run.ts`, схема атаки, `useAttackWizard` |
| `cellFeetOf(rules)` | розмір клітинки в футах (`grid/cell-feet.ts`): homm/dnd5e 5, wfrp 6 (2 yd); `CELL_FEET` видалено, `rules` — обов'язковий параметр grid-хелперів (рух, шаблони, досяжність, цілі) | `lib/utils/battle/grid/*` |
| `traits` | `RuleSystemTraits`: `recipes` (рецепти Traits у галереї вмінь), `unitBuild(row, abilities)` (поля учасника й атаки-Traits юніта), `psychology` (Fear/Terror при приєднанні); d20 не має. Прапорець = наявність `traits` | `RecipeGallery`, `create-participant-from-unit`, `runJoinTriggers` |
| `downtime` | `RuleSystemDowntime`: `planPeriod`, `validateEndeavour`, `maxDays`; `undefined` у d20 | `downtime-handler.ts`, операції `downtime.*` (`set`, `period`, `period.undo`) |
| `corruption` | `RuleSystemCorruption`: `planGrant`, `planUndo`, `grantMax`; `undefined` у d20 | `corruption-handler.ts`, операції `corruption.grant`/`corruption.undo` |
| `battle.supported` | wfrp = `true` (5b-1); `false` → старт бою 409 `SYSTEM_BATTLE_UNSUPPORTED` | `start-mutation`, setup UI |
| `unusedMechanics` | механіки, що ховаються на сторінці правил | `RulesForm` |

## Правила

- Ядро не імпортує систему: `lib/utils/rules/systems/wfrp*`, `d20*`, `lib/hooks/systems/wfrp*`, `components/systems/wfrp*` заборонені ESLint поза `lib/utils/rules/systems/**`, `lib/hooks/systems/**`, `components/systems/**`. Решта коду бере систему через `ruleSystemOf`/`systemUiOf`.
- `system` не механіка: `MechanicKey` без неї, sync шаблон→кампанія й вкладки правил її не бачать.
- Блокування: `updateCampaignRules` рахує `characters` + `units`; якщо >0 і патч змінює `system.key` → 409 `SYSTEM_LOCKED`. `rules.get` повертає `systemLocked`.
- Відсутня секція `system` у збережених правилах: `parseRules` виводить `dnd5e` (якщо `classes.enabled`) або `homm`; бекфіла БД нема.
- Прапорець `classes` реєстру (d20 `true`, wfrp `false`): форма/редагування ховають клас і підклас (`CharacterBasicInfo.hideClass`, `useCharacterForm.requireClass`), лист/ДМ-картка/дашборд гравця не друкують клас; сервер (`normalizeCharacterInput`) вимагає клас лише в системах з `classes` (`HERO_CLASS_REQUIRED`), у wfrp пише `class: ""` і відкидає надісланий клас/підклас. Зведена перевірка «клас або `classes`» перенесена зі Zod-схем у `normalizeCharacterInput`.
- Пресети: `SRD_RULES` = `dnd5e`; `WFRP_RULES` (`wfrp/rules-preset.ts`) вимикає класи, рятунки від смерті, концентрацію, мораль, стани й дії; шаблон «Grim d100 (empty)» (`templateKey: grim-d100-empty`).

## Що де лежить (wfrp)

| Шлях | Зміст |
|---|---|
| `wfrp/percentile/` | `roll` (d100, інверсія, дублети), `difficulty` (`DIFFICULTY_KEYS`, модифікатори), `resolve` (SL, критичний успіх/невдача) |
| `wfrp/characteristics/` | `schema` (`CharacteristicsSchema`, 10 характеристик, `fate`, `advances`, навички), `derive` (Wounds, Move), `sheet-block` |
| `wfrp/skills/` | каталог навичок і спеціалізацій (`catalog.ts`) |
| `wfrp/conditions/` | `catalog.ts` (числа станів), `apply.ts`, `levels.ts`, `tick.ts`, `end-test.ts`, `test-mod.ts`, `index.ts` (`WFRP_CONDITIONS`) |
| `wfrp/magic/` | `cast-test.ts`, `channel.ts`, `miscast.ts`, `attribute.ts` (lore attribute), `armour.ts` (штраф броні), `constants.ts` (`CAST_SKILL`, `OVERCAST_SL_STEP`, `CHANNEL_MAX_SL`), `index.ts` (`WFRP_MAGIC`) |
| `wfrp/tables/` | `roll-table.ts` — спільний `rollTable`; `defaults.ts` (`DEFAULT_TABLES`), `resolve.ts` (`resolveTable`, `rollSlot`) — таблиці критів/miscast/wrath з `rules.tables` ([«Межі 5h-2»](#межі-5h-2)) |
| `wfrp/traits/` | `constants.ts` (числа-заглушки Traits), `read.ts` (`traitEntries`/`traitEffects`/`sizeStep`), `recipes.ts` (14 рецептів), `unit-build.ts` (`wfrpUnitBuild`), `size.ts` (`sizeHitMod`, `sizeDamageBonus`, `wardRoll`), `psychology.ts` (`wfrpPsychology`), `index.ts` (`WFRP_TRAITS`) |
| `wfrp/downtime/` | `constants.ts` (числа), `status.ts` (дохід за статусом), `heal.ts`, `ailments.ts` (festering/disease/injury), `endeavours.ts` (earn/train/tend/rest/custom), `event.ts` (`downtimeEvent`), `plan-period.ts`, `read.ts`, `index.ts` — [«Межі 5h-4»](#межі-5h-4) |
| `wfrp/corruption/` | `constants.ts` (числа), `plan-grant.ts`, `undo.ts`, `modifiers.ts`/`fold.ts` (ефекти мутацій), `threshold.ts`, `read.ts`, `types.ts` — [«Межі 5h-3»](#межі-5h-3) |
| `wfrp/sheet-test.ts`, `session.ts` | `sheetTest.roll` і `rest.onSession` |
| `components/systems/wfrp/` | `HeroStats`, `StatsTab`, `StatsFields`, `UnitStatsFields`, `RollDialogBody`, редактори характеристик і навичок |

Тексти: `gameTerms.ruleSystem|characteristics|wfrpSkills|wfrpSpecs|difficulty|testOutcome|distanceUnit`, `rules.system.*`, `rest.log.test|session`, `rest.party.session`; динамічні ключі покриває `lib/i18n/__tests__/label-keys-rule-systems.test.ts`. Дані: JSON `characteristics` у `characters` і `units` (6 колонок d20 лишаються; для d20 сервер не пише `characteristics` ні персонажів, ні юнітів, а `rowHash` синку шаблонів трактує порожнє/дефолтне `units.characteristics` як відсутнє), Wounds = `resources.hp`, `resources.fortune`.

## Як додати систему або хук

- Нова система: ключ у `RULE_SYSTEM_KEYS` (`lib/constants/rules.ts`), тека `lib/utils/rules/systems/<key>/` з `RuleSystemDefinition`, рядок у `RULE_SYSTEM_REGISTRY`, UI у `components/systems/<key>/` + рядок у `SYSTEM_UI`, пресет правил, терміни в `gameTerms`, запис у `whats-new` і help.
- Новий хук: поле в `RuleSystemDefinition`, реалізація в обох `d20/` і `wfrp/` (d20 — нейтральна/делегуюча), виклик лише через `ruleSystemOf`; додати рядок у таблицю вище.
- Нові ключі з динамічною назвою — у `label-keys-rule-systems.test.ts`.

## Межі 5b-2

Бій wfrp працює на рівні рушія (UI — див. «Межі 5b-3»). Свідомі межі:

- Momentum — жетон сцени `{ ally?, enemy? }`, який ядро бачить лише як непрозорий слот `sceneState` (`battle_scenes.system_state`, у знімку, дельті як `scene.system` і rollback; `lib/utils/battle/scene-state.ts`: `sceneStatePatch`, `applyScenePatch`; кодек `SCENE_SLOT` і `settle`/`heldBy` — `systems/wfrp/rules/combat/momentum.ts`): `resolveAttack` отримує `sceneState`, повертає `scene` і рядок здобутого Momentum у `lines`; клієнт питає `combat.sceneHeldBy`. Спільний для гравецьких і серверних атак (фаза атаки, помста, нагода, рух, легендарні дії, підготовлена атака); `spell/cast` і `berserk` його не чіпають (стан сцени лишається `undefined`). У d20 `scene.system` ніколи не з'являється в дельті; порожній стан wfrp зберігається як слот `{}`, а не як відсутній. У wfrp немає реакцій, тож нагода/підготовлена атака за реальних правил недосяжні; крит-вибір ДМ (`pendingCritChoice`) атаками wfrp не запускається. Дальній бій Momentum не використовує.
- Броня й щит: див. «Межі 5f» (AP із екіпірування).
- Крит-маркери (bleeding, stunned, …) були інертними мітками: закрито в 5c-1 для bleeding/stunned/unconscious/prone (див. «Межі 5c-1»); head.5 «unconscious» тепер дає стан.
- d100 не пишеться в `diceRolls` (`DieSides` не має 100); значення лежить в `actionDetails.percentile`. Схема атаки приймає `d20Roll`/`attackRoll`/`attackRolls` до 100, а верхню межу задає `combat.dice` (закрито в 5b-3).
- Дальня атака без смуг дальності (складність challenging, ціль захисту 0).
- Еталони балансу (`refHit`) припущені, не звірені з книгою.
- `berserk` (turn/berserk.ts) кидає основний кубик системи (`combat.dice`, серверний кидок); у wfrp немає вмінь, тож недосяжний.
- Off-hand у wfrp списує основну дію; бонусної дії й реакції немає.
- Небойові джерела шкоди на 0 Wounds дають крит у «body»; опір у wfrp = лише імунітет; stat-модифікатор d20 у шкоді ігнорується.
- Підписи відстані: літерал «фт/ft» лишився лише в `battleLog.spellFx.{anchoredAura,delayed,distanceDice}` (магія/ауры, недосяжні при `spells: false`); гард — `lib/i18n/__tests__/battle-log-distance-unit.test.ts`. Описи 5e-дій і станів (`battle.json` «shove», `battleCommon` conditions) недосяжні в wfrp (`actions`/`conditions` вимкнені). Нова wfrp-досяжна відстань у тексті — через `{unit}` із `ruleSystemOf(rules).distance.unit`.
- `rules` стало обов'язковим на шляхах, досяжних у wfrp (фаза атаки, flow, ефекти, зони, маневри). Необов'язковий `rules?` лишається в `roll-check`, `saves`, `conditions`, кидках смерті й `balance-*` — вони d20-лише за задумом.

## Межі 5d-1

Рушій магії на `feat/wfrp` (без міграції; UI — 5d-2, namespace `wfrpMagic`). Свідомі межі:

- Заклинання wfrp береться лише з `casting.magic` (`cn`, `kind`, `overcast`, `attribute`) і резолюцією `auto`; save-заклинання, заклинання без magic-даних і `cost: "long"` дають 422 `BATTLE_SPELL_SYSTEM_MISMATCH`. Вільний каст ДМ, легендарні дії й гранти — без тесту й без слота.
- Каст-тест: слот не витрачається (`slots: false`); channelled SL списується при будь-якому результаті спроби; Fortune для касту — перекид або +1 SL, для channelling Fortune немає.
- Overcast (кроки `OVERCAST_SL_STEP` за перевищення CN, див. «Межі 5d-3»): `diceRolls` клієнта не розширюються, додаткові кубики кидає сервер. Каст без `castRoll`/`serverRoll` сервер кидає сам (не відхиляє).
- `channel`: основна дія; не свій хід, використана дія або d20-кампанія (`BATTLE_CHANNEL_UNSUPPORTED`, 422) відхиляються; кидок 100 дає minor miscast; будь-яка шкода кастеру скидає channelled SL (`onDamaged`).
- Числа (`MISCAST_TABLE`, CN, кроки SL: `OVERCAST_SL_STEP`, `ARMOUR_SL_PER_AP`, `CHANNEL_MAX_SL`, правила miscast на дублях) не звірені з книгою (немає джерела).
- Штраф броні касту береться з AP броні екіпірування без щита (5f: `armourAp().armourOnly`, у учасника `abilities.wfrp.castAp`, лише коли відрізняється від `max(head, body)` загального AP).
- Long cast заборонений; overcast лише апкаст (дальність, площа, тривалість — ні).
- Шкода заклинань іде наявним ефект-рушієм без SL касту, TB й AP.
- Таланти, редагований контент `tables`, Sin/молитви (5d-3) — поза межами.
- **Обов'язкова перевірка перед деплоєм епіку wfrp:** `battle-sweep` homm/dnd5e на prodcopy (5d змінює `castSpell` і consequences, спільні з d20). Ще не запускався.

## Межі 5d-2

UI магії на `feat/wfrp` (без міграції; namespace `wfrpMagic`, вкладка «Магія» на аркуші, каст-діалог і плитка «Скерування» у бою, поля магії в редакторі заклинань). Свідомі межі:

- `wfrpMagic` підвантажується лише для wfrp-кампаній: `app/campaigns/[id]/layout.tsx` обгортає дерево в `ExtendLocaleScope` з `WFRP_CAMPAIGN_EXTRA` (`lib/i18n/scopes.ts`), для d20-кампаній scope не змінюється.
- Розмір `scope-size` (gzip, ліміт 105 KB): campaign + battle + battleWfrp до 5d-2 — uk 102.8 / en 82.8 KB; після (+ `wfrpMagic`) — uk 103.8 / en 83.6 KB (+1.0 / +0.8 KB). Ліміт не перевищено, відповідь П5 (окремий ліміт) не знадобилась; запас uk ≈ 1.2 KB, тож наступний wfrp-namespace потребує винесення або окремого ліміту.
- Онбординг: запис `2026-11-05-wfrp-magic` у what's new і розділ «Магія» в `dm-rule-systems`.
- Live-run 5d-2 (Task 10.3) виконано; хвости виправлено в 5d-3 (мітки умов у редакторі, слоти в книзі заклинань, підписи Fortune-перекиду).
- **Обов'язкова перевірка перед деплоєм епіку wfrp:** `battle-sweep` homm/dnd5e на prodcopy (виконано 2026-11-05, повторно після виправлення assert лабіринту (221877d27): exit 0, 0 помилок, 9 попереджень; див. `.superpowers/sdd/2026-11-05-wfrp-5d/battle-sweep-report.md`).

## Межі 5d-3

Молитви/Sin, інгредієнти, хвости live-run 5d-2 (на `feat/wfrp`, без міграцій). Свідомі межі:

- Молитви: `kind` = `blessing|miracle`; ціль — навичка Pray (запасна Fel), без channelled SL, штрафу броні й overcast; Blessing має CN 0, Miracle бере `cn` заклинання. Молитви не дають minor/major miscast.
- Sin (0–10): `resources.sin`, редагується ДМ (wfrp), reset і довгий відпочинок його зберігають, у бою копія в `battleData.sin` і назад не пишеться. Wrath: дубль, де `roll % 10 <= Sin` і Sin > 0.
- Таблиця Wrath (`WRATH_TABLE`, 4 рядки) і всі числа молитов/Sin не звірені з книгою (позначено `verify against 5e book`).
- Інгредієнти: опційний прапорець «використати» (`useIngredient`) гасить miscast (`avertMiscast`); інгредієнт витрачається і без miscast, і на фізлі (провалений каст) — свідоме рішення. Юніти/NPC без запасу прапорець ігнорують.
- Існуючі wfrp-кампанії мають увімкнути правило `spellIngredients` вручну в налаштуваннях; пресет `WFRP_RULES` вмикає його лише для нових кампаній.
- Книга заклинань wfrp: лічильники слотів і рядок «Витратить слот» приховано; вкладки кіл (рівнів) лишаються, бо семантика `level` для wfrp-заклинань не визначена.
- Підсумок перед застосуванням не показує SL проти CN: кидок відомий лише після застосування (авто-кидок робить сервер), CN і ціль видно на кроці кидка.
- Ablaze: рівні складаються (`leveled`, максимум `WFRP_CONDITION_MAX_LEVEL`), шкода тіка = d10 + рівень − 1 − TB − AP, мін. `MIN_DAMAGE` (`conditions/tick.ts`); зростання до −4/−6 після кількох кастів відповідає задуму, не баг (числа каталогу не звірено з книгою).
- Розмір `scope-size`: uk ≈ 104 / 105 KB (запас ≈ 1 KB), тож наступний wfrp-namespace потребує винесення або окремого ліміту. Мітки умов для редактора заклинань продубльовано в `wfrpMagic.ui.editor.condition.*`, бо `battleWfrp` не входить у scope `/dm/spells`.
- Overcast: тільки `overcast: "dice"` підвищує рівень каста й додає `upcastDice × кроки` кубиків до сили заклинання (кроки обмежені `MAX_OVERCAST_STEPS`); `"targets"` не підтримано (кидок відомий після вибору цілей), схема його приймає, редактор не пропонує.
- Miscast/wrath ворожого (не союзного/не exact для глядача) заклинача: T1 live-run закрито (fix `redact enemy miscast`). Для не-ДМ сервер прибирає з журналу рядки miscast/wrath і рядки умов із джерелом miscast (`conditions.isMiscastLine`), обнуляє `percentileCast.miscast`, а стани, накладені miscast (`ActiveEffect.concealed`), знімає з учасника у GET/SSR, відповіді мутації та публічній Pusher-дельті (`redactParticipantsForPlayers`/`redactPatchesForPlayers`, `redactDeltaForPlayers`); dm-канал і відповідь ДМ повні. Союзні/власні заклиначі гравця не редагуються. Лишається: `percentileCast.doubles`+fumble виказує miscast непрямо; решта `activeEffects` ворога й `currentHp` досі сирі (див. participant-privacy-scope.md).
- Критичний успіх каст-тесту (дублі на успішному d100) не обходить CN (T3 закрито): каст вдається лише при SL (з банком/Fortune/бронею) ≥ CN; при SL < CN результат «failure» з fizzle, а дублі й надалі дають minor miscast. outcome «critical» лишається позначкою вдалого касту з SL ≥ CN.
- Інгредієнт гасить лише arcane miscast, не wrath.
- ~~M4: miscast на каналізації (кидок 100) не викликає `resolveDowned`/`hpChanges`.~~ (закрито: `channel-mutation` викликає `resolveDowned` для впавшого і дописує `hpChanges` через `appendHpChanges`)
- M5: фізл пропускає after-тригер, але побічні ефекти before-тригера `spellCast` лишаються; legendary/grant довгі касти проходять `beginLongCast` зі слот-перевіркою.
- ~~M6: `rollKeys` у `lib/server/battles/dice.ts` не знає `castRoll`/`fortuneRoll`.~~ (закрито: ключі додано)
- ~~M8: плитка Channel показується всім героям wfrp~~ (закрито: плитка лише для героя з відомими заклинаннями, `MyTurnControls`: `magic && hasMagic`); `battleData.sin` видно в знімку (за специфікацією).
- Решта відомих прогалин: таланти, редагований контент `tables`, дальність/площа/тривалість overcast, long cast, штраф броні.
- **Обов'язково перед деплоєм епіку wfrp:** `battle-sweep` homm/dnd5e на prodcopy (5d змінює `castSpell` і consequences, спільні з d20) — виконано 2026-11-05: перший прогін мав 1 збій лабіринту (застарілий assert, виправлено 221877d27), повторний прогін exit 0, 0 помилок, регресії немає.

## Межі 5f

- Екіпірування: колонка `artifacts.system_stats` (+ `artifacts_base`), валідація лише через `SYSTEM_STATS_SCHEMAS` (d20/homm відхиляють не-null), `null` очищає, пропуск зберігає. Два валідатори (`equipment/guard.ts` для клієнта без zod і zod-схема) звіряє `guard.test`.
- Шкода зброї: плоский бонус `damage.flat` іде в `attack.damageBonus` (кубиків зброї немає, `damageDice: ""`, героїчні кубики рівня для атак із `attack.wfrp` не додаються); крок `weapon` = `damageBonus`, SB додається, якщо `addSb`. Нуль і від'ємне значення допустимі; нульовий `amount` d20-конвеєра більше не обриває `mitigate` (імунітет = `amount 0` лише коли d20-шкоду зменшили до нуля).
- Броня: AP = сума шарів по локаціях (кап 12); щит дає X на голову/руки/тулуб і пропадає лише при дворучній зброї в слоті `weapon` (лук у `range_weapon` щит не знімає). `armourAp` повертає застосований `shield`, лист і бій беруть звідти.
- Боєзапас і перезарядка: `battleData.ammo/reload` — у `ParticipantState` (дельти без перезапису знімка). Перезарядка X зберігається як X+1: кінець ходу, на якому закінчились набої, не рахується. Той самий артефакт у двох слотах дає окремі атаки (другий id = `<artifactId>:<slot>`) з незалежними лічильниками; зброя в слоті `shield` (запасна рука) теж дає атаку, а щит (`gear`) — ні, AP щита не змінюється. Лічильники живуть до кінця бою і не пересіваються й не поповнюються після зміни екіпірування посеред бою (свідоме рішення, окремої мутації немає).
- Властивості: `QUALITY_REGISTRY.implemented = false` для Defensive і всіх «лише збережених» (Distract, Entangle, Wrap, Spread, Trap-blade, Unbreakable, Inflict, Repeater). Blast X = `aoe`: на карті гравець обирає одну ціль, а `resolveAttackTargets` додає ворогів у колі радіусом X клітинок навколо неї (`templateArea`, `exact`-коло, масштаб клітинки wfrp; радіус `verify against 5e book`), додаткові цілі кидає сервер; без карти лишається заглушка `4·X` цілей вручну. Penetrating ігнорує `floor(AP/2)` (не звірено з книгою).
- Гроші: таблиця валюти системи (`currencyValueOf`, wfrp 1 зк = 20 шл = 240 п) проходить через оплату інгредієнтів (`spendCp`, `planIngredients`, `buildIngredientStock`, `useIngredientPlan`); d20 лишається 100/10/1.
- Тексти: редактор предметів (`wfrpEquipmentEditor`) лише в `WFRP_DM_EXTRA`; `scope-size` міряє справжній скоуп учасника wfrp (uk ≈105.5 KB, ліміт 106) і ДМ (≈108.4 KB, ліміт 109); база лишається 105.
- Хеші шаблону: `contentRowHash` (`lib/utils/content/row-hash.ts`) спільний для `rowHash` синхронізації та `materialize` шарів, тож порожні нові колонки (`systemStats`, `characteristics`, `xpCost/maxRank`) хешуються як відсутні.
- Вага спорядження (`useEncumbrance`) дорадча: предмети рюкзака рахуються по одному (кожен запис = екземпляр), `SpecialItem` з `artifactId` — за вагою артефакту × `quantity`, без `artifactId` важать 0.
- Алайнмент у core-UI (`ProfileHero`, `CharacterBasicInfo` через `hideAlignment`) читає `identity.alignments`: у wfrp не показується й не редагується.
- Відкрито: Defensive не реалізовано (свідомо лишено в межах), Penetrating не звірено з книгою. ~~M4 (зброя в слоті `shield`)~~ і ~~геометрія Blast~~ закрито.

## Межі 5h-1

Traits юнітів (Armour, Ward, Size, Fear/Terror, атаки Bite/Claw/Breath/Weapon, Regenerate) — ефекти `abilities` юніта, без міграцій. Spec/план: `docs/superpowers/plans/2026-11-07-wfrp-5h1-unit-traits.md`.

- Відхилення від spec: (1) id `wfrp.trait.<key>` і `params` не використовуються (`AbilityListEditor` перегенеровує id, `AbilityParamsSchema` strict) — X живе в полях ефекту. (2) Броня `wfrpArmour {head, body, arm, leg}` — ключі `HitLocation` 5f. (3) П'ятий ефект `wfrpAttack` для Bite/Claw/Breath/Weapon (+ `magical`), власних якостей атака-Trait не має. (4) Magical — перемикач у рецептах атак, не окремий рецепт; механіки немає (лише `attack.wfrp.magical`). (5) Імпорт юнітів не несе `abilities` — лише регресійний тест. (6) Ефекти Traits з `condition` читачі ігнорують (лише passive без умови). (7) Size/Ward/Armour/атаки діють на юнітів (включно з расою); на персонажів — лише психологія (носій або джерело Fear через расу).
- Без механіки: Flier, Swarm, Magical, Hardy (лише `note`/`sense`/прапорець). Breath = Blast-коло, не конус. «Бачить істоту» = будь-який `inPlay` ворог, без лінії зору. rng Ward споживається лише з Ward (d20 і юніти без Ward — без зсуву).
- Psychology: сильніше джерело на тестера — Terror над Fear, далі більше значення; один тест на джерело (`battleData.psychologyTested`); носій і `conditionImmunity` fear/all не тестуються; сплячі вороги лабіринту не лякають.
- Тип `Effect` лишається базовим, Trait-ефекти — `AnyEffect`/`TraitEffect` ([abilities.md](abilities.md)).
- `scope-size` після 5h-1: учасник wfrp uk 106.1 KB gzip — `WFRP_MEMBER_LIMIT_KB` 106 → 107; ДМ 109.6 KB — `WFRP_DM_LIMIT_KB` 109 → 110 (запас ≈ 0.4 KB, наступний wfrp-текст потребує нового винесення). Бюджет OpenAPI 180000 → 183000 байт (доку 181370, Traits ≈ +1.4 KB).

## Межі 5h-2

Редаговані таблиці наслідків — секція правил `rules.tables`, без міграцій. Spec/план: `docs/superpowers/{specs,plans}/2026-11-07-wfrp-5h2-tables*`.

- Ключі плоскі (`critHead|critArm|critBody|critLeg|miscastMinor|miscastMajor|wrath`), значення `TableRow[] | null | undefined`; `null`/відсутній = зашитий дефолт (`DEFAULT_TABLES`), `mergeRules` зливає секцію поверхнево, «Скинути» шле `null`. `resolveTable`/`rollSlot` — єдина точка читання.
- Рядок: `max` (1..100, строго зростає, останній 100), `text` ≤ 200 (виводиться звичайним рядком), до 4 ефектів: `damage`, `wounds`, `condition{key,levels}`, `marker{key}`; за слотом — крити `damage|condition|marker`, miscast/wrath `wounds|condition`. Крит несе список `conditions` і `markers`; `timedKey` маркера `wfrp:crit:<id>:<marker>`.
- Невалідна секція в сирих правилах не ламає бій: `parseRules` повертає `{}`.
- Приховування: гравець не отримує `tables` (`stripPlayerHiddenRules` у `readCampaignRules` і prefetch сторінки персонажа); серверний рушій читає `loadRules` без стрипа.
- Редактор `TablesSection` лише для wfrp (DM-пакет `wfrpTables`, `WFRP_DM_LIMIT_KB` 110 → 111); «Налаштувати» копіює переклад дефолтного тексту в `text` (мова того, хто натиснув). Бюджет OpenAPI → 192000 B (доку 190236).
- Поза межами: імпорт/sync/шари — 5g; числа дефолтних таблиць не звірені з книгою; немає відображення помилки по рядку (загальний механізм `RulesForm`).

## Межі 5h-4

Простій між пригодами: «Минув період» (лікування, недуги, заняття, подія з таблиці), вкладка «Простій» на аркуші, відкат останнього періоду. Spec/план: `docs/superpowers/{specs,plans}/2026-11-08-wfrp-5h4-downtime*`.

- Стан живе в `characteristics.downtime` (заняття, недуги, кредит навчання, `lastPeriod` зі знімком для відкату), без міграцій.
- Приватність: гравець бачить власний стан і підсумок періоду; `rules.tables` (включно зі слотом `downtimeEvent`) від гравців прихована, як і раніше.
- Namespace `wfrpDowntime` не входить у layout-scope: вантажиться посторінково через `ExtendLocaleScope` (сторінка персонажа, ДМ-персонажі, ДМ-персонаж, ДМ-правила); окремий рядок `scope-size` з лімітом 2 KB (uk gzip ≈ 1.7 KB), наявні ліміти не чіпали.
- Знижка `train` — поле `discount` запису леджера та `downtime.training`; ціна зі знижкою на «Розвитку» не показується (знижка знімається при покупці), відкат покупки повертає кредит, відкат періоду після цього — 409 `DOWNTIME_STALE`.
- Стан із події поза боєм не зберігається (лише Wounds у ресурсах героя); без `outOfCombat.persistResources` період відхиляється з 409 `OOC_RESOURCES_DISABLED`.
- Леджера постійних травм немає: недуга типу `injury` лише спливає за днями.
- Бюджет OpenAPI → 193000 B (доку 191719, дії `downtime.*`).
- e2e: `lib/server/characters/__tests__/wfrp-downtime-e2e.test.ts`.

## Межі 5h-3

Порча й мутації: нарахування ДМ з тестом Endurance понад поріг, мутації з таблиць `mutationPhysical`/`mutationMental`, блок порчі на вкладці «Бій» аркуша, відкат останнього нарахування. Spec/план: `docs/superpowers/{specs,plans}/2026-11-09-wfrp-5h3-corruption*`.

- Стан живе в `characteristics.corruption`, без міграцій.
- Модифікатори лише через `derive` і `foldCorruption` для учасника (знімок бою має ефективні значення без списку мутацій; `maxWounds` учасника береться з рядка героя).
- Приватність: гравець бачить свої пункти й мутації на аркуші; `list` і учасник бою — без `corruption`; таблиці `mutation*` приховані; журнал `CORRUPTION` — ДМ і власник.
- `Mutation.text` — `LogLine` (відхилення від спеки): переклад мовою глядача.
- Капи: `POINTS_MAX`, `MUTATIONS_MAX` (понад ліміт — `capped`, мутації нема).
- Мінімум 1 для характеристики, Move і Wounds; верхня межа згортання 200. Ефект мутації не буває нульовим (редактор таблиць підставляє ±1).
- Розклад Wounds (`woundsBreakdown`) показує внесок мутацій окремим рядком, коли він ненульовий.
- Юніти порчі не приймають (`UnitCharacteristicsSchema`); недоступно в активному бою.
- Поза межами: автоджерела порчі, зняття порчі, Dissolution, токен, шаблони (5g).
- Namespace `wfrpCorruption` вантажиться посторінково (3 сторінки), рядок `scope-size` 2 KB (uk gzip ≈ 1.2 KB).
- Бюджет OpenAPI 193000 → 195000 B (дії `corruption.*`).
- e2e: `lib/server/characters/__tests__/wfrp-corruption-e2e.test.ts`.

## Межі 5e-1

Таланти й XP-леджер (на `feat/wfrp`, не змерджено; міграція `feats_xp_cost_max_rank`, expand-only). Spec/план — `docs/superpowers/{specs,plans}/2026-11-05-wfrp-5e1*`.

- Хук системи `advancement` (`cost`/`planPurchase`/`planUndo`/`availableXp`/`talentGroups`; `undefined` у homm/dnd5e) і секція `rules.advancement` (таблиці цін характеристик/навичок, `talentCostMultiplier`). Секція поза `MECHANIC_REGISTRY`: `rulesHashes` її не відстежують, доки немає редактора.
- Каталог талантів = `feats` + `xpCost`/`maxRank`; набуті — `characteristics.talents { featId: rank }`, історія — `characteristics.ledger` (≤ 200). Доступний XP похідний: `experience − Σ ledger.cost`.
- Операції `advance` (власник або ДМ) і `advance-undo` (лише ДМ) під `lockCharacters`/`FOR UPDATE`; відкат лише останньої покупки, `LEDGER_STALE`, якщо ДМ змінив значення вручну.
- Приватність: `ledger` бачать власник і ДМ, у `list` для інших він `[]`; гравець не змінює `talents`/`ledger`/`advances`/`skillAdvances` через PATCH (`preserveServerOwned`).
- Ранг таланта = повтор ability-групи `rank` разів (`scale` у DSL для feats недоступний); нестекові таланти мають `maxRank = 1`. Невідомий (видалений) талант у бою пропускається.
- Свідомі межі: кар'єри/знижки — 5e-2, створення персонажа — 5e-3; передумови талантів автоматично лише `maxRank` і баланс; ціни й `xpCost` — заглушки `verify against 5e book`, не звірені з книгою; прямі правки ДМ у `characteristics` не пишуть у леджер.
- Виправлено після фінального рев'ю: леджер не потрапляє до учасників бою (гравці його не бачать); обрізання леджера на 201-му записі не повертає XP (`spentArchived` додається до суми витрат); PATCH `characteristics` під `FOR UPDATE`, а збереження ДМ-редактором з застарілим леджером (довжина, id останнього запису, `spentArchived`) → 409 `characteristicsChanged`; лист/кидки/ресурси бачать здібності талантів.
- Талант `attackBonus` (ability `modifyStat`) = +SL на тест атаки (той самий канал, що Fortune SL і складність), а не зміна цілі d100; `flat` — це кількість SL (`combat/resolve-attack.ts`, `attackKind` враховано).
- Відомі хвости: у DM-редакторі профілю немає вкладки «Розвиток»; `rules.advancement` без редактора й не синхронізується шаблонами (до merge епіку — додати в `MECHANIC_REGISTRY`); `scope-size` uk ≈ 104.5 / 105 KB.

## Межі 5e-2

Кар'єри (на `feat/wfrp`, не змерджено; міграція `20261125000000_careers`, expand-only, з RLS). Spec/план — `docs/superpowers/{specs,plans}/2026-11-05-wfrp-5e2*`.

- Вид контенту `careers` (таблиця `careers`: `name`, `icon`, `class`, `tiers` — рівно 4 рівні з `characteristics`/`skills`/`talents`/`trappings`), стан героя — `characteristics.career { careerId, tier, ticks[] }`. У кар'єрі — пункти поточного й усіх попередніх рівнів (як у WFRP 4e); ціна в кар'єрі = базова + тік (унікальний ключ `kind:key`, відкат останньої покупки прибирає тік); поза кар'єрою — множник `rules.advancement.career.outOfCareerMultiplier`. Перехід на наступний рівень — `career-advance` (поріг `ticksRequired`, ДМ може `force`), тіки скидаються.
- Операції `career-set` і `career-advance` (власник або ДМ) під `lockCharacters`; гравець не підробляє `career` через PATCH (`preserveServerOwned`). Видалення кар'єри, яку тримає герой, — 409 `CAREER_IN_USE`; видалена кар'єра в героя дає базову ціну без тіка.
- **Без шарів шаблонів:** немає `*Base`, `sourceId`, template sync і compendium-import; кар'єри не входять до офіційних шаблонів і «Оновлення з шаблону».
- Імпорт CSV/JSON лише з плоскими полями `tier{1..4}_*` (вкладених `tiers` у JSON немає).
- Маршрути кар'єр відсутні в OpenAPI-документі (REST працює, але не описаний); бюджет розміру OpenAPI піднято до 180 000 (операції характеристик).
- `advancement` у `MECHANIC_REGISTRY` додано; ~~у наявних клонів без `rulesHashes`-бази для цієї секції був конфлікт~~ (закрито: відсутній запис бази = локальне значення не змінювалось, статус `updated`; `classifyRules`).
- Ціни, пороги тіків і множник — заглушки `verify against 5e book`; `uk` scope-size без запасу (105.0 / 105 KB), `wfrpCareers` вантажиться лише ДМ-ам; вкладка леджера read-only; перевірки на 375 px у браузері не було.

### Мінорне після фінального рев'ю 5e-2

- Гонка редактора профілю ДМ з `career-advance` закрита (826668ccc): PATCH приймає `careerBaseline` (кар'єра на момент відкриття форми: `careerId`, `tier`, `ticks`), розбіжність зі збереженою = 409 `CHARACTERISTICS_CHANGED`; гравця не стосується. Після 409 `useCharacterEditor` рефетчить персонажа й заново засіває форму (`seededFor` скидається), текст помилки каже «форму оновлено, збережіть знову».
- `toCareerData` відкидає рівень, що не пройшов валідацію, і наступні рівні зсуваються; недосяжно, бо запис вимагає рівно 4 валідні рівні (важливо лише якщо звузяться `CHARACTERISTIC_KEYS` або regex навичок).
- `wfrpCareers` вантажиться лише для ролі DM: демо-кампанія wfrp (її немає) показала б сирі ключі на `/dm/careers`.
- Кар'єрні операції персонажа відсутні в OpenAPI (як `advance` у 5e-1): вони доступні через асистента/MCP (`PROGRESSION_INPUTS`) і coverage; бюджет OpenAPI 180k — прийняте рішення.
- Кар'єри поза шарами/sync шаблонів — задокументовано вище (5g); `uk` `scope-size` без запасу — текст доданий лише до `wfrpCareers` (DM-extra, поза бюджетом scope).

### Закриті хвости 5e-1

- `rules.advancement` додано в `MECHANIC_REGISTRY` (синхронізація шаблонами) і отримав DM-редактор (`AdvancementEditor` у формі правил).
- DM-вкладка «Розвиток» у профілі героя (`ProfileEditor`, кар'єра/леджер/покупки; леджер лише читається).

## Звірити з книгою (єдиний перелік)

Нічого з цього не змінювати без сторінок книги 5e. Усі місця позначені `verify against 5e book`:

- Бій: `lib/utils/rules/systems/wfrp/combat/constants.ts:1`.
- Стани: `lib/utils/rules/systems/wfrp/conditions/catalog.ts:5`.
- Магія: `magic/constants.ts:3–23`, `magic/miscast-table.ts:9,17`, `WRATH_TABLE`, числа молитов/Sin.
- Екіпірування: `equipment/constants.ts:1`, `qualities.ts:7`, `quality-effects.ts:9` (там само Penetrating), `weapon-profile.ts:8`, `encumbrance.ts:13`.
- Просування: `lib/utils/rules/advancement.ts:17,44,46`, дефолти `rules.advancement.creation` (50/25/0, `freeBudget` 100).
- Blast: радіус X клітинок і цілі на клітинку (`extract-wfrp-attacks.ts:10`, `attack-phase/targets.ts`); на карті Blast б'є всіх у радіусі, союзників теж (рішення користувача 2026-11-07), крім самого атакувальника.
- `attackBonus`: `flat` таланту трактується як кількість SL (`flat: 2` = +2 SL); якщо таланти задають відсотки, потрібен перерахунок `flat / 10`.
- Defensive не реалізовано (`implemented:false`) до тексту книги.
- Бестіарій Grim (5g-2): числа юнітів задані за рівнем загрози (`UNIT_LEVEL_BANDS` у `scripts/grim/units.ts`), не з офіційних стат-блоків; формула Wounds юніта (множники Size ×2/×4/×8, Swarm ×5, Hardy +TB) — власна.
- Traits: `wfrp/traits/constants.ts` (поріг Ward на d10, кроки й множники Size, критерій SL і рівні `broken` Fear/Terror, Breath: радіус/дальність/без SB, Regenerate 1d10, Night Vision 60 ft, перелік атак-Traits і `TRAIT_SIZES`), `BALANCE_REF_INCOMING`; Terror випереджає Fear, далі більше значення, і Terror також записує fear як протестований з тим самим цільовим числом.
- Психологія (5h-1): у рушії лише дві сторони (`ally`/`enemy`), нейтральної немає, тож «нейтральний тестер» неможливий. Не тестується пробудження ворогів лабіринту (`withMazeAwareness` чиста, без rng/правил). Прямий `add-participant` (не резерв) тестується через `runPsychology`.
- Порча (5h-3): `wfrp/corruption/constants.ts` (`GRANT_MAX`, `POINTS_MAX`, `MUTATIONS_MAX`, `PHYSICAL_MAX_ROLL`, тест `endurance`/`challenging`), межі ефектів `lib/constants/wfrp-mutations.ts`, поріг TB + WPB, «рівно на порозі — без тесту», повторний тест при кожному нарахуванні понад поріг, дефолтні таблиці `mutationPhysical`/`mutationMental` (рядки й ефекти).
- Простій (5h-4): усі числа `wfrp/downtime/constants.ts` (`MAX_DAYS`, `REST_HEAL_MULTIPLIER`, `TEND_*`, `FESTERING_*`, `TRAIN_DISCOUNT_*`, складність `ENDEAVOUR_DIFFICULTY`, `EARN_STATUS_DEFAULT`), дефолтна таблиця `downtimeEvent`, формула доходу за статусом (`status.ts`, `STATUS_COIN`), тести endeavours і механіка festering/disease.
- Магія й спорядження Grim (5g-3): CN за kind, ціни/вага/AP предметів, діапазони `WEAPON_GROUP_BANDS`/`ARMOUR_KIND_BANDS`, таблиці мискастів шаблону — власні; Trait `ranged` додає SB (рішення користувача; книга, імовірно, цього не робить) і має дальність за замовчуванням 72 фт (`RANGED_DEFAULT_RANGE_FT`).
- Ефекти Traits приймає лише ресурс `units` (guard у `lib/server/content/resources/units.ts`); раси/персонажі/артефакти в d20-кампаніях їх приймають, але вони інертні (M4).

## Межі 5e-3

Створення персонажа wfrp (на `feat/wfrp`, не змерджено; міграція `20261126000000_race_profiles`, expand-only, з RLS). Spec/план — `docs/superpowers/{specs,plans}/2026-11-06-wfrp-5e3*`.

- ~~Таблиця `race_profiles`~~ deprecated з 5g-0: профіль — колонка `Race.profile`/`RaceBase.profile` (див. «Межі 5g-0»); раніше (`raceId` unique, `campaignId`, `profile` JSON = `SpeciesProfile`: `mods`, `move`, `fate`, `extraWounds`, `talents`, `randomTalentCount`, `randomTalents`, `careerTable`). Профіль живе в окремій таблиці, а не колонкою `Race`. `GET /api/campaigns/:id/race-profiles` (член; невалідні рядки пропускаються), `PUT /api/campaigns/:id/races/:raceId/profile` (DM; перевірка посилань на кар'єри/таланти кампанії через `assertCampaignRefs`).
- `RuleSystemDefinition.creation` (`RuleSystemCreation`): `planDraft(picks, ctx)` — чиста валідація вибору і підрахунок `characteristics` + XP (коди помилок `CAREER_*`, `STATS_*`, `POINTS_*`, `TALENT_*`, `FEAT_UNKNOWN`, `PROFILE_NOT_READY`), `rollCreation(rng, profile)` — кидки кар'єри (2), характеристик (2d10 × N) і талантів, `isUsableProfile`. Код — `lib/utils/rules/systems/wfrp/creation/`.
- Слоти `SystemUi.DraftForm` (майстер `WfrpDraftForm`: вид → кар'єра → характеристики → таланти → особисте) і `SystemUi.RaceProfileEditor` (редактор профілю в `RaceEditForm`; `SpeciesProfileEditor` ліниво, щоб zod не потрапляв у клієнтські entry). Схеми імпортуються з `@/lib/utils/rules/systems/schemas`, не з барелю (zod у графі wfrp ламає `client-imports.test.ts`).
- API чернеток: `POST …/characters/draft` і `PATCH …/characters/[characterId]/draft` для систем із `creation` — див. [characters.md](characters.md).
- `rules.advancement.creation`: `careerBonus { rolled, choice, free }`, `statBonus { rolled, rearranged, free }`, `freeBudget`; дефолти 50/25/0, 50/25/0, 100 — заглушки `// verify against 5e book`. Редагується в `AdvancementSection`.
- Правило «кидок один раз»: кидки кар'єри/характеристик/талантів робляться одноразово, перекиду немає (скидаються лише зміною виду).
- Відхилення від spec: стійкість (resilience) прибрано; профіль у `race_profiles`, а не колонка `Race`; вид зберігається за назвою в `character.race` (у `Character` немає `raceId`); PATCH чернетки wfrp лише для особистих полів.
- ~~M6~~ закрито: `useWfrpDraftForm.submit.issueCodes` читає `ApiError.body.issues` (рядкові коди), майстер показує переклади `wfrpCreation.errors.<код>` через « · », для невідомих кодів або без `issues` — загальний текст помилки.
- ~~Синхронізація шаблонів видаляла талант, використаний у профілі виду~~ закрито: `deleteRemoved` (`apply.ts`) і `applyItem` (`layered-apply.ts`) пропускають видалення feat, на який посилається `race_profiles.profile` (`profile-refs.ts`), і віддають попередження в `warnings`; кар'єри в синхронізації не беруть участі, а видалення кар'єри з посиланням у `careerTable` блокує `CAREER_IN_SPECIES_TABLE`. Шаблонний рядок `deletedInSource` лишається видимим, доки профіль не зміниться. Шлях `layered-apply` тестами на рівні fake не покритий (лише інтеграційний із БД).
- Відкрито: M11 — D&D-алайнменти у wfrp-майстрі (до 5f); в майстрі немає AI-аватара/передісторії; цілі лише `personal`; браузерної перевірки майстра на 375 px не було.

## Межі 5c-1

Стани й Fortune на `feat/wfrp` (без міграції; UI — namespace `battleWfrp`). Свідомі межі:

- 12 станів; числа каталогу (`conditions/catalog.ts`) — припущення до звірки з книгою.
- Стан = `ActiveEffect` `wfrp:cond:<key>`, рівень = сума маркерів `wfrp:<key>`, обрізання `max` 10; зняття -1 іде з найновішого ефекту, ДМ «зняти все» прибирає всі ефекти ключа.
- Тіки лише на активному носії; ~~кровотеча на непритомному — 5c-2~~ (закрито в 5c-2: шанс смерті на пропущеному ході).
- Unconscious має два джерела (Wounds = 0 і стан-ефект); лікування до > 0 Wounds стан-ефект не знімає (ДМ знімає вручну).
- Спроба зняття вільна, одна на стан за хід (`battleData.conditionTests`), подія без `actionDetails.percentile` (кидок у рядку журналу). Повтор, не свій хід або стан без `endTest` → `CONDITION_TEST_UNAVAILABLE`.
- Тест зняття Entangled: ціль = S + власний штраф стану (-10 за рівень), тож S 47 дає 37.
- Тест з листа отримує `selfTestMod`, але `roll-handler` будує учасника з листа, тож у реальному виклику модифікатор `sheet-test` = 0 і стани бою на нього зараз не впливають (~~хвіст для 5c-2~~ закрито: тест з листа бере ефекти зі стану активного бою).
- Панель «Спробувати зняти» для ДМ, що керує поточним учасником, не перевірена вручну: перевіряється в live-run (Task 12).
- Fortune: `percentile.fortune` замість окремого `actionDetails.fortune`; перекидання при влучанні з першого кидка не списується; серверні атаки й ініціатива без Fortune; Fate без механіки.
- Мітки disarmed/winded/crippled — інертні (5c-2); Besmirched, Corruption, психологія, травми — поза межами.
- `battleWfrp` вантажиться лише в бойових лейаутах wfrp-кампаній (`isWfrpCampaign`); `scope-size` (кампанія + бій): uk 102.0 → 102.7 KB gzip, en 82.1 → 82.7 KB, ліміт 105.

## Межі 5c-2

Приватність журналу, непритомність і кровотеча на `feat/wfrp` (без міграції). Свідомі межі:

- Редакція журналу на сервері: `redactLogForPlayers`/`sanitizeLogEntry` (`lib/utils/battle/view/visibility.ts`) для не-DM ховають рівень стану, ціль тесту зняття, `percentile.defender` (завжди) і `targetAC`/`damageBreakdown`/`damageRows` (лише коли ціль «concealed»: не союзник і не exact для глядача), тож `changed` істинний лише за реальної різниці. Рядки ховає `concealLine` системи. Публічний канал `private-battle-<id>` несе відредаговану дельту з `redacted: true`; ДМ додатково підписаний на `private-battle-dm-<id>` (`battleDmChannelName`) з повною дельтою тієї ж версії. Клієнт ДМ ігнорує `redacted`, лише поки dm-канал підписаний (`onSubscribed` робить resync, `onError` дає `unavailable` і polling).
- Переповнення (`PUSHER_DELTA_LIMIT_BYTES`): публічний refetch-сигнал при `changed` позначений `redacted: true`, тож ДМ рефетчить один раз (за своїм dm-сигналом); GET сцени й сторінка журналу віддають гравцю відредагований журнал. Відповідь мутації ДМу повна.
- Учасники йдуть сирими: `initiativeOrder` (`activeEffects`, `currentHp` ворогів) у дельті/GET не редагується. Повна серверна приватність учасників — окремий епік для всіх систем (хвіст нижче).
- Unconscious без тривалості (`UNTIMED_CONDITIONS`): знімають ДМ або лікування. `keepsWhenDown` повертає `true` для всіх ефектів `wfrp:cond:*`, тож `clearFallenEffects` лишає стани на непритомному (DEAD — знімає все, як і раніше), і ДМ бачить бейдж/кнопку «Зняти».
- Кровотеча на непритомному = шанс смерті на пропущеному ході: контракт `conditions.skippedTurn` (`wfrpSkippedTurn`), виклик із `skippedTurnAt` (`turn/skipped-turn.ts`) на ході непритомного. Рядок «хід пропущено» пишеться для не-ворожої сторони або коли є кидок кровотечі (збитий ворог без кровотечі мовчить). `keepDownedAfterVictory: true`: збиті герої лишаються збитими після перемоги з 0 Wounds (не піднімаються до 1).
- Контракт `RuleSystemConditions` доповнено: `keepsWhenDown`, `skippedTurn`, `keepDownedAfterVictory`; d20-системи їх не задають, поведінка не змінена.
- `import/no-cycle` `maxDepth: 6` (цикли attack/damage/ability розірвано в пакеті E).
- Тест з листа бере ефекти зі стану активного бою, тож стани впливають на `selfTestMod`.
- `scope-size` (кампанія + бій, gzip): uk 102.0 KB без `battleWfrp`, 102.8 KB з ним (база 5c-1: 102.7), en 82.1 / 82.8 KB (база 82.7); кампанія окремо uk 81.6 / en 65.5; root 13.6. Ліміт 105.

### Закриті в 5c-3

- M-4 вирішено: шанс смерті від кровотечі на непритомному лише при 0 Wounds (`wfrpSkippedTurn` перевіряє `currentHp > 0` до `rng`, тож при HP > 0 `rng` не споживається).
- Повторне накладання Unconscious (ДМ-діалог, маркер криту) не дублює рядок журналу: `applyWfrpConditionTo` повертає того самого учасника без повідомлень, якщо статус уже не ACTIVE (інакше відновлює UNCONSCIOUS). Нуль HP на вже непритомному не пише другий рядок і не кидає новий крит (`wfrpOnZeroHp`).

## Межі 5c-3

Хвости 5c-2 на `feat/wfrp` (без міграції). Свідомі межі:

- M-4 (5d1d5d120): кровотеча вбиває лише непритомного з `currentHp === 0`; при HP > 0 хід пропускається без кидка.
- Unconscious без дубля (5d1d5d120): повторне накладання нічого не змінює і не пише в журнал. Unconscious від ДМ зберігає `currentHp` за задумом (стан, а не нуль HP).
- Ключі винесено з ядра (b6b0d8e89): контракт `mitigate` несе `label`/`side` у кроках і `totalLabel`, тож `compute.ts` (`mitigateHit`) без wfrp-літералів. Тексти шкоди, критів і непритомності живуть у `battleWfrp.{damage.steps,damage.total,crit,log}` (uk/en); у `battleLog.json` ключів wfrp немає. Гард `no-system-keys` ловить `battleWfrp.` та `wfrpTotal|.wfrp.` у `lib/utils/battle`, плюс перевірка відсутності старих піддерев у `battleLog.json`; `label-keys-battleWfrp` розширено.
- Пропущено за рішенням користувача: хвіст 1, звірка чисел `catalog.ts` і формули Entangled з книгою (у репозиторії немає джерела); `catalog.ts` не змінювався.
- Приватність учасників лишається окремим епіком усіх систем; оцінка обсягу й рекомендація: [participant-privacy-scope.md](participant-privacy-scope.md).
- `scope-size` (кампанія + бій, gzip): uk 101.2 KB без `battleWfrp`, 102.8 KB з ним; en 81.6 / 82.8 KB; кампанія окремо uk 81.6 / en 65.5; root 13.6. Ліміт 105.

### Відкриті хвости після 5c-3

- Числа каталогу станів і формула Entangled не звірені з книгою (немає джерела; пропущено за рішенням користувача, повторно підтверджено 2026-11-05). Пошук у вебі: вільного SRD/вікі для 5e немає, огляди кажуть «стани здебільшого як у 4e» (нове лише Fear і Besmirched). За 4e (не підтверджено для 5e) розходження з каталогом: Bleeding знімає Heal (кожен SL ще одну) і тікає наприкінці раунду; Entangled — опозиційний S проти джерела; Ablaze без вирахування TB/AP і наприкінці раунду. Робити лише за скан/виписку 5e або окреме рішення прийняти 4e.
- Повна серверна приватність учасників (`initiativeOrder`: `activeEffects`/`currentHp` ворогів) — окремий епік усіх систем, див. [participant-privacy-scope.md](participant-privacy-scope.md).
- Dev-індикатор Next «1 Issue» = гідратація `Button`/`DropdownMenuTrigger` у Header (є й на main, не з гілки).
- Не перевірено живу Pusher-дельту гравцю (немає другого акаунта).
- ESLint: ще 16 не-cycle помилок у тестах `lib/server` та `useUnitsList.ts` (давні).
- Живий прогін: Bleeding на непритомному з HP>0 не тікає −1 Wound на пропущеному ході (текст картки каже інакше, можливо задумано — звірити).
- Живий прогін: герої лишаються з 0 Wounds між боями.
- Живий прогін: у DM-панелі немає іконки станів для учасника з 0 HP (стан накладається лише через API).

## Межі 5b-3

UI бою wfrp без d20-артефактів. Свідомі межі:

- Прапорці UI лише через `useBattleRules()` (`lib/hooks/battle`, читає `scene.battle.rules`, без запиту й без `ready`): `d20Stats` ховає AC/бонус атаки, `actionEconomy.bonusAction`/`reaction` — бонусну плитку, off-hand, реакції, `combat.dice` — d100-вигляд. `HpFigure` показує «Wounds cur / max».
- `useRuleSystem` — дискримінований стан: поки правила вантажаться, `ready: false` і `key`/`system` не задані; споживачі не рендерять d20-вигляд. `invalidateCampaignRules` викликається після створення першого юніта/персонажа (оновлює `systemLocked`).
- `RuleSystemCombat.attackTarget` — необов'язковий хук цілі d100 (лише базові WS/BS, без перевищення чисельності й Momentum); UI бере його через реєстр (`percentileTargetOf`), прямий імпорт wfrp заборонений ESLint.
- Кидок d100: пара d10 (десятки 00–90 + одиниці 0–9, «00»+«0» = 100) або запасне поле 1–100 (`composePercentile`; поле веде пару — введене число підсвічує кнопки, очищення скидає пару; `parseDieInput(..., strict)` відкидає «101», а не обрізає до 1); режим «Авто» (`mode.server`) = серверний кидок: payload несе `serverRoll: true` без `attackRoll`/`attackRolls` (схема атаки, `rollStrike`: `serverRoll` дає той самий шлях, що `serverRolls`/`serverRolled`; кидки клієнта тоді ігноруються), ручний режим шле `attackRoll`.
- Окремого кроку шкоди для d100 немає: кидки кубиків зброї беруться зі стану ROLL (`state.diceSlots`; крок кидка показує їх рядком «Шкода зброї: d6 + d6») і йдуть у payload як `damageRolls`; підсумок — `ActionResultCard` (SL, локація, Momentum), не `SummaryStep`; багатоцільова атака: кожен `attackRolls[i]` ≤ 100, `advantage`/`disadvantage` примусово `normal`.
- d100, режим кидка («Авто»/«Вручну») фіксується першим ударом багатоцільової атаки (`lockedRollSource` за станом flow: після першого кинутого удару перемикач прихований), тож змішаного режиму й тихого перекидання ручних кидків сервером немає. Відомі обмеження: кубики шкоди в режимі «server» кидає клієнт (як у d20); пробний прогін пулу шкоди не враховує d20-криті (wfrp їх не має).
- Багатоцільова d100-атака: клієнт шле блок кубиків на кожну ціль, а `runAttackPhase` для систем з `combat.dice !== 20` робить пробний прогін із записом rng і програє запис, лишаючи в пулі блоки лише за влучання (як у d20, де клієнт шле кубики лише влучань).
- Сервер: `validateAttackRequest(scope, data, rules)` кидає `ROLL_OUT_OF_RANGE` (код `invalid_dice`), коли кидок > `combat.dice` (у dnd5e/homm `d20Roll` > 20 — теж 400); другий кидок ігнорується, коли `sides != 20`.
- Приватність: якщо глядач бачить ціль не «exact» (`canSeeExactStats`), `buildAttackResultFx` прибирає `defender` (у публічних даних гравця сервер уже завжди прибирає `percentile.defender`, тож гілка `exact` у клієнті реально працює лише для ДМ/сирого журналу), а `sl` стає `netSl`; `percentile.opposed` (ближній бій) лишається, тож «Momentum gained» видно й без захисника. У журналі `sanitizeLogEntry` для не-DM прибирає `percentile.defender` і замінює рядок `battleLog.percentile.opposed` на `opposedHidden` (без кидка/цілі/SL захисника); рядки «Відповідь цілі» для d100 не містять d20, деталі запису не показують «Attack roll»/«Target AC» для percentile-записів, HP у деталях і підказці воскресіння — «Wounds» за `woundsLabel`; рядок відсічі/нагоди (`buildOffTurnAction`) обирає d100-формулювання за `combat.dice` правил (`rules` — параметр білдера). ДМ-панель масштабування (Підсилити/Послабити) і підпис множника в рядку учасника в wfrp кажуть «Wounds» (`woundsLabel`); `ParticipantRow` бере `view: { exact, acText, wounds, current }` і порівнює його поверхнево (`memo` з компаратором); `DmCharacterCard` не малює Level/HP, поки `useRuleSystem` не `ready`.
- 3D-кубики: пара d10 будується з `actionDetails.percentile` у `from-action.ts` (seed `1_000_003 + actionIndex`), у `diceRolls` не пишеться; `DieSlot.tens` — грань «00…90», `DieSlot.units` — кубик одиниць, його грань 10 читається «0» (d10 моралі лишається «10»).
- Гард літералів відстані: `battle-log-distance-unit.test.ts`.
- Панель героя: плитка «Magic» (`ActionGrid.available.magicTile`) і слоти заклинань ховаються прапорцем `spells` з `useBattleRules()`; `ActionResultCard` обирає d100-вигляд за `combat.dice`.
- Live-run у браузері виконано (d100 пара/запасне поле, багатоцільова, регрес d20); ручна перевірка ролі гравця (не-exact ціль) не робилась — немає другого акаунта.
- Відкрито: ручна перевірка ролі гравця з не-exact ціллю (немає другого акаунта).

## Межі 5a

Є: реєстр, блокування системи, d100-тест, характеристики/навички/Wounds/Fate, тести з листа, «Нова сесія», порожній шаблон Grim d100; d20-вкладки (магія, інвентар), кнопки короткого/довгого відпочинку й d20-рядки листа сховані прапорцями `spells`/`items`/`rest.kinds`/`d20Stats`. Немає: чернеток гравців (`createDraft` у не-d20 системі → 409 `SYSTEM_DRAFTS_UNSUPPORTED`), магії, бестіарію й бібліотек — частини 5b–5h.

## Відкриті хвости 5a (фінальне рев'ю 2026-11-04)

- Складність: `DIFFICULTY_SL` зсуває SL і не змінює ціль кидка (за spec); за правилами d100 складність зсуває саму ціль — рішення користувача.
- Частковий PATCH `characteristics` скидає решту до дефолтів; зниження Fate не обрізає `resources.fortune`.
- `readCharacteristics` (`keys.ts`) дублює межі `CharacteristicsSchema`: винести спільні константи й табличний тест на граничні значення.
- `wfrp/sheet-test.ts` кидає `ContentError` (серверний шар) із чистої утиліти.
- ~~`useRuleSystem` повертає `homm`, поки правила вантажаться; `systemLocked` не інвалідується~~ — закрито в 5b-3.
- ~~`importUnitsIntoCampaign` пише `characteristics` без перевірки системи кампанії~~ — закрито в 5b-1 (приймає `rules`, пише лише для wfrp).
- `list-templates.ts` / `app/campaigns/page.tsx` тягнуть увесь JSON `rules` заради ключа системи (egress).
- `SkillAdvancesEditor`: спеціалізація з пробілом мовчки блокує кнопку.
- `templateKey` = назва шаблону (конвенція store), spec казав `grim-d100-empty`.
- Складність: `DIFFICULTY_SL` зсуває SL, а не ціль — так у WFRP 5e (research §1; у 4e це модифікатор цілі). Значення таблиці звірити з книгою 5e; чи обрізається SL за результатом — теж звірити.

## Межі 5g-0

Інфраструктура шаблону Grim d100 (на `feat/wfrp`, не змерджено; міграція `20261129000000_career_layers_race_profile_column`, expand-only, RLS на `careers_base`). Spec/план — `docs/superpowers/{specs,plans}/2026-11-09-wfrp-5g0*`.

- Профіль виду — `Race.profile`/`RaceBase.profile Json?` (`SpeciesProfile`): клон із шарами не має локальних рядків `races`, тому FK-таблиця `race_profiles` не працювала. `race_profiles` deprecated (бекфіл у міграції, код не читає й не пише, DROP після деплою епіку). Читання — `listRaceProfiles` через шарований читач видів; запис — `saveRaceProfile` через операцію оновлення виду (для базового рядка створює override). Чужий вид тепер 404, не 403.
- `careers` — шарова модель за зразком `feats` (`CareerBase`, `sourceId`/`sourceHash`), у `BUNDLE_TABLES` після `feats` і в `SYNC_TABLE_SCOPES`. `tiers[].talents` при імпорті через `IMPORT_SPECS` зберігаються як id рис.
- Sync: видалення в джерелі feat/кар'єри, на яку посилається профіль виду, tier кар'єри чи герой, пропускається з попередженням (`isFeatReferenced`/`isCareerReferenced`); після sync профіль із зниклим `careerId`/`featId` дає `dangling` і не змінюється.
- Завантажувач: пакет `data/templates/grim-d100/` (див. content-api.md, «Пакети шаблонів») → `validatePack` (generic + `PACK_HOOKS.wfrp` + заборонені терміни Grim) → `ensureTemplate` + `importContent` (feats, careers, races, spells, units, artifacts) → `afterImport` (профілі видів за slug раси й іменами талантів/кар'єр) → publish. Команда `pnpm constructor:grim-template` (= `pnpm template import grim-d100 --publish`) [`--owner`, `--allow-remote`]. Ключ пакета — `grim-d100`, назва — `manifest.names`. `rules.json` — повний `Ruleset` (`mergeRules(WFRP_RULES, патч)`), `WFRP_RULES` лишається кодовим дефолтом системи.
- Завантажувач порядок: feats, careers, races, spells, units, artifacts (посилання `knownSpells` резолвляться з першого запуску); валідатор перевіряє імена в усіх полях-посиланнях. Повторний запуск без змін не змінює `contentVersion`.
- Шаровий sync: feat/кар'єра лише з шаблону (без локального override), видалена в джерелі, але з посиланням (профіль виду, tier, герой) — лишається локальною копією зі старою версією й попередженням.
- Відкрито (фінальне рев'ю 5g-0): у copy-sync таблиці обробляються в зворотному порядку, тож вид і його кар'єра, видалені разом, дають хибне «blocked» і осиротілу кар'єру; `characteristics.talents` героя не входить в `isFeatReferenced`; на dev-БД раси, скопійовані з шаблону, після бекфілу виглядають локально зміненими (хеш тепер включає `profile`); `danglingProfileWarnings` робить 3 `findMany` на кожен sync навіть для 5e; інтеграційні `layered … nulls references to its override` і `refactor-roundtrip` падають і без 5g-0.

## Межі 5g-1

Ядро персонажа Grim d100 (на `feat/wfrp`, не змерджено; без нових ефектів, полів схем і міграцій). Spec/план — `docs/superpowers/{specs,plans}/2026-11-10-wfrp-5g1*`.

- Каталог `data/templates/grim-d100/`: 4 види (Lowlander, Delver, Hearthkin, Veyl) з повними профілями, 16 кар'єр по 4 рівні, 50 талантів, з них 20 механічних. Контент англійською, оригінальні тексти.
- Формат навичок кар'єри: `spec: "none"` — голий ключ (`perception`), `fixed` — `key:spec` з `MELEE_SPECS`/`RANGED_SPECS` (`melee:basic`), `open` — `key:spec` за `SPEC_RE` (`lore:local`). Голий ключ відкрив би всі спеціалізації окремими тіками (`listed()` у `advancement/career.ts`). Склад рівня 1 фіксований: 3 характеристики, 5 навичок, 2 таланти.
- Механічні таланти — лише passive `modifyStat` з `attackBonus` (з `attackKind` або без), `maxHp`, `initiative`: тільки ці осі реально діють на героя wfrp. Ефекти на характеристики, `armor`, `speed`, `morale`, `damageBonus` інертні й заборонені тестом реального каталогу. Ефект задається на 1 ранг (ранги повторюють групу).
- `rules.json` змінює лише `advancement.career.ticksRequired` на 8/10/12 (дефолт 10/12/14): рівень 1 має рівно 10 пунктів, тож при 10 тіках довелося б купити все, включно з талантом, який може дати вид. Решта правил (ціни, `creation`, множники) лишаються дефолтними.
- Валідатор: `careerSkillIssue` (формат і каталог навичок), усі 8 ключів профілю виду обов'язкові, d100-межі зростають і закінчуються на 100, лише passive `modifyStat` з дозволених осей (перевіряє `validateGrimData`), `profile`/`talents`/`randomTalents`/`careerTable` з `null` дають помилку, посилання між рядками й профілями (таланти рівнів, кар'єри, види) збігаються з іменами каталогу точно (регістр), сканування всіх рядкових листків на заборонені терміни. Сканер ловить множину, суфікси (`-er`, `-ans`, `'s`) і дефісні форми, але не синоніми й перекази. `grimCoverage` повертає попередження (невикористані характеристики/таланти, статуси рівнів, що не зростають, кар'єра поза таблицями, недосяжний рівень 1, навичка поза пулом свого класу, рівень без жодної нової навички, поки пул класу не вичерпано, `randomTalentCount` більший за таблицю); у реальному каталозі результат порожній.
- Заборонені терміни (`forbidden-terms.ts`) — захід, а не гарантія: за межами списку оригінальність текстів перевіряє рев'ю.
- Відхилення від spec: 40 % механічних талантів (20 з 50) замість «приблизно половини» — інші наявні ефекти для героя wfrp інертні.
- Локально: шаблон на `wfrp` прибрано; перед ручними перевірками виконати `pnpm template import grim-d100 --publish` (власника задати `--owner`). Поза Next CLI друкує безпечне `[content] after-commit effect failed: ... revalidateTag`.

**Залишки 5g-1 (відкрито):**

- Повтори навичок між рівнями кар'єр лишаються: пул класу ≈10 навичок проти 14 унікальних на 4 рівні (Pathfinder T4, Shieldbearer, Sellsword, Dicer T4, Lockbreaker T4); попередження «рівень без нової навички» вимкнене для вичерпаного пулу.
- Фікстури 5g-0 не відповідають пулам класів: їхні пул-попередження друкуються в stderr інтеграційних тестів (тести не ламають).
- Суфікс `ers?` сканера ловить і «Reiker»; хибні спрацювання на «moot point» закрито в 5g-2 (`ALLOWED_PHRASES`).
- Trim посилань відбувається в `coerceRecord` ще до валідатора: пробіл по краях посилання валідатор не бачить.

## Межі 5g-2

Бестіарій Grim d100 (на `feat/wfrp`, не змерджено; без нових ефектів і міграцій). Spec/план — `docs/superpowers/{specs,plans}/2026-11-10-wfrp-5g2*`.

- Склад: 30 юнітів у `data/templates/grim-d100/units.json` — 6 тем (`statblock.creatureType`: Beasts, Raiders, Restless Dead, Cultists, Constructs, Horrors) × 4 рівні загрози в `level`. `level` безпечний: fair-баланс і бібліотека читають його як тір, а не як 5e-рівень.
- `abilities` юніта — лише вихід рецептів Traits 5h-1 (`id` = id рецепта; Fear і Terror мають `"fear"`); `attacks`, `knownSpells`, `raceId`, `avatar` у рядках відсутні, атаки юніта — лише Trait-атаки. Описів юнітів у БД немає.
- Wounds (`maxHp`): `average = SB + 2·TB + WPB`; за Size: tiny = 1, little = TB, small = 2·TB + WPB, average без Trait Size, large ×2, enormous ×4, monstrous ×8; Swarm ×5; Hardy + TB (після множників); мінімум 1. Hardy і Swarm у рушії інертні, тож їхній вплив запечено в `maxHp`. Похідні колонки: `initiative = I`, `speed = move × 6`, `gridSize` за Size (tiny–average 1, large 2, enormous/monstrous 3).
- Діапазони за рівнем — `UNIT_LEVEL_BANDS` у `scripts/grim/units.ts` (максимум характеристик, Combat, Wounds, AP, Ward, Psychology, атаки, Breath, Regenerate/Magical лише з рівня 2/3). Валідатор (`unitIssues`) відхиляє вихід за діапазон, `grimCoverage` лише попереджає: тема без юніта, рівень без юніта, Trait, якого не вживає жоден юніт.
- Імпорт: `IMPORT_SPECS.units` отримав JSON-колонку `characteristics` (без неї завантажувач губив характеристики юнітів; зберігається лише у wfrp-кампанії); legacy `POST /units/import` приймає `abilities` з тією ж перевіркою Traits, що й ресурс (спільний `lib/server/content/traits-guard.ts`, `assertTraitsSupported`).
- Експорт/приклад CSV юнітів у dnd5e/homm-кампаніях тепер містить порожню колонку «Characteristics (JSON)» (спільний `IMPORT_SPECS`); імпорт у ці кампанії її відкидає (`keepsCharacteristics`), тож це безпечно і лишено як є. Валідатор Grim відхиляє зайві ключі в `characteristics.base`. «Servitor» і «Strigoi» прибрано зі списку заборонених термінів як загальні слова.
- Сканер заборонених термінів: доповнений список істот GW; `ALLOWED_PHRASES` («moot point», «moot question», «moot court») вирізаються перед скануванням, що закриває залишок 5g-1 про «Moot».
- Тести: `scripts/grim/__tests__/bestiary-e2e.test.ts` — герої 5g-1 проти юнітів до кінця бою. Цикл вбивства відновлює HP союзників на кожному ударі (інакше відповідні удари вибивають героїв); сумарні втрати HP союзників мають бути > 0 (юніти б'ють у відповідь).
- `scope-size` і OpenAPI-ліміти не піднімались.

## Межі 5g-3

Магія й спорядження Grim d100 (на `feat/wfrp`, не змерджено; без нових ефектів і міграцій). Spec/план — `docs/superpowers/{specs,plans}/2026-11-10-wfrp-5g3*`.

- Склад: 30 заклинань у 6 kind (`petty`, `arcane`, `hedge`, `witchcraft`, `blessing`, `miracle`) і 6 списках (`GRIM_SPELL_LISTS`), 56 предметів (`artifacts.json`), 3 таблиці мискастів у `rules.json` (`tables`: `miscastMinor`, `miscastMajor`, `wrath`); мискаст бере таблицю кампанії, а не дефолт.
- Форма заклинання: лише `casting.magic` (`cn`, `kind`, `overcast`, `attribute`), `level: 1`, `cost: "action"`, `spellEffects` — лише `dealDamage`/`heal` зі `spellRoll: 100`; стани — тільки через `attribute` (ключ wfrp-стану, рівні 1–3); overcast лише `null`/`"dice"` (`"targets"` рушій не підтримує). Сила — кубики за моделлю HOMM (`spells/model/dice.ts`), `dieSides` ігнорується.
- Інгредієнти: максимум один, `minGp` у кронах (пенси/240), `componentFlags.m: true` обов'язковий; поза інгредієнтом `componentFlags` відсутній.
- Предмети: `slot` ⇄ `systemStats.type` (`weapon`/`range_weapon`/`armor`/`helmet`/`boots` ⇄ weapon/armour; щит = `gear` з рівно однією якістю `shield X`; `item` = `gear` без якостей), діапазони за групою/kind (`equipment.ts`), ціни в пенсах, вага в Enc, лише реалізовані якості (`IMPLEMENTED_QUALITIES`); `reload` ⇔ `ammoCapacity`.
- Trait `ranged`: `"ranged"` у `TRAIT_ATTACKS`, профіль `wfrpUnitBuild` з `addSb: true`, без Blast, `rangeFt` за замовчуванням `RANGED_DEFAULT_RANGE_FT`; діапазони шкоди — `UNIT_LEVEL_BANDS[level].ranged`, дальність — `UNIT_RANGED_FT`. `TRAIT_RECIPES` = 15, покриття вимагає юніта з `ranged`.
- Юніти-кастери: лише `knownSpells` (без `abilities` для кастів); валідатор перевіряє стелю — молитва `⌊Fel/10⌋`, інше `⌊Int/10⌋ − AP`; CN вище за стелю є помилкою. 6 кастерів і 4 стрільці.
- Імпорт: колонка `systemStats` у `IMPORT_SPECS.artifacts` (JSON; лише wfrp, інакше `SYSTEM_STATS_UNSUPPORTED`); порожня/`null` клітинка в імпорті ЗАЛИШАЄ збережене значення (обмеження `coerceRecord`), очищає лише пряме API з `null`.
- Правила валідатора поза планом: `crossbow`/`blackpowder` потребують вади `reload`; `twohanded`/`bow`/`crossbow` — `twoHanded: true`; лікувальне заклинання не може мати `attribute`; лікування може цілити `template` із `side: "ally"`.
- Сканер заборонених термінів доповнений і сканує також `rules.json`; `grimInfo` друкує `info:`-рядки (напр. заклинання, яке не знає жоден юніт), це не попередження покриття.
- Розбіжності зі spec: кастери без `abilities`; overcast `targets` недоступний; кастери обрані за стелею SL (arcane CN 4+ недосяжний для більшості юнітів 5g-2); 9 стрілецьких замість ~8 (потрібен носій `blast`).
- Тести: `scripts/grim/__tests__/arsenal-e2e.test.ts` (герої з предметами й заклинаннями проти юнітів); інтеграція на локальній БД перевіряє клон (заклинання, `systemStats`, таблиці, `knownSpells`) і no-op повторного запуску.

## Межі 5g-4

Завершення шаблону Grim d100 (на `feat/wfrp`, не змерджено; без міграцій). Spec/план — `docs/superpowers/{specs,plans}/2026-11-10-wfrp-5g4*`.

- Реєстр локалізацій: `TEMPLATE_LOCALIZATIONS` (`lib/utils/campaigns/template-locales.ts`) — SRD і Grim, обидва `en/uk`; канонічний — офіційний `en` на кожен `templateKey` (два `en` Grim → 409 при клонуванні Grim і в списку, SRD клонується як раніше). Код помилки `SRD_CANONICAL_UNAVAILABLE` лишився спільним, змінено лише текст.
- Що локалізується: назви й описи всіх видів, кар'єри з рівнями й спорядженням (`trappings`), `rules.tables[slot][i].text`, списки заклинань однією мапою імен для всіх місць (колізія двох списків — помилка до запису й при локалізації). Не локалізуються: `status` рівнів («Brass 3» парсить простій), ключі навичок, `profile` виду (текстових полів немає), `creatureType` юнітів.
- Sync uk-клону Grim одразу після створення порожній, включно з правилами (`rulesHashes` рахує `tables` локалізованими з обох боків).
- uk-словник Grim: `data/templates/grim-d100/i18n/uk.json` (покриття 100 %, `status`), глосарій `i18n/glossary/uk.json`; пайплайн — `pnpm srd:i18n <cmd> <locale> --template grim`, валідатор `grimI18nIssues`. Словник серверний, у клієнтські scope не потрапляє.
- Перейменування (щоб не збігатися з іменами GW): кар'єра `Herald` → `Crier` (її рівні `Page, Crier, Emissary, High Crier`), `Charcoal Burner` → `Ashburner` (рівень 2 → `Ashburner`); `race-profiles.json` оновлено.
- Іконки: 186 записів у `icons.json` за іменем; зображень у репозиторії немає — їх генерує користувач зовні за промптами (`pnpm assets:grim-icons prompts`), завантаження (`upload`, `--allow-remote`) лише за користувачем. `grimIconGaps` (відсутні іконки) — попередження CLI, не помилка валідатора; валідатор відхиляє лише зайві/невалідні записи `icons.json`. Іконки підмішуються в рядки через `withGrimIcons` під час `importContent`.
- AI: рядок про рульову систему (`WFRP_SYSTEM_LINE`) додається лише для `wfrp`, для `homm`/`dnd5e` промпт і інструменти без змін; `get_party`, `read_character`, `get_battle_state` віддають wfrp-проєкції (Wounds, кар'єра, характеристики), `read_reference` артефакта вже віддавав `systemStats`.
- CSV: `races.profile` не імпортується й не експортується (посилання за id; профіль редагується лише в UI виду) — фіксує тест `import-export.test.ts`. Round-trip `careers` (`tier1..4_*`, таланти за назвою) і `artifacts.systemStats` покрито тестами.
- Хвости 5g-3 закрито: M2 (`dryRun` прев'ю тепер бачить `SYSTEM_STATS_UNSUPPORTED`), M7 (ключ), `NaN` в `recipeValues` без `rangeFt`.
- Розбіжності зі spec (повністю — «Перевірки коду» плану): реєстр без `kinds`; `races.profile` без текстових полів; `rules.tables[slot][i].text` замість `.rows`; Herald — і кар'єра, і рівень; `grimIconGaps` замість попередження в `grimCoverage`; зображення зовнішні; рядок AI лише для wfrp; `read_reference`: лише `characteristics` юнітів для wfrp; `SRD_CANONICAL_UNAVAILABLE` збережено.
