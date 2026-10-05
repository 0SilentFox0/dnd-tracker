# Прокачка: таблиця гілок, єдині правила, редактор дерева — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** замінити коло Heroes 5 на таблицю гілок для гравця й таблицю-редактор для DM, звести правила прокачки в одну чисту функцію, яку виконує й сервер (окремі маршрути learn/unlearn/reset), перевести бій/баланс/заклинання на один резолвер і додати анімацію нового рівня.

**Architecture:** чистий рушій `lib/utils/skills/progression/` (normalizeTree → canLearn/canUnlearn → progressionView/rankOffers → resolveLearned, validateTree, редагування JSON) — спільний для сервера й клієнта. Маршрути `…/characters/[cid]/progression[/learn|unlearn|reset|seen-level]` (тонкий `route.ts` + `*-handler.ts`), клієнт `lib/api/character-progression.ts` → хуки `lib/hooks/skills/` → компоненти `components/skill-tree/progression/` і `components/skill-tree/editor/`. Формат JSON дерева й прогресу не змінюється; єдина міграція — `characters.seenLevel`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Prisma 6 (PostgreSQL), TanStack Query, Zod, Vitest (+ happy-dom), Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-06-skill-progression-design.md` (читати разом із планом). Макети: `.superpowers/brainstorm/23678-1791239462/content/{player-table,dm-table,level-up-fx}.html` (локально, не в git).

## Global Constraints

- Пакетний менеджер `pnpm`; імпорти через `@/`; порядок імпортів — `simple-import-sort` (`pnpm lint --fix`); порожній рядок навколо `const`/`if`/`return`/блоків.
- Компоненти й сторінки **не** імпортують `@/lib/api/*`; запити — `lib/api/<domain>`, логіка/мутації — хуки `lib/hooks/<domain>` (імпорт через барел, всередині домену — відносні шляхи), чисті обчислення — `lib/utils/<domain>` з тестами в сусідньому `__tests__/`.
- Діалоги — лише `ResponsiveDialog` (кнопки у `footer`); підтвердження/повідомлення — `useConfirm()`/`useNotify()`; стани — `components/common/states`; кнопки форм — `ActionBar`.
- Форма, заповнена із запиту, заповнюється **один раз** на ключ; тест — зі **зміненим** знімком сервера + `waitFor`, перевірка мутантом без захисту.
- Egress Supabase — жорстке обмеження: спільні ключі кешу, без зайвих рефетчів, `setQueryData` після мутацій.
- Мінімум коментарів (лише «чому»); документація й тексти UI — українською; ідентифікатори — англійською; слово «шкода», не «урон».
- Тести UI: Vitest без globals → `afterEach(cleanup)`; `// @vitest-environment happy-dom` зверху; шрифти мокати `vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }))`; рендер із `ConfirmProvider` через `components/ui/__tests__/render-with-confirm.tsx`.
- Міграції expand-only; `seenLevel` — `ALTER TABLE "characters" ADD COLUMN "seenLevel" INTEGER;` (RLS на таблиці вже є).
- Комітити лише свої файли поіменно; `components/races/CreateRaceDialog.tsx` має чужі незакомічені зміни — **не чіпати й не комітити** (Task 19 правка `RaceFormFields.tsx` — інший файл). Кожен коміт закінчується рядком `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Id вузлів незмінні: `${branchId}_${level}_level`, `racial_${level}_racial`, id скіла бібліотеки для слотів і ультимейта. Ключ прогресу — **id рядка `skill_trees`**, читання з фолбеком на `skills.id` з JSON.
- Тексти причин (`LEARN_BLOCK_TEXT`) і міток — дослівно з Task 3 / Task 15.

## Review Focus

1. **Старий збережений прогрес під JSON id дерева** (`mock-<race>-<campaign>` ≠ id рядка) — гравець має бачити свої вивчені вузли, а перше `learn` переносить їх під id рядка, не губить. Тест — Task 2 (`readUnlocked`/`writeUnlocked`) і Task 10 (`learn` з прогресом під JSON id).
2. **Дерево з мок-плейсхолдерами** (`attack_basic_circle3_skill0`, `Ельф_ultimate`) — плейсхолдери не стають вузлами, гравцю не пропонуються, у бою не шукаються. Тест — Task 2.
3. **Подвійний тап «Вивчити»** — друга відповідь 409 або 422 `alreadyLearned`, прогрес не дублюється, UI не показує помилку як збій. Тест — Task 10 (`updateMany` з `count: 0` → 409) і Task 13 (409 → refetch + повідомлення).
4. **Персонаж без дерева раси / раса змінилась** — профіль показує `EmptyState`, бій і баланс не падають, вивчене під іншим деревом не діє. Тест — Task 9 (GET без дерева), Task 6 (`resolveCharacterSkillEntries` без дерева → лише `personalSkillId`).
5. **DM прибрав гілку з вивченими вузлами** — вузли стають сиротами: не рахуються в очки (гравець отримує очко назад), не діють у бою, DM бачить «Застарілі вузли» й може прибрати. Тест — Task 4 (`progressionView.orphans`, `points`), Task 3 (`canUnlearn` сироти → ok).

---

## Карта файлів

**Створюються**

| Файл | Відповідальність |
|---|---|
| `lib/utils/skills/progression/types.ts` | типи вузлів, рівнів, кіл, причин; константи |
| `lib/utils/skills/progression/ids.ts` | формати id вузлів, `isPlaceholderSkillId` |
| `lib/utils/skills/progression/tree-json.ts` | `RawTree` + `readTreeJson`, `buildTreeJson`, `stripTreeForClient` |
| `lib/utils/skills/progression/normalize.ts` | `normalizeTree` |
| `lib/utils/skills/progression/progress.ts` | `readUnlocked`, `writeUnlocked`, `learnedInTree` |
| `lib/utils/skills/progression/rules.ts` | `canLearn`, `canUnlearn`, `LEARN_BLOCK_TEXT` |
| `lib/utils/skills/progression/view.ts` | `progressionView`, `rankOffers` |
| `lib/utils/skills/progression/resolve.ts` | `resolveLearned`, `branchLevels` |
| `lib/utils/skills/progression/validate.ts` | `validateTree` |
| `lib/utils/skills/progression/edit.ts` | чисте редагування `RawTree` для DM |
| `lib/utils/skills/progression/index.ts` | барел |
| `lib/utils/characters/seen-level.ts` | `seenLevelOnLevelChange` |
| `app/api/campaigns/[id]/characters/[characterId]/progression/{route.ts,get-progression-handler.ts,load-progression-context.ts}` | GET прогресу |
| `…/progression/{learn,unlearn,reset,seen-level}/route.ts` + `…/progression/progression-action-handler.ts` | дії |
| `prisma/migrations/20261009000000_character_seen_level/migration.sql` | `seenLevel` |
| `lib/api/character-progression.ts` | клієнтські запити |
| `lib/hooks/skills/{useCharacterProgression,useProgressionActions,useCharacterLearnedSpellIds,useLevelUpCelebration,useSkillTreeEditor}.ts` | хуки |
| `components/hud/{fonts.ts,hud.css,index.ts}` | спільна HUD-мова (перенос із `components/battle/hud`) |
| `components/skill-tree/progression/*` | панель гравця, шторка, пропозиції, оверлей рівня |
| `components/skill-tree/editor/*` | редактор DM |

**Змінюються (основне)**: `types/abilities.ts`, `lib/utils/abilities/build/{resolve,collect}.ts`, `lib/utils/battle/participant/{extract-skills,from-character,from-character-learned-spells}.ts`, `lib/utils/spells/{spell-learning-from-tree,index}.ts`, `lib/utils/battle/balance/{dpr,stats}.ts`, `app/api/campaigns/[id]/battles/balance/{balance-get,balance-post,balance-helpers}.ts`, `app/api/campaigns/[id]/characters/[characterId]/{route,update-character-schema,build-character-update-data}.ts`, `…/level-up/route.ts`, `app/api/campaigns/[id]/skill-trees/[treeId]/route.ts`, `lib/hooks/characters/{useCharacterView,useDamageCalculator,useDamageCalculator-skills}.ts`, `components/characters/{artifacts/CharacterSpellbook,artifacts/CharacterArtifactsSection,stats/CharacterDamageCalculator}.tsx`, сторінки профілю й DM, `scripts/{simulate-battle,seed-mock-battle-data,setup-battle-test-3v5}.ts`, `prisma/schema.prisma`.

**Видаляються**: `components/skill-tree/{core,elements,ui,utils}/*`, `components/characters/abilities/CharacterSkillTreeView.tsx`, `lib/hooks/skills/{useSkillTreePage*,useSkillTreeAssignment,useSkillTreeClear,useSkillTreeEnrichment,useSkillTreeFilters,useSkillTreeSave}.ts`, `lib/hooks/characters/{useLearnedSpellIds,useDamageCalculator-helpers}.ts`, `lib/utils/skills/{skill-tree-mock,skill-tree-positions}.ts`, `lib/types/{skill-tree,main-skills}.ts`, стилі кола в `app/globals.css`.

---

### Task 1: Спільний HUD-модуль `components/hud`

**Files:**
- Create: `components/hud/fonts.ts` (перенос `components/battle/hud/fonts.ts`), `components/hud/hud.css`, `components/hud/index.ts`
- Modify: `components/battle/hud/battle-hud.css`, `components/battle/hud/index.ts`, усі імпорти `battle/hud/fonts` і `vi.mock("@/components/battle/hud/fonts"…)` у тестах, `app/campaigns/[id]/battles/[battleId]/{BattlePageClient,loading}.tsx`

**Interfaces:**
- Produces: `import { HUD_SURFACE, hudFontClassName } from "@/components/hud"`; CSS-класи `.hud-surface`, `.hud-sc`, `.hud-book`, `.metal-{iron,bronze,silver,gold,mithril,platinum}`, `.metal-fill`, `@keyframes hud-*` з `@/components/hud/hud.css`.

- [ ] **Step 1: Перенести шрифти**

```bash
mkdir -p components/hud
git mv components/battle/hud/fonts.ts components/hud/fonts.ts
```

`components/hud/index.ts`:

```ts
export { HUD_SURFACE, hudFontClassName } from "./fonts";
```

`components/battle/hud/index.ts`: рядок `export { HUD_SURFACE, hudFontClassName } from "./fonts";` замінити на `export { HUD_SURFACE, hudFontClassName } from "@/components/hud";`.

- [ ] **Step 2: Розділити CSS**

`components/hud/hud.css` отримує з `battle-hud.css` блоки: змінні `.hud-surface` (селектор лише `.hud-surface`), `.hud-sc`, `.hud-book`, усі `.metal-*`, `.metal-fill`, `.metal-platinum.metal-fill`, усі `@keyframes hud-*`. У `battle-hud.css` лишаються `.battle-hud` (змінні — селектор `.battle-hud` з тим самим набором змінних, що й `.hud-surface`), фон, `::before`, `> :not(.fixed)` і все, чого немає в списку вище; першим рядком `@import "../../hud/hud.css";`.

- [ ] **Step 3: Оновити імпорти**

```bash
grep -rln "battle/hud/fonts" app components lib | xargs sed -i '' 's#@/components/battle/hud/fonts#@/components/hud/fonts#g'
grep -rn "from \"./fonts\"\|from \"../hud/fonts\"" components/battle
```

Кожен знайдений відносний імпорт `./fonts` / `../hud/fonts` у `components/battle/**` замінити на `@/components/hud/fonts`.

- [ ] **Step 4: Перевірити**

Run: `pnpm test:run components/battle lib/hooks/battle && pnpm lint`
Expected: PASS, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add components/hud components/battle app/campaigns/\[id\]/battles lib
git commit -m "refactor(hud): shared HUD fonts and metals in components/hud

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Рушій — типи, id, JSON дерева, `normalizeTree`, прогрес

**Files:**
- Create: `lib/utils/skills/progression/{types,ids,tree-json,normalize,progress,index}.ts`
- Test: `lib/utils/skills/progression/__tests__/normalize.test.ts`, `…/__tests__/progress.test.ts`, `…/__tests__/fixtures.ts`

**Interfaces:**
- Produces (усе реекспортується з `@/lib/utils/skills/progression`):

```ts
export type BranchLevel = "basic" | "advanced" | "expert";
export const BRANCH_LEVELS: readonly BranchLevel[];
export type Circle = "outer" | "middle" | "inner";
export const CIRCLES: readonly Circle[];
export const CIRCLE_SIZE: Record<Circle, number>;           // 3 / 2 / 1
export const RACIAL_BRANCH_ID = "racial";
export const ULTIMATE_BRANCH_ID = "ultimate";
export const RACIAL_MIN_LEVEL: Record<BranchLevel, number>; // 5 / 10 / 15
export const BRANCH_LEVEL_LABEL: Record<BranchLevel, string>; // Основи / Просунутий / Експерт
export type ProgressionNode = BranchLevelNode | RacialNode | SlotNode | UltimateNode;
export interface TreeBranch { id: string; name: string; color: string; icon: string | null; spellGroupId: string | null }
export interface TreeNodes { treeId: string; jsonId: string | null; race: string; branches: TreeBranch[]; nodes: Map<string, ProgressionNode>; grid: Map<string, Record<Circle, (string | null)[]>>; ultimateId: string | null }
export interface RawTree { id?: string; race?: string; mainSkills: RawBranch[]; ultimateSkill?: RawSlot | null; [key: string]: unknown }
export function branchLevelNodeId(branchId: string, level: BranchLevel): string;
export function racialNodeId(level: BranchLevel): string;
export function isPlaceholderSkillId(id: unknown): boolean;
export function readTreeJson(skills: unknown): RawTree;
export function buildTreeJson(input: BuildTreeInput): RawTree;
export function normalizeTree(row: { id: string; race?: string; skills: unknown }): TreeNodes;
export function readUnlocked(tree: TreeNodes, progress: unknown): string[];
export function writeUnlocked(tree: TreeNodes, progress: unknown, unlocked: string[]): SkillTreeProgress;
export function learnedInTree(tree: TreeNodes, unlocked: string[]): string[];
```

- [ ] **Step 1: Написати фікстуру й тести, що падають**

`lib/utils/skills/progression/__tests__/fixtures.ts`:

```ts
import { buildTreeJson, normalizeTree } from "..";

export const RAW = buildTreeJson({
  id: "json-tree",
  race: "Ельф",
  branches: [
    { id: "attack", name: "Напад", color: "red", levels: { basic: "atk-b", advanced: "atk-a", expert: "atk-e" }, outer: ["o1", "o2", "o3"], middle: ["m1", "m2"], inner: ["i1"] },
    { id: "defense", name: "Захист", color: "blue", levels: { basic: "def-b" }, outer: ["d-o1", "d-o2"], middle: ["d-m1"], inner: ["d-i1"] },
    { id: "light", name: "Світло", color: "gold", spellGroupId: "sg-light", outer: ["l-o1"], middle: [], inner: ["l-i1"] },
    { id: "chaos", name: "Хаос", color: "purple", outer: ["c-o1"], middle: ["c-m1"], inner: ["c-i1"] },
  ],
  racial: { basic: "r-b", advanced: "r-a" },
  ultimate: "ult",
});

export const TREE = normalizeTree({ id: "row-tree", race: "Ельф", skills: RAW });

export const lvl = (branch: string, level: "basic" | "advanced" | "expert") => `${branch}_${level}_level`;
```

`lib/utils/skills/progression/__tests__/normalize.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { normalizeTree } from "..";
import { lvl, RAW, TREE } from "./fixtures";

describe("normalizeTree", () => {
  it("гілки в порядку JSON без псевдогілок", () => {
    expect(TREE.branches.map((b) => b.id)).toEqual(["attack", "defense", "light", "chaos"]);
    expect(TREE.branches[2].spellGroupId).toBe("sg-light");
  });

  it("3 рівні кожної гілки існують завжди, skillId з levelSkillIds або null", () => {
    expect(TREE.nodes.get(lvl("attack", "expert"))).toMatchObject({ kind: "branchLevel", branchId: "attack", level: "expert", skillId: "atk-e" });
    expect(TREE.nodes.get(lvl("light", "basic"))).toMatchObject({ kind: "branchLevel", skillId: null });
  });

  it("слоти з basic.circle3/2/1 → outer/middle/inner, id вузла = id скіла", () => {
    expect(TREE.nodes.get("o2")).toEqual({ kind: "slot", nodeId: "o2", branchId: "attack", circle: "outer", index: 1, skillId: "o2" });
    expect(TREE.grid.get("defense")).toEqual({ outer: ["d-o1", "d-o2", null], middle: ["d-m1", null], inner: ["d-i1"] });
  });

  it("расові 3 рівні і ультимейт", () => {
    expect(TREE.nodes.get("racial_basic_racial")).toMatchObject({ kind: "racial", level: "basic", skillId: "r-b" });
    expect(TREE.nodes.get("racial_expert_racial")).toMatchObject({ kind: "racial", level: "expert", skillId: null });
    expect(TREE.ultimateId).toBe("ult");
    expect(TREE.nodes.get("ult")).toMatchObject({ kind: "ultimate" });
  });

  it("id рядка — treeId, id з JSON — jsonId", () => {
    expect(TREE.treeId).toBe("row-tree");
    expect(TREE.jsonId).toBe("json-tree");
  });

  it("мок-плейсхолдери не стають вузлами", () => {
    const raw = {
      ...RAW,
      mainSkills: [{ id: "attack", name: "Напад", color: "red", levels: { basic: { circle3: [{ id: "attack_basic_circle3_skill0" }, { id: "placeholder_x" }, { id: "" }], circle2: [], circle1: [] } } }],
      ultimateSkill: { id: "Ельф_ultimate" },
    };

    const tree = normalizeTree({ id: "t", skills: raw });

    expect(tree.grid.get("attack")?.outer).toEqual([null, null, null]);
    expect(tree.ultimateId).toBeNull();
  });

  it("дубль скіла: перше входження виграє, друге — порожня клітинка", () => {
    const raw = { ...RAW, mainSkills: [...RAW.mainSkills, { id: "dup", name: "Дубль", color: "x", levels: { basic: { circle3: [{ id: "o1" }], circle2: [], circle1: [] } } }] };

    const tree = normalizeTree({ id: "t", skills: raw });

    expect(tree.nodes.get("o1")).toMatchObject({ branchId: "attack" });
    expect(tree.grid.get("dup")?.outer).toEqual([null, null, null]);
  });

  it("сміття замість JSON → порожнє дерево з расовими вузлами", () => {
    const tree = normalizeTree({ id: "t", skills: null });

    expect(tree.branches).toEqual([]);
    expect(tree.nodes.has("racial_basic_racial")).toBe(true);
  });
});
```

`lib/utils/skills/progression/__tests__/progress.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { learnedInTree, readUnlocked, writeUnlocked } from "..";
import { TREE } from "./fixtures";

describe("progress", () => {
  it("читає під id рядка", () => {
    expect(readUnlocked(TREE, { "row-tree": { unlockedSkills: ["o1"] } })).toEqual(["o1"]);
  });

  it("фолбек на JSON id, якщо під id рядка нічого", () => {
    expect(readUnlocked(TREE, { "json-tree": { unlockedSkills: ["o1", "o1", 5] } })).toEqual(["o1"]);
  });

  it("ігнорує інші ключі (старий формат mainSkillId)", () => {
    expect(readUnlocked(TREE, { attack: { unlockedSkills: ["o1"] } })).toEqual([]);
  });

  it("пише під id рядка, прибирає ключ JSON id, інші ключі не чіпає", () => {
    const next = writeUnlocked(TREE, { "json-tree": { level: "basic", unlockedSkills: ["o1"] }, other: { unlockedSkills: ["x"] } }, ["o1", "o2"]);

    expect(next).toEqual({ "row-tree": { level: "basic", unlockedSkills: ["o1", "o2"] }, other: { unlockedSkills: ["x"] } });
  });

  it("learnedInTree відкидає сирот", () => {
    expect(learnedInTree(TREE, ["o1", "gone"])).toEqual(["o1"]);
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/utils/skills/progression`
Expected: FAIL (`Cannot find module '..'`).

- [ ] **Step 3: Реалізація**

`types.ts`:

```ts
export type BranchLevel = "basic" | "advanced" | "expert";

export const BRANCH_LEVELS: readonly BranchLevel[] = ["basic", "advanced", "expert"];

export const BRANCH_LEVEL_LABEL: Record<BranchLevel, string> = { basic: "Основи", advanced: "Просунутий", expert: "Експерт" };

export type Circle = "outer" | "middle" | "inner";

export const CIRCLES: readonly Circle[] = ["outer", "middle", "inner"];

export const CIRCLE_SIZE: Record<Circle, number> = { outer: 3, middle: 2, inner: 1 };

export const CIRCLE_LABEL: Record<Circle, string> = { outer: "зовнішнє коло", middle: "середнє коло", inner: "внутрішнє коло" };

export const RACIAL_BRANCH_ID = "racial";

export const ULTIMATE_BRANCH_ID = "ultimate";

export const RACIAL_MIN_LEVEL: Record<BranchLevel, number> = { basic: 5, advanced: 10, expert: 15 };

export interface BranchLevelNode { kind: "branchLevel"; nodeId: string; branchId: string; level: BranchLevel; skillId: string | null }

export interface RacialNode { kind: "racial"; nodeId: string; level: BranchLevel; skillId: string | null }

export interface SlotNode { kind: "slot"; nodeId: string; branchId: string; circle: Circle; index: number; skillId: string }

export interface UltimateNode { kind: "ultimate"; nodeId: string; skillId: string }

export type ProgressionNode = BranchLevelNode | RacialNode | SlotNode | UltimateNode;

export interface TreeBranch { id: string; name: string; color: string; icon: string | null; spellGroupId: string | null }

export type BranchGrid = Record<Circle, (string | null)[]>;

export interface TreeNodes {
  treeId: string;
  jsonId: string | null;
  race: string;
  branches: TreeBranch[];
  nodes: Map<string, ProgressionNode>;
  grid: Map<string, BranchGrid>;
  ultimateId: string | null;
}

export type LearnBlockReason = "noPoints" | "alreadyLearned" | "notInTree" | "branchOrder" | "outerLimit" | "needOuter" | "needMiddleAndExpert" | "racialLevel" | "needInner";

export type UnlearnBlockReason = "notLearned" | "hasDependents";

export type Check<R> = { ok: true } | { ok: false; reason: R };
```

`ids.ts`:

```ts
import type { BranchLevel } from "./types";

export const branchLevelNodeId = (branchId: string, level: BranchLevel) => `${branchId}_${level}_level`;

export const racialNodeId = (level: BranchLevel) => `racial_${level}_racial`;

// мок-генератор дерев писав такі id у порожні слоти й ультимейт
const PLACEHOLDER_RE = /^placeholder_|_circle[123]_skill\d+$|_ultimate$/;

export function isPlaceholderSkillId(id: unknown): boolean {
  return typeof id !== "string" || id.trim() === "" || PLACEHOLDER_RE.test(id);
}

export function realSkillId(id: unknown): string | null {
  return isPlaceholderSkillId(id) ? null : (id as string);
}
```

`tree-json.ts`:

```ts
import { RACIAL_BRANCH_ID } from "./types";
import type { BranchLevel, Circle } from "./types";

export interface RawSlot { id: string; name?: string; description?: string; icon?: string }

type RawCircles = { circle1?: RawSlot[]; circle2?: RawSlot[]; circle3?: RawSlot[] };

export interface RawBranch {
  id: string;
  name: string;
  color: string;
  icon?: string;
  spellGroupId?: string;
  levelSkillIds?: Partial<Record<BranchLevel, string>>;
  levelIcons?: Partial<Record<BranchLevel, string>>;
  levels?: Partial<Record<BranchLevel, RawCircles>>;
  [key: string]: unknown;
}

export interface RawTree { id?: string; race?: string; mainSkills: RawBranch[]; ultimateSkill?: RawSlot | null; [key: string]: unknown }

export const CIRCLE_KEY: Record<Circle, keyof RawCircles> = { outer: "circle3", middle: "circle2", inner: "circle1" };

export function readTreeJson(skills: unknown): RawTree {
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) return { mainSkills: [] };

  const obj = skills as Record<string, unknown>;

  const mainSkills = Array.isArray(obj.mainSkills)
    ? (obj.mainSkills as unknown[]).filter((b): b is RawBranch => !!b && typeof b === "object" && typeof (b as RawBranch).id === "string")
    : [];

  return { ...obj, mainSkills } as RawTree;
}

export interface BuildTreeInput {
  id?: string;
  race: string;
  branches: Array<{
    id: string;
    name: string;
    color: string;
    icon?: string;
    spellGroupId?: string;
    levels?: Partial<Record<BranchLevel, string>>;
    outer?: string[];
    middle?: string[];
    inner?: string[];
  }>;
  racial?: Partial<Record<BranchLevel, string>>;
  ultimate?: string;
}

const slots = (ids: string[] = []): RawSlot[] => ids.map((id) => ({ id }));

const emptyCircles = (): RawCircles => ({ circle1: [], circle2: [], circle3: [] });

export function buildTreeJson(input: BuildTreeInput): RawTree {
  const branches: RawBranch[] = input.branches.map((b) => ({
    id: b.id,
    name: b.name,
    color: b.color,
    ...(b.icon && { icon: b.icon }),
    ...(b.spellGroupId && { spellGroupId: b.spellGroupId }),
    levelSkillIds: { ...b.levels },
    levels: {
      basic: { circle3: slots(b.outer), circle2: slots(b.middle), circle1: slots(b.inner) },
      advanced: emptyCircles(),
      expert: emptyCircles(),
    },
  }));

  branches.push({ id: RACIAL_BRANCH_ID, name: "Раса", color: "gainsboro", levelSkillIds: { ...input.racial }, levels: {} });

  return {
    ...(input.id && { id: input.id }),
    race: input.race,
    mainSkills: branches,
    ultimateSkill: input.ultimate ? { id: input.ultimate } : null,
  };
}

/** JSON для клієнта без назв/описів у слотах — вони приходять окремою мапою скілів. */
export function stripTreeForClient(raw: RawTree): RawTree {
  const strip = (list?: RawSlot[]) => list?.map((s) => ({ id: s.id }));

  return {
    ...raw,
    mainSkills: raw.mainSkills.map((b) => ({
      ...b,
      levels: b.levels && {
        basic: b.levels.basic && { circle1: strip(b.levels.basic.circle1), circle2: strip(b.levels.basic.circle2), circle3: strip(b.levels.basic.circle3) },
      },
    })),
    ultimateSkill: raw.ultimateSkill ? { id: raw.ultimateSkill.id } : null,
  };
}
```

`normalize.ts`:

```ts
import { branchLevelNodeId, racialNodeId, realSkillId } from "./ids";
import { CIRCLE_KEY, readTreeJson } from "./tree-json";
import { BRANCH_LEVELS, CIRCLE_SIZE, CIRCLES, RACIAL_BRANCH_ID, ULTIMATE_BRANCH_ID } from "./types";
import type { BranchGrid, ProgressionNode, TreeBranch, TreeNodes } from "./types";

