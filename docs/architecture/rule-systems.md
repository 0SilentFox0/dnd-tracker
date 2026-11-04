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
| `cellFeetOf(rules)` | розмір клітинки в футах (`grid/cell-feet.ts`): homm/dnd5e 5, wfrp 6 (2 yd); `CELL_FEET` видалено, `rules` — обов'язковий параметр grid-хелперів (рух, шаблони, досяжність, цілі) | `lib/utils/battle/grid/*` |
| `battle.supported` | wfrp = `true` (5b-1); `false` → старт бою 409 `SYSTEM_BATTLE_UNSUPPORTED` | `start-mutation`, setup UI |
| `unusedMechanics` | механіки, що ховаються на сторінці правил | `RulesForm` |

## Правила

- Ядро не імпортує систему: `lib/utils/rules/systems/wfrp*`, `d20*`, `lib/hooks/systems/wfrp*`, `components/systems/wfrp*` заборонені ESLint поза `lib/utils/rules/systems/**`, `lib/hooks/systems/**`, `components/systems/**`. Решта коду бере систему через `ruleSystemOf`/`systemUiOf`.
- `system` не механіка: `MechanicKey` без неї, sync шаблон→кампанія й вкладки правил її не бачать.
- Блокування: `updateCampaignRules` рахує `characters` + `units`; якщо >0 і патч змінює `system.key` → 409 `SYSTEM_LOCKED`. `rules.get` повертає `systemLocked`.
- Відсутня секція `system` у збережених правилах: `parseRules` виводить `dnd5e` (якщо `classes.enabled`) або `homm`; бекфіла БД нема.
- Пресети: `SRD_RULES` = `dnd5e`; `WFRP_RULES` (`wfrp/rules-preset.ts`) вимикає класи, рятунки від смерті, концентрацію, мораль, стани й дії; шаблон «Grim d100 (empty)» (`templateKey: grim-d100-empty`).

## Що де лежить (wfrp)

| Шлях | Зміст |
|---|---|
| `wfrp/percentile/` | `roll` (d100, інверсія, дублети), `difficulty` (`DIFFICULTY_KEYS`, модифікатори), `resolve` (SL, критичний успіх/невдача) |
| `wfrp/characteristics/` | `schema` (`CharacteristicsSchema`, 10 характеристик, `fate`, `advances`, навички), `derive` (Wounds, Move), `sheet-block` |
| `wfrp/skills/` | каталог навичок і спеціалізацій (`catalog.ts`) |
| `wfrp/sheet-test.ts`, `session.ts` | `sheetTest.roll` і `rest.onSession` |
| `components/systems/wfrp/` | `HeroStats`, `StatsTab`, `StatsFields`, `UnitStatsFields`, `RollDialogBody`, редактори характеристик і навичок |

Тексти: `gameTerms.ruleSystem|characteristics|wfrpSkills|wfrpSpecs|difficulty|testOutcome|distanceUnit`, `rules.system.*`, `rest.log.test|session`, `rest.party.session`; динамічні ключі покриває `lib/i18n/__tests__/label-keys-rule-systems.test.ts`. Дані: JSON `characteristics` у `characters` і `units` (6 колонок d20 лишаються; для d20 сервер не пише `characteristics` ні персонажів, ні юнітів, а `rowHash` синку шаблонів трактує порожнє/дефолтне `units.characteristics` як відсутнє), Wounds = `resources.hp`, `resources.fortune`.

## Як додати систему або хук

- Нова система: ключ у `RULE_SYSTEM_KEYS` (`lib/constants/rules.ts`), тека `lib/utils/rules/systems/<key>/` з `RuleSystemDefinition`, рядок у `RULE_SYSTEM_REGISTRY`, UI у `components/systems/<key>/` + рядок у `SYSTEM_UI`, пресет правил, терміни в `gameTerms`, запис у `whats-new` і help.
- Новий хук: поле в `RuleSystemDefinition`, реалізація в обох `d20/` і `wfrp/` (d20 — нейтральна/делегуюча), виклик лише через `ruleSystemOf`; додати рядок у таблицю вище.
- Нові ключі з динамічною назвою — у `label-keys-rule-systems.test.ts`.

