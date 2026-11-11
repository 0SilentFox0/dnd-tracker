# WFRP 5g-2: бестіарій шаблону Grim d100 — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Без per-task рев'ю: одне фінальне Opus-рев'ю гілки після Task 8. Виконавці — Sonnet у свіжій сесії; групи диспетчеризації — у розділі «Групи диспетчеризації».

**Goal:** `data/templates/grim-d100/units.json` містить 30 оригінальних юнітів (6 тем × 4 рівні загрози) з wfrp-характеристиками й Traits 5h-1, валідатор і `grimCoverage` їх перевіряють, а `pnpm constructor:grim-template` публікує шаблон, клон якого несе `abilities`/`characteristics`/`statblock` юнітів і дає бій героїв 5g-1 проти юнітів до кінця.

**Architecture:** Рушій Traits, міграції й UI не змінюються. Імпорт контенту (`IMPORT_SPECS.units`) отримує JSON-колонку `characteristics` (без неї завантажувач губить характеристики юнітів), legacy `POST /units/import` (`importUnitSchema`) — поле `abilities` і ту саму перевірку Traits, що й ресурс (спільний `assertTraitsSupported`). Перевірки бестіарію живуть у новому `scripts/grim/units.ts` (діапазони за рівнем, формула Wounds, «здібність = вихід рецепта Trait»), їх викликають валідатор і `grimCoverage`. Усі імена й числа юнітів — лише з розділу «Ростер», виконавці їх не вигадують.

**Tech Stack:** TypeScript (tsx-скрипти), Zod (`createUnitSchema`, `importUnitSchema`, `AbilitySchema`), `IMPORT_SPECS`/`importContent`, `TRAIT_RECIPES` 5h-1, Vitest, Prisma (лише інтеграційний тест), JSON-дані.

**Spec:** `docs/superpowers/specs/2026-11-10-wfrp-5g2-design.md` (з розділом «Уточнення за кодом (план, 2026-11-10)»); читати разом із `docs/architecture/rule-systems.md` («Межі 5h-1», «Межі 5g-0», «Межі 5g-1», «Звірити з книгою»).

## Global Constraints

- Коміти лише на `feat/wfrp` у worktree `/Users/silentfox/Work/dnd-tracker-wfrp`; не мерджити й не пушити (WFRP off main до кінця епіку). Кінцевий рядок коміту — `Co-Authored-By` моделі-виконавця.
- Виконує Sonnet; per-task рев'ю немає, одне фінальне Opus-рев'ю в кінці, одна хвиля виправлень, потім `/simplify` по diff гілки (1–2 агенти).
- Тести лише вузько: `pnpm test:run <файл>`, `pnpm test:related <файли>`; eslint лише `pnpm exec eslint --fix <змінені .ts>`. Повний `pnpm test:run` і repo-wide `pnpm lint` НЕ запускати (це pre-deploy гейт епіку). Перед будь-яким прогоном перевірити `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`; прогін > ~5 хв — убити й звузити.
- Контент англійською (назви юнітів і здібностей), проза плану й доків — українська. Жодних GW-термінів і впізнаваних назв істот GW (див. `scripts/grim/forbidden-terms.ts` і Task 3); сканер — захід, не гарантія.
- Нових ефектів, механік Traits, полів Prisma, міграцій немає. Ефекти здібностей юнітів — лише вихід рецептів `TRAIT_RECIPES` (`wfrpArmour`, `wfrpWard`, `wfrpSize`, `wfrpPsychology`, `wfrpAttack`, `heal` у Regenerate, `flag` у Night Vision, `note` у Undead/Hardy/Flier/Swarm).
- `units.json`: `knownSpells` і `raceId` відсутні (заклинання юнітів — 5g-3), `attacks` відсутні (атаки — лише Trait-атаки), `avatar` відсутній (іконки — 5g-4).
- Нові тексти `messages` — лише підпис колонки `contentImport.fields.units.characteristics` (uk/en). `scope-size` і бюджет OpenAPI (195000) піднімати лише якщо відповідний тест падає, на мінімально потрібну величину з коментарем «5g-2 …».
- Імпорти `@/…`, `import/no-cycle` увімкнено; коментарі мінімальні (лише неочевидне «чому»).
- Кожен коміт після Task 5 лишає `pnpm test:run scripts/grim/__tests__/real-data.test.ts` зеленим.

## Review Focus

1. **Traits у не-wfrp кампанії через імпорт.** Legacy `POST /units/import` у homm/dnd5e з `abilities`, що містить `wfrpWard`, мусить дати 400 і нічого не створити; той самий рядок у wfrp — створитися з `abilities` і `characteristics`. Генеричний імпорт (`importContent`) відхиляє рядок через ресурс. Тести: Task 2 (`units-import-api.test.ts`, `import-content.test.ts`; ресурс уже покритий `units-resource.test.ts`).
2. **Повторний запуск завантажувача.** Схема нормалізує `characteristics` (доповнює `advances`, `skillAdvances`, `fate`…); якщо нормалізація неідемпотентна, другий запуск дасть `~N` і новий `contentVersion`. Очікування: другий запуск — `created: false`, той самий `contentVersion`, ті самі кількості рядків, включно з `units`. Тест: Task 7 (інтеграційний «a second run is a no-op»).
3. **Хибні спрацювання сканера.** «moot point», «gore», «Copper Hound», «Grave Touch» не мають давати помилку; «the Moot», «Gors», «Flesh Hounds» — мають. Тест: Task 3 (`forbidden-terms.test.ts`).
4. **Здібність, що проходить `AbilitySchema`, але не є виходом рецепта** (броня з різними локаціями, id `"terror"`, Regenerate з `passive`, Breath без `rangeFt`, дубль id). Рушій частково прочитав би її інакше, ніж показує галерея рецептів. Очікування: помилка валідатора. Тест: Task 3.
5. **Розбіжність похідних колонок.** `speed`/`initiative` у бою беруться з характеристик (`wfrpBaseStats`), `maxHp` — з колонки; бібліотека показує колонки. Очікування: валідатор вимагає `initiative = I`, `speed = move × 6`, `gridSize` за Size, `maxHp` = формула Wounds; e2e перевіряє, що учасник бою має ті самі `maxHp`/`speed`/`gridSize`/ініціативу. Тести: Task 3, Task 6.

## Перевірки коду (крок 3 доручення; Task 1 їх відтворює)

| # | Твердження | Результат |
|---|---|---|
| a | `unit.level` не читається wfrp-правилами / XP / балансом | **Читається, але як «тір», і це сумісно з рівнем загрози.** wfrp має `balance: { kind: "fair" }`; `lib/utils/battle/balance/fair.ts` групує юнітів за `u.level` (`byTier`, `ceilingFor(unit.level)`, сусіди ±1), `unit-library.ts`/`stats.ts`/`setup.ts` передають `level`, бібліотека групує за ним («тір»), `from-unit.ts` пише `abilities.level` і для не-монстра `spellSaveDC = saveDcBase + prof + level` (у wfrp юніти без заклинань і DC не використовують), `flat.ts` дає `hero_level`/`class_level` формулам (рецепти Traits формул не мають), `ability-summons.ts` шукає за тіром. XP не читає (`unitXp` — лише `xp`/`cr`). У `lib/utils/rules/systems/wfrp/` рівень юніта не читається. Висновок: `level` = рівень загрози 1–4 лишається (spec ризик 1 закрито без зміни поля). |
| b | Хеші bundle/sync включають `abilities`/`characteristics`/`statblock` | **Так.** `BUNDLE_TABLES` (`lib/server/templates/bundle.ts`) бере `Prisma.UnitScalarFieldEnum` мінус `campaignId/createdAt/updatedAt/sourceId/sourceHash`; Json-колонки `abilities`, `characteristics`, `statblock` — скалярні. `rowHash` → `contentRowHash` (`lib/utils/content/row-hash.ts`) хешує їх; `characteristics` за замовчуванням (`{}` або `DEFAULT_CHARACTERISTICS`) не входить у хеш. Шаровий шаблон має `units_base` (`UnitBase`) — інтеграційне прибирання мусить чистити й його. |
| c | Форма `characteristics` юніта й Wounds/maxHp/speed/gridSize | `UnitCharacteristicsSchema` = `CharacteristicsSchema` без `corruption`: `base` — **10** ключів `CHARACTERISTIC_KEYS` (`ws, bs, s, t, i, ag, dex, int, wp, fel`; не 8), 1–100, пропущені заповнюються 30; `move` 1–12 (дефолт 4); решта (`advances`, `skillAdvances`, `fate`, `extraWounds`, `talents`, `ledger`…) з дефолтами. У бою: `maxHp` = колонка `units.maxHp` (похідних Wounds для юнітів немає, `progression.maxHp` — лише для героїв); ініціатива = `value(c, "i")`, швидкість = `walkYards × 3` = `move × 6` (`wfrpBaseStats`), колонки `initiative`/`speed` бій ігнорує; `gridSize` — колонка. План фіксує: `maxHp` = формула Wounds (нижче), `initiative = base.i`, `speed = move × 6`, `gridSize` за Size. |
| d | Як імпорт і OpenAPI/tool-схеми бачать поля юніта | Два шляхи. (1) **Генеричний імпорт** JSON/CSV (`importContent` ← `IMPORT_SPECS.units` ← `UNITS_IMPORT`), саме ним користується `loadGrimTemplate`: тіло перевіряє `createUnitSchema`, пише `unitsResource.create/update` (уже має `assertTraitsSupported` і `keepsCharacteristics`). `abilities` уже є (`abilitiesText`, JSON-масив передається як є), **`characteristics` немає**: `coerceRecord` відкидає ключ як `unknownField` (у `validateGrimData` це помилка, в `importContent` — тихе відкидання). Потрібна колонка `jsonField("characteristics")` + підпис у `messages/{uk,en}/contentImport.json` (тест `label-keys-contentImport` вимагає підпис і зворотне зіставлення). (2) **Legacy** `POST /units/import` (операція `units.import`, тіло `importUnitsSchema`, `importUnitsIntoCampaign`/`toUnitCreateData`; також `scripts/import/import-units.ts` з CSV без колонки здібностей): `abilities` немає (лише `specialAbilities` → note), `characteristics` є (лише wfrp). OpenAPI: `units.import` бере `importUnitsSchema`; ресурсні `UnitsCreate/Update` уже мають `abilities` (`$ref Ability`) і `characteristics`; AI/MCP tool-схеми будуються з ресурсів (`tool-schemas.ts`) — змін не потребують. Додавання `abilities` у `importUnitSchema` — `$ref`, ≈0.1 KB до OpenAPI (зараз ≈193.7 KB при бюджеті 195000). |
| e | Рецепти й форма JSON здібностей | `TRAIT_RECIPES` (`wfrp/traits/recipes.ts`), 14 рецептів: `armour(ap)`, `ward(value)`, `size(size)`, `fear(psychology, value)` (Fear і Terror — один рецепт), `regenerate` (тригер `turnStart`, `heal 1d10 self`), `bite/claw/weapon(damage, magical)`, `breath(damage, rangeFt, magical)`, `nightVision` (`flag sense darkvision 60`), note-рецепти `undead`, `hardy`, `flier`, `swarm` (`note` з текстом = назва). `build` повертає `{ ability: { name, trigger, effects } }` без `id`; `AbilitySchema` вимагає `id`. Конвенція плану: `id` = id рецепта (`"fear"` і для Terror), `name` — з «Ростеру». Перевірено прогоном рецептів: кожен вихід проходить `AbilitySchema` без змін (парсинг не додає полів). |

Приклади (дослівний вихід рецептів + `id`):

```json
{ "id": "armour", "name": "Armour 3", "trigger": { "event": "passive" }, "effects": [{ "kind": "wfrpArmour", "head": 3, "body": 3, "arm": 3, "leg": 3 }] }
```

```json
{ "id": "fear", "name": "Terror 2", "trigger": { "event": "passive" }, "effects": [{ "kind": "wfrpPsychology", "psychology": "terror", "value": 2 }] }
```

```json
{ "id": "regenerate", "name": "Regenerate", "trigger": { "event": "turnStart" }, "effects": [{ "kind": "heal", "amount": "1d10", "target": "self" }] }
```

```json
{ "id": "breath", "name": "Breath +9", "trigger": { "event": "passive" }, "effects": [{ "kind": "wfrpAttack", "attack": "breath", "damage": 9, "rangeFt": 36 }] }
```

```json
{ "id": "nightVision", "name": "Night Vision", "trigger": { "event": "passive" }, "effects": [{ "kind": "flag", "flag": "sense", "sense": "darkvision", "range": 60 }] }
```

Magical — поле `"magical": true` в ефекті `wfrpAttack` (рецепт пише його лише при `magical: "yes"`; `"no"` — поля немає).

## Рішення (закриття «Відкрито для plan» spec)

### Рішення 1. Helper спільного предиката

Новий `lib/server/content/traits-guard.ts` (`server-only`): `hasTraitEffect(abilities)` і `assertTraitsSupported(system, abilities)` (переїжджає з `resources/units.ts` без зміни поведінки). Використовують `unitsResource.create/update` і операція `units.import` (`operation-service.ts`). Генеричний імпорт іде через ресурс, окремого виклику не потребує.

### Рішення 2. Бюджет OpenAPI

Не піднімається наперед: `abilities` в `importUnitSchema` — `$ref` (≈0.1 KB, запас ≈1.3 KB). Якщо `openapi*.test.ts` упаде на розмірі — підняти 195_000 → 196_000 у трьох файлах з коментарем «5g-2 units.import abilities».

### Рішення 3. Формула Wounds юніта (`maxHp`)

`SB`, `TB`, `WPB` = десятки `base.s`, `base.t`, `base.wp`. За Size: `tiny` = 1; `little` = TB; `small` = 2·TB + WPB; `average` (без Trait Size) = SB + 2·TB + WPB; `large` = ×2 від average; `enormous` = ×4; `monstrous` = ×8. Swarm: × 5. Hardy: + TB (після множників). `maxHp` = результат (мінімум 1). Власні числа шаблону (у «Звірити з книгою»); Hardy і Swarm механічно інертні в рушії 5h-1, тож їхній вплив запечено в `maxHp`.

### Рішення 4. Похідні колонки

`initiative` = `base.i`; `speed` = `move × 6` (як `wfrpBaseStats`); `gridSize`: `tiny…average` → 1, `large` → 2, `enormous`/`monstrous` → 3. Решта колонок (`strength…charisma`, `armorClass`, `proficiencyBonus`…) не пишуться (дефолти схеми, у wfrp-бою не читаються).

### Рішення 5. Діапазони за рівнем загрози (перевіряє валідатор)

Рівень: 1 Fodder, 2 Standard, 3 Elite, 4 Boss. Характеристика — кожна з 10; «бойова» = max(ws, bs); атака — `bite/claw/weapon`; Fear/Terror — значення, не вид.

| Рівень | Характеристики | Бойова | Wounds | Armour | Ward | Fear/Terror ≤ | Атака +X | Breath +X | Regenerate | Magical |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 Fodder | 5–45 | 20–45 | 3–14 | 0–1 | — | 1 | 1–5 | — | ні | ні |
| 2 Standard | 5–55 | 30–55 | 8–24 | 0–2 | — | 2 | 2–7 | — | так | ні |
| 3 Elite | 5–65 | 40–65 | 15–45 | 0–4 | 9–10 | 3 | 4–9 | 6–10 | так | так |
| 4 Boss | 5–80 | 50–80 | 24–120 | 1–6 | 7–9 | 4 | 6–12 | 7–12 | так | так |

