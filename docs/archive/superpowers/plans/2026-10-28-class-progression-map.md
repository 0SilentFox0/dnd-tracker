# Карта класу Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Єдина «Карта класу» 1–20 (база / підкласи / вибір гравця) для ДМа (сторінка класу), гравця (лист) і level-up.

**Architecture:** Чиста функція `buildClassProgression` проєктує наявні `GameClassData.features/subclasses/choices` і `CharacterClassEntry.choices` у рядки. Презентаційний компонент `ClassProgressionMap` без запитів. Лист отримує `sheet.classProgression` з `build-sheet.ts`. Нових таблиць і міграцій немає.

**Tech Stack:** Next.js 16, React 19, TS strict, Vitest (`happy-dom` для компонентів), `HudPanel`/`HudChipTabs`.

**Spec:** `docs/superpowers/specs/2026-10-28-class-progression-map-design.md`

## Global Constraints

- Нових таблиць/міграцій немає; дані шаблону SRD не змінюємо.
- Компонент не імпортує `@/lib/api/*`; дані й колбеки — props.
- Імпорти через `@/…`, порядок `simple-import-sort`, порожні рядки навколо `const`/`if`/`return` (`pnpm exec eslint --fix`).
- Тексти для користувача українською, ідентифікатори англійською; мінімум коментарів.
- Тести — у сусідніх `__tests__/`; під час роботи `pnpm test:related <файли>`, повний `pnpm test:run` один раз наприкінці.
- Розмірів: `MAX_CLASS_LEVEL = 20`, `DEFAULT_SUBCLASS_LEVEL = 3` (`lib/constants/classes.ts`).

## Review Focus

- Вибір на рівні, що не збігається з рівнем вміння (`choice.level` ≠ `feature.level`): має стояти в рядку `choice.level`. Тест у Task 1.
- Клас без підкласів або `subclassLevel === null`: жодної мітки підкласу й порожніх колонок. Task 1, Task 2.
- Масштабований `count: { scale }` без колонки в класі: `required = 0`, вибір не «висить» як відкритий. Task 1.
- Підклас ще не обраний, рівень ≥ `subclassLevel`: мітка «Оберіть підклас» зі статусом `open`. Task 1.
- Пік-ключ невідомий або від іншого класу (мультиклас): ігнорується, `done` не роздувається. Task 1.

---

### Task 1: `buildClassProgression` (чиста функція)

**Files:**
- Create: `lib/utils/characters/classes/progression.ts`
- Create: `lib/utils/characters/classes/__tests__/progression.test.ts`
- Modify: `lib/utils/characters/classes/index.ts` (додати `export * from "./progression";`)

**Interfaces:**
- Consumes: `GameClassData`, `Subclass`, `CharacterClassEntry` (`@/types/classes`), `Choice`, `ChoiceKind` (`@/types/choices`), `resolveChoiceCount(choice, level, columns)` (`@/lib/utils/characters/choices/count`), `MAX_CLASS_LEVEL`.
- Produces (типи — у `types/classes.ts`, поруч із `ResolvedClassEntry`):

```ts
export interface ProgressionItem { key: string; name: string; summary: string; description?: string }

export interface ProgressionPick {
  key: string;
  kind: ChoiceKind | "subclass";
  label: string;
  required: number;
  done: number | null;
  status: "open" | "done" | "locked" | "template";
}

export interface ProgressionRow {
  level: number;
  state: "reached" | "current" | "next" | "future" | "template";
  base: ProgressionItem[];
  bySubclass: Record<string, ProgressionItem[]>;
  picks: ProgressionPick[];
}

export interface ClassProgression {
  classId: string;
  className: string;
  color: string | null;
  subclasses: { id: string; name: string; chosen: boolean }[];
  subclassLevel: number | null;
  rows: ProgressionRow[];
}

export function buildClassProgression(cls: GameClassData, entry?: CharacterClassEntry): ClassProgression
```

Правила (повний перелік — у спеку, розділ «Чиста функція»); неочевидне:

- `rows` завжди рівно 20; `state`: без `entry` — `template`; інакше `reached`/`current` (`=== entry.level`)/`next` (`=== entry.level + 1`)/`future`.
- `picks` беруться з `cls.features[].choices` + `features[].choices` обраного підкласу (`entry.subclassId`), а без `entry` — з усіх підкласів; рядок = `choice.level`, не `feature.level`. Ключ піка `choice.id`; у режимі ДМа з кількох підкласів дублікати `choice.id` розрізняються префіксом `${subclass.id}:`.
- `required = resolveChoiceCount(choice, choice.level, cls.columns ?? [])`; `done = entry?.choices?.[choice.id]?.length ?? 0`; `status`: `template` без `entry`; `locked`, якщо `choice.level > entry.level`; `done` при `done >= required`; інакше `open`. `required === 0` → пік не додається.
- Мітка підкласу: якщо `cls.subclassLevel !== null && cls.subclasses.length > 0`, у рядок `subclassLevel` додається `{ key: "subclass", kind: "subclass", label: "Підклас", required: 1, done: entry?.subclassId ? 1 : 0 }` зі статусом за тими ж правилами.
- `summary` — перший непорожній рядок опису абілки, до 120 символів; `description` — повний текст (`ability.description`).
- `base` — за `feature.level`, по одному `ProgressionItem` на абілку (`key = ability.id ?? \`${feature.level}:${name}\``).

- [ ] **Step 1: Failing tests** — файл `progression.test.ts` з кейсами: (a) мінімальний клас без підкласів → 20 рядків, `subclasses: []`, жодного `kind: "subclass"`; (b) клас із фічами на 1/3, підкласом на 3 і ASI на 4/8: `entry` рівня 4 → стани `reached…current…next…future`, ASI на 4 `open`, на 8 `locked`, мітка підкласу на 3 `open` без `subclassId`, `done` з `subclassId`; (c) `choice.level` ≠ `feature.level` → пік у рядку `choice.level`; (d) `count: { scale: "x" }` без колонки → пік відсутній; (e) без `entry` → усі `template`, піки всіх підкласів із префіксом; (f) невідомі ключі в `entry.choices` не змінюють `done`; (g) `summary` обрізається до 120 символів. Фікстури будуй літералами `GameClassData` (мінімально потрібні поля, `as GameClassData` дозволено лише для зайвих).
- [ ] **Step 2:** `pnpm test:run lib/utils/characters/classes/__tests__/progression.test.ts` — FAIL (немає модуля).
- [ ] **Step 3:** Реалізувати `progression.ts` і типи в `types/classes.ts`; експорт у `index.ts`.
- [ ] **Step 4:** Той самий тест — PASS; `pnpm exec eslint --fix` по змінених файлах; `pnpm exec tsc --noEmit`.
- [ ] **Step 5:** `git add lib/utils/characters/classes types/classes.ts && git commit -m "feat(classes): buildClassProgression"` (+ attribution).

---

### Task 2: `ClassProgressionMap` (презентація)

**Files:**
- Create: `components/classes/progression/ClassProgressionMap.tsx`
- Create: `components/classes/progression/ProgressionRowView.tsx` (рядок/картка)
- Create: `components/classes/progression/__tests__/ClassProgressionMap.test.tsx` (`// @vitest-environment happy-dom`)
- Create: `components/classes/progression/index.ts`

**Interfaces:**
- Consumes: `ClassProgression`, `ProgressionRow`, `ProgressionPick` (Task 1); `HudPanel`, `HudChipTabs` (`@/components/hud/page`).
- Produces:

```ts
export interface ProgressionActions {
  onOpenLevel?: (level: number, column: "base" | "subclass" | "pick") => void;
  onPick?: (pick: ProgressionPick, level: number) => void;
  onChooseSubclass?: () => void;
}

export function ClassProgressionMap(props: { progression: ClassProgression; mode: "dm" | "sheet"; actions?: ProgressionActions }): JSX.Element
```

Рішення:
- Десктоп (`sm:` і вище): `<table>` — Рівень | База | по колонці на підклас (обраний `chosen` яскравий, решта приглушена; у `template` усі рівноправні) | Вибір. Колір акценту — `progression.color`.
- Мобільний: список карток по рівнях; `HudChipTabs` перемикає, показувати чи колонку якогось підкласу (за замовчуванням обраний, інакше перший). Лише CSS (`hidden sm:block` / `sm:hidden`) — один набір даних, без `matchMedia`.
- `state` рядка відбивається `data-state` + стиль (`current` рамка, `next` мітка «наступний», `future` приглушено). `open`-пік — золотий бейдж «вибір», клікабельний, якщо є `actions.onPick`; мітка підкласу — `onChooseSubclass`.
- Опис абілки (`description`) розкривається нативним `<details>` у клітинці (не акордеон Radix).
- Порожні колонки підкласів не рендеряться, коли `subclasses.length === 0`.

