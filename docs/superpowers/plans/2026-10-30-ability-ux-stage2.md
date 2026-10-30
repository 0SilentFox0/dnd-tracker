# Ability UX, етап 2: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** рецепти з параметрами замість плоского списку шаблонів, згортання секцій `AbilityPanel`, форма заклинань на тих самих примітивах.

**Architecture:** модель `Recipe` + `buildRecipe` (чиста, у `lib/utils/abilities/templates/`) → хук `useRecipeValues` → `RecipeGallery`/`RecipeForm`; `CollapsibleHeader` вбудовано в `SectionShell`; `NestedEffectsEditor` стає єдиним списком ефектів для вмінь і заклинань.

**Tech Stack:** Next.js 16, React 19, TS strict, Zod, next-intl, Vitest (+ happy-dom для UI).

**Spec:** `docs/superpowers/specs/2026-10-30-ability-ux-stage2-design.md` (джерело істини; reuse-таблиця там).

## Global Constraints

- Кирилиці в коді нема; тексти в `messages/{uk,en}/*.json` (лише наявні ns: `abilityRegistry.templates.*`, `abilities.templates.*`, `abilities.panel.*`, `spellEditor.effects.*`); en-тексти пишемо одразу; `scope-size` тест не порушувати.
- Мінімум коментарів; імпорти `@/…`; компоненти не імпортують `@/lib/api/*`; хуки через barrel `@/lib/hooks/abilities`.
- Під час роботи лише `pnpm test:related <файли>` / `pnpm test:run <файл>` і `pnpm exec eslint --fix <змінені файли>`; ніяких repo-wide lint/повного прогону.
- UI-тести з DOM: `// @vitest-environment happy-dom` у першому рядку.
- Коміти: Conventional Commits, закінчувати `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Схеми `Ability`/`Spell`, тригери й види ефектів не змінюються.

## Review Focus

- Порожнє/нечислове значення числового параметра рецепта (NaN, порожній рядок): без падіння, береться `default`/обмеження за `min/max`, превʼю не ламається.
- Кістка `2d`, `1d0`, `d6` у параметрі `dice`: `ok: false`, помилка під полем, «Створити» вимкнена.
- Збережена невалідна здібність із помилкою в згорнутій за замовчуванням секції (Умова/Ліміти): секція відкривається сама.
- Зміна тригера (passive → action) при згорнутих Умові/Лімітах: заголовки й «+» лишаються узгодженими з вмістом (гілка passive у `LimitsSection`).
- Рецепт у заклинанні при вже наявних ефектах: ефекти додаються в кінець, `concentration` не вимикається.
- Повторне відкриття галереї: фільтр категорії й крок параметрів скинуті.

---

## Рішення за відкритими питаннями spec

- **`damageType`:** джерело — `DAMAGE_ELEMENT_OPTIONS` (`lib/constants/damage.ts`), підписи `abilityRegistry.damageTypes.<value>` (вже є uk/en, див. `damageTypeSegment` у `registry/labels.ts`). Параметр `kind: "damageType"` рендериться `SelectField` з цих опцій. Сирі `physical`/`all` не вводимо (використовуємо `bludgeoning|piercing|slashing` у рецепті опору).
- **Перелік рецептів (18)** — таблиця у задачі 3. Підписи `stat`: `abilityRegistry.stats.<key>`; `condition`: `abilityRegistry.options.condition.<key>`.
- Задачі 1–2 і 3–4 незалежні; 5 залежить від 2, 3, 4.

---

### Task 1: Згортання секцій `AbilityPanel`

**Files:**
- Create: `components/abilities/sections/CollapsibleHeader.tsx`
- Modify: `components/abilities/sections/SectionShell.tsx`, `ConditionSection.tsx`, `LimitsSection.tsx` (обидві гілки), `TriggerSection.tsx`, `EffectsSection.tsx`, `components/abilities/AbilityPanel.tsx`
- Modify i18n: `messages/{uk,en}/abilities.json` (`panel.expand`, `panel.collapse`, `panel.emptySummary`)
- Test: `components/abilities/__tests__/AbilityPanel-collapse.test.tsx` (+ підправити `AbilityPanel-flow.test.tsx`)

**Interfaces:**
- Produces:
  ```ts
  // CollapsibleHeader.tsx
  CollapsibleHeader({ title: ReactNode; summary: string | null; open: boolean; onToggle: () => void; onAdd?: () => void; controlsId: string })
  // SectionShell.tsx
  SectionShell({ path; part: FlowPart; title: ReactNode; open: boolean; onToggle: () => void; summary: string | null; onAdd?: () => void; className?; children })
  // AbilityPanel.tsx — AbilitySectionProps розширюється:
  type SectionState = { open: boolean; onToggle: () => void; summary: string | null }
  AbilitySectionProps = { ability; path; onChange; state: SectionState }
  ```
- Summary-рядок: з `summarizeAbility(ability)` (`when/if/then/limits`: `Segment[]`/`Segment[][]`) через `useAbilityText().segments` + `joinSegments` (знайти наявний хелпер; якщо `joinSegments` нема — використати той, що `flowsText`/`AbilityFlowSummary` вже застосовує). `null`, якщо частина порожня.

- [ ] **Step 1: Тести (мають падати)** у `AbilityPanel-collapse.test.tsx` (happy-dom, як у `AbilityPanel-flow.test.tsx`):
  - порожня здібність (passive, без умови/лімітів): Тригер і Ефекти `aria-expanded=true`; Умова й Ліміти `false`.
  - здібність з `condition` і `limits.perBattle`: Умова й Ліміти відкриті.
  - клік по заголовку перемикає `aria-expanded`; вміст згорнутої секції відсутній у DOM (або `hidden`).
  - згорнута секція з вмістом показує підсумок одним рядком; порожня — приглушений прочерк (`panel.emptySummary`).
  - у порожній Умові кнопка «+» (`onAdd`) додає `DEFAULT_CONDITION` і відкриває секцію.
  - збережена здібність із помилкою валідації під `condition` (через `AbilityEditorProvider.errorsByPath`) → Умова відкрита автоматично; під `limits` — Ліміти.
  - клік по чипу `AbilityFlow` для згорнутої секції відкриває її, після кадру (`requestAnimationFrame`/мікротаск) `document.activeElement` = секція; клас підсвітки додається.
  - `LimitsSection` у гілці passive (без вмісту) і в основній гілці обидві рендерять `SectionShell` з заголовком.
- [ ] **Step 2: Запустити** `pnpm test:run components/abilities/__tests__/AbilityPanel-collapse.test.tsx` — FAIL.
- [ ] **Step 3: Реалізація.**
  - `CollapsibleHeader`: `<button aria-expanded aria-controls={controlsId}>` з `ChevronRight`/`ChevronDown`, `SectionTitle`, праворуч підсумок (`truncate text-xs text-muted-foreground`) лише у згорнутому стані; `onAdd` — окрема кнопка «+» (`aria-label` `t("add")` секції) поряд.
  - `SectionShell`: рендерить `CollapsibleHeader`, `children` лише якщо `open`; `id`/`tabIndex` лишаються на обгортці.
  - `AbilityPanel`: `const [open, setOpen] = useState<Record<FlowPart, boolean>>(() => ({ when: true, then: true, if: !!summaryHasIf, limits: !!summaryHasLimits }))`; `useErrorsUnder` для `trigger|condition|limits|effects` → `useEffect`, що виставляє `open[part]=true` при появі помилок (ніколи не закриває). Секції отримують `state`.
  - `focusSection(part)`: `setOpen(part→true)`, `requestAnimationFrame(() => …scrollIntoView/focus/підсвітка)`; таймер чиститься в `unlight`.
  - Нова картка ефекту (`EffectsSection`) розгортає секцію й прокручує до картки (прокрутка — на рівні `AbilityPanel`, через колбек `onAdded` або `focusSection("then")`).
  - `PerformSection` не чіпати.
- [ ] **Step 4: Прогін** `pnpm test:related components/abilities/AbilityPanel.tsx components/abilities/sections/SectionShell.tsx` — PASS; `pnpm exec eslint --fix` по змінених файлах.
- [ ] **Step 5: Commit** `feat(abilities): collapsible ability sections with summary`

---

### Task 2: Спільний список ефектів на `NestedEffectsEditor`

**Files:**
- Modify: `components/abilities/NestedEffectsEditor.tsx`, `components/abilities/sections/EffectsSection.tsx`, `components/spells/form/SpellFormEffects.tsx`
- Test: `components/abilities/__tests__/NestedEffectsEditor.test.tsx` (новий); наявні `EffectCard*.test.tsx`, `SpellEffectCard.test.tsx` мають лишитися зеленими.

**Interfaces:**
- Produces: `NestedEffectsEditor` отримує `className?: string` (за замовчуванням `"col-span-6"`, верхній рівень передає `""`) і `labels.addExtra?: ReactNode` НЕ додаємо (Task 5 керує кнопкою окремо). Додати `renderAdd?: (add: (next: E[]) => void, ctx: { canAdd: boolean }) => ReactNode` — необовʼязкова заміна стандартної кнопки «Додати» (потрібна Task 5 для меню «З рецепта»); без неї поведінка незмінна.
- Помилки індексу (`errorsByPath[`${path}.${i}`]`) показує `renderCard` (над карткою), один раз.

- [ ] **Step 1: Тест** `NestedEffectsEditor.test.tsx`: додає/видаляє/змінює елементи; `limits.min` блокує видалення, `limits.max` вимикає «Додати»; `className` застосовується; `renderAdd` замінює кнопку й отримує `canAdd`.
- [ ] **Step 2:** Запустити — FAIL.
- [ ] **Step 3: Реалізація.** `EffectsSection`: `<NestedEffectsEditor effects={ability.effects} path={`${path}.effects`} className="" limits={{min:0}} labels={{add:t("add")}} create={() => newEffect(allowedEffectKinds(ability.trigger)[0], ability.trigger)} renderCard={({effect, path: p, actions}) => (<div className="space-y-1"><FieldErrors errors={errorsByPath[p] ?? []} /><EffectCard effect={effect} trigger={ability.trigger} path={p} actions={actions} /></div>)} />` — після цього `FieldErrors` секційного рівня (`errorsByPath[`${path}.effects`]`) лишається над списком. `SpellFormEffects`: так само зі `SpellEffectCard`, `path="effects"`, помилки з `errorsByPath["effects.<i>"]` — один раз. Видалити дубльовані цикли.
- [ ] **Step 4:** `pnpm test:related components/abilities/NestedEffectsEditor.tsx components/spells/form/SpellFormEffects.tsx` — PASS; eslint --fix.
- [ ] **Step 5: Commit** `refactor(abilities): shared nested effects list for abilities and spell form`

---

### Task 3: Модель рецептів і каталог

**Files:**
- Create: `lib/utils/abilities/templates/{types.ts,build.ts,catalog.ts,index.ts}` (видалити `lib/utils/abilities/templates.ts`)
- Modify: `components/abilities/AbilityTemplatePicker.tsx` (тимчасово, імпорт лишається робочим до Task 4), `lib/utils/abilities/__tests__/templates.test.ts` → перенести в `lib/utils/abilities/templates/__tests__/`, `lib/i18n/__tests__/label-keys-abilityRegistry.test.ts`
- Modify i18n: `messages/{uk,en}/abilityRegistry.json` (`templates.<id>.params.<key>`, `templates.categories.<cat>`, нові `templates.<id>.{label,hint,defaultName}`)
- Test: `lib/utils/abilities/templates/__tests__/build.test.ts`, `catalog.test.ts`

**Interfaces:**
- Produces (`templates/index.ts` експортує все; типи — як у spec §1 дослівно):
  ```ts
  type RecipeScope, RecipeCategory, ParamDef, RecipeValues, RecipeResult, Recipe  // spec §1
  RECIPES: readonly Recipe[]
  RECIPE_CATEGORIES: readonly RecipeCategory[]
  ABILITY_TEMPLATES: readonly Recipe[]          // = RECIPES.filter(r => r.scopes.includes("ability")); alias
  FROM_SCRATCH_ID = "custom"                    // не рецепт; i18n templates.custom.* лишаються
  buildScratchAbility(ctx: { name: string; note: string }): Omit<Ability, "id">
  buildRecipe(recipe: Recipe, values: RecipeValues, ctx: { scope: RecipeScope; name: string; note: string }):
    { ok: true; result: RecipeResult } | { ok: false; issues: string[] }   // issues — ключі validation/zod-повідомлення
  ```
- `buildRecipe`: підставляє `default` для відсутніх ключів; для `number`/`dice`-значень, що не парсяться (NaN, порожньо), — `default`; `number` обмежується `min/max`; `dice` не обмежується, а валідується `DICE_PATTERN` (`lib/utils/common/dice.ts`) → `ok:false`; результат проганяє `AbilitySchema.safeParse({id:"tmp",…})` (scope ability) або `SpellEffectSchema.safeParse` для кожного ефекту (scope spell).
- Ефекти в `build` починати з `newEffect(kind, trigger)` (`lib/utils/abilities/editor`) і розширювати, щоб не дублювати дефолти.

**Каталог (id · категорія · scopes · params(default, межі)):**

| id | категорія | scopes | params |
|---|---|---|---|
| `stats` | support | ability | `stat` (stat, armor), `value` (number 1..10, 1) — passive `modifyStat flat` |
| `damage` | offense | ability | `filter` (select ← `DAMAGE_FILTER_KINDS`, melee), `percent` (number 1..100, 10) |
| `onHit` | offense | ability | `dice` (1d4), `damageType` (bleed), `rounds` (number 1..10, 2) — trigger `hit` attacker, `dot` |
| `resistance` | defense | ability | `damageType` (slashing), `percent` (25..: 1..100, 25) — passive flag resistance |
| `aura` | support | ability | `value` (1..5, 1) — passive `modifyStat armor target allAllies` |
| `survive` | defense | ability | — (як було) |
| `bonusAction` | support | ability | `dice` (1d10) — bonusAction `heal`, perBattle 1 |
| `spellSlots` | resource | ability | `level` (select 1..9, 1), `count` (number 1..5, 1) |
| `damageSpell` | offense | ability, spell | `dice` (1d8), `damageType` (fire) — `dealDamage` (ability: trigger `action`) |
| `healSpell` | support | ability, spell | `dice` (1d8) — `heal` (ability: trigger `action`) |
| `dotSpell` | offense | ability, spell | `dice` (1d4), `damageType` (poison), `rounds` (1..10, 3) |
| `hotSpell` | support | ability, spell | `dice` (1d4), `rounds` (1..10, 3) |
| `condition` | control | ability, spell | `condition` (select ← підмножина `CONDITION_KEYS`, що проходить схему; default `stunned`), `rounds` (1..10, 1) |
| `pushBack` | control | ability, spell | `feet` (select 5..30 крок 5, 10) — `push from caster` |
| `buffArmor` | support | ability, spell | `value` (1..5, 2), `rounds` (1..10, 3) — timed `modifyStat armor` |
| `cleanse` | support | ability, spell | — |
| `morale` | support | ability, spell | `delta` (select −3..3 без 0, 1) — `changeMorale` |
| `concentrationBuff` | support | spell | `value` (1..5, 2), `rounds` (1..10, 5) — `buffArmor` + `concentration: true` |

(Scope ability з `action`-ефектом: `trigger: {event:"action"}`, `limits: {perBattle: 1}`.) Рецепт, чий вид недозволений `allowedEffectKinds(SPELL_EFFECT_TRIGGER)`, у `scopes` не потрапляє. Якщо точний вид/поле не збігається зі схемою — підправити рецепт за результатом `catalog.test.ts`, не змінюючи схему.

- [ ] **Step 1: Тести** (`build.test.ts`, `catalog.test.ts`; кожен кейс з spec «Тест-кейси»):
  - кожен рецепт у кожному своєму scope на `default` → `ok:true` і проходить `AbilitySchema`/`SpellEffectSchema`;
  - для кожного рецепта scope ability: `describeAbilityText` (як у старому `templates.test.ts`, `ukT`) непорожній;
  - для кожного spell-рецепта ефекти мають `kind ∈ allowedEffectKinds(SPELL_EFFECT_TRIGGER)`;
  - значення за `min/max` обмежуються (`value: 999` → `max`); `NaN`/`""` → default;
  - `dice: "2d"`, `"1d0"`, `"d6"` → `ok:false`;
  - перебір усіх `options` параметрів `stat`/`condition`/`damageType`/`filter`: кожне значення дає `ok:true`;
  - `concentrationBuff` повертає `concentration: true`; інші spell-рецепти — без нього;
  - id унікальні; порядок `RECIPES` стабільний; `buildScratchAbility` → порожня passive-`note`-здібність, що проходить схему.
  - i18n: `expectLabelKeys` для `templates` з `RECIPES` (`label/hint/defaultName` + `params.<key>` для кожного параметра) + `custom.*` + `categories.<cat>` (uk і en — наявна утиліта перевіряє обидві мови; підтвердити).
- [ ] **Step 2:** `pnpm test:run lib/utils/abilities/templates` — FAIL.
- [ ] **Step 3: Реалізація** типів, `buildRecipe`, каталогу; ключі uk+en; оновити `AbilityTemplatePicker`: список із `ABILITY_TEMPLATES` будує `buildRecipe(…default…)` (тимчасово, без параметрів) і `buildScratchAbility`, щоб UI не ламався до Task 4.
- [ ] **Step 4:** `pnpm test:related lib/utils/abilities/templates/index.ts components/abilities/AbilityTemplatePicker.tsx lib/i18n/__tests__/label-keys-abilityRegistry.test.ts` — PASS; eslint --fix.
- [ ] **Step 5: Commit** `feat(abilities): recipe model, buildRecipe and catalog`

---

### Task 4: `RecipeGallery`, `RecipeForm`, `useRecipeValues`

**Files:**
- Create: `components/abilities/RecipeGallery.tsx`, `components/abilities/RecipeForm.tsx`, `lib/hooks/abilities/useRecipeValues.ts` (+ експорт у `lib/hooks/abilities/index.ts`)
- Delete: `components/abilities/AbilityTemplatePicker.tsx` (та її імпорт)
- Modify: `components/abilities/AbilityListEditor.tsx`, `components/abilities/index.ts` (експорт `RecipeGallery`), `messages/{uk,en}/abilities.json` (`templates.*`: `scratch`, `scratchHint`, `allCategories`, `create`, `back`, `previewTitle`, `nameLabel`)
- Test: `components/abilities/__tests__/RecipeGallery.test.tsx`, `lib/hooks/abilities/__tests__/useRecipeValues.test.ts` (за потреби `// @vitest-environment happy-dom`); оновити `AbilityListEditor.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`RECIPES`, `RECIPE_CATEGORIES`, `buildRecipe`, `buildScratchAbility`, типи).
- Produces:
  ```ts
  useRecipeValues(recipe: Recipe | null, ctx: { scope: RecipeScope; name: string; note: string }):
    { values: RecipeValues; set: (key: string, v: string | number) => void; built: ReturnType<typeof buildRecipe> | null; reset: () => void }
  // RecipeGallery props — дискримінант за scope:
  type RecipeGalleryProps =
    | { open; onOpenChange; scope: "ability"; onPick: (abilities: Ability[]) => void }
    | { open; onOpenChange; scope: "spell"; onPick: (r: { effects: SpellEffect[]; concentration?: boolean }) => void }
  ```
