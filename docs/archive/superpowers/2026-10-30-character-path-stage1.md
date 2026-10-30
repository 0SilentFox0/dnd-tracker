# Шлях персонажа, етап 1: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) або superpowers:executing-plans. Кроки з чекбоксами.

**Goal:** лист героя з 5е-класами показує вертикальну стрічку «Шлях» (отримано / зараз / далі), нудж про невибрані заклинання, компактний вибір і компактні картки вмінь у бою.

**Architecture:** нових API, колонок і змін `buildClassProgression` нема. Чистий view-model `lib/utils/characters/classes/path.ts` над наявним `ClassProgression`; новий компонент `CharacterPath` замінює `ClassProgressionMap mode="sheet"` у `SkillsTab`; решта — точкові виправлення.

**Tech Stack:** Next.js 16, React 19, next-intl, Vitest + Testing Library (`// @vitest-environment happy-dom`).

**Spec:** `docs/superpowers/specs/2026-10-30-character-path-stage1-design.md`

## Global Constraints

- Гілка `feat/character-path`, worktree `../dnd-tracker-path`. Не чіпати основну папку.
- Тексти для користувача лише в `messages/{uk,en}/*.json`, у коді кирилиці нема (ESLint). Імпорти `@/...`, з barrel-ів доменних папок.
- Коментарі мінімальні (лише неочевидне «чому»). Без `truncate` і `line-clamp` у `CharacterPath`.
- Перевірки: `pnpm test:related <файли>` і `pnpm exec eslint --fix <змінені файли>`. Ні повного lint, ні повного `test:run` під час роботи (одноразово перед merge).
- Коміт-повідомлення закінчуються рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Іконки feature поки не додаємо (запасний варіант: літера класу через `EntityIcon`).

## Review Focus

- Рівні без features і виборів не дають порожніх карток (кожен клас має такі).
- Мультиклас: два `classProgression` дають дві секції; нудж сумує відкриті заклинання обох.
- Глядач без права редагування (`sheet.choices.canEdit` хибне): нема кнопок вибору й нуджу-кнопки.
- Опис вибору на ~1800 символів не виводиться стіною (згорнутий).
- Рівень 20: нема `next`, група «Зараз» містить лише поточний рівень.
- Локаль `en`: усі нові ключі є.

---

### Task 1: Картка вмінь у бою (баг `block` + іконка)

**Files:**
- Modify: `components/battle/wizards/BonusActionPicker.tsx` (рядок із `line-clamp-2 block`, іконка `size-10`)
- Test: `components/battle/wizards/__tests__/bonus-picker.test.tsx`

**Interfaces:** нічого нового.

- [ ] **Step 1: падаючий тест.** У `bonus-picker.test.tsx` додай тест за наявним патерном рендера: вміння з довгим `description`; опис має клас `line-clamp-2` і **не** має класу `block`; іконка має `shrink-0`.

```tsx
it("clamps a long ability description and keeps the icon from shrinking", () => {
  const desc = screen.getByText(/long description/i);
  expect(desc).toHaveClass("line-clamp-2");
  expect(desc).not.toHaveClass("block");
  expect(desc.closest("button")?.querySelector("svg, img")).toHaveClass("shrink-0");
});
```
(фікстуру довгого опису збери з наявних у файлі; `a.description` має бути довгим рядком).

- [ ] **Step 2:** `pnpm test:run components/battle/wizards/__tests__/bonus-picker.test.tsx -t "clamps"` → FAIL.
- [ ] **Step 3:** у `BonusActionPicker.tsx` заміни `className="line-clamp-2 block text-xs text-[#a89c88]"` на `className="line-clamp-2 text-xs text-[#a89c88]"`, а обидві іконки (`OptimizedImage` і `Zap`) отримують `shrink-0` у `className`.
- [ ] **Step 4:** тест PASS; `pnpm exec eslint --fix` по обох файлах.
- [ ] **Step 5:** commit `fix(battle): ability card description clamps and icon keeps size`.

---

