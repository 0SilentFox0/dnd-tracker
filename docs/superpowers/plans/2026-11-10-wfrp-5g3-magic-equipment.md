# WFRP 5g-3: магія і спорядження шаблону Grim d100 — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Без per-task рев'ю: одне фінальне Opus-рев'ю гілки після Task 11. Виконавці — Sonnet у свіжій сесії; групи — у розділі «Групи диспетчеризації».

**Goal:** `data/templates/grim-d100/` отримує 30 заклинань (`spells.json`), 56 предметів із `systemStats` (`artifacts.json`), власні таблиці мискастів (`rules.json`) і юнітів із `knownSpells` та Trait `ranged`; валідатор і `grimCoverage` це перевіряють, `pnpm constructor:grim-template` публікує шаблон, клон якого дає бій героя зі зброєю, бронею й заклинанням шаблону проти юнітів-кастерів і стрільців.

**Architecture:** Рушій магії/спорядження не змінюється, крім одного нового значення атаки-Trait (`ranged`). Імпорт артефактів (`IMPORT_SPECS.artifacts`) отримує JSON-колонку `systemStats` (без неї завантажувач губить статси). Перевірки Grim живуть у нових `scripts/grim/spells.ts` і `scripts/grim/equipment.ts` (за зразком `units.ts`), таблиці — у `validate-data.ts`. Усі імена й числа — лише з розділу «Ростер», виконавці їх не вигадують.

**Tech Stack:** TypeScript (tsx-скрипти), Zod (`createSpellSchema`, `createArtifactSchema`, `WfrpItemStatsSchema`, `TablesRulesSchema`, `RulesetPatchSchema`), `IMPORT_SPECS`/`importContent`, `TRAIT_RECIPES`, Vitest, Prisma (лише інтеграційний тест), JSON-дані.

**Spec:** `docs/superpowers/specs/2026-11-10-wfrp-5g3-design.md`; читати разом із `docs/architecture/rule-systems.md` («Межі 5d-1», «Межі 5d-3», «Межі 5f», «Межі 5g-0/1/2», «Звірити з книгою») і планом-зразком `docs/superpowers/plans/2026-11-10-wfrp-5g2-bestiary.md`.

## Global Constraints

- Коміти лише на `feat/wfrp` у worktree `/Users/silentfox/Work/dnd-tracker-wfrp`; не мерджити й не пушити (WFRP off main до кінця епіку). Кінцевий рядок коміту — `Co-Authored-By` моделі-виконавця.
- Виконує Sonnet; per-task рев'ю немає, одне фінальне Opus-рев'ю, одна хвиля виправлень, потім `/simplify` по diff гілки (1–2 агенти).
- Тести лише вузько: `pnpm test:run <файл>`, `pnpm test:related <файли>`; eslint лише `pnpm exec eslint --fix <змінені .ts>`. Повний `pnpm test:run` і repo-wide `pnpm lint` НЕ запускати. Перед прогоном — `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`; прогін > ~5 хв — убити й звузити.
- Контент англійською, проза плану/доків — українська. Без GW-термінів і впізнаваних назв WFRP (заклинань, зброї, металів, шкіл магії); сканер (`scripts/grim/forbidden-terms.ts`) — захід, не гарантія.
- Нових механік, ефектів, полів Prisma, міграцій немає. Єдина зміна рушія — значення `"ranged"` у `TRAIT_ATTACKS` і гілка профілю в `wfrpUnitBuild` (Task 3).
- Заклинання: `cost: "action"`, `level: 1`, `resolution` не пишеться (дефолт `auto`), умови — лише через `casting.magic.attribute` (ключ wfrp-стану, рівні 1–3), `spellEffects` — лише `dealDamage`/`heal` з `amount: { spellRoll: 100 }`; overcast — лише `null` або `"dice"`.
- Предмети: лише `name`, `description`, `rarity` (`common|uncommon`), `slot`, `systemStats`; ціни — цілі пенси, вага — Enc; лише якості з `QUALITY_REGISTRY[key].implemented === true`.
- JSON-рядки пишуть **усі** поля, які схема інакше доповнила б дефолтами (`overcast`, `qty`, `consumed`, `focus`), щоб повторний запуск завантажувача був no-op.
- Нові тексти `messages` — лише: `contentImport.fields.artifacts.systemStats`, `abilityRegistry.effects.wfrpAttack.options.attack.ranged`, `wfrpTraits.recipes.ranged.*` (uk/en) і новий текст наявного `abilities.validation.traitRangeBreathOnly`. `scope-size`/OpenAPI-ліміти піднімати лише якщо тест падає, мінімально, з коментарем «5g-3 …».
- Імпорти `@/…`, `import/no-cycle` увімкнено; коментарі мінімальні.
- Кожен коміт лишає `pnpm test:run scripts/grim/__tests__/real-data.test.ts` зеленим.

## Review Focus

1. **`systemStats` через генеричний імпорт у не-wfrp кампанії.** Рядок артефакта з `systemStats` у dnd5e/homm мусить дати помилку рядка `SYSTEM_STATS_UNSUPPORTED` і нічого не створити; `null` в update-режимі — очистити колонку; пропуск — зберегти. Тест: Task 2 (`artifact-system-stats.test.ts`).
2. **Повторний запуск завантажувача.** Zod-дефолти (`overcast: null`, `qty: 1`, `consumed: false`) і нормалізація `systemStats` не мають давати `~N`. Очікування: другий запуск — `published: { added: 0, changed: 0, removed: 0 }`, ті самі кількості, включно зі `spells`/`artifacts`. Тест: Task 10 («a second run is a no-op»), правило даних Task 8.
3. **Юніт знає заклинання, яке не може скастувати** (CN вище за найкращий SL юніта з урахуванням AP-Trait). Очікування: помилка валідатора. Тест: Task 4.
4. **Предмет, що проходить `WfrpItemStatsSchema`, але не підходить слоту** (стрілецька зброя в `weapon`, щит-`gear` без `shield X`, броня з AP голови в `armor`, `defensive`/`wrap`, `reload` без `ammoCapacity`). Очікування: помилка валідатора. Тест: Task 5.
5. **Мискаст бере таблицю шаблону, а не дефолт.** Невдалий каст із дублем у клоні має писати текст рядка `miscastMinor` шаблону (не `wfrpMagic.miscast.minor.*`). Тест: Task 9.

## Перевірки коду (Task 1 їх відтворює)

| # | Твердження | Результат |
|---|---|---|
| a | Мінімальна правка для Trait `ranged` | **Нове поле схеми ефекту не потрібне.** `WfrpAttackSchema` (`lib/utils/abilities/schema/effects.ts:310`) має `attack: z.enum(TRAIT_ATTACKS)`, `rangeFt` і refine «`rangeFt` лише для `breath`» (`traitRangeBreathOnly`). Досить: додати `"ranged"` у `TRAIT_ATTACKS` (`schema/kinds.ts:90`), refine → `breath`/`ranged`; у `wfrpUnitBuild.attackProfile` гілка `ranged` → `{ range: "ranged", rangeFt: e.rangeFt ?? RANGED_DEFAULT_RANGE_FT, damageFlat, addSb: true, qualities: [], flaws: [], twoHanded: false }`; рецепт `attack("ranged", [num("rangeFt", …)])` пише `rangeFt` і для `ranged`; у `registry/effects/traits.ts` `visibleWhen` для `rangeFt` — `breath` або `ranged`. `extract-wfrp-attacks.ts` змін не потребує: `wfrpAttackFromProfile` дає `type: ranged`, `range: "<ft> ft"`, без Blast, без `noSb` (бо `addSb: true`), атакує BS (`resolve-attack.ts:25`). Побічні наслідки: `TRAIT_RECIPES` стає 15 → `UNIT_TRAIT_COVERAGE` автоматично вимагає юніта з `ranged` (тому дані юнітів — у тій самій задачі), `recipes.test` (14 → 15), `label-keys-wfrpTraits`/`label-keys-abilityRegistry` вимагають ключі, `scripts/grim/units.ts` (`unitTraits`, `recipeValues`) мають знати `ranged`, інакше `rebuildTrait` не збіжиться. |
| b | `systemStats` проходить `IMPORT_SPECS → createArtifactSchema → ресурс` | **Частково.** `createArtifactSchema`/`patchArtifactSchema` мають `systemStats: z.unknown().nullable().optional()`; `artifactsResource.prepareCreate/create/update` викликають `systemStatsColumn` → `systemStatsOrThrow` (`SYSTEM_STATS_SCHEMAS[system.key]`; d20/homm → 400 `SYSTEM_STATS_UNSUPPORTED`, невалідне → 400 `SYSTEM_STATS_INVALID`, `null` → `DbNull`). Але `ARTIFACTS_IMPORT` (`lib/utils/content/import/fields/artifacts.ts`) не має поля → `coerceRecord` дає `unknownField` (у `validateGrimData` помилка, в `importContent` тихе відкидання). Потрібні `jsonField("systemStats")` + підпис `contentImport.fields.artifacts.systemStats` (тест `label-keys-contentImport`). `contentRowHash` уже хешує `systemStats` (5f). Ресурс зберігає `parsed.data` (strictObject без дефолтів) — нормалізації, що ламала б no-op, немає. |
| c | `UNIT_LEVEL_BANDS` розширюється ranged-діапазоном | **Так.** `UnitLevelBand` (`scripts/grim/units.ts`) + `bandIssues` (`range = a.attack === "breath" ? band.breath : band.attack`): додати поле `ranged: Range` і гілку; `unitTraits` (case `"ranged"` → `attacks` з `rangeFt`), `recipeValues` (case `"ranged"` → `{ damage, rangeFt, magical }`), глобальний `UNIT_RANGED_FT: Range = [24, 300]`. |
| d | `knownSpells ⊆ spells` | **Уже є.** `UNITS_IMPORT.knownSpells` — `refList` на `spells`, `validateLinks` дає `unknown knownSpells "…"` (тест у `validate-data.test.ts:67`). Нове лише: перевірка «юніт може скастувати» (CN ≤ стеля SL, Рішення 4) і дозвіл `knownSpells` у `real-data.test`. |
| e | Як юніт кастує | `from-unit.ts` `monsterSpellcasting`: не-монстр отримує `spellcasting.knownSpells = unit.knownSpells`; wfrp `magic.slots = false`, тож слоти не витрачаються. Ціль касту — `skillTarget(language:magick) ?? Int` мінус `armourSl` (= max(head, body) AP-Trait, юніт не flexible), молитви — `Fel`, без броні; успіх лише при SL ≥ CN (`cast-test.ts`). **Окремі `abilities` для кастів не потрібні.** |
| f | Overcast і сила заклинань | `overcast: "targets"` рушій не підтримує («Межі 5d-3»); `"dice"` додає `upcastDice × кроки` кубиків до `spellRoll`. Кубики не-5e кастера — модель HOMM (`spells/model/dice.ts`: герой `dice + ⌊level/3⌋` d(6 або майстерність), юніт `dice + ⌊level/2⌋` d`unitSides(level)`), `dieSides` ігнорується. Умови 5e (`applyCondition`) у wfrp інертні (`unusedMechanics: conditions`); стани wfrp — лише `casting.magic.attribute` (`condition` з `WFRP_CONDITION_KEYS`, `levels` 1–3). |
| g | Інгредієнти й ціни | `ingredientsRequireMaterial`: інгредієнти вимагають `componentFlags.m === true`. `minGp` — у верхній монеті системи (wfrp `gp` = 1 зк = 240 п, `plan.ts:53`), тож пенси/240 (6 п = 0.025, 12 п = 0.05, 24 п = 0.1, 36 п = 0.15, 60 п = 0.25, 120 п = 0.5 — точні у JS). `price` у `systemStats` — пенси (`wfrpEquipmentEditor.price` = «Price, pence»), `range` зброї — фути (`rangeFt = range`), вага — Enc (ліміт SB+TB). |
| h | Таблиці в `rules.json` | `tables` — **верхній** розділ `Ruleset` (сусід `advancement`, не всередині), `RulesetPatchSchema` вже перевіряє порядок/100/ефекти (`TablesRulesSchema`); мискаст читає `rules.tables[slot] ?? DEFAULT_TABLES[slot]` і `row.text` (`tables/resolve.ts`). |
| i | Побічні тести | `coverage.test` «reports only the known fixture gaps» фільтрує лише `units` — після Task 7 фільтр має відкидати й `spells`/`artifacts`; `real-data.test` «units carry no spells…» і очікування `manifest` змінюються в Task 8; фікстурне заклинання `Rot Touch` (5e-форма) не пройде новий валідатор — переписується в Task 4. |

