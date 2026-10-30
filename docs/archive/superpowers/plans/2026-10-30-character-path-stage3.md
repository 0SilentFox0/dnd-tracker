# Шлях персонажа, етап 3: мультиклас і єдина вкладка — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** «Шлях» показує підсумок героя з кількома класами, дає додати клас із видимими причинами недоступності й однаково називається для 5e і HoMM.

**Architecture:** чисте ядро `multiclassReasons` (спільне для сервера й UI) → `useClassLevelUpForm` віддає `available` із причинами й `startNew` → нові презентаційні `ClassesHeader`/`ClassSection` у `components/character-profile/path/` → `SkillsTab` складає їх, `ProfileEditor` передає `classLevelUp`. Міграцій і нових API нема.

**Tech Stack:** Next.js 16, React 19, next-intl, Vitest (happy-dom для UI), pnpm.

**Spec:** `docs/superpowers/specs/2026-10-30-character-path-stage3-design.md`

## Global Constraints

- Тексти лише ключами в `messages/{uk,en}/*.json`, Кирилиця в коді заборонена (ESLint); ключі uk/en збігаються.
- Тести поруч у `__tests__/`; UI-тест із DOM — `// @vitest-environment happy-dom`.
- Імпорти `@/...`, без `../../`; без нових API/колонок/міграцій; `lib/api/*` і `fetch` у компонентах заборонені.
- Під час роботи: `pnpm test:related <files>` і `pnpm exec eslint --fix <files>`; повний test/lint — один раз наприкінці, не паралельно з іншим важким процесом.
- Коментарі мінімальні (CLAUDE.md користувача); коміти з рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Працювати у worktree `../dnd-tracker-path34` (гілка `feat/character-path-stage3`); перед комітом `git branch --show-current`.

## Review Focus

1. Герой з одним класом і максимальним рівнем: шапка без кнопки, секція відкрита, вигляд як раніше.
2. Героя без `hero` у `LevelUpCharacter` (немає здібностей): жодних причин, жодного disabled, клас вибирається як раніше.
3. Клас із відкритими виборами не згортається за замовчуванням, навіть коли класів > 2.
4. `multiclassReasons` для вже наявного класу, чиї вимоги більше не виконано (змінилась характеристика): причина називає саме його, не новий клас.
5. Режим перегляду (гравець, `manage` нема): кнопки «+ Новий клас» немає ні в DOM, ні як пропс.

## Файли

| Файл | Дія |
|---|---|
| `lib/utils/characters/classes/multiclass.ts` | + `multiclassReasons`, `MulticlassReason`; `multiclassBlockedBy` через неї |
| `lib/utils/characters/classes/path.ts` | + `classLevels`, `classSectionOpen` |
| `lib/hooks/characters/useClassLevelUpForm.ts` | `available` з причинами, `startNew` |
| `components/character-profile/MulticlassReasons.tsx` | нова: список причин |
| `components/character-profile/ClassLevelUpDialog.tsx` | disabled-опції, причини під селектом, `startNew` |
| `components/character-profile/path/ClassesHeader.tsx`, `ClassSection.tsx`, `header.ts` | нові |
| `components/character-profile/SkillsTab.tsx`, `ProfileEditor.tsx`, `CharacterProfile.tsx` | складання, пропс `classLevelUp`, назва вкладки |
| `components/skill-tree/progression/PointsHeader.tsx` | спільний клас шапки |
| `messages/{uk,en}/characterProfile.json`, `whatsNew.json`, `lib/onboarding/whats-new.ts` | ключі й запис |
| `docs/architecture/characters.md`, `docs/STATUS.md` | документація |

---

### Task 1: `multiclassReasons` і хелпери шляху

**Files:** Modify `lib/utils/characters/classes/multiclass.ts`, `lib/utils/characters/classes/path.ts`, `lib/utils/characters/classes/index.ts` (експорти); Test `__tests__/multiclass.test.ts`, `__tests__/path.test.ts`.

**Produces:**
```ts
export interface MulticlassReason { className: string; abilities: AbilityKey[]; need: number; have: number }
export function multiclassReasons(current: readonly Pick<GameClassData, "name">[], next: Pick<GameClassData, "name">, scores: Readonly<Record<AbilityKey, number>>): MulticlassReason[]
export const classLevels = (list: readonly ClassProgression[]): { classId: string; className: string; level: number }[]   // level = pathSummary.level ?? 0
export const classSectionOpen = (list: readonly ClassProgression[], progression: ClassProgression): boolean // list.length <= 2 || pathSummary(progression).open > 0
```

