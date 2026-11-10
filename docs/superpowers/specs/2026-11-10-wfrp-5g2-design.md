# WFRP 5g-2: бестіарій шаблону Grim d100

Дата: 2026-11-10. Гілка `feat/wfrp` (не мерджити і не пушити, WFRP off main до кінця епіку, див. [[feedback-wfrp-no-main]]).
Контекст: [5g-0 spec](2026-11-09-wfrp-5g0-design.md), [5g-1 spec](2026-11-10-wfrp-5g1-design.md), [5h-1 spec](2026-11-07-wfrp-5h1-design.md), [rule-systems.md](../../architecture/rule-systems.md) («Межі 5g-0», «Межі 5g-1», «Межі 5h-1», «Звірити з книгою»).

## Мета й рішення брейнстормінгу

5g-2 наповнює шаблон «Grim d100» бестіарієм: ~30 юнітів з wfrp-характеристиками й механічними Traits (5h-1). Рушій Traits, формат `units.json` і завантажувач уже є; 5g-2 додає дані, поле `abilities` в імпорті юніта, валідатор/coverage для юнітів і тести.

Рішення користувача (2026-11-10):

| Питання | Рішення |
|---|---|
| Обсяг | ~30 юнітів |
| Групування | Два виміри: тема (6) × рівень загрози (4) |
| Іконки | Ні, у 5g-4 |
| Поділ | Одна частина (spec, plan, одне SDD-виконання) |
| Контент | Оригінальний, англійською, без GW-термінів (forbidden-terms) |

Успіх: `constructor:grim-template` публікує шаблон із бестіарієм; клон у wfrp-кампанію містить юнітів з `characteristics` і запеченими Traits; e2e-бій героїв 5g-1 проти юнітів шаблону проходить до кінця; coverage-звіт реального каталогу порожній.

Поза 5g-2: іконки, переклад (uk-overlay), магія й спорядження (5g-3), заклинання юнітів (`knownSpells` порожні до 5g-3), нові ефекти або механіки Traits, UI.

## Що перевикористовується (reuse before writing)

- Формат і завантаження: `scripts/grim/{data,validate-data,load-template,coverage,forbidden-terms}.ts`, фікстура `scripts/grim/__tests__/fixtures/units.json`; `GRIM_ROW_KINDS` уже містить `units` (після `races`, `spells`).
- Імпорт юніта: `importUnitSchema` (`lib/schemas/units.ts`), `toUnitCreateData` (`lib/utils/units/import-units.ts`, `keepCharacteristics` для wfrp).
- Ресурс юнітів: `assertTraitsSupported` + `SYSTEM_TRAITS_UNSUPPORTED` (`lib/server/content/resources/units.ts`), `isTraitEffectKind`.
- Traits 5h-1: `TRAIT_RECIPES` (`wfrp/traits/recipes.ts`), `wfrpUnitBuild`, схеми ефектів (`abilities/schema/effects.ts`: `wfrpArmour {head,body,arm,leg}`, `wfrpWard`, `wfrpSize`, `wfrpPsychology {psychology,value}`, `wfrpAttack`).
- Каталоги: `CHARACTERISTIC_KEYS`, `UnitCharacteristicsSchema` (`wfrp/characteristics/schema.ts`).
- Бандл/sync: `bundle.ts` бере всі скалярні колонки `Unit`.

Нового немає, крім: поля `abilities` в імпорті, перевірок валідатора/coverage для юнітів, самих даних, тестів.

## Дизайн

### 1. Імпорт юніта несе `abilities`
- `importUnitSchema` отримує `abilities: AbilitiesSchema.optional()`.
- `toUnitCreateData` пише `abilities` у `units.abilities`; якщо є і `abilities`, і `specialAbilities`, спершу йдуть `abilities`, а note-ефекти зі `specialAbilities` з тим самим ім'ям пропускаються.
- Не-wfrp кампанії: рядок із Trait-ефектом (`isTraitEffectKind`) відхиляється з `SYSTEM_TRAITS_UNSUPPORTED` як у ресурсі; `characteristics` у не-wfrp, як і досі, мовчки відкидаються. Спільний предикат виносимо в один helper, який використовують ресурс і імпорт.
- Схеми JSON/CSV-імпорту, `IMPORT_SPECS` і OpenAPI-доку оновити; бюджет OpenAPI піднімаємо лише за потреби.

