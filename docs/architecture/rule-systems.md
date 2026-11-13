# Рульові системи: база, модулі, пресети

Довідник для коду після E2 Ч17. Історія (межі wfrp 5a–5h, розділи Ч1–Ч16, ratchet E1) — [docs/archive/architecture/rule-systems-history-2026-11.md](../archive/architecture/rule-systems-history-2026-11.md); специфікації: [E1](../superpowers/specs/2026-11-10-architecture-modularity-design.md), [E2](../superpowers/specs/2026-11-11-e2-d20-homm-modules-design.md).

Кампанія грає за **композицією** `rules.system = { key, modules? }`; `key` обов'язковий (без нього `parseRules` кидає `RulesSystemError`, API відповідає 422). Три шари: **core** (бій, лист, шаблони, не називає ні систем, ні модулів), **`systems/<id>/`** і **пакет шаблону** (`data/templates/<key>/` + хуки `scripts/templates/systems/<id>/`).

## Три види теки `systems/<id>/`

| Вид (`SystemMeta.kind`) | Що це | Приклади |
|---|---|---|
| `base` (типово) | повний набір хуків гри: правила, лист, бій, магія, UI, сервер; ключ(і) кампанії = `keys` | `d20` (`dnd5e`), `wfrp` |
| `addon` (модуль) | необов'язкова надбудова над базою з `requires`; додає секції правил, хуки, колонки, UI-слоти | `morale`, `retaliation`, `heroscaling`, `skilltrees`, `artifactsets`, `unitstacks` |
| `preset` | лише ім'я: база + набір модулів (`preset: { base, modules }`) | `homm` = `d20` + шість модулів |

Явний `system.modules` заміщує набір пресета; `modules: []` = «голий» base; відсутній `modules` = набір пресета; зміна `key` скидає `modules`. Вимкнення модуля нічого не видаляє (колонки, секції правил, рядки лишаються, їх лише ігнорують).

## Маніфест (`systems/<id>/meta.ts`)

Дані без логіки, `import type` (`SystemMeta`, `lib/utils/rules/systems/meta.ts`): `module`, `kind`, `keys`, `preset`, `requires`, `conflicts`, `claims`, `after`, `toggle` (`free | setup`; `setup` = зміна в кампанії з персонажами вимагає `confirm`), `distance`, `tokens` (підрядки для ratchet), `i18n` (`battle | campaign | member | dm | pages` + `budgetKb`), `dmSections`, `contentKinds`. Із нього виводяться `systemScope`, бюджети `scope-size`, каталог модулів (`moduleCatalog()`, `moduleToggles`, `withModule`, `moduleChange`). Для кожного addon обов'язкові `gameTerms.module.<id>.{name,summary}`, для кожного ключа `gameTerms.ruleSystem.<key>`.

## Порядок композиції

`composition({ key, modules? })` → `{ base, modules }` (`catalog.ts`); `validateComposition` ловить `requires`, `conflicts`, подвійний `claims`, невідомий id, модуль не тієї бази, цикл; `systemIssues` = `validateComposition` + `validateSections` (одна перевірка для сервера, створення й `template validate`). `compositionOrder` — топологічно за `requires` + `after`, рівні за id. Згортка (`compose.ts`: `composeSystem`/`composeUi`/`composeServer`, `defineAddon`, `composeCached`): масиви й списки хуків конкатенуються (база, потім модулі), прості об'єкти зливаються вглиб, словники й групи задані в `FieldKinds`, скаляри й функції замінюються лише через `claims` (будівник отримує `prev`). Секції правил: `sectionsOf(composition)`, `extendSection`, колізія шляху між власниками — помилка; `merge?(current, patch)` у `RulesSection` дає спецзлиття (d20 `conditions`, core `encounters`, wfrp `tables`). `parseRules` розбирає по пунктах (невалідний → default), `mergeRules` зберігає секції неактивних модулів. Типи секцій `advancement`/`tables` додає wfrp через module augmentation `RulesetExtensions` (`section-shapes.ts`), core не імпортує `systems/wfrp`.

Дефолти правил: `SECTION_DEFAULTS` (`lib/utils/rules/defaults.ts`, без `system`) для нейтральних дефолтів пунктів; **`DEFAULT_RULES` — лише тестова фікстура** (homm), нетестовий код її не імпортує (ESLint `no-restricted-imports`; виняток `scripts/{sim,seed,constructor,import}/**`). Продакшн-код бере правила кампанії/бою, `rules` обов'язковий параметр; dev-пісочниця — `PREVIEW_RULES` (`lib/utils/battle/fx/preview-rules.ts`).