Розміщення (попередження `grimCoverage`, не помилка): Terror лише на рівнях 3–4; Boss має Magical або Breath; у межах теми середні Wounds строго зростають з рівнем, максимальна Armour не спадає; кожна тема й кожен рівень мають юніта; кожен юніт має атаку; кожен Trait реєстру (14 рецептів + `terror` + `magical`) використаний.

### Рішення 6. Атаки

`unitAttackSchema` не має wfrp-профілю, тож атаки юнітів — лише Trait-атаки (`bite/claw/weapon` — ближній бій з SB, `breath` — Blast, без SB). Колонка `attacks` у `units.json` заборонена валідатором. Дистанційних атак, крім Breath, 5g-2 не має (зброя юнітів — поза 5g-2).

### Рішення 7. Описи

У `Unit` немає поля опису; однорядкові описи з «Ростеру» лишаються в плані (для рев'ю й 5g-4: іконки, uk-overlay) і в `units.json` не пишуться.

## Ростер (єдине джерело імен і чисел)

Характеристики — `ws / bs / s / t / i / ag / dex / int / wp / fel`. `move` → `speed = move × 6`; `init` = I. Traits: `bite:`/`claw:`/`weapon:`/`breath:` — атака-Trait з назвою здібності; `magical` — `"magical": true`. Armour X — усі 4 локації. Розподіл: кожна тема — рівні 1/2/2/3/4, крім Restless Dead і Horrors — 1/2/3/3/4.

| name | тема | рів. | характеристики | move | Wounds (`maxHp`) | `speed` | `gridSize` | Traits | опис |
|---|---|---|---|---|---|---|---|---|---|
| Bog Leech Swarm | Beasts | 1 | 25 / 5 / 10 / 15 / 30 / 25 / 5 / 5 / 10 / 5 | 3 | 5 | 18 | 1 | Size (Little), Swarm, bite: Bite +2 | A writhing carpet of fist-sized leeches that boils out of stagnant fen water. |
| Ash Hound | Beasts | 2 | 38 / 5 / 30 / 30 / 40 / 40 / 5 / 12 / 25 / 5 | 7 | 11 | 42 | 1 | Night Vision, bite: Bite +4 | Grey, soot-coated dogs that hunt along burnt hillsides in loose packs. |
| Thornback Boar | Beasts | 2 | 40 / 5 / 40 / 40 / 25 / 30 / 5 / 10 / 30 / 5 | 7 | 19 | 42 | 1 | Armour 1, Hardy, bite: Tusks +5 | A bristling forest boar whose spine grows a ridge of horn-hard quills. |
| Dusk Stalker | Beasts | 3 | 55 / 5 / 45 / 40 / 55 / 50 / 5 / 15 / 35 / 5 | 8 | 30 | 48 | 2 | Armour 1, Size (Large), Fear 1, Night Vision, claw: Claw +6 | A great maned cat that only leaves its den when the light turns red. |
| Cinder Drake | Beasts | 4 | 62 / 40 / 60 / 58 / 45 / 30 / 10 / 25 / 55 / 15 | 6 | 84 | 36 | 3 | Armour 4, Size (Enormous), Terror 2, Flier, Night Vision, claw: Claw +8, breath: Breath +9 (36 ft) | An old winged reptile with a furnace in its chest, nesting in collapsed mines. |
| Ditch Cutthroat | Raiders | 1 | 32 / 28 / 30 / 30 / 32 / 33 / 28 / 25 / 25 / 22 | 4 | 11 | 24 | 1 | weapon: Weapon +4 | A hungry roadside robber with a notched knife and nothing to lose. |
| Ridge Reaver | Raiders | 2 | 42 / 30 / 35 / 35 / 38 / 38 / 30 / 28 / 32 / 25 | 4 | 12 | 24 | 1 | Armour 1, weapon: Weapon +5 | A mounted-band regular in boiled leather who knows every goat path. |
| Scarred Brute | Raiders | 2 | 40 / 20 / 45 / 45 / 28 / 28 / 22 / 20 / 30 / 18 | 4 | 19 | 24 | 1 | Hardy, weapon: Weapon +6 | A slab of a man who carries a door-breaking maul and shrugs off cuts. |
| Broadhelm Captain | Raiders | 3 | 52 / 38 / 42 / 45 / 45 / 40 / 32 / 35 / 48 / 40 | 4 | 16 | 24 | 1 | Armour 3, weapon: Weapon +7 | A deserter officer who still drills his band like a company of the line. |
| Red Banner Warlord | Raiders | 4 | 65 / 42 / 50 / 52 / 55 / 45 / 35 / 40 / 60 / 50 | 4 | 26 | 24 | 1 | Armour 4, Fear 2, Hardy, weapon: Runed Cleaver +9 magical | The feared chief of the valley bands, carrying a cleaver etched with old runes. |
| Mire Skeleton | Restless Dead | 1 | 28 / 20 / 30 / 30 / 20 / 22 / 15 / 10 / 20 / 5 | 4 | 11 | 24 | 1 | Fear 1, Undead, Night Vision, weapon: Weapon +4 | Peat-stained bones that rise from drowned battlefields still gripping rusted blades. |
| Barrow Shambler | Restless Dead | 2 | 35 / 5 / 40 / 40 / 15 / 18 / 10 / 8 / 25 / 5 | 3 | 14 | 18 | 1 | Fear 1, Undead, Night Vision, bite: Bite +4 | A bloated corpse that drags itself out of a broken burial mound to feed. |
| Lantern Wraith | Restless Dead | 3 | 45 / 5 / 30 / 45 / 50 / 50 / 10 / 30 / 55 / 10 | 6 | 16 | 36 | 1 | Ward 9+, Terror 1, Undead, Flier, Night Vision, claw: Grave Touch +6 magical | A drifting shade that carries a cold green light and lures travellers into bogs. |
| Oathbound Revenant | Restless Dead | 3 | 58 / 30 / 45 / 50 / 38 / 35 / 25 / 25 / 50 / 15 | 4 | 19 | 24 | 1 | Armour 3, Fear 2, Undead, Night Vision, weapon: Weapon +7 | A knight in corroded mail, bound by a broken vow to guard one road forever. |
| Hollow Queen | Restless Dead | 4 | 68 / 35 / 50 / 60 / 60 / 55 / 40 / 50 / 75 / 45 | 5 | 24 | 30 | 1 | Armour 3, Ward 8+, Terror 3, Undead, Night Vision, weapon: Thorn Sceptre +9 magical | A dead ruler enthroned beneath a sunken hall, served by everything buried nearby. |
| Ember Acolyte | Cultists | 1 | 30 / 25 / 28 / 28 / 30 / 30 / 30 / 30 / 30 / 30 | 4 | 9 | 24 | 1 | weapon: Weapon +3 | A recruit of a fire-worshipping sect, armed with a sickle and fervour. |
| Ashen Zealot | Cultists | 2 | 40 / 25 / 35 / 38 / 35 / 35 / 30 / 28 / 45 / 30 | 4 | 16 | 24 | 1 | Hardy, weapon: Weapon +5 | A sect fanatic who smears ash on his skin and fights through any wound. |
| Brand Bearer | Cultists | 2 | 42 / 25 / 38 / 40 / 32 / 32 / 28 / 28 / 40 / 32 | 4 | 15 | 24 | 1 | Armour 2, Fear 1, weapon: Weapon +5 | A masked enforcer who carries the sect's glowing iron brand into battle. |
| Masked Oracle | Cultists | 3 | 45 / 30 / 35 / 42 / 50 / 42 / 40 / 55 / 62 / 50 | 4 | 17 | 24 | 1 | Armour 2, Ward 9+, Fear 2, weapon: Smoke Blade +6 magical | A seer in a featureless brass mask whose knife leaves trails of smoke. |
| Gilded Voice | Cultists | 4 | 55 / 40 / 40 / 55 / 60 / 50 / 45 / 65 / 78 / 70 | 4 | 26 | 24 | 1 | Armour 2, Ward 7+, Terror 2, Hardy, weapon: Gilded Staff +7 magical, breath: Ember Breath +8 (30 ft) magical | The sect's prophet, whose sermons end in a breath of living cinders. |
| Clay Drudge | Constructs | 1 | 30 / 5 / 35 / 35 / 15 / 15 / 10 / 5 / 15 / 5 | 3 | 13 | 18 | 1 | Armour 1, Hardy, weapon: Fists +3 | A crude labourer of baked clay that keeps working long after its maker died. |
| Copper Hound | Constructs | 2 | 40 / 5 / 35 / 40 / 40 / 40 / 5 / 10 / 30 / 5 | 7 | 14 | 42 | 1 | Armour 2, Night Vision, bite: Bite +4 | A ticking guard dog of riveted copper plates with glass eyes. |
| Iron Watchman | Constructs | 2 | 45 / 5 / 45 / 50 / 25 / 25 / 15 / 10 / 35 / 5 | 4 | 22 | 24 | 1 | Armour 2, Hardy, weapon: Halberd +6 | A hollow suit of iron that patrols a vault on a fixed circuit. |
| Stonebound Sentinel | Constructs | 3 | 55 / 5 / 55 / 55 / 30 / 25 / 15 / 10 / 40 / 5 | 4 | 43 | 24 | 2 | Armour 4, Size (Large), Fear 1, Hardy, weapon: Stone Fist +8 | A carved gate statue that steps down from its plinth when the seal is broken. |
| Forge Colossus | Constructs | 4 | 65 / 30 / 70 / 70 / 30 / 20 / 20 / 15 / 50 / 5 | 5 | 111 | 30 | 3 | Armour 6, Size (Enormous), Terror 2, Hardy, weapon: Hammer Arm +11, breath: Furnace Vent +8 (24 ft) | A walking smelter of black iron that vents molten slag at anything in its path. |
| Gloom Mite Swarm | Horrors | 1 | 30 / 5 / 10 / 20 / 35 / 35 / 5 / 5 / 15 / 5 | 5 | 10 | 30 | 1 | Size (Little), Swarm, Night Vision, bite: Bite +2 | A cloud of pale, biting mites that pours out of cracks in deep cellars. |
| Pallid Crawler | Horrors | 2 | 42 / 5 / 35 / 35 / 45 / 45 / 10 / 15 / 30 / 5 | 6 | 12 | 36 | 1 | Fear 1, Night Vision, claw: Claw +5 | An eyeless, long-limbed thing that clings to cave ceilings and drops on prey. |
| Many-Mouthed Thing | Horrors | 3 | 50 / 5 / 50 / 50 / 25 / 25 / 10 / 10 / 45 / 5 | 4 | 38 | 24 | 2 | Size (Large), Terror 1, Regenerate, Night Vision, bite: Bite +7 | A heaving mass of flesh covered in mouths that knits shut every wound. |
| Veil Stalker | Horrors | 3 | 55 / 5 / 40 / 40 / 55 / 55 / 20 / 30 / 50 / 5 | 7 | 17 | 42 | 1 | Ward 9+, Fear 2, Flier, claw: Rending Claw +6 magical | A flickering hunter that slips half out of the world between strikes. |
| Hunger Below | Horrors | 4 | 70 / 5 / 75 / 70 / 40 / 30 / 10 / 30 / 70 / 5 | 4 | 119 | 24 | 3 | Armour 3, Size (Enormous), Terror 3, Regenerate, Hardy, Night Vision, bite: Devouring Maw +12 magical | A vast burrowing maw that sleeps under old towns and wakes famished. |

Перевірено скриптом при складанні: усі 30 рядків проходять `createUnitSchema`, діапазони Рішення 5, формулу Wounds, похідні колонки, «вихід рецепта», порожнє покриття (теми, рівні, усі 16 ключів Traits, Terror ≥ 3, боси з Magical/Breath, зростання Wounds і Armour у темах) і сканер заборонених термінів (з доповненням Task 3).

## Структура файлів

- Створюються: `lib/server/content/traits-guard.ts`, `scripts/grim/units.ts`, `scripts/grim/__tests__/forbidden-terms.test.ts`, `scripts/grim/__tests__/units.test.ts`, `scripts/grim/__tests__/bestiary-e2e.test.ts`, `data/templates/grim-d100/units.json`.
- Змінюються: `lib/schemas/units.ts`, `lib/utils/units/import-units.ts`, `lib/server/content/resources/units.ts`, `lib/server/content/operation-service.ts`, `lib/utils/content/import/fields/units.ts`, `messages/{uk,en}/contentImport.json`, тести `lib/utils/units/__tests__/import-units.test.ts`, `app/api/__tests__/units-import-api.test.ts`, `lib/server/content/__tests__/import-content.test.ts`; `scripts/grim/{forbidden-terms,validate-data,coverage}.ts`, фікстура `scripts/grim/__tests__/fixtures/units.json`, `scripts/grim/__tests__/{validate-data,coverage,real-data}.test.ts`, `scripts/grim/__tests__/{real-data,load-template}.integration.test.ts`, `data/templates/grim-d100/manifest.json`; доки `docs/architecture/rule-systems.md`, `docs/architecture/content-api.md`, `docs/STATUS.md`.

## Групи диспетчеризації

| Група | Задачі | Примітка |
|---|---|---|
| A | Task 1 + Task 2 | перевірка, потім імпорт |
| B | Task 3 + Task 4 | валідатор, сканер, покриття |
| C | Task 5 | дані (6 кроків за темами, один коміт) |
| D | Task 6 | e2e бою |
| E | Task 7 + Task 8 | інтеграція на БД `wfrp`, CLI-смоук, доки |

Після E — фінальне Opus-рев'ю, одна хвиля виправлень, `/simplify` по diff (від `515020caf`).

---

### Task 1: Перевірка тверджень плану (без змін коду)

**Files:** немає (лише читання). Якщо будь-який результат розходиться з очікуваним — зупинитися й повідомити контролера, не продовжувати Task 2.

**Interfaces:**
- Consumes: нічого.
- Produces: підтвердження розділу «Перевірки коду».

- [ ] **Step 1: (a) `unit.level`.**

```bash
cd /Users/silentfox/Work/dnd-tracker-wfrp
grep -rnE "unit\.level|u\.level|\.unit\.level" lib | grep -v __tests__
grep -rn "\.level\b" lib/utils/rules/systems/wfrp | grep -v __tests__
grep -n "export function unitXp" -A4 lib/utils/units/monster.ts
grep -n "balance:" lib/utils/rules/systems/wfrp/index.ts
```

Expected: перший — лише `balance/{balance-get,stats,unit-library,fair,setup}.ts`, `battle/participant/from-unit.ts` (рядки `spellSaveDC` і `level: unit.level`), `battle/summon/ability-summons.ts`, `units/{import-units,unit-form,group-units,monster,drag}.ts`, `hooks/battles/setup/useNewBattleData.ts`; другий — лише `downtime/endeavours.ts` (`status.level`) і `conditions/test-mod.ts` (рівень стану); `unitXp` читає лише `xp`/`cr`; `balance: { kind: "fair" }`.

- [ ] **Step 2: (b) хеші bundle.**

```bash
grep -n "EXCLUDED_COLUMNS\|table(\"units\"" lib/server/templates/bundle.ts
grep -n "Unit" lib/utils/content/row-hash.ts
awk '/^model Unit \{/,/^\}/' prisma/schema.prisma | grep -E "abilities|characteristics|statblock"
awk '/^model UnitBase \{/,/^\}/' prisma/schema.prisma | grep -E "@@map|sourceCampaignId"
```

Expected: `EXCLUDED_COLUMNS` = `campaignId, createdAt, updatedAt, sourceId, sourceHash`; `table("units", "Unit", "unit")`; `row-hash` видаляє лише дефолтні `characteristics`; три Json-колонки в `Unit`; `UnitBase` → `units_base` з `sourceCampaignId`.

- [ ] **Step 3: (c) форма характеристик і похідні.**

```bash
grep -n "CHARACTERISTIC_KEYS =" lib/constants/wfrp-characteristics.ts
grep -n "UnitCharacteristicsSchema\|move:" lib/utils/rules/systems/wfrp/characteristics/schema.ts
grep -n "export function wfrpBaseStats" -A5 lib/utils/rules/systems/wfrp/combat/participant.ts
grep -n "maxHp: unit.maxHp\|speed: ruleSystemOf" lib/utils/battle/participant/from-unit.ts
```

Expected: 10 ключів; `UnitCharacteristicsSchema = CharacteristicsSchema.omit({ corruption: true })`, `move` 1–12; `initiative: value(c, "i"), speed: walkYards(c) * 3`; `maxHp: unit.maxHp`.

- [ ] **Step 4: (d) поля імпорту.**

```bash
grep -n "key:" lib/utils/content/import/fields/units.ts | grep -c characteristics
grep -n "abilities\|characteristics" lib/schemas/units.ts | sed -n '1,40p'
grep -n "units.import" lib/server/content/operations.ts lib/server/content/operation-service.ts
grep -n "unknownField" lib/utils/content/import/mapping.ts
```

Expected: `0` (колонки `characteristics` у `UNITS_IMPORT` немає); у `importUnitSchema` є `characteristics`, немає `abilities` (лише у `createUnitSchema`/`updateUnitSchema`); `units.import` → `importUnitsSchema` → `importUnitsIntoCampaign`; `coerceRecord` дає `unknownField` для невідомого ключа.

- [ ] **Step 5: (e) рецепти.** `grep -n "passive(\"\|attack(\"\|note(\"\|id: \"regenerate\"" lib/utils/rules/systems/wfrp/traits/recipes.ts` — Expected: 14 рецептів (`armour, ward, size, fear, regenerate, bite, claw, weapon, breath, nightVision, undead, hardy, flier, swarm`), `regenerate` з `trigger: { event: "turnStart" }`.

- [ ] **Step 6:** Нічого не комітити; у звіті групи A — «Task 1: усі 5 перевірок збіглися» (або розбіжність).

### Task 2: Імпорт юніта несе `abilities` і `characteristics`, спільна перевірка Traits

**Files:**
- Create: `lib/server/content/traits-guard.ts`
- Modify: `lib/server/content/resources/units.ts`, `lib/server/content/operation-service.ts`, `lib/schemas/units.ts`, `lib/utils/units/import-units.ts`, `lib/utils/content/import/fields/units.ts`, `messages/uk/contentImport.json`, `messages/en/contentImport.json`
- Test: `lib/utils/units/__tests__/import-units.test.ts`, `app/api/__tests__/units-import-api.test.ts`, `lib/server/content/__tests__/import-content.test.ts`

**Interfaces:**
- Consumes: `isTraitEffectKind` (`@/lib/utils/abilities/schema/kinds`), `ContentError`, `API_ERRORS.SYSTEM_TRAITS_UNSUPPORTED`, `RuleSystemDefinition`, `ruleSystemOf` (`@/lib/utils/rules/systems/registry`), `loadRules`, `specialAbilitiesToAbilities`, `nameKey`.
- Produces:
  - `export const hasTraitEffect = (abilities: readonly { effects: readonly { kind: string }[] }[] | undefined): boolean` і `export function assertTraitsSupported(system: Pick<RuleSystemDefinition, "traits"> | null, abilities: …same… | undefined): void` (`traits-guard.ts`).
  - `importUnitSchema.abilities: AbilitiesSchema.optional()`; `ImportUnitRow.abilities?: Ability[]`.
  - `UNITS_IMPORT` має поле `{ key: "characteristics", type: "json" }` (Task 3, 5, 6, 7 на нього спираються: без нього `validateGrimData` дає `unknownField`).

- [ ] **Step 1: Падаючі тести.**

`lib/utils/units/__tests__/import-units.test.ts` — новий кейс у `describe("unit import mapping")`:

```ts
  it("abilities pass through first; a specialAbility with the same name is skipped", () => {
    const ward = { id: "ward", name: "Ward 9+", trigger: { event: "passive" }, effects: [{ kind: "wfrpWard", value: 9 }] };

    const [unit] = importUnitsSchema.parse({ units: [{ name: "Shade", abilities: [ward], specialAbilities: [{ name: "ward 9+", description: "dup", type: "passive" }, { name: "Chill", description: "Cold aura", type: "passive" }] }] }).units;

    const data = toUnitCreateData("c1", unit, null, true) as unknown as { abilities: Array<{ name: string }> };

    expect(data.abilities.map((a) => a.name)).toEqual(["Ward 9+", "Chill"]);
    expect(data.abilities[0]).toEqual(ward);
  });
```

`app/api/__tests__/units-import-api.test.ts` — у `beforeEach` додати `db.campaign.findUnique.mockResolvedValue({ rules: {} });`, імпорт `import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";` і кейс:

```ts
  it("Traits у homm/dnd5e — 400 і нічого не створено; у wfrp — створено з abilities і characteristics", async () => {
    const ward = { id: "ward", name: "Ward 9+", trigger: { event: "passive" }, effects: [{ kind: "wfrpWard", value: 9 }] };

    for (const rules of [{}, { system: { key: "dnd5e" } }]) {
      db.campaign.findUnique.mockResolvedValue({ rules } as never);

      const res = await post({ units: [{ name: "Shade", abilities: [ward] }] });

      expect(res.status).toBe(400);
    }

    expect(db.unit.createMany).not.toHaveBeenCalled();

    db.campaign.findUnique.mockResolvedValue({ rules: WFRP_RULES } as never);

    const ok = await post({ units: [{ name: "Shade", abilities: [ward], characteristics: { base: { ws: 45 }, move: 6 } }] });

    expect(ok.status).toBe(200);
    expect(db.unit.createMany.mock.calls[0][0].data[0]).toMatchObject({ abilities: [ward], characteristics: { base: expect.objectContaining({ ws: 45 }), move: 6 } });
  });
```

`lib/server/content/__tests__/import-content.test.ts` — новий кейс у `describe("importContent")`:

```ts
  it("units: characteristics JSON and trait abilities reach the resource body", async () => {
    const ward = { id: "ward", name: "Ward 9+", trigger: { event: "passive" }, effects: [{ kind: "wfrpWard", value: 9 }] };

    const report = await run([{ name: "Shade", characteristics: { base: { ws: 45 }, move: 6 }, abilities: [ward] }, { name: "Plain", characteristics: "{}" }]);

    expect(report.results.flatMap((r) => r.issues)).toEqual([]);

    const bodies = create.mock.calls.map((c) => c[1] as { characteristics?: { base: Record<string, number>; move: number }; abilities?: unknown[] });

    expect(bodies[0].characteristics).toMatchObject({ base: { ws: 45 }, move: 6 });
    expect(bodies[0].abilities).toEqual([ward]);
    expect(bodies[1].characteristics?.base.ws).toBe(30);
  });
```

- [ ] **Step 2:** `pnpm test:run lib/utils/units/__tests__/import-units.test.ts app/api/__tests__/units-import-api.test.ts lib/server/content/__tests__/import-content.test.ts` — Expected: FAIL (немає `abilities` в `importUnitSchema`, немає 400, `characteristics` відкинуто як `unknownField`).

- [ ] **Step 3: `traits-guard.ts`** (і видалити локальну `assertTraitsSupported` з `resources/units.ts`, імпортувати звідси; імпорт `isTraitEffectKind` у ресурсі прибрати):

```ts
import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { isTraitEffectKind } from "@/lib/utils/abilities/schema/kinds";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

type EffectOwner = { effects: readonly { kind: string }[] };

export const hasTraitEffect = (abilities: readonly EffectOwner[] | undefined): boolean => !!abilities?.some((a) => a.effects.some((e) => isTraitEffectKind(e.kind)));

export function assertTraitsSupported(system: Pick<RuleSystemDefinition, "traits"> | null, abilities: readonly EffectOwner[] | undefined): void {
  if (system?.traits || !hasTraitEffect(abilities)) return;

  throw new ContentError(API_ERRORS.SYSTEM_TRAITS_UNSUPPORTED, 400);
}
```

- [ ] **Step 4: `importUnitSchema`** — після `specialAbilities` додати `abilities: AbilitiesSchema.describe("Unit abilities; rule-system traits only in a wfrp campaign").optional(),`.

- [ ] **Step 5: `toUnitCreateData`** — замінити рядок `abilities:` на `abilities: abilitiesJson(importedAbilities(unit)),` і додати над функцією:

```ts
function importedAbilities(unit: ImportUnitRow): Ability[] {
  const own = unit.abilities ?? [];

  const taken = new Set(own.map((a) => nameKey(a.name)));

  return [...own, ...specialAbilitiesToAbilities(unit.specialAbilities).filter((a) => !taken.has(nameKey(a.name)))];
}
```

(`import type { Ability } from "@/lib/utils/abilities/schema";`).

- [ ] **Step 6: операція `units.import`** (`operation-service.ts`) — замінити тіло кейсу:

```ts
      case "units.import": {
        const { units } = bodyOf("units.import", body);

        const rules = await loadRules(actor.campaignId);

        assertTraitsSupported(ruleSystemOf(rules), units.flatMap((unit) => unit.abilities ?? []));

        await assertCampaignRefs(actor.campaignId, { spell: [...units.flatMap((unit) => unit.knownSpells), ...units.flatMap((unit) => (unit.abilities ?? []).flatMap((a) => (a.perform?.kind === "spell" ? [a.perform.spellId] : [])))] });

        const result = await importUnitsIntoCampaign(prisma, actor.campaignId, units, rules);

        invalidate(actor, ReferenceKind.UNITS);

        return result;
      }
```

(імпорти `assertTraitsSupported` з `@/lib/server/content/traits-guard`, `ruleSystemOf` з `@/lib/utils/rules/systems/registry`).

- [ ] **Step 7: Колонка імпорту.** `lib/utils/content/import/fields/units.ts` — після `jsonField("statblock")` додати `jsonField("characteristics"),`. `messages/uk/contentImport.json` → `fields.units.characteristics: "Характеристики (JSON)"`; `messages/en/contentImport.json` → `"Characteristics (JSON)"` (поруч зі `statblock`).

- [ ] **Step 8:** `pnpm test:run lib/utils/units/__tests__/import-units.test.ts app/api/__tests__/units-import-api.test.ts lib/server/content/__tests__/import-content.test.ts lib/server/content/__tests__/units-resource.test.ts lib/utils/content/import/__tests__/units-fields.test.ts lib/server/content/__tests__/import-export.test.ts lib/i18n/__tests__/label-keys-contentImport.test.ts lib/i18n/__tests__/scope-size.test.ts lib/server/content/__tests__/openapi.test.ts lib/server/content/__tests__/openapi-4f2.test.ts lib/server/content/__tests__/openapi-4f4.test.ts` — Expected: PASS. Якщо падає `scope-size` або OpenAPI на розмірі — підняти відповідний ліміт мінімально (Рішення 2; для `scope-size` +1 KB до ліміту, що впав) з коментарем «5g-2 …» і записати це для Task 8. Потім `pnpm test:related lib/schemas/units.ts lib/utils/units/import-units.ts lib/server/content/resources/units.ts lib/server/content/operation-service.ts lib/utils/content/import/fields/units.ts` — PASS; `pnpm exec eslint --fix` на змінених `.ts`.

- [ ] **Step 9: Commit** `feat(wfrp): 5g-2 unit import carries abilities and characteristics, shared traits guard`.

### Task 3: Валідатор юнітів, діапазони, заборонені терміни

**Files:**
- Create: `scripts/grim/units.ts`, `scripts/grim/__tests__/units.test.ts`, `scripts/grim/__tests__/forbidden-terms.test.ts`
- Modify: `scripts/grim/forbidden-terms.ts`, `scripts/grim/validate-data.ts`, `scripts/grim/__tests__/fixtures/units.json`, `scripts/grim/__tests__/validate-data.test.ts`

**Interfaces:**
- Consumes: `UNITS_IMPORT.characteristics` (Task 2), `TRAIT_RECIPES`, `TRAIT_SIZES`/`TraitSize`, `RecipeContext`/`RecipeValues` (`@/lib/utils/abilities/templates/types`), `CHARACTERISTIC_KEYS`/`CharacteristicKey` (`@/lib/utils/rules/systems`), `Row` (`./data`).
- Produces (`scripts/grim/units.ts`, Task 4–6 використовують):
  - `GRIM_UNIT_THEMES`, `GRIM_UNIT_LEVELS`, `type GrimUnitLevel`, `UNIT_LEVEL_BANDS`, `CHARACTERISTIC_MIN`, `UNIT_KEYS`, `GRID_BY_SIZE`, `SPEED_PER_MOVE`, `SWARM_WOUNDS_MULTIPLIER`;
  - `abilitiesOf(row: Row): RawAbility[]`, `unitTraits(row: Row): UnitTraits`, `unitTraitKeys(row: Row): string[]`, `rebuildTrait(a: RawAbility): unknown` (null для невідомого id), `unitWounds(base, t): number`, `unitIssues(row: Row): string[]`.
  - `ALLOWED_PHRASES: readonly string[]` (`forbidden-terms.ts`).
- Нова помилка `validateGrimData`: `` `${label("units", index, name)}: ${issue}` `` для кожного `unitIssues(row)`.

- [ ] **Step 1: Фікстура.** `scripts/grim/__tests__/fixtures/units.json` замінити повністю (5g-0 мала 5e-поля; тепер — форма Grim, `knownSpells` лишається для тесту посилань):

```json
[
  { "name": "Giant Rat", "level": 1, "maxHp": 5, "speed": 24, "initiative": 30, "gridSize": 1, "statblock": { "creatureType": "Beasts" }, "characteristics": { "base": { "ws": 25, "bs": 5, "s": 15, "t": 20, "i": 30, "ag": 35, "dex": 5, "int": 10, "wp": 15, "fel": 5 }, "move": 4 }, "abilities": [{ "id": "size", "name": "Size (Small)", "trigger": { "event": "passive" }, "effects": [{ "kind": "wfrpSize", "size": "small" }] }, { "id": "bite", "name": "Bite +2", "trigger": { "event": "passive" }, "effects": [{ "kind": "wfrpAttack", "attack": "bite", "damage": 2 }] }], "knownSpells": ["Rot Touch"] }
]
```

- [ ] **Step 2: Падаючі тести.**

`scripts/grim/__tests__/forbidden-terms.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { findForbiddenTerms } from "../forbidden-terms";

describe("findForbiddenTerms", () => {
  it.each(["That is a moot point.", "A MOOT COURT ruling", "gore and grit", "A Copper Hound and a Grave Touch", "Many-Mouthed Thing"])("allows %s", (text) => expect(findForbiddenTerms(text)).toEqual([]));

  it.each([["the Moot hills", "Moot"], ["two Gors charge", "Gor"], ["Flesh Hounds bay", "Flesh Hound"], ["a Clanrat pack", "Clanrat"], ["Strigoi lord", "Strigoi"]])("flags %s", (text, term) => expect(findForbiddenTerms(text)).toContain(term));
});
```

`scripts/grim/__tests__/units.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { rebuildTrait, unitIssues, unitWounds } from "../units";

import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";

const all40 = { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, s: 40, t: 40, i: 40, ag: 40, dex: 40, int: 40, wp: 40, fel: 40 };

describe("unitWounds", () => {
  it("applies size, swarm and hardy", () => {
    expect(unitWounds(all40, { size: "average", notes: new Set() })).toBe(16);
    expect(unitWounds(all40, { size: "large", notes: new Set(["hardy"]) })).toBe(36);
    expect(unitWounds({ ...all40, t: 20 }, { size: "little", notes: new Set(["swarm"]) })).toBe(10);
    expect(unitWounds(all40, { size: "tiny", notes: new Set() })).toBe(1);
    expect(unitWounds(all40, { size: "small", notes: new Set() })).toBe(12);
    expect(unitWounds(all40, { size: "monstrous", notes: new Set() })).toBe(128);
  });
});

describe("rebuildTrait", () => {
  it("returns the recipe output for a known id and null otherwise", () => {
    expect(rebuildTrait({ id: "ward", name: "Ward 9+", effects: [{ kind: "wfrpWard", value: 9 }] })).toEqual({ id: "ward", name: "Ward 9+", trigger: { event: "passive" }, effects: [{ kind: "wfrpWard", value: 9 }] });
    expect(rebuildTrait({ id: "terror", name: "Terror 1", effects: [] })).toBeNull();
  });
});

describe("unitIssues", () => {
  it("is empty for a valid row", () => {
    const row = { name: "Ash Hound", level: 2, maxHp: 11, speed: 42, initiative: 40, gridSize: 1, statblock: { creatureType: "Beasts" }, characteristics: { base: { ws: 38, bs: 5, s: 30, t: 30, i: 40, ag: 40, dex: 5, int: 12, wp: 25, fel: 5 }, move: 7 }, abilities: [{ id: "bite", name: "Bite +4", trigger: { event: "passive" }, effects: [{ kind: "wfrpAttack", attack: "bite", damage: 4 }] }] };

    expect(unitIssues(row)).toEqual([]);
  });
});
```

`scripts/grim/__tests__/validate-data.test.ts` — новий `describe("validateGrimData: units")` (кожен кейс мутує `load()`; `rat = (data) => data.units[0]`; `ab = (id: string, name: string, effect: object, event = "passive") => ({ id, name, trigger: { event }, effects: [effect] })`; `where = 'units #1 "Giant Rat": '`):

| Мутація | Очікуваний рядок у `issues` (`toContain`) |
|---|---|
| `delete base.fel` | `where + "characteristics.base must list all 10 characteristics (missing fel)"` |
| `characteristics.skillAdvances = {}` | `where + "characteristics may hold only base and move (got skillAdvances)"` |
| `statblock.creatureType = "Dragons"` | `where + "statblock must be { creatureType } with one of: Beasts, Raiders, Restless Dead, Cultists, Constructs, Horrors"` |
| `level = 5` | `where + "level must be one of 1, 2, 3, 4"` |
| `strength = 10` | `where + 'column "strength" is not used by Grim units'` |
| `attacks = [{ name: "Bite", attackBonus: 2, damageType: "piercing", damageDice: "1d4" }]` | `where + 'column "attacks" is not used by Grim units'` |
| `abilities.push(ab("armour", "Armour 1", { kind: "wfrpArmour", head: 1, body: 0, arm: 0, leg: 0 }))` | `where + 'abilities[2] "Armour 1": is not the output of the "armour" trait recipe'` |
| `abilities.push(ab("terror", "Terror 1", { kind: "wfrpPsychology", psychology: "terror", value: 1 }))` | `where + 'abilities[2] "Terror 1": unknown trait id "terror"'` |
| `abilities.push(ab("regenerate", "Regenerate", { kind: "heal", amount: "1d10", target: "self" }))` (passive) | `where + 'abilities[2] "Regenerate": is not the output of the "regenerate" trait recipe'` |
| `abilities.push(ab("breath", "Breath +3", { kind: "wfrpAttack", attack: "breath", damage: 3 }))` | `where + 'abilities[2] "Breath +3": is not the output of the "breath" trait recipe'` |
| `abilities.push(ab("bite", "Bite +3", { kind: "wfrpAttack", attack: "bite", damage: 3 }))` | `where + 'abilities[2] "Bite +3": duplicate trait id "bite"'` |
| `speed = 30` | `where + "speed 30 must equal move × 6 = 24"` |
| `initiative = 10` | `where + "initiative 10 must equal I 30"` |
| `gridSize = 2` | `where + "gridSize 2 must be 1 for size small"` |
| `maxHp = 6` | `where + "maxHp 6 must equal Wounds 5"` |
| `base.ws = 60` | `where + 'characteristic "ws" 60 is outside 5–45 for level 1'` і `where + "max(ws, bs) 60 is outside 20–45 for level 1"` |
| `abilities.push(ab("ward", "Ward 9+", { kind: "wfrpWard", value: 9 }))` | `where + "Ward is not allowed for level 1"` |
| `abilities[1].effects[0].magical = true` | `where + "Magical is not allowed for level 1"` |
| `abilities.push(ab("regenerate", "Regenerate", { kind: "heal", amount: "1d10", target: "self" }, "turnStart"))` | `where + "Regenerate is not allowed for level 1"` |
| `abilities.push(ab("fear", "Fear 2", { kind: "wfrpPsychology", psychology: "fear", value: 2 }))` | `where + "Fear 2 is above 1 for level 1"` |

Плюс у наявному тесті «accepts the good fixture» нічого не міняти (фікстура з Step 1 має проходити).

- [ ] **Step 3:** `pnpm test:run scripts/grim/__tests__/units.test.ts scripts/grim/__tests__/forbidden-terms.test.ts scripts/grim/__tests__/validate-data.test.ts` — Expected: FAIL (модуля `units.ts` немає, терміни не доповнено).

- [ ] **Step 4: `scripts/grim/units.ts`** (повний вміст):

```ts
import { isDeepStrictEqual } from "node:util";

import type { Row } from "./data";

import { TRAIT_SIZES, type TraitSize } from "@/lib/utils/abilities/schema/kinds";
import type { RecipeContext, RecipeValues } from "@/lib/utils/abilities/templates/types";
import { CHARACTERISTIC_KEYS, type CharacteristicKey } from "@/lib/utils/rules/systems";
import { TRAIT_RECIPES } from "@/lib/utils/rules/systems/wfrp/traits/recipes";

export const GRIM_UNIT_THEMES = ["Beasts", "Raiders", "Restless Dead", "Cultists", "Constructs", "Horrors"] as const;

export const GRIM_UNIT_LEVELS = [1, 2, 3, 4] as const;

export type GrimUnitLevel = (typeof GRIM_UNIT_LEVELS)[number];

type Range = readonly [number, number];

export interface UnitLevelBand {
  charMax: number;
  combat: Range;
  wounds: Range;
  ap: Range;
  ward: Range | null;
  psychologyMax: number;
  attack: Range;
  breath: Range | null;
  regenerate: boolean;
  magical: boolean;
}

export const CHARACTERISTIC_MIN = 5;

// Own threat-tier numbers of the template, not official stat blocks (see "Verify against the book")
export const UNIT_LEVEL_BANDS: Record<GrimUnitLevel, UnitLevelBand> = {
  1: { charMax: 45, combat: [20, 45], wounds: [3, 14], ap: [0, 1], ward: null, psychologyMax: 1, attack: [1, 5], breath: null, regenerate: false, magical: false },
  2: { charMax: 55, combat: [30, 55], wounds: [8, 24], ap: [0, 2], ward: null, psychologyMax: 2, attack: [2, 7], breath: null, regenerate: true, magical: false },
  3: { charMax: 65, combat: [40, 65], wounds: [15, 45], ap: [0, 4], ward: [9, 10], psychologyMax: 3, attack: [4, 9], breath: [6, 10], regenerate: true, magical: true },
  4: { charMax: 80, combat: [50, 80], wounds: [24, 120], ap: [1, 6], ward: [7, 9], psychologyMax: 4, attack: [6, 12], breath: [7, 12], regenerate: true, magical: true },
};

export const UNIT_KEYS: readonly string[] = ["name", "level", "maxHp", "speed", "initiative", "gridSize", "statblock", "characteristics", "abilities", "knownSpells", "raceId"];

export const GRID_BY_SIZE: Record<TraitSize, number> = { tiny: 1, little: 1, small: 1, average: 1, large: 2, enormous: 3, monstrous: 3 };

export const SPEED_PER_MOVE = 6;

export const SWARM_WOUNDS_MULTIPLIER = 5;

const SIZE_WOUNDS_MULTIPLIER: Partial<Record<TraitSize, number>> = { large: 2, enormous: 4, monstrous: 8 };

const NOTE_TRAITS: readonly string[] = ["undead", "hardy", "flier", "swarm", "nightVision"];

type RawEffect = Record<string, unknown>;

export type RawAbility = { id?: unknown; name?: unknown; trigger?: { event?: unknown }; effects?: RawEffect[] };

export interface UnitTraits {
  ap: number;
  ward?: number;
  size: TraitSize;
  psychology: Array<{ kind: "fear" | "terror"; value: number }>;
  attacks: Array<{ name: string; attack: string; damage: number; magical: boolean }>;
  regenerate: boolean;
  notes: Set<string>;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export const abilitiesOf = (row: Row): RawAbility[] => (Array.isArray(row.abilities) ? row.abilities.filter(isObject) : []) as RawAbility[];

const first = (a: RawAbility): RawEffect => (Array.isArray(a.effects) && isObject(a.effects[0]) ? a.effects[0] : {});

export function unitTraits(row: Row): UnitTraits {
  const t: UnitTraits = { ap: 0, size: "average", psychology: [], attacks: [], regenerate: false, notes: new Set() };

  for (const a of abilitiesOf(row)) {
    const e = first(a);

    switch (a.id) {
      case "armour":
        t.ap = Math.max(t.ap, Number(e.head ?? 0));
        break;
      case "ward":
        t.ward = Number(e.value);
        break;
      case "size":
        t.size = (TRAIT_SIZES as readonly string[]).includes(String(e.size)) ? (e.size as TraitSize) : "average";
        break;
      case "fear":
        t.psychology.push({ kind: e.psychology === "terror" ? "terror" : "fear", value: Number(e.value) });
        break;
      case "regenerate":
        t.regenerate = true;
        break;
      case "bite":
      case "claw":
      case "weapon":
      case "breath":
        t.attacks.push({ name: String(a.name), attack: String(a.id), damage: Number(e.damage), magical: e.magical === true });
        break;
      default:
        if (NOTE_TRAITS.includes(String(a.id))) t.notes.add(String(a.id));
    }
  }

  return t;
}

/** Trait keys a unit covers: recipe ids, fear split into fear/terror, a magical attack adds "magical". */
export function unitTraitKeys(row: Row): string[] {
  return abilitiesOf(row).flatMap((a) => {
    const e = first(a);

    const key = a.id === "fear" ? String(e.psychology) : String(a.id);

    return e.magical === true ? [key, "magical"] : [key];
  });
}

function recipeValues(id: string, e: RawEffect): RecipeValues {
  const magical = e.magical === true ? "yes" : "no";

  switch (id) {
    case "armour":
      return { ap: Number(e.head) };
    case "ward":
      return { value: Number(e.value) };
    case "size":
      return { size: String(e.size) };
    case "fear":
      return { psychology: String(e.psychology), value: Number(e.value) };
    case "bite":
    case "claw":
    case "weapon":
      return { damage: Number(e.damage), magical };
    case "breath":
      return { damage: Number(e.damage), rangeFt: Number(e.rangeFt), magical };
    default:
      return {};
  }
}

/** What the trait recipe builds for this ability's id, name and values; null for an unknown id. */
export function rebuildTrait(a: RawAbility): unknown {
  const recipe = TRAIT_RECIPES.find((r) => r.id === a.id);

  if (!recipe || typeof a.name !== "string") return null;

  const defaults = Object.fromEntries(recipe.params.map((p) => [p.key, p.default])) as RecipeValues;

  const ctx: RecipeContext = { scope: "ability", name: a.name, note: "" };

  const { ability } = recipe.build({ ...defaults, ...recipeValues(recipe.id, first(a)) }, ctx) as { ability: object };

  return { id: recipe.id, ...ability };
}

const bonus = (v: number) => Math.floor(v / 10);

export function unitWounds(base: Record<CharacteristicKey, number>, t: Pick<UnitTraits, "size" | "notes">): number {
  const [sb, tb, wpb] = [bonus(base.s), bonus(base.t), bonus(base.wp)];

  const average = sb + 2 * tb + wpb;

  const bySize = t.size === "tiny" ? 1 : t.size === "little" ? tb : t.size === "small" ? 2 * tb + wpb : average * (SIZE_WOUNDS_MULTIPLIER[t.size] ?? 1);

  return Math.max(1, bySize * (t.notes.has("swarm") ? SWARM_WOUNDS_MULTIPLIER : 1) + (t.notes.has("hardy") ? tb : 0));
}

const isLevel = (v: unknown): v is GrimUnitLevel => (GRIM_UNIT_LEVELS as readonly unknown[]).includes(v);

const inRange = (v: number, [min, max]: Range) => Number.isInteger(v) && v >= min && v <= max;

const fmt = ([min, max]: Range) => `${min}–${max}`;

function readBase(row: Row, issues: string[]): { base: Record<CharacteristicKey, number>; move: number } | null {
  const fail = (message: string) => {
    issues.push(message);

    return null;
  };

  const c = row.characteristics;

  if (!isObject(c) || !isObject(c.base)) return fail("characteristics.base is required");

  const extra = Object.keys(c).filter((k) => k !== "base" && k !== "move");

  if (extra.length > 0) issues.push(`characteristics may hold only base and move (got ${extra.join(", ")})`);

  const base = c.base;

  const missing = CHARACTERISTIC_KEYS.filter((k) => !Number.isInteger(base[k]));

  if (missing.length > 0) return fail(`characteristics.base must list all ${CHARACTERISTIC_KEYS.length} characteristics (missing ${missing.join(", ")})`);

  const move = c.move;

  if (typeof move !== "number" || !Number.isInteger(move) || move < 1 || move > 12) return fail("characteristics.move must be an integer 1–12");

  return { base: base as Record<CharacteristicKey, number>, move };
}

function abilityIssues(row: Row, issues: string[]) {
  const ids = new Set<string>();

  abilitiesOf(row).forEach((a, i) => {
    const where = `abilities[${i}]${typeof a.name === "string" ? ` "${a.name}"` : ""}`;

    const expected = rebuildTrait(a);

    if (expected === null) return void issues.push(`${where}: unknown trait id "${String(a.id)}"`);

    if (ids.has(String(a.id))) issues.push(`${where}: duplicate trait id "${String(a.id)}"`);

    ids.add(String(a.id));

    if (!isDeepStrictEqual(a, expected)) issues.push(`${where}: is not the output of the "${String(a.id)}" trait recipe`);
  });
}

function bandIssues(row: Row, level: GrimUnitLevel, base: Record<CharacteristicKey, number>, t: UnitTraits, issues: string[]) {
  const band = UNIT_LEVEL_BANDS[level];

  const at = `for level ${level}`;

  for (const k of CHARACTERISTIC_KEYS) if (!inRange(base[k], [CHARACTERISTIC_MIN, band.charMax])) issues.push(`characteristic "${k}" ${base[k]} is outside ${CHARACTERISTIC_MIN}–${band.charMax} ${at}`);

  const combat = Math.max(base.ws, base.bs);

  if (!inRange(combat, band.combat)) issues.push(`max(ws, bs) ${combat} is outside ${fmt(band.combat)} ${at}`);

  if (typeof row.maxHp === "number" && !inRange(row.maxHp, band.wounds)) issues.push(`Wounds ${row.maxHp} are outside ${fmt(band.wounds)} ${at}`);

  if (!inRange(t.ap, band.ap)) issues.push(`Armour ${t.ap} is outside ${fmt(band.ap)} ${at}`);

  if (t.ward !== undefined && !band.ward) issues.push(`Ward is not allowed ${at}`);
  else if (t.ward !== undefined && band.ward && !inRange(t.ward, band.ward)) issues.push(`Ward ${t.ward} is outside ${fmt(band.ward)} ${at}`);

  for (const p of t.psychology) if (p.value > band.psychologyMax) issues.push(`${p.kind === "terror" ? "Terror" : "Fear"} ${p.value} is above ${band.psychologyMax} ${at}`);

  for (const a of t.attacks) {
    const range = a.attack === "breath" ? band.breath : band.attack;

    if (!range) issues.push(`Breath is not allowed ${at}`);
    else if (!inRange(a.damage, range)) issues.push(`attack "${a.name}" damage ${a.damage} is outside ${fmt(range)} ${at}`);
  }

  if (t.regenerate && !band.regenerate) issues.push(`Regenerate is not allowed ${at}`);

  if (t.attacks.some((a) => a.magical) && !band.magical) issues.push(`Magical is not allowed ${at}`);
}

/** Grim-specific checks of one units.json row; the resource schema is checked by validateRows. */
export function unitIssues(row: Row): string[] {
  const issues: string[] = [];

  for (const key of Object.keys(row)) if (!UNIT_KEYS.includes(key)) issues.push(`column "${key}" is not used by Grim units`);

  if (!isLevel(row.level)) issues.push(`level must be one of ${GRIM_UNIT_LEVELS.join(", ")}`);

  const statblock = row.statblock;

  if (!isObject(statblock) || Object.keys(statblock).some((k) => k !== "creatureType") || !(GRIM_UNIT_THEMES as readonly unknown[]).includes(statblock.creatureType)) issues.push(`statblock must be { creatureType } with one of: ${GRIM_UNIT_THEMES.join(", ")}`);

  abilityIssues(row, issues);

  const read = readBase(row, issues);

  if (!read) return issues;

  const t = unitTraits(row);

  const wounds = unitWounds(read.base, t);

  if (row.initiative !== read.base.i) issues.push(`initiative ${String(row.initiative)} must equal I ${read.base.i}`);

  if (row.speed !== read.move * SPEED_PER_MOVE) issues.push(`speed ${String(row.speed)} must equal move × ${SPEED_PER_MOVE} = ${read.move * SPEED_PER_MOVE}`);

  if (row.gridSize !== GRID_BY_SIZE[t.size]) issues.push(`gridSize ${String(row.gridSize)} must be ${GRID_BY_SIZE[t.size]} for size ${t.size}`);

  if (row.maxHp !== wounds) issues.push(`maxHp ${String(row.maxHp)} must equal Wounds ${wounds}`);

  if (isLevel(row.level)) bandIssues(row, row.level, read.base, t, issues);

  return issues;
}
```

(Коментар над `UNIT_LEVEL_BANDS` англійською — код без кирилиці за ESLint.)

- [ ] **Step 5: `validate-data.ts`** — імпорт `import { unitIssues } from "./units";`, функція й виклик у `validateGrimData` після `validateFeatAbilities`:

```ts
function validateUnits(data: GrimData, issues: string[]) {
  data.units.forEach((row, index) => {
    for (const issue of unitIssues(row)) issues.push(`${label("units", index, row.name)}: ${issue}`);
  });
}
```

- [ ] **Step 6: `forbidden-terms.ts`** — доповнити `FORBIDDEN_TERMS` новим рядком (назви істот і фракцій GW, яких не було в 5g-1):

```ts
  "Beastman", "Beastmen", "Doombull", "Wargor", "Centigor", "Jabberslythe", "Cygor", "Ghorgon", "Razorgor", "Zoat", "Saurus", "Kroxigor", "Stegadon", "Clanrat", "Stormvermin", "Rat Ogre", "Plague Monk", "Gutter Runner", "Greenskin", "Night Goblin", "Black Orc", "Savage Orc", "Gnoblar", "Yhetee", "Rhinox", "Stonehorn", "Thundertusk", "Vargheist", "Varghulf", "Terrorgheist", "Crypt Ghoul", "Crypt Horror", "Grave Guard", "Blood Knight", "Necrarch", "Lahmia", "Lahmian", "Strigoi", "Carstein", "Nehekhara", "Ushabti", "Liche Priest", "Bloodletter", "Plaguebearer", "Daemonette", "Flesh Hound", "Bloodthirster", "Great Unclean One", "Keeper of Secrets", "Lord of Change", "Mutalith", "Grobi", "Umgi", "Dawi", "Druchii", "Asur", "Asrai", "Waaagh", "Nagash", "Mannfred", "Ironjawz", "Servitor",
```

і дозволені фрази, що вирізаються з тексту перед скануванням (після `escape`):

```ts
/** Ordinary phrases that contain a short forbidden word ("moot point"); cut out before scanning. */
export const ALLOWED_PHRASES: readonly string[] = ["moot point", "moot question", "moot court"];

const ALLOWED = ALLOWED_PHRASES.map((p) => new RegExp(`(?<![\\p{L}\\p{N}])${p.split(/\s+/).map(escape).join("\\s+")}(?![\\p{L}\\p{N}])`, "giu"));

export const findForbiddenTerms = (text: string): string[] => {
  const clean = ALLOWED.reduce((s, re) => s.replace(re, " "), text);

  return PATTERNS.filter(({ re }) => re.test(clean)).map(({ term }) => term);
};
```

(стару однорядкову `findForbiddenTerms` видалити).

- [ ] **Step 7:** `pnpm test:run scripts/grim/__tests__/units.test.ts scripts/grim/__tests__/forbidden-terms.test.ts scripts/grim/__tests__/validate-data.test.ts scripts/grim/__tests__/real-data.test.ts` — PASS (реальний каталог ще без `units.json`); `pnpm exec eslint --fix scripts/grim/*.ts scripts/grim/__tests__/*.ts`.

- [ ] **Step 8: Commit** `feat(wfrp): 5g-2 grim unit validator, level bands and forbidden creature names`.

### Task 4: Покриття бестіарію

**Files:**
- Modify: `scripts/grim/coverage.ts`, `scripts/grim/__tests__/coverage.test.ts`

**Interfaces:**
- Consumes: `GRIM_UNIT_THEMES`, `GRIM_UNIT_LEVELS`, `unitTraits`, `unitTraitKeys` (`./units`, Task 3), `TRAIT_RECIPES`.
- Produces: `export const UNIT_TRAIT_COVERAGE: readonly string[]` (`coverage.ts`) = 14 id рецептів + `"terror"` + `"magical"`; нові попередження `grimCoverage` (лише якщо `data.units.length > 0`):
  1. `units: theme "X" has no unit`; 2. `units: level N has no unit`; 3. `units: trait "k" is used by no unit`; 4. `units "X": no attack`; 5. `units "X": Terror below Elite`; 6. `units "X": Boss without Magical or Breath`; 7. `units: theme "X" Wounds do not rise with level`; 8. `units: theme "X" Armour drops with level`.

- [ ] **Step 1: Падаючі тести** у `coverage.test.ts`. У наявному «reports only the known fixture gaps» фільтр стає `(w) => !w.includes("pool") && !w.includes("no new skill") && !w.startsWith("units")`. Нові кейси (`ab` — як у Task 3; `rat = () => structuredClone(load().units[0])`):

```ts
  it("reports bestiary gaps of the one-unit fixture", () => {
    const warnings = grimCoverage(load());

    expect(warnings).toEqual(expect.arrayContaining(['units: theme "Raiders" has no unit', "units: level 4 has no unit", 'units: trait "ward" is used by no unit', 'units: trait "terror" is used by no unit', 'units: trait "magical" is used by no unit']));
    expect(warnings).not.toContain('units: trait "bite" is used by no unit');
  });

  it("says nothing about units when there are none", () => {
    const data = load();

    data.units = [];
    expect(grimCoverage(data).filter((w) => w.startsWith("units"))).toEqual([]);
  });

  it("flags a unit without an attack, Terror below Elite and a plain Boss", () => {
    const data = load();

    data.units[0].abilities = [ab("size", "Size (Small)", { kind: "wfrpSize", size: "small" })];
    data.units.push({ ...rat(), name: "Rat Brute", level: 2, abilities: [...(rat().abilities as object[]), ab("fear", "Terror 1", { kind: "wfrpPsychology", psychology: "terror", value: 1 })] });
    data.units.push({ ...rat(), name: "Rat King", level: 4 });

    const warnings = grimCoverage(data);

    expect(warnings).toContain('units "Giant Rat": no attack');
    expect(warnings).toContain('units "Rat Brute": Terror below Elite');
    expect(warnings).toContain('units "Rat King": Boss without Magical or Breath');
  });

  it("a magical Boss is fine", () => {
    const data = load();

    const king = { ...rat(), name: "Rat King", level: 4, abilities: [ab("bite", "Bite +6", { kind: "wfrpAttack", attack: "bite", damage: 6, magical: true })] };

    data.units.push(king);
    expect(grimCoverage(data)).not.toContain('units "Rat King": Boss without Magical or Breath');
  });

  it("flags Wounds that do not rise and Armour that drops within a theme", () => {
    const data = load();

    data.units[0].abilities = [...(rat().abilities as object[]), ab("armour", "Armour 1", { kind: "wfrpArmour", head: 1, body: 1, arm: 1, leg: 1 })];
    data.units.push({ ...rat(), name: "Rat Pup", level: 2, maxHp: 4 });

    const warnings = grimCoverage(data);

    expect(warnings).toContain('units: theme "Beasts" Wounds do not rise with level');
    expect(warnings).toContain('units: theme "Beasts" Armour drops with level');
  });
```

- [ ] **Step 2:** `pnpm test:run scripts/grim/__tests__/coverage.test.ts` — FAIL.

- [ ] **Step 3: Реалізація** у `coverage.ts` (імпорти `import { GRIM_UNIT_LEVELS, GRIM_UNIT_THEMES, unitTraitKeys, unitTraits } from "./units";`, `import { TRAIT_RECIPES } from "@/lib/utils/rules/systems/wfrp/traits/recipes";`), у кінці `grimCoverage` перед `return warnings;` — `warnings.push(...unitCoverage(data.units));`:

```ts
export const UNIT_TRAIT_COVERAGE: readonly string[] = [...TRAIT_RECIPES.map((r) => r.id), "terror", "magical"];

const themeOf = (u: Row) => (u.statblock as { creatureType?: unknown } | undefined)?.creatureType;

function unitCoverage(units: Row[]): string[] {
  if (units.length === 0) return [];

  const warnings: string[] = [];

  for (const theme of GRIM_UNIT_THEMES) if (!units.some((u) => themeOf(u) === theme)) warnings.push(`units: theme "${theme}" has no unit`);

  for (const level of GRIM_UNIT_LEVELS) if (!units.some((u) => u.level === level)) warnings.push(`units: level ${level} has no unit`);

  const used = new Set(units.flatMap(unitTraitKeys));

  for (const key of UNIT_TRAIT_COVERAGE) if (!used.has(key)) warnings.push(`units: trait "${key}" is used by no unit`);

  for (const u of units) {
    const keys = unitTraitKeys(u);

    if (unitTraits(u).attacks.length === 0) warnings.push(`units "${nameOf(u)}": no attack`);

    if (keys.includes("terror") && Number(u.level) < 3) warnings.push(`units "${nameOf(u)}": Terror below Elite`);

    if (u.level === 4 && !keys.includes("breath") && !keys.includes("magical")) warnings.push(`units "${nameOf(u)}": Boss without Magical or Breath`);
  }

  const mean = (g: Row[]) => g.reduce((sum, u) => sum + Number(u.maxHp), 0) / g.length;

  const apMax = (g: Row[]) => Math.max(...g.map((u) => unitTraits(u).ap));

  for (const theme of GRIM_UNIT_THEMES) {
    const groups = GRIM_UNIT_LEVELS.map((level) => units.filter((u) => themeOf(u) === theme && u.level === level)).filter((g) => g.length > 0);

    if (groups.some((g, i) => i > 0 && mean(g) <= mean(groups[i - 1]))) warnings.push(`units: theme "${theme}" Wounds do not rise with level`);

    if (groups.some((g, i) => i > 0 && apMax(g) < apMax(groups[i - 1]))) warnings.push(`units: theme "${theme}" Armour drops with level`);
  }

  return warnings;
}
```

- [ ] **Step 4:** `pnpm test:run scripts/grim/__tests__/coverage.test.ts scripts/grim/__tests__/real-data.test.ts` — PASS; `pnpm exec eslint --fix scripts/grim/coverage.ts scripts/grim/__tests__/coverage.test.ts`.

- [ ] **Step 5: Commit** `feat(wfrp): 5g-2 grim bestiary coverage warnings`.

### Task 5: `units.json` (30 юнітів), manifest і тест реального каталогу

**Files:**
- Create: `data/templates/grim-d100/units.json`
- Modify: `data/templates/grim-d100/manifest.json`, `scripts/grim/__tests__/real-data.test.ts`

**Interfaces:**
- Consumes: «Ростер» (рядки нижче — дослівно, порядок важливий), `validateGrimData`, `grimCoverage`.
- Produces: 30 рядків з іменами точно як у «Ростері» (Tasks 6–7 посилаються на `Oathbound Revenant`, `Lantern Wraith`, `Many-Mouthed Thing`, `Cinder Drake`).

Рядки згенеровані з «Ростеру» й перевірені (Рішення 3–5). Кожен рядок — один JSON-об'єкт; файл — масив з 30 об'єктів у порядку кроків; форматування — один об'єкт на рядок (як нижче) з двома пробілами відступу.

- [ ] **Step 1: Beasts.** Створити `units.json` як `[` + ці 5 рядків + `]`:

```json
  {"name":"Bog Leech Swarm","level":1,"maxHp":5,"speed":18,"initiative":30,"gridSize":1,"statblock":{"creatureType":"Beasts"},"characteristics":{"base":{"ws":25,"bs":5,"s":10,"t":15,"i":30,"ag":25,"dex":5,"int":5,"wp":10,"fel":5},"move":3},"abilities":[{"id":"size","name":"Size (Little)","trigger":{"event":"passive"},"effects":[{"kind":"wfrpSize","size":"little"}]},{"id":"swarm","name":"Swarm","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Swarm"}]},{"id":"bite","name":"Bite +2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"bite","damage":2}]}]},
  {"name":"Ash Hound","level":2,"maxHp":11,"speed":42,"initiative":40,"gridSize":1,"statblock":{"creatureType":"Beasts"},"characteristics":{"base":{"ws":38,"bs":5,"s":30,"t":30,"i":40,"ag":40,"dex":5,"int":12,"wp":25,"fel":5},"move":7},"abilities":[{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"bite","name":"Bite +4","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"bite","damage":4}]}]},
  {"name":"Thornback Boar","level":2,"maxHp":19,"speed":42,"initiative":25,"gridSize":1,"statblock":{"creatureType":"Beasts"},"characteristics":{"base":{"ws":40,"bs":5,"s":40,"t":40,"i":25,"ag":30,"dex":5,"int":10,"wp":30,"fel":5},"move":7},"abilities":[{"id":"armour","name":"Armour 1","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":1,"body":1,"arm":1,"leg":1}]},{"id":"hardy","name":"Hardy","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Hardy"}]},{"id":"bite","name":"Tusks +5","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"bite","damage":5}]}]},
  {"name":"Dusk Stalker","level":3,"maxHp":30,"speed":48,"initiative":55,"gridSize":2,"statblock":{"creatureType":"Beasts"},"characteristics":{"base":{"ws":55,"bs":5,"s":45,"t":40,"i":55,"ag":50,"dex":5,"int":15,"wp":35,"fel":5},"move":8},"abilities":[{"id":"armour","name":"Armour 1","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":1,"body":1,"arm":1,"leg":1}]},{"id":"size","name":"Size (Large)","trigger":{"event":"passive"},"effects":[{"kind":"wfrpSize","size":"large"}]},{"id":"fear","name":"Fear 1","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"fear","value":1}]},{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"claw","name":"Claw +6","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"claw","damage":6}]}]},
  {"name":"Cinder Drake","level":4,"maxHp":84,"speed":36,"initiative":45,"gridSize":3,"statblock":{"creatureType":"Beasts"},"characteristics":{"base":{"ws":62,"bs":40,"s":60,"t":58,"i":45,"ag":30,"dex":10,"int":25,"wp":55,"fel":15},"move":6},"abilities":[{"id":"armour","name":"Armour 4","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":4,"body":4,"arm":4,"leg":4}]},{"id":"size","name":"Size (Enormous)","trigger":{"event":"passive"},"effects":[{"kind":"wfrpSize","size":"enormous"}]},{"id":"fear","name":"Terror 2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"terror","value":2}]},{"id":"flier","name":"Flier","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Flier"}]},{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"claw","name":"Claw +8","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"claw","damage":8}]},{"id":"breath","name":"Breath +9","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"breath","damage":9,"rangeFt":36}]}]}
```

- [ ] **Step 2: Raiders.** Додати кому після останнього об'єкта й вставити перед `]`:

```json
  {"name":"Ditch Cutthroat","level":1,"maxHp":11,"speed":24,"initiative":32,"gridSize":1,"statblock":{"creatureType":"Raiders"},"characteristics":{"base":{"ws":32,"bs":28,"s":30,"t":30,"i":32,"ag":33,"dex":28,"int":25,"wp":25,"fel":22},"move":4},"abilities":[{"id":"weapon","name":"Weapon +4","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":4}]}]},
  {"name":"Ridge Reaver","level":2,"maxHp":12,"speed":24,"initiative":38,"gridSize":1,"statblock":{"creatureType":"Raiders"},"characteristics":{"base":{"ws":42,"bs":30,"s":35,"t":35,"i":38,"ag":38,"dex":30,"int":28,"wp":32,"fel":25},"move":4},"abilities":[{"id":"armour","name":"Armour 1","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":1,"body":1,"arm":1,"leg":1}]},{"id":"weapon","name":"Weapon +5","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":5}]}]},
  {"name":"Scarred Brute","level":2,"maxHp":19,"speed":24,"initiative":28,"gridSize":1,"statblock":{"creatureType":"Raiders"},"characteristics":{"base":{"ws":40,"bs":20,"s":45,"t":45,"i":28,"ag":28,"dex":22,"int":20,"wp":30,"fel":18},"move":4},"abilities":[{"id":"hardy","name":"Hardy","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Hardy"}]},{"id":"weapon","name":"Weapon +6","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":6}]}]},
  {"name":"Broadhelm Captain","level":3,"maxHp":16,"speed":24,"initiative":45,"gridSize":1,"statblock":{"creatureType":"Raiders"},"characteristics":{"base":{"ws":52,"bs":38,"s":42,"t":45,"i":45,"ag":40,"dex":32,"int":35,"wp":48,"fel":40},"move":4},"abilities":[{"id":"armour","name":"Armour 3","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":3,"body":3,"arm":3,"leg":3}]},{"id":"weapon","name":"Weapon +7","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":7}]}]},
  {"name":"Red Banner Warlord","level":4,"maxHp":26,"speed":24,"initiative":55,"gridSize":1,"statblock":{"creatureType":"Raiders"},"characteristics":{"base":{"ws":65,"bs":42,"s":50,"t":52,"i":55,"ag":45,"dex":35,"int":40,"wp":60,"fel":50},"move":4},"abilities":[{"id":"armour","name":"Armour 4","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":4,"body":4,"arm":4,"leg":4}]},{"id":"fear","name":"Fear 2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"fear","value":2}]},{"id":"hardy","name":"Hardy","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Hardy"}]},{"id":"weapon","name":"Runed Cleaver +9","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":9,"magical":true}]}]}
```

- [ ] **Step 3: Restless Dead.** Так само:

```json
  {"name":"Mire Skeleton","level":1,"maxHp":11,"speed":24,"initiative":20,"gridSize":1,"statblock":{"creatureType":"Restless Dead"},"characteristics":{"base":{"ws":28,"bs":20,"s":30,"t":30,"i":20,"ag":22,"dex":15,"int":10,"wp":20,"fel":5},"move":4},"abilities":[{"id":"fear","name":"Fear 1","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"fear","value":1}]},{"id":"undead","name":"Undead","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Undead"}]},{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"weapon","name":"Weapon +4","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":4}]}]},
  {"name":"Barrow Shambler","level":2,"maxHp":14,"speed":18,"initiative":15,"gridSize":1,"statblock":{"creatureType":"Restless Dead"},"characteristics":{"base":{"ws":35,"bs":5,"s":40,"t":40,"i":15,"ag":18,"dex":10,"int":8,"wp":25,"fel":5},"move":3},"abilities":[{"id":"fear","name":"Fear 1","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"fear","value":1}]},{"id":"undead","name":"Undead","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Undead"}]},{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"bite","name":"Bite +4","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"bite","damage":4}]}]},
  {"name":"Lantern Wraith","level":3,"maxHp":16,"speed":36,"initiative":50,"gridSize":1,"statblock":{"creatureType":"Restless Dead"},"characteristics":{"base":{"ws":45,"bs":5,"s":30,"t":45,"i":50,"ag":50,"dex":10,"int":30,"wp":55,"fel":10},"move":6},"abilities":[{"id":"ward","name":"Ward 9+","trigger":{"event":"passive"},"effects":[{"kind":"wfrpWard","value":9}]},{"id":"fear","name":"Terror 1","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"terror","value":1}]},{"id":"undead","name":"Undead","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Undead"}]},{"id":"flier","name":"Flier","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Flier"}]},{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"claw","name":"Grave Touch +6","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"claw","damage":6,"magical":true}]}]},
  {"name":"Oathbound Revenant","level":3,"maxHp":19,"speed":24,"initiative":38,"gridSize":1,"statblock":{"creatureType":"Restless Dead"},"characteristics":{"base":{"ws":58,"bs":30,"s":45,"t":50,"i":38,"ag":35,"dex":25,"int":25,"wp":50,"fel":15},"move":4},"abilities":[{"id":"armour","name":"Armour 3","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":3,"body":3,"arm":3,"leg":3}]},{"id":"fear","name":"Fear 2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"fear","value":2}]},{"id":"undead","name":"Undead","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Undead"}]},{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"weapon","name":"Weapon +7","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":7}]}]},
  {"name":"Hollow Queen","level":4,"maxHp":24,"speed":30,"initiative":60,"gridSize":1,"statblock":{"creatureType":"Restless Dead"},"characteristics":{"base":{"ws":68,"bs":35,"s":50,"t":60,"i":60,"ag":55,"dex":40,"int":50,"wp":75,"fel":45},"move":5},"abilities":[{"id":"armour","name":"Armour 3","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":3,"body":3,"arm":3,"leg":3}]},{"id":"ward","name":"Ward 8+","trigger":{"event":"passive"},"effects":[{"kind":"wfrpWard","value":8}]},{"id":"fear","name":"Terror 3","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"terror","value":3}]},{"id":"undead","name":"Undead","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Undead"}]},{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"weapon","name":"Thorn Sceptre +9","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":9,"magical":true}]}]}
```

- [ ] **Step 4: Cultists.** Так само:

```json
  {"name":"Ember Acolyte","level":1,"maxHp":9,"speed":24,"initiative":30,"gridSize":1,"statblock":{"creatureType":"Cultists"},"characteristics":{"base":{"ws":30,"bs":25,"s":28,"t":28,"i":30,"ag":30,"dex":30,"int":30,"wp":30,"fel":30},"move":4},"abilities":[{"id":"weapon","name":"Weapon +3","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":3}]}]},
  {"name":"Ashen Zealot","level":2,"maxHp":16,"speed":24,"initiative":35,"gridSize":1,"statblock":{"creatureType":"Cultists"},"characteristics":{"base":{"ws":40,"bs":25,"s":35,"t":38,"i":35,"ag":35,"dex":30,"int":28,"wp":45,"fel":30},"move":4},"abilities":[{"id":"hardy","name":"Hardy","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Hardy"}]},{"id":"weapon","name":"Weapon +5","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":5}]}]},
  {"name":"Brand Bearer","level":2,"maxHp":15,"speed":24,"initiative":32,"gridSize":1,"statblock":{"creatureType":"Cultists"},"characteristics":{"base":{"ws":42,"bs":25,"s":38,"t":40,"i":32,"ag":32,"dex":28,"int":28,"wp":40,"fel":32},"move":4},"abilities":[{"id":"armour","name":"Armour 2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":2,"body":2,"arm":2,"leg":2}]},{"id":"fear","name":"Fear 1","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"fear","value":1}]},{"id":"weapon","name":"Weapon +5","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":5}]}]},
  {"name":"Masked Oracle","level":3,"maxHp":17,"speed":24,"initiative":50,"gridSize":1,"statblock":{"creatureType":"Cultists"},"characteristics":{"base":{"ws":45,"bs":30,"s":35,"t":42,"i":50,"ag":42,"dex":40,"int":55,"wp":62,"fel":50},"move":4},"abilities":[{"id":"armour","name":"Armour 2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":2,"body":2,"arm":2,"leg":2}]},{"id":"ward","name":"Ward 9+","trigger":{"event":"passive"},"effects":[{"kind":"wfrpWard","value":9}]},{"id":"fear","name":"Fear 2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"fear","value":2}]},{"id":"weapon","name":"Smoke Blade +6","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":6,"magical":true}]}]},
  {"name":"Gilded Voice","level":4,"maxHp":26,"speed":24,"initiative":60,"gridSize":1,"statblock":{"creatureType":"Cultists"},"characteristics":{"base":{"ws":55,"bs":40,"s":40,"t":55,"i":60,"ag":50,"dex":45,"int":65,"wp":78,"fel":70},"move":4},"abilities":[{"id":"armour","name":"Armour 2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":2,"body":2,"arm":2,"leg":2}]},{"id":"ward","name":"Ward 7+","trigger":{"event":"passive"},"effects":[{"kind":"wfrpWard","value":7}]},{"id":"fear","name":"Terror 2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"terror","value":2}]},{"id":"hardy","name":"Hardy","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Hardy"}]},{"id":"weapon","name":"Gilded Staff +7","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":7,"magical":true}]},{"id":"breath","name":"Ember Breath +8","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"breath","damage":8,"rangeFt":30,"magical":true}]}]}
```

- [ ] **Step 5: Constructs.** Так само:

```json
  {"name":"Clay Drudge","level":1,"maxHp":13,"speed":18,"initiative":15,"gridSize":1,"statblock":{"creatureType":"Constructs"},"characteristics":{"base":{"ws":30,"bs":5,"s":35,"t":35,"i":15,"ag":15,"dex":10,"int":5,"wp":15,"fel":5},"move":3},"abilities":[{"id":"armour","name":"Armour 1","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":1,"body":1,"arm":1,"leg":1}]},{"id":"hardy","name":"Hardy","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Hardy"}]},{"id":"weapon","name":"Fists +3","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":3}]}]},
  {"name":"Copper Hound","level":2,"maxHp":14,"speed":42,"initiative":40,"gridSize":1,"statblock":{"creatureType":"Constructs"},"characteristics":{"base":{"ws":40,"bs":5,"s":35,"t":40,"i":40,"ag":40,"dex":5,"int":10,"wp":30,"fel":5},"move":7},"abilities":[{"id":"armour","name":"Armour 2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":2,"body":2,"arm":2,"leg":2}]},{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"bite","name":"Bite +4","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"bite","damage":4}]}]},
  {"name":"Iron Watchman","level":2,"maxHp":22,"speed":24,"initiative":25,"gridSize":1,"statblock":{"creatureType":"Constructs"},"characteristics":{"base":{"ws":45,"bs":5,"s":45,"t":50,"i":25,"ag":25,"dex":15,"int":10,"wp":35,"fel":5},"move":4},"abilities":[{"id":"armour","name":"Armour 2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":2,"body":2,"arm":2,"leg":2}]},{"id":"hardy","name":"Hardy","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Hardy"}]},{"id":"weapon","name":"Halberd +6","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":6}]}]},
  {"name":"Stonebound Sentinel","level":3,"maxHp":43,"speed":24,"initiative":30,"gridSize":2,"statblock":{"creatureType":"Constructs"},"characteristics":{"base":{"ws":55,"bs":5,"s":55,"t":55,"i":30,"ag":25,"dex":15,"int":10,"wp":40,"fel":5},"move":4},"abilities":[{"id":"armour","name":"Armour 4","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":4,"body":4,"arm":4,"leg":4}]},{"id":"size","name":"Size (Large)","trigger":{"event":"passive"},"effects":[{"kind":"wfrpSize","size":"large"}]},{"id":"fear","name":"Fear 1","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"fear","value":1}]},{"id":"hardy","name":"Hardy","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Hardy"}]},{"id":"weapon","name":"Stone Fist +8","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":8}]}]},
  {"name":"Forge Colossus","level":4,"maxHp":111,"speed":30,"initiative":30,"gridSize":3,"statblock":{"creatureType":"Constructs"},"characteristics":{"base":{"ws":65,"bs":30,"s":70,"t":70,"i":30,"ag":20,"dex":20,"int":15,"wp":50,"fel":5},"move":5},"abilities":[{"id":"armour","name":"Armour 6","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":6,"body":6,"arm":6,"leg":6}]},{"id":"size","name":"Size (Enormous)","trigger":{"event":"passive"},"effects":[{"kind":"wfrpSize","size":"enormous"}]},{"id":"fear","name":"Terror 2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"terror","value":2}]},{"id":"hardy","name":"Hardy","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Hardy"}]},{"id":"weapon","name":"Hammer Arm +11","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"weapon","damage":11}]},{"id":"breath","name":"Furnace Vent +8","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"breath","damage":8,"rangeFt":24}]}]}
```

- [ ] **Step 6: Horrors.** Так само:

```json
  {"name":"Gloom Mite Swarm","level":1,"maxHp":10,"speed":30,"initiative":35,"gridSize":1,"statblock":{"creatureType":"Horrors"},"characteristics":{"base":{"ws":30,"bs":5,"s":10,"t":20,"i":35,"ag":35,"dex":5,"int":5,"wp":15,"fel":5},"move":5},"abilities":[{"id":"size","name":"Size (Little)","trigger":{"event":"passive"},"effects":[{"kind":"wfrpSize","size":"little"}]},{"id":"swarm","name":"Swarm","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Swarm"}]},{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"bite","name":"Bite +2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"bite","damage":2}]}]},
  {"name":"Pallid Crawler","level":2,"maxHp":12,"speed":36,"initiative":45,"gridSize":1,"statblock":{"creatureType":"Horrors"},"characteristics":{"base":{"ws":42,"bs":5,"s":35,"t":35,"i":45,"ag":45,"dex":10,"int":15,"wp":30,"fel":5},"move":6},"abilities":[{"id":"fear","name":"Fear 1","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"fear","value":1}]},{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"claw","name":"Claw +5","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"claw","damage":5}]}]},
  {"name":"Many-Mouthed Thing","level":3,"maxHp":38,"speed":24,"initiative":25,"gridSize":2,"statblock":{"creatureType":"Horrors"},"characteristics":{"base":{"ws":50,"bs":5,"s":50,"t":50,"i":25,"ag":25,"dex":10,"int":10,"wp":45,"fel":5},"move":4},"abilities":[{"id":"size","name":"Size (Large)","trigger":{"event":"passive"},"effects":[{"kind":"wfrpSize","size":"large"}]},{"id":"fear","name":"Terror 1","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"terror","value":1}]},{"id":"regenerate","name":"Regenerate","trigger":{"event":"turnStart"},"effects":[{"kind":"heal","amount":"1d10","target":"self"}]},{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"bite","name":"Bite +7","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"bite","damage":7}]}]},
  {"name":"Veil Stalker","level":3,"maxHp":17,"speed":42,"initiative":55,"gridSize":1,"statblock":{"creatureType":"Horrors"},"characteristics":{"base":{"ws":55,"bs":5,"s":40,"t":40,"i":55,"ag":55,"dex":20,"int":30,"wp":50,"fel":5},"move":7},"abilities":[{"id":"ward","name":"Ward 9+","trigger":{"event":"passive"},"effects":[{"kind":"wfrpWard","value":9}]},{"id":"fear","name":"Fear 2","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"fear","value":2}]},{"id":"flier","name":"Flier","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Flier"}]},{"id":"claw","name":"Rending Claw +6","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"claw","damage":6,"magical":true}]}]},
  {"name":"Hunger Below","level":4,"maxHp":119,"speed":24,"initiative":40,"gridSize":3,"statblock":{"creatureType":"Horrors"},"characteristics":{"base":{"ws":70,"bs":5,"s":75,"t":70,"i":40,"ag":30,"dex":10,"int":30,"wp":70,"fel":5},"move":4},"abilities":[{"id":"armour","name":"Armour 3","trigger":{"event":"passive"},"effects":[{"kind":"wfrpArmour","head":3,"body":3,"arm":3,"leg":3}]},{"id":"size","name":"Size (Enormous)","trigger":{"event":"passive"},"effects":[{"kind":"wfrpSize","size":"enormous"}]},{"id":"fear","name":"Terror 3","trigger":{"event":"passive"},"effects":[{"kind":"wfrpPsychology","psychology":"terror","value":3}]},{"id":"regenerate","name":"Regenerate","trigger":{"event":"turnStart"},"effects":[{"kind":"heal","amount":"1d10","target":"self"}]},{"id":"hardy","name":"Hardy","trigger":{"event":"passive"},"effects":[{"kind":"note","text":"Hardy"}]},{"id":"nightVision","name":"Night Vision","trigger":{"event":"passive"},"effects":[{"kind":"flag","flag":"sense","sense":"darkvision","range":60}]},{"id":"bite","name":"Devouring Maw +12","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"bite","damage":12,"magical":true}]}]}
```

- [ ] **Step 7: manifest і тест.** `manifest.json` → `counts.units: 30`. У `real-data.test.ts`: очікування manifest — `units: 30`; нові кейси в `describe("grim-d100 catalog")`:

```ts
  it("units follow the plan roster: name, theme and level in file order", () => {
    expect(data.units.map((u) => [u.name, (u.statblock as { creatureType: string }).creatureType, u.level])).toEqual(ROSTER);
  });

  it("units carry no spells, race, attacks or avatar yet", () => {
    for (const unit of data.units) for (const key of ["knownSpells", "raceId", "attacks", "avatar"]) expect(unit, `${String(unit.name)}.${key}`).not.toHaveProperty(key);
  });
```

з константою над `describe`:

```ts
const ROSTER = [["Bog Leech Swarm", "Beasts", 1], ["Ash Hound", "Beasts", 2], ["Thornback Boar", "Beasts", 2], ["Dusk Stalker", "Beasts", 3], ["Cinder Drake", "Beasts", 4], ["Ditch Cutthroat", "Raiders", 1], ["Ridge Reaver", "Raiders", 2], ["Scarred Brute", "Raiders", 2], ["Broadhelm Captain", "Raiders", 3], ["Red Banner Warlord", "Raiders", 4], ["Mire Skeleton", "Restless Dead", 1], ["Barrow Shambler", "Restless Dead", 2], ["Lantern Wraith", "Restless Dead", 3], ["Oathbound Revenant", "Restless Dead", 3], ["Hollow Queen", "Restless Dead", 4], ["Ember Acolyte", "Cultists", 1], ["Ashen Zealot", "Cultists", 2], ["Brand Bearer", "Cultists", 2], ["Masked Oracle", "Cultists", 3], ["Gilded Voice", "Cultists", 4], ["Clay Drudge", "Constructs", 1], ["Copper Hound", "Constructs", 2], ["Iron Watchman", "Constructs", 2], ["Stonebound Sentinel", "Constructs", 3], ["Forge Colossus", "Constructs", 4], ["Gloom Mite Swarm", "Horrors", 1], ["Pallid Crawler", "Horrors", 2], ["Many-Mouthed Thing", "Horrors", 3], ["Veil Stalker", "Horrors", 3], ["Hunger Below", "Horrors", 4]];
```

- [ ] **Step 8:** `pnpm test:run scripts/grim/__tests__/real-data.test.ts` — Expected: PASS («passes the validator», «has no coverage warnings», manifest, roster). Якщо FAIL — порівняти рядок з «Ростером» і виправити дані під таблицю (не тест, не діапазони); якщо таблиця й діапазони суперечать одне одному — зупинитися й повідомити контролера.

- [ ] **Step 9: Commit** `feat(wfrp): 5g-2 grim bestiary (30 units)`.

### Task 6: E2E: герої шаблону проти юнітів шаблону

**Files:**
- Create: `scripts/grim/__tests__/bestiary-e2e.test.ts`

**Interfaces:**
- Consumes: `readGrimData` (реальний каталог з Task 5), `IMPORT_SPECS.units` з `characteristics` (Task 2), `createUnitSchema`, `unitCreateData`, `createBattleParticipantFromUnit`, `runJoinTriggers`, `attackMutation`, `attackBodySchema`, `planDraft`, `woundsMax`, `wfrpAbilitiesOf`, `mergeRules`, `WFRP_RULES`, `ruleSystemOf`, тестові `context` (`@/lib/server/battles/__tests__/mutations/fixtures`), `makeParticipant` (`@/lib/utils/abilities/__tests__/fixtures`), `must` (`@/lib/utils/rules/systems/wfrp/traits/__tests__/fixtures`).
- Produces: нічого для інших задач.

Зразок — `lib/server/battles/__tests__/mutations/wfrp-traits-e2e.test.ts` (rng: перший виклик — d100 захисника, решта — Ward d10/лікування). Числа очікувань нижче виведені з правил 5h-1; якщо якесь не збігається — прочитати `out.events`, виправляти **лише тест** і лише коли поведінка рушія узгоджена з 5h-1 e2e; код продукту не змінювати; розбіжність записати у звіт.

- [ ] **Step 1: Написати тест** (повний вміст файлу):

```ts
import { describe, expect, it, vi } from "vitest";

import { readGrimData } from "../data";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { attackBodySchema } from "@/lib/schemas/battles";
import { createUnitSchema } from "@/lib/schemas/units";
import { context } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { attackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { runJoinTriggers } from "@/lib/utils/battle/turn/join-triggers";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import { coerceRecord, IMPORT_SPECS } from "@/lib/utils/content/import";
import { mergeRules } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { woundsMax } from "@/lib/utils/rules/systems/wfrp/characteristics/derive";
import { wfrpAbilitiesOf } from "@/lib/utils/rules/systems/wfrp/combat/participant";
import { planDraft } from "@/lib/utils/rules/systems/wfrp/creation/plan";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import { must } from "@/lib/utils/rules/systems/wfrp/traits/__tests__/fixtures";
import { unitCreateData } from "@/lib/utils/units/unit-create-data";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

vi.mock("@/lib/db", () => ({ prisma: { race: { findFirst: vi.fn() } } }));

const data = readGrimData();

const merged = mergeRules(WFRP_RULES, (data.rules ?? {}) as Parameters<typeof mergeRules>[1]);

if (!merged.ok) throw new Error("rules patch invalid");

const rules = merged.rules;

const SWORD = { id: "sw", name: "Sword", type: "melee", attackBonus: 0, damageDice: "1d6", damageType: "slashing" } as BattleAttack;

const PASS = 0.01;

const NO_WARD: [number, number] = [0.95, 0.05];

const HIT = 5;

const MISS = 98;

const E2E_UNITS = ["Oathbound Revenant", "Lantern Wraith", "Many-Mouthed Thing", "Cinder Drake"];

const careerIds = new Set(data.careers.map((c) => String(c.name)));

const featIds = new Set(data.feats.map((f) => String(f.name)));

const rowOf = (name: string) => must(data.units.find((u) => u.name === name), name);

function unitOf(name: string): UnitFromPrisma {
  const { value } = coerceRecord(rowOf(name), IMPORT_SPECS.units.fields);

  const body = createUnitSchema.parse(IMPORT_SPECS.units.toBody ? IMPORT_SPECS.units.toBody(value, "create") : value);

  return { ...unitCreateData("c1", body), id: name.toLowerCase().replace(/[^a-z]+/g, "-"), createdAt: new Date(0), updatedAt: new Date(0) } as unknown as UnitFromPrisma;
}

async function buildUnit(name: string, id: string): Promise<BattleParticipant> {
  const p = await createBattleParticipantFromUnit(unitOf(name), "b1", ParticipantSide.ENEMY, 1, undefined, rules);

  return { ...p, basicInfo: { ...p.basicInfo, id, controlledBy: "dm" } };
}

function heroes(): BattleParticipant[] {
  return data.raceProfiles.map(({ profile }, i) => {
    const plan = planDraft({ career: { mode: "choice", careerId: profile.careerTable[0].careerId }, stats: { mode: "free", points: Array(10).fill(rules.advancement.creation.freeBudget / 10) }, talents: [] }, { profile, rules: rules.advancement, careerIds, featIds });

    if (!plan.ok) throw new Error(plan.errors.join(","));

    const hp = woundsMax(plan.characteristics);

    const p = makeParticipant({ id: `h${i}`, side: ParticipantSide.ALLY, hp, maxHp: hp });

    return { ...p, basicInfo: { ...p.basicInfo, battleId: "b1", controlledBy: "dm" }, abilities: { ...p.abilities, ...wfrpAbilitiesOf(plan.characteristics, { ap: { head: 0, arm: 0, body: 0, leg: 0 } }) }, battleData: { ...p.battleData, attacks: [SWORD] } };
  });
}

const ctxOf = (participants: BattleParticipant[]): BattleMutationContext => {
  const base = context({ participants, isDM: true });

  return { ...base, meta: { ...base.meta, rules } };
};

const firstThen = (first: number, rest: number) => {
  let calls = 0;

  return () => (calls++ === 0 ? first : rest);
};

const part = (ctx: BattleMutationContext, id: string) => must(ctx.participants.find((p) => p.basicInfo.id === id), id);

const standing = (p: BattleParticipant) => p.combatStats.currentHp > 0;

const meleeOf = (p: BattleParticipant) => must(p.battleData.attacks.find((a) => a.type === "melee"), `${p.basicInfo.name} melee`);

async function strike(ctx: BattleMutationContext, attackerId: string, targetId: string, attackId: string, roll: number, rng: [number, number] = NO_WARD, endTurn = false) {
  const turnIndex = ctx.participants.findIndex((p) => p.basicInfo.id === attackerId);

  const ready: BattleMutationContext = { ...ctx, participants: ctx.participants.map((p) => ({ ...p, actionFlags: { ...p.actionFlags, hasUsedAction: false } })), scene: { ...ctx.scene, turnIndex } };

  const out = await attackMutation({ ...ready, rng: firstThen(...rng) }, attackBodySchema.parse({ attackerId, targetId, attackId, d20Roll: roll, damageRolls: [4], endTurn }));

  const next: BattleMutationContext = { ...ready, participants: out.participants, pending: out.pending ?? ready.pending, scene: { ...ready.scene, ...out.scene } };

  return { out, next };
}

describe("grim bestiary end to end", () => {
  it("every template unit builds a participant with its traits baked in", async () => {
    for (const row of data.units) {
      const p = await buildUnit(String(row.name), "u");

      const c = row.characteristics as { base: Record<string, number> };

      expect(p.combatStats, String(row.name)).toMatchObject({ maxHp: row.maxHp, speed: row.speed, gridSize: row.gridSize });
      expect(p.abilities.initiative, String(row.name)).toBe(row.initiative);
      expect(p.abilities.characteristics?.base, String(row.name)).toEqual(c.base);
      expect(p.battleData.attacks.length, String(row.name)).toBeGreaterThan(0);
      expect(p.battleData.attacks.every((a) => !!a.wfrp), String(row.name)).toBe(true);
    }
  });

  it("armour, ward, size, magical and breath reach the participants", async () => {
    const [revenant, wraith, mouths, drake] = await Promise.all(E2E_UNITS.map((name, i) => buildUnit(name, `u${i}`)));

    expect(revenant.abilities.wfrp?.ap).toEqual({ head: 3, body: 3, arm: 3, leg: 3 });
    expect(wraith.abilities.wfrp?.ward).toBe(9);
    expect(must(wraith.battleData.attacks.find((a) => a.name === "Grave Touch +6")).wfrp?.magical).toBe(true);
    expect(mouths.abilities.wfrp?.size).toBe("large");
    expect(mouths.battleData.resolvedAbilities.some((a) => a.trigger.event === "turnStart")).toBe(true);
    expect(drake.abilities.wfrp).toMatchObject({ size: "enormous", ap: { head: 4, body: 4, arm: 4, leg: 4 } });
    expect(must(drake.battleData.attacks.find((a) => a.name === "Breath +9"))).toMatchObject({ type: "ranged", range: "36 ft", targetType: "aoe", wfrp: { blastRadius: 2, noSb: true } });
  });

  it("template heroes test Terror on join, take hits and beat four template units", async () => {
    const party = heroes();

    const foes = await Promise.all(E2E_UNITS.map((name, i) => buildUnit(name, `u${i}`)));

    const joined = runJoinTriggers([...party, ...foes], { round: 1, rng: () => PASS, map: null, rules });

    expect(joined.psychology.targets.map((t) => t.participantId).sort()).toEqual(party.map((h) => h.basicInfo.id).sort());

    for (const h of party) {
      const tested = must(joined.participants.find((p) => p.basicInfo.id === h.basicInfo.id));

      expect(tested.battleData.psychologyTested).toEqual({ terror: 2, fear: 2 });
      expect(ruleSystemOf(rules).conditions?.list(tested) ?? []).not.toContainEqual(expect.objectContaining({ key: "broken" }));
    }

    let ctx = ctxOf(joined.participants);

    for (const foe of foes) {
      const { out, next } = await strike(ctx, foe.basicInfo.id, "h0", must(meleeOf(foe).id), HIT);

      expect(part(next, "h0").combatStats.currentHp, foe.basicInfo.name).toBeLessThan(party[0].combatStats.maxHp);

      if (foe.abilities.wfrp?.size === "large" || foe.abilities.wfrp?.size === "enormous") expect(JSON.stringify(out.events)).toContain("steps.size");

      ctx = { ...next, participants: next.participants.map((p) => (p.basicInfo.id === "h0" ? party[0] : p)) };
    }

    const enemyStanding = (c: BattleMutationContext) => c.participants.filter((p) => p.basicInfo.side === ParticipantSide.ENEMY && standing(p));

    for (let i = 0; i < 600 && enemyStanding(ctx).length > 0; i++) ctx = (await strike(ctx, party[i % party.length].basicInfo.id, enemyStanding(ctx)[0].basicInfo.id, "sw", HIT)).next;

    for (const foe of foes) {
      expect(part(ctx, foe.basicInfo.id).combatStats.currentHp, foe.basicInfo.name).toBe(0);
      expect(part(ctx, foe.basicInfo.id).combatStats.status, foe.basicInfo.name).not.toBe(CombatStatus.ACTIVE);
    }

    expect(party.every((h) => standing(part(ctx, h.basicInfo.id)))).toBe(true);
  });

  it("the Many-Mouthed Thing regenerates at the start of its turn", async () => {
    const [hero] = heroes();

    const mouths = await buildUnit("Many-Mouthed Thing", "u0");

    const ctx = ctxOf([hero, { ...mouths, combatStats: { ...mouths.combatStats, currentHp: 10 } }]);

    const { out, next } = await strike(ctx, "h0", "u0", "sw", MISS, NO_WARD, true);

    expect(next.scene.turnIndex).toBe(1);
    expect(part(next, "u0").combatStats.currentHp).toBe(11);
    expect(JSON.stringify(out.events)).toContain("abilityText.log.heal");
  });
});
```

Пояснення чисел: найсильніше джерело — Cinder Drake (Terror 2), тож кожен герой тестує Terror і Fear зі значенням 2 (див. `psychology.ts`: Terror записує й `fear`); `PASS` (d100 = 2) проходить обидва тести, тож `broken` немає й герої можуть атакувати. Удари юнітів — по `h0`, після кожного `h0` замінюється свіжим (інакше вбили б героя й бій би не завершився). `MISS` = 98 проти WS героя (~30) і захисник 96 проти WS 50 — захисник виграє, шкоди немає; на початку ходу юніта Regenerate кидає 1d10 з rng 0.05 = 1 → 11.

- [ ] **Step 2:** `pnpm test:run scripts/grim/__tests__/bestiary-e2e.test.ts` — Expected: PASS (якщо FAIL — див. правило над Step 1).
- [ ] **Step 3:** `pnpm exec eslint --fix scripts/grim/__tests__/bestiary-e2e.test.ts`; **Commit** `test(wfrp): 5g-2 grim bestiary battle e2e`.

### Task 7: Інтеграція на БД `wfrp` і CLI-смоук

**Files:**
- Modify: `scripts/grim/__tests__/real-data.integration.test.ts`, `scripts/grim/__tests__/load-template.integration.test.ts`

**Interfaces:**
- Consumes: `loadGrimTemplate`, `createCampaignForUser`, `invalidateCampaignLayer`, `readGrimData`, `must`.
- Produces: нічого для інших задач.

- [ ] **Step 1: `real-data.integration.test.ts`.**
  - `rowCounts` — додати `units: await raw.unit.count({ where: { campaignId: templateId } }),`.
  - `afterAll`: `ids` — лише кампанії тестового власника (шаблон створює він же; чужі шаблони не чіпаємо): `(await raw.campaign.findMany({ where: { dmUserId: userId }, select: { id: true } })).map((c) => c.id)`; додати `await raw.unitBase.deleteMany({ where: { sourceCampaignId: { in: ids } } });` поруч з іншими `*Base`.
  - «loads the real catalog»: `toMatchObject({ feats: 50, careers: 16, races: 4, units: 30, raceProfiles: 4 })`.
  - Новий кейс після «a clone sees every species profile…»:

```ts
  it("a clone carries every unit with characteristics, traits and theme", async () => {
    const created = await createCampaignForUser(userId, { name: `${marker}-units`, templateId }, { defer: () => undefined });

    if (!created.ok) throw new Error("clone failed");

    invalidateCampaignLayer();

    const data = readGrimData();

    const units = await scoped.unit.findMany({ where: { campaignId: created.campaign.id }, select: { name: true, level: true, maxHp: true, speed: true, initiative: true, gridSize: true, abilities: true, characteristics: true, statblock: true } });

    expect(units).toHaveLength(data.units.length);

    for (const row of data.units) {
      const unit = units.find((u) => u.name === row.name);

      expect(unit, String(row.name)).toMatchObject({ level: row.level, maxHp: row.maxHp, speed: row.speed, initiative: row.initiative, gridSize: row.gridSize, statblock: row.statblock, abilities: row.abilities });
      expect(unit?.characteristics, String(row.name)).toMatchObject(row.characteristics as object);
    }
  });
```

  - «a second run is a no-op» лишається (тепер `rowCounts` включає `units`).
- [ ] **Step 2: `load-template.integration.test.ts`** — той самий `afterAll`-фільтр за `dmUserId` тестового власника і `unitBase.deleteMany` (фікстурний юніт тепер у формі Grim; очікування `units: 1` і зв'язок `knownSpells` → `Rot Touch` не змінюються).
- [ ] **Step 3: Прогін на `wfrp`.** Контейнер `dnd-tracker-wfrp-db-1` на 54322 (`docker ps | grep 54322`). Перевірити, що шаблону немає: `docker exec dnd-tracker-wfrp-db-1 psql -U postgres -d wfrp -Atc "select count(*) from campaigns where kind='template' and name='Grim d100'"` = `0` (інакше тести відмовляться стартувати — спитати контролера, не видаляти самостійно). URL — облікові дані з `.env.local` (`…@localhost:54322/prodcopy`) з іменем БД `wfrp`:

```bash
DATABASE_URL=postgresql://<user>:<pw>@localhost:54322/wfrp DIRECT_URL=postgresql://<user>:<pw>@localhost:54322/wfrp \
  pnpm exec vitest run --config vitest.integration.config.mts scripts/grim/__tests__/real-data.integration.test.ts scripts/grim/__tests__/load-template.integration.test.ts
```

  Expected: обидва файли PASS; після прогону `select count(*) … 'Grim d100'` = `0`.
- [ ] **Step 4: CLI-смоук.** Те саме оточення; власник: `docker exec dnd-tracker-wfrp-db-1 psql -U postgres -d wfrp -Atc "select id from users order by id limit 1"`. `pnpm constructor:grim-template --owner <id>` двічі. Expected: перший — `(створено)`, без попереджень покриття, `+N ~0 -0`; другий — `+0 ~0 -0`. Потім прибрати шаблон (spec: «шаблон прибраний після смоуку»):

```bash
docker exec -i dnd-tracker-wfrp-db-1 psql -U postgres -d wfrp -v ON_ERROR_STOP=1 <<'SQL'
begin;
create temp table grim as select id from campaigns where kind = 'template' and name = 'Grim d100';
update campaigns set "baseSourceId" = null where "baseSourceId" in (select id from grim);
delete from feats_base where "sourceCampaignId" in (select id from grim);
delete from careers_base where "sourceCampaignId" in (select id from grim);
delete from races_base where "sourceCampaignId" in (select id from grim);
delete from units_base where "sourceCampaignId" in (select id from grim);
delete from spells_base where "sourceCampaignId" in (select id from grim);
delete from artifacts_base where "sourceCampaignId" in (select id from grim);
delete from campaigns where id in (select id from grim);
commit;
SQL
```

  Expected: `select count(*) … 'Grim d100'` = `0`.
- [ ] **Step 5:** `pnpm exec eslint --fix scripts/grim/__tests__/real-data.integration.test.ts scripts/grim/__tests__/load-template.integration.test.ts`; **Commit** `test(wfrp): 5g-2 grim bestiary template load integration`.

### Task 8: Документація і фінальні вузькі перевірки

**Files:** Modify `docs/architecture/rule-systems.md`, `docs/architecture/content-api.md`, `docs/STATUS.md`.

- [ ] **Step 1: `rule-systems.md`** — новий розділ «Межі 5g-2» після «Межі 5g-1» (українською, 6–9 пунктів): склад бестіарію (30 юнітів, 6 тем у `statblock.creatureType`, 4 рівні загрози в `level`, чому `level` безпечний — fair-баланс і бібліотека читають його як тір); `units.json` — лише вихід рецептів Traits (`id` = id рецепта, Fear і Terror — `"fear"`), без `attacks`/`knownSpells`/`raceId`/`avatar`; формула Wounds (Рішення 3) і похідні колонки (`initiative = I`, `speed = move × 6`, `gridSize` за Size); діапазони за рівнем і попередження покриття; імпорт: колонка `characteristics` у `IMPORT_SPECS.units` (без неї завантажувач губив характеристики), `abilities` у legacy `POST /units/import`, спільний `traits-guard.ts`; сканер: доповнений список істот GW і `ALLOWED_PHRASES` («moot point»); якщо піднімались ліміти `scope-size`/OpenAPI — числа. У «Звірити з книгою» додати пункт: «Бестіарій Grim (5g-2): числа юнітів задані за рівнем загрози (`UNIT_LEVEL_BANDS` у `scripts/grim/units.ts`), не з офіційних стат-блоків; формула Wounds юніта (множники Size ×2/×4/×8, Swarm ×5, Hardy +TB) — власна».
- [ ] **Step 2: `content-api.md`** — у пункті «Реєстр полів» (рядок про синоніми юнітів) додати: юніт має JSON-колонку `characteristics` (зберігається лише у wfrp-кампанії); у пункті про API — `POST /units/import` приймає `abilities` (Traits лише у wfrp, інакше 400 `SYSTEM_TRAITS_UNSUPPORTED`).
- [ ] **Step 3: `docs/STATUS.md`** — у рядку WFRP після речення про 5g-1 додати «**5g-2 (бестіарій Grim d100) реалізовано на `feat/wfrp`, не змерджено:** 30 юнітів (6 тем × 4 рівні загрози) з Traits 5h-1, колонка `characteristics` в імпорті юнітів, `abilities` у `POST /units/import`, валідатор/покриття бестіарію, e2e `scripts/grim/__tests__/bestiary-e2e.test.ts`; spec/план `docs/superpowers/{specs,plans}/2026-11-10-wfrp-5g2*`, межі — [«Межі 5g-2»](architecture/rule-systems.md); шаблон на локальній `wfrp` прибрано. Далі 5g-3 (магія й спорядження).»
- [ ] **Step 4: Фінальні вузькі тести:** `pnpm test:run scripts/grim` і `pnpm test:related scripts/grim/validate-data.ts scripts/grim/coverage.ts scripts/grim/units.ts scripts/grim/forbidden-terms.ts lib/utils/units/import-units.ts lib/server/content/traits-guard.ts` — PASS; `git status` чистий після коміту.
- [ ] **Step 5: Commit** `docs(wfrp): 5g-2 boundaries and status`.

Після Task 8 (контролер):
1. Фінальне Opus-рев'ю гілки (diff від `515020caf`): Review Focus 1–5; ручне читання всіх назв юнітів/здібностей на GW-терміни й запозичення; збіг `units.json` з «Ростером»; узгодженість формули Wounds і діапазонів.
2. Одна хвиля виправлень (Sonnet), вузькі тести на змінених файлах.
3. `/simplify` по diff гілки (1–2 агенти).
4. Оновити нотатку пам'яті `project-wfrp.md` (5g-2 готово, далі 5g-3). Повний `pnpm test:run` і repo-wide `pnpm lint` — лише у pre-deploy гейті епіку.

## Self-review

- **Покриття spec:** §1 імпорт — Task 2 (`importUnitSchema.abilities`, порядок з `specialAbilities`, відхилення не-wfrp через спільний helper, OpenAPI/схеми — Рішення 1–2, плюс виявлена потреба в колонці `characteristics`); §2 дані — Task 5 («Ростер», діапазони — Рішення 5, `knownSpells`/`raceId`/`avatar` відсутні); §3 валідатор — Task 3 (схема рядка через наявний `validateRows`, 10 характеристик, унікальні імена — наявна перевірка, теми/рівні, лише вихід рецептів, діапазони, заборонені терміни + allowlist), coverage — Task 4 (усі пункти spec + note-Traits реєстру); §4 тести — Tasks 2–7 (регресія 5e/CSV — `units-fields.test.ts`, `import-export.test.ts` у Task 2), «Звірити з книгою» — Task 8; ризики 1–3 — «Перевірки коду» a, b, d і Task 7.
- **Уточнення spec (додано в spec):** 10 характеристик замість 8; дозволені ефекти включають `flag` (Night Vision) і тригер `turnStart` у Regenerate; завантажувач іде через `IMPORT_SPECS.units` (потрібна колонка `characteristics` і два нові підписи `messages`); `level` читається fair-балансом як тір — сумісно; атаки юнітів — лише Trait-атаки; описи юнітів не мають поля в БД.
- **Узгодженість імен:** `unitIssues`, `unitTraits`, `unitTraitKeys`, `rebuildTrait`, `unitWounds`, `GRIM_UNIT_THEMES`, `GRIM_UNIT_LEVELS`, `UNIT_LEVEL_BANDS`, `UNIT_TRAIT_COVERAGE`, `ALLOWED_PHRASES`, `hasTraitEffect`, `assertTraitsSupported` визначені в Tasks 2–4 і вживаються лише так; імена юнітів у Tasks 5–7 — з «Ростеру».
- **Плейсхолдери:** `<user>:<pw>` — з `.env.local`; `<id>` — результат команди в тому самому кроці.