export function normalizeTree(row: { id: string; race?: string; skills: unknown }): TreeNodes {
  const raw = readTreeJson(row.skills);

  const nodes = new Map<string, ProgressionNode>();

  const grid = new Map<string, BranchGrid>();

  const branches: TreeBranch[] = [];

  const racial = raw.mainSkills.find((b) => b.id === RACIAL_BRANCH_ID);

  for (const level of BRANCH_LEVELS) {
    const nodeId = racialNodeId(level);

    nodes.set(nodeId, { kind: "racial", nodeId, level, skillId: realSkillId(racial?.levelSkillIds?.[level]) });
  }

  for (const b of raw.mainSkills) {
    if (b.id === RACIAL_BRANCH_ID || b.id === ULTIMATE_BRANCH_ID || grid.has(b.id)) continue;

    branches.push({ id: b.id, name: b.name ?? b.id, color: b.color ?? "gray", icon: b.icon ?? null, spellGroupId: b.spellGroupId ?? null });

    for (const level of BRANCH_LEVELS) {
      const nodeId = branchLevelNodeId(b.id, level);

      nodes.set(nodeId, { kind: "branchLevel", nodeId, branchId: b.id, level, skillId: realSkillId(b.levelSkillIds?.[level]) });
    }

    const cells: BranchGrid = { outer: [], middle: [], inner: [] };

    for (const circle of CIRCLES) {
      const list = b.levels?.basic?.[CIRCLE_KEY[circle]] ?? [];

      for (let index = 0; index < CIRCLE_SIZE[circle]; index++) {
        const id = realSkillId(list[index]?.id);

        if (id && !nodes.has(id)) {
          nodes.set(id, { kind: "slot", nodeId: id, branchId: b.id, circle, index, skillId: id });
          cells[circle].push(id);
        } else {
          cells[circle].push(null);
        }
      }
    }

    grid.set(b.id, cells);
  }

  const ultimateId = realSkillId(raw.ultimateSkill?.id);

  if (ultimateId && !nodes.has(ultimateId)) nodes.set(ultimateId, { kind: "ultimate", nodeId: ultimateId, skillId: ultimateId });

  return {
    treeId: row.id,
    jsonId: typeof raw.id === "string" ? raw.id : null,
    race: row.race ?? (typeof raw.race === "string" ? raw.race : ""),
    branches,
    nodes,
    grid,
    ultimateId: ultimateId && nodes.get(ultimateId)?.kind === "ultimate" ? ultimateId : null,
  };
}
```

`progress.ts`:

```ts
import type { SkillTreeProgress } from "@/lib/schemas/prisma-json";

import type { TreeNodes } from "./types";

type Entry = { level?: "basic" | "advanced" | "expert"; unlockedSkills?: string[] };

function entryOf(progress: unknown, key: string | null): Entry | undefined {
  if (!key || !progress || typeof progress !== "object") return undefined;

  const value = (progress as Record<string, unknown>)[key];

  return value && typeof value === "object" ? (value as Entry) : undefined;
}

function ids(entry: Entry | undefined): string[] {
  const list = Array.isArray(entry?.unlockedSkills) ? entry.unlockedSkills : [];

  return [...new Set(list.filter((id): id is string => typeof id === "string" && id !== ""))];
}

export function readUnlocked(tree: TreeNodes, progress: unknown): string[] {
  const own = ids(entryOf(progress, tree.treeId));

  return own.length > 0 ? own : ids(entryOf(progress, tree.jsonId));
}

export function writeUnlocked(tree: TreeNodes, progress: unknown, unlocked: string[]): SkillTreeProgress {
  const base = progress && typeof progress === "object" ? { ...(progress as SkillTreeProgress) } : {};

  const previous = entryOf(progress, tree.treeId) ?? entryOf(progress, tree.jsonId) ?? {};

  if (tree.jsonId && tree.jsonId !== tree.treeId) delete base[tree.jsonId];

  base[tree.treeId] = { ...previous, unlockedSkills: unlocked };

  return base;
}

export function learnedInTree(tree: TreeNodes, unlocked: string[]): string[] {
  return unlocked.filter((id) => tree.nodes.has(id));
}
```

`index.ts`:

```ts
export * from "./ids";
export * from "./normalize";
export * from "./progress";
export * from "./tree-json";
export * from "./types";
```

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run lib/utils/skills/progression`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/skills/progression
git commit -m "feat(progression): tree normalization, node ids and progress read/write

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Правила `canLearn` / `canUnlearn`

**Files:**
- Create: `lib/utils/skills/progression/rules.ts` (+ реекспорт в `index.ts`)
- Test: `lib/utils/skills/progression/__tests__/rules.test.ts`

**Interfaces:**
- Consumes: `TreeNodes`, `branchLevelNodeId`, `racialNodeId`, константи з Task 2.
- Produces:

```ts
export const LEARN_BLOCK_TEXT: Record<LearnBlockReason, string>;
export const UNLEARN_BLOCK_TEXT: Record<UnlearnBlockReason, string>;
export function canLearn(tree: TreeNodes, unlocked: string[], characterLevel: number, nodeId: string): Check<LearnBlockReason>;
export function canUnlearn(tree: TreeNodes, unlocked: string[], nodeId: string): Check<UnlearnBlockReason>;
```

- [ ] **Step 1: Тести, що падають**

```ts
import { describe, expect, it } from "vitest";

import { canLearn, canUnlearn } from "..";
import { lvl, TREE } from "./fixtures";

const learn = (unlocked: string[], nodeId: string, level = 20) => canLearn(TREE, unlocked, level, nodeId);

const ATTACK_ALL = [lvl("attack", "basic"), lvl("attack", "advanced"), lvl("attack", "expert")];

describe("canLearn", () => {
  it("noPoints: вивчено стільки, скільки рівень (сироти не рахуються)", () => {
    expect(learn([lvl("attack", "basic")], lvl("defense", "basic"), 1)).toEqual({ ok: false, reason: "noPoints" });
    expect(learn([lvl("attack", "basic"), "gone"], lvl("defense", "basic"), 2)).toEqual({ ok: true });
  });

  it("alreadyLearned і notInTree", () => {
    expect(learn([lvl("attack", "basic")], lvl("attack", "basic"))).toEqual({ ok: false, reason: "alreadyLearned" });
    expect(learn([], "nope")).toEqual({ ok: false, reason: "notInTree" });
  });

  it("рівні гілки строго по порядку; рівень без скіла вчиться", () => {
    expect(learn([], lvl("attack", "advanced"))).toEqual({ ok: false, reason: "branchOrder" });
    expect(learn([lvl("attack", "basic")], lvl("attack", "advanced"))).toEqual({ ok: true });
    expect(learn([], lvl("light", "basic"))).toEqual({ ok: true });
  });

  it("outerLimit: зовнішніх не більше, ніж рівнів гілки", () => {
    expect(learn([], "o1")).toEqual({ ok: false, reason: "outerLimit" });
    expect(learn([lvl("attack", "basic")], "o1")).toEqual({ ok: true });
    expect(learn([lvl("attack", "basic"), "o1"], "o2")).toEqual({ ok: false, reason: "outerLimit" });
    expect(learn([lvl("attack", "basic"), lvl("attack", "advanced"), "o1"], "o2")).toEqual({ ok: true });
  });

  it("needOuter: середній після зовнішнього тієї ж гілки", () => {
    expect(learn([lvl("attack", "basic")], "m1")).toEqual({ ok: false, reason: "needOuter" });
    expect(learn([lvl("attack", "basic"), lvl("defense", "basic"), "d-o1"], "m1")).toEqual({ ok: false, reason: "needOuter" });
    expect(learn([lvl("attack", "basic"), "o1"], "m1")).toEqual({ ok: true });
  });

  it("needMiddleAndExpert: внутрішній — середній + усі 3 рівні", () => {
    expect(learn([lvl("attack", "basic"), lvl("attack", "advanced"), "o1", "m1"], "i1")).toEqual({ ok: false, reason: "needMiddleAndExpert" });
    expect(learn([...ATTACK_ALL, "o1"], "i1")).toEqual({ ok: false, reason: "needMiddleAndExpert" });
    expect(learn([...ATTACK_ALL, "o1", "m1"], "i1")).toEqual({ ok: true });
  });

  it("racialLevel: 5 / 10 / 15, і по порядку", () => {
    expect(learn([], "racial_basic_racial", 4)).toEqual({ ok: false, reason: "racialLevel" });
    expect(learn([], "racial_basic_racial", 5)).toEqual({ ok: true });
    expect(learn([], "racial_advanced_racial", 10)).toEqual({ ok: false, reason: "branchOrder" });
    expect(learn(["racial_basic_racial"], "racial_advanced_racial", 9)).toEqual({ ok: false, reason: "racialLevel" });
  });

  it("needInner: ультимейт після 3 внутрішніх у всьому дереві", () => {
    const twoInner = [...ATTACK_ALL, "o1", "m1", "i1", lvl("defense", "basic"), lvl("defense", "advanced"), lvl("defense", "expert"), "d-o1", "d-m1", "d-i1"];

    expect(learn(twoInner, "ult")).toEqual({ ok: false, reason: "needInner" });

    const threeInner = [...twoInner, lvl("chaos", "basic"), lvl("chaos", "advanced"), lvl("chaos", "expert"), "c-o1", "c-m1", "c-i1"];

    expect(learn(threeInner, "ult")).toEqual({ ok: true });
  });
});

describe("canUnlearn", () => {
  it("notLearned", () => {
    expect(canUnlearn(TREE, [], "o1")).toEqual({ ok: false, reason: "notLearned" });
  });

  it("сироту можна зняти завжди", () => {
    expect(canUnlearn(TREE, ["gone"], "gone")).toEqual({ ok: true });
  });

  it("не можна зняти Основи при Просунутому", () => {
    expect(canUnlearn(TREE, [lvl("attack", "basic"), lvl("attack", "advanced")], lvl("attack", "basic"))).toEqual({ ok: false, reason: "hasDependents" });
  });

  it("не можна зняти останній зовнішній при середньому", () => {
    expect(canUnlearn(TREE, [lvl("attack", "basic"), "o1", "m1"], "o1")).toEqual({ ok: false, reason: "hasDependents" });
  });

  it("не можна зняти рівень, якщо зовнішніх стане більше за рівні", () => {
    const unlocked = [lvl("attack", "basic"), lvl("attack", "advanced"), "o1", "o2"];

    expect(canUnlearn(TREE, unlocked, lvl("attack", "advanced"))).toEqual({ ok: false, reason: "hasDependents" });
  });

  it("листок знімається", () => {
    expect(canUnlearn(TREE, [lvl("attack", "basic"), "o1", "m1"], "m1")).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/utils/skills/progression/__tests__/rules.test.ts`
Expected: FAIL (`canLearn is not a function`).

- [ ] **Step 3: Реалізація `rules.ts`**

```ts
import { branchLevelNodeId, racialNodeId } from "./ids";
import { BRANCH_LEVELS, RACIAL_MIN_LEVEL } from "./types";
import type { Check, LearnBlockReason, ProgressionNode, TreeNodes, UnlearnBlockReason } from "./types";

export const LEARN_BLOCK_TEXT: Record<LearnBlockReason, string> = {
  noPoints: "Немає вільних очок — підніміть рівень",
  alreadyLearned: "Уже вивчено",
  notInTree: "Цього вміння немає в дереві",
  branchOrder: "Спершу вивчіть попередній рівень",
  outerLimit: "Зовнішніх умінь у гілці не більше, ніж її рівнів — підвищте рівень гілки",
  needOuter: "Потрібне хоча б одне вміння зовнішнього кола цієї гілки",
  needMiddleAndExpert: "Потрібні вміння середнього кола й рівень Експерт цієї гілки",
  racialLevel: "Доступно з вищого рівня персонажа",
  needInner: "Потрібні 3 вміння внутрішнього кола",
};

export const UNLEARN_BLOCK_TEXT: Record<UnlearnBlockReason, string> = {
  notLearned: "Це вміння не вивчене",
  hasDependents: "Від цього вміння залежать інші вивчені — спершу зніміть їх",
};

const no = <R>(reason: R): Check<R> => ({ ok: false, reason });

const OK = { ok: true } as const;

function branchStats(tree: TreeNodes, learned: Set<string>, branchId: string) {
  const levels = BRANCH_LEVELS.filter((l) => learned.has(branchLevelNodeId(branchId, l))).length;

  const cells = tree.grid.get(branchId);

  const count = (ids: (string | null)[] | undefined) => (ids ?? []).filter((id) => id && learned.has(id)).length;

  return { levels, outer: count(cells?.outer), middle: count(cells?.middle), inner: count(cells?.inner) };
}

function innerTotal(tree: TreeNodes, learned: Set<string>): number {
  let total = 0;

  for (const cells of tree.grid.values()) total += cells.inner.filter((id) => id && learned.has(id)).length;

  return total;
}

function nodeRules(tree: TreeNodes, learned: Set<string>, characterLevel: number, node: ProgressionNode): Check<LearnBlockReason> {
  switch (node.kind) {
    case "branchLevel":
    case "racial": {
      if (node.kind === "racial" && characterLevel < RACIAL_MIN_LEVEL[node.level]) return no("racialLevel");

      const index = BRANCH_LEVELS.indexOf(node.level);

      if (index === 0) return OK;

      const prev = BRANCH_LEVELS[index - 1];

      const prevId = node.kind === "racial" ? racialNodeId(prev) : branchLevelNodeId(node.branchId, prev);

      return learned.has(prevId) ? OK : no("branchOrder");
    }

    case "slot": {
      const stats = branchStats(tree, learned, node.branchId);

      if (node.circle === "outer") return stats.outer < stats.levels ? OK : no("outerLimit");

      if (node.circle === "middle") return stats.outer >= 1 ? OK : no("needOuter");

      return stats.middle >= 1 && stats.levels === BRANCH_LEVELS.length ? OK : no("needMiddleAndExpert");
    }

    case "ultimate":
      return innerTotal(tree, learned) >= 3 ? OK : no("needInner");
  }
}

export function canLearn(tree: TreeNodes, unlocked: string[], characterLevel: number, nodeId: string): Check<LearnBlockReason> {
  const learned = new Set(unlocked.filter((id) => tree.nodes.has(id)));

  if (learned.size >= characterLevel) return no("noPoints");

  if (learned.has(nodeId)) return no("alreadyLearned");

  const node = tree.nodes.get(nodeId);

  if (!node) return no("notInTree");

  return nodeRules(tree, learned, characterLevel, node);
}

export function canUnlearn(tree: TreeNodes, unlocked: string[], nodeId: string): Check<UnlearnBlockReason> {
  if (!unlocked.includes(nodeId)) return no("notLearned");

  if (!tree.nodes.has(nodeId)) return OK;

  const remaining = new Set(unlocked.filter((id) => id !== nodeId && tree.nodes.has(id)));

  for (const id of remaining) {
    const others = new Set(remaining);

    others.delete(id);

    if (!nodeRules(tree, others, Number.POSITIVE_INFINITY, tree.nodes.get(id)!).ok) return no("hasDependents");
  }

  return OK;
}
```

Додати в `index.ts`: `export * from "./rules";`

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run lib/utils/skills/progression`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/skills/progression
git commit -m "feat(progression): single learn/unlearn rules with reasons

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `progressionView` і `rankOffers`

**Files:**
- Create: `lib/utils/skills/progression/view.ts` (+ `index.ts`)
- Test: `lib/utils/skills/progression/__tests__/view.test.ts`

**Interfaces:**
- Consumes: `canLearn`, `learnedInTree`, `TreeNodes`.
- Produces:

```ts
export interface NodeState { nodeId: string | null; state: "learned" | "available" | "locked"; reason?: LearnBlockReason }
export interface BranchRow { branchId: string; level: BranchLevel | null; outer: NodeState[]; middle: NodeState[]; inner: NodeState[] }
export interface ProgressionView {
  points: { spent: number; total: number; free: number };
  racial: NodeState[];
  branches: BranchRow[];
  untouchedBranchCount: number;
  ultimate: NodeState | null;
  orphans: string[];
}
export function progressionView(tree: TreeNodes, unlocked: string[], characterLevel: number): ProgressionView;
export function rankOffers(tree: TreeNodes, unlocked: string[], characterLevel: number): ProgressionNode[];
export function branchLevelOf(tree: TreeNodes, learned: Set<string>, branchId: string): BranchLevel | null;
```

- [ ] **Step 1: Тести, що падають**

```ts
import { describe, expect, it } from "vitest";

import { progressionView, rankOffers } from "..";
import { lvl, TREE } from "./fixtures";

// Приклад зі спеки: Просунутий Напад (+1 зовнішній) і Основи Захисту (+1 зовнішній), рівень 8 → 2 вільні
const UNLOCKED = [lvl("attack", "basic"), lvl("attack", "advanced"), "o1", lvl("defense", "basic"), "d-o1", "racial_basic_racial"];

describe("rankOffers", () => {
  it("порядок: расове → підвищення гілок (вища першою) → скіли вкачаних гілок → Основи нових", () => {
    const ids = rankOffers(TREE, UNLOCKED, 12).map((n) => n.nodeId);

    expect(ids).toEqual([
      "racial_advanced_racial",
      lvl("attack", "expert"),
      lvl("defense", "advanced"),
      "o2",
      "o3",
      "m1",
      "m2",
      "d-m1",
      lvl("light", "basic"),
      lvl("chaos", "basic"),
    ]);
  });

  it("без вільних очок — порожньо", () => {
    expect(rankOffers(TREE, UNLOCKED, UNLOCKED.length)).toEqual([]);
  });
});