- [ ] Тести (спершу, мають падати): `multiclassReasons` — клас без вимог → `[]`; Wizard при Int 10 → `[{className:"Wizard",abilities:["intelligence"],need:13,have:10}]`; Monk, Paladin: невиконана одна з двох груп → один запис, обидві → два; Fighter (STR/DEX) з DEX 13 → `[]`, а при обох < 13 → `have` = найбільша з двох; наявний Wizard при Int 10, новий Rogue з DEX 14 → один запис з `className: "Wizard"`; наявні тести `multiclassBlockedBy` без правок. `path.test.ts`: `classLevels` (два класи, клас без `current` → 0), `classSectionOpen` (1–2 класи → true; 3 класи без відкритих → false; 3 класи, цей має `open` pick → true).
- [ ] Реалізація: у `multiclass.ts` повторно використати `met`-логіку групи (виділити `groupHave(group, scores)`), `multiclassBlockedBy = multiclassReasons(...)[0]?.className ?? null`.
- [ ] `pnpm test:run lib/utils/characters/classes/__tests__/multiclass.test.ts lib/utils/characters/classes/__tests__/path.test.ts` → PASS; `pnpm test:related lib/utils/characters/classes/multiclass.ts` (сервер `class-level-up` теж зелений).
- [ ] Commit `feat(character-path): multiclassReasons shared by server and UI`.

### Task 2: Додавання класу з причинами (хук + діалог)

**Files:** Modify `lib/hooks/characters/useClassLevelUpForm.ts`, `components/character-profile/ClassLevelUpDialog.tsx`; Create `components/character-profile/MulticlassReasons.tsx`; messages `characterProfile.classLevelUp.{blockedOption,blockedHint}`; Test `components/character-profile/__tests__/ClassLevelUpDialog.test.tsx` (+ нові кейси), `lib/hooks/characters/__tests__/` (новий файл за патерном сусідніх хуків).

**Consumes:** `multiclassReasons`, `MulticlassReason` (Task 1).
**Produces:**
```ts
// useClassLevelUpForm
args: { open, character, onLeveled, onClose, startNew?: boolean }
returns.available: { cls: GameClassData; reasons: MulticlassReason[] }[]
// ClassLevelUpDialog props: + startNew?: boolean
// <MulticlassReasons reasons={MulticlassReason[]} />  (<ul>, рядок "{className}: " + choices `requirement.ability` із RequirementList)
```

Рішення: `reasons` = `character.hero ? multiclassReasons(entries.flatMap(e => byId[e.classId] ?? []), cls, character.hero.scores) : []`. Початковий `choice`: `startNew ? NEW_CLASS : (entries[0]?.classId ?? NEW_CLASS)`. Блокує лише сервер; UI: опція `disabled` з підписом `t("blockedOption", { name })`, а для вибраного (programmatic) класу під селектом `<MulticlassReasons>`; кнопка підтвердження за наявності причин лишається активною (сервер — арбітр), показуємо `blockedHint`.

- [ ] Тести спершу: хук — `startNew` стартує з `NEW_CLASS`; `available[i].reasons` для Wizard при Int 10; без `hero` → `reasons: []`. Діалог — мок `SelectField` у наявному тесті ігнорує `disabled`: розширити мок атрибутом `disabled={o.disabled}`; перевірити, що опція недоступного класу `disabled` і підписана `blockedOption`, доступного — ні; після вибору недоступного класу (fireEvent.change) під селектом видно «Інтелект: потрібно 13, зараз 10» і діалог не падає.
- [ ] Реалізація; `pnpm exec eslint --fix` по змінених; `pnpm test:related components/character-profile/ClassLevelUpDialog.tsx lib/hooks/characters/useClassLevelUpForm.ts` → PASS (`class-level-up-choices.test.tsx` теж).
- [ ] Commit `feat(character-path): multiclass requirement reasons in the add-class dialog`.

### Task 3: Шапка 5e, секції класів, кнопка «+ Новий клас»

**Files:** Create `components/character-profile/path/{ClassesHeader,ClassSection,header}.tsx|ts`; Modify `path/index.ts`, `SkillsTab.tsx`, `ProfileEditor.tsx`, `components/character-profile/LevelUpAction.tsx` (експорт типу `ClassLevelUpProps`); messages `characterProfile.path.{classesSummary,addClass,openPicks,sectionTitle}`; Test `path/__tests__/classes-header.test.tsx`, `path/__tests__/class-section.test.tsx`, `__tests__/skills-tab-map.test.tsx` (+ кейси).