## Межі 5b-1

Бій wfrp працює на рівні рушія (без UI — 5b-2). Свідомі межі:

- Momentum зберігається по учаснику (`battleData.momentum`, дублюється на всю сторону), а не на сцені; серверні атаки (реакції, нагоди) його не витрачають і не набирають; дальній бій Momentum не використовує.
- Щита й броні немає (AP = 0, щит не моделюється): 5f.
- Крит-маркери (bleeding, stunned, …) лише інертні ефекти-мітки; стани й механіки — 5c; head.5 «unconscious» не змінює статус.
- d100 не пишеться в `diceRolls` (`DieSides` не має 100); значення лежить в `actionDetails.percentile`. `attackBodySchema` обмежує `d20Roll` до 20, тож кидок d100 клієнта потребує розширення схеми в 5b-2 (до того — кидки сервера).
- Дальня атака без смуг дальності (складність challenging, ціль захисту 0).
- Еталони балансу (`refHit`) припущені, не звірені з книгою.
- `berserk` (turn/berserk.ts) і далі кидає d20 (у wfrp немає вмінь).
- Off-hand у wfrp списує основну дію; бонусної дії й реакції немає.
- Небойові джерела шкоди на 0 Wounds дають крит у «body»; опір у wfrp = лише імунітет; stat-модифікатор d20 у шкоді ігнорується.
- `ctx.rules` у `flow`/`EffectCtx`/`ZoneCtx`/`ManeuverInput`/фазі атаки лишається необов'язковим: `rules ?? DEFAULT_RULES` (d20, 5 ft) — для wfrp ці шляхи мовчки дають 5 ft, поки поле не стане обов'язковим.

## Межі 5a

Є: реєстр, блокування системи, d100-тест, характеристики/навички/Wounds/Fate, тести з листа, «Нова сесія», порожній шаблон Grim d100; d20-вкладки (магія, інвентар), кнопки короткого/довгого відпочинку й d20-рядки листа сховані прапорцями `spells`/`items`/`rest.kinds`/`d20Stats`. Немає: чернеток гравців (`createDraft` у не-d20 системі → 409 `SYSTEM_DRAFTS_UNSUPPORTED`), магії, бестіарію й бібліотек — частини 5b–5h.

## Відкриті хвости 5a (фінальне рев'ю 2026-11-04)

- Складність: `DIFFICULTY_SL` зсуває SL і не змінює ціль кидка (за spec); за правилами d100 складність зсуває саму ціль — рішення користувача.
- Клас у wfrp ще видимий і обов'язковий (spec: сховати); частковий PATCH `characteristics` скидає решту до дефолтів; зниження Fate не обрізає `resources.fortune`.
- `readCharacteristics` (`keys.ts`) дублює межі `CharacteristicsSchema`: винести спільні константи й табличний тест на граничні значення.
- `wfrp/sheet-test.ts` кидає `ContentError` (серверний шар) із чистої утиліти.
- `useRuleSystem` повертає `homm`, поки правила вантажаться; `systemLocked` у кеші не інвалідується при створенні першого персонажа/юніта.
- ~~`importUnitsIntoCampaign` пише `characteristics` без перевірки системи кампанії~~ — закрито в 5b-1 (приймає `rules`, пише лише для wfrp).
- `list-templates.ts` / `app/campaigns/page.tsx` тягнуть увесь JSON `rules` заради ключа системи (egress).
- `SkillAdvancesEditor`: спеціалізація з пробілом мовчки блокує кнопку.
- `templateKey` = назва шаблону (конвенція store), spec казав `grim-d100-empty`.
- Складність: `DIFFICULTY_SL` зсуває SL, а не ціль — так у WFRP 5e (research §1; у 4e це модифікатор цілі). Значення таблиці звірити з книгою 5e; чи обрізається SL за результатом — теж звірити.