### 2. Дані: `data/templates/grim-d100/units.json`
- ~30 рядків. Поля: `name`, `level` (рівень загрози 1–4: Fodder / Standard / Elite / Boss), `statblock.creatureType` (тема), `characteristics` (wfrp, без `corruption`), `maxHp`, `speed`, `gridSize`, `attacks`, `abilities` (Traits).
- Теми (6): Beasts, Raiders, Restless Dead, Cultists, Constructs, Horrors. Назви оригінальні.
- Таблиця «Ростер» у плані фіксує ім'я, тему, рівень, 8 характеристик, Wounds, `gridSize`, Traits із числами й атаки; виконавці нічого не вигадують.
- Діапазони за рівнем (Armour, Ward, Fear/Terror, Wounds) задаються в плані й перевіряються валідатором.
- `knownSpells` і `raceName` порожні; `avatar` відсутній.

### 3. Валідатор і coverage (`scripts/grim`)
Валідатор (помилки, зупиняють завантаження):
- рядок проходить `importUnitSchema`; усі 8 характеристик wfrp; унікальні імена;
- `statblock.creatureType` ∈ шести тем, `level` ∈ 1–4;
- `abilities`: лише дозволені ефекти (`wfrpArmour/Ward/Size/Psychology/Attack`, `heal`, `note`), значення в межах схем;
- характеристики, Wounds і значення Traits у діапазоні свого рівня загрози (таблиця діапазонів у `scripts/grim`);
- заборонені терміни (сканер покриває `units.json`; список доповнюємо іменами монстрів, яких немає в 5g-1; короткі терміни матчать лише цілі слова, зокрема «Moot»/«Gor» не спрацьовують на звичайних словах; тест allowlist).

Coverage (попередження, у реальному каталозі порожнє):
- тема чи рівень без юніта; юніт без атаки;
- Trait реєстру (Armour, Ward, Size, Fear, Terror, Breath, Bite/Claw/Weapon, Regenerate, Magical) без жодного юніта;
- Terror без Boss/Elite, Boss без Magical або Breath;
- Wounds чи Armour не зростають із рівнем у межах теми.

### 4. Тести й інтеграція
- Юніт: `validate-data`/`coverage`/`real-data` для юнітів; імпорт `abilities` (wfrp приймає, dnd5e/homm відхиляє, дубль зі `specialAbilities`); регресія імпорту 5e/CSV.
- E2E на wfrp (за зразком e2e 5g-1/5h-1): герої шаблону проти 3–4 юнітів шаблону (Armour + Ward + Fear/Terror + Breath + Regenerate) до кінця бою; перевірка, що Traits запечені в учасників.
- Інтеграція на БД wfrp (Docker, порт 54322, `dnd-tracker-wfrp-db-1`): публікація, клон у кампанію, `abilities`/`characteristics`/`statblock` на місці, повторний запуск не змінює `contentVersion`, шаблон прибраний після смоуку (afterAll не чіпає чужі шаблони).
- «Звірити з книгою»: додати, що числа юнітів задані по рівню загрози, а не з офіційних стат-блоків.

## Обмеження й ризики

1. `unit.level` у wfrp: у коді рушія й `from-unit.ts` не читається; перша задача плану перевіряє також XP/баланс-калькулятори. Якщо читається — рівень загрози переїжджає в інше поле, spec оновити.
2. Sync шаблону: бандл бере всі скалярні колонки `Unit`, але це прочитано, а не прогнано; підтверджує інтеграційний тест (клон, повторний sync).
3. Бюджет OpenAPI (195000) може бути перевищений полем `abilities` в імпорті.
4. Нових текстів `messages` немає, `scope-size` не зачіпається.
5. Сканер забороненого не ловить синоніми й переклади; оригінальність за межами списку перевіряє фінальне рев'ю.

## Відкрито для plan

- Точні числа ростера (діапазони за рівнем, таблиця «Ростер»).
- Місце helper-а спільного предиката Trait-ефектів (ресурс + імпорт).
- Чи піднімати бюджет OpenAPI.