describe("progressionView", () => {
  it("очки, рядки лише вкачаних гілок, стани слотів", () => {
    const view = progressionView(TREE, [...UNLOCKED, "gone"], 8);

    expect(view.points).toEqual({ spent: 6, total: 8, free: 2 });
    expect(view.orphans).toEqual(["gone"]);
    expect(view.branches.map((b) => [b.branchId, b.level])).toEqual([["attack", "advanced"], ["defense", "basic"]]);
    expect(view.untouchedBranchCount).toBe(2);

    const attack = view.branches[0];

    expect(attack.outer.map((s) => s.state)).toEqual(["learned", "available", "available"]);
    expect(attack.inner[0]).toMatchObject({ state: "locked", reason: "needMiddleAndExpert" });
    expect(view.branches[1].outer[1]).toMatchObject({ nodeId: "d-o2", state: "locked", reason: "outerLimit" });
    expect(view.branches[1].outer[2]).toEqual({ nodeId: null, state: "locked", reason: "notInTree" });
  });

  it("расові й ультимейт", () => {
    const view = progressionView(TREE, UNLOCKED, 8);

    expect(view.racial.map((s) => s.state)).toEqual(["learned", "locked", "locked"]);
    expect(view.racial[1].reason).toBe("racialLevel");
    expect(view.ultimate).toMatchObject({ nodeId: "ult", state: "locked", reason: "needInner" });
  });

  it("без вільних очок доступне стає locked/noPoints", () => {
    const view = progressionView(TREE, UNLOCKED, 6);

    expect(view.branches[0].outer[1]).toMatchObject({ state: "locked", reason: "noPoints" });
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/utils/skills/progression/__tests__/view.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реалізація `view.ts`**

```ts
import { branchLevelNodeId, racialNodeId } from "./ids";
import { learnedInTree } from "./progress";
import { canLearn } from "./rules";
import { BRANCH_LEVELS, CIRCLES } from "./types";
import type { BranchLevel, LearnBlockReason, ProgressionNode, TreeNodes } from "./types";

export interface NodeState { nodeId: string | null; state: "learned" | "available" | "locked"; reason?: LearnBlockReason }

export interface BranchRow { branchId: string; level: BranchLevel | null; outer: NodeState[]; middle: NodeState[]; inner: NodeState[] }

export interface ProgressionView {
  points: { spent: number; total: number; free: number };
  racial: NodeState[];
  branches: BranchRow[];
  untouchedBranchCount: number;
  ultimate: NodeState | null;
  orphans: string[];
}

export function branchLevelOf(tree: TreeNodes, learned: Set<string>, branchId: string): BranchLevel | null {
  let level: BranchLevel | null = null;

  for (const l of BRANCH_LEVELS) if (learned.has(branchLevelNodeId(branchId, l))) level = l;

  return level;
}

function touches(tree: TreeNodes, learned: Set<string>, branchId: string): boolean {
  for (const id of learned) {
    const node = tree.nodes.get(id);

    if (node && (node.kind === "branchLevel" || node.kind === "slot") && node.branchId === branchId) return true;
  }

  return false;
}

export function progressionView(tree: TreeNodes, unlocked: string[], characterLevel: number): ProgressionView {
  const inTree = learnedInTree(tree, unlocked);

  const learned = new Set(inTree);

  const state = (nodeId: string | null): NodeState => {
    if (!nodeId) return { nodeId: null, state: "locked", reason: "notInTree" };

    if (learned.has(nodeId)) return { nodeId, state: "learned" };

    const check = canLearn(tree, inTree, characterLevel, nodeId);

    return check.ok ? { nodeId, state: "available" } : { nodeId, state: "locked", reason: check.reason };
  };

  const rows = tree.branches.filter((b) => touches(tree, learned, b.id));

  return {
    points: { spent: inTree.length, total: characterLevel, free: Math.max(0, characterLevel - inTree.length) },
    racial: BRANCH_LEVELS.map((l) => state(racialNodeId(l))),
    branches: rows.map((b) => {
      const cells = tree.grid.get(b.id)!;

      return { branchId: b.id, level: branchLevelOf(tree, learned, b.id), outer: cells.outer.map(state), middle: cells.middle.map(state), inner: cells.inner.map(state) };
    }),
    untouchedBranchCount: tree.branches.length - rows.length,
    ultimate: tree.ultimateId ? state(tree.ultimateId) : null,
    orphans: unlocked.filter((id) => !tree.nodes.has(id)),
  };
}

export function rankOffers(tree: TreeNodes, unlocked: string[], characterLevel: number): ProgressionNode[] {
  const inTree = learnedInTree(tree, unlocked);

  const learned = new Set(inTree);

  const out: string[] = [];

  const offer = (id: string | null) => {
    if (id && !out.includes(id) && canLearn(tree, inTree, characterLevel, id).ok) out.push(id);
  };

  BRANCH_LEVELS.forEach((l) => offer(racialNodeId(l)));
  offer(tree.ultimateId);

  const rank = (id: string) => BRANCH_LEVELS.indexOf(branchLevelOf(tree, learned, id) ?? "basic");

  const touched = tree.branches
    .filter((b) => learned.has(branchLevelNodeId(b.id, "basic")))
    .sort((a, b) => rank(b.id) - rank(a.id));

  touched.forEach((b) => BRANCH_LEVELS.forEach((l) => offer(branchLevelNodeId(b.id, l))));
  touched.forEach((b) => CIRCLES.forEach((c) => tree.grid.get(b.id)![c].forEach(offer)));
  tree.branches.filter((b) => !learned.has(branchLevelNodeId(b.id, "basic"))).forEach((b) => offer(branchLevelNodeId(b.id, "basic")));

  return out.map((id) => tree.nodes.get(id)!);
}
```

(`Array.prototype.sort` стабільний — рівні гілки лишаються в порядку дерева.)

`index.ts`: `export * from "./view";`

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run lib/utils/skills/progression`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/skills/progression
git commit -m "feat(progression): player view rows and ranked offers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `resolveLearned`, `validateTree`, редагування JSON, заклинання з вузлів

**Files:**
- Create: `lib/utils/skills/progression/{resolve,validate,edit}.ts` (+ `index.ts`)
- Modify: `lib/utils/spells/spell-learning-from-tree.ts` (замінити обидві старі функції), `lib/utils/spells/index.ts`
- Test: `lib/utils/skills/progression/__tests__/{resolve,validate,edit}.test.ts`, `lib/utils/spells/__tests__/spell-learning-from-tree.test.ts` (переписати, якщо існує — перевірити `ls lib/utils/spells/__tests__`)

**Interfaces:**
- Produces:

```ts
export interface LearnedNode { nodeId: string; kind: ProgressionNode["kind"]; skillId: string | null; branchId: string | null; level: BranchLevel | null; circle: Circle | null }
export function resolveLearned(tree: TreeNodes, progress: unknown): LearnedNode[];
export function branchLevels(learned: LearnedNode[]): Record<string, BranchLevel>;

export type TreeErrorCode = "duplicateSkill" | "unknownBranch" | "unknownSkill" | "duplicateBranch";
export interface TreeError { code: TreeErrorCode; ref: string }
export const TREE_ERROR_TEXT: Record<TreeErrorCode, string>;
export function validateTree(raw: RawTree, ctx: { mainSkillIds: Set<string>; skillIds: Set<string> }): TreeError[];

export type CellRef =
  | { kind: "level"; branchId: string; level: BranchLevel }
  | { kind: "racial"; level: BranchLevel }
  | { kind: "slot"; branchId: string; circle: Circle; index: number }
  | { kind: "ultimate" };
export function cellSkillId(raw: RawTree, ref: CellRef): string | null;
export function setCellSkill(raw: RawTree, ref: CellRef, skill: { id: string; name: string; icon?: string | null } | null): RawTree;
export function addBranch(raw: RawTree, branch: { id: string; name: string; color: string; icon?: string | null; spellGroupId?: string | null }): RawTree;
export function removeBranch(raw: RawTree, branchId: string): RawTree;
export function moveBranch(raw: RawTree, branchId: string, dir: -1 | 1): RawTree;
export function emptyTree(race: string, branches: Parameters<typeof addBranch>[1][]): RawTree;
export function skillLocations(raw: RawTree): Map<string, CellRef[]>;

// lib/utils/spells
export interface SpellSkillInfo { spellGroupId: string | null; newSpellId: string | null }
export function learnedSpellIdsFromNodes(
  learned: LearnedNode[],
  ctx: { branchSpellGroup: Record<string, string | null>; skills: Record<string, SpellSkillInfo>; spells: Array<{ id: string; level: number; spellGroup?: { id: string } | null }> },
): string[];
```

- [ ] **Step 1: Тести, що падають**

`resolve.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { branchLevels, resolveLearned } from "..";
import { lvl, TREE } from "./fixtures";

describe("resolveLearned", () => {
  it("вузли поточного дерева з рівнем/колом; сироти й чужі ключі відкинуті", () => {
    const learned = resolveLearned(TREE, {
      "row-tree": { unlockedSkills: [lvl("attack", "advanced"), "o1", "racial_basic_racial", "ult", "gone"] },
      attack: { unlockedSkills: ["m1"] },
    });

    expect(learned).toEqual([
      { nodeId: lvl("attack", "advanced"), kind: "branchLevel", skillId: "atk-a", branchId: "attack", level: "advanced", circle: null },
      { nodeId: "o1", kind: "slot", skillId: "o1", branchId: "attack", level: null, circle: "outer" },
      { nodeId: "racial_basic_racial", kind: "racial", skillId: "r-b", branchId: null, level: "basic", circle: null },
      { nodeId: "ult", kind: "ultimate", skillId: "ult", branchId: null, level: null, circle: null },
    ]);
  });

  it("branchLevels — найвищий рівень на гілку", () => {
    const learned = resolveLearned(TREE, { "row-tree": { unlockedSkills: [lvl("attack", "basic"), lvl("attack", "advanced"), lvl("light", "basic")] } });

    expect(branchLevels(learned)).toEqual({ attack: "advanced", light: "basic" });
  });
});
```

`validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { validateTree } from "..";
import { RAW } from "./fixtures";

const ALL_SKILLS = new Set(["atk-b", "atk-a", "atk-e", "o1", "o2", "o3", "m1", "m2", "i1", "def-b", "d-o1", "d-o2", "d-m1", "d-i1", "l-o1", "l-i1", "c-o1", "c-m1", "c-i1", "r-b", "r-a", "ult"]);

const CTX = { mainSkillIds: new Set(["attack", "defense", "light", "chaos"]), skillIds: ALL_SKILLS };

describe("validateTree", () => {
  it("валідне дерево — без помилок (racial/ultimate — не невідомі гілки)", () => {
    expect(validateTree(RAW, CTX)).toEqual([]);
  });

  it("дубль скіла між рівнем і слотом", () => {
    const raw = { ...RAW, mainSkills: RAW.mainSkills.map((b) => (b.id === "defense" ? { ...b, levelSkillIds: { basic: "o1" } } : b)) };

    expect(validateTree(raw, CTX)).toContainEqual({ code: "duplicateSkill", ref: "o1" });
  });

  it("невідома гілка, невідомий скіл, дубль гілки", () => {
    const raw = { ...RAW, mainSkills: [...RAW.mainSkills, { id: "ghost", name: "?", color: "x" }, RAW.mainSkills[0]] };

    const codes = validateTree(raw, { ...CTX, skillIds: new Set([...ALL_SKILLS].filter((id) => id !== "ult")) }).map((e) => `${e.code}:${e.ref}`);

    expect(codes).toEqual(expect.arrayContaining(["unknownBranch:ghost", "duplicateBranch:attack", "unknownSkill:ult"]));
  });

  it("плейсхолдери ігноруються", () => {
    const raw = { ...RAW, ultimateSkill: { id: "Ельф_ultimate" } };

    expect(validateTree(raw, CTX)).toEqual([]);
  });
});
```

`edit.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { addBranch, cellSkillId, emptyTree, moveBranch, normalizeTree, removeBranch, setCellSkill, skillLocations } from "..";
import { RAW } from "./fixtures";

describe("edit", () => {
  it("setCellSkill ставить і прибирає скіл слота, рівня, расового, ультимейта", () => {
    let raw = setCellSkill(RAW, { kind: "slot", branchId: "defense", circle: "outer", index: 2 }, { id: "new", name: "Нове" });

    expect(normalizeTree({ id: "t", skills: raw }).grid.get("defense")?.outer).toEqual(["d-o1", "d-o2", "new"]);

    raw = setCellSkill(raw, { kind: "slot", branchId: "defense", circle: "outer", index: 0 }, null);
    expect(cellSkillId(raw, { kind: "slot", branchId: "defense", circle: "outer", index: 0 })).toBeNull();
    expect(cellSkillId(raw, { kind: "slot", branchId: "defense", circle: "outer", index: 2 })).toBe("new");

    raw = setCellSkill(raw, { kind: "level", branchId: "light", level: "expert" }, { id: "lx", name: "x" });
    expect(cellSkillId(raw, { kind: "level", branchId: "light", level: "expert" })).toBe("lx");

    raw = setCellSkill(raw, { kind: "racial", level: "expert" }, { id: "rx", name: "x" });
    expect(cellSkillId(raw, { kind: "racial", level: "expert" })).toBe("rx");

    raw = setCellSkill(raw, { kind: "ultimate" }, null);
    expect(cellSkillId(raw, { kind: "ultimate" })).toBeNull();
  });

  it("add / move / remove гілки, racial лишається в кінці", () => {
    let raw = addBranch(RAW, { id: "new", name: "Нова", color: "green" });

    expect(raw.mainSkills.map((b) => b.id)).toEqual(["attack", "defense", "light", "chaos", "new", "racial"]);

    raw = moveBranch(raw, "new", -1);
    expect(raw.mainSkills.map((b) => b.id).slice(3, 5)).toEqual(["new", "chaos"]);

    raw = moveBranch(raw, "attack", -1);
    expect(raw.mainSkills[0].id).toBe("attack");

    raw = removeBranch(raw, "new");
    expect(raw.mainSkills.map((b) => b.id)).toEqual(["attack", "defense", "light", "chaos", "racial"]);
  });

  it("emptyTree і skillLocations", () => {
    const raw = emptyTree("Ельф", [{ id: "attack", name: "Напад", color: "red" }]);

    expect(normalizeTree({ id: "t", skills: raw }).branches.map((b) => b.id)).toEqual(["attack"]);
    expect(skillLocations(RAW).get("o1")).toEqual([{ kind: "slot", branchId: "attack", circle: "outer", index: 0 }]);
  });
});
```

`lib/utils/spells/__tests__/spell-learning-from-tree.test.ts` (повністю замінити вміст, якщо файл існує):

```ts
import { describe, expect, it } from "vitest";

import { learnedSpellIdsFromNodes } from "@/lib/utils/spells";

const spells = [
  { id: "s1", level: 1, spellGroup: { id: "sg" } },
  { id: "s3", level: 3, spellGroup: { id: "sg" } },
  { id: "o1", level: 1, spellGroup: { id: "other" } },
];

describe("learnedSpellIdsFromNodes", () => {
  it("рівень гілки зі школою магії відкриває заклинання рівня; скіл зі школою — basic; newSpellId додається", () => {
    const ids = learnedSpellIdsFromNodes(
      [
        { nodeId: "light_advanced_level", kind: "branchLevel", skillId: null, branchId: "light", level: "advanced", circle: null },
        { nodeId: "x", kind: "slot", skillId: "x", branchId: "attack", level: null, circle: "outer" },
      ],
      { branchSpellGroup: { light: "sg" }, skills: { x: { spellGroupId: "other", newSpellId: "bonus" } }, spells },
    );

    expect(ids.sort()).toEqual(["bonus", "o1", "s1", "s3"].sort());
  });
});
```

Перед цим тестом подивитися `getSpellLevelsForSkillLevel` у `lib/utils/spells/spell-learning-internals.ts` і підставити в очікування рівні, які він реально повертає для `advanced` і `basic` (тест вище припускає `advanced → [1,2,3]`, `basic → [1]`; якщо інакше — виправити очікування, а не функцію).

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/utils/skills/progression lib/utils/spells`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

`resolve.ts`:

```ts
import { readUnlocked } from "./progress";
import { BRANCH_LEVELS } from "./types";
import type { BranchLevel, Circle, ProgressionNode, TreeNodes } from "./types";

export interface LearnedNode { nodeId: string; kind: ProgressionNode["kind"]; skillId: string | null; branchId: string | null; level: BranchLevel | null; circle: Circle | null }

function toLearned(node: ProgressionNode): LearnedNode {
  switch (node.kind) {
    case "branchLevel":
      return { nodeId: node.nodeId, kind: node.kind, skillId: node.skillId, branchId: node.branchId, level: node.level, circle: null };
    case "racial":
      return { nodeId: node.nodeId, kind: node.kind, skillId: node.skillId, branchId: null, level: node.level, circle: null };
    case "slot":
      return { nodeId: node.nodeId, kind: node.kind, skillId: node.skillId, branchId: node.branchId, level: null, circle: node.circle };
    case "ultimate":
      return { nodeId: node.nodeId, kind: node.kind, skillId: node.skillId, branchId: null, level: null, circle: null };
  }
}

export function resolveLearned(tree: TreeNodes, progress: unknown): LearnedNode[] {
  return readUnlocked(tree, progress).flatMap((id) => {
    const node = tree.nodes.get(id);

    return node ? [toLearned(node)] : [];
  });
}

export function branchLevels(learned: LearnedNode[]): Record<string, BranchLevel> {
  const out: Record<string, BranchLevel> = {};

  for (const n of learned) {
    if (n.kind !== "branchLevel" || !n.branchId || !n.level) continue;

    const current = out[n.branchId];

    if (!current || BRANCH_LEVELS.indexOf(n.level) > BRANCH_LEVELS.indexOf(current)) out[n.branchId] = n.level;
  }

  return out;
}
```

`validate.ts`:

```ts
import { realSkillId } from "./ids";
import { CIRCLE_KEY } from "./tree-json";
import type { RawTree } from "./tree-json";
import { BRANCH_LEVELS, CIRCLES, RACIAL_BRANCH_ID, ULTIMATE_BRANCH_ID } from "./types";

export type TreeErrorCode = "duplicateSkill" | "unknownBranch" | "unknownSkill" | "duplicateBranch";

export interface TreeError { code: TreeErrorCode; ref: string }

export const TREE_ERROR_TEXT: Record<TreeErrorCode, string> = {
  duplicateSkill: "Цей скіл уже стоїть в іншому місці дерева",
  unknownBranch: "Гілки немає серед основних навичок кампанії",
  unknownSkill: "Скіла немає в бібліотеці кампанії",
  duplicateBranch: "Гілка додана двічі",
};

export function validateTree(raw: RawTree, ctx: { mainSkillIds: Set<string>; skillIds: Set<string> }): TreeError[] {
  const errors: TreeError[] = [];

  const branches = new Set<string>();

  const skills = new Set<string>();

  const useSkill = (value: unknown) => {
    const id = realSkillId(value);

    if (!id) return;

    if (!ctx.skillIds.has(id)) errors.push({ code: "unknownSkill", ref: id });

    if (skills.has(id)) errors.push({ code: "duplicateSkill", ref: id });

    skills.add(id);
  };

  for (const b of raw.mainSkills) {
    const pseudo = b.id === RACIAL_BRANCH_ID || b.id === ULTIMATE_BRANCH_ID;

    if (branches.has(b.id)) {
      errors.push({ code: "duplicateBranch", ref: b.id });
      continue;
    }

    branches.add(b.id);

    if (!pseudo && !ctx.mainSkillIds.has(b.id)) errors.push({ code: "unknownBranch", ref: b.id });

    BRANCH_LEVELS.forEach((l) => useSkill(b.levelSkillIds?.[l]));
    CIRCLES.forEach((c) => (b.levels?.basic?.[CIRCLE_KEY[c]] ?? []).forEach((s) => useSkill(s?.id)));
  }

  useSkill(raw.ultimateSkill?.id);

  return errors;
}
```

`edit.ts`:

```ts
import { realSkillId } from "./ids";
import { CIRCLE_KEY } from "./tree-json";
import type { RawBranch, RawSlot, RawTree } from "./tree-json";
import { BRANCH_LEVELS, CIRCLE_SIZE, CIRCLES, RACIAL_BRANCH_ID } from "./types";
import type { BranchLevel, Circle } from "./types";

export type CellRef =
  | { kind: "level"; branchId: string; level: BranchLevel }
  | { kind: "racial"; level: BranchLevel }
  | { kind: "slot"; branchId: string; circle: Circle; index: number }
  | { kind: "ultimate" };

type SkillPick = { id: string; name: string; icon?: string | null } | null;

const findBranch = (raw: RawTree, id: string) => raw.mainSkills.find((b) => b.id === id);

export function cellSkillId(raw: RawTree, ref: CellRef): string | null {
  if (ref.kind === "ultimate") return realSkillId(raw.ultimateSkill?.id);

  if (ref.kind === "racial") return realSkillId(findBranch(raw, RACIAL_BRANCH_ID)?.levelSkillIds?.[ref.level]);

  const branch = findBranch(raw, ref.branchId);

  if (ref.kind === "level") return realSkillId(branch?.levelSkillIds?.[ref.level]);

  return realSkillId(branch?.levels?.basic?.[CIRCLE_KEY[ref.circle]]?.[ref.index]?.id);
}

function withLevelSkill(branch: RawBranch, level: BranchLevel, skill: SkillPick): RawBranch {
  const levelSkillIds = { ...branch.levelSkillIds };

  const levelIcons = { ...branch.levelIcons };

  if (skill) {
    levelSkillIds[level] = skill.id;

    if (skill.icon) levelIcons[level] = skill.icon;
  } else {
    delete levelSkillIds[level];
    delete levelIcons[level];
  }

  return { ...branch, levelSkillIds, levelIcons };
}

function withSlot(branch: RawBranch, circle: Circle, index: number, skill: SkillPick): RawBranch {
  const key = CIRCLE_KEY[circle];

  const basic = { circle1: [], circle2: [], circle3: [], ...branch.levels?.basic };

  const list: RawSlot[] = Array.from({ length: CIRCLE_SIZE[circle] }, (_, i) => basic[key]?.[i] ?? { id: "" });

  list[index] = skill ? { id: skill.id, name: skill.name, ...(skill.icon && { icon: skill.icon }) } : { id: "" };

  return { ...branch, levels: { ...branch.levels, basic: { ...basic, [key]: list } } };
}

const ensureRacial = (raw: RawTree): RawTree =>
  findBranch(raw, RACIAL_BRANCH_ID) ? raw : { ...raw, mainSkills: [...raw.mainSkills, { id: RACIAL_BRANCH_ID, name: "Раса", color: "gainsboro", levelSkillIds: {}, levels: {} }] };

export function setCellSkill(raw: RawTree, ref: CellRef, skill: SkillPick): RawTree {
  if (ref.kind === "ultimate") return { ...raw, ultimateSkill: skill ? { id: skill.id, name: skill.name, ...(skill.icon && { icon: skill.icon }) } : null };

  const tree = ref.kind === "racial" ? ensureRacial(raw) : raw;

  const branchId = ref.kind === "racial" ? RACIAL_BRANCH_ID : ref.branchId;

  return {
    ...tree,
    mainSkills: tree.mainSkills.map((b) => {
      if (b.id !== branchId) return b;

      return ref.kind === "slot" ? withSlot(b, ref.circle, ref.index, skill) : withLevelSkill(b, ref.level, skill);
    }),
  };
}

const racialLast = (branches: RawBranch[]) => [...branches.filter((b) => b.id !== RACIAL_BRANCH_ID), ...branches.filter((b) => b.id === RACIAL_BRANCH_ID)];

export function addBranch(raw: RawTree, branch: { id: string; name: string; color: string; icon?: string | null; spellGroupId?: string | null }): RawTree {
  if (findBranch(raw, branch.id)) return raw;

  const empty = () => ({ circle1: [], circle2: [], circle3: [] });

  const next: RawBranch = {
    id: branch.id,
    name: branch.name,
    color: branch.color,
    ...(branch.icon && { icon: branch.icon }),
    ...(branch.spellGroupId && { spellGroupId: branch.spellGroupId }),
    levelSkillIds: {},
    levels: { basic: empty(), advanced: empty(), expert: empty() },
  };

  return { ...raw, mainSkills: racialLast([...raw.mainSkills, next]) };
}

export function removeBranch(raw: RawTree, branchId: string): RawTree {
  return { ...raw, mainSkills: raw.mainSkills.filter((b) => b.id !== branchId) };
}

export function moveBranch(raw: RawTree, branchId: string, dir: -1 | 1): RawTree {
  const list = racialLast(raw.mainSkills);

  const from = list.findIndex((b) => b.id === branchId);

  const to = from + dir;

  if (from < 0 || to < 0 || to >= list.length || list[to].id === RACIAL_BRANCH_ID) return raw;

  [list[from], list[to]] = [list[to], list[from]];

  return { ...raw, mainSkills: list };
}

export function emptyTree(race: string, branches: Parameters<typeof addBranch>[1][]): RawTree {
  return ensureRacial(branches.reduce<RawTree>((raw, b) => addBranch(raw, b), { race, mainSkills: [], ultimateSkill: null }));
}

export function skillLocations(raw: RawTree): Map<string, CellRef[]> {
  const out = new Map<string, CellRef[]>();

  const put = (id: string | null, ref: CellRef) => {
    if (id) out.set(id, [...(out.get(id) ?? []), ref]);
  };

  for (const b of raw.mainSkills) {
    for (const level of BRANCH_LEVELS) {
      put(realSkillId(b.levelSkillIds?.[level]), b.id === RACIAL_BRANCH_ID ? { kind: "racial", level } : { kind: "level", branchId: b.id, level });
    }

    if (b.id === RACIAL_BRANCH_ID) continue;

    for (const circle of CIRCLES) {
      (b.levels?.basic?.[CIRCLE_KEY[circle]] ?? []).forEach((s, index) => put(realSkillId(s?.id), { kind: "slot", branchId: b.id, circle, index }));
    }
  }

  put(realSkillId(raw.ultimateSkill?.id), { kind: "ultimate" });

  return out;
}
```

`index.ts` додати: `export * from "./edit"; export * from "./resolve"; export * from "./validate";`

`lib/utils/spells/spell-learning-from-tree.ts` — замінити весь вміст:

```ts
/**
 * Заклинання, вивчені через вузли дерева прокачки.
 */

import { getSpellLevelsForSkillLevel, SKILL_LEVEL_ORDER } from "./spell-learning-internals";

import type { BranchLevel, LearnedNode } from "@/lib/utils/skills/progression";

export interface SpellSkillInfo { spellGroupId: string | null; newSpellId: string | null }

export function learnedSpellIdsFromNodes(
  learned: LearnedNode[],
  ctx: {
    branchSpellGroup: Record<string, string | null>;
    skills: Record<string, SpellSkillInfo>;
    spells: Array<{ id: string; level: number; spellGroup?: { id: string } | null }>;
  },
): string[] {
  const groupLevel = new Map<string, BranchLevel>();

  const extra = new Set<string>();

  const raise = (group: string | null | undefined, level: BranchLevel) => {
    if (!group) return;

    const current = groupLevel.get(group);

    if (!current || SKILL_LEVEL_ORDER[level] > SKILL_LEVEL_ORDER[current]) groupLevel.set(group, level);
  };

  for (const node of learned) {
    if (node.kind === "branchLevel" && node.branchId && node.level) raise(ctx.branchSpellGroup[node.branchId], node.level);

    const skill = node.skillId ? ctx.skills[node.skillId] : undefined;

    if (skill) {
      raise(skill.spellGroupId, "basic");

      if (skill.newSpellId) extra.add(skill.newSpellId);
    }
  }

  const result = new Set(extra);

  for (const [group, level] of groupLevel) {
    const levels = getSpellLevelsForSkillLevel(level);

    ctx.spells.filter((s) => s.spellGroup?.id === group && levels.includes(s.level)).forEach((s) => result.add(s.id));
  }

  return [...result];
}
```

Якщо `SKILL_LEVEL_ORDER` типізований через `SkillLevelType` — привести ключ (`SKILL_LEVEL_ORDER[level as SkillLevelType]`). У `lib/utils/spells/index.ts` прибрати експорти `getLearnedSpellIdsFromProgress`, `getLearnedSpellIdsFromTree` і `calculateSpellsToAdd` (нікому не потрібен — перевірено `grep`), додати `learnedSpellIdsFromNodes`, `type SpellSkillInfo`. Видалити `calculateSpellsToAdd` із `spell-learning.ts` і його тести, якщо є. Додати в `spell-learning-internals.ts` (або поряд) хелпер для серверу й клієнта:

```ts
export function toSpellSkillInfo(skill: SkillLike): SpellSkillInfo {
  return { spellGroupId: getSkillSpellGroupId(skill) ?? null, newSpellId: getSkillSpellNewSpellId(skill) ?? null };
}
```

і експортувати його з `lib/utils/spells`.

Старі виклики (`from-character-learned-spells.ts`, `useCharacterView.ts`, `useLearnedSpellIds.ts`, `CharacterSpellbook.tsx`) перестануть компілюватися — їх переписують Task 7 і Task 14; до того `pnpm build` не запускати, перевіряти лише тести цього таску.

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run lib/utils/skills/progression lib/utils/spells`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/skills/progression lib/utils/spells
git commit -m "feat(progression): resolver, tree validation, tree editing, spells from nodes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Лінія скіла `levelNode` і бійовий резолвер скілів

**Files:**
- Modify: `types/abilities.ts`, `lib/utils/abilities/build/resolve.ts`, `lib/utils/abilities/build/collect.ts`, `lib/utils/battle/participant/extract-skills.ts`, `lib/utils/battle/participant/from-character.ts`
- Test: `lib/utils/abilities/__tests__/resolve.test.ts` (додати; знайти існуючий файл тестів `pickHighestPerLine` через `grep -rln pickHighestPerLine lib/**/__tests__`), `lib/utils/battle/participant/__tests__/extract-skills.test.ts` (переписати)

**Interfaces:**
- Consumes: `normalizeTree`, `resolveLearned` (Task 2, 5).
- Produces: `AbilitySource.line?: { mainSkillId: string; level: string; levelNode?: boolean }`; `SkillEntry.levelNode?: boolean`;
  `resolveCharacterSkillEntries(character, campaignId, preloadedSkillsById?, preloadedMainSkillGroups?, preloadedTree?: Prisma.SkillTreeGetPayload<object> | null): Promise<SkillRowEntry[]>`.

- [ ] **Step 1: Тести, що падають**

У тест `pickHighestPerLine`:

```ts
it("рівні гілки з levelNode групуються за гілкою навіть без слова рівня в назві", () => {
  const src = (id: string, level: string, levelNode: boolean) => ({ item: id, source: { type: "skill" as const, id, name: `Скіл ${id}`, line: { mainSkillId: "attack", level, levelNode } } });

  const picked = pickHighestPerLine([src("a", "basic", true), src("b", "advanced", true), src("c", "basic", false)]);

  expect(picked.map((p) => p.item).sort()).toEqual(["b", "c"]);
});

it("старі знімки без levelNode — фолбек на назву", () => {
  const picked = pickHighestPerLine([
    { item: "a", source: { type: "skill" as const, id: "a", name: "Напад — Основи", line: { mainSkillId: "attack", level: "basic" } } },
    { item: "b", source: { type: "skill" as const, id: "b", name: "Напад — Експерт", line: { mainSkillId: "attack", level: "expert" } } },
  ]);

  expect(picked.map((p) => p.item)).toEqual(["b"]);
});
```

`extract-skills.test.ts` (повністю):

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveCharacterSkillEntries } from "../extract-skills";

import { buildTreeJson } from "@/lib/utils/skills/progression";

vi.mock("@/lib/db", () => ({
  prisma: { skillTree: { findFirst: vi.fn() }, skill: { findMany: vi.fn() }, mainSkill: { findMany: vi.fn() } },
}));

const row = (id: string, name: string, mainSkillId: string | null = null) => ({ id, name, mainSkillId }) as never;

const TREE = {
  id: "row-tree",
  race: "Ельф",
  skills: buildTreeJson({ race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", levels: { basic: "lvl-b", advanced: "lvl-a" }, outer: ["o1"] }], racial: { basic: "rac" } }),
} as never;

const SKILLS = { "lvl-b": row("lvl-b", "Сила удару", "attack"), "lvl-a": row("lvl-a", "Міць удару", "attack"), o1: row("o1", "Кровопуск", "attack"), rac: row("rac", "Ельфійське око"), pers: row("pers", "Особисте") };

const character = (unlocked: string[], extra: Record<string, unknown> = {}) =>
  ({ id: "c", race: "Ельф", campaignId: "camp", skillTreeProgress: { "row-tree": { unlockedSkills: unlocked } }, ...extra }) as never;

describe("resolveCharacterSkillEntries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("рівні гілки — зі levelSkillIds (назва без слова рівня), з levelNode; слот — basic без levelNode; расовий — без лінії", async () => {
    const entries = await resolveCharacterSkillEntries(
      character(["attack_basic_level", "attack_advanced_level", "o1", "racial_basic_racial"], { personalSkillId: "pers" }),
      "camp",
      SKILLS,
      new Map([["attack", null]]),
      TREE,
    );

    expect(entries.map((e) => [e.row.id, e.mainSkillId, e.level, e.levelNode ?? false])).toEqual([
      ["lvl-b", "attack", "basic", true],
      ["lvl-a", "attack", "advanced", true],
      ["o1", "attack", "basic", false],
      ["rac", null, "basic", false],
      ["pers", null, "basic", false],
    ]);
  });

  it("без дерева — лише personalSkillId", async () => {
    const entries = await resolveCharacterSkillEntries(character(["o1"], { personalSkillId: "pers" }), "camp", SKILLS, new Map(), null);

    expect(entries.map((e) => e.row.id)).toEqual(["pers"]);
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/utils/abilities lib/utils/battle/participant`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

`types/abilities.ts`: `line?: { mainSkillId: string; level: string; levelNode?: boolean };`

`lib/utils/abilities/build/resolve.ts`:

```ts
function isLevelLine(source: AbilitySource): boolean {
  if (!source.line) return false;

  return source.line.levelNode ?? inferLevelFromSkillName(source.name) !== null;
}

// «Найвищий рівень у лінії»: рівні гілки групуються за mainSkillId, решта — за власним id; знімки до levelNode — за назвою.
export function pickHighestPerLine<T>(items: { item: T; source: AbilitySource }[]): { item: T; source: AbilitySource }[] {
  const byKey = new Map<string, { item: T; source: AbilitySource }>();

  for (const entry of items) {
    const line = entry.source.line;

    const key = line && isLevelLine(entry.source) ? `line:${line.mainSkillId}` : `skill:${entry.source.id}`;

    const existing = byKey.get(key);

    const rank = RANK[line?.level ?? "basic"] ?? 1;

    if (!existing || rank > (RANK[existing.source.line?.level ?? "basic"] ?? 1)) byKey.set(key, entry);
  }

  return [...byKey.values()];
}
```

`collect.ts`: `SkillEntry` + `levelNode?: boolean`; у `skillSource`:

```ts
...(mainSkillId && level && { line: { mainSkillId, level, ...(entry.levelNode !== undefined && { levelNode: entry.levelNode }) } }),
```

`extract-skills.ts` — переписати `resolveCharacterSkillEntries` (зберегти `loadMainSkillSpellGroups`, прибрати `fetchSkillsFor`, імпорти `inferLevelFromSkillName`/`parseMainSkillLevelId`/`SkillLevel`, і шапку-коментар скоротити до одного рядка):

```ts
/** Вивчені вузли дерева раси + personalSkillId → рядки скілів з лінією для бою. */
export async function resolveCharacterSkillEntries(
  character: CharacterFromPrisma,
  campaignId: string,
  preloadedSkillsById?: Record<string, Prisma.SkillGetPayload<object>>,
  preloadedMainSkillGroups?: Map<string, string | null>,
  preloadedTree?: Prisma.SkillTreeGetPayload<object> | null,
): Promise<SkillRowEntry[]> {
  const treeRow = preloadedTree !== undefined ? preloadedTree : await prisma.skillTree.findFirst({ where: { campaignId, race: character.race } });

  const learned = treeRow ? resolveLearned(normalizeTree(treeRow), character.skillTreeProgress).filter((n) => n.skillId) : [];

  const personalSkillId = (character as { personalSkillId?: string | null }).personalSkillId?.trim() || null;

  const ids = [...new Set([...learned.map((n) => n.skillId!), ...(personalSkillId ? [personalSkillId] : [])])];

  if (ids.length === 0) return [];

  const rows = preloadedSkillsById
    ? ids.map((id) => preloadedSkillsById[id]).filter(Boolean)
    : await prisma.skill.findMany({ where: { campaignId, id: { in: ids } } });

  const byId = new Map(rows.map((r) => [r.id, r]));

  const groups = preloadedMainSkillGroups ?? (await loadMainSkillSpellGroups(rows));

  const entries: SkillRowEntry[] = [];

  for (const n of learned) {
    const row = byId.get(n.skillId!);

    if (!row) continue;

    const mainSkillId = n.kind === "branchLevel" || n.kind === "slot" ? n.branchId : null;

    entries.push({
      row,
      mainSkillId,
      level: n.level ?? "basic",
      levelNode: n.kind === "branchLevel",
      mainSkillSpellGroupId: mainSkillId ? (groups.get(mainSkillId) ?? null) : null,
    });
  }

  const personal = personalSkillId && !learned.some((n) => n.skillId === personalSkillId) ? byId.get(personalSkillId) : undefined;

  if (personal) entries.push({ row: personal, mainSkillId: null, level: "basic", levelNode: false, mainSkillSpellGroupId: null });

  return entries;
}
```

`from-character.ts`: передати дерево з контексту:

```ts
const skills = await resolveCharacterSkillEntries(
  character,
  character.campaignId,
  context?.skillsById,
  mainSkillGroups,
  context ? (context.skillTreeByRace[character.race] ?? null) : undefined,
);
```

Знайти інших споживачів `SkillEntry.level` через `grep -rn "\.level" lib/utils/battle/participant/spell-enhancers.ts` — `spell-enhancers.ts` використовує `pickSkillEntries`; поведінка не змінюється.

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run lib/utils/abilities lib/utils/battle`
Expected: PASS (старі тести, що спиралися на ключ прогресу = mainSkillId або `inferLevelFromSkillName` у резолвері, переписати на дерево через `buildTreeJson`; тести, що перевіряли фолбек за назвою у `pickHighestPerLine`, мають лишитися зеленими).

- [ ] **Step 5: Commit**

```bash
git add types/abilities.ts lib/utils/abilities lib/utils/battle/participant
git commit -m "feat(battle): skills from the race tree via resolver; explicit levelNode line

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Заклинання з дерева в бою, баланс, прибрати `characterSkills`

**Files:**
- Modify: `lib/utils/battle/participant/from-character-learned-spells.ts`, `lib/utils/battle/balance/{dpr,stats}.ts`, `app/api/campaigns/[id]/battles/balance/{balance-get,balance-post,balance-helpers}.ts`, `app/api/campaigns/[id]/battles/[battleId]/start/{start-build-context,start-battle-handler}.ts`, `lib/utils/prisma/includes.ts`, `lib/utils/battle/types/participant.ts` (`CharacterFromPrisma`), add-participant/damage-preview, що мають `include: { characterSkills … }` (`grep -rn "characterSkills" app lib`)
- Test: `lib/utils/battle/participant/__tests__/from-character-learned-spells.test.ts` (створити/переписати), `lib/utils/battle/balance/__tests__/dpr.test.ts` (переписати на `branchLevels`)

**Interfaces:**
- Consumes: `normalizeTree`, `resolveLearned`, `branchLevels`, `learnedSpellIdsFromNodes`, `toSpellSkillInfo`.
- Produces:

```ts
export function getSpellDprFromBranchLevels(levels: Record<string, BranchLevel>, magicMainSkillIds?: Set<string> | null): number;
export function getNonMagicBranchDpr(levels: Record<string, BranchLevel>, magicMainSkillIds?: Set<string> | null): number;
// getCharacterStats input: замість skillTreeProgress/treeIdToMainSkillIds → branchLevels?: Record<string, BranchLevel>
```

- [ ] **Step 1: Тести, що падають**

`dpr.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getNonMagicBranchDpr, getSpellDprFromBranchLevels } from "@/lib/utils/battle/balance/dpr";
import { DPR_BY_LEVEL_MAGIC, DPR_BY_LEVEL_NON_MAGIC } from "@/lib/constants/dpr-by-main-skill";

describe("DPR з рівнів гілок", () => {
  const magic = new Set(["light"]);

  it("магія — найвищий рівень серед магічних гілок", () => {
    expect(getSpellDprFromBranchLevels({ light: "advanced", attack: "expert" }, magic)).toBe(DPR_BY_LEVEL_MAGIC.advanced);
  });

  it("немагічні — сума", () => {
    expect(getNonMagicBranchDpr({ light: "advanced", attack: "expert", defense: "basic" }, magic)).toBe(DPR_BY_LEVEL_NON_MAGIC.expert + DPR_BY_LEVEL_NON_MAGIC.basic);
  });
});
```

`from-character-learned-spells.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { resolveLearnedSpellsFromCharacter } from "../from-character-learned-spells";

import { buildTreeJson } from "@/lib/utils/skills/progression";

vi.mock("@/lib/db", () => ({ prisma: {} }));

const tree = { id: "row-tree", race: "Ельф", skills: buildTreeJson({ race: "Ельф", branches: [{ id: "light", name: "Світло", color: "y" }] }) };

const context = {
  skillTreeByRace: { Ельф: tree },
  mainSkills: [{ id: "light", spellGroupId: "sg", name: "Світло" }],
  spells: [{ id: "s1", level: 1, spellGroup: { id: "sg" } }],
  allSkills: [],
} as never;

describe("resolveLearnedSpellsFromCharacter", () => {
  it("рівень гілки зі школою магії додає заклинання до knownSpells", async () => {
    const character = { id: "c", race: "Ельф", campaignId: "camp", skillTreeProgress: { "row-tree": { unlockedSkills: ["light_basic_level"] } } } as never;

    expect(await resolveLearnedSpellsFromCharacter(character, ["k"], context)).toEqual(["k", "s1"]);
  });

  it("без дерева — лише knownSpells", async () => {
    const character = { id: "c", race: "Гном", campaignId: "camp", skillTreeProgress: {} } as never;

    expect(await resolveLearnedSpellsFromCharacter(character, ["k"], { ...(context as object), skillTreeByRace: {} } as never)).toEqual(["k"]);
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/utils/battle`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

`from-character-learned-spells.ts` — замінити тіло функції:

```ts
export async function resolveLearnedSpellsFromCharacter(character: CharacterFromPrisma, baseKnownSpells: string[], context?: CampaignSpellContext): Promise<string[]> {
  try {
    const treeRow = context ? (context.skillTreeByRace[character.race] ?? null) : await prisma.skillTree.findFirst({ where: { campaignId: character.campaignId, race: character.race } });

    if (!treeRow) return baseKnownSpells;

    const tree = normalizeTree(treeRow);

    const learned = resolveLearned(tree, character.skillTreeProgress);

    if (learned.length === 0) return baseKnownSpells;

    const skillIds = learned.map((n) => n.skillId).filter((id): id is string => !!id);

    const branchIds = tree.branches.map((b) => b.id);

    const [skills, spells, mainSkills] = context
      ? [context.allSkills.filter((s) => skillIds.includes(s.id)), context.spells, context.mainSkills]
      : await Promise.all([
          prisma.skill.findMany({ where: { campaignId: character.campaignId, id: { in: skillIds } } }),
          prisma.spell.findMany({ where: { campaignId: character.campaignId }, select: { id: true, level: true, spellGroup: { select: { id: true } } } }),
          prisma.mainSkill.findMany({ where: { id: { in: branchIds } }, select: { id: true, spellGroupId: true } }),
        ]);

    const branchSpellGroup = Object.fromEntries(tree.branches.map((b) => [b.id, mainSkills.find((m) => m.id === b.id)?.spellGroupId ?? b.spellGroupId]));

    const fromTree = learnedSpellIdsFromNodes(learned, {
      branchSpellGroup,
      skills: Object.fromEntries(skills.map((s) => [s.id, toSpellSkillInfo(s as never)])),
      spells,
    });

    return [...new Set([...baseKnownSpells, ...fromTree])];
  } catch (e) {
    logger.error("[battle/learned-spells] load from tree failed", { characterId: character.id, race: character.race }, e);

    return baseKnownSpells;
  }
}
```

(Імпорти: `normalizeTree`, `resolveLearned` з `@/lib/utils/skills/progression`; `learnedSpellIdsFromNodes`, `toSpellSkillInfo` з `@/lib/utils/spells`; прибрати `convertPrismaToSkillTree`, `Skill`, `Spell`.)

`dpr.ts` — замінити `getSpellDprFromProgress`/`getNonMagicMainSkillDprFromProgress`, `hasMagicSchoolInUnlockedSkills`, `normalizeSkillLevel`, `TreeIdToMainSkillIds`:

```ts
import type { BranchLevel } from "@/lib/utils/skills/progression";

export function getSpellDprFromBranchLevels(levels: Record<string, BranchLevel>, magicMainSkillIds?: Set<string> | null): number {
  return Object.entries(levels).reduce((best, [id, level]) => (isMagicMainSkill(id, magicMainSkillIds) ? Math.max(best, DPR_BY_LEVEL_MAGIC[level] ?? 0) : best), 0);
}

export function getNonMagicBranchDpr(levels: Record<string, BranchLevel>, magicMainSkillIds?: Set<string> | null): number {
  return Object.entries(levels).reduce((sum, [id, level]) => (isMagicMainSkill(id, magicMainSkillIds) ? sum : sum + (DPR_BY_LEVEL_NON_MAGIC[level] ?? 0)), 0);
}
```

`stats.ts`: у вхідному типі `skillTreeProgress`/`treeIdToMainSkillIds` → `branchLevels?: Record<string, BranchLevel> | null`; виклики → `getSpellDprFromBranchLevels(character.branchLevels ?? {}, character.magicMainSkillIds)` і `getNonMagicBranchDpr(...)`.

`balance-get.ts` / `balance-post.ts`: замість `treeIdToMainSkillIds` і `enrichSkillTreeProgressWithInferredLevels`:

```ts
const treesByRace = new Map(trees.map((t) => [t.race, normalizeTree(t)]));

// у циклі по персонажах
const tree = treesByRace.get(character.race);

const levels = tree ? branchLevels(resolveLearned(tree, character.skillTreeProgress)) : {};
// → getCharacterStats({ …, branchLevels: levels, magicMainSkillIds })
```

У `balance-post.ts`, якщо дерев не вантажить, — додати `prisma.skillTree.findMany({ where: { campaignId } })` у наявний `Promise.all` або поряд. Логування `[Balance GET] … основні навички (прогрес)` замінити на `levels`. У `balance-helpers.ts` видалити `inferLevelFromUnlockedSkillIds` і `enrichSkillTreeProgressWithInferredLevels` (і їх тести).

`characterSkills`: прибрати `characterSkills: { include: { skillTree: true } }` з `start-build-context.ts` (тип `CharacterWithRelations`), `start-battle-handler.ts`, `lib/utils/prisma/includes.ts`, типу `CharacterFromPrisma`, add-participant і damage-preview. Для add-participant і damage-preview: якщо вони будують учасника без `context`, `resolveCharacterSkillEntries`/`resolveLearnedSpellsFromCharacter` самі завантажать дерево (`findFirst`); окремо нічого не робити.

- [ ] **Step 4: Тести + типи**

Run: `pnpm test:run lib/utils/battle app/api/__tests__/battles && pnpm exec tsc --noEmit -p . 2>&1 | grep -v "useCharacterView\|useLearnedSpellIds\|CharacterSpellbook\|useDamageCalculator\|skill-tree\|CharacterSkillTreeView" | head`
Expected: тести PASS; помилок TS поза файлами, які переписують Task 13–19, немає.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/battle lib/utils/prisma app/api/campaigns/\[id\]/battles
git commit -m "feat(battle): spells and balance from resolved tree nodes; drop characterSkills include

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `seenLevel` — міграція й підвищення рівня; PATCH персонажа без прогресу

**Files:**
- Create: `prisma/migrations/20261009000000_character_seen_level/migration.sql`, `lib/utils/characters/seen-level.ts`
- Modify: `prisma/schema.prisma` (`Character.seenLevel Int?`), `app/api/campaigns/[id]/characters/[characterId]/{update-character-schema,build-character-update-data,route}.ts`, `…/level-up/route.ts`, `lib/utils/characters/character-form.ts`, `types/characters.ts`
- Test: `lib/utils/characters/__tests__/seen-level.test.ts`, наявні тести `build-character-update-data` (`grep -rln buildCharacterUpdateData app lib`)

**Interfaces:**
- Produces: `seenLevelOnLevelChange(oldLevel: number, newLevel: number, seenLevel: number | null): number | null | undefined` — `undefined` = не змінювати; `buildCharacterUpdateData` повертає також `seenLevel?: number`.

- [ ] **Step 1: Тест, що падає**

```ts
import { describe, expect, it } from "vitest";

import { seenLevelOnLevelChange } from "@/lib/utils/characters/seen-level";

describe("seenLevelOnLevelChange", () => {
  it("перше підвищення при NULL — старий рівень (анімація покаже old → new)", () => {
    expect(seenLevelOnLevelChange(3, 4, null)).toBe(3);
  });

  it("seenLevel уже є — не змінювати", () => {
    expect(seenLevelOnLevelChange(4, 5, 3)).toBeUndefined();
  });

  it("рівень не зріс — не змінювати", () => {
    expect(seenLevelOnLevelChange(4, 4, null)).toBeUndefined();
    expect(seenLevelOnLevelChange(5, 4, null)).toBeUndefined();
  });
});
```

Також у тест `buildCharacterUpdateData` (або новий поруч): при `experience`, що дає новий рівень, і `character.seenLevel = null` → `result.seenLevel === character.level`; при `data.skillTreeProgress` у вхідних даних → у результаті немає `skillTreeProgress`, крім випадку зниження рівня (`{}`).

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/utils/characters app/api`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

`seen-level.ts`:

```ts
/** NULL = «бачив поточний рівень»; перше підвищення фіксує старий рівень, щоб профіль показав анімацію. */
export function seenLevelOnLevelChange(oldLevel: number, newLevel: number, seenLevel: number | null): number | undefined {
  if (newLevel <= oldLevel || seenLevel !== null) return undefined;

  return oldLevel;
}
```

`schema.prisma` у `Character` після `skillTreeProgress`: `seenLevel Int?`. Міграція:

```sql
-- AlterTable
ALTER TABLE "characters" ADD COLUMN "seenLevel" INTEGER;
```

Run: `pnpm exec prisma generate`

`update-character-schema.ts`: видалити поле `skillTreeProgress`. `build-character-update-data.ts`: прибрати гілку `data.skillTreeProgress`, лишивши скидання при зниженні:

```ts
const skillTreeProgressUpdate = finalLevel < character.level ? ({} as Prisma.InputJsonValue) : undefined;

const seenLevel = seenLevelOnLevelChange(character.level, finalLevel, character.seenLevel ?? null);
```

і повернути `...(seenLevel !== undefined && { seenLevel })` там, де збирається `data` для `prisma.character.update` у `route.ts` (знайти, як `skillTreeProgressUpdate` потрапляє в `update`, і додати `seenLevel` поряд). `level-up/route.ts`: у `data` апдейту додати `...(seenLevelOnLevelChange(character.level, newLevel, character.seenLevel) !== undefined && { seenLevel: character.level })`.

`character-form.ts`: прибрати `skillTreeProgress` з `characterToFormData` і `formDataToCharacter`; `types/characters.ts`: прибрати `skillTreeProgress` з `CharacterFormData` (лишити в `Character`, бо це колонка) і додати `seenLevel?: number | null` в `Character`. Помилки TS у компонентах профілю, що читають `formData.skillTreeProgress`, виправляє Task 14.

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run lib/utils/characters app/api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261009000000_character_seen_level lib/utils/characters app/api/campaigns/\[id\]/characters types/characters.ts
git commit -m "feat(characters): seenLevel column; level rises record it; PATCH no longer writes skill progress

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: `GET …/characters/[cid]/progression`

**Files:**
- Create: `app/api/campaigns/[id]/characters/[characterId]/progression/{route.ts,get-progression-handler.ts,load-progression-context.ts}`, `types/progression.ts` (DTO; реекспорт з `types/index.ts`)
- Test: `app/api/__tests__/progression-api.test.ts`

**Interfaces:**
- Consumes: `normalizeTree`, `readUnlocked`, `stripTreeForClient`, `readTreeJson`, `abilitySummary`, `damageAffinity`, `toSpellSkillInfo`.
- Produces (`types/progression.ts`):

```ts
export interface ProgressionSkillDto {
  name: string;
  icon: string | null;
  summary: string[];
  description: string;
  spellGroupId: string | null;
  newSpellId: string | null;
  damageAffinity: { affectsDamage: boolean; damageType: "melee" | "ranged" | "magic" | null };
}
export interface ProgressionBranchDto { name: string; color: string; icon: string | null; spellGroupId: string | null }
export interface CharacterProgressionDto {
  treeId: string | null;
  tree: RawTree | null;
  race: string;
  level: number;
  seenLevel: number | null;
  isOwner: boolean;
  isDM: boolean;
  unlocked: string[];
  skills: Record<string, ProgressionSkillDto>;
  branches: Record<string, ProgressionBranchDto>;
}
```

`load-progression-context.ts` (спільне для GET і дій):

```ts
export interface ProgressionContext {
  character: { id: string; level: number; race: string; skillTreeProgress: unknown; seenLevel: number | null; controlledBy: string };
  treeRow: Prisma.SkillTreeGetPayload<object> | null;
  isDM: boolean;
  isOwner: boolean;
}
export async function loadProgressionContext(campaignId: string, characterId: string): Promise<ProgressionContext | NextResponse>;
```

- [ ] **Step 1: Тест, що падає**

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { buildTreeJson } from "@/lib/utils/skills/progression";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findFirst: vi.fn(), updateMany: vi.fn() },
    skillTree: { findFirst: vi.fn() },
    skill: { findMany: vi.fn() },
    mainSkill: { findMany: vi.fn() },
  },
}));

const access = (userId: string, role: "dm" | "player") =>
  ({ userId, authUser: { id: userId, email: null, user_metadata: null }, campaign: { id: "camp", maxLevel: 20, xpMultiplier: 1, members: [{ userId, role }] } }) as never;

const CHAR = { id: "ch", level: 3, race: "Ельф", skillTreeProgress: { "json-id": { unlockedSkills: ["attack_basic_level"] } }, seenLevel: 2, controlledBy: "owner" };

const TREE_ROW = { id: "row-id", campaignId: "camp", race: "Ельф", createdAt: new Date(), skills: buildTreeJson({ id: "json-id", race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", outer: ["o1"] }] }) };

const params = { params: Promise.resolve({ id: "camp", characterId: "ch" }) };

describe("GET progression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findFirst).mockResolvedValue(CHAR as never);
    vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(TREE_ROW as never);
    vi.mocked(prisma.skill.findMany).mockResolvedValue([{ id: "o1", name: "Кровопуск", icon: null, description: "опис", abilities: [], basicInfo: null, spellGroupId: null, spellNewSpellId: null }] as never);
    vi.mocked(prisma.mainSkill.findMany).mockResolvedValue([{ id: "attack", name: "Напад", color: "red", icon: null, spellGroupId: null }] as never);
  });

  it("власник отримує дерево, вивчене (фолбек JSON id), лише скіли дерева", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const { GET } = await import("@/app/api/campaigns/[id]/characters/[characterId]/progression/route");

    const body = await getResponseJson<Record<string, unknown>>(await GET(new Request("http://x"), params) as NextResponse);

    expect(body).toMatchObject({ treeId: "row-id", level: 3, seenLevel: 2, isOwner: true, isDM: false, unlocked: ["attack_basic_level"] });
    expect(Object.keys(body.skills as object)).toEqual(["o1"]);
    expect(vi.mocked(prisma.skill.findMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "camp", id: { in: ["o1"] } } });
  });

  it("чужий гравець — 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("stranger", "player"));

    const { GET } = await import("@/app/api/campaigns/[id]/characters/[characterId]/progression/route");

    expect((await GET(new Request("http://x"), params)).status).toBe(403);
  });

  it("без дерева — treeId null", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(null);

    const { GET } = await import("@/app/api/campaigns/[id]/characters/[characterId]/progression/route");

    const body = await getResponseJson<Record<string, unknown>>(await GET(new Request("http://x"), params) as NextResponse);

    expect(body).toMatchObject({ treeId: null, tree: null, isDM: true, unlocked: [] });
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run app/api/__tests__/progression-api.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

`load-progression-context.ts`:

```ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";

export interface ProgressionContext {
  character: { id: string; level: number; race: string; skillTreeProgress: unknown; seenLevel: number | null; controlledBy: string };
  treeRow: Prisma.SkillTreeGetPayload<object> | null;
  isDM: boolean;
  isOwner: boolean;
}

export async function loadProgressionContext(campaignId: string, characterId: string): Promise<ProgressionContext | NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const character = await prisma.character.findFirst({
    where: { id: characterId, campaignId },
    select: { id: true, level: true, race: true, skillTreeProgress: true, seenLevel: true, controlledBy: true },
  });

  if (!character) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isDM = access.campaign.members[0]?.role === "dm";

  const isOwner = character.controlledBy === access.userId;

  if (!isDM && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const treeRow = await prisma.skillTree.findFirst({ where: { campaignId, race: character.race } });

  return { character, treeRow, isDM, isOwner };
}
```

`get-progression-handler.ts`:

```ts
import { prisma } from "@/lib/db";
import { skillAbilities } from "@/lib/utils/abilities/legacy/read";
import { damageAffinity } from "@/lib/utils/abilities/sheet-bonuses";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { normalizeTree, readTreeJson, readUnlocked, stripTreeForClient } from "@/lib/utils/skills/progression";
import { toSpellSkillInfo } from "@/lib/utils/spells";
import type { CharacterProgressionDto } from "@/types/progression";

import type { ProgressionContext } from "./load-progression-context";

export async function buildProgressionDto(campaignId: string, ctx: ProgressionContext): Promise<CharacterProgressionDto> {
  const { character, treeRow, isDM, isOwner } = ctx;

  const base = { race: character.race, level: character.level, seenLevel: character.seenLevel, isOwner, isDM };

  if (!treeRow) return { ...base, treeId: null, tree: null, unlocked: [], skills: {}, branches: {} };

  const tree = normalizeTree(treeRow);

  const skillIds = [...new Set([...tree.nodes.values()].map((n) => n.skillId).filter((id): id is string => !!id))];

  const [skills, mainSkills] = await Promise.all([
    skillIds.length ? prisma.skill.findMany({ where: { campaignId, id: { in: skillIds } } }) : [],
    prisma.mainSkill.findMany({ where: { campaignId, id: { in: tree.branches.map((b) => b.id) } }, select: { id: true, name: true, color: true, icon: true, spellGroupId: true } }),
  ]);

  return {
    ...base,
    treeId: tree.treeId,
    tree: stripTreeForClient(readTreeJson(treeRow.skills)),
    unlocked: readUnlocked(tree, character.skillTreeProgress),
    skills: Object.fromEntries(
      skills.map((s) => [
        s.id,
        {
          name: s.name,
          icon: s.icon ?? null,
          summary: abilitySummary("skill", s),
          description: s.description ?? "",
          ...toSpellSkillInfo(s as never),
          damageAffinity: damageAffinity(skillAbilities(s)),
        },
      ]),
    ),
    branches: Object.fromEntries(
      tree.branches.map((b) => {
        const ms = mainSkills.find((m) => m.id === b.id);

        return [b.id, { name: ms?.name ?? b.name, color: ms?.color ?? b.color, icon: ms?.icon ?? b.icon, spellGroupId: ms?.spellGroupId ?? b.spellGroupId }];
      }),
    ),
  };
}
```

(Перевірити сигнатури `skillAbilities`/`damageAffinity` у `format-skills-response.ts` і повторити той самий виклик.)

`route.ts`:

```ts
import { NextResponse } from "next/server";

import { buildProgressionDto } from "./get-progression-handler";
import { loadProgressionContext } from "./load-progression-context";

import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const ctx = await loadProgressionContext(id, characterId);

    if (ctx instanceof NextResponse) return ctx;

    return NextResponse.json(await buildProgressionDto(id, ctx));
  } catch (error) {
    return handleApiError(error, { action: "load character progression" });
  }
}
```

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run app/api/__tests__/progression-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/\[id\]/characters/\[characterId\]/progression types/progression.ts types/index.ts app/api/__tests__/progression-api.test.ts
git commit -m "feat(api): character progression read endpoint with tree-only skills

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Дії `learn` / `unlearn` / `reset` / `seen-level`

**Files:**
- Create: `…/progression/progression-action-handler.ts`, `…/progression/{learn,unlearn,reset,seen-level}/route.ts`
- Test: `app/api/__tests__/progression-actions-api.test.ts`

**Interfaces:**
- Consumes: `loadProgressionContext` (Task 9), `canLearn`, `canUnlearn`, `readUnlocked`, `writeUnlocked`, `normalizeTree`.
- Produces: `POST learn|unlearn {nodeId}` → `200 { unlocked: string[] }` | 403 | 404 | 409 | `422 { reason }`; `POST reset` → `{ unlocked: [] }`; `POST seen-level` → `{ seenLevel }`.

```ts
export type ProgressionAction = { type: "learn"; nodeId: string } | { type: "unlearn"; nodeId: string } | { type: "reset" };
export async function runProgressionAction(campaignId: string, characterId: string, action: ProgressionAction): Promise<NextResponse>;
```

- [ ] **Step 1: Тест, що падає**

Додати в `progression-actions-api.test.ts` ті самі `vi.mock`, `access`, `TREE_ROW`, `params` що в Task 9 (скопіювати блок), плюс:

```ts
const post = async (action: string, body?: unknown) => {
  const mod = await import(`@/app/api/campaigns/[id]/characters/[characterId]/progression/${action}/route`);

  return mod.POST(new Request("http://x", { method: "POST", body: JSON.stringify(body ?? {}) }), params) as Promise<NextResponse>;
};

describe("progression actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findFirst).mockResolvedValue({ ...CHAR, level: 3 } as never);
    vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(TREE_ROW as never);
    vi.mocked(prisma.character.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  it("власник без allowPlayerEdit вчить; запис під id рядка з guard на прочитаний прогрес і рівень", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const res = await post("learn", { nodeId: "o1" });

    expect(res.status).toBe(200);
    expect(await getResponseJson(res)).toEqual({ unlocked: ["attack_basic_level", "o1"] });

    const call = vi.mocked(prisma.character.updateMany).mock.calls[0][0];

    expect(call.where).toEqual({ id: "ch", level: 3, skillTreeProgress: { equals: CHAR.skillTreeProgress } });
    expect(call.data).toEqual({ skillTreeProgress: { "row-id": { unlockedSkills: ["attack_basic_level", "o1"] } } });
  });

  it("порушення правил → 422 з reason", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const res = await post("learn", { nodeId: "attack_expert_level" });

    expect(res.status).toBe(422);
    expect(await getResponseJson(res)).toEqual({ reason: "branchOrder" });
  });

  it("паралельна зміна прогресу → 409", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    vi.mocked(prisma.character.updateMany).mockResolvedValue({ count: 0 } as never);

    expect((await post("learn", { nodeId: "o1" })).status).toBe(409);
  });

  it("unlearn і reset — лише DM", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    expect((await post("unlearn", { nodeId: "attack_basic_level" })).status).toBe(403);
    expect((await post("reset")).status).toBe(403);

    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    expect(await getResponseJson(await post("unlearn", { nodeId: "attack_basic_level" }))).toEqual({ unlocked: [] });
    expect(await getResponseJson(await post("reset"))).toEqual({ unlocked: [] });
  });

  it("seen-level — лише власник, ставить поточний рівень", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    expect((await post("seen-level")).status).toBe(403);

    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const res = await post("seen-level");

    expect(await getResponseJson(res)).toEqual({ seenLevel: 3 });
    expect(vi.mocked(prisma.character.updateMany).mock.calls[0][0]).toEqual({ where: { id: "ch" }, data: { seenLevel: 3 } });
  });

  it("невалідне тіло → 400", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    expect((await post("learn", { nodeId: "" })).status).toBe(400);
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run app/api/__tests__/progression-actions-api.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

`progression-action-handler.ts`:

```ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { loadProgressionContext } from "./load-progression-context";

import { prisma } from "@/lib/db";
import { canLearn, canUnlearn, normalizeTree, readUnlocked, writeUnlocked } from "@/lib/utils/skills/progression";

export type ProgressionAction = { type: "learn"; nodeId: string } | { type: "unlearn"; nodeId: string } | { type: "reset" };

export async function runProgressionAction(campaignId: string, characterId: string, action: ProgressionAction): Promise<NextResponse> {
  const ctx = await loadProgressionContext(campaignId, characterId);

  if (ctx instanceof NextResponse) return ctx;

  const { character, treeRow, isDM } = ctx;

  if (action.type !== "learn" && !isDM) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let nextProgress: Prisma.InputJsonValue;

  let unlocked: string[];

  if (action.type === "reset") {
    nextProgress = {};
    unlocked = [];
  } else {
    if (!treeRow) return NextResponse.json({ error: "Дерева для раси немає" }, { status: 404 });

    const tree = normalizeTree(treeRow);

    const current = readUnlocked(tree, character.skillTreeProgress);

    const check = action.type === "learn" ? canLearn(tree, current, character.level, action.nodeId) : canUnlearn(tree, current, action.nodeId);

    if (!check.ok) return NextResponse.json({ reason: check.reason }, { status: 422 });

    unlocked = action.type === "learn" ? [...current, action.nodeId] : current.filter((id) => id !== action.nodeId);
    nextProgress = writeUnlocked(tree, character.skillTreeProgress, unlocked) as Prisma.InputJsonValue;
  }

  const { count } = await prisma.character.updateMany({
    where: { id: character.id, level: character.level, skillTreeProgress: { equals: character.skillTreeProgress as Prisma.InputJsonValue } },
    data: { skillTreeProgress: nextProgress },
  });

  if (count === 0) return NextResponse.json({ error: "Прогрес змінився" }, { status: 409 });

  return NextResponse.json({ unlocked });
}

export async function markLevelSeen(campaignId: string, characterId: string): Promise<NextResponse> {
  const ctx = await loadProgressionContext(campaignId, characterId);

  if (ctx instanceof NextResponse) return ctx;

  if (!ctx.isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.character.updateMany({ where: { id: ctx.character.id }, data: { seenLevel: ctx.character.level } });

  return NextResponse.json({ seenLevel: ctx.character.level });
}
```

`learn/route.ts` (`unlearn` — те саме з `type: "unlearn"`):

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { runProgressionAction } from "../progression-action-handler";

import { handleApiError } from "@/lib/utils/api/error-handler";

const bodySchema = z.object({ nodeId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) return NextResponse.json({ error: "Невалідний запит" }, { status: 400 });

    return await runProgressionAction(id, characterId, { type: "learn", nodeId: parsed.data.nodeId });
  } catch (error) {
    return handleApiError(error, { action: "learn skill node" });
  }
}
```

`reset/route.ts` — без тіла, `runProgressionAction(id, characterId, { type: "reset" })`; `seen-level/route.ts` — `markLevelSeen(id, characterId)`.

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run app/api/__tests__/progression-actions-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/\[id\]/characters/\[characterId\]/progression app/api/__tests__/progression-actions-api.test.ts
git commit -m "feat(api): learn/unlearn/reset/seen-level with server-side rules and progress guard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: `PATCH …/skill-trees/[treeId]` — валідація й id

**Files:**
- Modify: `app/api/campaigns/[id]/skill-trees/[treeId]/route.ts` (тонкий) + Create `…/[treeId]/save-skill-tree-handler.ts`
- Modify: `lib/api/skill-trees.ts`, `types/api.ts` (`UpdateSkillTreeParams`)
- Test: `app/api/__tests__/skill-trees-api.test.ts`

**Interfaces:**
- Consumes: `readTreeJson`, `validateTree`.
- Produces: `PATCH /skill-trees/:treeId` з тілом `{ race: string; skills: RawTree }`; `treeId === "new"` або id, якого немає в кампанії → upsert за `{ campaignId, race }`; відповідь `{ id, race, skills }` де `skills.id === id`; 400 `{ errors: TreeError[] }`.
  `updateSkillTree({ campaignId, treeId, race, skills }): Promise<{ id: string; race: string; skills: RawTree }>`.

- [ ] **Step 1: Тест, що падає**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { buildTreeJson } from "@/lib/utils/skills/progression";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    skillTree: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    mainSkill: { findMany: vi.fn() },
    skill: { findMany: vi.fn() },
  },
}));

const RAW = buildTreeJson({ race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", outer: ["o1"] }] });

const patch = async (treeId: string, skills: unknown) => {
  const { PATCH } = await import("@/app/api/campaigns/[id]/skill-trees/[treeId]/route");

  return PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ race: "Ельф", skills }) }), { params: Promise.resolve({ id: "camp", treeId }) });
};

describe("PATCH skill tree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm" } as never);
    vi.mocked(prisma.mainSkill.findMany).mockResolvedValue([{ id: "attack" }] as never);
    vi.mocked(prisma.skill.findMany).mockResolvedValue([{ id: "o1" }] as never);
    vi.mocked(prisma.skillTree.create).mockImplementation(async ({ data }) => ({ id: "generated", ...data }) as never);
    vi.mocked(prisma.skillTree.update).mockImplementation(async ({ where, data }) => ({ id: where.id, race: "Ельф", ...data }) as never);
  });

  it("новий: створює з власним id, skills.id = id рядка", async () => {
    vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(null);

    const body = await getResponseJson<{ id: string; skills: { id: string } }>(await patch("mock-Ельф-camp", RAW) as never);

    const data = vi.mocked(prisma.skillTree.create).mock.calls[0][0].data as Record<string, unknown>;

    expect(data.id).toBeUndefined();
    expect(vi.mocked(prisma.skillTree.update).mock.calls[0][0]).toMatchObject({ where: { id: "generated" }, data: { skills: { id: "generated" } } });
    expect(body.id).toBe("generated");
  });

  it("існуючий у кампанії за id — оновлює, skills.id = id рядка", async () => {
    vi.mocked(prisma.skillTree.findFirst).mockResolvedValueOnce({ id: "row", campaignId: "camp", race: "Ельф" } as never);

    await patch("row", RAW);

    expect(vi.mocked(prisma.skillTree.update).mock.calls[0][0]).toMatchObject({ where: { id: "row" }, data: { skills: { id: "row" } } });
  });

  it("дубль скіла → 400 з помилками", async () => {
    vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(null);

    const raw = buildTreeJson({ race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", levels: { basic: "o1" }, outer: ["o1"] }] });

    const res = await patch("new", raw);

    expect(res.status).toBe(400);
    expect(await getResponseJson(res as never)).toEqual({ errors: [{ code: "duplicateSkill", ref: "o1" }] });
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run app/api/__tests__/skill-trees-api.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

`save-skill-tree-handler.ts`:

```ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { readTreeJson, validateTree } from "@/lib/utils/skills/progression";