**Розбіжності зі spec (явно):**

1. Spec §2 «кастери отримують `knownSpells` і **відповідні `abilities` для кастів**» — не потрібно (перевірка e) і суперечить правилу 5g-2 «`abilities` юніта = лише вихід рецептів Traits». План: лише `knownSpells`.
2. Spec §2/§3 «Overcast лише `dice`/`targets`» — `targets` рушій не підтримує (перевірка f). План: дозволено `null|"dice"`, `"targets"` — помилка валідатора.
3. Spec §2 «~6 кастерів (Cultists, Horrors)» з CN за kind: більшість юнітів 5g-2 мають Int 10–30 і AP-Trait, тож arcane CN 4+ для них нездійсненні (перевірка e). План бере 6 кастерів Cultists/Horrors зі здійсненними заклинаннями (Рішення 4); решта заклинань — для героїв (у `grimInfo`, не попередження).
4. Spec §1 «Перевірка (`knownSpells` ⊆ імена)» вже існує (перевірка d).

## Рішення (закриття «Відкрито для plan» spec)

### Рішення 1. Списки шкіл (`lists`) і CN за kind

`GRIM_SPELL_LISTS` (`scripts/grim/spells.ts`) — kind → дозволені списки (рівно один у рядку):

| kind | lists | CN | overcast | інгредієнти |
|---|---|---|---|---|
| petty | `Cantrips` | 0–2 | лише `null` | ні |
| arcane | `School of Embers`, `School of Gloam` | 3–12 | `null`/`dice` | так (опційно) |
| hedge | `Fenlore` | 3–12 | `null`/`dice` | так |
| witchcraft | `Thornwitchery` | 3–12 | `null`/`dice` | так |
| blessing | `Hearth Rites` | 0 | лише `null` | ні |
| miracle | `Hearth Rites` | 6–14 | лише `null` | ні |

`chaos` заборонений. Інгредієнт — максимум один, `qty: 1`, `consumed: true`, `focus: false`, ціна 6–240 п (`minGp × 240` ціле), і тоді `componentFlags: { "v": true, "s": true, "m": true }`; без інгредієнта `componentFlags` відсутній.

### Рішення 2. Форма рядка заклинання

Ключі (інші — помилка): `name`, `level` (= 1), `cost` (= `"action"`), `description` (1–200), `casting` (лише `{ magic }`), `targeting`, `dice`, `upcastDice`, `spellEffects`, `ingredients`, `componentFlags`, `lists`. Правила: `dice ≥ 1` ⇔ є рівно один ефект (`dealDamage` з `damageType: "magic"` або `heal`, обидва `amount: { spellRoll: 100 }`); `overcast: "dice"` ⇔ `upcastDice: 1` і `dice ≥ 1`; `heal` → `targeting` `ally` / `area` з `side: "ally"`; `dealDamage`/`attribute` → `enemy` / `area` / `template` з `side: "enemy"`; заклинання без ефекту мусить мати `attribute`. `targeting` лише `ally`, `enemy`, `area`, `template` (`shape: "circle"`).

Приклад (дослівно, Ember Dart):

```json
{"name":"Ember Dart","level":1,"cost":"action","description":"A hissing dart of flame that leaves its mark smouldering.","casting":{"magic":{"cn":4,"kind":"arcane","overcast":"dice","attribute":{"condition":"ablaze","levels":1}}},"targeting":{"kind":"enemy","range":90},"dice":1,"upcastDice":1,"spellEffects":[{"kind":"dealDamage","amount":{"spellRoll":100},"damageType":"magic"}],"ingredients":[{"name":"Charred Bone Chip","qty":1,"minGp":0.05,"consumed":true,"focus":false}],"componentFlags":{"v":true,"s":true,"m":true},"lists":["School of Embers"]}
```

Без ефекту й інгредієнта (Chill Breath): `{"name":"Chill Breath","level":1,"cost":"action","description":"…","casting":{"magic":{"cn":1,"kind":"petty","overcast":null,"attribute":{"condition":"fatigued","levels":1}}},"targeting":{"kind":"enemy","range":15},"dice":0,"spellEffects":[],"lists":["Cantrips"]}`. Area: `{"kind":"area","side":"enemy","maxTargets":3,"range":60}`; template: `{"kind":"template","shape":"circle","size":10,"side":"enemy","maxTargets":4,"range":60}`.

### Рішення 3. Предмети: слот ⇄ тип, групи, діапазони

| slot | `systemStats.type` | додатково |
|---|---|---|
| `weapon` | `weapon` з `reach` | група ближня |
| `range_weapon` | `weapon` з `range` (фути) | група стрілецька |
| `armor` | `armour` | `locations.head = 0` |
| `helmet` | `armour` | лише `head > 0` |
| `boots` | `armour` | лише `leg > 0` |
| `shield` | `gear` | рівно одна якість `shield X`, X 1–3 |
| `item` | `gear` | без якостей |

Інші слоти (`cloak`, `ring`, `amulet`) — помилка. `qualities` містять лише ключі `kind: "quality"`, `flaws` — лише `kind: "flaw"`, усе з `implemented: true`. `reload X` у `flaws` ⇔ `ammoCapacity` задано. `GRIM_WEAPON_GROUPS` = 8 ближніх + 5 стрілецьких нижче (`engineering`, `entangling`, `explosives` — помилка).

Діапазони (`WEAPON_GROUP_BANDS`, `ARMOUR_KIND_BANDS`, `SHIELD_BAND`, `GEAR_BAND`; ціна — цілі пенси):

| Група / kind | `damage.flat` | `addSb` | `range`, фт | вага | ціна, п | інше |
|---|---|---|---|---|---|---|
| basic | 1–5 | true | — | 0–2 | 6–480 | |
| fencing | 3–5 | true | — | 0–1 | 240–960 | |
| brawling | 0–3 | true | — | 0–1 | 6–240 | |
| polearm | 3–6 | true | — | 1–3 | 120–720 | |
| twohanded | 5–7 | true | — | 2–3 | 480–1440 | `twoHanded: true` |
| flail | 3–6 | true | — | 1–3 | 120–720 | |
| parry | 1–3 | true | — | 0–1 | 60–480 | |
| cavalry | 4–7 | true | — | 2–3 | 480–1440 | |
| bow | 2–5 | true | 90–360 | 1–3 | 120–960 | `twoHanded: true` |
| crossbow | 6–10 | false | 120–360 | 1–3 | 360–1440 | `twoHanded: true`, `reload` |
| sling | 3–7 | false | 60–240 | 0–1 | 6–60 | |
| throwing | 0–6 | будь-яке | 12–60 | 0–1 | 6–240 | |
| blackpowder | 7–10 | false | 30–360 | 0–3 | 960–2880 | `reload` |
| armour soft | AP 0–1 | | | 0–2 | 12–360 | |
| armour mail | AP 0–2 | | | 1–3 | 240–1440 | |
| armour plate | AP 0–3 | | | 1–6 | 480–4800 | |
| shield | `shield` 1–3 | | | 0–3 | 12–480 | |
| gear | | | | 0–2 | 1–480 | |

### Рішення 4. Юніти: `ranged` і `knownSpells`

`UNIT_LEVEL_BANDS[level].ranged` (шкода атаки-Trait `ranged`): 1 → 1–4, 2 → 2–6, 3 → 3–8, 4 → 5–10; `UNIT_RANGED_FT = [24, 300]` для `rangeFt`. Стеля SL юніта для `knownSpells` (`castCeiling`): молитва (`blessing|miracle`) → `⌊Fel/10⌋`; інше → `⌊Int/10⌋ − AP` (AP = значення рецепта `armour`, 0 без нього). Помилка, якщо CN заклинання > стелі. Шкода `ranged` додає SB (рішення spec; «Звірити з книгою»).

### Рішення 5. Таблиці мискастів

`rules.json` отримує верхній розділ `tables` лише зі слотами `miscastMinor`, `miscastMajor`, `wrath` (інший слот — помилка), кожен 8–10 рядків, `text` обов'язковий 1–120 символів, ефекти — лише `wounds`/`condition` (`SLOT_EFFECTS`), без `unconscious`/`surprised` (нескінченні в рушії); порядок і `max: 100` перевіряє вже `RulesetPatchSchema`.

### Рішення 6. Покриття й інформація

`grimCoverage` (попередження, у реальному каталозі порожнє; кожна гілка мовчить, якщо відповідний файл порожній): kind з Рішення 1 без заклинання; список з `GRIM_SPELL_LISTS` без заклинання; група `GRIM_WEAPON_GROUPS` без предмета; `ARMOUR_KINDS` без предмета; слот `armor`/`helmet`/`boots`/`shield` без предмета; implemented-якість/вада без носія; тема `Cultists`/`Horrors` без юніта з `knownSpells` (лише коли є заклинання). Нове `grimInfo(data)`: заклинання, яких не знає жоден юніт (`info: spells "X": known by no unit`) — CLI друкує через `console.info`, тести не вимагають порожнього.

## Ростер (єдине джерело імен і чисел)

### Заклинання (30, у цьому порядку)

Скорочення: `T` — targeting (`enemy N` = `{kind:"enemy",range:N}`, `ally N`, `area enemy×K N` = `{kind:"area",side,maxTargets:K,range:N}`, `circle S enemy×K N` = template); `d/u` — `dice`/`upcastDice` (`—` = поле відсутнє); `eff` — `dmg` = `dealDamage`, `heal`, `—` = `[]`; `attr` — `attribute`; інгредієнт — назва, пенси (`minGp`).