## Корені і реєстри

Core бачить `systems/*` лише через корені (`SYSTEM_ROOTS`, `scripts/shared/system-ratchet.ts`) із блоками `// <systems:generated>`, які пише `pnpm systems:index` (перевірка `lib/__tests__/systems-index.test.ts`):

| Корінь | Що збирає |
|---|---|
| `lib/utils/rules/systems/meta.ts` | `SYSTEM_META`, `RULE_SYSTEM_KEYS`, `metaOf` |
| `lib/utils/rules/systems/registry.ts`, `resolve.ts` | `ruleSystemOf(rules)`, `ruleSystemByKey`; реєстри `MODULES`, `MODULE_UI` (`components/systems/registry.ts`), `MODULE_SERVER` (`lib/server/systems/registry.ts`), `MODULE_HOOKS` (`scripts/templates/systems/index.ts`); експорти `<ID>_MODULE[_UI\|_SERVER\|_HOOKS]` |
| `lib/utils/rules/systems/rules-presets.ts` | `RULES_PRESETS` (`systems/<id>/rules/rules-preset.ts`) для `initialRules` |
| `components/systems/registry.ts` | `SYSTEM_UI`, `systemUiOf`, `systemUiByKey` |
| `lib/server/systems/registry.ts` | `SYSTEM_SERVER`, `systemServerOf` |
| `lib/utils/abilities/schema/{system-effects,system-flags,module-effects}.ts`, `registry/effects/*-rows.ts` | схеми й рядки ефектів/прапорців системи й модулів |
| `scripts/templates/systems/index.ts` (+ `adapters.ts`) | `PACK_HOOKS`, адаптери пакетів |

