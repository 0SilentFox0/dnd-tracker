# Рульові системи (homm / dnd5e / wfrp)

Кампанія грає за однією рульовою системою: `rules.system.key` ∈ `homm | dnd5e | wfrp`. Дві реалізації: `d20/` (homm і dnd5e, делегує в наявний код) і `wfrp/` (d100, характеристики). Spec: [2026-11-03-wfrp-5a-design.md](../superpowers/specs/2026-11-03-wfrp-5a-design.md), дослідження: [2026-11-03-wfrp-rule-system.md](../superpowers/research/2026-11-03-wfrp-rule-system.md).

## Реєстр і хуки

`lib/utils/rules/systems/`: `types.ts` (`RuleSystemDefinition`), `registry.ts` (`RULE_SYSTEM_REGISTRY`, `ruleSystemOf(rules)`, `systemKeyOf`), `d20/`, `wfrp/`. UI-двійник — `components/systems/` (`SYSTEM_UI`, `systemUiOf(key)`); хук `useRuleSystem` — `lib/hooks/systems/`.

| Хук | Що робить | Де викликається |
|---|---|---|
| `distance { unit, perCell }` | одиниця й масштаб клітинки (ft/5, yd/2); у 5a лише декларація | UI одиниць, `gameTerms.distanceUnit`; шов у grid-хелперах — 5b |
| `balance { kind }` | `fair` / `none`; wfrp = `none` | `useBattleSetup` (ховає перемикач), `balance-post`, `start-battle-handler` |
| `progression.levels` / `maxHp` | level-up/XP-пороги; формула максимуму HP (wfrp = Wounds); `null` → d20-розрахунок | `characterBaseHp` (`hero-hp.ts`: лист і бій — одне число), `HeroStats`, rest-блок |
| `characteristics { kind, sheetBlock }` | `d20` або `wfrp`; блок листа (характеристики, Wounds, Move, навички, Fate/Fortune) | `build-sheet.ts`, `resources-handler`, `system-fields.ts` (чужі поля відкидаються), `create`/`patch` |
| `sheetTest { accepts, roll }` | тест з листа: d20 `check/save` або d100 `test` | `roll-handler`, `SheetRollDialog` (тіло діалогу — `SystemUi.RollDialogBody`) |
| `rest.onSession` | дія ДМ «Нова сесія»: `Fortune = Fate`; відсутній → 409 `REST_KIND_UNSUPPORTED` | `rest-handler`, меню відпочинку партії |
| `battle.supported` | wfrp = `false` → старт бою 409 `SYSTEM_BATTLE_UNSUPPORTED` | `start-mutation`, setup UI |
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

Тексти: `gameTerms.ruleSystem|characteristics|wfrpSkills|wfrpSpecs|difficulty|testOutcome|distanceUnit`, `rules.system.*`, `rest.log.test|session`, `rest.party.session`; динамічні ключі покриває `lib/i18n/__tests__/label-keys-rule-systems.test.ts`. Дані: JSON `characteristics` у `characters` і `units` (6 колонок d20 лишаються), Wounds = `resources.hp`, `resources.fortune`.

## Як додати систему або хук

- Нова система: ключ у `RULE_SYSTEM_KEYS` (`lib/constants/rules.ts`), тека `lib/utils/rules/systems/<key>/` з `RuleSystemDefinition`, рядок у `RULE_SYSTEM_REGISTRY`, UI у `components/systems/<key>/` + рядок у `SYSTEM_UI`, пресет правил, терміни в `gameTerms`, запис у `whats-new` і help.
- Новий хук: поле в `RuleSystemDefinition`, реалізація в обох `d20/` і `wfrp/` (d20 — нейтральна/делегуюча), виклик лише через `ruleSystemOf`; додати рядок у таблицю вище.
- Нові ключі з динамічною назвою — у `label-keys-rule-systems.test.ts`.

## Межі 5a

Є: реєстр, блокування системи, d100-тест, характеристики/навички/Wounds/Fate, тести з листа, «Нова сесія», порожній шаблон Grim d100. Немає: бою (старт 409), масштабу клітинки в grid-хелперах, магії, бестіарію й бібліотек — частини 5b–5h.