### Task 2: Опис вмінь Channel Divinity у конвертері SRD

**Files:**
- Modify: `scripts/srd/overrides/classes.ts:126-127` (Divine Spark, Turn Undead)
- Modify (згенерований): `data/templates/srd-5.2/classes.json`
- Test: `scripts/srd/__tests__/classes-4f2.test.ts` (або поряд новий `channel-divinity.test.ts`)

**Interfaces:** Consumes: тип override з `scripts/srd/overrides/classes.ts` (перевір, чи приймає поле `description`; якщо тип не має його, додай `description?: string` туди, де визначено цей тип, і переконайся, що `scripts/srd/convert/classes.ts` проносить його в `Ability.description`).

- [ ] **Step 1: падаючий тест.** Збери клас Cleric тим самим шляхом, що й сусідні тести цього файлу, знайди вміння Divine Spark і Turn Undead:

```ts
expect(spark.description).not.toEqual(turn.description);
expect(spark.description!.length).toBeLessThan(700);
expect(turn.description!.length).toBeLessThan(700);
```
- [ ] **Step 2:** запусти файл → FAIL.
- [ ] **Step 3:** додай у два override-об'єкти `description` (тексти з SRD, ті самі, що в самому feature):
  - Divine Spark: `As a Magic action, you point your Holy Symbol at another creature you can see within 30 feet of yourself and focus divine energy at it. Roll 1d8 and add your Wisdom modifier. You either restore Hit Points to the creature equal to that total or force the creature to make a Constitution saving throw. On a failed save, the creature takes Necrotic or Radiant damage (your choice) equal to that total. On a successful save, the creature takes half as much damage (round down). You roll an additional d8 when you reach Cleric levels 7 (2d8), 13 (3d8), and 18 (4d8).`
  - Turn Undead: `As a Magic action, you present your Holy Symbol and censure Undead creatures. Each Undead of your choice within 30 feet of you must make a Wisdom saving throw. If the creature fails its save, it has the Frightened and Incapacitated conditions for 1 minute. For that duration, it tries to move as far from you as it can on its turns. This effect ends early on the creature if it takes any damage, if you have the Incapacitated condition, or if you die.`
- [ ] **Step 4:** `pnpm srd:build`. Перевір `git diff --stat data/templates/srd-5.2/`: має змінитися лише `classes.json`, і лише ці два описи (разом із можливими похідними хешами). Якщо build зачепив багато чужого, відкоти (`git checkout data/`) і замість цього точково пропиши два описи в `classes.json` скриптом (`python3`, як у розвідці), а override залиш для наступних збірок.
- [ ] **Step 5:** тест PASS, `pnpm test:run scripts/srd`; commit `fix(srd): own descriptions for Divine Spark and Turn Undead`.

---

### Task 3: View-model стрічки `path.ts`

**Files:**
- Create: `lib/utils/characters/classes/path.ts`
- Test: `lib/utils/characters/classes/__tests__/path.test.ts` (фікстури з `class-fixtures`)

**Interfaces — Produces:**

```ts
import type { ClassProgression, ProgressionItem, ProgressionRow } from "@/types/classes";

export interface PathRows { reached: ProgressionRow[]; focus: ProgressionRow[]; future: ProgressionRow[] }

export const chosenSubclassId = (p: ClassProgression): string | null;
export const rowItems = (row: ProgressionRow, chosen: string | null): ProgressionItem[];
export function splitPathRows(p: ClassProgression): PathRows;
export function openSpellPicks(list: readonly ClassProgression[] | undefined): number;
```

- `rowItems` = `row.base` + `row.bySubclass[chosen]` (якщо `chosen`).
- `splitPathRows`: пропускає рядки без `rowItems` і без `picks`; `reached` = state `reached`, `focus` = `current|next`, `future` = `future`.
- `openSpellPicks` = сума `required - (done ?? 0)` по всіх `picks` із `kind === "spell"` і `status === "open"`.