| # | name | kind | list | CN | overcast | T | d/u | eff | attr | інгредієнт | description |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Spark Flick | petty | Cantrips | 1 | null | enemy 30 | 1/— | dmg | — | — | A snap of the fingers flings a stinging spark. |
| 2 | Soothing Touch | petty | Cantrips | 0 | null | ally 5 | 1/— | heal | — | — | A warm palm eases a bruise or a shallow cut. |
| 3 | Chill Breath | petty | Cantrips | 1 | null | enemy 15 | 0/— | — | fatigued 1 | — | A breath of frost that leaves the target sluggish. |
| 4 | Dazzle | petty | Cantrips | 2 | null | enemy 30 | 0/— | — | blinded 1 | — | A flash of light bursts before the target's eyes. |
| 5 | Muffle | petty | Cantrips | 1 | null | enemy 30 | 0/— | — | deafened 1 | — | Sudden silence wraps the target's ears. |
| 6 | Tripwire Hex | petty | Cantrips | 2 | null | enemy 30 | 0/— | — | prone 1 | — | An unseen cord snags the target's ankle. |
| 7 | Ember Dart | arcane | School of Embers | 4 | dice | enemy 90 | 1/1 | dmg | ablaze 1 | Charred Bone Chip, 12 (0.05) | A hissing dart of flame that leaves its mark smouldering. |
| 8 | Searing Brand | arcane | School of Embers | 6 | null | enemy 30 | 0/— | — | ablaze 2 | — | A glowing sigil sears itself onto the target's skin. |
| 9 | Smoke Veil | arcane | School of Embers | 5 | null | area enemy×3 60 | 0/— | — | blinded 1 | — | Choking smoke rolls over a knot of foes. |
| 10 | Cinder Cloud | arcane | School of Embers | 8 | dice | circle 10 enemy×4 60 | 1/1 | dmg | — | Pinch of Sulphur, 24 (0.1) | A cloud of burning cinders settles over an area. |
| 11 | Pyre Lance | arcane | School of Embers | 11 | dice | enemy 120 | 2/1 | dmg | ablaze 1 | Furnace Slag, 60 (0.25) | A white-hot spear of flame lances across the field. |
| 12 | Shade Bolt | arcane | School of Gloam | 4 | dice | enemy 90 | 1/1 | dmg | — | Crow Feather, 12 (0.05) | A bolt of cold darkness that bites to the bone. |
| 13 | Grasping Shadows | arcane | School of Gloam | 6 | null | enemy 60 | 0/— | — | entangled 1 | — | The target's own shadow clutches at its legs. |
| 14 | Gloam Daze | arcane | School of Gloam | 7 | null | enemy 60 | 0/— | — | stunned 2 | — | Dusk floods the target's mind and stalls its thoughts. |
| 15 | Pall of Dread | arcane | School of Gloam | 9 | null | area enemy×3 60 | 0/— | — | broken 1 | Vial of Grave Dust, 36 (0.15) | A grey pall settles and courage drains away. |
| 16 | Hollow Scream | arcane | School of Gloam | 12 | dice | circle 15 enemy×6 30 | 2/1 | dmg | deafened 1 | Shard of Black Glass, 120 (0.5) | A soundless scream that cracks stone and eardrums alike. |
| 17 | Mending Moss | hedge | Fenlore | 3 | dice | ally 5 | 1/1 | heal | — | Bog Moss, 6 (0.025) | Damp moss pressed to a wound knits the flesh. |
| 18 | Fen Fog | hedge | Fenlore | 5 | null | area enemy×4 60 | 0/— | — | fatigued 1 | — | A clammy marsh fog that weighs down the limbs. |
| 19 | Bramble Snare | hedge | Fenlore | 6 | null | enemy 60 | 0/— | — | entangled 2 | Knotted Briar, 12 (0.05) | Thorny runners burst from the ground around the target. |
| 20 | Sour Blood | witchcraft | Thornwitchery | 5 | dice | enemy 30 | 1/1 | dmg | poisoned 1 | Toadstool Cap, 12 (0.05) | The target's blood curdles and burns in its veins. |
| 21 | Withering Glance | witchcraft | Thornwitchery | 7 | null | enemy 60 | 0/— | — | fatigued 2 | — | A long stare that saps the strength from a body. |
| 22 | Crow-Knot Curse | witchcraft | Thornwitchery | 10 | dice | enemy 60 | 2/1 | dmg | bleeding 1 | Crow Skull, 36 (0.15) | A knotted cord pulled tight opens old wounds anew. |
| 23 | Blessing of Mending | blessing | Hearth Rites | 0 | null | ally 10 | 1/— | heal | — | — | A murmured hearth-prayer that closes a cut. |
| 24 | Blessing of Embers | blessing | Hearth Rites | 0 | null | enemy 30 | 1/— | dmg | — | — | A spark from the hearth leaps at the faithful's foe. |
| 25 | Hearthward Rebuke | blessing | Hearth Rites | 0 | null | enemy 30 | 0/— | — | prone 1 | — | A stern word that drives a foe to its knees. |
| 26 | Hush of the Hearth | blessing | Hearth Rites | 0 | null | enemy 30 | 0/— | — | deafened 1 | — | A hush falls over the target like a banked fire. |
| 27 | Mercy of the Hearth | miracle | Hearth Rites | 6 | null | area ally×4 30 | 2/— | heal | — | — | Warmth spreads through the faithful and wounds close. |
| 28 | Hearthfire Smite | miracle | Hearth Rites | 7 | null | enemy 60 | 2/— | dmg | ablaze 1 | — | A column of hearthfire falls upon the wicked. |
| 29 | Stilling Word | miracle | Hearth Rites | 9 | null | area enemy×3 60 | 0/— | — | stunned 1 | — | A single holy word that freezes foes mid-stride. |
| 30 | Last Light | miracle | Hearth Rites | 12 | null | ally 10 | 4/— | heal | — | — | The last ember of the hearth rekindles a failing life. |

### Предмети (56, у цьому порядку)

`AP` — `head/arm/body/leg`; `q` — qualities, `f` — flaws (`reload 1` = `{ "key": "reload", "value": 1 }`); `2H` — `twoHanded`; `ammo` — `ammoCapacity`; ціна — пенси.

**Ближня зброя (slot `weapon`, `addSb: true`)**

| name | group | reach | flat | q | f | 2H | вага | ціна | rarity | description |
|---|---|---|---|---|---|---|---|---|---|---|
| Arming Sword | basic | average | 4 | — | — | false | 1 | 240 | common | A plain, well-balanced sword for one hand. |
| Hatchet | basic | average | 3 | hack | — | false | 1 | 60 | common | A short axe as good for kindling as for skulls. |
| Cudgel | basic | average | 2 | pummel | undamaging | false | 1 | 12 | common | A knotted length of hardwood. |
| Long Knife | basic | very-short | 2 | — | — | false | 0 | 30 | common | A heavy knife with a forearm-long blade. |
| Flanged Mace | basic | average | 4 | pummel | — | false | 1 | 180 | common | An iron head of flanges on an ash haft. |
| Spear | polearm | long | 4 | impale | — | false | 2 | 180 | common | A leaf-bladed spear for keeping foes at bay. |
| Halberd | polearm | long | 5 | hack, impale | — | true | 3 | 480 | common | An axe blade and spike on a long pole. |
| Rapier | fencing | long | 4 | fast, impale | — | false | 1 | 600 | uncommon | A slender thrusting blade with a swept hilt. |
| Duelling Blade | fencing | average | 3 | fast, precise | — | false | 1 | 480 | uncommon | A light sword made for the duelling yard. |
| Knuckle Iron | brawling | personal | 2 | pummel | — | false | 0 | 30 | common | A bar of iron gripped in the fist. |
| Greatsword | twohanded | long | 6 | damaging, hack | — | true | 3 | 1200 | uncommon | A long two-handed blade that cleaves mail. |
| Maul | twohanded | average | 6 | damaging, pummel | slow | true | 3 | 720 | common | A sledge-headed hammer swung with both hands. |
| Chain Flail | flail | average | 5 | pummel | dangerous, imprecise | false | 1 | 360 | uncommon | Spiked balls on chains that whirl unpredictably. |
| Parrying Dagger | parry | very-short | 2 | fast | — | false | 0 | 120 | common | A stiff dagger carried in the off hand. |
| Swordbreaker | parry | short | 3 | precise | — | false | 1 | 240 | uncommon | A notched blade made to catch an enemy's steel. |
| Lance | cavalry | very-long | 6 | impale | slow | false | 3 | 720 | uncommon | A long couched spear for the charge. |

**Стрілецька зброя (slot `range_weapon`)**

| name | group | range | addSb | flat | q | f | 2H | ammo | вага | ціна | rarity | description |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hunting Bow | bow | 150 | true | 3 | — | — | true | — | 2 | 240 | common | A yew bow for game and the occasional bandit. |
| Longbow | bow | 300 | true | 4 | accurate, damaging | — | true | — | 3 | 600 | uncommon | A tall bow that takes years of practice to draw. |
| Light Crossbow | crossbow | 180 | false | 7 | — | reload 1 | true | 1 | 2 | 600 | common | A stirrup crossbow spanned by hand. |
| Heavy Crossbow | crossbow | 300 | false | 9 | penetrating | reload 2 | true | 1 | 3 | 1200 | uncommon | A steel-limbed crossbow wound with a crank. |
| Sling | sling | 180 | false | 6 | — | — | false | — | 0 | 12 | common | A leather cradle on two cords. |
| Throwing Knife | throwing | 36 | true | 1 | — | — | false | — | 0 | 18 | common | A small balanced blade for throwing. |
| Pitch Bomb | throwing | 24 | false | 6 | blast 2 | dangerous | false | — | 0 | 120 | uncommon | A clay pot of burning pitch with a rag fuse. |
| Matchlock Pistol | blackpowder | 60 | false | 8 | pistol, damaging | reload 1, unreliable | false | 1 | 0 | 1920 | uncommon | A smoking pistol lit by a slow match. |
| Long Musket | blackpowder | 300 | false | 9 | damaging, penetrating | reload 2, dangerous | true | 1 | 3 | 2400 | uncommon | A long-barrelled gun rested on a forked stick. |

**Щити (slot `shield`, `type: "gear"`)**

| name | shield X | вага | ціна | rarity | description |
|---|---|---|---|---|---|
| Wicker Shield | 1 | 1 | 24 | common | Woven willow stretched with hide. |
| Buckler | 1 | 0 | 60 | common | A small round shield held in the fist. |
| Round Shield | 2 | 1 | 120 | common | A planked shield with an iron boss. |
| Kite Shield | 3 | 3 | 360 | uncommon | A tall tapering shield that covers a rider's leg. |

**Броня (`type: "armour"`)**

| name | slot | kind | AP h/a/b/l | q | вага | ціна | rarity | description |
|---|---|---|---|---|---|---|---|---|
| Padded Jack | armor | soft | 0/1/1/0 | flexible | 1 | 120 | common | A quilted linen jacket stuffed with tow. |
| Quilted Coat | armor | soft | 0/1/1/1 | flexible | 2 | 240 | common | A long padded coat reaching the knees. |
| Leather Cap | helmet | soft | 1/0/0/0 | flexible | 0 | 36 | common | A boiled-leather cap. |
| Hide Leggings | boots | soft | 0/0/0/1 | flexible | 1 | 60 | common | Thick hide wrapped around the shins. |
| Ring Shirt | armor | mail | 0/0/2/0 | flexible | 2 | 600 | common | A sleeveless shirt of riveted rings. |
| Chain Hauberk | armor | mail | 0/2/2/2 | flexible | 3 | 1200 | uncommon | A mail coat with sleeves and a split skirt. |
| Mail Hood | helmet | mail | 2/0/0/0 | flexible | 1 | 360 | common | A hood of fine rings worn under a cap. |
| Mail Chausses | boots | mail | 0/0/0/2 | flexible | 1 | 480 | uncommon | Mail leggings laced to the belt. |
| Steel Breastplate | armor | plate | 0/0/3/0 | — | 3 | 1440 | uncommon | A hammered breast and back plate. |
| Plate Harness | armor | plate | 0/3/3/3 | — | 6 | 4800 | uncommon | Fitted plate for arms, body and legs. |
| Visored Helm | helmet | plate | 3/0/0/0 | — | 1 | 720 | uncommon | A steel helm with a hinged visor. |
| Plate Sabatons | boots | plate | 0/0/0/3 | — | 2 | 960 | uncommon | Jointed steel shoes and greaves. |

**Спорядження (slot `item`, `type: "gear"`, `qualities: []`)**

| name | вага | ціна | rarity | description |
|---|---|---|---|---|
| Arrows (12) | 0 | 60 | common | A bundle of goose-fletched arrows. |
| Crossbow Bolts (12) | 0 | 60 | common | Short square-headed bolts. |
| Sling Stones (20) | 0 | 6 | common | Smooth river stones in a pouch. |
| Powder and Shot (12) | 0 | 120 | uncommon | Measured charges and lead balls in a horn. |
| Backpack | 1 | 24 | common | A leather pack with buckled straps. |
| Bedroll | 1 | 12 | common | A rolled blanket and oiled groundsheet. |
| Rope (10 yards) | 1 | 24 | common | Stout hemp rope. |
| Lantern | 1 | 60 | common | A hooded lantern with horn panes. |
| Lamp Oil | 0 | 6 | common | A stoppered flask of oil. |
| Tinderbox | 0 | 12 | common | Flint, steel and dry tinder. |
| Waterskin | 0 | 6 | common | A goatskin water bag. |
| Bandages | 0 | 12 | common | Clean linen strips. |
| Crowbar | 1 | 36 | common | An iron bar flattened at one end. |
| Lockpicks | 0 | 120 | uncommon | Fine wire picks in a cloth roll. |
| Trail Rations (week) | 1 | 30 | common | Hard bread, cheese and dried meat. |

