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
| `combat.participantFields` | додаткові поля учасника при створенні з персонажа/юніта (`abilities.characteristics`, `abilities.wfrp`: стати, AP = 0); d20 не додає ключів; `refreshFromSource` копіює | `from-character`, `from-unit`, `refresh-from-source` |
| `conditions` | 12 станів wfrp: `catalog`, `apply`/`remove`/`level` (рівень = сума маркерів, обрізання 10), `tick` на початку ходу активного носія, `endTest` (тест зняття), `selfTestMod`/`againstMod` для d100-тестів; `undefined` у d20 → `CONDITION_5E_REGISTRY` без змін | `turn/start` (`applyStartOfTurnDamage`), `resolve-attack`, `crit-effect`, `system-condition`/`condition-test` мутації, `sheet-test` |
| `magic` | `RuleSystemMagic`: `castTest` (d100 проти Int + Language (Magick), SL + канальований SL ≥ CN, броня, Fortune, дублі → miscast), `channel` (банк SL, `battleData.channelledSl`), `miscast` (таблиці minor/major), `attribute` (lore → стан), `onDamaged` (втрата канальованого SL); `slots: false`; `undefined` у d20 | `castSpell` (`spell/cast/cast-test.ts`, `finish.ts`), `spell-mutation`, `channel-mutation` (`POST …/channel`), `damage/consequences.ts` |
| `combat.fortune` | Fortune: перекинути d100 (лише атакувальник; захисник — ні) або +1 SL; `percentile.fortune` у деталях дії; `undefined` у d20 | `attack/run.ts`, схема атаки, `useAttackWizard` |
| `cellFeetOf(rules)` | розмір клітинки в футах (`grid/cell-feet.ts`): homm/dnd5e 5, wfrp 6 (2 yd); `CELL_FEET` видалено, `rules` — обов'язковий параметр grid-хелперів (рух, шаблони, досяжність, цілі) | `lib/utils/battle/grid/*` |
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
| `wfrp/magic/` | `cast-test.ts`, `channel.ts`, `miscast.ts` + `miscast-table.ts`, `attribute.ts` (lore attribute), `armour.ts` (штраф броні), `constants.ts` (`CAST_SKILL`, `OVERCAST_SL_STEP`, `CHANNEL_MAX_SL`), `index.ts` (`WFRP_MAGIC`) |
| `wfrp/tables/` | `roll-table.ts` — спільний `rollTable` для критів і miscast |
| `wfrp/sheet-test.ts`, `session.ts` | `sheetTest.roll` і `rest.onSession` |
| `components/systems/wfrp/` | `HeroStats`, `StatsTab`, `StatsFields`, `UnitStatsFields`, `RollDialogBody`, редактори характеристик і навичок |

Тексти: `gameTerms.ruleSystem|characteristics|wfrpSkills|wfrpSpecs|difficulty|testOutcome|distanceUnit`, `rules.system.*`, `rest.log.test|session`, `rest.party.session`; динамічні ключі покриває `lib/i18n/__tests__/label-keys-rule-systems.test.ts`. Дані: JSON `characteristics` у `characters` і `units` (6 колонок d20 лишаються; для d20 сервер не пише `characteristics` ні персонажів, ні юнітів, а `rowHash` синку шаблонів трактує порожнє/дефолтне `units.characteristics` як відсутнє), Wounds = `resources.hp`, `resources.fortune`.

## Як додати систему або хук

- Нова система: ключ у `RULE_SYSTEM_KEYS` (`lib/constants/rules.ts`), тека `lib/utils/rules/systems/<key>/` з `RuleSystemDefinition`, рядок у `RULE_SYSTEM_REGISTRY`, UI у `components/systems/<key>/` + рядок у `SYSTEM_UI`, пресет правил, терміни в `gameTerms`, запис у `whats-new` і help.
- Новий хук: поле в `RuleSystemDefinition`, реалізація в обох `d20/` і `wfrp/` (d20 — нейтральна/делегуюча), виклик лише через `ruleSystemOf`; додати рядок у таблицю вище.
- Нові ключі з динамічною назвою — у `label-keys-rule-systems.test.ts`.

## Межі 5b-2

Бій wfrp працює на рівні рушія (UI — див. «Межі 5b-3»). Свідомі межі:

- Momentum — жетон сцени `{ ally?, enemy? }` (`battle_scenes.momentum`, у знімку, дельті й rollback; `lib/utils/battle/momentum.ts`: `settle`, `heldBy`, `momentumPatch`), спільний для гравецьких і серверних атак (фаза атаки, помста, нагода, рух, легендарні дії, підготовлена атака); `spell/cast` і `berserk` його не чіпають (`NO_MOMENTUM`). У d20 `scene.momentum` ніколи не з'являється в дельті. У wfrp немає реакцій, тож нагода/підготовлена атака за реальних правил недосяжні; крит-вибір ДМ (`pendingCritChoice`) атаками wfrp не запускається. Дальній бій Momentum не використовує.
- Щита й броні немає (AP = 0, щит не моделюється): 5f.
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
- Overcast піднімає лише `castLevel` (кроки `OVERCAST_SL_STEP` за перевищення CN); `diceRolls` клієнта не розширюються, тож апкаст по кубиках/цілях рахує сервер. Каст без `castRoll`/`serverRoll` сервер кидає сам (не відхиляє).
- `channel`: основна дія; не свій хід, використана дія або d20-кампанія (`BATTLE_CHANNEL_UNSUPPORTED`, 422) відхиляються; кидок 100 дає minor miscast; будь-яка шкода кастеру скидає channelled SL (`onDamaged`).
- Числа (`MISCAST_TABLE`, CN, кроки SL: `OVERCAST_SL_STEP`, `ARMOUR_SL_PER_AP`, `CHANNEL_MAX_SL`, правила miscast на дублях) не звірені з книгою (немає джерела).
- AP = 0 до 5f, тож штраф броні касту завжди 0 (формула покрита тестом).
- Long cast заборонений; overcast лише апкаст (дальність, площа, тривалість — ні).
- Шкода заклинань іде наявним ефект-рушієм без SL касту, TB й AP.
- Таланти, редагований контент `tables`, Sin/молитви (5d-3) — поза межами.
- **Обов'язкова перевірка перед деплоєм епіку wfrp:** `battle-sweep` homm/dnd5e на prodcopy (5d змінює `castSpell` і consequences, спільні з d20). Ще не запускався.

## Межі 5d-2

UI магії на `feat/wfrp` (без міграції; namespace `wfrpMagic`, вкладка «Магія» на аркуші, каст-діалог і плитка Channelling у бою, поля магії в редакторі заклинань). Свідомі межі:

- `wfrpMagic` підвантажується лише для wfrp-кампаній: `app/campaigns/[id]/layout.tsx` обгортає дерево в `ExtendLocaleScope` з `WFRP_CAMPAIGN_EXTRA` (`lib/i18n/scopes.ts`), для d20-кампаній scope не змінюється.
- Розмір `scope-size` (gzip, ліміт 105 KB): campaign + battle + battleWfrp до 5d-2 — uk 102.8 / en 82.8 KB; після (+ `wfrpMagic`) — uk 103.8 / en 83.6 KB (+1.0 / +0.8 KB). Ліміт не перевищено, відповідь П5 (окремий ліміт) не знадобилась; запас uk ≈ 1.2 KB, тож наступний wfrp-namespace потребує винесення або окремого ліміту.
- Онбординг: запис `2026-11-05-wfrp-magic` у what's new і розділ «Магія» в `dm-rule-systems`.
- Live-run 5d-2 (Task 10.3) виконано; хвости виправлено в 5d-3 (мітки умов у редакторі, слоти в книзі заклинань, підписи Fortune-перекиду).
- **Обов'язкова перевірка перед деплоєм епіку wfrp:** `battle-sweep` homm/dnd5e на prodcopy (залишається в силі, ще не запускався).

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
- Застарілий текст довідки `dm-rule-systems` s3 b1 (каже, що бої wfrp не готові) — не оновлено.
- Решта відомих прогалин: таланти, редагований контент `tables`, дальність/площа/тривалість overcast, long cast, штраф броні (AP = 0 до 5f).
- **Обов'язково перед деплоєм епіку wfrp:** `battle-sweep` homm/dnd5e на prodcopy (5d змінює `castSpell` і consequences, спільні з d20) — ще не запускався.

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