Серверний вхід: `systemOfCampaign(id)` (`lib/server/systems/campaign-system.ts`, читає лише `rules->'system'`), `systemScope(system, slot)` (`lib/i18n/system-scope.ts`, приймає лише об'єкт).

## Слоти

**`SystemSlot = { key, data }`** (`lib/utils/rules/systems/slot.ts`), `defineSlot(key, parse)` → `{ read, write }`; чужий ключ → `read()` = `undefined`. `SlotCodec.extend(module, parse)`: дані модуля в `data.ext[module]`, `write(data, prev?)` переносить `prev.ext`. Слоти в core-типах: `abilities.system`, `attack.system`, `sheet.systemSlot`, `actionDetails.system`/`AttackRollResult.system`, `scene.system` (`battle_scenes.system_state`), `characteristics` (непрозорий `SystemData`).

**Слот стану учасника бою** — `battleData.system = { key: <база>, data: { …поля бази…, ext: { <модуль>: … } } }` у колонці `battle_participants.state` (і `battle_snapshots.state`), не в знімку; `snapshotHash` стабільний. База пише свої поля в `data`, модуль — лише свій ключ `ext` (напр. `ext.retaliation.used`). d20: `systems/d20/rules/state.ts` (`d20State`/`withD20State`/`d20StateData`; `deathSaves`, `inspiration`, `inspirationSpent`, `attackedWithLight`), wfrp: `systems/wfrp/rules/state.ts` (`fortune`, `channelledSl`, `sin`, `conditionTests`, `psychologyTested`). Нейтральний прапорець `battleData.dying` (`isDying(p)` = `dying === true`) каже core «лежить на 0 HP» без знання лічильників. Плоских полів і dual-read більше немає (прибрано в Ч17).

## Таблиця хуків і слотів

Позначки: **обов'язковий** (база мусить дати), **необов'язковий** (немає хука = нейтральна поведінка core), **список** (конкатенується за порядком композиції).

`RuleSystemDefinition` (`lib/utils/rules/systems/types.ts`):

| Поле | Статус | Що робить |
|---|---|---|
| `key`, `distance` | обов'язковий / в meta | ключ; одиниця й масштаб клітинки (`cellFeetOf`) |
| `progression { levels, hpTerm, maxHp }` | обов'язковий | рівні, підпис HP, максимум HP; необов'язкові `proficiency`, `levelResets` (список; виконуються незалежно від композиції, бо це цілісність колонки), `classes(rules)` (нема = «класів немає»), `initiativeRange(rules)` |
| `stats { columns }`, `sheet { blocks }` | списки | колонки `characters`/`units`, якими володіє композиція (`CHARACTER_SYSTEM_COLUMNS`, власники попарно не перетинаються); блоки листа |
| `characteristics`, `sheetTest`, `rest` | обов'язковий | дані системи в рядку, тест з листа, відпочинок |
| `resources?`, `advancement?`, `equipment?`, `traits?`, `currency?`, `downtime?`, `corruption?`, `creation?` | необов'язковий | wfrp-подібні можливості; наявність = ознака для UI/сервера |
| `participant` | списки | `fromCharacter`, `fromUnit` (частини учасника, напр. `heroscaling`, `morale`), `fromStored`, `persist` |
| `combat` | обов'язковий (ядро) | `resolveAttack`, `abortedRoll`, `initiative`, `tieBreak`, `hitModel`, `damage`, `onZeroHp`, `actions`, `reactions`, `saves`, `proficiency`, `judge`, `dice`, `actionEconomy` |
| `combat.attackAbility?`, `reach?`, `crit?`, `autoXp?`, `offHand?`, `inspiration?`, `input?`, `details?` | необов'язковий | характеристика атаки (`{ key, roll, damage }`), досяжність і штрафи дальньої, параметри критів, авто-XP, друга рука, натхнення; без хука: 1 клітинка, нат. 20 = крит, без штрафів |
| `combat.damageParts?` | список | `DamagePart(p, attack) => { dice?, flat? } \| null`; core `attackDamageParts` складає частини (кубики рівня героя й `+level` — `heroscaling`, `systems/heroscaling/rules/damage.ts`; без модуля герой wfrp і безкласовий герой голого `dnd5e` їх не мають: це зміна реальної шкоди в бою, прийнято за П6) |
| `combat.onDamaged`, `afterAttack`, `turn { resetState, beforeAdvance, onTurnStart, onSkippedTurn, onTurnEnd, onRoundStart, onJoin, actGates, startCheck }` | списки | хуки з `runTurnHooks`; перед модулями йде база |
| `conditionSet` | обов'язковий | стандартні стани (`apply`, `effectInput`); `enabled`/`custom` для набору й кастомних станів |
| `conditions?` | необов'язковий | системні стани (wfrp) |
| `magic` | обов'язковий | `sustain`, `saveDc`, `upcast`; необов'язкові `resource` (`picksSlot`), `saveDcBase`, `spellAbilityMod`, `casterDice`, `spellcasting`, `tested` |
| `identity`, `lineage`, `attacks`, `spells`, `items`, `inventory` | обов'язковий | що показують форма, лист і бій |

`SystemServer` (`lib/server/systems/types.ts`): `schemas`, `operations` (операції персонажа; `scoped: true` обгортає `inCompositionOnly`), `battle` (бойові операції за назвою, `lazy load`), `routes` за областями `campaign | character | battle` (єдина точка входу `runSystemRoute`), `contentKinds`, `contentRefs` (список), `drafts` (виключний слот бази), `balance` (`edition`, `heroPower`, …), `ai`. Бойові дії модулів і бази йдуть одним маршрутом `…/battles/:battleId/system/:action` (`runSystemBattleRoute`); дія вимкненого модуля чи невідома — 404 `systemActionUnknown`.

`SystemUi` (`components/systems/types.ts`): обов'язкові `HeroStats`, `StatsTab`, `RollDialogBody`, `StatsFields`, `UnitStatsFields`, `hideProgression`, `battle: SystemBattleUi` (слоти всередині необов'язкові: відсутній слот = відсутня механіка); необов'язкові `MagicTab`, `AdvancementTab`, `DraftForm`, `rulesSections`, `rulesItems`, `forms.fields`, `sheet.{combatRows,pathPanels,itemSections}` тощо. Бойові слоти бази виключні (`HeroStats`, `defense`, `ParticipantStats`, `ConditionsDialog`, `RollBody`…); слоти бази й модулів — списки (`heroPanels`, `badges`, `dialogs`, `notices`); `turnStart { Panel, Label }` — виключна група модуля. Читач — `useSystemBattleUi()`.

Клієнт шле модульні дії бою однією операцією `battleOps.system = { action, body }` (`lib/api/battle-ops.ts`, `useSystemBattleAction`, `BattleSceneActions.system`); типізовані обгортки й типи тіл лежать у власника: `systems/{morale,d20,wfrp}/api/battle.ts`. Лишились нейтральні окремі операції `systemCondition`, `coreAction`.

`PackHooks` (`scripts/templates/systems/types.ts`): `validatePack`, `i18nRows`/`i18nIssues`, `afterImport`, `toPackRow`/`fromPackRow`, `prepareRows`, `normalizeTranslation`.