Приклади рядків (дослівно):

```json
{"name":"Light Crossbow","description":"A stirrup crossbow spanned by hand.","rarity":"common","slot":"range_weapon","systemStats":{"type":"weapon","group":"crossbow","range":180,"damage":{"addSb":false,"flat":7},"qualities":[],"flaws":[{"key":"reload","value":1}],"twoHanded":true,"ammoCapacity":1,"weight":2,"price":600}}
{"name":"Chain Hauberk","description":"A mail coat with sleeves and a split skirt.","rarity":"uncommon","slot":"armor","systemStats":{"type":"armour","locations":{"head":0,"arm":2,"body":2,"leg":2},"kind":"mail","qualities":[{"key":"flexible"}],"weight":3,"price":1200}}
{"name":"Round Shield","description":"A planked shield with an iron boss.","rarity":"common","slot":"shield","systemStats":{"type":"gear","weight":1,"price":120,"qualities":[{"key":"shield","value":2}]}}
```

### Таблиці мискастів (`rules.json` → `tables`)

`c` — `{ "type": "condition", "key", "levels" }`, `w` — `{ "type": "wounds", "amount" }`.

| slot | max | text | effects |
|---|---|---|---|
| miscastMinor | 10 | A smell of scorched hair clings to you, and nothing worse. | — |
| miscastMinor | 20 | Your ears ring with a sound only you can hear. | c deafened 1 |
| miscastMinor | 30 | A wave of weariness drags at your limbs. | c fatigued 1 |
| miscastMinor | 40 | Your nose bleeds freely. | c bleeding 1 |
| miscastMinor | 50 | Sparks jump between your teeth. | w 1 |
| miscastMinor | 60 | Your vision swims with afterimages. | c blinded 1 |
| miscastMinor | 70 | The spell recoils and knocks you off your feet. | c prone 1 |
| miscastMinor | 80 | A cold spasm locks your jaw. | c stunned 1 |
| miscastMinor | 90 | Pain lances behind your eyes. | w 2 |
| miscastMinor | 100 | Raw power scours you from the inside. | c fatigued 1, w 2 |
| miscastMajor | 10 | Your shadow tears loose and claws at you before fading. | w 2 |
| miscastMajor | 20 | Flames lick up your sleeves. | c ablaze 1 |
| miscastMajor | 30 | Blood seeps from your eyes and ears. | c bleeding 2 |
| miscastMajor | 40 | The world tilts and you collapse, twitching. | c prone 1, c stunned 1 |
| miscastMajor | 50 | A thunderclap bursts beside your head. | c deafened 1, c stunned 1 |
| miscastMajor | 60 | Searing light fills your eyes. | c blinded 1, w 2 |
| miscastMajor | 70 | Unseen things whisper your name until you flee. | c broken 2 |
| miscastMajor | 80 | Your heart stutters under the backlash. | w 4, c fatigued 1 |
| miscastMajor | 90 | Fire bursts from your mouth and hands. | c ablaze 2, w 3 |
| miscastMajor | 100 | The backlash hurls you down, senseless and bleeding. | c stunned 3, w 5 |
| wrath | 12 | A hush falls and your next breath tastes of ash. | c fatigued 1 |
| wrath | 25 | Your words catch in a throat gone dry. | c stunned 1 |
| wrath | 37 | A ringing like a great bell fills your skull. | c deafened 1 |
| wrath | 50 | Your knees buckle under an unseen weight. | c prone 1 |
| wrath | 62 | Shame burns in you until you can barely act. | c broken 1 |
| wrath | 75 | Your palms split open as if scourged. | c bleeding 1, w 1 |
| wrath | 87 | Light pours from the sky into your eyes. | c blinded 1 |
| wrath | 100 | Hearthfire scorches your skin for your failings. | c ablaze 1, w 2 |

### Юніти

`ranged` (додається останнім елементом `abilities`; `id: "ranged"`, `trigger: { "event": "passive" }`, ефект `{ "kind": "wfrpAttack", "attack": "ranged", "damage": D, "rangeFt": R }`):

| unit | рів. | name здібності | D | R |
|---|---|---|---|---|
| Ditch Cutthroat | 1 | Sling +3 | 3 | 120 |
| Ridge Reaver | 2 | Shortbow +4 | 4 | 150 |
| Broadhelm Captain | 3 | Crossbow +7 | 7 | 180 |
| Ember Acolyte | 1 | Throwing Knives +2 | 2 | 30 |

`knownSpells` (новий ключ після `abilities`; стеля — Рішення 4):

| unit | тема | Int / Fel / AP | стеля arcane / prayer | knownSpells |
|---|---|---|---|---|
| Ember Acolyte | Cultists | 30 / 30 / 0 | 3 / 3 | Spark Flick, Chill Breath |
| Ashen Zealot | Cultists | 28 / 30 / 0 | 2 / 3 | Blessing of Embers, Blessing of Mending |
| Masked Oracle | Cultists | 55 / 50 / 2 | 3 / 5 | Dazzle, Muffle, Tripwire Hex |
| Gilded Voice | Cultists | 65 / 70 / 2 | 4 / 7 | Spark Flick, Ember Dart, Hearthfire Smite |
| Veil Stalker | Horrors | 30 / 5 / 0 | 3 / 0 | Dazzle, Chill Breath |
| Pallid Crawler | Horrors | 15 / 5 / 0 | 1 / 0 | Muffle |

Решта рядків `units.json` не змінюється.

## Структура файлів

- Створюються: `scripts/grim/spells.ts`, `scripts/grim/equipment.ts`, `scripts/grim/__tests__/{spells,equipment,tables}.test.ts`, `scripts/grim/__tests__/fixtures/artifacts.json`, `scripts/grim/__tests__/grim-e2e-helpers.ts`, `scripts/grim/__tests__/arsenal-e2e.test.ts`, `data/templates/grim-d100/{spells,artifacts}.json`.
- Змінюються: `lib/utils/abilities/schema/{kinds,effects}.ts`, `lib/utils/abilities/registry/effects/traits.ts`, `lib/utils/rules/systems/wfrp/traits/{constants,recipes,unit-build}.ts`, `lib/utils/content/import/fields/artifacts.ts`, `messages/{uk,en}/{contentImport,abilityRegistry,wfrpTraits,abilities}.json`; тести `lib/utils/rules/systems/wfrp/traits/__tests__/{recipes,unit-build}.test.ts`, `lib/server/content/__tests__/artifact-system-stats.test.ts`; `scripts/grim/{units,validate-data,coverage,forbidden-terms,load-template}.ts`, фікстури `scripts/grim/__tests__/fixtures/spells.json`, тести `scripts/grim/__tests__/{units,validate-data,coverage,forbidden-terms,real-data,bestiary-e2e}.test.ts`, `scripts/grim/__tests__/{real-data,load-template}.integration.test.ts`, `data/templates/grim-d100/{units,rules,manifest}.json`; доки `docs/architecture/rule-systems.md`, `docs/architecture/content-api.md`, `docs/STATUS.md`.

## Групи диспетчеризації

| Група | Задачі | Примітка |
|---|---|---|
| A | Task 1 + Task 2 + Task 3 | перевірки, імпорт `systemStats`, Trait `ranged` (+ ranged-рядки юнітів) |
| B | Task 4 + Task 5 | валідатори заклинань і спорядження |
| C | Task 6 + Task 7 | таблиці, сканер, покриття |
| D | Task 8 | дані (один коміт) |
| E | Task 9 | e2e |
| F | Task 10 + Task 11 | інтеграція на БД `wfrp`, CLI-смоук, доки |

Після F — фінальне Opus-рев'ю (diff від `0839b0538`), одна хвиля виправлень, `/simplify`.

---

### Task 1: Перевірки коду (без змін)

**Files:** немає. Розбіжність з очікуваним — зупинитися й повідомити контролера.

- [ ] **Step 1: (a) `ranged`.**

```bash
cd /Users/silentfox/Work/dnd-tracker-wfrp
grep -n "TRAIT_ATTACKS =" lib/utils/abilities/schema/kinds.ts
grep -n "WfrpAttackSchema" -A9 lib/utils/abilities/schema/effects.ts
grep -n "function attackProfile" -A8 lib/utils/rules/systems/wfrp/traits/unit-build.ts
grep -n "range: \`\|noSb\|type: (ranged" lib/utils/battle/participant/extract-wfrp-attacks.ts
grep -n "rangeFt" lib/utils/abilities/registry/effects/traits.ts
grep -n "UNIT_TRAIT_COVERAGE" scripts/grim/coverage.ts
```

Expected: `["bite", "claw", "breath", "weapon"]`; refine `e.attack === "breath"`; `attackProfile` має гілки breath/melee; `wfrpAttackFromProfile` дає `range: "<ft> ft"` і `noSb` лише при `!addSb`; `visibleWhen: v.attack === "breath"`; `UNIT_TRAIT_COVERAGE` = ids `TRAIT_RECIPES` + `terror`, `magical`.

- [ ] **Step 2: (b) `systemStats`.**

```bash
grep -n "systemStats" lib/schemas/artifacts.ts lib/server/content/resources/artifacts.ts lib/utils/content/import/fields/artifacts.ts
grep -n "SYSTEM_STATS" lib/server/artifacts/system-stats.ts
grep -n "systemStats" lib/utils/content/row-hash.ts
```

Expected: два рядки в схемі, `systemStatsColumn` у ресурсі, **0** в `fields/artifacts.ts`; `UNSUPPORTED`/`INVALID`; `row-hash` згадує `systemStats`.

- [ ] **Step 3: (c)–(i).**

```bash
grep -n "interface UnitLevelBand" -A12 scripts/grim/units.ts
grep -n "band.breath : band.attack" scripts/grim/units.ts
grep -n "knownSpells" lib/utils/content/import/fields/units.ts scripts/grim/__tests__/validate-data.test.ts
grep -n "knownSpells = monster" lib/utils/battle/participant/from-unit.ts
grep -n "castTargetOf\|t.sl >= cn" lib/utils/rules/systems/wfrp/magic/cast-test.ts
grep -n "overcast === \"dice\"" lib/utils/battle/spell/cast/index.ts
grep -n "ingredientsRequireMaterial =" lib/schemas/spell-ingredients.ts
grep -n "minGp \* " lib/utils/spells/ingredients/plan.ts
grep -n "tables: TablesRulesSchema" lib/utils/rules/schema.ts
grep -n "startsWith(\"units\")" scripts/grim/__tests__/coverage.test.ts
```

Expected: відповідно до таблиці «Перевірки коду» (c–i).

- [ ] **Step 4:** Нічого не комітити; у звіті групи A — «Task 1: усі перевірки збіглися» (або розбіжність).

### Task 2: Колонка `systemStats` в імпорті артефактів

**Files:**
- Modify: `lib/utils/content/import/fields/artifacts.ts`, `messages/uk/contentImport.json`, `messages/en/contentImport.json`
- Test: `lib/server/content/__tests__/artifact-system-stats.test.ts`

**Interfaces:**
- Produces: `ARTIFACTS_IMPORT` має `{ key: "systemStats", type: "json" }` (Tasks 5, 8–10 на нього спираються; без нього `validateGrimData` дає `unknownField`).

- [ ] **Step 1: Падаючі тести** — у `artifact-system-stats.test.ts` новий `describe("artifact import systemStats")` з тими ж моками (`db`, `useRules`, `armour`), що й файл; `importContent` з `@/lib/server/content/import/import-content`, `deps = { resource: () => artifactsResource, loadNames: async () => [{ id: "a1", name: "Mail" }] }`:

```ts
  it("wfrp stores systemStats from an import row; dnd5e/homm reject the row and create nothing", async () => {
    for (const rules of [{}, { system: { key: "dnd5e" } }]) {
      useRules(rules);

      const report = await importContent(actor, "artifacts", { rows: [{ name: "Plate", slot: "armor", systemStats: armour }], mode: "create", dryRun: false }, deps);

      expect(JSON.stringify(report.results)).toContain(API_ERRORS.SYSTEM_STATS_UNSUPPORTED);
    }

    expect(db.artifact.create).not.toHaveBeenCalled();

    useRules(WFRP_RULES);

    await importContent(actor, "artifacts", { rows: [{ name: "Plate", slot: "armor", systemStats: JSON.stringify(armour) }], mode: "create", dryRun: false }, deps);

    expect(db.artifact.create.mock.calls[0][0].data.systemStats).toEqual(armour);
  });

  it("update: null clears, an omitted column keeps", async () => {
    useRules(WFRP_RULES);

    await importContent(actor, "artifacts", { rows: [{ name: "Mail", systemStats: null }], mode: "update", dryRun: false }, deps);
    await importContent(actor, "artifacts", { rows: [{ name: "Mail", description: "x" }], mode: "update", dryRun: false }, deps);

    expect(db.artifact.update.mock.calls[0][0].data.systemStats).toBe(Prisma.DbNull);
    expect(db.artifact.update.mock.calls[1][0].data).not.toHaveProperty("systemStats");
  });
```

(Якщо `importContent` в update-режимі шукає рядок через інший метод моків — підлаштувати лише моки, не очікування; якщо `null` у JSON-колонці `coerceRecord` трактує як «порожньо/пропуск» — записати це у звіт і замінити перевірку `null` на відповідну поведінку `coerceRecord`, не змінюючи код продукту.)

- [ ] **Step 2:** `pnpm test:run lib/server/content/__tests__/artifact-system-stats.test.ts` — Expected: FAIL (колонку відкинуто).
- [ ] **Step 3:** `fields/artifacts.ts` — після `jsonField("armor")` додати `jsonField("systemStats"),`. `messages/uk/contentImport.json` → `fields.artifacts.systemStats: "Системні характеристики (JSON)"`; `en` → `"System stats (JSON)"`.
- [ ] **Step 4:** `pnpm test:run lib/server/content/__tests__/artifact-system-stats.test.ts lib/server/content/__tests__/import-content.test.ts lib/server/content/__tests__/import-export.test.ts lib/i18n/__tests__/label-keys-contentImport.test.ts lib/i18n/__tests__/scope-size.test.ts lib/server/content/__tests__/openapi.test.ts lib/server/content/__tests__/openapi-4f2.test.ts lib/server/content/__tests__/openapi-4f4.test.ts` — PASS (ліміти — Global Constraints); `pnpm test:related lib/utils/content/import/fields/artifacts.ts` — PASS; eslint на змінених `.ts`.
- [ ] **Step 5: Commit** `feat(wfrp): 5g-3 artifact import carries systemStats`.

### Task 3: Trait `ranged` і стрільці бестіарію

**Files:**
- Modify: `lib/utils/abilities/schema/kinds.ts`, `lib/utils/abilities/schema/effects.ts`, `lib/utils/abilities/registry/effects/traits.ts`, `lib/utils/rules/systems/wfrp/traits/{constants,recipes,unit-build}.ts`, `messages/{uk,en}/{abilityRegistry,wfrpTraits,abilities}.json`, `scripts/grim/units.ts`, `data/templates/grim-d100/units.json`
- Test: `lib/utils/rules/systems/wfrp/traits/__tests__/{recipes,unit-build}.test.ts`, `scripts/grim/__tests__/{units,validate-data,coverage}.test.ts`

**Interfaces:**
- Produces: `TRAIT_ATTACKS = ["bite", "claw", "breath", "weapon", "ranged"]`; `RANGED_DEFAULT_RANGE_FT = 72` (`traits/constants.ts`, «verify against 5e book»); рецепт `ranged` (параметри `damage`, `rangeFt` 5–600, `magical`); `UnitLevelBand.ranged: Range`; `UNIT_RANGED_FT: Range = [24, 300]` (`scripts/grim/units.ts`).

- [ ] **Step 1: Падаючі тести.**
  - `recipes.test.ts`: «has 15 recipes…» (`toHaveLength(15)`); новий кейс — `ranged` з `{ damage: 4, rangeFt: 150, magical: "no" }` будує `{ name, trigger: { event: "passive" }, effects: [{ kind: "wfrpAttack", attack: "ranged", damage: 4, rangeFt: 150 }] }`.
  - `unit-build.test.ts`: `ranged` → `profile` `{ range: "ranged", rangeFt: 150, damageFlat: 4, addSb: true, qualities: [], flaws: [], twoHanded: false }`; без `rangeFt` → 72.
  - Схема (у `unit-build.test.ts` або наявному тесті схеми ефектів): `AbilitySchema` приймає `ranged` з `rangeFt` і досі відхиляє `{ attack: "bite", rangeFt: 30 }`.
  - `units.test.ts`: `rebuildTrait({ id: "ranged", name: "Sling +3", effects: [{ kind: "wfrpAttack", attack: "ranged", damage: 3, rangeFt: 120 }] })` дорівнює вхідному з `trigger: { event: "passive" }`.
  - `validate-data.test.ts`, `describe("validateGrimData: units")` (той самий `rat`/`ab`/`where`):

| Мутація | Очікуваний рядок |
|---|---|
| `abilities.push(ab("ranged", "Sling +5", { kind: "wfrpAttack", attack: "ranged", damage: 5, rangeFt: 60 }))` | `where + 'attack "Sling +5" damage 5 is outside 1–4 for level 1'` |
| `abilities.push(ab("ranged", "Sling +2", { kind: "wfrpAttack", attack: "ranged", damage: 2, rangeFt: 400 }))` | `where + 'attack "Sling +2" range 400 ft is outside 24–300'` |

  - `coverage.test.ts` «reports bestiary gaps…»: додати `'units: trait "ranged" is used by no unit'` до очікуваних.
- [ ] **Step 2:** `pnpm test:run lib/utils/rules/systems/wfrp/traits/__tests__/recipes.test.ts lib/utils/rules/systems/wfrp/traits/__tests__/unit-build.test.ts scripts/grim/__tests__/units.test.ts scripts/grim/__tests__/validate-data.test.ts scripts/grim/__tests__/coverage.test.ts` — FAIL.
- [ ] **Step 3: Рушій.** `kinds.ts`: додати `"ranged"` у `TRAIT_ATTACKS`. `effects.ts` refine: `e.rangeFt === undefined || e.attack === "breath" || e.attack === "ranged"`. `registry/effects/traits.ts`: `visibleWhen: (v) => v.attack === "breath" || v.attack === "ranged"`. `constants.ts`: `export const RANGED_DEFAULT_RANGE_FT = 72;`. `recipes.ts`: `attack` приймає `"ranged"`, пише `rangeFt` для `breath` і `ranged`; рядок `attack("ranged", [num("rangeFt", RANGED_DEFAULT_RANGE_FT, 5, 600)])` після `breath`. `unit-build.ts` `attackProfile`:

```ts
  if (e.attack === "ranged") return { range: "ranged", rangeFt: e.rangeFt ?? RANGED_DEFAULT_RANGE_FT, damageFlat: e.damage, addSb: true, qualities: [], flaws: [], twoHanded: false };
```

- [ ] **Step 4: Тексти.** `abilityRegistry.json` → `effects.wfrpAttack.options.attack.ranged`: en `"Ranged"`, uk `"Дальня"`. `wfrpTraits.json` → `recipes.ranged` (після `breath`, та сама форма): en `label` `"Ranged"`, `hint` `"Missile or thrown attack; adds Strength Bonus."`, `defaultName` `"Ranged"`, `params` `damage` `"Damage bonus"`, `rangeFt` `"Range, ft"`, `magical` `"Magical attack"`, `options.magical` `No/Yes`; uk `"Дальня атака"`, `"Метальна чи стрілецька атака; додає бонус Сили."`, `"Дальня атака"`, `"Бонус до шкоди"`, `"Дальність, фути"`, `"Магічна атака"`, `Ні/Так`. `abilities.json` `validation.traitRangeBreathOnly`: en `"Range (rangeFt) is only valid for the Breath and Ranged trait attacks"`, uk `"Дальність (rangeFt) лише для атак-рис «Дихання» і «Дальня атака»"`.
- [ ] **Step 5: `scripts/grim/units.ts`.** `UnitLevelBand` + `ranged: Range` (1: `[1, 4]`, 2: `[2, 6]`, 3: `[3, 8]`, 4: `[5, 10]`); `export const UNIT_RANGED_FT: Range = [24, 300];`; `UnitTraits.attacks[]` + `rangeFt?: number`; `unitTraits` — `case "ranged"` разом із `bite/claw/weapon/breath`, пише `rangeFt: Number(e.rangeFt)` для `ranged`; `recipeValues` — `case "ranged"` як `breath`; `bandIssues` — `const range = a.attack === "breath" ? band.breath : a.attack === "ranged" ? band.ranged : band.attack;` і для `ranged`: `` if (!inRange(a.rangeFt ?? 0, UNIT_RANGED_FT)) issues.push(`attack "${a.name}" range ${a.rangeFt} ft is outside ${fmt(UNIT_RANGED_FT)}`) ``.
- [ ] **Step 6: Дані.** У `units.json` чотирьом юнітам з «Ростер → Юніти → ranged» додати останнім елементом `abilities`, напр. `{"id":"ranged","name":"Sling +3","trigger":{"event":"passive"},"effects":[{"kind":"wfrpAttack","attack":"ranged","damage":3,"rangeFt":120}]}`.
- [ ] **Step 7:** Тести Step 2 + `scripts/grim/__tests__/real-data.test.ts scripts/grim/__tests__/bestiary-e2e.test.ts lib/i18n/__tests__/label-keys-wfrpTraits.test.ts lib/i18n/__tests__/label-keys-abilityRegistry.test.ts lib/i18n/__tests__/label-keys-abilities.test.ts lib/i18n/__tests__/scope-size.test.ts lib/utils/battle/participant/__tests__/extract-attacks-wfrp.test.ts` — PASS; `pnpm test:related lib/utils/abilities/schema/kinds.ts lib/utils/abilities/schema/effects.ts lib/utils/rules/systems/wfrp/traits/unit-build.ts lib/utils/rules/systems/wfrp/traits/recipes.ts` — PASS; eslint на змінених `.ts`.
- [ ] **Step 8: Commit** `feat(wfrp): 5g-3 ranged trait attack and grim marksmen`.

### Task 4: Валідатор заклинань і стеля касту юнітів

**Files:**
- Create: `scripts/grim/spells.ts`, `scripts/grim/__tests__/spells.test.ts`
- Modify: `scripts/grim/validate-data.ts`, `scripts/grim/__tests__/fixtures/spells.json`, `scripts/grim/__tests__/validate-data.test.ts`

**Interfaces:**
- Consumes: `SPELL_MAGIC_KINDS`/`SpellMagicKind` (`@/lib/utils/spells/model/schema`), `PRAYER_KINDS`, `NO_OVERCAST_KINDS` (`@/lib/utils/rules/systems/wfrp/magic/constants`), `WFRP_CONDITION_KEYS` (`@/lib/constants/wfrp-conditions`), `unitTraits` (`./units`), `Row`.
- Produces (Tasks 7–9): `GRIM_SPELL_KINDS` (6 kind), `GRIM_SPELL_LISTS: Record<GrimSpellKind, readonly string[]>`, `SPELL_CN_BANDS: Record<GrimSpellKind, readonly [number, number]>`, `SPELL_KEYS`, `INGREDIENT_PENCE: readonly [6, 240]`, `spellMagicOf(row: Row): { cn: number; kind: string } | null`, `spellIssues(row: Row): string[]`, `castCeiling(unit: Row, kind: string): number`, `unitSpellIssues(unit: Row, spells: Map<string, Row>): string[]`.
- Нові помилки `validateGrimData`: `` `${label("spells", i, name)}: ${issue}` `` і `` `${label("units", i, name)}: ${issue}` `` для `unitSpellIssues`.

- [ ] **Step 1: Фікстура** `fixtures/spells.json` повністю:

```json
[
  {"name":"Rot Touch","level":1,"cost":"action","description":"A blighting touch.","casting":{"magic":{"cn":1,"kind":"petty","overcast":null}},"targeting":{"kind":"enemy","range":5},"dice":1,"spellEffects":[{"kind":"dealDamage","amount":{"spellRoll":100},"damageType":"magic"}],"lists":["Cantrips"]}
]
```

(Giant Rat: Int 10, без броні → стеля 1 ≥ CN 1.)

- [ ] **Step 2: Падаючі тести.** `spells.test.ts`: `spellIssues(<Ember Dart з Рішення 2>)` → `[]`; `castCeiling` для `{ characteristics: { base: { int: 55, fel: 50, … } }, abilities: [armour 2] }` → arcane 3, `"miracle"` 5. `validate-data.test.ts` — новий `describe("validateGrimData: spells")`, мутації `data.spells[0]` (`spell = (d) => d.spells[0]`, `magic = (d) => spell(d).casting.magic`, `where = 'spells #1 "Rot Touch": '`):

| Мутація | Очікуваний рядок (`toContain`) |
|---|---|
| `spell.casting = undefined` | `where + "casting.magic is required"` |
| `magic.kind = "chaos"` | `where + 'kind "chaos" is not used by Grim spells'` |
| `magic.cn = 3` | `where + "CN 3 is outside 0–2 for petty"` |
| `magic.overcast = "dice"` | `where + 'overcast "dice" is not allowed for petty'` |
| `magic.kind = "arcane"; magic.cn = 4; spell.lists = ["School of Embers"]; magic.overcast = "targets"` | `where + 'overcast "targets" is not supported by the engine'` |
| `spell.cost = "long"` | `where + 'cost must be "action"'` |
| `spell.level = 2` | `where + "level must be 1"` |
| `spell.lists = ["Fenlore"]` | `where + 'lists must be one of: Cantrips'` |
| `spell.lists = []` | `where + 'lists must be one of: Cantrips'` |
| `spell.resolution = { kind: "auto" }` | `where + 'column "resolution" is not used by Grim spells'` |
| `spell.spellEffects = [{ kind: "applyCondition", condition: "prone", duration: { rounds: 1 } }]` | `where + 'effect "applyCondition" is not allowed (dealDamage or heal only)'` |
| `spell.dice = 0` | `where + "dice must be ≥ 1 exactly when the spell has an effect"` |
| `spell.spellEffects = []; spell.dice = 0` | `where + "spell has neither an effect nor an attribute"` |
| `magic.attribute = { condition: "frightened", levels: 1 }` | `where + 'attribute condition "frightened" is not a wfrp condition'` |
| `spell.targeting = { kind: "ally", range: 5 }` | `where + 'targeting "ally" does not fit a harmful spell'` |
| `spell.ingredients = [{ name: "Bone", qty: 1, minGp: 0.05, consumed: true, focus: false }]; spell.componentFlags = { v: true, s: true, m: true }` | `where + "ingredients are not allowed for petty"` |
| arcane-рядок як у п'ятій мутації з `overcast: "dice"`, `upcastDice: 1`, `ingredients: [{ …, minGp: 0.01 }]`, `componentFlags` | `where + "ingredient price 2.4 p is outside 6–240 p (whole pence)"` |
| `data.units[0].knownSpells = ["Rot Touch"]; magic.cn = 2` | `'units #1 "Giant Rat": knownSpells "Rot Touch" CN 2 is above the best SL 1 this unit can reach'` |

  «accepts the good fixture» лишається.
- [ ] **Step 3:** `pnpm test:run scripts/grim/__tests__/spells.test.ts scripts/grim/__tests__/validate-data.test.ts` — FAIL.
- [ ] **Step 4: `scripts/grim/spells.ts`** — константи з Рішення 1–2; `spellIssues(row)` перевіряє в порядку таблиці вище (не-ключі `SPELL_KEYS` → `column "X" is not used by Grim spells`; `casting` лише `{ magic }`; kind ∈ `GRIM_SPELL_KINDS`; CN у `SPELL_CN_BANDS`; overcast за Рішенням 1; `"dice"` ⇒ `upcastDice === 1 && dice ≥ 1`, `upcastDice` без `"dice"` — помилка `upcastDice needs overcast "dice"`; ефекти й таргетинг за Рішенням 2 (harmful = `dealDamage` або `attribute`; heal — лише `ally`/area `side: "ally"`); `attribute.condition` ∈ `WFRP_CONDITION_KEYS` і не `unconscious`/`surprised`; інгредієнти: лише arcane/hedge/witchcraft, ≤ 1, `qty 1`, `consumed true`, `focus false`, ціна `minGp × 240` ціла 6–240, `componentFlags` рівно `{ v, s, m: true }` ⇔ є інгредієнт; `description` 1–200). `castCeiling` (Рішення 4) читає `characteristics.base.int/fel` і `unitTraits(row).ap`; `unitSpellIssues` — для кожного імені з `knownSpells`, що є в `spells`, порівнює `cn` (blessing — 0) зі стелею.
- [ ] **Step 5: `validate-data.ts`** — `validateSpells(data, issues)` (кожен рядок `spellIssues`) і в `validateUnits` додати `unitSpellIssues(row, spellsByName)`, де `spellsByName = new Map(data.spells.map((s) => [String(s.name), s]))`.
- [ ] **Step 6:** Тести Step 3 + `scripts/grim/__tests__/real-data.test.ts scripts/grim/__tests__/coverage.test.ts` — PASS; eslint; **Commit** `feat(wfrp): 5g-3 grim spell validator and unit cast ceiling`.

### Task 5: Валідатор спорядження

**Files:**
- Create: `scripts/grim/equipment.ts`, `scripts/grim/__tests__/equipment.test.ts`, `scripts/grim/__tests__/fixtures/artifacts.json`
- Modify: `scripts/grim/validate-data.ts`, `scripts/grim/__tests__/validate-data.test.ts`, `scripts/grim/__tests__/load-template.integration.test.ts` (очікування кількостей: `artifacts: 2`)

**Interfaces:**
- Consumes: `WfrpItemStatsSchema`, `WfrpItemStats`, `QUALITY_REGISTRY`, `ARMOUR_KINDS`, `WEAPON_GROUPS` (`@/lib/utils/rules/systems/wfrp/equipment`), `ARTIFACT_RARITY_VALUES`, `Row`.
- Produces (Tasks 7–9): `GRIM_MELEE_GROUPS`, `GRIM_RANGED_GROUPS`, `GRIM_WEAPON_GROUPS`, `WEAPON_GROUP_BANDS`, `ARMOUR_KIND_BANDS`, `SHIELD_BAND`, `GEAR_BAND`, `ARTIFACT_KEYS`, `GRIM_ITEM_SLOTS = ["weapon", "range_weapon", "armor", "helmet", "boots", "shield", "item"]`, `IMPLEMENTED_QUALITIES: readonly QualityKey[]`, `itemStatsOf(row: Row): WfrpItemStats | null`, `equipmentIssues(row: Row): string[]`.

- [ ] **Step 1: Фікстура** `fixtures/artifacts.json` — рядки «Arming Sword» і «Padded Jack» з «Ростеру» (форма — приклади рядків). У `validate-data.test.ts` «reads present files…» → `expect(data.artifacts).toHaveLength(2)`.
- [ ] **Step 2: Падаючі тести.** `equipment.test.ts`: три приклади рядків «Ростеру» (Light Crossbow, Chain Hauberk, Round Shield) → `equipmentIssues(...)` = `[]`. `validate-data.test.ts` — `describe("validateGrimData: artifacts")` (`sword = (d) => d.artifacts[0]`, `jack = (d) => d.artifacts[1]`, `w = 'artifacts #1 "Arming Sword": '`, `a = 'artifacts #2 "Padded Jack": '`):

| Мутація | Очікуваний рядок |
|---|---|
| `delete sword.systemStats` | `w + "systemStats is required"` |
| `sword.systemStats.damage.flat = "x"` | рядок, що починається з `w + "systemStats "` (zod) |
| `sword.slot = "range_weapon"` | `w + 'slot "range_weapon" needs a weapon with range'` |
| `sword.slot = "ring"` | `w + 'slot "ring" is not used by Grim items'` |
| `sword.systemStats.group = "explosives"` | `w + 'group "explosives" is not used by Grim items'` |
| `sword.systemStats.qualities = [{ key: "defensive" }]` | `w + 'quality "defensive" is not implemented'` |
| `sword.systemStats.qualities = [{ key: "slow" }]` | `w + '"slow" is a flaw, not a quality'` |
| `sword.systemStats.damage.flat = 9` | `w + "damage +9 is outside 1–5 for basic"` |
| `sword.systemStats.price = 5000` | `w + "price 5000 p is outside 6–480 p for basic"` |
| `sword.systemStats.price = 10.5` | `w + "price 10.5 p is outside 6–480 p for basic"` |
| `sword.systemStats.flaws = [{ key: "reload", value: 1 }]` | `w + "reload needs ammoCapacity and ammoCapacity needs reload"` |
| `jack.systemStats.locations.head = 1` | `a + 'slot "armor" must leave head at 0'` |
| `jack.slot = "helmet"` | `a + 'slot "helmet" may cover only head'` |
| `jack.systemStats.locations.body = 2` | `a + "AP 2 is outside 0–1 for soft"` |
| `jack.slot = "shield"` | `a + 'slot "shield" needs gear with one "shield X" quality'` |
| `jack.rarity = "rare"` | `a + "rarity must be common or uncommon"` |
| `sword.icon = "x"` | `w + 'column "icon" is not used by Grim items'` |

- [ ] **Step 3:** `pnpm test:run scripts/grim/__tests__/equipment.test.ts scripts/grim/__tests__/validate-data.test.ts` — FAIL.
- [ ] **Step 4: `scripts/grim/equipment.ts`** — Рішення 3. Порядок: ключі (`ARTIFACT_KEYS` = `name, description, rarity, slot, systemStats`), `rarity`, `description` 1–200, `systemStats` (відсутній → `systemStats is required`; `WfrpItemStatsSchema.safeParse` → по рядку `systemStats <path> <message>` і стоп), слот ⇄ тип, якості/вади (`kind` і `implemented`), група (`GRIM_WEAPON_GROUPS`, ближня ⇔ `reach`, стрілецька ⇔ `range`), діапазони (`flat`, `addSb`, `range`, вага, ціна — `Number.isInteger(price)` і в межах; AP кожної локації для armour; X щита), `twoHanded`, `reload` ⇔ `ammoCapacity`.
- [ ] **Step 5: `validate-data.ts`** — `validateArtifacts(data, issues)` (кожен рядок `equipmentIssues`).
- [ ] **Step 6:** Тести Step 3 + `real-data.test.ts`, `coverage.test.ts` — PASS; eslint; **Commit** `feat(wfrp): 5g-3 grim equipment validator`.

### Task 6: Таблиці мискастів і сканер

**Files:**
- Create: `scripts/grim/__tests__/tables.test.ts`
- Modify: `scripts/grim/validate-data.ts`, `scripts/grim/forbidden-terms.ts`, `scripts/grim/__tests__/forbidden-terms.test.ts`

**Interfaces:**
- Produces: `GRIM_TABLE_SLOTS = ["miscastMinor", "miscastMajor", "wrath"] as const`, `GRIM_TABLE_ROWS: readonly [8, 10]`, `TABLE_TEXT_MAX = 120`, `tableIssues(rules: GrimData["rules"]): string[]` (експорт із `validate-data.ts`).

- [ ] **Step 1: Падаючі тести.** `tables.test.ts` (`rows(n)` — n рядків з `max` = 10·i, останній 100, `text: "t"`, `effects: []`):

