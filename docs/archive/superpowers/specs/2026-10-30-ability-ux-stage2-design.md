# Ability UX, етап 2: рецепти, згортання секцій, форма заклинань

Гілка `feat/ability-ux-stage2` (worktree `../dnd-tracker-ux2`). Попередній етап: [handoff](../plans/2026-10-29-ability-ux-next-stages.md), [spec етапу 1](../../archive/superpowers/specs/2026-10-29-ability-flow-design.md).

## Мета

Редактор здібностей простіший для новачка й коротший по висоті:

1. **Рецепти.** Галерея готових здібностей і ефектів заклинань із 1–3 параметрами замість плоского списку з 9 шаблонів.
2. **Згортання секцій** `AbilityPanel` із підсумком у заголовку.
3. **Форма заклинань** користується тими самими примітивами (список ефектів, згортання) і тією ж галереєю.

## Поза обсягом

- Зміни схеми `Ability`/`Spell`, перейменування тригерів і ефектів.
- Механіка інгредієнтів заклинань (вартість, витрата, перевірка при касті): окремий епік зі своїм spec після етапу 2. Зараз `Spell.components` — довільний рядок, рушій його не читає.
- Прапорці V/S/M у формі; згортання окремих карток ефектів; етап 3 (перегляд класів/рас).

## Reuse (що перевикористовується і чому нове потрібне)

| Є | Роль |
|---|---|
| `AbilityFlow`, `summarizeAbility`, `AbilityFlowSummary` | превʼю рецепта-здібності; підсумок у заголовках згорнутих секцій (`joinSegments` по `when/if/then/limits`) |
| `useAbilityText` (`effect`, `segments`) | текст підсумку; превʼю ефектів заклинань (рядок, не чипи) |
| `TRIGGER_GROUPS`, `SelectField groups` | без змін, використовуються в `TriggerSection` |
| `ABILITY_TEMPLATES`, `AbilityTemplatePicker`, `AbilityCopySourcePicker` | розширюються в рецепти й галерею; «Копіювати з…» лишається |
| `SectionShell`, `sectionId`, `FlowPart`, `FLOW_BORDER` | отримує згортання; фокус/підсвітка чипа лишаються |
| `NestedEffectsEditor` | спільний список ефектів для `EffectsSection` і `SpellFormEffects` (зараз два дубльовані цикли) |
| `EffectCard`, `SpellEffectCard`, `AbilityEditorProvider`, `FieldErrors`, `newEffect`, `allowedEffectKinds` | без змін |
| `ResponsiveDialog`, `SelectField`, `Input`, `HudSection` | UI галереї, форми параметрів, обгортка секції заклинань |
| `DICE_PATTERN` (`lib/utils/common/dice.ts`), `STAT_KEYS` (`schema/kinds.ts`) | параметри `dice`, `stat` |
| `lib/hooks/abilities/` | місце для `useRecipeValues` |

Нове: модель `Recipe`, `buildRecipe`, `RecipeGallery`, `RecipeForm`, `CollapsibleHeader`. Дублі не вводимо: `AbilityFlow` для ефектів заклинань не потрібен (картка вже показує `= текст`).

## Дизайн

### 1. Модель рецептів

`lib/utils/abilities/templates/` (замість файлу `templates.ts`; `ABILITY_TEMPLATES` лишається аліасом на каталог для сумісності імпортів `AbilityListEditor`, `AbilityTemplatePicker`, тестів).

```ts
type RecipeScope = "ability" | "spell";
type RecipeCategory = "defense" | "offense" | "support" | "resource" | "control";
type ParamDef = {
  key: string;
  kind: "number" | "dice" | "select" | "damageType" | "stat" | "duration";
  default: string | number;
  min?: number;
  max?: number;
  options?: readonly string[];
};
type RecipeValues = Record<string, string | number>;
type RecipeResult =
  | { ability: Omit<Ability, "id"> }
  | { spell: SpellEffect[]; concentration?: boolean };
type Recipe = {
  id: string;
  category: RecipeCategory;
  scopes: readonly RecipeScope[];
  params: readonly ParamDef[];
  build: (v: RecipeValues, ctx: { scope: RecipeScope; name: string; note: string }) => RecipeResult;
};
```

- `buildRecipe(recipe, values, ctx)` → `{ ok: true, result } | { ok: false, issues }`: підставляє `default` для відсутніх значень, обмежує за `min/max`, будує результат і проганяє `AbilitySchema` / `SpellEffectSchema` (`safeParse`).
- 9 наявних шаблонів переходять у рецепти (`stats, damage, onHit, resistance, aura, survive, bonusAction, spellSlots`; `custom` стає пунктом «З нуля», не рецептом). Додаткові рецепти (опір типу шкоди, DoT при влучанні, лікування, штовхання тощо) і точний перелік — у плані після огляду `EFFECT_REGISTRY`; для кожного вказується `scopes`.
- Рецепт заклинання використовує лише види, дозволені для `SPELL_EFFECT_TRIGGER = { event: "action" }`.
- i18n: `abilityRegistry.templates.<id>.{label,hint,defaultName}` (вже є) + `templates.<id>.params.<key>` + `templates.categories.<cat>`.

### 2. Галерея і форма