- `AbilityListEditor` лишає `add(items)`/`onPick(Ability[])` без змін; `campaignId` для «Копіювати з…» береться з `useAbilityEditor()`.

- [ ] **Step 1: Тести.**
  - `useRecipeValues`: початкові значення = defaults; `set` перебудовує `built`; `reset` повертає стан; `recipe=null` → `built=null`.
  - `RecipeGallery` (ability): чипи категорій фільтрують картки; «Усі» показує всі; картки мають `label`/`hint` і превʼю; рецепт без параметрів (`survive`) створює одразу (`onPick` викликано, діалог закрито); рецепт з параметрами відкриває форму, «Створити» вимкнена при `dice="2d"` і помилка під полем (`FieldErrors`), увімкнена після виправлення, значення потрапляють у `onPick`; поле «Назва» початково = `defaultName`; «З нуля» викликає `onPick([buildScratchAbility])` (порожня passive-здібність); «Копіювати з…» присутнє й відкриває `AbilityCopySourcePicker`.
  - `RecipeGallery` (spell): рецепти лише зі `scopes ∋ "spell"`; немає «З нуля»-здібності й «Копіювати з…»; `onPick({effects, concentration})`.
  - Закриття й повторне відкриття скидає категорію й крок параметрів (Review Focus).
  - `AbilityListEditor`: кнопка «Додати» відкриває галерею, вибір додає здібність із новим id.
