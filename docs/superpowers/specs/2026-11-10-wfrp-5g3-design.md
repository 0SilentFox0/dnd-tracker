# WFRP 5g-3: магія і спорядження шаблону Grim d100

Дата: 2026-11-10. Гілка `feat/wfrp` (не мерджити і не пушити, WFRP off main до кінця епіку, див. [[feedback-wfrp-no-main]]).
Контекст: [5g-0](2026-11-09-wfrp-5g0-design.md), [5g-1](2026-11-10-wfrp-5g1-design.md), [5g-2](2026-11-10-wfrp-5g2-design.md), [rule-systems.md](../../architecture/rule-systems.md) («Межі 5d-1/5d-3», «Межі 5f», «Межі 5g-0/1/2», «Звірити з книгою»).

## Мета й рішення брейнстормінгу

5g-3 наповнює шаблон «Grim d100» магією (заклинання, молитви, інгредієнти, таблиці мискастів) і спорядженням (зброя, броня, щити, набої, спорядження), і закриває відкладене з 5g-2: `knownSpells` юнітів і ranged-зброя юнітів.

Успіх: `constructor:grim-template` публікує шаблон; клон у wfrp-кампанію має заклинання, предмети з `systemStats`, власні таблиці мискастів і юнітів з `knownSpells` та ranged; e2e (герой зі шаблонною зброєю, бронею й заклинанням проти юнітів-кастерів і стрільців) проходить; coverage реального каталогу порожній; шаблон прибрано з БД wfrp після смоуку.

Рішення користувача (2026-11-10, дефолти):

| Питання | Рішення |
|---|---|
| Обсяг | Середній: ~30 заклинань, ~55 предметів |
| Ranged юнітів | Новий Trait-рецепт `ranged` |
| Мискасти | Власні `miscastMinor`/`miscastMajor`/`wrath` у `rules.json`; crit-таблиці дефолтні |
| Поділ | Одна частина (spec, plan, одне SDD) |
| Контент | Оригінальний, англійською, без GW-термінів |

Поза 5g-3: іконки, переклад (uk-overlay), crit-таблиці, стартові набори кар'єр (шаблон не містить персонажів), валюта (12/20 уже вшита в систему: 1 зк = 20 шл = 240 п), нові механіки рушія крім Trait `ranged`, UI.

## Що перевикористовується (reuse before writing)

- Завантаження: `scripts/grim/{data,validate-data,load-template,coverage,forbidden-terms,units}.ts`; `GRIM_ROW_KINDS` уже містить `spells` і `artifacts`; `rules.json` через `RulesetPatch`.
- Заклинання: `SPELLS_IMPORT` (`casting`, `ingredients`, `spellEffects`, `targeting`, `lists`), `SpellMagicSchema` (`cn`, `kind`, `overcast`, `attribute`), `SPELL_MAGIC_KINDS`, `NO_OVERCAST_KINDS`, `PRAYER_KINDS`, `SpellIngredient`.
- Спорядження: `WfrpItemStatsSchema` (`equipment/stats.ts`), `QUALITY_REGISTRY` (`implemented`), `WEAPON_GROUPS/REACHES`, `ARMOUR_KINDS`, `AP_MAX_PER_LAYER`, `ARTIFACT_SLOT_VALUES`, `systemStatsOrThrow` (ресурс артефактів).
- Таблиці: `TablesRulesSchema` (`rules/tables-schema.ts`, `SLOT_EFFECTS`), `DEFAULT_TABLES` як зразок форми.
- Traits: `TRAIT_RECIPES` (`wfrp/traits/recipes.ts`, рецепт `breath` як зразок), `abilitySpellIds`, `UNIT_LEVEL_BANDS`.
- Валюта: `currencyValueOf` (ціни в пенсах), `contentRowHash` (вже хешує `systemStats`).