- `RecipeGallery` (`components/abilities/`): `ResponsiveDialog`; чипи категорій («Усі» + категорії); картки `label`/`hint` + превʼю (`AbilityFlow` для здібності, `text.effect` для ефектів заклинання); закріплені «З нуля» і «Копіювати з…» (лише scope `ability`).
- Крок параметрів: рецепт без параметрів створюється одразу; інакше `RecipeForm` — поля за `ParamDef.kind` (`number`/`dice` → `Input`, решта → `SelectField`), для здібності ще «Назва» (`defaultName`), превʼю, що перебудовується, «Створити» вимкнена, поки `buildRecipe` не ok; помилки через `FieldErrors` (`validation.*`).
- `useRecipeValues(recipe)` у `lib/hooks/abilities/` (стан значень, `buildRecipe`, експорт з barrel).
- Гарантії: «З нуля» дає порожню здібність; параметри діють лише при створенні (звʼязку з рецептом у даних немає); «Копіювати з…» лишається.
- Здібність: `AbilityListEditor` відкриває галерею замість `AbilityTemplatePicker`, `onPick(Ability[])` без змін.
- Заклинання: кнопка «Додати ефект» у `SpellFormEffects` — меню «З рецепта» (галерея, `scope: "spell"`) / «Порожній ефект» (`newEffect`). `concentration: true` рецепта вмикає прапорець, вимикати не вміє.
- `damageType`: єдиного списку типів шкоди в коді нема (поле реєстру `input: "text"`). У плані з'ясувати джерело підписів (`registry/labels.ts`); якщо його нема — текстове поле з підказками.

### 3. Згортання секцій

- `CollapsibleHeader` (`components/abilities/sections/`): кнопка з `aria-expanded`, шевроном, `SectionTitle`, у згорнутому стані — підсумок одним рядком (обрізання), для порожньої секції — приглушений прочерк; у порожніх Умови/Лімітів кнопка «+» відкриває секцію.
- `SectionShell` отримує `open`, `onToggle`, `summary` і використовує `CollapsibleHeader`. `LimitsSection` викликає `SectionShell` у двох гілках — обидві оновлюються. `PerformSection` не згортається (рендериться лише для `legendaryCost`/`lair`).
- Стан `open: Record<FlowPart, boolean>` у `AbilityPanel`, ініціалізація один раз: Тригер і Ефекти відкриті; Умова і Ліміти відкриті, лише якщо `summary.if`/`summary.limits` непорожні. Без `localStorage`.
- Секція з помилками (`useErrorsUnder` для `trigger|condition|limits|effects`) розгортається автоматично й не закривається автоматикою.
- Клік по чіпу `AbilityFlow`: відкрити секцію → дочекатися кадру → `scrollIntoView`/`focus`/підсвітка (переписати `focusSection`).
- Нова картка (з рецепта чи вручну) розгортається й прокручується в поле зору.

### 4. Спільне зі формою заклинань

- `EffectsSection` і `SpellFormEffects` переходять на `NestedEffectsEditor` з `renderCard` (`EffectCard` / `SpellEffectCard`); помилки індексу — всередині `renderCard`, над карткою; для верхнього рівня додається необовʼязковий `className` (зараз `col-span-6`).
- Секція «Ефекти» форми заклинань згортається через `CollapsibleHeader` у `HudSection`; решта секцій форми без змін.

### 5. i18n, документація

- Ключі лише в наявних ns (`abilityRegistry.templates.*`, `abilities.templates.*`, `abilities.panel.*`); `scope-size` не порушується; en пишеться одразу.
- Запис у `lib/onboarding/whats-new.ts` + `whatsNew.<id>` в обох `messages/*/whatsNew.json`; help-стаття не потрібна.
- Оновити `docs/architecture/abilities.md`, `docs/STATUS.md`; після мерджу `git mv` spec і plan в `docs/archive/superpowers/`.

## Тест-кейси

- `buildRecipe`: кожен рецепт на `default` проходить схему (`ability`/`spell` відповідно до `scopes`); значення за межами `min/max` обмежуються; невалідна кістка → `ok: false`; рецепт заклинання не містить видів, недозволених для тригера `action`.
- Паритет i18n: для кожного рецепта є `label`, `hint`, `defaultName`, параметри й категорії в uk і en.
- `RecipeGallery` (`happy-dom`): фільтр за категорією; рецепт без параметрів створюється одразу; з параметрами — форма, «Створити» вимкнена при помилці; «З нуля» дає порожню здібність; для `spell` немає «Копіювати з…».
- `AbilityPanel`: початковий стан відкрито/згорнуто (порожня й заповнена здібність); автовідкриття при помилці; клік по чіпу в згорнутій секції відкриває її і ставить фокус; обидві гілки `LimitsSection`.
- Спільний список ефектів: поведінка `EffectsSection` і `SpellFormEffects` не змінена (наявні тести зелені); помилка індексу показується один раз.
- `SpellFormEffects`: меню «З рецепта» додає ефекти; `concentration` вмикається лише рецептом, що його задає.

## Порядок задач

1. `CollapsibleHeader` + згортання (`SectionShell`, `AbilityPanel`, чипи).
2. Спільний список ефектів на `NestedEffectsEditor` (`EffectsSection`, `SpellFormEffects`).
3. Модель рецептів: типи, `buildRecipe`, каталог, міграція шаблонів, тести.
4. `RecipeGallery`, `RecipeForm`, `useRecipeValues`; підключення до `AbilityListEditor`.
5. Галерея у формі заклинань, згортання секції «Ефекти».
6. whats-new, `abilities.md`, `STATUS.md`.

Задачі 1–2 незалежні від 3–4 і мерджаться окремо першими.

## Відкриті питання

- Джерело списку типів шкоди для параметра `damageType` (див. розділ 2).
- Точний перелік і кількість рецептів (оцінка ≈ 20, не перевірена).
- Місце виконання живої браузерної перевірки: потрібен `.env.local` у worktree (локальна БД Docker на 54322); ключі з основної папки не копіюються.
- Епік механіки інгредієнтів заклинань: окремий spec після етапу 2.
- Хвости handoff (en-вичитка, сирі типи шкоди `physical`/`all`, `useAbilityText` → `lib/hooks`) цим етапом не закриваються.