export async function saveSkillTree(campaignId: string, treeId: string, race: string, skills: unknown): Promise<NextResponse> {
  const raw = readTreeJson(skills);

  const [mainSkills, librarySkills] = await Promise.all([
    prisma.mainSkill.findMany({ where: { campaignId }, select: { id: true } }),
    prisma.skill.findMany({ where: { campaignId }, select: { id: true } }),
  ]);

  const errors = validateTree(raw, { mainSkillIds: new Set(mainSkills.map((m) => m.id)), skillIds: new Set(librarySkills.map((s) => s.id)) });

  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 });

  const existing =
    (await prisma.skillTree.findFirst({ where: { id: treeId, campaignId } })) ??
    (await prisma.skillTree.findFirst({ where: { campaignId, race } }));

  const rowId = existing?.id ?? (await prisma.skillTree.create({ data: { campaignId, race, skills: {} } })).id;

  const saved = await prisma.skillTree.update({ where: { id: rowId }, data: { skills: { ...raw, id: rowId, race } as Prisma.InputJsonValue } });

  return NextResponse.json({ id: saved.id, race: saved.race, skills: saved.skills });
}
```

`route.ts`:

```ts
const bodySchema = z.object({ race: z.string().min(1), skills: z.object({ mainSkills: z.array(z.object({ id: z.string() }).passthrough()) }).passthrough() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; treeId: string }> }) {
  try {
    const { id, treeId } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) return NextResponse.json({ error: "Невалідне дерево" }, { status: 400 });

    return await saveSkillTree(id, treeId, parsed.data.race, parsed.data.skills);
  } catch (error) {
    return handleApiError(error, { action: "update skill tree" });
  }
}
```

`lib/api/skill-trees.ts`:

```ts
export interface SkillTreeRow { id: string; campaignId: string; race: string; skills: unknown; createdAt: string }