Нового немає, крім: колонки `systemStats` в імпорті артефактів, рецепта `ranged`, валідаторів/coverage заклинань, спорядження й таблиць, самих даних, тестів.

## Дизайн

### 1. Інфраструктура
- **`systemStats` в імпорті артефактів.** `ARTIFACTS_IMPORT` отримує `jsonField("systemStats")` (без нього `coerceRecord` відкидає колонку, як було з `characteristics` у 5g-2). Перевірка лишається в `systemStatsColumn` ресурсу (wfrp приймає, d20/homm відхиляють не-null). Підпис `contentImport.fields.artifacts.systemStats` у `messages/{uk,en}`; `scope-size` перевірити.
- **Trait-рецепт `ranged`** (`wfrp/traits/recipes.ts`): `wfrpAttack` з `attack: "ranged"`, `damage`, `rangeFt`; шкода додає SB як у ближніх Trait-атаках, без площі Breath. Приєднується до переліку Trait-атак і `TRAIT_SIZES`-незалежний. Перша задача плану читає код `traits/` і `extract-wfrp-attacks`, щоб визначити мінімальну правку; якщо потрібне нове поле схеми ефекту, spec оновити.
- **Валідатор юнітів.** `knownSpells` юніта має містити лише імена із `spells.json`; `raceId` у рядках юнітів лишається забороненим (юніти не прив'язані до виду). Фікстура 5g-2 з `knownSpells: ["Rot Touch"]` оновлюється або отримує відповідний рядок `spells`.

### 2. Контент (`data/templates/grim-d100/`)
- **`spells.json`, ~30.** Склад: petty 6, arcane 10 (дві школи через `lists`), hedge/witchcraft 6, blessings 4, miracles 4. Рядок: `name`, `level` (для wfrp не семантичний, 1), `cost: "action"`, `casting.magic`, `description`, `targeting`, `spellEffects` (шкода, умови зі згорнутих у рушії), `ingredients` (частина arcane/hedge; ціна `minGp`-еквівалент у пенсах за правилами `spellIngredients`), `lists`. Overcast лише `dice`/`targets`; молитви без overcast. Long cast заборонений (`cost !== "long"`). CN: petty 0–2, arcane/hedge/witchcraft 3–12, blessing 0, miracle 6–14.
- **`artifacts.json`, ~55.** `slot` + `systemStats`:
  - ближня зброя ~16 (`weapon`, групи basic/fencing/brawling/polearm/twohanded/flail/parry/cavalry, `reach`, `damage {addSb, flat}`, qualities/flaws, `twoHanded`);
  - стрілецька ~8 (`range_weapon`, bow/crossbow/sling/throwing/blackpowder, `range`, `ammoCapacity`, flaw `reload`) і набої як gear;
  - щити 4 (`shield`, quality `shield X`), без `twoHanded`;
  - броня ~12 (`armor`/`helmet`/`boots`, `kind` soft/mail/plate, `locations` ≤ `AP_MAX_PER_LAYER`);
  - спорядження ~15 (`item`, `gear` з `price`/`weight`).
  Лише якості з `implemented: true`; Defensive і «лише збережені» не використовуються. Ціни в пенсах, `rarity` common/uncommon.
- **`rules.json`.** До `advancement.career.ticksRequired` додається `tables`: `miscastMinor`, `miscastMajor`, `wrath` по 8–10 рядків d100 (`{max, text, effects}`, `effects` лише `wounds`/`condition` за `SLOT_EFFECTS`), оригінальні англійські тексти. Crit-таблиці та інші слоти не заповнюються.
- **Юніти (`units.json`).** ~6 кастерів (Cultists, Horrors) отримують `knownSpells` з `spells.json` і відповідні `abilities` для кастів, ~4 стрільці (Raiders, Cultists) отримують `ranged` у межах `UNIT_LEVEL_BANDS` (діапазон ranged додається в band). Рядки юнітів інакше не змінюються.
- `manifest.json`: `counts.spells`/`counts.artifacts` оновлюються.

### 3. Валідатор і coverage (`scripts/grim`)
Нові `spells.ts` і `equipment.ts` (за зразком `units.ts`), таблиці в `validate-data.ts`. Помилки (зупиняють завантаження):
- заклинання: схема рядка, унікальні імена, `casting.magic` валідне, діапазон CN за kind, `overcast` дозволений для kind, `cost !== "long"`, ingredients у межах `SpellIngredient`, `lists` непорожні;
- спорядження: `systemStats` проходить `WfrpItemStatsSchema`, `slot` відповідає `type` (`weapon` ⇄ melee, `range_weapon` ⇄ ranged, `armor/helmet/boots` ⇄ armour, `shield` ⇄ quality `shield`), лише `implemented` якості, діапазони ціни/ваги/AP за групою чи kind, унікальні імена;
- таблиці: слоти лише `miscastMinor/Major/wrath`, `max` зростає й закінчується на 100, ефекти за `SLOT_EFFECTS`, довжини `text`;
- юніти: `knownSpells` ⊆ імена заклинань, `ranged` у межах band;
- заборонені терміни: сканер покриває `spells.json`, `artifacts.json`, `rules.json`; список доповнюємо назвами заклинань/зброї/броні GW (поряд з allowlist фраз).

Coverage (попередження, у реальному каталозі порожнє): kind без заклинання, школа без заклинань, група зброї чи тип броні без предмета, quality реєстру (з `implemented`) без носія, юніт-кастер без заклинання, заклинання, якого не знає жоден юніт чи кар'єра (інформаційно).

### 4. Тести й інтеграція
- Юніт: `validate-data`/`coverage`/`real-data` для заклинань, спорядження, таблиць; рецепт `ranged` (збірка, значення, атака в учасника); імпорт `systemStats` (wfrp так, dnd5e/homm відхиляє, `null` очищає); регресія імпорту 5e/CSV.
- E2E на wfrp (за зразком `bestiary-e2e.test.ts`): герой із мечем, бронею і заклинанням шаблону проти юніта-кастера й юніта-стрільця до кінця бою; перевірка AP з броні, ammo/reload, miscast із таблиці шаблону.
- Інтеграція на БД wfrp (Docker, порт 54322, `dnd-tracker-wfrp-db-1`): публікація, клон, `systemStats`/`casting`/`tables` на місці, повторний запуск не змінює `contentVersion`, шаблон прибрано після смоуку (afterAll не чіпає чужі шаблони).
- «Звірити з книгою»: числа заклинань (CN), ціни/вага/AP предметів, діапазони, таблиці мискастів — власні, не з книги.

## Обмеження й ризики

1. `scope-size` (uk ≈ 105.5 / ДМ ≈ 108.4 KB, ліміти 106/109): нові ключі `messages` обмежені одним підписом колонки; якщо ліміт тисне, мінімізувати текст.
2. Рецепт `ranged` може вимагати нового поля схеми ефекту; перша задача плану це підтверджує (spec оновити).
3. Шаблон не має стартових наборів кар'єр; інвентар героя формується лише з артефактів шаблону.
4. Сканер забороненого не ловить синоніми й переклади; оригінальність за межами списку перевіряє фінальне рев'ю (назви кар'єр Charcoal Burner/Herald з 5g-1 лишаються за користувачем).
5. `battle-sweep` homm/dnd5e перед деплоєм епіку обов'язковий (5d), 5g-3 його не замінює.

## Відкрито для plan

- Точний каталог заклинань і предметів («Ростер»): імена, kind/CN, групи, статс, ціни; діапазони за групою/kind.
- Мінімальна правка рецепта `ranged` і місце діапазону в `UNIT_LEVEL_BANDS`.
- Склад 3 таблиць мискастів (рядки, ефекти).
- Список GW-назв для сканера.