- [ ] **Step 2:** запустити — FAIL.
- [ ] **Step 3: Реалізація.** `ResponsiveDialog hud` (як у старому пікері); картка-кнопка: `label`, `hint`, превʼю (`AbilityFlow` з `summarizeAbility(built.ability)` для ability; для spell — `useAbilityText().effect` по ефекту, рядок); `RecipeForm`: `number`/`dice` → `Input`, `select`/`stat`/`condition`/`damageType`/`duration` → `SelectField` (`stat` ← `STAT_KEYS`-підмножина з `ParamDef.options`, підписи `abilityRegistry.stats.*`; `damageType` ← `DAMAGE_ELEMENT_OPTIONS`, підписи `abilityRegistry.damageTypes.*`); превʼю перебудовується; помилки через `FieldErrors`/`validation.*`; для scope ability — поле «Назва». Видалити `AbilityTemplatePicker`.
- [ ] **Step 4:** `pnpm test:related components/abilities/RecipeGallery.tsx components/abilities/AbilityListEditor.tsx lib/hooks/abilities/useRecipeValues.ts` — PASS; eslint --fix.
- [ ] **Step 5: Commit** `feat(abilities): recipe gallery with parameter form`

---

### Task 5: Галерея у формі заклинань, згортання секції «Ефекти»