export async function getSkillTrees(campaignId: string): Promise<SkillTreeRow[]> {
  return campaignGet<SkillTreeRow[]>(campaignId, "/skill-trees");
}

export async function updateSkillTree(params: { campaignId: string; treeId: string; race: string; skills: RawTree }): Promise<{ id: string; race: string; skills: RawTree }> {
  return campaignPatch(params.campaignId, `/skill-trees/${params.treeId}`, { race: params.race, skills: params.skills });
}
```

У `types/api.ts` прибрати `UpdateSkillTreeParams`/`UpdateSkillTreeResponse`, якщо більше ніде не вживаються.

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run app/api/__tests__/skill-trees-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/\[id\]/skill-trees lib/api/skill-trees.ts types/api.ts app/api/__tests__/skill-trees-api.test.ts
git commit -m "fix(api): validate skill trees on save; own row id; no cross-campaign id reuse

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Скрипти будують дерево раси

**Files:**
- Modify: `scripts/simulate-battle.ts`, `scripts/seed-mock-battle-data.ts`, `scripts/setup-battle-test-3v5.ts`

**Interfaces:**
- Consumes: `buildTreeJson`, `branchLevelNodeId`.

- [ ] **Step 1: `simulate-battle.ts`**

Замість `const progress = (ids) => ({ [mainSkill.id]: … })`: після створення скілів створити дерева для рас `Дварф` і `Ельф` і писати прогрес під id рядка:

```ts
const treeFor = async (race: string, outer: string[], middle: string[] = []) => {
  const row = await prisma.skillTree.create({ data: { campaignId, race, skills: {} } });

  const skills = buildTreeJson({ id: row.id, race, branches: [{ id: mainSkill.id, name: mainSkill.name, color: mainSkill.color, outer, middle }] });

  await prisma.skillTree.update({ where: { id: row.id }, data: { skills: skills as Prisma.InputJsonValue } });

  return row.id;
};

const dwarfTree = await treeFor("Дварф", [skills.rage, skills.undying, skills.ironSkin], [skills.legacyGuard]);

const elfTree = await treeFor("Ельф", [skills.bleed, skills.secondWind]);

const progress = (treeId: string, ids: string[]) => ({ [treeId]: { unlockedSkills: [branchLevelNodeId(mainSkill.id, "basic"), branchLevelNodeId(mainSkill.id, "advanced"), branchLevelNodeId(mainSkill.id, "expert"), ...ids] } });
```

Торін: `progress(dwarfTree, [skills.rage, skills.undying, skills.ironSkin, skills.legacyGuard])` (рівень 5 > 7 вузлів? — підняти `level` Торіна до 7, якщо `canLearn` у сценаріях не використовується, кількість не важить для бою; рахунок очок у бою не перевіряється, тож рівень лишити 5). Ліра: `progress(elfTree, [skills.bleed, skills.secondWind])`. Якщо `skills.*` мають різні `mainSkillId`, кожен скіл кладеться в слоти тієї гілки, якою він позначений у `skillRows` (перевірити `skillRows` у скрипті; за потреби — кілька гілок у `branches`). Видалення сиду в кінці/на початку: додати `skillTree` до очищення кампанії, якщо скрипт чистить таблиці вручну.

Додати сценарій-крок (у тому ж стилі, що наявні 34): персонаж, у якого вивчено рівень гілки, чий скіл має назву без слова рівня, і расовий вузол — після старту бою його `abilities` містять ability з `source.id` скіла рівня і скіла раси. Для цього в `treeFor("Ельф", …)` передати `levels: { basic: skills.<існуючий скіл без слова рівня> }` і `racial: { basic: skills.<ще один> }`, а Лірі — `level: 5` і `racial_basic_racial` у прогрес. Очікування — та сама форма перевірки, що в інших кроках (`expect`/`check` хелпер скрипта).

- [ ] **Step 2: `seed-mock-battle-data.ts`, `setup-battle-test-3v5.ts`**

Ті самі заміни: дерево через `buildTreeJson`, прогрес під id рядка; у `setup-battle-test-3v5.ts` прибрати запис `characterSkills` (рядки ~277-297).

- [ ] **Step 3: Перевірка на локальній БД**

```bash
grep -E "^(DATABASE_URL|DIRECT_URL)=" .env.local   # обидва — localhost:54322
docker info >/dev/null 2>&1 || (open -a Docker && until docker info >/dev/null 2>&1; do sleep 2; done)
pnpm db:local
pnpm exec prisma migrate deploy
pnpm simulate-battle
```

Expected: `35/35` (34 наявні + новий крок).

- [ ] **Step 4: Commit**

```bash
git add scripts/simulate-battle.ts scripts/seed-mock-battle-data.ts scripts/setup-battle-test-3v5.ts
git commit -m "chore(scripts): seed race skill trees and progress keyed by tree row id

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Клієнт — `lib/api/character-progression` і хуки прогресу

**Files:**
- Create: `lib/api/character-progression.ts`, `lib/hooks/skills/{useCharacterProgression,useProgressionActions,useCharacterLearnedSpellIds}.ts`, `lib/hooks/skills/progression-keys.ts`
- Modify: `lib/hooks/skills/index.ts`
- Test: `lib/hooks/skills/__tests__/useProgressionActions.test.tsx`

**Interfaces:**
- Produces:

```ts
// lib/api/character-progression.ts
export function getCharacterProgression(campaignId: string, characterId: string): Promise<CharacterProgressionDto>;
export function learnNode(campaignId: string, characterId: string, nodeId: string): Promise<{ unlocked: string[] }>;
export function unlearnNode(campaignId: string, characterId: string, nodeId: string): Promise<{ unlocked: string[] }>;
export function resetProgression(campaignId: string, characterId: string): Promise<{ unlocked: string[] }>;
export function markLevelSeen(campaignId: string, characterId: string): Promise<{ seenLevel: number }>;

// lib/hooks/skills/progression-keys.ts
export const progressionKey: (campaignId: string, characterId: string) => readonly ["character-progression", string, string];

// lib/hooks/skills
export function useCharacterProgression(campaignId: string, characterId: string | undefined): {
  query: UseQueryResult<CharacterProgressionDto>;
  data: CharacterProgressionDto | undefined;
  tree: TreeNodes | null;
  view: ProgressionView | null;
  offers: ProgressionNode[];
  learned: LearnedNode[];
};
export function useProgressionActions(campaignId: string, characterId: string): {
  learn: (nodeId: string) => Promise<boolean>;
  unlearn: (nodeId: string) => Promise<boolean>;
  reset: () => Promise<boolean>;
  pendingNodeId: string | null;
};
export function useCharacterLearnedSpellIds(campaignId: string, characterId: string | undefined, knownSpellIds: string[]): string[];
```

- [ ] **Step 1: Тест, що падає**

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/character-progression";
import { progressionKey, useProgressionActions } from "@/lib/hooks/skills";

vi.mock("@/lib/api/character-progression");

const notify = vi.fn(async () => {});

vi.mock("@/lib/hooks/common", () => ({ useNotify: () => notify }));

afterEach(cleanup);

function setup() {
  const qc = new QueryClient();

  qc.setQueryData(progressionKey("camp", "ch"), { unlocked: ["a"], level: 3 });
  qc.setQueryData(["character", "camp", "ch"], { id: "ch", skillTreeProgress: {} });

  const invalidate = vi.spyOn(qc, "invalidateQueries");

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { qc, invalidate, ...renderHook(() => useProgressionActions("camp", "ch"), { wrapper }) };
}

describe("useProgressionActions", () => {
  it("learn патчить кеш прогресу без рефетчу й інвалідує damage-preview", async () => {
    vi.mocked(api.learnNode).mockResolvedValue({ unlocked: ["a", "b"] });

    const { qc, invalidate, result } = setup();

    await act(() => result.current.learn("b"));

    expect(qc.getQueryData<{ unlocked: string[] }>(progressionKey("camp", "ch"))?.unlocked).toEqual(["a", "b"]);
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["character-damage-preview", "camp", "ch"] }));
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: progressionKey("camp", "ch") }));
  });

  it("409 → інвалідує прогрес і повідомляє", async () => {
    vi.mocked(api.learnNode).mockRejectedValue(new ApiError("conflict", 409, "/x", {}));

    const { invalidate, result } = setup();

    await act(() => result.current.learn("b"));

    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: progressionKey("camp", "ch") }));
    expect(notify).toHaveBeenCalledWith("Прогрес змінився — оновлено");
  });

  it("422 → текст причини", async () => {
    vi.mocked(api.learnNode).mockRejectedValue(new ApiError("rule", 422, "/x", { reason: "needOuter" }));

    const { result } = setup();

    await act(() => result.current.learn("b"));

    expect(notify).toHaveBeenCalledWith("Потрібне хоча б одне вміння зовнішнього кола цієї гілки");
  });
});
```

(Перевірити конструктор `ApiError(message, status, url, body)` у `lib/api/client.ts` і порядок аргументів.)

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/hooks/skills/__tests__/useProgressionActions.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

`lib/api/character-progression.ts`:

```ts
import { campaignGet, campaignPost } from "@/lib/api/client";
import type { CharacterProgressionDto } from "@/types/progression";

const base = (characterId: string) => `/characters/${characterId}/progression`;

export const getCharacterProgression = (campaignId: string, characterId: string) => campaignGet<CharacterProgressionDto>(campaignId, base(characterId));

export const learnNode = (campaignId: string, characterId: string, nodeId: string) => campaignPost<{ unlocked: string[] }>(campaignId, `${base(characterId)}/learn`, { nodeId });

export const unlearnNode = (campaignId: string, characterId: string, nodeId: string) => campaignPost<{ unlocked: string[] }>(campaignId, `${base(characterId)}/unlearn`, { nodeId });

export const resetProgression = (campaignId: string, characterId: string) => campaignPost<{ unlocked: string[] }>(campaignId, `${base(characterId)}/reset`, {});

export const markLevelSeen = (campaignId: string, characterId: string) => campaignPost<{ seenLevel: number }>(campaignId, `${base(characterId)}/seen-level`, {});
```

`progression-keys.ts`:

```ts
export const progressionKey = (campaignId: string, characterId: string) => ["character-progression", campaignId, characterId] as const;
```

`useCharacterProgression.ts`:

```ts
"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { progressionKey } from "./progression-keys";

import { getCharacterProgression } from "@/lib/api/character-progression";
import { normalizeTree, progressionView, rankOffers, resolveLearned } from "@/lib/utils/skills/progression";

export function useCharacterProgression(campaignId: string, characterId: string | undefined) {
  const query = useQuery({
    queryKey: progressionKey(campaignId, characterId ?? ""),
    queryFn: () => getCharacterProgression(campaignId, characterId!),
    enabled: !!campaignId && !!characterId,
  });

  const { data } = query;

  const tree = useMemo(() => (data?.treeId && data.tree ? normalizeTree({ id: data.treeId, race: data.race, skills: data.tree }) : null), [data?.treeId, data?.tree, data?.race]);

  return useMemo(() => {
    if (!data || !tree) return { query, data, tree, view: null, offers: [], learned: [] };

    const progress = { [tree.treeId]: { unlockedSkills: data.unlocked } };

    return {
      query,
      data,
      tree,
      view: progressionView(tree, data.unlocked, data.level),
      offers: rankOffers(tree, data.unlocked, data.level),
      learned: resolveLearned(tree, progress),
    };
  }, [query, data, tree]);
}
```

`useProgressionActions.ts`:

```ts
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { progressionKey } from "./progression-keys";

import { ApiError } from "@/lib/api/client";
import { learnNode, resetProgression, unlearnNode } from "@/lib/api/character-progression";
import { useNotify } from "@/lib/hooks/common";
import { LEARN_BLOCK_TEXT, UNLEARN_BLOCK_TEXT } from "@/lib/utils/skills/progression";
import type { LearnBlockReason, UnlearnBlockReason } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

export function useProgressionActions(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);

  const key = progressionKey(campaignId, characterId);

  const run = async (nodeId: string, call: () => Promise<{ unlocked: string[] }>): Promise<boolean> => {
    setPendingNodeId(nodeId);
    try {
      const { unlocked } = await call();

      queryClient.setQueryData<CharacterProgressionDto>(key, (old) => (old ? { ...old, unlocked } : old));
      queryClient.setQueryData<{ skillTreeProgress?: unknown }>(["character", campaignId, characterId], (old) => {
        const treeId = queryClient.getQueryData<CharacterProgressionDto>(key)?.treeId;

        return old && treeId ? { ...old, skillTreeProgress: { [treeId]: { unlockedSkills: unlocked } } } : old;
      });
      void queryClient.invalidateQueries({ queryKey: ["character-damage-preview", campaignId, characterId] });
      void queryClient.invalidateQueries({ queryKey: ["battle-balance"], refetchType: "none" });

      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: key });
        await notify("Прогрес змінився — оновлено");
      } else if (error instanceof ApiError && error.status === 422) {
        const reason = (error.body as { reason?: string } | undefined)?.reason ?? "";

        await notify(LEARN_BLOCK_TEXT[reason as LearnBlockReason] ?? UNLEARN_BLOCK_TEXT[reason as UnlearnBlockReason] ?? error.message);
      } else {
        await notify((error as Error).message);
      }

      return false;
    } finally {
      setPendingNodeId(null);
    }
  };

  return {
    learn: (nodeId: string) => run(nodeId, () => learnNode(campaignId, characterId, nodeId)),
    unlearn: (nodeId: string) => run(nodeId, () => unlearnNode(campaignId, characterId, nodeId)),
    reset: () => run("reset", () => resetProgression(campaignId, characterId)),
    pendingNodeId,
  };
}
```

(Ключ `["character-damage-preview", campaignId, characterId]` — префікс справжнього ключа з множниками; `invalidateQueries` збігається за префіксом. Перевірити, що `ApiError` має поле `body`; якщо назва інша — використати її.)

`useCharacterLearnedSpellIds.ts`:

```ts
"use client";

import { useMemo } from "react";

import { useCharacterProgression } from "./useCharacterProgression";

import { useSpells } from "@/lib/hooks/spells";
import { learnedSpellIdsFromNodes } from "@/lib/utils/spells";

export function useCharacterLearnedSpellIds(campaignId: string, characterId: string | undefined, knownSpellIds: string[]): string[] {
  const { data, learned } = useCharacterProgression(campaignId, characterId);

  const { data: spells = [] } = useSpells(campaignId, { enabled: learned.length > 0 });

  return useMemo(() => {
    if (!data || learned.length === 0) return knownSpellIds;

    const fromTree = learnedSpellIdsFromNodes(learned, {
      branchSpellGroup: Object.fromEntries(Object.entries(data.branches).map(([id, b]) => [id, b.spellGroupId])),
      skills: data.skills,
      spells,
    });

    return [...new Set([...knownSpellIds, ...fromTree])];
  }, [data, learned, spells, knownSpellIds]);
}
```

(Перевірити, що `useSpells` з `@/lib/hooks/spells` використовує ключ `["spells", campaignId]` — спільний кеш; сигнатура опцій — як у `CharacterSpellbook.tsx`.)

`lib/hooks/skills/index.ts` — експортувати `progressionKey`, `useCharacterProgression`, `useProgressionActions`, `useCharacterLearnedSpellIds`.

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run lib/hooks/skills`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/api/character-progression.ts lib/hooks/skills
git commit -m "feat(hooks): character progression query, actions with cache patching, learned spells

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Профіль — споживачі прогресу з кешу прогресу

**Files:**
- Modify: `lib/hooks/characters/useCharacterView.ts`, `lib/hooks/characters/useDamageCalculator.ts`, `lib/hooks/characters/useDamageCalculator-skills.ts`, `lib/hooks/characters/index.ts`, `components/characters/artifacts/{CharacterSpellbook,CharacterArtifactsSection}.tsx`, `components/characters/stats/CharacterDamageCalculator.tsx`, `app/campaigns/[id]/character/{character-view-client.tsx,components/character-view/*}`, `app/campaigns/[id]/character/edit/edit-client.tsx`, `app/campaigns/[id]/dm/characters/new/page.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/DmCharacterEditFormAccordion.tsx`, `lib/hooks/characters/useCharacterEditor.ts` / `useDmCharacterEditor.ts` (інвалідація прогресу після збереження й level-up)
- Delete: `lib/hooks/characters/useLearnedSpellIds.ts`, `lib/hooks/characters/useDamageCalculator-helpers.ts`
- Test: `lib/hooks/characters/__tests__/useDamageCalculator-skills.test.ts` (переписати/створити), `components/characters/__tests__/CharacterSpellbook.test.tsx` (створити)