**Consumes:** `classLevels`, `classSectionOpen` (Task 1); `ClassLevelUpDialog` `startNew` (Task 2).
**Produces:**
```ts
// header.ts
export const PATH_HEADER_CLASS = "flex items-center justify-between border-b border-[rgba(230,220,203,.14)] px-4 py-3";
// <ClassesHeader progressions={ClassProgression[]} maxLevel={number} onAddClass?={() => void} />
// <ClassSection progression={ClassProgression} defaultOpen={boolean}>{children}</ClassSection>  (<details>, summary: "{className} · {level} рів.{ · підклас}")
// SkillsTab props: { manage?: boolean; classLevelUp?: ClassLevelUpProps }
```

Рішення: `ClassesHeader` — «Рівень {сума} · A 3 / B 2», `HudPill` «N виборів» якщо сума `open` > 0, кнопка `addClass` лише при `onAddClass` і сума рівнів < `maxLevel`. `SkillsTab`: рендерить `ClassesHeader` над секціями (`onAddClass` лише коли передано `classLevelUp`), кожен клас в `ClassSection defaultOpen={classSectionOpen(list, p)}`; стан діалогу `addingClass`. `ProfileEditor`: винести наявний об'єкт `classLevelUp` у змінну, передати і в `LevelUpAction`, і в `<SkillsTab manage classLevelUp={...} />` (лише коли він визначений). **Перед реалізацією перевірити**, чи `ProfileEditor` доступний не лише DM (`operations/level-up.ts`): кнопку показувати тільки там, де `LevelUpAction` уже показується.

- [ ] Тести спершу: `ClassesHeader` — розклад «Fighter 3 / Wizard 2», сума рівнів, пілюля виборів, кнопка є лише з `onAddClass` і при рівні < max (рівень = max → кнопки нема); `ClassSection` — `open` за `defaultOpen`; `SkillsTab` — 3 класи без відкритих виборів → усі секції згорнуті, 3 класи з відкритим вибором у одного → відкрита лише вона, 1 клас → відкритий; без `classLevelUp` кнопки нема (`queryByRole("button",{name:/Новий клас/})` null), з ним — клік відкриває діалог з вибраним «Новий клас».
- [ ] Реалізація, eslint, `pnpm test:related` по змінених → PASS.
- [ ] Commit `feat(character-path): classes header, collapsible class sections and add-class entry`.

### Task 4: Одна вкладка «Шлях» і HoMM-шапка, whats-new

**Files:** Modify `components/character-profile/CharacterProfile.tsx` (`viewTabs`: прибрати `hasPath`, завжди `t("path")`; прибрати непотрібний параметр і його виклик), перевірити `ProfileEditor.tsx`/`ProfileTabs.tsx` на те саме розгалуження; `components/skill-tree/progression/PointsHeader.tsx` (клас із `path/header.ts`); `lib/onboarding/whats-new.ts` + `messages/{uk,en}/whatsNew.json` запис `2026-10-30-character-path-multiclass` (audience `all`, текст: підсумок за класами, додавання класу з причинами, вкладка героя без класів тепер теж «Шлях»); Test `__tests__/profile-tabs.test.tsx`, `profile-view.test.tsx`, тести whats-new/i18n ключів.

- [ ] Тести спершу: герой без `classProgression` має вкладку «Шлях» (раніше «Навички»); `PointsHeader` не змінив поведінку (наявні тести `skill-tree`); ключі uk/en збігаються.
- [ ] Реалізація; `pnpm test:related components/character-profile/CharacterProfile.tsx components/skill-tree/progression/PointsHeader.tsx lib/onboarding/whats-new.ts`; виправити наявні тести, що очікували «Навички» для героя без класів.
- [ ] Commit `feat(character-path): single Path tab for class and HoMM heroes, whats-new`.

### Task 5: Документація й завершення гілки (контролер)

- [ ] `docs/architecture/characters.md`: «Шлях» → шапка/секції/`multiclassReasons`/кнопка додавання класу/єдина вкладка; `docs/STATUS.md`: рядок «Шлях персонажа (етап 3)», етап 4 лишається відкритим.
- [ ] `/simplify` на diff гілки (1–2 агенти); один фінальний Opus-рев'ю; виправлення за рев'ю.
- [ ] Повний `pnpm test:run`, `pnpm lint`, `pnpm exec tsc --noEmit` — один раз, після перевірки `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`.
- [ ] Живий прогін: Sonnet-субагент, кампанія TEST на локальній `prodcopy`, сценарії зі спеку (два класи, недоступний/доступний клас, гравець без кнопки, HoMM-«Шлях», 390px); тестові дані видалити.
- [ ] Мердж у `main` у тимчасовому worktree (`git branch --show-current` перед мерджем); у merge-коміті `git mv` спеку й план етапу 3 в `docs/archive/superpowers/{specs,plans}/`.