| Вхід `tableIssues` | Очікування |
|---|---|
| `undefined`, `{}`, `{ tables: { miscastMinor: rows(8) } }` | `[]` |
| `{ tables: { critHead: rows(8) } }` | `['rules: tables.critHead is not used by the Grim template']` |
| `{ tables: { wrath: rows(5) } }` | `['rules: tables.wrath must have 8–10 rows (got 5)']` |
| рядок без `text` | `'rules: tables.miscastMajor[0] needs text of 1–120 characters'` |
| ефект `{ type: "condition", key: "unconscious", levels: 1 }` | `'rules: tables.miscastMinor[0] condition "unconscious" is not allowed'` |

  Плюс у `validate-data.test.ts`: `data.rules = { tables: { miscastMinor: [{ max: 50, effects: [] }, { max: 40, effects: [] }] } }` → є рядок, що починається з `"rules: tables.miscastMinor"` (порядок перевіряє наявний `validateRules`); `data.rules = { tables: { wrath: [...rows(7), { max: 100, text: "The Empire falls", effects: [] }] } }` → `'rules: forbidden term "Empire"'`.
  `forbidden-terms.test.ts`: allows `"Arming Sword"`, `"Blessing of Mending"`, `"Ember Dart"`, `"Mail Hood"`, `"Hedge row"`; flags `["Aethyric Armour", "Aethyric"]`, `["a Zweihander", "Zweihander"]`, `["Blessing of Battle", "Blessing of Battle"]`, `["Gromril plate", "Gromril"]`, `["Bright Wizard", "Bright Wizard"]`.
- [ ] **Step 2:** `pnpm test:run scripts/grim/__tests__/tables.test.ts scripts/grim/__tests__/forbidden-terms.test.ts scripts/grim/__tests__/validate-data.test.ts` — FAIL.
- [ ] **Step 3: `tableIssues`** у `validate-data.ts` за Рішенням 5, викликати з `validateGrimData` після `validateRules`. `validateTerms` додатково сканує `data.rules` під міткою `rules`.
- [ ] **Step 4: `FORBIDDEN_TERMS`** — новий рядок масиву:

```ts
  "Aethyr", "Aethyric", "Qhaysh", "U'Zhul", "Rhuin", "Kadon", "Okkam", "Wyssan", "Bright Wizard", "Jade Wizard", "Amber Wizard", "Amethyst Wizard", "Celestial Wizard", "Grey Wizard", "Gold Wizard", "Light Wizard", "Colleges of Magic", "Hedgewise", "Hedge Witch", "Gromril", "Ithilmar", "Zweihander", "Zweihänder", "Hochland Long Rifle", "Repeater Handgun", "Hagbane", "Swiftshiver", "Moonfire", "Marsh Lights", "Murmured Whisper", "Produce Small Animal", "Protection from Rain", "Purify Water", "Sly Hands", "Arrow Shield", "Corrosive Blood", "Mundane Aura", "Blessing of Battle", "Blessing of Breath", "Blessing of Charisma", "Blessing of Conscience", "Blessing of Courage", "Blessing of Fortune", "Blessing of Grace", "Blessing of Hardiness", "Blessing of Healing", "Blessing of Protection", "Blessing of Recuperation", "Blessing of Righteousness", "Blessing of Savagery", "Blessing of Tenacity", "Blessing of Wisdom", "Blessing of Wit",
```

- [ ] **Step 5:** Тести Step 2 + `real-data.test.ts` — PASS; eslint; **Commit** `feat(wfrp): 5g-3 grim miscast table rules and forbidden magic terms`.

### Task 7: Покриття магії/спорядження і `grimInfo`

**Files:**
- Modify: `scripts/grim/coverage.ts`, `scripts/grim/load-template.ts`, `scripts/grim/__tests__/coverage.test.ts`

**Interfaces:**
- Consumes: `GRIM_SPELL_KINDS`, `GRIM_SPELL_LISTS`, `spellMagicOf` (Task 4); `GRIM_WEAPON_GROUPS`, `IMPLEMENTED_QUALITIES`, `itemStatsOf` (Task 5); `ARMOUR_KINDS`.
- Produces: `CASTER_THEMES = ["Cultists", "Horrors"] as const`; `grimInfo(data: GrimData): string[]`.

- [ ] **Step 1: Падаючі тести** (`coverage.test.ts`): у «reports only the known fixture gaps» фільтр → `!w.startsWith("units") && !w.startsWith("spells") && !w.startsWith("artifacts")`. Нові кейси:
  - на фікстурі (1 заклинання petty, 2 предмети) серед попереджень є `'spells: kind "arcane" has no spell'`, `'spells: list "School of Gloam" has no spell'`, `'artifacts: weapon group "bow" has no item'`, `'artifacts: armour kind "plate" has no item'`, `'artifacts: slot "shield" has no item'`, `'artifacts: quality "blast" has no carrier'`, `'artifacts: flaw "reload" has no carrier'`, `'units: theme "Cultists" has no caster'`; немає `'spells: kind "petty" has no spell'`;
  - `data.spells = []; data.artifacts = []` → жодного `spells`/`artifacts`-попередження і жодного `has no caster`;
  - `grimInfo(load())` → `[]` (Giant Rat знає Rot Touch); після `data.units[0].knownSpells = []` → `['info: spells "Rot Touch": known by no unit']`.
- [ ] **Step 2:** `pnpm test:run scripts/grim/__tests__/coverage.test.ts` — FAIL.
- [ ] **Step 3: `coverage.ts`** — `spellCoverage(spells, units)` і `equipmentCoverage(artifacts)` за Рішенням 6, викликати в кінці `grimCoverage`; `grimInfo`. `load-template.ts`: після циклу попереджень `for (const line of grimInfo(data)) console.info(line);`.
- [ ] **Step 4:** Тести + `real-data.test.ts`, `validate-data.test.ts` — PASS; eslint; **Commit** `feat(wfrp): 5g-3 grim magic and equipment coverage`.

### Task 8: Дані — заклинання, предмети, таблиці, кастери

**Files:**
- Create: `data/templates/grim-d100/spells.json`, `data/templates/grim-d100/artifacts.json`
- Modify: `data/templates/grim-d100/{rules,units,manifest}.json`, `scripts/grim/__tests__/real-data.test.ts`

**Interfaces:**
- Consumes: «Ростер» (імена, числа й порядок — дослівно), Рішення 1–5.
- Produces: імена, на які спираються Tasks 9–10: `Ember Dart`, `Spark Flick`, `Arming Sword`, `Chain Hauberk`, `Mail Hood`, `Round Shield`, `Light Crossbow`, `Gilded Voice`, `Broadhelm Captain`, `Masked Oracle`.

Формат файлів: масив, один об'єкт на рядок, відступ 2 пробіли (як `units.json`). Кожне поле, що його доповнила б схема, писати явно (`overcast`, `qty`, `consumed`, `focus`).

- [ ] **Step 1: `spells.json`** — 30 рядків у порядку таблиці за Рішенням 2 (форма прикладу Ember Dart; `upcastDice` лише при `overcast: "dice"`; `ingredients`+`componentFlags` лише з інгредієнтом).
- [ ] **Step 2: `artifacts.json`** — 56 рядків у порядку таблиць (ближня → стрілецька → щити → броня → спорядження), форма прикладів; `reach`/`range`/`ammoCapacity` лише коли є в таблиці; порожні `qualities`/`flaws` — `[]`.
- [ ] **Step 3: `rules.json`** — додати верхній ключ `tables` поруч з `advancement` (три слоти з таблиці, рядки `{ "max", "text", "effects" }`).
- [ ] **Step 4: `units.json`** — шести кастерам додати `"knownSpells": [...]` (імена з таблиці) після `abilities`.
- [ ] **Step 5: `manifest.json`** → `counts.spells: 30`, `counts.artifacts: 56`.
- [ ] **Step 6: `real-data.test.ts`.** Очікування manifest: `spells: 30, artifacts: 56`. «units carry no spells…» → «units carry no race, attacks or avatar; only the six casters know spells» (`knownSpells` лише в `Ember Acolyte, Ashen Zealot, Masked Oracle, Gilded Voice, Veil Stalker, Pallid Crawler`). Нові кейси: `SPELL_ROSTER` (30 імен у порядку) і `ARTIFACT_ROSTER` (56 імен у порядку) збігаються з `data.spells/artifacts.map((r) => r.name)`; `data.rules.tables` має рівно ключі `miscastMinor, miscastMajor, wrath`; `grimInfo(data)` не містить імен заклинань, які знає хоча б один юніт (9 імен).
- [ ] **Step 7:** `pnpm test:run scripts/grim/__tests__/real-data.test.ts scripts/grim/__tests__/bestiary-e2e.test.ts` — PASS («passes the validator», «has no coverage warnings», manifest, ростери). FAIL — виправляти дані під «Ростер»; якщо «Ростер» суперечить Рішенням — зупинитися й повідомити контролера.
- [ ] **Step 8: Commit** `feat(wfrp): 5g-3 grim spells, equipment, miscast tables and unit casters`.

### Task 9: E2E — герой зі спорядженням і магією проти кастера й стрільця

**Files:**
- Create: `scripts/grim/__tests__/grim-e2e-helpers.ts`, `scripts/grim/__tests__/arsenal-e2e.test.ts`
- Modify: `scripts/grim/__tests__/bestiary-e2e.test.ts` (лише імпорт перенесених хелперів)

**Interfaces:**
- Consumes: реальний каталог (Task 8), `IMPORT_SPECS.{units,spells}`, `createUnitSchema`, `createSpellSchema`, `createBattleParticipantFromUnit`, `attackMutation`, `attackBodySchema`, `createSpellMutation` (`@/lib/server/battles/mutations/spell/spell-mutation`), `extractWfrpAttacks` (`@/lib/utils/battle/participant/extract-wfrp-attacks`), `WFRP_EQUIPMENT`/`armourAp`, `initAmmo` (`@/lib/utils/battle/ammo`), `wfrpAbilitiesOf`, `DEFAULT_CHARACTERISTICS`, `ruleSystemOf`.
- Produces: `grim-e2e-helpers.ts` експортує без зміни поведінки з `bestiary-e2e.test.ts`: `data`, `rules` (злиті з `rules.json`, тобто з таблицями шаблону), `rowOf`, `unitOf`, `buildUnit`, `heroes`, `ctxOf`, `firstThen`, `part`, `standing`, `meleeOf`, `strike`, `HIT`, `MISS`, `NO_WARD`, `PASS`, `SWORD`; `vi.mock("@/lib/db", …)` лишається у кожному тест-файлі.