**Interfaces:**
- Consumes: `useCharacterProgression`, `useCharacterLearnedSpellIds`, `progressionKey` (Task 13).
- Produces: `useDamageCalculatorSkills(learnedSkillIds: string[], skills: Record<string, ProgressionSkillDto>)` → `{ skillsAffectingDamage: SkillAffectingDamage[] }`; `CharacterSpellbook` пропси `{ knownSpellIds: string[]; campaignId: string; characterId?: string }`; `CharacterArtifactsSection` — `characterId?` замість `characterRace`/`skillTreeProgress`; `CharacterDamageCalculator` — без `skillTreeProgress`/`characterRace`; `useCharacterView` більше не повертає `lastSavedSkillTreeProgress`, `savingTree`, `handleSaveSkillTree`.

- [ ] **Step 1: Тести, що падають**

`useDamageCalculator-skills.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { damageSkillsFromProgression } from "@/lib/hooks/characters/useDamageCalculator-skills";

describe("damageSkillsFromProgression", () => {
  it("лише вивчені скіли з affectsDamage, тип шкоди з damageAffinity", () => {
    const skills = {
      a: { name: "Кровопуск", damageAffinity: { affectsDamage: true, damageType: "melee" } },
      b: { name: "Щит", damageAffinity: { affectsDamage: false, damageType: null } },
      c: { name: "Не вивчено", damageAffinity: { affectsDamage: true, damageType: null } },
    } as never;

    expect(damageSkillsFromProgression(["a", "b"], skills)).toEqual([{ id: "a", name: "Кровопуск", damageType: "melee" }]);
  });
});
```

`CharacterSpellbook.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterSpellbook } from "@/components/characters/artifacts/CharacterSpellbook";

vi.mock("@/lib/hooks/skills", () => ({ useCharacterLearnedSpellIds: (_c: string, _id: string | undefined, known: string[]) => [...known, "s-tree"] }));

vi.mock("@/lib/hooks/spells", () => ({ useSpells: () => ({ data: [{ id: "s-known", name: "Відоме", level: 1 }, { id: "s-tree", name: "З дерева", level: 1 }] }) }));

afterEach(cleanup);

describe("CharacterSpellbook", () => {
  it("показує заклинання з дерева поряд із відомими", () => {
    render(<CharacterSpellbook campaignId="camp" characterId="ch" knownSpellIds={["s-known"]} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("З дерева")).toBeTruthy();
    expect(screen.getByText("Відоме")).toBeTruthy();
  });
});
```

(Подивитися, як `CharacterSpellbookDialog` рендерить назви; якщо діалог у порталі — шукати через `screen`, як вище. Якщо потрібен `ConfirmProvider` — рендерити через `render-with-confirm`.)

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/hooks/characters components/characters`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

`useDamageCalculator-skills.ts` — замінити весь файл (лишити `skillDamageAffinity`, якщо його імпортують інші модулі — перевірити `grep -rn skillDamageAffinity`; якщо ні — видалити):

```ts
import type { SkillAffectingDamage } from "@/lib/utils/characters/damage-calculator";
import type { ProgressionSkillDto } from "@/types/progression";

export function damageSkillsFromProgression(learnedSkillIds: string[], skills: Record<string, ProgressionSkillDto>): SkillAffectingDamage[] {
  return [...new Set(learnedSkillIds)].flatMap((id) => {
    const skill = skills[id];

    return skill?.damageAffinity.affectsDamage ? [{ id, name: skill.name, damageType: skill.damageAffinity.damageType }] : [];
  });
}
```

`useDamageCalculator.ts`: прибрати пропси `skillTreeProgress`, `characterRace`; усередині:

```ts
const { data: progression, learned } = useCharacterProgression(campaignId, characterId);

const learnedSpellIds = useCharacterLearnedSpellIds(campaignId, characterId, knownSpellIds);

const skillsAffectingDamage = useMemo(
  () => damageSkillsFromProgression(learned.map((n) => n.skillId).filter((id): id is string => !!id), progression?.skills ?? {}),
  [learned, progression?.skills],
);
```

Прибрати `useSkills` і `useDamageCalculatorSkills`; решту логіки, що читала `skillsAffectingDamage`, лишити. Тип `SkillTreeProgress` більше не експортувати з `useCharacterView`.

`useCharacterView.ts`: видалити `savingTree`, `saveError` (якщо вживається лише деревом — перевірити), `lastSavedSkillTreeProgress`, `handleSaveSkillTree`, `getSkillTrees`/`useSkills`/`useMainSkills`/`resolvedSkillTree`/`learnedSpellIdsFromSkills`; замінити:

```ts
const effectiveKnownSpellIds = useCharacterLearnedSpellIds(campaignId, characterId, spellcasting.knownSpells);
```

`CharacterSpellbook.tsx`:

```tsx
export interface CharacterSpellbookProps { knownSpellIds: string[]; campaignId: string; characterId?: string }