**Files:**
- Modify: `components/spells/form/SpellFormEffects.tsx`, `messages/{uk,en}/spellEditor.json` (`effects.addFromRecipe`, `effects.addEmpty`, `effects.summary`)
- Test: `components/spells/form/__tests__/SpellFormEffects.test.tsx`

**Interfaces:**
- Consumes: Task 2 (`NestedEffectsEditor.renderAdd`, `className`), Task 4 (`RecipeGallery scope="spell"`), `CollapsibleHeader` (Task 1).
- Поведінка: кнопка «Додати ефект» → меню («З рецепта» відкриває галерею, «Порожній ефект» додає `newEffect(allowedEffectKinds(SPELL_EFFECT_TRIGGER)[0], SPELL_EFFECT_TRIGGER)`). Використати наявний `components/ui` dropdown (знайти; не вводити новий). Рецепт додає `effects` у кінець `formData.spellEffects`; `concentration: true` рецепта виставляє `formData.concentration = true`, інакше поле не змінюється. Секція «Ефекти» в `HudSection` згортається через `CollapsibleHeader`; у заголовку згорнутої — підсумок (кількість ефектів, `effects.summary`); за замовчуванням відкрита; відкривається автоматично при помилках `errorsByPath` і після додавання. Решта секцій форми без змін.