- [ ] **Step 1: тести** (за зразком `ClassProgressionMap.test.tsx`, `makeClass`/`makeAbility`, `buildClassProgression(cls, { classId, level })`):
  1. рівні без features і виборів відсутні в усіх трьох групах;
  2. при `level: 4` група `focus` це рівні 4 і 5 (якщо мають вміст), `reached` лише <4;
  3. при `level: 20` `focus` містить тільки 20;
  4. `rowItems` додає лише вибраний підклас;
  5. `openSpellPicks`: вибір `kind: "spell"` `count: 2` без виборів → 2, з одним `{id}` у `entry.choices` → 1; два класи сумуються; `undefined` → 0.
- [ ] **Step 2:** FAIL (модуля нема). **Step 3:** реалізуй за контрактом вище. **Step 4:** PASS + eslint. **Step 5:** commit `feat(characters): path view-model over class progression`.

---

### Task 4: Компонент `CharacterPath` і підключення

**Files:**
- Create: `components/character-profile/path/CharacterPath.tsx`, `components/character-profile/path/PathRowCard.tsx`, `components/character-profile/path/index.ts`
- Modify: `components/character-profile/SkillsTab.tsx` (замість `ClassProgressionMap` рендерити `CharacterPath`)
- Modify: `components/character-profile/CharacterProfile.tsx` (`viewTabs`: підпис «Шлях» для персонажа з `classProgression`)
- Modify: `messages/uk/characterProfile.json`, `messages/en/characterProfile.json` (`tabs.path`, блок `path`)
- Modify: `components/character-profile/__tests__/skills-tab-map.test.tsx` (оновити під нову розмітку)
- Test: `components/character-profile/path/__tests__/character-path.test.tsx`

**Interfaces:**
- Consumes: `splitPathRows`, `rowItems`, `chosenSubclassId` (Task 3); `ProgressionActions` з `@/components/classes/progression`; `ResponsiveDialog`, `EntityIcon`, `HudPill`.
- Produces: `export function CharacterPath(props: { progression: ClassProgression; actions?: { onPick: () => void } })`.

Поведінка:
- Секція «Зараз»: рядки `focus`, розгорнуті. Далі `<details>` «Отримано (N)» з рядками `reached` і `<details>` «Далі (N)» з `future`.
- `PathRowCard`: заголовок «Рівень N» + `HudPill` стану (`current`/`next`/`future`). Items: `EntityIcon` (літера класу), назва, `summary` (повністю, з переносом), чіп `t("from", { cls, level })`, кнопка «i» (`aria-label`), що відкриває `ResponsiveDialog` з `item.description`. Picks: `status === "open"` і `actions` задані → кнопка `t("pick", { label, done, required })`; `done` → «Обрано»; `locked` → текст `t("unlocksAt", { level })`. Вибір підкласу (`kind === "subclass"`) показується текстом (як зараз), без кнопки.
- Вкладка: у `viewTabs` додай аргумент `hasPath`; `label: hasPath ? t("path") : t("skills")`, тип `t: (key: ProfileTabId | "path") => string`. Id вкладки лишається `skills`.
- Ключі `characterProfile.path`: `now`, `reached` («Отримано»), `upcoming` («Далі»), `level`, `from` («← {cls} {level}»), `pick`, `done`, `unlocksAt`, `details`, `close`. Дай обидві локалі.

- [ ] **Step 1: тести** (happy-dom, обгортка intl як у `skills-tab-map.test.tsx`): стани рядків; кнопка вибору є лише з `actions`; без `actions` її нема; чіп «← Cleric 3»; клік на «i» показує `description`; у DOM компонента немає елементів із класом `truncate`.
- [ ] **Step 2:** FAIL. **Step 3:** реалізуй. **Step 4:** онови `skills-tab-map.test.tsx` (перевіряй нові тексти, а не `role="row"`); `pnpm test:related` по змінених файлах — PASS; eslint.
- [ ] **Step 5:** commit `feat(character-profile): path timeline replaces the class table on the sheet`.

---

### Task 5: Нудж «Оберіть N заклинань»