export function CharacterSpellbook({ knownSpellIds, campaignId, characterId }: CharacterSpellbookProps) {
  const [spellbookOpen, setSpellbookOpen] = useState(false);

  const { data: allSpells = [] } = useSpells(campaignId, { enabled: spellbookOpen });

  const learnedSpellIds = useCharacterLearnedSpellIds(campaignId, characterId, knownSpellIds);

  const knownSpells = useMemo(() => learnedSpellIds.map((id) => allSpells.find((s) => s.id === id)).filter((s): s is Spell => !!s), [allSpells, learnedSpellIds]);
  // далі розмітка без змін
```

`CharacterArtifactsSection` і всі проміжні компоненти (`ArtifactsAccordion`, `CharacterViewSingleCard`, `CharacterViewAccordion`, `AbilitiesAccordion`, `edit-client`, `dm/characters/new/page.tsx`, `DmCharacterEditFormAccordion`): прибрати пропси `skillTreeProgress`/`characterRace` для спелбуку й калькулятора, передавати `characterId` (на сторінці створення персонажа — не передавати). У `character-view-client.tsx` прибрати обробники `skillTreeProgress: next` / «Скинути дерево прокачки» (рядки ~145-200) — це тепер панель (Task 15). Тимчасово на місці `CharacterSkillTreeView` у профілі й DM-формі поставити нічого (Task 15 вставить `ProgressionPanel`) — **або** виконати Task 15 до коміту цього таску, якщо зручніше; білд має бути зеленим на коміті.

Інвалідація прогресу після збереження персонажа і підняття рівня: у місцях, де викликається `updateCharacter` / `levelUpCharacter` у хуках (`useCharacterEditor`, `useDmCharacterEditor`, `useDmCharactersPage`), після успіху додати:

```ts
void queryClient.invalidateQueries({ queryKey: ["character-progression", campaignId, characterId] });
```

(для списку DM без конкретного id — `["character-progression", campaignId]`).

- [ ] **Step 4: Тести, типи**

Run: `pnpm test:run lib/hooks components/characters app && pnpm exec tsc --noEmit -p .`
Expected: PASS; TS-помилки лише в `components/skill-tree/**`, `CharacterSkillTreeView.tsx`, `lib/hooks/skills/useSkillTree*` (видаляються в Task 15/19).

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/characters components/characters app/campaigns/\[id\]/character app/campaigns/\[id\]/dm/characters
git rm lib/hooks/characters/useLearnedSpellIds.ts lib/hooks/characters/useDamageCalculator-helpers.ts
git commit -m "refactor(profile): spellbook and damage calculator read learned nodes from the progression cache

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Панель прокачки гравця

**Files:**
- Create: `components/skill-tree/progression/{ProgressionPanel,PointsHeader,BranchRow,RacialRow,UltimateRow,NewBranchRow,SlotButton,OfferList,NodeSheet,node-labels}.tsx|ts`, `components/skill-tree/progression/index.ts`, `components/skill-tree/progression/progression.css`
- Modify: `app/campaigns/[id]/character/components/character-view/{CharacterViewSingleCard,accordion/AbilitiesAccordion}.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/DmCharacterEditFormAccordion.tsx`
- Delete: `components/characters/abilities/CharacterSkillTreeView.tsx`
- Test: `components/skill-tree/__tests__/ProgressionPanel.test.tsx`

**Interfaces:**
- Consumes: `useCharacterProgression`, `useProgressionActions` (Task 13); `ProgressionView`, `NodeState`, `ProgressionNode`, `LEARN_BLOCK_TEXT`, `UNLEARN_BLOCK_TEXT`, `canUnlearn`, `BRANCH_LEVEL_LABEL`, `CIRCLE_LABEL`.
- Produces: `<ProgressionPanel campaignId characterId canManage? />` (`canManage` = DM-режим); `nodeLabel(node, dto): { title: string; tag: string }` у `node-labels.ts`.

- [ ] **Step 1: Тест, що падає**

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { ProgressionPanel } from "@/components/skill-tree/progression";
import { buildTreeJson, normalizeTree, progressionView, rankOffers, resolveLearned } from "@/lib/utils/skills/progression";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

const learn = vi.fn(async () => true);

const unlearn = vi.fn(async () => true);

const RAW = buildTreeJson({
  id: "t",
  race: "Ельф",
  branches: [
    { id: "attack", name: "Напад", color: "red", levels: { basic: "atk-b" }, outer: ["o1", "o2"], middle: ["m1"], inner: ["i1"] },
    { id: "defense", name: "Захист", color: "blue", outer: ["d1"] },
  ],
});

let unlocked = ["attack_basic_level", "o1"];

const dto = () => ({
  treeId: "t",
  tree: RAW,
  race: "Ельф",
  level: 4,
  seenLevel: 4,
  isOwner: true,
  isDM: false,
  unlocked,
  skills: Object.fromEntries(["atk-b", "o1", "o2", "m1", "i1", "d1"].map((id) => [id, { name: `Скіл ${id}`, icon: null, summary: [`опис ${id}`], description: `повний ${id}`, spellGroupId: null, newSpellId: null, damageAffinity: { affectsDamage: false, damageType: null } }])),
  branches: { attack: { name: "Напад", color: "red", icon: null, spellGroupId: null }, defense: { name: "Захист", color: "blue", icon: null, spellGroupId: null } },
});

vi.mock("@/lib/hooks/skills", () => ({
  useCharacterProgression: () => {
    const data = dto();

    const tree = normalizeTree({ id: "t", skills: RAW });

    return { query: { isPending: false, isError: false, data }, data, tree, view: progressionView(tree, data.unlocked, data.level), offers: rankOffers(tree, data.unlocked, data.level), learned: resolveLearned(tree, { t: { unlockedSkills: data.unlocked } }) };
  },
  useProgressionActions: () => ({ learn, unlearn, reset: vi.fn(), pendingNodeId: null }),
}));

afterEach(cleanup);

beforeEach(() => {
  unlocked = ["attack_basic_level", "o1"];
  vi.clearAllMocks();
});

describe("ProgressionPanel", () => {
  it("очки, рядок гілки, пропозиції в порядку", () => {
    renderWithConfirm(<ProgressionPanel campaignId="c" characterId="ch" />);

    expect(screen.getByText(/2 вільні очки/)).toBeTruthy();
    expect(screen.getByRole("group", { name: "Напад · Основи" })).toBeTruthy();

    const offers = within(screen.getByRole("list", { name: "Вивчити" })).getAllByRole("listitem");

    expect(offers.map((li) => li.textContent)).toEqual([expect.stringContaining("Напад → Просунутий"), expect.stringContaining("Скіл m1"), expect.stringContaining("Захист → Основи")]);
  });

  it("тап по вивченому — шторка з описом без «Вивчити»", () => {
    renderWithConfirm(<ProgressionPanel campaignId="c" characterId="ch" />);
    fireEvent.click(screen.getByRole("button", { name: "Скіл o1" }));

    expect(screen.getByText("повний o1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Вивчити" })).toBeNull();
  });

  it("золотий «?» фільтрує пропозиції до слота; «Вивчити» викликає learn", async () => {
    renderWithConfirm(<ProgressionPanel campaignId="c" characterId="ch" />);
    fireEvent.click(screen.getByRole("button", { name: "Вивчити: Скіл m1" }));

    expect(within(screen.getByRole("list", { name: "Вивчити" })).getAllByRole("listitem")).toHaveLength(1);

    fireEvent.click(within(screen.getByRole("list", { name: "Вивчити" })).getByRole("button"));
    fireEvent.click(screen.getByRole("button", { name: "Вивчити" }));

    expect(learn).toHaveBeenCalledWith("m1");
  });

  it("закритий «?» — причина", () => {
    renderWithConfirm(<ProgressionPanel campaignId="c" characterId="ch" />);
    fireEvent.click(screen.getByRole("button", { name: "Закрито: Скіл o2" }));

    expect(screen.getByText(/Зовнішніх умінь у гілці не більше/)).toBeTruthy();
  });

  it("DM бачить «Розвчити»", () => {
    renderWithConfirm(<ProgressionPanel campaignId="c" characterId="ch" canManage />);
    fireEvent.click(screen.getByRole("button", { name: "Скіл o1" }));

    expect(screen.getByRole("button", { name: "Розвчити" })).toBeTruthy();
  });
});
```

(Якщо `renderWithConfirm` має іншу назву експорту — перевірити `components/ui/__tests__/render-with-confirm.tsx`.)

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run components/skill-tree`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

`node-labels.ts`:

```ts
import { BRANCH_LEVEL_LABEL, CIRCLE_LABEL } from "@/lib/utils/skills/progression";
import type { ProgressionNode } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

export function nodeLabel(node: ProgressionNode, dto: CharacterProgressionDto): { title: string; tag: string; skillName: string | null } {
  const skillName = node.skillId ? (dto.skills[node.skillId]?.name ?? null) : null;

  switch (node.kind) {
    case "branchLevel": {
      const branch = dto.branches[node.branchId]?.name ?? node.branchId;

      return { title: node.level === "basic" ? `${branch} → Основи` : `${branch} → ${BRANCH_LEVEL_LABEL[node.level]}`, tag: "Підвищення гілки", skillName };
    }
    case "racial":
      return { title: skillName ?? `Расове · ${BRANCH_LEVEL_LABEL[node.level]}`, tag: `Расове · ${BRANCH_LEVEL_LABEL[node.level]}`, skillName };
    case "slot":
      return { title: skillName ?? "Невідомий скіл", tag: `Скіл · ${CIRCLE_LABEL[node.circle]}`, skillName };
    case "ultimate":
      return { title: skillName ?? "Ультимейт", tag: "Ультимейт", skillName };
  }
}

export function pointsText(free: number): string {
  const mod10 = free % 10;

  const mod100 = free % 100;

  const word = mod10 === 1 && mod100 !== 11 ? "вільне очко" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "вільні очки" : "вільних очок";

  return `${free} ${word}`;
}
```

`SlotButton.tsx` (одна клітинка; зона дотику 44 px):

```tsx
import { OptimizedImage } from "@/components/common/OptimizedImage";
import type { NodeState } from "@/lib/utils/skills/progression";

export function SlotButton({ state, label, icon, size, onSelect }: { state: NodeState; label: string; icon: string | null; size: 46 | 40; onSelect: () => void }) {
  const aria = state.state === "learned" ? label : state.state === "available" ? `Вивчити: ${label}` : `Закрито: ${label}`;

  const tone = state.state === "learned" ? "skill-slot learned" : state.state === "available" ? "skill-slot available" : "skill-slot locked";

  return (
    <button type="button" aria-label={aria} onClick={onSelect} disabled={!state.nodeId} className="flex min-h-11 min-w-11 items-center justify-center">
      <span className={tone} style={{ width: size, height: size }}>
        {state.state === "learned" && icon ? <OptimizedImage src={icon} alt="" width={size} height={size} className="h-full w-full object-cover" fallback={<span className="hud-sc">?</span>} /> : <span className="hud-sc">?</span>}
      </span>
    </button>
  );
}
```

`BranchRow.tsx` (макет B):

```tsx
import { SlotButton } from "./SlotButton";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { BRANCH_LEVEL_LABEL } from "@/lib/utils/skills/progression";
import type { BranchRow as Row, NodeState } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

const METAL = { basic: "metal-bronze", advanced: "metal-silver", expert: "metal-gold" } as const;

export function BranchRow({ row, dto, onSelect }: { row: Row; dto: CharacterProgressionDto; onSelect: (state: NodeState) => void }) {
  const branch = dto.branches[row.branchId];

  const label = (s: NodeState) => (s.nodeId ? (dto.skills[s.nodeId]?.name ?? "Невідомий скіл") : "Порожній слот");

  const icon = (s: NodeState) => (s.nodeId ? (dto.skills[s.nodeId]?.icon ?? branch?.icon ?? null) : null);

  const levelText = row.level ? BRANCH_LEVEL_LABEL[row.level] : "—";

  const slot = (size: 46 | 40) => (s: NodeState, i: number) => <SlotButton key={i} state={s} label={label(s)} icon={icon(s)} size={size} onSelect={() => onSelect(s)} />;

  return (
    <div role="group" aria-label={`${branch?.name ?? row.branchId} · ${levelText}`} className="flex items-center gap-2 border-b border-[rgba(230,220,203,.07)] px-4 py-2">
      <div className={`flex w-14 shrink-0 flex-col items-center gap-1 ${row.level ? METAL[row.level] : "metal-iron"}`}>
        <span className="branch-frame">
          {branch?.icon ? <OptimizedImage src={branch.icon} alt="" width={52} height={52} className="h-full w-full object-cover" fallback={<span className="hud-sc">{branch.name[0]}</span>} /> : <span className="hud-sc text-xl">{branch?.name[0] ?? "?"}</span>}
        </span>
        <span className="hud-sc text-[11px] text-[var(--m2)]">{levelText}</span>
      </div>
      <span aria-hidden className="text-[#6b5f50]">▸</span>
      <div className="flex flex-col gap-1">
        <div className="flex">{row.outer.map(slot(46))}</div>
        <div className="flex items-center">
          {row.middle.map(slot(40))}
          <span className="w-2" />
          {row.inner.map(slot(40))}
        </div>
      </div>
    </div>
  );
}
```

`RacialRow.tsx` — той самий патерн: іконка «Раса · {race}», 3 `SlotButton` (46 px); під закритим за рівнем — підпис `рівень 5+ / 10+ / 15+` з `RACIAL_MIN_LEVEL`. Для `racial` без скіла (`skillId === null`) `label` = `Расове · {BRANCH_LEVEL_LABEL}`.

`UltimateRow.tsx` — один `SlotButton` 46 px з підписом «Ультимейт»; рендериться, коли `view.ultimate` і (`state !== "locked"` або `canManage`).

`NewBranchRow.tsx`:

```tsx
export function NewBranchRow({ count, onSelect }: { count: number; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 px-4 py-2 text-left">
      <span className="branch-frame new hud-sc text-2xl">?</span>
      <span className="text-sm italic text-[#b8ab95]">Нова гілка — одна з {count} доступних</span>
    </button>
  );
}
```

`OfferList.tsx`:

```tsx
import { useState } from "react";

import { nodeLabel } from "./node-labels";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import type { ProgressionNode } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

export function OfferList({ offers, dto, filter, onClearFilter, onSelect }: { offers: ProgressionNode[]; dto: CharacterProgressionDto; filter: { label: string; match: (n: ProgressionNode) => boolean } | null; onClearFilter: () => void; onSelect: (node: ProgressionNode) => void }) {
  const [expanded, setExpanded] = useState(false);

  const list = filter ? offers.filter(filter.match) : offers;

  const shown = expanded || filter ? list : list.slice(0, 3);

  return (
    <section id="progression-offers" className="pb-2">
      <h3 className="hud-sc mx-4 mb-1.5 mt-3.5 text-[13px] uppercase tracking-[.12em] text-[#8f8473]">Вивчити (1 очко)</h3>
      {filter && (
        <button type="button" onClick={onClearFilter} className="mx-4 mb-2 rounded-full border border-[#4a4036] px-3 py-1 text-xs text-[#d6cbb7]">
          {filter.label} ✕
        </button>
      )}
      <ul aria-label="Вивчити" className="flex flex-col gap-2 px-4">
        {shown.map((node, i) => {
          const { title, tag } = nodeLabel(node, dto);

          const skill = node.skillId ? dto.skills[node.skillId] : undefined;

          const icon = skill?.icon ?? ("branchId" in node ? dto.branches[node.branchId]?.icon : null) ?? null;

          return (
            <li key={node.nodeId}>
              <button type="button" onClick={() => onSelect(node)} className={`offer-card ${i === 0 && !filter ? "top" : ""}`}>
                <span className="skill-slot learned" style={{ width: 48, height: 48 }}>
                  {icon ? <OptimizedImage src={icon} alt="" width={48} height={48} className="h-full w-full object-cover" fallback={<span className="hud-sc">?</span>} /> : <span className="hud-sc">?</span>}
                </span>
                <span className="min-w-0 text-left">
                  <span className="hud-sc block text-base text-[#efe5d2]">{title}</span>
                  <span className="block text-xs text-[#c9b37a]">{tag}</span>
                  {skill?.summary[0] && <span className="mt-1 block text-[13px] leading-snug text-[#b8ab95]">{skill.summary.join(" · ")}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!filter && !expanded && list.length > 3 && (
        <button type="button" onClick={() => setExpanded(true)} className="mx-4 mt-2 text-xs text-[#8f8473]">
          Ще {list.length - 3} варіантів ▾
        </button>
      )}
    </section>
  );
}
```

`NodeSheet.tsx`:

```tsx
import { nodeLabel } from "./node-labels";

import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { HUD_SURFACE } from "@/components/hud";
import { LEARN_BLOCK_TEXT } from "@/lib/utils/skills/progression";
import type { NodeState, ProgressionNode } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

export interface SheetTarget { node: ProgressionNode; state: NodeState["state"]; reason?: NodeState["reason"] }

export function NodeSheet({ target, dto, actions }: {
  target: SheetTarget | null;
  dto: CharacterProgressionDto;
  actions: { onClose: () => void; onLearn?: (nodeId: string) => void; onUnlearn?: (nodeId: string) => void; pending: boolean };
}) {
  if (!target) return null;

  const { node, state, reason } = target;

  const { title, tag, skillName } = nodeLabel(node, dto);

  const skill = node.skillId ? dto.skills[node.skillId] : undefined;

  const footer =
    state === "available" && actions.onLearn ? (
      <Button onClick={() => actions.onLearn!(node.nodeId)} disabled={actions.pending}>Вивчити</Button>
    ) : state === "learned" && actions.onUnlearn ? (
      <Button variant="outline" onClick={() => actions.onUnlearn!(node.nodeId)} disabled={actions.pending}>Розвчити</Button>
    ) : undefined;

  return (
    <ResponsiveDialog open onOpenChange={(open) => !open && actions.onClose()} title={title} description={tag} footer={footer} className={HUD_SURFACE}>
      {skill ? (
        <div className="space-y-2 text-sm">
          {skill.summary.length > 0 && <p className="text-[#c9b37a]">{skill.summary.join(" · ")}</p>}
          {skill.description && <p className="whitespace-pre-line">{skill.description}</p>}
        </div>
      ) : (
        !skillName && (node.kind === "branchLevel" || node.kind === "racial") && <p className="text-sm italic">Майстер ще не призначив скіл цьому рівню</p>
      )}
      {state === "locked" && reason && <p className="mt-3 text-sm text-[#d0705c]">{LEARN_BLOCK_TEXT[reason]}</p>}
    </ResponsiveDialog>
  );
}
```

`PointsHeader.tsx`:

```tsx
import { pointsText } from "./node-labels";

export function PointsHeader({ level, spent, free }: { level: number; spent: number; free: number }) {
  return (
    <header className="flex items-center justify-between border-b border-[rgba(230,220,203,.14)] px-4 py-3">
      <span className="hud-sc text-base text-[#efe5d2]">Прокачка · рівень {level}</span>
      <span className="flex items-center gap-2 text-sm text-[#b8ab95]">
        {free > 0 && <b className="hud-sc text-[#ffd9a8]">{pointsText(free)}</b>}
        <span>{spent} / {level}</span>
      </span>
    </header>
  );
}
```

`ProgressionPanel.tsx`:

```tsx
"use client";

import { useState } from "react";

import { BranchRow } from "./BranchRow";
import { NewBranchRow } from "./NewBranchRow";
import { NodeSheet, type SheetTarget } from "./NodeSheet";
import { OfferList } from "./OfferList";
import { PointsHeader } from "./PointsHeader";
import { RacialRow } from "./RacialRow";
import { UltimateRow } from "./UltimateRow";

import { EmptyState, QueryState } from "@/components/common/states";
import { HUD_SURFACE } from "@/components/hud";
import { useConfirm } from "@/lib/hooks/common";
import { useCharacterProgression, useProgressionActions } from "@/lib/hooks/skills";
import { canUnlearn, CIRCLE_LABEL } from "@/lib/utils/skills/progression";
import type { NodeState, ProgressionNode } from "@/lib/utils/skills/progression";

import "@/components/hud/hud.css";
import "./progression.css";

export function ProgressionPanel({ campaignId, characterId, canManage = false }: { campaignId: string; characterId: string; canManage?: boolean }) {
  const progression = useCharacterProgression(campaignId, characterId);

  const actions = useProgressionActions(campaignId, characterId);

  const confirm = useConfirm();

  const [target, setTarget] = useState<SheetTarget | null>(null);

  const [filter, setFilter] = useState<{ label: string; match: (n: ProgressionNode) => boolean } | null>(null);

  const { data, tree, view, offers } = progression;

  const select = (state: NodeState) => {
    const node = state.nodeId ? tree?.nodes.get(state.nodeId) : undefined;

    if (!node) return;

    if (state.state === "available" && node.kind === "slot") {
      const branch = data?.branches[node.branchId]?.name ?? "";

      setFilter({ label: `${branch} · ${CIRCLE_LABEL[node.circle]}`, match: (n) => n.nodeId === node.nodeId });
      document.getElementById("progression-offers")?.scrollIntoView({ behavior: "smooth" });

      return;
    }

    setTarget({ node, state: state.state, reason: state.reason });
  };

  const learn = async (nodeId: string) => {
    if (await actions.learn(nodeId)) {
      setTarget(null);
      setFilter(null);
    }
  };

  const unlearn = async (nodeId: string) => {
    if (await actions.unlearn(nodeId)) setTarget(null);
  };

  const reset = async () => {
    if (await confirm({ title: "Скинути дерево прокачки?", description: "Усі вивчені вміння персонажа буде знято.", confirmLabel: "Скинути", destructive: true })) await actions.reset();
  };

  return (
    <div id="progression" className={`${HUD_SURFACE} skill-progression overflow-hidden rounded-xl`}>
      <QueryState query={progression.query}>
        {(dto) =>
          !tree || !view ? (
            <EmptyState title={`Майстер ще не налаштував дерево для раси ${dto.race}`} />
          ) : (
            <>
              <PointsHeader level={dto.level} spent={view.points.spent} free={view.points.free} />
              <RacialRow states={view.racial} dto={dto} onSelect={select} />
              {view.branches.length > 0 && <h3 className="hud-sc mx-4 mb-1.5 mt-3.5 text-[13px] uppercase tracking-[.12em] text-[#8f8473]">Гілки</h3>}
              {view.branches.map((row) => <BranchRow key={row.branchId} row={row} dto={dto} onSelect={select} />)}
              {view.points.free > 0 && view.untouchedBranchCount > 0 && (
                <NewBranchRow count={view.untouchedBranchCount} onSelect={() => setFilter({ label: "Нові гілки", match: (n) => n.kind === "branchLevel" && n.level === "basic" })} />
              )}
              {view.ultimate && (view.ultimate.state !== "locked" || canManage) && <UltimateRow state={view.ultimate} dto={dto} onSelect={select} />}
              {view.points.free > 0 && <OfferList offers={offers} dto={dto} filter={filter} onClearFilter={() => setFilter(null)} onSelect={(node) => setTarget({ node, state: "available" })} />}
              {canManage && (
                <div className="flex flex-wrap gap-2 px-4 py-3">
                  {view.orphans.length > 0 && (
                    <button type="button" className="text-xs underline" onClick={async () => { for (const id of view.orphans) await actions.unlearn(id); }}>
                      Застарілі вузли: {view.orphans.length} · Прибрати
                    </button>
                  )}
                  <button type="button" className="text-xs text-[#d0705c] underline" onClick={reset}>Скинути дерево</button>
                </div>
              )}
              <NodeSheet
                target={target}
                dto={dto}
                actions={{
                  onClose: () => setTarget(null),
                  onLearn: learn,
                  onUnlearn: canManage && target && canUnlearn(tree, dto.unlocked, target.node.nodeId).ok ? unlearn : undefined,
                  pending: actions.pendingNodeId !== null,
                }}
              />
            </>
          )
        }
      </QueryState>
    </div>
  );
}
```

`progression.css` (класи з макета `player-table.html`):

```css
.skill-progression { background: radial-gradient(120% 80% at 50% 0, #1d1611, #0b0908); }
.skill-progression .skill-slot { display: flex; align-items: center; justify-content: center; overflow: hidden; background: radial-gradient(#2c2219, #0f0c09); color: #e8d6b0; box-shadow: inset 0 0 0 2px var(--m2, #b07842), 0 1px 3px #000; }
.skill-progression .skill-slot.available { background: rgba(255, 255, 255, 0.03); color: #ffd9a8; box-shadow: inset 0 0 0 1px #e6c25a, 0 0 8px rgba(230, 194, 90, 0.35); }
.skill-progression .skill-slot.locked { background: rgba(255, 255, 255, 0.03); color: #6b5f50; box-shadow: inset 0 0 0 1px #4a4036; opacity: 0.6; }
.skill-progression .branch-frame { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: radial-gradient(#3b2a1c, #14100c); color: #efe5d2; box-shadow: inset 0 0 0 3px var(--m2), inset 0 0 0 5px var(--m1), 0 2px 6px #000; }
.skill-progression .branch-frame.new { background: rgba(255, 255, 255, 0.03); color: #ffd9a8; box-shadow: inset 0 0 0 1px #e6c25a; }
.skill-progression .offer-card { display: flex; width: 100%; gap: 12px; padding: 10px 12px; background: rgba(20, 16, 12, 0.85); box-shadow: inset 0 0 0 1px rgba(230, 194, 90, 0.25); }
.skill-progression .offer-card.top { box-shadow: inset 0 0 0 1px #e6c25a, 0 0 12px rgba(230, 194, 90, 0.18); }
```

Підстановка: у `CharacterViewSingleCard.tsx` і `AbilitiesAccordion.tsx` замість `CharacterSkillTreeView` (+ кнопок «Зберегти дерево скілів» / «Скинути дерево прокачки») — `<ProgressionPanel campaignId={campaignId} characterId={characterId} canManage={isDM} />` (пробросити `characterId`/`isDM`, якщо компонент їх ще не має — з `character-view-client.tsx`). У `DmCharacterEditFormAccordion.tsx` — `<ProgressionPanel campaignId={id} characterId={characterId} canManage />` замість дерева й кнопки скидання. `git rm components/characters/abilities/CharacterSkillTreeView.tsx`.

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run components/skill-tree app/campaigns`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/skill-tree/progression components/skill-tree/__tests__/ProgressionPanel.test.tsx app/campaigns/\[id\]/character app/campaigns/\[id\]/dm/characters
git rm components/characters/abilities/CharacterSkillTreeView.tsx
git commit -m "feat(skill-tree): player progression panel — branch rows, offers, node sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Анімація нового рівня й бейдж «Є вільне очко»

**Files:**
- Create: `lib/hooks/skills/useLevelUpCelebration.ts`, `components/skill-tree/progression/{LevelUpOverlay.tsx,level-up.css}`
- Modify: `components/skill-tree/progression/index.ts`, `lib/hooks/skills/index.ts`, `app/campaigns/[id]/character/character-view-client.tsx` (оверлей + бейдж у шапці)
- Test: `components/skill-tree/__tests__/LevelUpOverlay.test.tsx`

**Interfaces:**
- Consumes: `useCharacterProgression`, `markLevelSeen` (Task 13).
- Produces: `useLevelUpCelebration(campaignId, characterId): { celebration: { from: number; to: number; free: number } | null; dismiss: () => void }`; `<LevelUpOverlay campaignId characterId name />`; `<FreePointBadge campaignId characterId />`.

- [ ] **Step 1: Тест, що падає**

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LevelUpOverlay } from "@/components/skill-tree/progression";
import * as api from "@/lib/api/character-progression";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/lib/api/character-progression");

let data: Record<string, unknown> | undefined;

vi.mock("@/lib/hooks/skills/useCharacterProgression", () => ({
  useCharacterProgression: () => ({ data, view: data ? { points: { free: 2 } } : null }),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.markLevelSeen).mockResolvedValue({ seenLevel: 5 });
});

const renderIt = () => render(<LevelUpOverlay campaignId="c" characterId="ch" name="Ельдріс" />);

describe("LevelUpOverlay", () => {
  it("власник, level > seenLevel → показ old → new, позначає seen одразу", () => {
    data = { level: 5, seenLevel: 3, isOwner: true };
    renderIt();

    expect(screen.getByRole("dialog", { name: "Новий рівень" })).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("2 вільні очки")).toBeTruthy();
    expect(api.markLevelSeen).toHaveBeenCalledWith("c", "ch");
  });

  it("тап закриває", () => {
    data = { level: 5, seenLevel: 3, isOwner: true };
    renderIt();
    fireEvent.click(screen.getByRole("dialog", { name: "Новий рівень" }));

    expect(screen.queryByRole("dialog", { name: "Новий рівень" })).toBeNull();
  });

  it("не власник, NULL або рівень не зріс — нічого", () => {
    for (const d of [{ level: 5, seenLevel: 3, isOwner: false }, { level: 5, seenLevel: null, isOwner: true }, { level: 5, seenLevel: 5, isOwner: true }]) {
      data = d;
      renderIt();
      expect(screen.queryByRole("dialog", { name: "Новий рівень" })).toBeNull();
      cleanup();
    }

    expect(api.markLevelSeen).not.toHaveBeenCalled();
  });
});
```

(`useLevelUpCelebration` імпортує `useCharacterProgression` відносно — `./useCharacterProgression` — тому мок шляху `@/lib/hooks/skills/useCharacterProgression` спрацює; QueryClient для `useQueryClient` у хуку — обгорнути `render` у `QueryClientProvider`, якщо хук його використовує.)

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run components/skill-tree/__tests__/LevelUpOverlay.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

`useLevelUpCelebration.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";

import { useCharacterProgression } from "./useCharacterProgression";

import { markLevelSeen } from "@/lib/api/character-progression";

export function useLevelUpCelebration(campaignId: string, characterId: string) {
  const { data, view } = useCharacterProgression(campaignId, characterId);

  const [celebration, setCelebration] = useState<{ from: number; to: number; free: number } | null>(null);

  const shownFor = useRef<number | null>(null);

  useEffect(() => {
    if (!data?.isOwner || data.seenLevel === null || data.level <= data.seenLevel || shownFor.current === data.level) return;

    shownFor.current = data.level;
    setCelebration({ from: data.seenLevel, to: data.level, free: view?.points.free ?? 0 });
    void markLevelSeen(campaignId, characterId).catch(() => {});
  }, [data, view, campaignId, characterId]);

  return { celebration, dismiss: () => setCelebration(null) };
}
```

`LevelUpOverlay.tsx`:

```tsx
"use client";

import { createPortal } from "react-dom";

import { pointsText } from "./node-labels";

import { HUD_SURFACE } from "@/components/hud";
import { useLevelUpCelebration } from "@/lib/hooks/skills";

import "./level-up.css";

export function LevelUpOverlay({ campaignId, characterId, name }: { campaignId: string; characterId: string; name: string }) {
  const { celebration, dismiss } = useLevelUpCelebration(campaignId, characterId);

  if (!celebration || typeof document === "undefined") return null;

  const toPanel = () => {
    dismiss();
    document.getElementById("progression")?.scrollIntoView({ behavior: "smooth" });
  };

  return createPortal(
    <div role="dialog" aria-label="Новий рівень" onClick={dismiss} className={`${HUD_SURFACE} level-up fixed inset-0 z-[100] flex flex-col items-center justify-center`}>
      <div className="lu-title hud-sc">НОВИЙ РІВЕНЬ</div>
      <div className="lu-name">{name}</div>
      <div className="lu-num">
        <div className="lu-rays" />
        <div className="lu-glow" />
        {[[-120, -90], [130, -70], [-90, 110], [100, 120], [0, -150], [-150, 10], [155, 20], [40, 150]].map(([x, y], i) => <i key={i} className="lu-spark" style={{ "--x": `${x}px`, "--y": `${y}px` } as React.CSSProperties} />)}
        <span className="lu-old hud-sc">{celebration.from}</span>
        <span className="lu-new hud-sc">{celebration.to}</span>
      </div>
      {celebration.free > 0 && (
        <div className="lu-info">
          <b className="hud-sc">{pointsText(celebration.free)}</b>
          <p>Можна вивчити нове вміння</p>
        </div>
      )}
      <button type="button" className="lu-cta hud-sc metal-gold metal-fill" onClick={(e) => { e.stopPropagation(); toPanel(); }}>До прокачки</button>
      <div className="lu-skip">торкніться, щоб закрити</div>
    </div>,
    document.body,
  );
}
```

`level-up.css` — перенести з `level-up-fx.html` блок стилів `.ttl/.nm/.num/.old/.new/.glow/.rays/.sp/.info/.cta/.skip` і `@keyframes fade/oldOut/newIn/burst/rays/spark` з префіксом `lu-` (`.level-up .lu-title { … animation: lu-fade .6s .1s forwards }` тощо; фон `.level-up { background: rgba(5,4,3,.92); }`; `.lu-cta { position: absolute; left: 24px; right: 24px; bottom: 40px; height: 52px; }`), плюс:

```css
@media (prefers-reduced-motion: reduce) {
  .level-up *, .level-up { animation: none !important; }
  .level-up .lu-old, .level-up .lu-rays, .level-up .lu-spark { display: none; }
  .level-up .lu-new, .level-up .lu-glow, .level-up .lu-title, .level-up .lu-name, .level-up .lu-info, .level-up .lu-cta, .level-up .lu-skip { opacity: 1; transform: none; }
}
```

`FreePointBadge` (у `components/skill-tree/progression/FreePointBadge.tsx`):

```tsx
"use client";

import { useCharacterProgression } from "@/lib/hooks/skills";

export function FreePointBadge({ campaignId, characterId }: { campaignId: string; characterId: string }) {
  const { view } = useCharacterProgression(campaignId, characterId);

  if (!view || view.points.free === 0) return null;

  return (
    <a href="#progression" className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-600 dark:text-amber-300">
      <span aria-hidden className="h-2 w-2 rotate-45 bg-amber-400" />
      Є вільне очко
    </a>
  );
}
```

`character-view-client.tsx`: рендерити `<LevelUpOverlay campaignId={campaignId} characterId={characterId} name={basicInfo.name} />` і `<FreePointBadge … />` поряд із заголовком/`CharacterHeroBlock`.

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run components/skill-tree`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/skills components/skill-tree/progression components/skill-tree/__tests__/LevelUpOverlay.test.tsx app/campaigns/\[id\]/character/character-view-client.tsx
git commit -m "feat(skill-tree): full-screen level-up celebration and free point badge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Хук редактора дерева DM

**Files:**
- Create: `lib/hooks/skills/useSkillTreeEditor.ts`
- Modify: `lib/hooks/skills/index.ts`
- Test: `lib/hooks/skills/__tests__/useSkillTreeEditor.test.tsx`

**Interfaces:**
- Consumes: `getSkillTrees`, `updateSkillTree` (Task 11), `useMainSkills`, `useSkills`, `useRaces`, `emptyTree`, `setCellSkill`, `addBranch`, `removeBranch`, `moveBranch`, `validateTree`, `skillLocations`, `readTreeJson`, `normalizeTree`; `createMainSkill` з `lib/api/main-skills`.
- Produces:

```ts
export function useSkillTreeEditor(campaignId: string): {
  races: Array<{ id: string; name: string }>;
  race: string | null;
  setRace: (race: string) => void;
  raw: RawTree | null;
  tree: TreeNodes | null;
  errors: TreeError[];
  dirty: boolean;
  saving: boolean;
  locations: Map<string, CellRef[]>;
  librarySkills: Array<{ id: string; name: string; icon: string | null; mainSkillId: string | null; summary: string[] }>;
  availableBranches: Array<{ id: string; name: string; color: string; icon: string | null }>;
  actions: {
    setCell: (ref: CellRef, skillId: string | null) => void;
    addBranch: (mainSkillId: string) => void;
    createBranch: (input: { name: string; color: string; icon?: string | null }) => Promise<void>;
    removeBranch: (branchId: string) => void;
    moveBranch: (branchId: string, dir: -1 | 1) => void;
    save: () => Promise<void>;
    cancel: () => void;
  };
};
```

- [ ] **Step 1: Тест, що падає (у т.ч. «рефетч не перезаписує правки» зі ЗМІНЕНИМ знімком)**

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as treesApi from "@/lib/api/skill-trees";
import { useSkillTreeEditor } from "@/lib/hooks/skills";
import { buildTreeJson } from "@/lib/utils/skills/progression";

vi.mock("@/lib/api/skill-trees");
vi.mock("@/lib/hooks/races", () => ({ useRaces: () => ({ data: [{ id: "r1", name: "Ельф", availableSkills: ["attack"] }] }) }));
vi.mock("@/lib/hooks/skills/useMainSkills", () => ({ useMainSkills: () => ({ data: [{ id: "attack", name: "Напад", color: "red" }, { id: "defense", name: "Захист", color: "blue" }] }) }));
vi.mock("@/lib/hooks/skills/useSkills", () => ({ useSkills: () => ({ data: [{ id: "o1", name: "Кровопуск", mainSkillId: "attack" }, { id: "o2", name: "Шквал", mainSkillId: "attack" }] }) }));
vi.mock("@/lib/hooks/common", () => ({ useNotify: () => vi.fn(), useConfirm: () => vi.fn(async () => true) }));

afterEach(cleanup);

const rowWith = (outer: string[]) => ({ id: "row", campaignId: "c", race: "Ельф", createdAt: "", skills: buildTreeJson({ id: "row", race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", outer }] }) });

function setup() {
  const qc = new QueryClient();

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { qc, ...renderHook(() => useSkillTreeEditor("c"), { wrapper }) };
}

describe("useSkillTreeEditor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("рефетч зі зміненим деревом не перезаписує незбережені правки", async () => {
    vi.mocked(treesApi.getSkillTrees).mockResolvedValue([rowWith(["o1"])] as never);

    const { qc, result } = setup();

    await waitFor(() => expect(result.current.tree?.grid.get("attack")?.outer[0]).toBe("o1"));

    act(() => result.current.actions.setCell({ kind: "slot", branchId: "attack", circle: "outer", index: 1 }, "o2"));

    vi.mocked(treesApi.getSkillTrees).mockResolvedValue([rowWith(["o1", "o1-changed-on-server"])] as never);
    await act(() => qc.invalidateQueries({ queryKey: ["skill-trees", "c"] }));
    await waitFor(() => expect(vi.mocked(treesApi.getSkillTrees)).toHaveBeenCalledTimes(2));

    expect(result.current.tree?.grid.get("attack")?.outer).toEqual(["o1", "o2", null]);
    expect(result.current.dirty).toBe(true);
  });

  it("без дерева — стартові гілки з race.availableSkills, збереження з id \"new\"", async () => {
    vi.mocked(treesApi.getSkillTrees).mockResolvedValue([] as never);
    vi.mocked(treesApi.updateSkillTree).mockResolvedValue({ id: "row", race: "Ельф", skills: buildTreeJson({ id: "row", race: "Ельф", branches: [] }) });

    const { result } = setup();

    await waitFor(() => expect(result.current.tree?.branches.map((b) => b.id)).toEqual(["attack"]));

    await act(() => result.current.actions.save());

    expect(vi.mocked(treesApi.updateSkillTree).mock.calls[0][0]).toMatchObject({ campaignId: "c", treeId: "new", race: "Ельф" });
  });

  it("дубль скіла дає помилку й блокує save", async () => {
    vi.mocked(treesApi.getSkillTrees).mockResolvedValue([rowWith(["o1"])] as never);

    const { result } = setup();

    await waitFor(() => expect(result.current.tree).not.toBeNull());

    act(() => result.current.actions.setCell({ kind: "level", branchId: "attack", level: "basic" }, "o1"));

    expect(result.current.errors).toContainEqual({ code: "duplicateSkill", ref: "o1" });

    await act(() => result.current.actions.save());
    expect(treesApi.updateSkillTree).not.toHaveBeenCalled();
  });

  it("add / move / remove гілки", async () => {
    vi.mocked(treesApi.getSkillTrees).mockResolvedValue([rowWith([])] as never);

    const { result } = setup();

    await waitFor(() => expect(result.current.availableBranches.map((b) => b.id)).toEqual(["defense"]));

    act(() => result.current.actions.addBranch("defense"));
    act(() => result.current.actions.moveBranch("defense", -1));
    expect(result.current.tree?.branches.map((b) => b.id)).toEqual(["defense", "attack"]);

    act(() => result.current.actions.removeBranch("attack"));
    expect(result.current.tree?.branches.map((b) => b.id)).toEqual(["defense"]);
  });
});
```

Після зеленого прогону — **мутант**: тимчасово прибрати захист «один раз на ключ» (див. `seededFor` нижче — заповнювати чернетку на кожну зміну `serverRaw`), запустити тест «рефетч…» — має впасти; повернути захист.

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run lib/hooks/skills/__tests__/useSkillTreeEditor.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

```ts
"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useMainSkills } from "./useMainSkills";
import { useSkills } from "./useSkills";

import { createMainSkill } from "@/lib/api/main-skills";
import { getSkillTrees, updateSkillTree } from "@/lib/api/skill-trees";
import { useNotify } from "@/lib/hooks/common";
import { useRaces } from "@/lib/hooks/races";
import * as edit from "@/lib/utils/skills/progression";
import type { CellRef, RawTree } from "@/lib/utils/skills/progression";

export function useSkillTreeEditor(campaignId: string) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const { data: races = [] } = useRaces(campaignId);

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const { data: skills = [] } = useSkills(campaignId);

  const trees = useQuery({ queryKey: ["skill-trees", campaignId], queryFn: () => getSkillTrees(campaignId), enabled: !!campaignId });

  const [race, setRace] = useState<string | null>(null);

  const [draft, setDraft] = useState<{ key: string; treeId: string; raw: RawTree } | null>(null);

  const [saving, setSaving] = useState(false);

  const activeRace = race ?? races[0]?.name ?? null;

  const serverRow = trees.data?.find((t) => t.race === activeRace) ?? null;

  const seedKey = activeRace && trees.isSuccess ? `${activeRace}:${serverRow?.id ?? "new"}` : null;

  // чернетка заповнюється із запиту один раз на (раса, id дерева); рефетч не перезаписує правки
  const current =
    draft && draft.key === seedKey
      ? draft
      : seedKey
        ? {
            key: seedKey,
            treeId: serverRow?.id ?? "new",
            raw: serverRow
              ? edit.readTreeJson(serverRow.skills)
              : edit.emptyTree(
                  activeRace!,
                  ((races.find((r) => r.name === activeRace)?.availableSkills as string[] | undefined) ?? [])
                    .map((id) => mainSkills.find((m) => m.id === id))
                    .filter((m): m is NonNullable<typeof m> => !!m)
                    .map((m) => ({ id: m.id, name: m.name, color: m.color, icon: m.icon ?? null, spellGroupId: m.spellGroupId ?? null })),
                ),
          }
        : null;

  const baseline = useMemo(() => (seedKey && serverRow ? JSON.stringify(edit.readTreeJson(serverRow.skills)) : null), [seedKey, serverRow]);

  const update = (fn: (raw: RawTree) => RawTree) => {
    if (current) setDraft({ ...current, raw: fn(current.raw) });
  };

  const raw = current?.raw ?? null;

  const tree = useMemo(() => (raw && current ? edit.normalizeTree({ id: current.treeId, race: activeRace ?? "", skills: raw }) : null), [raw, current, activeRace]);

  const errors = useMemo(
    () => (raw ? edit.validateTree(raw, { mainSkillIds: new Set(mainSkills.map((m) => m.id)), skillIds: new Set(skills.map((s) => s.id)) }) : []),
    [raw, mainSkills, skills],
  );

  const skillName = (s: (typeof skills)[number]) => (s as { basicInfo?: { name?: string } }).basicInfo?.name ?? s.name ?? s.id;

  const save = async () => {
    if (!current || !activeRace || errors.length > 0) return;

    setSaving(true);
    try {
      const saved = await updateSkillTree({ campaignId, treeId: current.treeId, race: activeRace, skills: current.raw });

      setDraft({ key: `${activeRace}:${saved.id}`, treeId: saved.id, raw: edit.readTreeJson(saved.skills) });
      await queryClient.invalidateQueries({ queryKey: ["skill-trees", campaignId] });
      void queryClient.invalidateQueries({ queryKey: ["character-progression", campaignId] });
    } catch (error) {
      await notify((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return {
    races: races.map((r) => ({ id: r.id, name: r.name })),
    race: activeRace,
    setRace: (next: string) => {
      setRace(next);
      setDraft(null);
    },
    raw,
    tree,
    errors,
    dirty: !!current && (baseline === null || (draft?.key === seedKey && JSON.stringify(current.raw) !== baseline)),
    saving,
    locations: raw ? edit.skillLocations(raw) : new Map<string, CellRef[]>(),
    librarySkills: skills.map((s) => ({ id: s.id, name: skillName(s), icon: s.icon ?? null, mainSkillId: s.mainSkillId ?? null, summary: (s as { abilitySummary?: string[] }).abilitySummary ?? [] })),
    availableBranches: mainSkills.filter((m) => !tree?.branches.some((b) => b.id === m.id)).map((m) => ({ id: m.id, name: m.name, color: m.color, icon: m.icon ?? null })),
    actions: {
      setCell: (ref: CellRef, skillId: string | null) => {
        const skill = skillId ? skills.find((s) => s.id === skillId) : null;

        update((r) => edit.setCellSkill(r, ref, skill ? { id: skill.id, name: skillName(skill), icon: skill.icon ?? null } : null));
      },
      addBranch: (mainSkillId: string) => {
        const m = mainSkills.find((x) => x.id === mainSkillId);

        if (m) update((r) => edit.addBranch(r, { id: m.id, name: m.name, color: m.color, icon: m.icon ?? null, spellGroupId: m.spellGroupId ?? null }));
      },
      createBranch: async (input: { name: string; color: string; icon?: string | null }) => {
        const created = await createMainSkill(campaignId, input);

        await queryClient.invalidateQueries({ queryKey: ["main-skills", campaignId] });
        update((r) => edit.addBranch(r, { id: created.id, name: created.name, color: created.color, icon: created.icon ?? null }));
      },
      removeBranch: (branchId: string) => update((r) => edit.removeBranch(r, branchId)),
      moveBranch: (branchId: string, dir: -1 | 1) => update((r) => edit.moveBranch(r, branchId, dir)),
      save,
      cancel: () => setDraft(null),
    },
  };
}
```

(Перевірити, як називається створення в `lib/api/main-skills.ts` (CRUD-фабрика: `mainSkillsApi.create`?) і поля `MainSkill`/`Skill` — `icon`, `spellGroupId`, `mainSkillId`, `abilitySummary` у відповіді `/skills`; підправити доступи без `as`, де тип дозволяє. `dirty` при порожньому дереві без серверного рядка — `true`, щоб DM міг зберегти стартові гілки.)

- [ ] **Step 4: Тести проходять + мутант**

Run: `pnpm test:run lib/hooks/skills`
Expected: PASS; з мутантом тест «рефетч…» FAIL; після відкату — PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/skills
git commit -m "feat(hooks): DM skill tree editor state seeded once per tree

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: UI редактора DM і сторінка

**Files:**
- Create: `components/skill-tree/editor/{SkillTreeEditor,EditorTable,EditorCell,SlotPicker,AddBranchSheet,index}.tsx|ts`, `components/skill-tree/editor/editor.css`
- Modify: `app/campaigns/[id]/dm/skill-trees/{page.tsx,page-client.tsx}`
- Test: `components/skill-tree/__tests__/SkillTreeEditor.test.tsx`

**Interfaces:**
- Consumes: `useSkillTreeEditor` (Task 17), `TREE_ERROR_TEXT`, `CellRef`, `cellSkillId`, `BRANCH_LEVEL_LABEL`, `CIRCLE_SIZE`.
- Produces: `<SkillTreeEditor campaignId />`.

- [ ] **Step 1: Тест, що падає**

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SkillTreeEditor } from "@/components/skill-tree/editor";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { buildTreeJson, normalizeTree } from "@/lib/utils/skills/progression";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

const actions = { setCell: vi.fn(), addBranch: vi.fn(), createBranch: vi.fn(), removeBranch: vi.fn(), moveBranch: vi.fn(), save: vi.fn(), cancel: vi.fn() };

const raw = buildTreeJson({ id: "row", race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", outer: ["o1"] }] });

let errors: Array<{ code: string; ref: string }> = [];

vi.mock("@/lib/hooks/skills", () => ({
  useSkillTreeEditor: () => ({
    races: [{ id: "r", name: "Ельф" }],
    race: "Ельф",
    setRace: vi.fn(),
    raw,
    tree: normalizeTree({ id: "row", skills: raw }),
    errors,
    dirty: true,
    saving: false,
    locations: new Map([["o1", [{ kind: "slot", branchId: "attack", circle: "outer", index: 0 }]]]),
    librarySkills: [{ id: "o1", name: "Кровопуск", icon: null, mainSkillId: "attack", summary: [] }, { id: "o2", name: "Шквал", icon: null, mainSkillId: "attack", summary: ["1/бій"] }, { id: "x", name: "Чужий", icon: null, mainSkillId: "defense", summary: [] }],
    availableBranches: [{ id: "defense", name: "Захист", color: "blue", icon: null }],
    actions,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  errors = [];
});

describe("SkillTreeEditor", () => {
  it("клітинка → пікер скілів гілки; вже використаний недоступний; «Поставити»", () => {
    renderWithConfirm(<SkillTreeEditor campaignId="c" />);
    fireEvent.click(screen.getByRole("button", { name: "Напад · Зовнішнє 2" }));

    const picker = screen.getByRole("dialog");

    expect(within(picker).queryByText("Чужий")).toBeNull();
    expect(within(picker).getByRole("option", { name: /Кровопуск/ }).getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(within(picker).getByRole("option", { name: /Шквал/ }));
    fireEvent.click(within(picker).getByRole("button", { name: "Поставити" }));

    expect(actions.setCell).toHaveBeenCalledWith({ kind: "slot", branchId: "attack", circle: "outer", index: 1 }, "o2");
  });

  it("«+ Додати гілку» → вибір існуючої", () => {
    renderWithConfirm(<SkillTreeEditor campaignId="c" />);
    fireEvent.click(screen.getByRole("button", { name: "+ Додати гілку" }));
    fireEvent.click(screen.getByRole("button", { name: "Захист" }));

    expect(actions.addBranch).toHaveBeenCalledWith("defense");
  });

  it("помилки валідації блокують «Зберегти»", () => {
    errors = [{ code: "duplicateSkill", ref: "o1" }];
    renderWithConfirm(<SkillTreeEditor campaignId="c" />);

    expect((screen.getByRole("button", { name: "Зберегти" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Цей скіл уже стоїть в іншому місці дерева/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Запустити — падає**

Run: `pnpm test:run components/skill-tree/__tests__/SkillTreeEditor.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Реалізація**

`EditorCell.tsx`:

```tsx
import { OptimizedImage } from "@/components/common/OptimizedImage";

export function EditorCell({ label, skill, metal, error, onClick }: { label: string; skill: { name: string; icon: string | null } | null; metal: string; error: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`editor-cell ${skill ? "" : "empty"} ${error ? "error" : ""}`}>
      {skill ? (
        <>
          <span className={`editor-icon ${metal}`}>{skill.icon ? <OptimizedImage src={skill.icon} alt="" width={40} height={40} className="h-full w-full object-cover" fallback={<span>?</span>} /> : <span className="hud-sc">{skill.name[0]}</span>}</span>
          <span className="editor-name">{skill.name}</span>
        </>
      ) : (
        <span aria-hidden>+</span>
      )}
    </button>
  );
}
```

`EditorTable.tsx` (заголовки й рядки з макета `dm-table.html`):

```tsx
import { EditorCell } from "./EditorCell";

import { BRANCH_LEVEL_LABEL, BRANCH_LEVELS, cellSkillId } from "@/lib/utils/skills/progression";
import type { CellRef, RawTree, TreeNodes } from "@/lib/utils/skills/progression";

const COLUMNS: Array<{ circle: "outer" | "middle" | "inner"; index: number; title: string }> = [
  { circle: "outer", index: 0, title: "Зовнішнє 1" },
  { circle: "outer", index: 1, title: "Зовнішнє 2" },
  { circle: "outer", index: 2, title: "Зовнішнє 3" },
  { circle: "middle", index: 0, title: "Середнє 1" },
  { circle: "middle", index: 1, title: "Середнє 2" },
  { circle: "inner", index: 0, title: "Внутрішнє" },
];

const LEVEL_METAL = { basic: "metal-bronze", advanced: "metal-silver", expert: "metal-gold" } as const;

const CIRCLE_METAL = { outer: "metal-bronze", middle: "metal-silver", inner: "metal-gold" } as const;

export function EditorTable({ raw, tree, skillsById, errorIds, actions }: {
  raw: RawTree;
  tree: TreeNodes;
  skillsById: Map<string, { name: string; icon: string | null }>;
  errorIds: Set<string>;
  actions: { onCell: (ref: CellRef, label: string) => void; onMove: (branchId: string, dir: -1 | 1) => void; onRemove: (branchId: string, name: string) => void; onAddBranch: () => void };
}) {
  const cell = (ref: CellRef, label: string, metal: string) => {
    const id = cellSkillId(raw, ref);

    return <EditorCell label={label} skill={id ? (skillsById.get(id) ?? { name: id, icon: null }) : null} metal={metal} error={!!id && errorIds.has(id)} onClick={() => actions.onCell(ref, label)} />;
  };

  return (
    <div className="editor-scroll">
      <table className="editor-table">
        <thead>
          <tr>
            <th>Гілка</th>
            {BRANCH_LEVELS.map((l) => <th key={l}>{BRANCH_LEVEL_LABEL[l]}</th>)}
            {COLUMNS.map((c) => <th key={c.title}>{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="editor-branch">Раса <small>рівень 5 / 10 / 15</small></th>
            {BRANCH_LEVELS.map((l) => <td key={l}>{cell({ kind: "racial", level: l }, `Раса · ${BRANCH_LEVEL_LABEL[l]}`, LEVEL_METAL[l])}</td>)}
            <td colSpan={COLUMNS.length} />
          </tr>
          {tree.branches.map((b, i) => (
            <tr key={b.id}>
              <th scope="row" className="editor-branch">
                <span>{b.name}</span>
                <span className="editor-branch-actions">
                  <button type="button" aria-label={`${b.name} вище`} disabled={i === 0} onClick={() => actions.onMove(b.id, -1)}>↑</button>
                  <button type="button" aria-label={`${b.name} нижче`} disabled={i === tree.branches.length - 1} onClick={() => actions.onMove(b.id, 1)}>↓</button>
                  <button type="button" aria-label={`Прибрати гілку ${b.name}`} onClick={() => actions.onRemove(b.id, b.name)}>✕</button>
                </span>
              </th>
              {BRANCH_LEVELS.map((l) => <td key={l}>{cell({ kind: "level", branchId: b.id, level: l }, `${b.name} · ${BRANCH_LEVEL_LABEL[l]}`, LEVEL_METAL[l])}</td>)}
              {COLUMNS.map((c) => <td key={c.title}>{cell({ kind: "slot", branchId: b.id, circle: c.circle, index: c.index }, `${b.name} · ${c.title}`, CIRCLE_METAL[c.circle])}</td>)}
            </tr>
          ))}
          <tr>
            <th scope="row" colSpan={1 + BRANCH_LEVELS.length + COLUMNS.length}>
              <button type="button" className="editor-add" onClick={actions.onAddBranch}>+ Додати гілку</button>
            </th>
          </tr>
          <tr>
            <th scope="row" className="editor-branch">Ультимейт <small>після 3 внутрішніх</small></th>
            <td colSpan={3}>{cell({ kind: "ultimate" }, "Ультимейт", "metal-mithril")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```

`SlotPicker.tsx`:

```tsx
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { HUD_SURFACE } from "@/components/hud";
import type { CellRef } from "@/lib/utils/skills/progression";

type LibrarySkill = { id: string; name: string; icon: string | null; mainSkillId: string | null; summary: string[] };

export function SlotPicker({ target, current, skills, usedAt, onPick, onClose }: {
  target: { ref: CellRef; label: string } | null;
  current: string | null;
  skills: LibrarySkill[];
  usedAt: (skillId: string) => string | null;
  onPick: (skillId: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const [all, setAll] = useState(false);

  const [selected, setSelected] = useState<string | null>(current);

  if (!target) return null;

  const { ref } = target;

  const byScope = (s: LibrarySkill) => {
    if (all || ref.kind === "ultimate") return true;

    if (ref.kind === "racial") return !s.mainSkillId;

    return s.mainSkillId === ref.branchId;
  };

  const list = skills.filter(byScope).filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={target.label}
      className={HUD_SURFACE}
      footer={
        <>
          <Button variant="outline" onClick={() => onPick(null)} disabled={!current}>Прибрати</Button>
          <Button onClick={() => selected && onPick(selected)} disabled={!selected || selected === current}>Поставити</Button>
        </>
      }
    >
      <input className="mb-2 h-9 w-full border border-[#4a4036] bg-transparent px-2" placeholder="Пошук…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <label className="mb-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> усі скіли</label>
      <ul role="listbox" aria-label="Скіли бібліотеки" className="max-h-80 overflow-y-auto">
        {list.map((s) => {
          const used = s.id !== current ? usedAt(s.id) : null;

          return (
            <li key={s.id} role="option" aria-selected={selected === s.id} aria-disabled={used ? "true" : "false"} onClick={() => !used && setSelected(s.id)} className={`picker-item ${selected === s.id ? "on" : ""} ${used ? "used" : ""}`}>
              <span className="font-medium">{s.name}</span>
              {s.summary.length > 0 && <span className="block text-xs opacity-70">{s.summary.join(" · ")}</span>}
              {used && <span className="text-[11px] text-[#b07842]">вже в {used}</span>}
            </li>
          );
        })}
      </ul>
    </ResponsiveDialog>
  );
}
```

`AddBranchSheet.tsx`:

```tsx
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

export function AddBranchSheet({ open, branches, actions }: {
  open: boolean;
  branches: Array<{ id: string; name: string; color: string }>;
  actions: { onClose: () => void; onAdd: (id: string) => void; onCreate: (input: { name: string; color: string }) => Promise<void> };
}) {
  const [name, setName] = useState("");

  const [color, setColor] = useState("#8a6414");

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => !o && actions.onClose()}
      title="Додати гілку"
      footer={<Button form="new-branch" type="submit" disabled={!name.trim()}>Створити нову</Button>}
    >
      <div className="flex flex-col gap-1">
        {branches.map((b) => (
          <button key={b.id} type="button" className="flex items-center gap-2 py-2 text-left" onClick={() => actions.onAdd(b.id)}>
            <span className="h-3 w-3 rounded-full" style={{ background: b.color }} />
            {b.name}
          </button>
        ))}
      </div>
      <form
        id="new-branch"
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await actions.onCreate({ name: name.trim(), color });
          setName("");
        }}
      >
        <Input placeholder="Назва нової гілки" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="color" aria-label="Колір" value={color} onChange={(e) => setColor(e.target.value)} />
      </form>
    </ResponsiveDialog>
  );
}
```

`SkillTreeEditor.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";

import { AddBranchSheet } from "./AddBranchSheet";
import { EditorTable } from "./EditorTable";
import { SlotPicker } from "./SlotPicker";

import { EmptyState } from "@/components/common/states";
import { HUD_SURFACE } from "@/components/hud";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { SelectItem } from "@/components/ui/select";
import { useConfirm } from "@/lib/hooks/common";
import { useSkillTreeEditor } from "@/lib/hooks/skills";
import { BRANCH_LEVEL_LABEL, cellSkillId, TREE_ERROR_TEXT } from "@/lib/utils/skills/progression";
import type { CellRef } from "@/lib/utils/skills/progression";

import "@/components/hud/hud.css";
import "./editor.css";

const refLabel = (ref: CellRef, branchName: (id: string) => string) => {
  switch (ref.kind) {
    case "ultimate": return "Ультимейт";
    case "racial": return `Раса · ${BRANCH_LEVEL_LABEL[ref.level]}`;
    case "level": return `${branchName(ref.branchId)} · ${BRANCH_LEVEL_LABEL[ref.level]}`;
    case "slot": return `${branchName(ref.branchId)} · ${ref.circle === "outer" ? "З" : ref.circle === "middle" ? "С" : "В"}${ref.index + 1}`;
  }
};

export function SkillTreeEditor({ campaignId }: { campaignId: string }) {
  const editor = useSkillTreeEditor(campaignId);

  const confirm = useConfirm();

  const [picking, setPicking] = useState<{ ref: CellRef; label: string } | null>(null);

  const [adding, setAdding] = useState(false);

  const skillsById = useMemo(() => new Map(editor.librarySkills.map((s) => [s.id, s])), [editor.librarySkills]);

  const errorIds = useMemo(() => new Set(editor.errors.map((e) => e.ref)), [editor.errors]);

  if (!editor.raw || !editor.tree) return <EmptyState title="Додайте расу, щоб налаштувати дерево" />;

  const branchName = (id: string) => editor.tree!.branches.find((b) => b.id === id)?.name ?? id;

  return (
    <div className={`${HUD_SURFACE} skill-tree-editor rounded-xl p-4`}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="hud-sc text-xl text-[#efe5d2]">Дерево прокачки</span>
        <SelectField value={editor.race ?? ""} onValueChange={editor.setRace} triggerClassName="w-40">
          {editor.races.map((r) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
        </SelectField>
        {editor.dirty && <span className="text-xs italic text-[#c9b37a]">Незбережені зміни</span>}
        <span className="flex-1" />
        <Button variant="outline" onClick={editor.actions.cancel} disabled={!editor.dirty}>Скасувати</Button>
        <Button onClick={() => void editor.actions.save()} disabled={!editor.dirty || editor.saving || editor.errors.length > 0}>Зберегти</Button>
      </div>
      {editor.errors.length > 0 && (
        <ul className="mb-3 text-sm text-[#d0705c]">
          {editor.errors.map((e) => <li key={`${e.code}:${e.ref}`}>{TREE_ERROR_TEXT[e.code]}: {skillsById.get(e.ref)?.name ?? e.ref}</li>)}
        </ul>
      )}
      <EditorTable
        raw={editor.raw}
        tree={editor.tree}
        skillsById={skillsById}
        errorIds={errorIds}
        actions={{
          onCell: (ref, label) => setPicking({ ref, label }),
          onMove: editor.actions.moveBranch,
          onRemove: async (branchId, name) => {
            if (await confirm({ title: `Прибрати гілку «${name}»?`, description: "Вивчені вузли цієї гілки в персонажів перестануть діяти.", confirmLabel: "Прибрати", destructive: true })) editor.actions.removeBranch(branchId);
          },
          onAddBranch: () => setAdding(true),
        }}
      />
      <SlotPicker
        key={picking ? JSON.stringify(picking.ref) : "none"}
        target={picking}
        current={picking ? cellSkillId(editor.raw, picking.ref) : null}
        skills={editor.librarySkills}
        usedAt={(id) => {
          const at = editor.locations.get(id)?.[0];

          return at ? refLabel(at, branchName) : null;
        }}
        onPick={(skillId) => {
          if (picking) editor.actions.setCell(picking.ref, skillId);
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
      <AddBranchSheet
        open={adding}
        branches={editor.availableBranches}
        actions={{
          onClose: () => setAdding(false),
          onAdd: (id) => {
            editor.actions.addBranch(id);
            setAdding(false);
          },
          onCreate: async (input) => {
            await editor.actions.createBranch(input);
            setAdding(false);
          },
        }}
      />
    </div>
  );
}
```

`editor.css` (з макета `dm-table.html`; sticky перша колонка, на < 768 px назви в клітинках ховаються):

```css
.skill-tree-editor { background: radial-gradient(120% 80% at 50% 0, #1d1611, #0b0908); }
.skill-tree-editor .editor-scroll { overflow-x: auto; }
.skill-tree-editor .editor-table { border-collapse: separate; border-spacing: 4px; min-width: 100%; }
.skill-tree-editor th { font-family: var(--font-hud-sc), serif; font-weight: 500; font-size: 13px; letter-spacing: 0.08em; color: #8f8473; text-align: left; padding: 2px 4px; }
.skill-tree-editor tbody th:first-child, .skill-tree-editor thead th:first-child { position: sticky; left: 0; z-index: 1; background: #0d0a08; }
.skill-tree-editor .editor-branch { min-width: 120px; color: #efe5d2; font-size: 15px; }
.skill-tree-editor .editor-branch small { display: block; font-family: var(--font-hud-sans), sans-serif; font-size: 11px; color: #8f8473; letter-spacing: 0; }
.skill-tree-editor .editor-branch-actions { display: flex; gap: 4px; margin-top: 2px; }
.skill-tree-editor .editor-branch-actions button { min-width: 28px; min-height: 28px; color: #b8ab95; }
.skill-tree-editor .editor-cell { height: 56px; width: 100%; min-width: 120px; display: flex; align-items: center; gap: 8px; padding: 6px; background: rgba(20, 16, 12, 0.8); box-shadow: inset 0 0 0 1px rgba(230, 220, 203, 0.1); text-align: left; }
.skill-tree-editor .editor-cell.empty { justify-content: center; color: #6b5f50; font-size: 20px; background: transparent; border: 1px dashed #4a4036; box-shadow: none; }
.skill-tree-editor .editor-cell.error { box-shadow: inset 0 0 0 2px #d0705c; }
.skill-tree-editor .editor-icon { width: 40px; height: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; background: radial-gradient(#2c2219, #0f0c09); color: #e8d6b0; box-shadow: inset 0 0 0 2px var(--m2); }
.skill-tree-editor .editor-name { font-size: 13px; line-height: 1.15; color: #d6cbb7; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.skill-tree-editor .editor-add { padding: 8px 0; color: #c9b37a; }
@media (max-width: 767px) {
  .skill-tree-editor .editor-cell { min-width: 56px; width: 56px; justify-content: center; }
  .skill-tree-editor .editor-name { display: none; }
}
.hud-surface .picker-item { padding: 8px 6px; border-bottom: 1px solid rgba(230, 220, 203, 0.07); cursor: pointer; }
.hud-surface .picker-item.on { background: rgba(230, 194, 90, 0.12); }
.hud-surface .picker-item.used { opacity: 0.45; cursor: not-allowed; }
```

`app/campaigns/[id]/dm/skill-trees/page.tsx` → лише перевірка DM (як зараз) і `<SkillTreePageClient campaignId={id} />`; `page-client.tsx`:

```tsx
"use client";

import { SkillTreeEditor } from "@/components/skill-tree/editor";

export function SkillTreePageClient({ campaignId }: { campaignId: string }) {
  return (
    <div className="container mx-auto max-w-7xl p-4">
      <SkillTreeEditor campaignId={campaignId} />
    </div>
  );
}
```

(Зберегти назву експорту, яку імпортує `page.tsx` зараз; прибрати серверне завантаження дерев/мок-фолбек — дані тягне хук.)

- [ ] **Step 4: Тести проходять**

Run: `pnpm test:run components/skill-tree`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/skill-tree/editor components/skill-tree/__tests__/SkillTreeEditor.test.tsx app/campaigns/\[id\]/dm/skill-trees
git commit -m "feat(skill-tree): DM tree editor table with slot picker and branch management

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Чистка — коло, старі хуки, мок-дерева, форми раси/гілки, друк

**Files:**
- Delete: `components/skill-tree/{core,elements,ui,utils}`, `lib/hooks/skills/{useSkillTreePage.ts,useSkillTreePage-handlers.ts,useSkillTreePage-tree.ts,useSkillTreePage-types.ts,useSkillTreeAssignment.ts,useSkillTreeClear.ts,useSkillTreeEnrichment.ts,useSkillTreeFilters.ts,useSkillTreeSave.ts}` (+ їхні тести), `lib/utils/skills/{skill-tree-mock.ts,skill-tree-positions.ts}`, `lib/types/skill-tree.ts`, `lib/types/main-skills.ts`
- Modify: `lib/hooks/skills/index.ts`, `types/skill-tree.ts` (лишити лише те, що ще імпортується — `SkillLevel` enum; прибрати `CentralSkill`, `centralSkills`, `CharacterSkillProgress`, `prerequisites`), імпорти `@/lib/types/skill-tree` → `@/types/skill-tree` (`balance-helpers.ts`, `dpr-by-main-skill.ts`, `types/battle.ts`, …), `components/races/RaceFormFields.tsx` (прибрати секцію чекбоксів гілок), `components/main-skills/MainSkillEditForm.tsx` (прибрати чекбокс `isEnableInSkillTree`), `app/campaigns/[id]/dm/print/skills/page-client.tsx`, `app/globals.css` (стилі кола, рядки ~276-326), `lib/schemas/prisma-json.ts` (одне джерело `SkillTreeProgress`), `docs/` контракт-міграції (список колонок), `ARCHITECTURE.md` (розділ про дерево, якщо є)
- Test: `app/campaigns/[id]/dm/print/__tests__/print-skills.test.ts` (якщо є тести друку — оновити)

- [ ] **Step 1: Видалити й прибрати імпорти**

```bash
git rm -r components/skill-tree/core components/skill-tree/elements components/skill-tree/ui components/skill-tree/utils
git rm lib/hooks/skills/useSkillTreePage.ts lib/hooks/skills/useSkillTreePage-handlers.ts lib/hooks/skills/useSkillTreePage-tree.ts lib/hooks/skills/useSkillTreePage-types.ts lib/hooks/skills/useSkillTreeAssignment.ts lib/hooks/skills/useSkillTreeClear.ts lib/hooks/skills/useSkillTreeEnrichment.ts lib/hooks/skills/useSkillTreeFilters.ts lib/hooks/skills/useSkillTreeSave.ts
git rm lib/utils/skills/skill-tree-mock.ts lib/utils/skills/skill-tree-positions.ts lib/types/skill-tree.ts lib/types/main-skills.ts
grep -rln "@/lib/types/skill-tree\|@/lib/types/main-skills" app components lib types scripts | xargs sed -i '' -e 's#@/lib/types/skill-tree#@/types/skill-tree#g' -e 's#@/lib/types/main-skills#@/types/main-skills#g'
grep -rn "useSkillTree\|skill-tree-mock\|skill-tree-positions\|CircularSkillTree\|getSkillRaces\|SkillTreeProgress = Record" app components lib scripts
```

Кожне знайдене посилання прибрати/замінити (`SkillTreeProgress` — імпорт з `@/lib/schemas/prisma-json`; `getSkillRaces` у `skill-helpers.ts` — видалити разом із тестом). Тести, що покривали видалені модулі (`useSkillTreeSave.test.tsx`, тести `skill-tree-mock`), — видалити.

- [ ] **Step 2: Друк скілів на `normalizeTree`**

У `print/skills/page-client.tsx` замість `buildSkillPositionMap`/`groupSkillsByLevel`:

```ts
const positions = useMemo(() => {
  const map = new Map<string, string>();

  for (const row of skillTrees) {
    const tree = normalizeTree(row);

    for (const node of tree.nodes.values()) {
      if (!node.skillId || map.has(node.skillId)) continue;

      map.set(node.skillId, node.kind === "branchLevel" ? `Рівень гілки · ${BRANCH_LEVEL_LABEL[node.level]}` : node.kind === "slot" ? CIRCLE_LABEL[node.circle] : node.kind === "racial" ? `Расове · ${BRANCH_LEVEL_LABEL[node.level]}` : "Ультимейт");
    }
  }

  return map;
}, [skillTrees]);
```

Групувати скіли гілки за `positions.get(skill.id) ?? "Без місця в дереві"` у порядку: рівні гілки, зовнішнє, середнє, внутрішнє, расові, ультимейт, без місця.

- [ ] **Step 3: Форми раси й гілки, CSS**

`RaceFormFields.tsx`: видалити блок вибору `availableSkills` (функція перемикання ~рядки 40-55 і розмітка чекбоксів ~90-105); поле лишається у formData як є (не відправляти змін). `MainSkillEditForm.tsx`: видалити чекбокс `isEnableInSkillTree` (~рядок 155) і його стан. `app/globals.css`: видалити правила кола (селектори, що згадують skill-tree / circular / sector — перевірити `grep -n "skill-tree\|circular\|sector" app/globals.css`).

- [ ] **Step 4: Документація**

У документі контракт-міграції (`grep -rln "контракт" docs | head`) додати: таблиця `character_skills`, `races.availableSkills`, `main_skills.isEnableInSkillTree`. У `ARCHITECTURE.md` (якщо описує дерево) — коротко: прокачка = `lib/utils/skills/progression`, маршрути `…/progression/*`, коло видалено.

- [ ] **Step 5: Повна перевірка**

Run: `pnpm lint && pnpm test:run && pnpm build`
Expected: 0 errors, усі тести PASS, білд зелений.

- [ ] **Step 6: Commit**

```bash
git add -A components/skill-tree lib/hooks/skills lib/utils/skills lib/types types app/campaigns/\[id\]/dm/print components/main-skills components/races/RaceFormFields.tsx app/globals.css lib/schemas docs ARCHITECTURE.md
git status --short | grep CreateRaceDialog   # має лишатися незакоміченим і не в індексі
git commit -m "chore(skill-tree): remove the Heroes 5 circle, mock trees and dead tree types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Фінальна перевірка — симуляція бою й браузер на 390 px

**Files:** —

- [ ] **Step 1: Тести й білд на гілці**

Run: `pnpm lint && pnpm test:run && pnpm build`
Expected: усе зелене.

- [ ] **Step 2: Симуляція бою (лише локальна БД)**

```bash
grep -E "^(DATABASE_URL|DIRECT_URL)=" .env.local   # localhost:54322
docker info >/dev/null 2>&1 || (open -a Docker && until docker info >/dev/null 2>&1; do sleep 2; done)
pnpm db:local && pnpm exec prisma migrate deploy && pnpm simulate-battle
```

Expected: 35/35.

- [ ] **Step 3: Браузер (Chrome-розширення), 390×844**

`pnpm dev` (у фоні); DM-логін; SIM-кампанія. Якщо вікно Chrome не стискається — `document.body.innerHTML=''` + iframe 390×844 з `location.href` того ж origin. Перші відкриття сторінок компілюються > 10 с — чекати.

1. `/campaigns/<sim>/dm/skill-trees`: таблиця, клітинка → шторка вибору, «+ Додати гілку», ↑↓, «Зберегти»; горизонтальний скрол лише в таблиці, перша колонка sticky.
2. `/campaigns/<sim>/dm/characters/<id>`: панель прокачки в DM-режимі — рядки B, «Розвчити», «Скинути дерево»; без горизонтального скролу сторінки.
3. Анімація: у локальній БД `UPDATE characters SET "seenLevel" = level - 1 WHERE id = '<персонаж DM, якщо є власний>'` → відкрити `/campaigns/<sim>/character` → оверлей; тап закриває, повторне відкриття — без оверлея. Якщо в DM немає власного персонажа — перевірити лише тестами (вигляд гравця — тестами).

Зробити скриншоти/GIF для звіту.

- [ ] **Step 4: Рев'ю гілки**

Одне незалежне рев'ю всієї гілки (opus) → фікси Critical/Important з тестом, що спершу падає → дрібниці в ledger → повторне рев'ю → мердж лише після «так» користувача; пуш — лише якщо тести на змердженому результаті зелені (`git merge … && pnpm test:run && git push`).