- [ ] **Step 1: Тести** (happy-dom): меню «З рецепта» додає ефекти й закриває галерею; наявні ефекти збережено, новий — останній; `concentrationBuff` вмикає прапорець, `damageSpell` не вимикає вже увімкнений; «Порожній ефект» додає один ефект; згортання ховає картки й показує підсумок; помилка валідації в ефекті відкриває секцію; галерея не показує «Копіювати з…».
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Реалізація** за поведінкою вище.
- [ ] **Step 4:** `pnpm test:related components/spells/form/SpellFormEffects.tsx` — PASS; eslint --fix.
- [ ] **Step 5: Commit** `feat(spells): recipe gallery and collapsible effects in spell form`

---

### Task 6: whats-new і документація

**Files:**
- Modify: `lib/onboarding/whats-new.ts`, `messages/{uk,en}/whatsNew.json`, `docs/architecture/abilities.md` (розділ «Рецепти й згортання (ability UX, етап 2)»: модель `Recipe`, `buildRecipe`, каталог, `RecipeGallery`, `CollapsibleHeader`, спільний `NestedEffectsEditor`, джерело `damageType`), `docs/STATUS.md`
- Test: наявні тести whats-new/i18n (`pnpm test:related lib/onboarding/whats-new.ts`)

- [ ] **Step 1:** запис у `whats-new.ts` за зразком сусідніх + `whatsNew.<id>` в обох `messages/*/whatsNew.json` (en одразу; help-стаття не потрібна).
- [ ] **Step 2:** оновити `abilities.md` і `STATUS.md` (етап 2: що зроблено; відкрите: механіка інгредієнтів — окремий епік, хвости handoff).
- [ ] **Step 3:** `pnpm test:related lib/onboarding/whats-new.ts` — PASS; eslint --fix змінених ts.
- [ ] **Step 4: Commit** `docs: ability UX stage 2 whats-new, abilities.md, STATUS`

---

## Після задач (контролер, не implementer)

1. Один Opus-рев'ю всієї гілки + `/simplify` (1–2 агенти) на diff гілки.
2. Живий браузерний прогін (редактор здібностей і форма заклинань, desktop+mobile) через subagent Sonnet; потрібен `.env.local` у worktree — спитати користувача про значення (локальна БД Docker, порт 54322), ключі з основної папки не копіювати.
3. Перед мерджем один раз `pnpm test:run` і repo-wide lint (спершу `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`).
4. У merge-коміті `git mv` spec і plan у `docs/archive/superpowers/`. Не пушити й не мерджити без згоди користувача. Задачі 1–2 можна змерджити окремо першими.