- [ ] **Step 1: Перенести хелпери** з `bestiary-e2e.test.ts` у `grim-e2e-helpers.ts`, тест імпортує їх; `pnpm test:run scripts/grim/__tests__/bestiary-e2e.test.ts` — PASS (без зміни очікувань).
- [ ] **Step 2: `arsenal-e2e.test.ts`.** Хелпери файлу:
  - `artifactRow(name)` → `{ id: <kebab name>, name, systemStats }` з `data.artifacts`;
  - `spellOf(name)` → `coerceRecord` + `SPELLS_IMPORT.toBody` + `createSpellSchema.parse`, `id = name`, плюс `campaignId: "c1"`, `groupId: null`, `icon: null`, `raceModifiers: []` (як `bolt` у `lib/utils/battle/__tests__/wfrp-magic-e2e.test.ts`);
  - `cast = createSpellMutation({ loadSpell: async (id) => spellOf(id), loadPool: async () => ({ units: [], races: [] }) })` (тип — як у `wfrp-magic-e2e`);
  - `armed(hero)` — екіпірування `weapon: Arming Sword`, `range_weapon: Light Crossbow`, `armor: Chain Hauberk`, `helmet: Mail Hood`, `shield: Round Shield`: `gear = armourAp(rows)`, `abilities = { ...hero.abilities, ...wfrpAbilitiesOf(readCharacteristics({ characteristics: hero.abilities.characteristics }), { ap: gear.ap, flexible: gear.flexible, armourOnly: gear.armourOnly }) }` (`readCharacteristics` з `@/lib/utils/rules/systems/wfrp/characteristics/keys`), `attacks = extractWfrpAttacks(rows.map((r) => ({ row: r as never, slot: r.slot })), WFRP_EQUIPMENT)`, `battleData.ammo = initAmmo(attacks)`;
  - `mage()` — `armed` герой з характеристиками `{ ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, int: 40, wp: 40 }, skillAdvances: { "language:magick": 20 } }` і `spellcasting.knownSpells: ["Ember Dart"]`, `spellSlots: {}`.

  Кейси:
  1. **AP і атаки з шаблону:** `armed(hero).abilities.wfrp.ap` = `{ head: 4, arm: 4, body: 4, leg: 2 }` (Hauberk 0/2/2/2 + Hood 2 + щит 2 на голову/руки/тулуб), `flexible: true`; атаки: `Arming Sword` (`type: "melee"`, `damageBonus: 4`) і `Light Crossbow` (`type: "ranged"`, `range: "180 ft"`, `wfrp.ammoCapacity: 1`, `wfrp.reload: 1`, `wfrp.noSb: true`).
  2. **Ammo/reload:** постріл `Light Crossbow` героя по `Broadhelm Captain` (`HIT`) → `ammo` `{ "light-crossbow": 0 }`, `reload` `{ "light-crossbow": 2 }`; повторний постріл того ж ходу → `rejects.toMatchObject({ message: API_ERRORS.OUT_OF_AMMO })` або `WEAPON_RELOADING` (як в `ammo-attack.test.ts`).
  3. **Стрілець-юніт:** `Broadhelm Captain` має атаку `Crossbow +7` (`type: "ranged"`, `range: "180 ft"`, без `noSb`); її `HIT` по герою зменшує HP.
  4. **Каст героя:** `cast(ctx, { casterId: "h0", spellId: "Ember Dart", targetIds: ["u0"], diceRolls: [], castRoll: 5 })` проти `Masked Oracle` → `percentileCast.outcome === "success"`, `overcastSteps === 1` (SL 6 − CN 4 = 2 → 1 крок), HP цілі менше, у цілі стан `ablaze` (`ruleSystemOf(rules).conditions.list`), `armourSl === 0` (броня flexible).
  5. **Мискаст із таблиці шаблону:** той самий каст із `castRoll: 77` (дубль, 77 > 60) → `miscast: "minor"`; `JSON.stringify(out.events)` містить `text` одного з рядків `data.rules.tables.miscastMinor` і не містить `"wfrpMagic.miscast.minor."`.
  6. **Кастер-юніт:** `Gilded Voice` (Int 65, Armour 2 → SL 4 при `castRoll: 5`) кастує `Ember Dart` по `h0` → `success`, HP героя менше.
  7. **До кінця бою:** чотири `armed` герої проти `Gilded Voice` і `Broadhelm Captain` — цикл ударів мечем (`HIT`, як у `bestiary-e2e`, з відновленням HP союзників) → обидва юніти `currentHp === 0`, статус не `ACTIVE`.

  Числа виведені з правил 5d/5f; якщо щось не збігається — читати `out.events`, виправляти **лише тест**, коли поведінка рушія узгоджена з `wfrp-magic-e2e`/`ammo-attack`; розбіжність — у звіт, код продукту не змінювати.
- [ ] **Step 3:** `pnpm test:run scripts/grim/__tests__/arsenal-e2e.test.ts scripts/grim/__tests__/bestiary-e2e.test.ts` — PASS; eslint; **Commit** `test(wfrp): 5g-3 grim arsenal and magic battle e2e`.

### Task 10: Інтеграція на БД `wfrp` і CLI-смоук

**Files:**
- Modify: `scripts/grim/__tests__/real-data.integration.test.ts`, `scripts/grim/__tests__/load-template.integration.test.ts`

- [ ] **Step 1: `real-data.integration.test.ts`.** `rowCounts` + `spells`, `artifacts`; `afterAll` + `await raw.artifactBase.deleteMany({ where: { sourceCampaignId: { in: ids } } });`; «loads the real catalog» → `toMatchObject({ feats: 50, careers: 16, races: 4, units: 30, spells: 30, artifacts: 56, raceProfiles: 4 })`. Новий кейс «a clone carries spells, item stats, miscast tables and unit spell links»: клон (як у кейсі юнітів) → для кожного рядка `data.spells` у клоні `casting`, `targeting`, `spellEffects`, `ingredients`, `lists` `toMatchObject` рядка; для кожного `data.artifacts` — `slot`, `rarity`, `systemStats` `toEqual`; `rules.tables` кампанії-клону `toEqual(data.rules.tables)`; `knownSpells` кожного кастера → імена через `spell.findMany({ where: { id: { in } } })` дорівнюють таблиці кастерів. «a second run is a no-op» лишається (тепер з `spells`/`artifacts`).
- [ ] **Step 2: `load-template.integration.test.ts`** — `afterAll` + `artifactBase.deleteMany`; кількості `artifacts: 2`.
- [ ] **Step 3: Прогін на `wfrp`.** Контейнер `dnd-tracker-wfrp-db-1` на 54322 (`docker ps | grep 54322`). Шаблону немає: `docker exec dnd-tracker-wfrp-db-1 psql -U postgres -d wfrp -Atc "select count(*) from campaigns where kind='template' and name='Grim d100'"` = `0` (інакше спитати контролера). URL — облікові дані з `.env.local` (`…@localhost:54322/prodcopy`) з БД `wfrp`:

```bash
DATABASE_URL=postgresql://<user>:<pw>@localhost:54322/wfrp DIRECT_URL=postgresql://<user>:<pw>@localhost:54322/wfrp \
  pnpm exec vitest run --config vitest.integration.config.mts scripts/grim/__tests__/real-data.integration.test.ts scripts/grim/__tests__/load-template.integration.test.ts
```

  Expected: PASS; після — `count … 'Grim d100'` = `0`.
- [ ] **Step 4: CLI-смоук.** Власник: `docker exec dnd-tracker-wfrp-db-1 psql -U postgres -d wfrp -Atc "select id from users order by id limit 1"`. `pnpm constructor:grim-template --owner <id>` двічі (те саме оточення). Expected: перший — `(створено)`, без попереджень покриття, `info:`-рядки допустимі, `+N ~0 -0`; другий — `+0 ~0 -0`. Прибрати шаблон тим самим SQL, що в Task 7 плану 5g-2 (`docs/superpowers/plans/2026-11-10-wfrp-5g2-bestiary.md`, Step 4: `feats_base`, `careers_base`, `races_base`, `units_base`, `spells_base`, `artifacts_base`, `campaigns`). Expected: `count` = `0`.
- [ ] **Step 5:** eslint на двох файлах; **Commit** `test(wfrp): 5g-3 grim magic and equipment template load integration`.

### Task 11: Документація

**Files:** `docs/architecture/rule-systems.md`, `docs/architecture/content-api.md`, `docs/STATUS.md`.

- [ ] **Step 1: `rule-systems.md`** — розділ «Межі 5g-3» після «Межі 5g-2» (6–9 пунктів): склад (30 заклинань у 6 kind і 6 списках, 56 предметів, 3 таблиці мискастів); форма заклинання (Рішення 2: лише `dealDamage`/`heal` зі `spellRoll`, стани через `attribute`, overcast лише `dice`, сила — HOMM-модель кубиків); інгредієнти (`minGp` у кронах, `componentFlags.m`); предмети (Рішення 3: слот ⇄ тип, діапазони за групою/kind, щит = `gear`, ціни в пенсах); Trait `ranged` (SB додається, без Blast, `UNIT_RANGED_FT`, ranged-band); кастери-юніти (`knownSpells` без `abilities`, стеля SL); імпорт: колонка `systemStats` у `IMPORT_SPECS.artifacts`; сканер (доповнення списку, сканує `rules.json`); `grimInfo`. Розбіжності зі spec 1–3 з «Перевірок коду». У «Звірити з книгою» додати: «Магія й спорядження Grim (5g-3): CN за kind, ціни/вага/AP предметів, діапазони `WEAPON_GROUP_BANDS`/`ARMOUR_KIND_BANDS`, таблиці мискастів шаблону — власні; Trait `ranged` додає SB і має дальність за замовчуванням 72 фт (`RANGED_DEFAULT_RANGE_FT`)».
- [ ] **Step 2: `content-api.md`** — у «Реєстр полів»: артефакт має JSON-колонку `systemStats` (зберігається лише у wfrp, інакше 400 `SYSTEM_STATS_UNSUPPORTED`; `null` очищає).
- [ ] **Step 3: `docs/STATUS.md`** — у рядку WFRP після речення про 5g-2: «**5g-3 (магія й спорядження Grim d100) реалізовано на `feat/wfrp`, не змерджено:** 30 заклинань, 56 предметів із `systemStats`, таблиці мискастів шаблону, Trait `ranged`, 6 юнітів-кастерів і 4 стрільці, колонка `systemStats` в імпорті артефактів, валідатор/покриття, e2e `scripts/grim/__tests__/arsenal-e2e.test.ts`; spec/план `docs/superpowers/{specs,plans}/2026-11-10-wfrp-5g3*`, межі — [«Межі 5g-3»](architecture/rule-systems.md); шаблон на локальній `wfrp` прибрано. Далі 5g-4.»
- [ ] **Step 4:** `pnpm test:run scripts/grim` і `pnpm test:related scripts/grim/validate-data.ts scripts/grim/coverage.ts scripts/grim/spells.ts scripts/grim/equipment.ts scripts/grim/units.ts lib/utils/rules/systems/wfrp/traits/unit-build.ts lib/utils/content/import/fields/artifacts.ts` — PASS.
- [ ] **Step 5: Commit** `docs(wfrp): 5g-3 boundaries and status`.

Після Task 11 (контролер):
1. Фінальне Opus-рев'ю (diff від `0839b0538`): Review Focus 1–5; ручне читання всіх імен/описів заклинань і предметів і текстів таблиць на GW-запозичення; збіг даних із «Ростером»; узгодженість діапазонів і стелі касту.
2. Одна хвиля виправлень (Sonnet), вузькі тести.
3. `/simplify` по diff (1–2 агенти).
4. Оновити `project-wfrp.md` у пам'яті (5g-3 готово, далі 5g-4). Повний `pnpm test:run` і repo-wide `pnpm lint` — лише в pre-deploy гейті епіку.

## Self-review

- **Покриття spec:** §1 `systemStats` — Task 2; `ranged` — Task 3 (рішення про відсутність нового поля — «Перевірки коду» a); `knownSpells ⊆ spells` — уже є (d), стеля — Task 4. §2 дані — Task 8 з «Ростером» (petty 6, arcane 10 у двох списках, hedge 3 + witchcraft 3, blessing 4, miracle 4; ближня 16, стрілецька 9, щити 4, броня 12, спорядження 15 з набоями); `rules.json` — Task 8/Рішення 5; юніти — Task 3/8. §3 валідатор — Tasks 4–6, coverage — Task 7, сканер `rules.json` + доповнення — Task 6. §4 тести — Tasks 2–10 (регресія 5e/CSV — `import-export.test.ts`, `import-content.test.ts` у Task 2), «Звірити з книгою» — Task 11.
- **Розбіжності зі spec:** чотири пункти в «Перевірках коду» (abilities кастерів, overcast `targets`, вибір кастерів за стелею SL, наявна перевірка `knownSpells`); 9 стрілецьких замість ~8 (потрібен носій `blast`).
- **Узгодженість імен:** `spellIssues`, `spellMagicOf`, `castCeiling`, `unitSpellIssues`, `GRIM_SPELL_KINDS`, `GRIM_SPELL_LISTS`, `SPELL_CN_BANDS`, `equipmentIssues`, `itemStatsOf`, `GRIM_WEAPON_GROUPS`, `IMPLEMENTED_QUALITIES`, `tableIssues`, `GRIM_TABLE_SLOTS`, `grimInfo`, `CASTER_THEMES`, `UNIT_RANGED_FT`, `RANGED_DEFAULT_RANGE_FT` визначені в Tasks 3–7 і вживаються лише так.
- **Плейсхолдери:** `<user>:<pw>` — з `.env.local`; `<id>` — результат команди того ж кроку.