**Files:**
- Create: `components/character-profile/path/SpellPicksNudge.tsx` (експорт з `index.ts`)
- Modify: `components/character-profile/path/CharacterPath.tsx` або `SkillsTab.tsx` (показати над секціями), `components/character-profile/MagicTab.tsx`
- Modify: `messages/{uk,en}/characterProfile.json` (`path.spellNudge`: «Оберіть заклинання: {count}», кнопка `path.spellNudgeAction`)
- Test: `components/character-profile/path/__tests__/spell-picks-nudge.test.tsx`

**Interfaces:**
- Consumes: `openSpellPicks` (Task 3), `useProfile()` (`sheet.classProgression`, `sheet.choices?.canEdit`), `ChoicesDialog` (dynamic, як у `SkillsTab`).
- Produces: `export function SpellPicksNudge(): ReactElement | null` — тримає власний стан діалогу, повертає `null` при `openSpellPicks(...) === 0`; кнопка лише якщо `sheet.choices?.canEdit`.

- [ ] **Step 1: тести:** 0 відкритих → нічого не рендерить; 2 відкриті → текст із 2 і кнопка за `canEdit`; без `canEdit` текст є, кнопки нема; клік відкриває діалог (мок `ChoicesDialog`, як у сусідніх тестах).
- [ ] **Step 2:** FAIL → **Step 3:** реалізація; `SkillsTab` показує нудж над секціями класів, `MagicTab` над книгою → **Step 4:** PASS + eslint → **Step 5:** commit `feat(character-profile): nudge casters to pick spells`.

---

### Task 6: Опис вибору не стіною

**Files:**
- Modify: `components/choices/ChoicePicker.tsx` (рядок із `choice.description && <p className="whitespace-pre-line …">`)
- Modify: `messages/{uk,en}/choices.json` (`picker.moreDetails`)
- Test: `components/choices/__tests__/` (знайди наявний тест `ChoicePicker`; додай до нього)

Рішення: опис довший за 200 символів показується першим абзацом (до першого `\n\n` або 200 символів) і `<details><summary>{t("picker.moreDetails")}</summary>` з повним текстом; короткий опис як зараз.

- [ ] **Step 1: тест:** вибір з описом на 1800 символів: у DOM є `details`, повний текст усередині нього, а видимий абзац ≤ 200 символів; короткий опис без `details`.
- [ ] **Step 2:** FAIL → **Step 3:** реалізація (невеликий локальний компонент `ChoiceDescription` у цьому ж файлі) → **Step 4:** PASS, `pnpm test:related components/choices/ChoicePicker.tsx`, eslint → **Step 5:** commit `fix(choices): collapse long choice descriptions`.

---

### Task 7: Онбординг, документація, фінальні перевірки

**Files:**
- Modify: `lib/onboarding/whats-new.ts` (запис зверху: `{ id: "2026-10-30-character-path", date: "2026-10-30", audience: "all" }`)
- Modify: `messages/{uk,en}/whatsNew.json` (`whatsNew.2026-10-30-character-path.{title,body}`)
- Modify: `docs/architecture/characters.md` (розділ про «Шлях»: компонент, view-model, нудж), `docs/STATUS.md`
- Hint: за правилом онбордингу — короткий hint або стаття про вкладку «Шлях» (за патерном наявних hint-ів у `components/onboarding`).

- [ ] **Step 1:** додай записи, `pnpm test:related lib/onboarding/whats-new.ts` (тест ключів uk/en).
- [ ] **Step 2:** оновити docs.
- [ ] **Step 3 (одноразово, перед merge):** `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`, далі `pnpm test:run`, `pnpm exec tsc --noEmit`, repo-wide `pnpm lint`, `/simplify` по diff.
- [ ] **Step 4:** commit `docs: character path stage 1 (whats-new, architecture, status)`.
- [ ] **Step 5:** живий прохід у браузері (окремий subagent на Sonnet, за секцією спека «Перевірка в браузері»); перед merge в `main` — одна фінальна перевірка Opus.