- [ ] **Step 1: Failing tests:** рендер 20 рядків (`getAllByRole("row")` = 21 з заголовком), `data-state` current/next, клік по `open`-піку викликає `onPick(pick, level)`, клік по «Оберіть підклас» — `onChooseSubclass`, у `mode: "dm"` без `actions` кліки нічого не ламають, відсутність колонок підкласів, чіпи підкласів присутні в DOM для мобільного.
- [ ] **Step 2:** `pnpm test:run components/classes/progression` — FAIL.
- [ ] **Step 3:** Реалізація; Props ≤ 7, колбеки згруповані в `actions`.
- [ ] **Step 4:** PASS + eslint + tsc.
- [ ] **Step 5:** Commit `feat(classes): ClassProgressionMap`.

---

### Task 3: Вкладка «Карта» на сторінці класу + підказка про підкласи

**Files:**
- Modify: `components/classes/ClassForm.tsx` (вкладка `"map"` першою; `HudForm` приймає `tab`/`onTabChange` — тримаємо `tab` у `useState`)
- Modify: `components/classes/SubclassesEditor.tsx` (підказка про SRD під полем «Рівень вибору підкласу»)
- Test: `components/classes/__tests__/ClassForm-map.test.tsx` (`happy-dom`; якщо тест-утиліти для `ClassForm` уже є — додати кейс туди)

**Interfaces:**
- Consumes: `buildClassProgression(initial-or-form data)` — `ClassFormData` не має `id`, тому викликати як `buildClassProgression({ id, ...data })` із `gameClass.id`; `ClassProgressionMap` (Task 2).
- Produces: `ClassFormTabId` розширено до `"map" | "basics" | "table" | "features" | "subclasses"`.

Рішення:
- Карта в `mode: "dm"` без `entry`, перераховується `useMemo` від `editor.form.data` (поточні правки видно одразу).
- `actions.onOpenLevel(level, column)`: `column "base"` → таб `features`, `"subclass"` → `subclasses`; після перемикання прокрутити до редактора рівня не потрібно в MVP (тільки перемкнути вкладку).
- Підказка в `SubclassesEditor`: «SRD містить лише один підклас на клас; інші додайте самі».

- [ ] **Step 1: Failing test:** форма відкривається на вкладці «Карта» (є 20 рядків), клік по клітинці бази перемикає на «Вміння за рівнями»; у `SubclassesEditor` є текст підказки.
- [ ] **Step 2:** `pnpm test:run components/classes` — FAIL.
- [ ] **Step 3:** Реалізація.
- [ ] **Step 4:** PASS + eslint + tsc.
- [ ] **Step 5:** Commit `feat(classes): class map tab and subclass hint`.

---

### Task 4: Карта на листі гравця

**Files:**
- Modify: `types/characters.ts` (поруч із `classFeatureDescriptions`, рядок ~255: `classProgression?: ClassProgression[];`)
- Modify: `lib/utils/characters/sheet/build-sheet.ts` (рядок ~151: поряд із `classFeatureDescriptions` — `classProgression: classEntries.flatMap((e) => (e.class ? [buildClassProgression(e.class, e)] : []))`)
- Modify: `components/character-profile/SkillsTab.tsx` (блок «Вміння класу та підкласу» замінити картами; решта вкладки без змін; кампанії без класів лишаються з `ProgressionPanel`)
- Test: `lib/utils/characters/sheet/__tests__/` (наявний тест `build-sheet`, додати кейс), `components/character-profile/__tests__/skills-tab-map.test.tsx`

**Interfaces:**
- Consumes: `buildClassProgression(cls, entry)` — `entry` це `ResolvedClassEntry` (має `classId`, `level`, `subclassId`, `choices`), тож передається як `CharacterClassEntry`.
- Produces: `sheet.classProgression?: ClassProgression[]` (є лише в режимі класів).

Рішення:
- Один `ClassProgressionMap` на запис класу, заголовок — `className`.
- `actions.onPick` / `onChooseSubclass`: наявний `ChoicesDialog` (`components/character-profile/ChoicesDialog.tsx`) для виборів; для підкласу — нічого окремого поза level-up (кнопка «+ рівень» уже відкриває вибір підкласу), тому `onChooseSubclass` не передаємо, а мітка лишається інформаційною. Перед реалізацією прочитати `ChoicesDialog` і `CharacterChoicesTab`, щоб підключити `onPick` без дублювання логіки; якщо діалог відкривається без `choiceId`, відкриваємо його без прокрутки.
- `classFeatureDescriptions` у `sheet` лишається (інші споживачі: перевірити `grep`), але `SkillsTab` більше його не рендерить.
- Дані мапи містять лише те, що лист і так показує (опис фіч класу), нових прав доступу не треба.