**D15 (види контенту й композиція).** Вид, чий власник — модуль поза композицією кампанії, прихований: список `[]`, інші дії й імпорт 404, рядки не видаляються. Гейт — `lib/server/content/kind-active.ts` (`isKindActive`/`assertKindActive`); `abilities.sources` — таблиця `{ source, contentKind, load }` із фільтром `isKindActive`; імпорт компендіуму пропускає рядки неактивного виду з попередженням `KIND_INACTIVE`. Sync гейта не проходить.

## Правила зони

- **Зона.** Поза коренями й `system-imports-exempt.json` нічого не імпортує `@/systems/*` (ESLint `systems/zone`).
- **Шари всередині системи** наслідують правила core: `rules/**` = `lib/utils`, `ui/**` = `components`, `hooks/**` = `lib/hooks`, `api/**` = `lib/api`, `server/**` без обмежень шару. Система не імпортує іншу систему (лише теки з `requires`), `@/app/*`, `@/scripts/*`; `meta.ts` — лише `import type`.
- **Контракт** (`lib/__tests__/system-contract.test.ts`): ключі meta = логіка = UI = сервер = `PACK_HOOKS`; кожен namespace meta має файл у `messages/{uk,en}`; `assertSystemContract` проходять і реальні системи, і фікстура `d6pool` (`lib/__tests__/fixtures/d6pool`, `d6pool-plus` — модуль, `d6pool-alt` — той самий `claims`). Матриця композицій — `system-composition-matrix.test.ts`; бій без d20 — `lib/__tests__/d6pool-battle.test.ts` (граф імпортів зупиняється на коренях і не досягає жодного `systems/*`).
- **Гард колонок статблока** `lib/__tests__/statblock-guard.test.ts`: правила core не читають `abilities.<d20-колонка>` (дозволені будівники/мапери `battle/participant`, `battle/store`, `battle/transform`, `abilities/build`); максимум лише падає.
- Блокування: зміна `system.key` у кампанії з `characters`/`units` → 409 `SYSTEM_LOCKED`; зміна `modules` — 422 `SYSTEM_MODULES_INVALID`, 409 `SYSTEM_MODULES_IN_BATTLE` (лише активний бій), 409 `SYSTEM_MODULE_CONFIRM` (`toggle: "setup"`).
- `system` не механіка: вкладки правил = секції композиції.

## Ratchet (після Ч17)

Перегенерація: `pnpm exec tsx scripts/shared/system-ratchet.ts --write`; числа лише падають.

- `system-imports-exempt.json` = `[]` (було 18 в E1, 1 до Ч17).
- `system-literals-exempt.json`: 15 файлів / 56 влучань, лише сховища даних і тексти (`log/codec.ts`, `site.ts`, `whats-new.ts`, `scripts/assets/*`, `scripts/srd/lib/*`, сиди, фікстура `defaults.ts`, назва кубика `'d20'` у `types/characters.ts` і `SheetRollDialog.tsx`). Зростання 29 → 56 влучань у Ч17 — не регрес: пресет `homm` отримав `tokens: ["homm"]`, і скан вперше рахує дані/активи (`build-icon-prompts` 24, `seed-homm5-characters` 7 та ін.); файли core пішли вниз.
- `RULES_SECTION_READERS` (читання `rules.<секція>` у core) = 0 за всіма секціями (пункти, які тримає core, як `encounters.balance/unitGroups`, не рахуються: `OWNED_ITEMS`).
- `LEAK_NAMES`: `isFiveE` 0; поля колишнього dual-read (`channelledSl`, `conditionTests`, `psychologyTested`, `attackedWithLight`, `inspirationSpent`, `retaliationsUsed`) = 1 кожне, лише `scripts/db/lib/battle-state-shapes.ts` (піде з forward-скриптом у Ч18); `HOMM_[A-Z]+` 2 (профілі sweep, виключення зі скану — E3); **`CONDITION_5E_` 11** (словник станів у схемі ефектів core) → E3.
- Гард колонок статблока: 7 файлів (`effects/morale` 1, `attack/bonus` 1, `cunning-strike` 2, `hit-model` 1, `balance/stats` 1, `spell/ability-modifier` 2, `spell/power` 2), ціль 0 → E3.

## Як додати модуль

