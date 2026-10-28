# План: розширення рушія 5e (хвіст після `fix/5e-flow`)

Контекст: live-аудит 5e (2026-10-28) і `fix/5e-flow` закрили баги; нижче те, що не вдалося без нових примітивів рушія. Кожен блок — окремий коміт, TDD, `pnpm test:related`; повний `test:run` раз наприкінці. Експанд-онлі, міграцій немає (якщо не сказано).

## Блок A. Arcane Recovery (Wizard) — ефект «відновити слоти за бюджетом кіл»
- **Ефект** `restoreSpellSlotLevels { budget: { scale|expr: ⌈level/2⌉ }, maxSlotLevel: 5 }` у `lib/utils/abilities/schema/effects.ts` + `registry/effects/state.ts` (поруч з `applyRestoreSpellSlot`, рядок ~151). Вибір слотів: `picks: Record<slotLevel, count>` у запиті; валідація суми кіл ≤ бюджет, кожне коло ≤ 5, лише витрачені слоти.
- **Тригер**: короткий відпочинок поза боєм. Хук у `lib/utils/characters/resources/rest.ts` (`applyRest("short")`) + `POST …/rest` приймає `arcaneRecovery?: picks`; ліміт «раз на день» — через `limits.perRest` + `shortRegain`-подібний скид на довгому.
- **Дані**: `scripts/srd/overrides/classes.ts` `srd-2024_wizard_arcane-recovery`; `pnpm srd:build`.
- **UI**: діалог короткого відпочинку — блок вибору слотів (хук у `lib/hooks/characters`, компонент лише рендерить).
- **Тести**: бюджет (Wizard 5 → 3 кола), заборона 6+, раз на день, відмова без витрачених слотів.

## Блок B. Cunning Strike (Rogue) — вибір ефекту замість кісток Sneak Attack
- **Рішення**: Sneak Attack залишається `dealDamage` по `hit`; додаємо до запиту атаки `cunningStrike?: { effect: "poison"|"trip"|"withdraw"; }`. Pipeline (`lib/utils/battle/attack/process/hit.ts`) віднімає `N` d6 з sneak (вартість ефекту: 1) і запускає ефект: poison (рятівний CON, стан poisoned), trip (рятівний DEX, prone), withdraw (рух без атак при відході). СК = 8 + DEX + майстерність.
- **Схема**: `limits`/`choices` для вміння — `ability.params.cunningStrike` (список ефектів + вартість кісток); Zod у `lib/utils/abilities/schema/`.
- **UI**: у діалозі атаки показувати вибір лише якщо носій має Cunning Strike і Sneak Attack доступний цього ходу.
- **Тести**: кількість кісток, СК, відмова при 0 кісток.

## Блок C. Точність Reckless Attack і Steady Aim
- Reckless: `advantage` лише на STR-атаки (поточне наближення — всі ближні): умова `Condition { attackAbility: "strength" }` у `condition` схеми abilities + перевірка в `collectModifiers` по `attack.ability`.
- Steady Aim: перевага знімається після першої атаки цього ходу (`consumeAttackEffects`, `lib/utils/battle/attack/consume-effects.ts`) і вимагає `movedThisTurn === false` (є `battleData` позиція/рух — перевірити поле у `turn-state`).
- **Тести**: DEX-атака без переваги від Reckless; друга атака після Steady Aim без переваги; відмова, якщо вже рухався.

## Блок D. Володіння: раси, риси, мультиклас, структуроване поле
- `abilities.proficiencies` збирати з **усіх** класів героя (мультиклас: за правилами 5e бере лише частину — зафіксувати таблицю SRD «Multiclass proficiencies» як дані класу `multiclassProficiencies`) + риси (`Lightly/Moderately/Heavily Armored`, `Weapon Master`) + раси (Dwarf — легкі/середні броні за вибором, Elf Weapon Training).
- Структурована категорія зброї: поле `weaponCategory: simple|martial` (+ `weaponKind: melee|ranged`) у моделі артефакта/`modifiers`, конвертер SRD (`scripts/srd/convert/`) пише його замість парсингу опису; `extract-attacks.ts` читає поле, парсинг опису лишається fallback.
- Блок касту: додати перевірку броні без володіння у `ability-action` та `bonus-action` мутації (зараз лише `spell-mutation`).
- **Тести**: `weaponCategoryOf`, мультиклас Fighter→Wizard (Wizard не дає броню), риса Heavily Armored.

## Блок E. Дрібне
- Мультиклас: HP нового класу (середнє/кидок кістки нового класу) і навичок/володінь нового класу — перевірити й закрити тестом (в аудиті не перевірено).
- Ініціатива d20+DEX як опція `rules.initiative.mode: "roll"` (за замовчуванням лишається статична, HOMM/пресет без змін) — окреме рішення користувача.
- Не перевірено в аудиті: раси Dragonborn/Gnome/Goliath/Tiefling, Weapon Mastery, СО концентрації при ударі по кастеру, легендарні дії — прогнати live-аудит (UI, коли Chrome-розширення працює).

## Порядок і оцінка
C → D → A → B → E (від дешевого до дорогого). Імплементери — Sonnet, фінальне ревю — один Opus; A і B торкаються різних файлів і можуть іти паралельно. Після прод-деплою — `pnpm constructor:srd-template` для оновлення шаблону 5e на проді (нові дані класів).