- [ ] **Step 1: Failing tests:** (a) `build-sheet` з `classes` дає `classProgression` довжини = кількість класів із `class`, а без класів поля немає; (b) `SkillsTab` з `classProgression` рендерить карту й не рендерить старий блок; без нього — `ProgressionPanel` як раніше.
- [ ] **Step 2:** `pnpm test:related lib/utils/characters/sheet/build-sheet.ts components/character-profile/SkillsTab.tsx` — FAIL.
- [ ] **Step 3:** Реалізація.
- [ ] **Step 4:** PASS + eslint + tsc.
- [ ] **Step 5:** Commit `feat(characters): class progression map on the sheet`.

---

### Task 5: Підсумок рівня в level-up

**Files:**
- Modify: `components/character-profile/ClassLevelUpDialog.tsx`
- Modify: `lib/hooks/characters/useClassLevelUpForm.ts` (віддати `nextRow: ProgressionRow | null` = рядок `nextLevel` з `buildClassProgression(cls, raisedEntry)`; `cls`, `raisedEntry` там уже є)
- Test: наявний тест діалогу/хука (`components/character-profile/__tests__/`, `lib/hooks/characters/__tests__/`) — додати кейс

**Interfaces:**
- Consumes: `buildClassProgression`, `ProgressionRow` (Task 1).
- Produces: у `useClassLevelUpForm` — `nextRow: ProgressionRow | null`.

Рішення: у діалозі над кроками виборів — стислий блок «Що дає рівень N»: назви `base` і обраного підкласу, кількість виборів. Без власного UI карти. Діалог і його логіку вибору не змінюємо.

- [ ] **Step 1: Failing test:** при виборі класу з фічами на наступному рівні діалог показує «Що дає рівень N» з назвами абілок; для рівня без фіч блок не рендериться.
- [ ] **Step 2:** `pnpm test:related components/character-profile/ClassLevelUpDialog.tsx lib/hooks/characters/useClassLevelUpForm.ts` — FAIL.
- [ ] **Step 3:** Реалізація.
- [ ] **Step 4:** PASS + eslint + tsc.
- [ ] **Step 5:** Commit `feat(characters): level-up summary from the class map`.

---

### Task 6: Документація, what's new, перевірка

**Files:**
- Modify: `docs/architecture/battle.md` (розділ «5e: класи й рівні» — абзац «Карта класу»: `buildClassProgression`, три місця вставки)
- Modify: `lib/onboarding/whats-new.ts` (`{ id: "2026-10-28-class-map", date: "2026-10-28", audience: "all", title: "Карта класу", body: "…" }` на початок масиву)
- Modify: `docs/STATUS.md` (рядок «Карта класу»)
- Move: `git mv` спек і цей план у `docs/archive/superpowers/…` у merge-коміті

- [ ] **Step 1:** Оновити документи й `whats-new` (+ хінт на сторінці класу, якщо `lib/onboarding` має реєстр хінтів по екранах — додати запис за аналогією з `dm.units`).
- [ ] **Step 2:** `pnpm test:run` (повний, один раз), `pnpm lint`, `pnpm exec tsc --noEmit`.
- [ ] **Step 3:** Браузер (через Sonnet-субагент, масштабовані скріни, перевірка DOM/текстом): сторінка SRD-класу «Barbarian» на 1440 px і 390 px; лист героя з класом (поточний/наступний/open-вибір); level-up діалог. Фікс знайдених дефектів.
- [ ] **Step 4:** `/simplify` по diff гілки (1–2 агенти), фінальне ревю одним Opus-агентом.
- [ ] **Step 5:** Commit docs; merge/push — лише за явним дозволом користувача.

---

## Self-Review

- **Покриття спеку:** функція — Task 1; компонент — Task 2; ДМ-екран і підказка про підкласи — Task 3; лист і `sheet.classProgression` — Task 4; level-up — Task 5; документація/whats-new/тести/браузер — Task 6.
- **Типи:** `ClassProgression`, `ProgressionRow`, `ProgressionPick`, `ProgressionItem` визначені в Task 1 і лише споживаються далі; `ProgressionActions` — Task 2, споживається в Tasks 3–4.
- **Відхилення від спеку:** `description` лежить на `ProgressionItem` (спек згадував `classFeatureDescriptions` для опису); `classFeatureDescriptions` лишається в `sheet`, але `SkillsTab` його не рендерить. `onChooseSubclass` на листі не передаємо (вибір підкласу робиться через level-up).