1. `systems/<id>/meta.ts`: `kind: "addon"`, `requires: ["<база>"]`, за потреби `claims` (скаляр, який модуль замінює), `after`, `toggle`, `tokens`, `i18n`. `index.ts`: `<ID>_MODULE` через `defineAddon`; необов'язкові `ui/index.ts` (`<ID>_MODULE_UI`), `server/index.ts` (`<ID>_MODULE_SERVER`), `scripts/templates/systems/<id>/index.ts` (`<ID>_MODULE_HOOKS`). Шар без UI/server дає порожній внесок.
2. Секції правил: `rules/sections.ts` через `sectionItems`/`extendSection` (шляхи `секція.пункт`, колізія з іншим власником = помилка); колонки — `stats.columns` з `owns`; хуки бою/персонажа — списки (`participant.*`, `turn.*`, `afterAttack`, `damageParts`); стан — лише `ext[<id>]` слота бази (`SlotCodec.extend`).
3. Види контенту — `SystemServer.contentKinds` (підпадають під D15); маршрути — `SystemServer.routes`; бойові дії — `SystemServer.battle` + обгортка `systems/<id>/api/battle.ts` над `actions.system(action, body)`.
4. Тексти `gameTerms.module.<id>.{name,summary}` і namespace-и з meta в `messages/{uk,en}`; рядок у `whats-new`, коли є користувацька зміна.
5. `pnpm systems:index`; звірити `system-contract`, `systems-index`, `system-composition-matrix`, `module-toggle-d16`, `content-kinds-contract`, `stat-columns-contract`, `system-literals`.

## Як додати базу

Мінімальний приклад — фікстура `d6pool` (`lib/__tests__/fixtures/d6pool/{definition,meta,server,ui}.ts`): пул d6 без d20 проходить `assertSystemContract` і `d6pool-battle`.

1. `systems/<id>/meta.ts` (`kind` типово `base`, `keys`, `i18n`, `distance`, `tokens`, `dmSections`), `index.ts` (`<ID>_SYSTEM` з усіма обов'язковими хуками з таблиці вище: `progression`, `combat`, `conditionSet`, `magic`, `characteristics`, `sheetTest`, `rest`, прапорці), `rules/rules-preset.ts`, `ui/index.ts` (обов'язкові слоти `SystemUi`, `battle: {}` допустимо порожнім), `server/index.ts`, `rules/ability-effects.ts` + `ability-effect-rows.ts` за потреби; для пакета — `scripts/templates/systems/<id>/index.ts` (`<ID>_HOOKS`, адаптер — `scripts/templates/<key>/index.ts`).
2. `pnpm systems:index`; ESLint-зони й ratchet підхоплюють теку автоматично.
3. `gameTerms.ruleSystem.<key>`, `messages/{uk,en}/<ns>.json` для кожного namespace з meta; пресет правил (без секцій addon-ів); запис у `whats-new` і help.
4. Перевірки: `system-contract`, `systems-index`, `rules-presets-contract`, `stat-columns-contract`, `system-literals`; бій — тест на кшталт `d6pool-battle` (start, attack у 0 HP, next-turn без хуків d20). Новий шаблон додається разом зі своїм профілем `battle-sweep`.
5. Нове поле хука: поле в `RuleSystemDefinition` (або `SystemUi`/`SystemServer`/`PackHooks`), нейтральна поведінка core без нього, реалізація в `systems/d20`, виклик лише через `ruleSystemOf`/`systemUiOf`/`systemServerOf`; рядок у таблицю вище.
6. Що досі потребує правок core для нової бази: вид контенту = запис у `CONTENT_KINDS` + Prisma-таблиця (expand-only з RLS) + `ContentKindDef`; нейтральні за змістом, але wfrp-подібні поняття (`fortune: "reroll" | "sl"` у `attack-phase/request.ts`, `flows/attack-flow.ts`, `turn/join-triggers.ts`); словник станів `CONDITION_5E_` у схемі ефектів (E3); міграції Prisma для нових колонок.

## Wfrp: що де лежить

`systems/wfrp/`: `meta.ts`, `index.ts` (`WFRP_MODULE`), `rules/` (`percentile`, `characteristics`, `skills`, `conditions`, `magic`, `tables`, `traits`, `downtime`, `corruption`, `advancement`, `creation`, `equipment`, `combat`, `slots.ts`, `state.ts`, `sections.ts`, `rules-preset.ts`), `constants/`, `server/` (`WFRP_MODULE_SERVER`, `operations/`, `draft/`, `*-handler.ts`), `api/`, `hooks/`, `ui/` (`WFRP_MODULE_UI`), `__tests__/`; пакет Grim d100 — `scripts/templates/systems/wfrp/`. Межі й нечислові припущення рушія (перелік «Звірити з книгою») — в архівному файлі історії.
