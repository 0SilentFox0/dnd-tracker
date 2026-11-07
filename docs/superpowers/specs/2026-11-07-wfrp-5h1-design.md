# WFRP 5h-1: Traits юнітів (spec)

Частина епіку WFRP (`feat/wfrp`, не мерджити в main). Попередні частини: [5f](2026-11-06-wfrp-5f-design.md), хвости 5d–5f. Подальші частини 5h: 5h-2 `tables`, 5h-3 Corruption/мутації, 5h-4 downtime/Character Events.

## Мета

DM будує WFRP-бестіарій з реальними Traits, які працюють у бою: юніт з Armour, Ward, Size, Fear/Terror, Regenerate і атаками Bite/Claw/Breath/Weapon +X б'ється коректно, а чесний баланс враховує його захист і шкоду. Критерій успіху: e2e-бій з таким юнітом проходить, `battle-sweep` homm/dnd5e лишається чистим.

## Рішення (узгоджено з користувачем 2026-11-07)

- **Модель A (гібрид):** Traits = записи `abilities` юніта (id `wfrp.trait.<key>`, X у `params`). Окремого сховища немає, **міграцій немає**.
- **Обсяг: розширений:** Armour X, Weapon +X, Size, Ward X, Regenerate, Fear/Terror X, Bite/Claw, Breath, Magical, Flier, Swarm; наративні (Night Vision, Undead, Hardy) — через наявні `note`/`sense`.
- **Fear/Terror — повний тест психології** (Cool із SL), наслідок через стани 5c.

## Що вже є (з дослідження коду)

- Unit abilities збираються й запікаються незалежно від системи (`build/collect.ts`, `bake.ts`, `read.ts`); gate на wfrp немає.
- `participantFields(unit)` викликається без спорядження (`from-unit.ts:174`) → AP юніта = 0; `mitigate.ts:24-33` уже читає `abilities.wfrp.ap/tb/sb`.
- Атаки юніта — 5e-стиль (`unitBattleAttacks`); `attack.wfrp` є лише в персонажів (`extract-wfrp-attacks.ts`).
- Хуків для Ward, Size, психології немає; `wfrpConditionsTurnStart` (`wfrp/conditions/tick.ts`) — місце для тіків станів; Regenerate йде через `turnStart` + `heal` у DSL.
- `unusedMechanics` wfrp (morale, saves, 5e-стани) — ефекти на них мовчки не діють.

## Архітектура

### Реєстр Traits

`lib/utils/rules/systems/wfrp/traits/`: для кожного ключа — назва, чи має X, фабрика `(value) → Ability[]`. У редакторі юніта це рецепти в наявній `RecipeGallery` (вкладка Abilities); окремого UI не додаємо.

Три класи:
1. **Готові ефекти DSL:** Regenerate (`turnStart` + `heal`), Night Vision/Undead/Hardy (`note`/`sense`).
2. **Нові wfrp-ефекти** (`lib/utils/abilities/schema/effects.ts`): `wfrpArmour {head, body, arms, legs}` (0 за замовчуванням), `wfrpWard {value}` (1..10), `wfrpSize {size}` (Tiny…Enormous), `wfrpPsychology {kind: fear|terror, value}`. Парсер `parseAbilities` відкидає їх у кампаніях не-wfrp (валідація за `rules.system`) — dnd5e/homm без змін.
3. **Атаки юніта:** профілі `attack.wfrp` для юнітів (Bite/Claw/Breath/Weapon +X, `Magical` як flag) через код, спільний із персонажами (`extract-wfrp-attacks.ts`), з якостями 5f.

### Потік у бою

1. **Створення учасника** (`from-unit`): passive-ефекти → `abilities.wfrp.ap` з `wfrpArmour`, `size` і `ward` у `abilities.wfrp`; атаки з `attack.wfrp`.
2. **Атака:** `resolveAttack`/`mitigate` читають `size` (модифікатор влучання й шкоди) і `ward` (кидок d10 до поглинання).
3. **Початок бою:** `battleStart` збирає `wfrpPsychology` усіх учасників і запускає тест Cool для кожного, хто бачить істоту (гравці й NPC). Провал накладає стан 5c; Terror = Fear + додатковий тест. Результат у журнал за правилами приватності 5c-2.
4. **Баланс:** `combat.hitModel` читає запечені AP, Size і Ward — «fair» враховує бронь і Ward (без нового режиму).

### Помилки й крайні випадки

- Невалідний ability відкидається з `console.warn` (як зараз).
- Regenerate не лікує непритомного/мертвого.
- Fear/Terror не діють на істоту з імунітетом (`conditionImmunity`) і на носія самого Trait.

## Тести

- Юніт-тести реєстру та кожного хука (armour/ward/size/psychology/regenerate).
- `wfrp-traits-e2e.test.ts`: юніт з Armour + Ward + Fear у бою до кінця.
- Регрес: dnd5e/homm відкидають wfrp-ефекти, поведінка не змінюється.
- Гейт епіку: `battle-sweep` homm/dnd5e на prodcopy (наприкінці епіку).

## Поза межами

Окремий wfrp-UI для Traits (лише рецепти); повні механіки Flier/Swarm (позначка + `note`); Corruption і мутації (5h-3); таблиці (5h-2). Пошук повторного використання: `RecipeGallery`, `extract-wfrp-attacks.ts`, `unitBattleAttacks`, стани 5c, d100-тест.

## Звірити з книгою

Формула Ward (поріг на d10), модифікатори Size, умови спрацювання й складність Fear/Terror, точний перелік атак-трейтів. Додати до єдиного списку в `docs/architecture/rule-systems.md`.
