# Етап 4c-1: класи й рівні — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ДМ створює класи 5e (кістка хітів, рятівні, тип заклинача, вміння за рівнями, підкласи) як контент кампанії; персонаж має один або кілька класів; HP, рятівні, слоти (зокрема пакт) і вміння рахуються від класів; кола заклинань 0–9; HOMM5 без змін.

**Architecture:** нова секція `rules.classes` (default вимкнено). Ресурс контенту `classes` (модель `GameClass`) повторює шлях раси через `CONTENT_RESOURCES` (REST, OpenAPI, MCP, бандл, синхронізація). Персонаж зберігає `classes: [{ classId, subclassId?, level }]`; похідні характеристики — чисті функції в `lib/utils/characters/classes/` і `lib/utils/spells/class-slots.ts`, спільні для листа, сервера й збирання учасника. Вміння класу — нове джерело здібностей `"class"` у `collectCharacterAbilities`.

**Tech Stack:** TypeScript strict, Prisma 6 (PostgreSQL), Zod 4, Vitest, Next.js route handlers, TanStack Query, React 19.

**Spec:** `docs/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md` (розділ «4c-1. Дизайн: класи й рівні»; загальні правила етапу 4 — контекст).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; основну папку не чіпати; БД лише `postgresql://postgres:postgres@localhost:54322/constructor`. Міграцію застосовувати `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy` (файл міграції створювати вручну або `prisma migrate diff`, **не** `migrate dev` проти чужих БД).
- **Нульова зміна поведінки HOMM5:** `rules = {}` або персонаж із порожнім `classes` → HP, слоти, здібності, рятівні, лог, споживання rng ідентичні. Наявні тести (до першого коміту цього плану) не редагувати, крім адитивних змін форми (`DEFAULT_RULES`, переліки ресурсів/таблиць бандла, межа розміру OpenAPI); падіння наявного тесту — баг нового коду.
- Міграція лише розширює схему: таблиця `classes` + `ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;` (перевіряє `prisma/__tests__/migrations-rls.test.ts`), колонка `characters.classes JSONB NOT NULL DEFAULT '[]'`.
- Здібності читаються лише через `lib/utils/abilities/read.ts`; бонуси — через `collectModifiers`/`runAbilities`. CRUD-логіка — у ресурсі/схемах/хелперах, не в `route.ts`.
- Компоненти не імпортують `@/lib/api/*`: `lib/api/<domain>.ts` → хук `lib/hooks/<domain>` → компонент. Ключі запитів — фабрики в `keys.ts`. Діалоги — `ResponsiveDialog hud`, кнопки в `footer` (`form="<id>"` для submit). Форми — `HudForm`/`HudTab`/`HudSection`; сторінки — `HudPage`/`HudPageHeader`/`HudCard`. Клієнтські модулі не тягнуть zod (`lib/__tests__/client-entry-imports.test.ts`).
- Тексти помилок API — у `lib/constants/api-errors.ts`, формат `{ error, issues? }`.
- UI/лог українською, ідентифікатори англійською; мінімум коментарів. ESLint: padding lines, `simple-import-sort`, `import/no-cycle`.
- Тести: `pnpm test:run <file>` / `pnpm test:related <files>` під час роботи; повний `pnpm test:run` — лише в задачі 11.
- Коміти з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; `.superpowers/` не комітити.

## Review Focus

1. **Персонаж без класів у кампанії з `classes.enabled`** — рахується рівно як HOMM (архетип, HP HOMM, слоти раси/збережені). Тест-якір у задачі 7.
2. **Невідомий `classId`/`subclassId`** (клас видалено синхронізацією) — запис пропускається в HP/слотах/вміннях, рівень лишається в сумі, нічого не падає; форма показує «Клас не знайдено — оберіть інший». Тести в задачах 3 і 7.
3. **Слот пакту не ламає HOMM-каст:** `spellSlotKey` повертає `"pact"` лише коли ключ `pact` існує; юніти — завжди `"universal"`. Тест у задачі 7.
4. **Гравець не змінює `classes`** через `PATCH` (як `level`/`archetype`), а `classes` при вимкнених правилах відхиляється 422. Тест у задачі 5.
5. **Підклас раніше `subclassLevel`** — відмова 422 у PATCH і level-up; підклас, що не належить класу, — 422. Тести в задачах 5 і 6.

---

## Карта файлів

| Файл | Відповідальність |
|---|---|
| `lib/utils/rules/{schema,defaults,registry}.ts`, `components/rules/sections/ClassesSection.tsx`, `RulesForm.tsx` | секція `classes` |
| `lib/schemas/spells.ts`, `lib/utils/spells/model/form.ts`, `components/spells/form/spell-form-defaults.ts`, `components/spells/book/LevelBookmarks.tsx`, `lib/utils/battle/view/hero.ts`, `components/battle/hud/SlotGrid.tsx`, `components/hud/metal.ts`, `components/hud/hud.css`, `lib/utils/spells/spell-slots.ts` | кола 0–9 |
| `types/classes.ts` | `ClassCaster`, `ClassFeature`, `Subclass`, `GameClassData`, `CharacterClassEntry` |
| `lib/utils/spells/class-slots.ts` | таблиці 5e, `casterLevel`, `classSpellSlots` |
| `lib/utils/characters/classes/{hp,saves,derive,index}.ts` | HP за кістками, рятівні, характеристика заклинань, підписи, кістки хітів |
| `prisma/schema.prisma`, `prisma/migrations/2026102200…_classes/migration.sql` | модель `GameClass`, `Character.classes` |
| `lib/schemas/classes.ts` (+ `lib/schemas/index.ts`) | Zod класу і `classes` персонажа |
| `lib/server/content/resources/classes.ts`, `resources/index.ts`, `define-resource.ts`, `lib/cache/{tags,reference-data}.ts`, `app/api/campaigns/[id]/classes/{route.ts,[classId]/route.ts}` | ресурс контенту |
| `lib/constants/source-sync.ts`, `lib/server/templates/bundle.ts` | бандл і синхронізація |
| `lib/server/characters/apply-classes.ts`, `app/api/campaigns/[id]/characters/{create-character-schema.ts,create-character.ts,[characterId]/update-character-schema.ts,[characterId]/patch-character.ts}` | `classes` персонажа на сервері |
| `app/api/campaigns/[id]/characters/[characterId]/level-up/route.ts`, `lib/utils/characters/level-up/class-level-up.ts` | підвищення рівня класу |
| `types/abilities.ts`, `lib/utils/abilities/read.ts`, `lib/utils/abilities/build/collect.ts`, `lib/utils/abilities/schema/ability.ts`, `lib/utils/abilities/engine/core/usage.ts`, `lib/utils/abilities/registry/labels.ts`, `components/abilities/sections/LimitsSection.tsx` | вміння класу, `perRest` |
| `lib/utils/battle/types/participant.ts`, `start/start-build-context.ts`, `participant/load-character-context.ts`, `participant/from-character.ts`, `participant/from-character-spell-slots.ts`, `participant/load-classes.ts`, `lib/utils/battle/spell/slot.ts` | бій |
| `lib/api/classes.ts`, `lib/hooks/classes/*`, `components/classes/*`, `app/campaigns/[id]/dm/classes/*`, `app/campaigns/[id]/page.tsx`, `components/layout/{Breadcrumbs,screen-background}.tsx` | UI класів |
| `components/characters/basic/CharacterClassesField.tsx`, `CharacterBasicInfo.tsx`, `components/character-profile/{LevelUpAction,ClassLevelUpDialog,MagicTab}.tsx`, `lib/utils/characters/sheet/build-sheet.ts`, `components/characters/stats/CharacterHpPreview.tsx` | UI персонажа |

---

### Task 1: Секція правил `classes`

**Files:** modify `lib/utils/rules/schema.ts` (секція в `sections`, `RulesetSchema`, `RulesetPatchSchema`), `defaults.ts`, `registry.ts`; create `components/rules/sections/ClassesSection.tsx` (за зразком `ActionsSection.tsx`); modify `components/rules/RulesForm.tsx`; extend `lib/utils/rules/__tests__/schema.test.ts` (адитивно — очікуваний `DEFAULT_RULES`); create `lib/utils/rules/__tests__/schema-4c1.test.ts`.

**Interfaces — Produces:** `Ruleset["classes"] = { enabled: boolean }`; `MECHANIC_REGISTRY.classes = { label: "Класи", description: "Клас і підклас персонажа як контент кампанії: кістка хітів, рятівні кидки, тип заклинача, вміння за рівнями; мультиклас. HP — середнє за кістками, слоти — за таблицею мультикласу 5e і пакт. Персонаж без класів рахується як зараз." }`.

- [ ] **Step 1: Failing test** (`schema-4c1.test.ts`)

```ts
import { describe, expect, it } from "vitest";

import { DEFAULT_RULES, mergeRules, parseRules, RulesetPatchSchema } from "@/lib/utils/rules";

describe("rules.classes", () => {
  it("defaults to disabled", () => {
    expect(DEFAULT_RULES.classes).toEqual({ enabled: false });
    expect(parseRules({}).classes).toEqual({ enabled: false });
  });

  it("falls back to default on invalid section", () => {
    expect(parseRules({ classes: { enabled: "yes" } }).classes).toEqual({ enabled: false });
  });

  it("patches enabled", () => {
    const patch = RulesetPatchSchema.parse({ classes: { enabled: true } });
    const merged = mergeRules(DEFAULT_RULES, patch);

    expect(merged.ok && merged.rules.classes.enabled).toBe(true);
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/rules/__tests__/schema-4c1.test.ts` → FAIL.
- [ ] **Step 3:** у `sections` додати `classes: z.strictObject({ enabled: z.boolean().default(false) })`; у `RulesetSchema` — `classes: sections.classes.prefault({})`; у `RulesetPatchSchema` — `classes: patchSection("classes").optional()`; `DEFAULT_RULES` (якщо будується вручну — додати); рядок `MECHANIC_REGISTRY`. `ClassesSection` — перемикач «Увімкнути класи 5e» з описом із реєстру; підключити в `RulesForm` поруч з `ActionsSection`.
- [ ] **Step 4:** `pnpm test:run lib/utils/rules components/rules` → PASS (оновити очікування в `schema.test.ts`, якщо воно перелічує секції; також перевірити `lib/server/templates/sync/__tests__` на перелік механік — адитивно).
- [ ] **Step 5:** commit `feat(constructor): rules.classes section`.

---

### Task 2: Кола заклинань 0–9

**Files:** modify `lib/schemas/spells.ts` (:12 `level` 0–9; :31 `createSpellSchema` `level` **0**–9), `lib/utils/spells/model/form.ts:53-55` (прибрати примусове `max(1, level)` — коло 0 дозволене), `components/spells/form/spell-form-defaults.ts:12-13` (опції 0–9), `components/spells/book/LevelBookmarks.tsx:5` (`LEVELS` 0–9, закладка показується лише якщо є заклинання цього кола — перевірити поточну поведінку, не додавати порожніх закладок, яких раніше не було), `lib/utils/battle/view/hero.ts:17-31`, `components/battle/hud/SlotGrid.tsx`, `components/hud/metal.ts:7`, `components/hud/hud.css:22-32`, `lib/utils/spells/spell-slots.ts:156` (`calculateSpellSlotGain` — цикл до 9); tests: create `lib/utils/battle/view/__tests__/hero-slots-9.test.ts`, extend `lib/schemas/__tests__` (або створити `lib/schemas/__tests__/spells-levels.test.ts`).

Не змінювати: `lib/schemas/races.ts` (прогресія раси 1–5), `FULL_CASTER_CURVE`, `spell-learning-internals.ts` — це дані HOMM.

**Interfaces — Produces:**
- `SpellTier` += `"adamant" | "orichalcum" | "starmetal" | "void"` (кола 6–9); `spellTier(level)` clamp до 9.
- `slotLevels(p): { level: SlotLevel; max; current }[]`, де `type SlotLevel = 1|2|3|4|5|6|7|8|9`: кола 1–5 — завжди (як зараз), 6–9 — лише якщо `max > 0`.
- `pactSlot(p): { level: number; max: number; current: number } | null` — з `p.spellcasting.spellSlots.pact` (див. задачу 7).

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/battle/view/__tests__/hero-slots-9.test.ts
import { describe, expect, it } from "vitest";

import { pactSlot, slotLevels, spellTier } from "@/lib/utils/battle/view/hero";
import type { BattleParticipant } from "@/types/battle";

const withSlots = (spellSlots: Record<string, { max: number; current: number; level?: number }>) =>
  ({ spellcasting: { spellSlots } }) as unknown as BattleParticipant;

describe("slot levels 0–9", () => {
  it("keeps levels 1–5 always (HOMM unchanged)", () => {
    expect(slotLevels(withSlots({})).map((s) => s.level)).toEqual([1, 2, 3, 4, 5]);
  });

  it("adds 6–9 only when they have slots", () => {
    const levels = slotLevels(withSlots({ "6": { max: 1, current: 1 }, "9": { max: 1, current: 0 } })).map((s) => s.level);

    expect(levels).toEqual([1, 2, 3, 4, 5, 6, 9]);
  });

  it("tiers clamp at 9", () => {
    expect(spellTier(5)).toBe("platinum");
    expect(spellTier(9)).not.toBe(spellTier(5));
    expect(spellTier(12)).toBe(spellTier(9));
  });

  it("reads pact slot", () => {
    expect(pactSlot(withSlots({ pact: { level: 3, max: 2, current: 1 } }))).toEqual({ level: 3, max: 2, current: 1 });
    expect(pactSlot(withSlots({}))).toBeNull();
  });
});
```

```ts
// lib/schemas/__tests__/spells-levels.test.ts — використати наявні фабрики/мінімальне тіло з чинних тестів createSpellSchema
it("accepts cantrip and 9th circle on create", () => { /* createSpellSchema.safeParse({...minimal, level: 0}).success === true; level: 9 → true; level: 10 → false */ });
```

- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** реалізація: `TIERS` з 10 елементів, `spellTier` → `TIERS[Math.max(0, Math.min(9, level))]`; `slotLevels` за правилом вище; `pactSlot`; `spellLevelMetal` clamp 9 (метали 6–9 — нові, підібрати в `metal.ts` поруч з наявними); `.circle-6…9` у `hud.css` за зразком `.circle-5` (кольори з `metal.ts`); `SlotGrid` рендерить масив з `slotLevels` + рядок «Пакт · коло N» з `pactSlot`, якщо є; `calculateSpellSlotGain` — `level <= 9` (для HOMM ключі 6–9 ніколи не мають слотів — перевірити, що результат для HOMM-прогресії не отримує нових ключів; якщо отримує нульові — фільтрувати нулі).
- [ ] **Step 4:** `pnpm test:related lib/utils/battle/view/hero.ts lib/schemas/spells.ts lib/utils/spells/spell-slots.ts lib/utils/spells/model/form.ts components/battle/hud/SlotGrid.tsx` → PASS (наявні тести без змін).
- [ ] **Step 5:** commit `feat(constructor): spell circles 0–9`.

---

### Task 3: Типи класу, таблиці слотів 5e і похідні характеристики

**Files:** create `types/classes.ts`, `lib/utils/spells/class-slots.ts`, `lib/utils/characters/classes/{hp.ts,saves.ts,derive.ts,index.ts}`; tests `lib/utils/spells/__tests__/class-slots.test.ts`, `lib/utils/characters/classes/__tests__/classes.test.ts`.

**Interfaces — Produces:**

```ts
// types/classes.ts
import type { AbilityKey } from "@/lib/constants/abilities";
import type { Ability } from "@/types/abilities";

export type ClassCaster = "none" | "full" | "half" | "third" | "pact";
export type HitDie = 6 | 8 | 10 | 12;
export interface ClassFeature { level: number; abilities: Ability[] }
export interface Subclass { id: string; name: string; features: ClassFeature[] }
export interface GameClassData {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  hitDie: HitDie;
  savingThrows: AbilityKey[];
  proficiencies: { armor: string[]; weapons: string[]; tools: string[] };
  skillChoices: { count: number; from: string[] };
  caster: ClassCaster;
  spellcastingAbility: AbilityKey | null;
  features: ClassFeature[];
  subclassLevel: number | null;
  subclasses: Subclass[];
}
export interface CharacterClassEntry { classId: string; subclassId?: string | null; level: number }
/** запис персонажа з розв'язаним класом; class === null — клас не знайдено */
export interface ResolvedClassEntry extends CharacterClassEntry { class: GameClassData | null; subclass: Subclass | null }
```

```ts
// lib/utils/spells/class-slots.ts
export type ClassSlots = Record<string, { max: number }> & { pact?: { level: number; max: number } };
export function casterLevel(entries: ResolvedClassEntry[]): number;
export function classSpellSlots(entries: ResolvedClassEntry[]): ClassSlots; // ключі "1".."9" лише з max > 0
export function resolveClassEntries(entries: CharacterClassEntry[], classesById: Record<string, GameClassData>): ResolvedClassEntry[];
```

```ts
// lib/utils/characters/classes
export function classHp(entries: ResolvedClassEntry[], constitution: number): number;
export function classSaves(entries: ResolvedClassEntry[], manual: unknown): AbilityKey[]; // об'єднання, порядок ABILITY_KEYS
export function classSpellcastingAbility(entries: ResolvedClassEntry[], manual: string | null): AbilityKey | null;
export function classesLabel(entries: ResolvedClassEntry[]): string;      // «Воїн 5 / Чарівник 2»; невідомий — пропуск
export function subclassesLabel(entries: ResolvedClassEntry[]): string | null; // «Чемпіон» / «Чемпіон, Пакт клинка» / null
export function hitDiceLabel(entries: ResolvedClassEntry[]): string;     // «5d10 + 2d6»
export function classTotalLevel(entries: CharacterClassEntry[]): number; // сума всіх, і невідомих теж
```

Таблиці (PHB 2014):
- мультиклас (рівень заклинача 1–20 → кола 1–9): 1:[2] 2:[3] 3:[4,2] 4:[4,3] 5:[4,3,2] 6:[4,3,3] 7:[4,3,3,1] 8:[4,3,3,2] 9:[4,3,3,3,1] 10:[4,3,3,3,2] 11–12:[4,3,3,3,2,1] 13–14:[4,3,3,3,2,1,1] 15–16:[4,3,3,3,2,1,1,1] 17:[4,3,3,3,2,1,1,1,1] 18:[4,3,3,3,3,1,1,1,1] 19:[4,3,3,3,3,2,1,1,1] 20:[4,3,3,3,3,2,2,1,1];
- пакт (рівень у класі `pact` → `{ max, level }`): 1:{1,1} 2:{2,1} 3–4:{2,2} 5–6:{2,3} 7–8:{2,4} 9–10:{2,5} 11–16:{3,5} 17–20:{4,5};
- `casterLevel`: лише записи з `class !== null`, тип `full|half|third`. Якщо такий запис один — `full` = рівень, `half` = рівень ≥ 2 ? ⌈рівень/2⌉ : 0, `third` = рівень ≥ 3 ? ⌈рівень/3⌉ : 0. Якщо кілька — Σ (`full` рівень, `half` ⌊/2⌋, `third` ⌊/3⌋). Межа 20.
- `classHp`: записи з `class !== null`; перший такий запис у порядку масиву — стартовий: його 1-й рівень = `hitDie + mod`, інші рівні = `hitDie/2 + 1 + mod`; кожен рівень мінімум 1. `mod = getAbilityModifier(constitution)` (`lib/utils/common/calculations.ts`). Порожній список → 0.
- `classSaves`: `savingThrows` першого розв'язаного запису ∪ ключі `manual` (`Record<string, boolean>`) зі значенням `true`.
- `classSpellcastingAbility`: `manual`, якщо він у `ABILITY_KEYS`; інакше `spellcastingAbility` першого розв'язаного класу з `caster !== "none"`; інакше `null`.

- [ ] **Step 1: Failing tests** (мінімум; `cls(...)` — локальна фабрика `GameClassData`)

```ts
// class-slots.test.ts
it("full caster 5 → 4/3/2", () => expect(classSpellSlots([e(cls({ caster: "full" }), 5)])).toEqual({ "1": { max: 4 }, "2": { max: 3 }, "3": { max: 2 } }));
it("single half caster rounds up from level 2", () => {
  expect(casterLevel([e(cls({ caster: "half" }), 1)])).toBe(0);
  expect(casterLevel([e(cls({ caster: "half" }), 5)])).toBe(3);
});
it("single third caster rounds up from level 3", () => {
  expect(casterLevel([e(cls({ caster: "third" }), 2)])).toBe(0);
  expect(casterLevel([e(cls({ caster: "third" }), 4)])).toBe(2);
});
it("multiclass sums with floor", () => expect(casterLevel([e(cls({ caster: "full" }), 3), e(cls({ caster: "half" }), 3), e(cls({ caster: "third" }), 3)])).toBe(5));
it("non-caster + one half caster uses single-class rounding", () => expect(casterLevel([e(cls({ caster: "none" }), 5), e(cls({ caster: "half" }), 3)])).toBe(2));
it("pact is separate", () => expect(classSpellSlots([e(cls({ caster: "pact" }), 5), e(cls({ caster: "full" }), 2)])).toEqual({ "1": { max: 3 }, pact: { level: 3, max: 2 } }));
it("level 20 full caster has 9th circle", () => expect(classSpellSlots([e(cls({ caster: "full" }), 20)])["9"]).toEqual({ max: 1 }));
it("unknown class is skipped", () => expect(classSpellSlots([{ classId: "x", level: 5, class: null, subclass: null }])).toEqual({}));
```

```ts
// classes.test.ts
it("hp: first level max die, then average", () => expect(classHp([e(cls({ hitDie: 10 }), 3)], 14)).toBe(10 + 2 + 2 * (6 + 2)));
it("hp: multiclass — only the first class gets max die", () => expect(classHp([e(cls({ hitDie: 10 }), 1), e(cls({ hitDie: 6 }), 2)], 10)).toBe(10 + 4 + 4));
it("hp: at least 1 per level", () => expect(classHp([e(cls({ hitDie: 6 }), 3)], 1)).toBe(3));
it("hp: unknown class contributes nothing", () => expect(classHp([{ classId: "x", level: 4, class: null, subclass: null }], 10)).toBe(0));
it("saves: union of first class and manual", () => expect(classSaves([e(cls({ savingThrows: ["strength", "constitution"] }), 1), e(cls({ savingThrows: ["wisdom", "charisma"] }), 1)], { dexterity: true, wisdom: false })).toEqual(["strength", "dexterity", "constitution"]));
it("spellcasting ability falls back to first caster class", () => expect(classSpellcastingAbility([e(cls({ caster: "none" }), 1), e(cls({ caster: "pact", spellcastingAbility: "charisma" }), 1)], null)).toBe("charisma"));
it("labels", () => {
  expect(classesLabel([e(cls({ name: "Воїн" }), 5), e(cls({ name: "Чарівник" }), 2)])).toBe("Воїн 5 / Чарівник 2");
  expect(hitDiceLabel([e(cls({ hitDie: 10 }), 5), e(cls({ hitDie: 6 }), 2)])).toBe("5d10 + 2d6");
});
it("total level counts unknown classes", () => expect(classTotalLevel([{ classId: "a", level: 3 }, { classId: "gone", level: 2 }])).toBe(5));
it("resolve drops subclass not belonging to class", () => { /* resolveClassEntries з subclassId, якого немає в class.subclasses → subclass: null */ });
```

- [ ] **Step 2:** FAIL. **Step 3:** реалізація. **Step 4:** PASS.
- [ ] **Step 5:** commit `feat(constructor): class slots and derived stats`.

---

### Task 4: Модель `GameClass`, міграція, Zod, ресурс контенту, бандл

**Files:**
- `prisma/schema.prisma`: модель

```prisma
model GameClass {
  id                  String   @id @default(cuid())
  campaignId          String
  name                String
  icon                String?
  color               String?
  hitDie              Int      @default(8)
  savingThrows        Json     @default("[]")
  proficiencies       Json     @default("{}")
  skillChoices        Json     @default("{}")
  caster              String   @default("none")
  spellcastingAbility String?
  features            Json     @default("[]")
  subclassLevel       Int?
  subclasses          Json     @default("[]")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  sourceId            String?
  sourceHash          String?
  campaign            Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([campaignId, name])
  @@map("classes")
}
```
  + `classes GameClass[]` у `Campaign`; у `Character` — `classes Json @default("[]")`.
- `prisma/migrations/20261022120000_classes/migration.sql` (згенерувати `pnpm exec prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` на БД `constructor` до зміни схеми, або написати вручну) + рядок `ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;`. Застосувати `migrate deploy` (див. Global Constraints), `pnpm exec prisma generate`.
- create `lib/schemas/classes.ts` (+ експорт у `lib/schemas/index.ts`):

```ts
const featureSchema = z.object({ level: z.number().int().min(1).max(20), abilities: AbilitiesSchema });
const subclassSchema = z.object({ id: z.string().min(1).max(40), name: z.string().trim().min(1).max(100), features: z.array(featureSchema).max(20).default([]) });
export const createClassSchema = z.object({
  name: z.string().trim().min(1).max(100),
  icon: /* як raceIconSchema */, color: /* як raceColorSchema */,
  hitDie: z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]).default(8),
  savingThrows: z.array(z.enum(ABILITY_KEYS)).max(6).default([]),
  proficiencies: z.object({ armor: z.array(z.string().max(60)).max(20).default([]), weapons: …, tools: … }).prefault({}),
  skillChoices: z.object({ count: z.number().int().min(0).max(18).default(0), from: z.array(z.enum(DND_SKILLS)).default([]) }).prefault({}),
  caster: z.enum(["none", "full", "half", "third", "pact"]).default("none"),
  spellcastingAbility: z.enum(ABILITY_KEYS).nullable().default(null),
  features: z.array(featureSchema).max(40).default([]),
  subclassLevel: z.number().int().min(1).max(20).nullable().default(null),
  subclasses: z.array(subclassSchema).max(20).default([]),
}).refine((c) => new Set(c.subclasses.map((s) => s.id)).size === c.subclasses.length, { message: "Повторюваний id підкласу", path: ["subclasses"] });
export const updateClassSchema = /* усі поля optional, без default (як updateRaceSchema) */;
export const CharacterClassEntrySchema = z.object({ classId: z.string().min(1), subclassId: z.string().min(1).nullable().optional(), level: z.number().int().min(1).max(20) });
export const CharacterClassesSchema = z.array(CharacterClassEntrySchema).max(12).refine((a) => new Set(a.map((x) => x.classId)).size === a.length, { message: "Клас повторюється" });
```
  Якщо `DND_SKILLS`/`ABILITY_KEYS` не є tuple для `z.enum` — перевести через `as unknown as [string, ...string[]]` як у сусідніх схемах.
- `lib/utils/abilities/read.ts`: `OwnerKind.CLASS = "class"`; `classFeatureAbilities(features: unknown): ClassFeature[]` — парсить кожну групу (рівень + `read`-логіка для `abilities`), некоректні групи відкидає; `toGameClassData(row: GameClass): GameClassData` (нормалізація JSON-колонок із дефолтами) — у `lib/utils/characters/classes/derive.ts` або окремому `lib/utils/characters/classes/row.ts` (без `server-only`, без prisma-рантайму: тип з `@prisma/client` лише `import type`).
- `lib/cache/tags.ts`: `ReferenceKind.CLASSES = "classes"` + тег; `lib/cache/reference-data.ts`: `getCachedClasses(campaignId)` за зразком `getCachedRaces`.
- `lib/server/content/define-resource.ts`: `ContentKind` += `"classes"`.
- create `lib/server/content/resources/classes.ts` за зразком `races.ts`: `kind: "classes"`, `listFields: ["color", "caster", "hitDie"]`, `idParam: "classId"`, `label: "Класи"`, `description: "Класи 5e: кістка хітів, рятівні кидки, тип заклинача, вміння за рівнями, підкласи."`, `path: "/classes"`, `errors: [409]`, `access: { list: "member", item: "dm" }`, `invalidates: [ReferenceKind.CLASSES]`, `notFound: API_ERRORS.CLASS_NOT_FOUND`; `create` перевіряє унікальність назви (`CLASS_NAME_TAKEN`, 409), `remove` — якщо `prisma.character.count({ where: { campaignId, classes: { array_contains: [{ classId: existing.id }] } } }) > 0` → `ContentError(API_ERRORS.CLASS_IN_USE, 409)`. Тексти в `api-errors.ts`: `CLASS_NOT_FOUND: "Клас не знайдено"`, `CLASS_IN_USE: "Клас використовують персонажі — спершу змініть їхні класи"`, `classNameTakenMessage(name)`.
- `resources/index.ts`: `classes: classesResource`.
- create `app/api/campaigns/[id]/classes/route.ts` і `[classId]/route.ts` — так само тонко, як `races/route.ts` (`collectionRoutes`/`itemRoutes` з `lib/utils/api/content-routes.ts`).
- `lib/constants/source-sync.ts`: `SYNC_TABLE_SCOPES` += `"classes"`, мітка `classes: "Класи"`; `lib/server/templates/bundle.ts`: `Delegate` += `"gameClass"`, `SCALAR_ENUMS.GameClass = Prisma.GameClassScalarFieldEnum`, `MODEL_TO_KEY.GameClass = "classes"`, `table("classes", "GameClass", "gameClass")` у `BUNDLE_TABLES` (після `races`), `TemplateDb` += `"gameClass"`. Перевірити, що `remap-ids.ts`, `sync/hash.ts`, `sync/classify.ts`, `sync/context.ts` не мають окремих переліків таблиць (якщо мають — додати `classes`).
- `lib/server/content/__tests__` — тест розміру OpenAPI може впертися в межу (зараз 120000): підняти до потрібного значення з коментарем-номером етапу немає потреби — лише число.

Tests: create `lib/server/content/__tests__/classes-resource.test.ts` (за зразком наявних тестів ресурсів, з моком prisma): create з дефолтами; 409 на зайняту назву; `remove` → 409 `CLASS_IN_USE`, коли є персонаж; `remove` без персонажів — видаляє. Extend (адитивно) тести бандла/синхронізації, що перелічують таблиці. Test `lib/schemas/__tests__/classes.test.ts`: `createClassSchema` дефолти; повторюваний id підкласу → помилка; `CharacterClassesSchema` повторюваний `classId` → помилка; рівень 21 → помилка.

- [ ] **Step 1:** failing tests (схеми + ресурс). **Step 2:** FAIL.
- [ ] **Step 3:** схема Prisma, міграція (`migrate deploy` на `constructor`), `prisma generate`, решта файлів.
- [ ] **Step 4:** `pnpm test:run lib/schemas lib/server/content lib/server/templates prisma/__tests__` → PASS; `pnpm exec tsc --noEmit` без помилок.
- [ ] **Step 5:** commit `feat(constructor): classes content resource`.

---

### Task 5: `classes` персонажа на сервері (створення, редагування)

**Files:** create `lib/server/characters/apply-classes.ts`; modify `app/api/campaigns/[id]/characters/create-character-schema.ts` (+ `classes: CharacterClassesSchema.optional()`), `create-character.ts`, `[characterId]/update-character-schema.ts` (+ `classes` optional), `[characterId]/patch-character.ts` (:44 — гравцю `classes: undefined`); `types/characters.ts` (`Character.classes?: CharacterClassEntry[]`, `CharacterFormData.classes?`); tests `lib/server/characters/__tests__/apply-classes.test.ts`, extend наявні тести роутів персонажа адитивно (новий файл `app/api/campaigns/[id]/characters/__tests__/classes.test.ts` за зразком сусідніх).

**Interfaces — Produces:**

```ts
// lib/server/characters/apply-classes.ts  (import "server-only")
export type ClassesApplyResult =
  | { ok: true; data: { classes: CharacterClassEntry[]; level: number; class: string; subclass: string | null; spellSlots: Record<string, { max: number; current: number; level?: number }>; spellcastingAbility?: AbilityKey } }
  | { ok: false; status: 422; error: string };
export async function applyClasses(input: { campaignId: string; rules: Ruleset; maxLevel: number; entries: CharacterClassEntry[]; spellcastingAbility: string | null }): Promise<ClassesApplyResult>;
// чисте ядро для тестів:
export function validateClassEntries(entries: CharacterClassEntry[], classesById: Record<string, GameClassData>, maxLevel: number): string | null; // текст помилки або null
```

Правила `applyClasses`:
- `entries.length > 0 && !rules.classes.enabled` → 422 `API_ERRORS.CLASSES_DISABLED` («Класи вимкнені в правилах кампанії»).
- `entries.length === 0` → `{ ok: true, data: null }`-еквівалент: виклик не змінює персонажа (повертати `{ ok: true, data: undefined }` і в роутах нічого не писати, крім `classes: []`).
- Завантажити класи кампанії (`getCachedClasses`), `validateClassEntries`: кожен `classId` існує (інакше `CLASS_NOT_FOUND`); `subclassId` (якщо є) належить класу (`SUBCLASS_NOT_FOUND`); `subclassId` лише коли `subclassLevel !== null && level >= subclassLevel` (`SUBCLASS_TOO_EARLY`: «Підклас доступний з рівня N»); `Σ level ≤ maxLevel` (`Максимальний рівень кампанії — N`).
- `data.level = classTotalLevel`, `class = classesLabel`, `subclass = subclassesLabel`, `spellSlots` = `classSpellSlots` → `{ "N": { max, current: max }, pact?: { level, max, current: max } }`; `spellcastingAbility` — лише якщо в персонажа порожній і `classSpellcastingAbility` дав значення.
- У `create-character.ts`/`patch-character.ts`: якщо в тілі є `classes` — викликати `applyClasses` (з `campaign.rules`, `campaign.maxLevel`), при помилці повернути `errorResponse(error, 422)`; дані злити поверх `computed` (у PATCH — `classes` переважає `level` з тіла: `level` з тіла ігнорується, коли передано `classes`). Логіка — у хелпері, роут лише викликає.

Tests (`apply-classes.test.ts`, чисте ядро + мок `getCachedClasses`):

```ts
it("rejects classes when rules disabled", async () => expect(await applyClasses({ …, rules: DEFAULT_RULES, entries: [{ classId: "c1", level: 1 }] })).toMatchObject({ ok: false, status: 422 }));
it("rejects unknown class", …);
it("rejects subclass before subclassLevel", () => expect(validateClassEntries([{ classId: "c1", subclassId: "s1", level: 2 }], { c1: cls({ subclassLevel: 3, subclasses: [{ id: "s1", name: "Чемпіон", features: [] }] }) }, 20)).toMatch(/рівня 3/));
it("rejects subclass of another class", …);
it("rejects total level above campaign max", …);
it("derives level, label and slots", async () => { /* Воїн 3 + Чаклун 2 → level 5, class "Воїн 3 / Чаклун 2", spellSlots { pact: { level: 1, max: 2, current: 2 } } */ });
```
Роут-тест: гравець-власник з `allowPlayerEdit` надсилає `classes` → поле ігнорується (персонаж не змінився); ДМ → записано.

- [ ] Steps 1–5 (TDD, commit `feat(constructor): character classes on server`).

---

### Task 6: Підвищення рівня класу

**Files:** create `lib/utils/characters/level-up/class-level-up.ts`; modify `app/api/campaigns/[id]/characters/[characterId]/level-up/route.ts` (тіло — опційний Zod `{ classId?: string; subclassId?: string | null }` через `parseBody`; порожнє тіло/без JSON — HOMM-шлях без змін); tests `lib/utils/characters/level-up/__tests__/class-level-up.test.ts`.

**Interfaces — Produces:**

```ts
export function nextClassEntries(entries: CharacterClassEntry[], pick: { classId: string; subclassId?: string | null }): CharacterClassEntry[];
// наявний клас → level + 1 (subclassId з pick, якщо переданий, інакше старий); новий → додається в кінець { classId, level: 1, subclassId }
```

Маршрут:
- `classId` у тілі → class-шлях: `nextClassEntries` → `applyClasses` (усі перевірки, зокрема `SUBCLASS_TOO_EARLY`, межа рівня, правила вимкнені) → оновити `classes`, `level`, `class`, `subclass`, `spellSlots`, `seenLevel` (як зараз через `seenLevelOnLevelChange`); **без** випадкового +1 до характеристики; відповідь `levelUpDetails: { abilityIncreased: null, classId }`.
- Додатково: якщо після підвищення рівень класу ≥ `subclassLevel`, а `subclassId` порожній і не переданий → 422 `SUBCLASS_REQUIRED` («Оберіть підклас»).
- Без `classId`, але в персонажа непорожні `classes` і `rules.classes.enabled` → 422 `CLASS_REQUIRED` («Оберіть клас для нового рівня»).
- Інакше — наявний HOMM-код без змін.
- Розмістити розгалуження в хелпері (`lib/server/characters/class-level-up.ts`, `server-only`), щоб `route.ts` лишився тонким.

Tests: `nextClassEntries` (наявний клас +1; новий клас у кінці; підклас додається до наявного); роут-тест (новий файл): class-шлях не змінює характеристики; `SUBCLASS_REQUIRED` на рівні `subclassLevel`; `CLASS_REQUIRED`; HOMM-шлях (персонаж без класів) — відповідь як раніше.

- [ ] Steps 1–5 (commit `feat(constructor): class level-up`).

---

### Task 7: Бій — учасник від класів, вміння класу, `perRest`, слот пакту

**Files:**
- `types/abilities.ts`: `AbilitySource.type` += `"class"`.
- `lib/utils/abilities/schema/ability.ts`: `LimitsSchema` += `perRest: z.object({ rest: z.enum(["short", "long"]), uses: z.number().int().min(1) }).optional()`.
- `lib/utils/abilities/engine/core/usage.ts`: `export const battleLimit = (l: Limits) => l.perBattle ?? l.perRest?.uses;` і використати замість прямого `l.perBattle` у перевірці; `lib/utils/battle/view/hero.ts:54-64` — `battleLimit` замість `perBattle`, `per: "rest"` для `perRest` (тип `AbilityCharge.per` += `"rest"`); `lib/utils/abilities/registry/labels.ts:78` — «N разів за короткий/довгий відпочинок»; `components/abilities/sections/LimitsSection.tsx` — поля «Відпочинок» (немає/короткий/довгий) і «Разів».
- `lib/utils/abilities/build/collect.ts`: `collectCharacterAbilities` input += `classes?: ResolvedClassEntry[]`; нова `classResolved(entries)`: для кожного запису з `class` — `resolveAbilities({ type: "class", id: class.id, name: class.name, icon: class.icon }, features з level ≤ entry.level)`, для `subclass` — `{ type: "class", id: subclass.id, name: \`${class.name}: ${subclass.name}\` }`; додається після раси.
- `lib/utils/battle/types/participant.ts`: `CampaignSpellContext.classesById?: Record<string, GameClassData>`.
- create `lib/utils/battle/participant/load-classes.ts`: `loadClassesById(campaignId, context?)` — з контексту або `prisma.gameClass.findMany` → `toGameClassData`.
- `start/start-build-context.ts` і `participant/load-character-context.ts`: заповнити `classesById`, лише коли `rules.classes.enabled` (HOMM — без зайвого запиту).
- `participant/from-character.ts`: `const classMode = rules.classes.enabled && entries.length > 0` (`entries = CharacterClassesSchema.safeParse(character.classes)` або порожньо). Якщо `classMode`:
  - `resolved = resolveClassEntries(entries, classesById)`;
  - `archetype = heroArchetype(null)` (множники 1, `archetypeName` — з `UNIVERSAL`);
  - `computedMaxHp = classHp(resolved, character.constitution)`;
  - `saveProficiencies = classSaves(resolved, character.savingThrows)`;
  - `spellcastingAbility = classSpellcastingAbility(resolved, character.spellcastingAbility)` (і в `spellcasting.spellcastingAbility`, і в `spellcastingDerived`);
  - `collectCharacterAbilities({ …, classes: resolved })`.
  Інакше — поточний код без змін.
- `participant/from-character-spell-slots.ts`: перед наявною логікою — якщо `classMode` (передати `resolved` параметром), повернути `classSpellSlots(resolved)` у формі `{ key: { max, current: max }, pact: { level, max, current: max } }`.
- `lib/utils/battle/spell/slot.ts`:

```ts
export function spellSlotKey(p: BattleParticipant, level: number): string {
  if (p.basicInfo.sourceType === ParticipantSourceType.UNIT) return "universal";

  const slots = p.spellcasting?.spellSlots;
  const pact = slots?.pact as { level?: number; current: number } | undefined;

  if ((slots?.[String(level)]?.current ?? 0) <= 0 && pact && (pact.level ?? 0) >= level && pact.current > 0) return "pact";

  return String(level);
}
```
  (тип `spellSlots` у `types/battle.ts` розширити опційним `level?: number`.) Перевірити `split-participant.ts` — `pact` проходить як звичайний ключ; `level` не губиться при поділі max/current (якщо губиться — зберегти в max-частині).

Tests: create `lib/utils/battle/participant/__tests__/from-character-classes.test.ts` (за зразком наявних тестів `from-character` з контекстом):

```ts
it("HOMM unchanged: classes enabled but character has no classes", async () => { /* той самий participant (maxHp, saveProficiencies, meleeMultiplier, spellSlots) що з DEFAULT_RULES */ });
it("class mode: HP from hit dice, archetype ignored", …);           // archetype "warrior", Воїн 3 Тіл 14 → maxHp 28, meleeMultiplier 1
it("class mode: saves union", …);
it("class mode: features up to class level, subclass features", …); // feature level 3 при рівні 2 — немає; subclass feature — є, source.type "class"
it("class mode: unknown classId skipped", …);                      // HP лише від відомого класу, без винятку
it("class mode: pact slots", …);                                    // spellSlots.pact = { level: 1, max: 2, current: 2 }
```
`lib/utils/battle/spell/__tests__/slot-pact.test.ts`: звичайний слот є → `"2"`; звичайного немає, пакт рівня 3 ≥ 2 → `"pact"`; пакт нижчого кола → `"2"` (каст відмовить як зараз); юніт → `"universal"`; герой без `pact` → як раніше.
`lib/utils/abilities/engine/core/__tests__/usage-per-rest.test.ts`: `perRest { uses: 1 }` — друге використання в бою заблоковане.

- [ ] Steps 1–5 (commit `feat(constructor): class-driven battle participant`).

---

### Task 8: Клієнт і сторінка ДМ «Класи»

**Files:** create `lib/api/classes.ts` (`list/get/create/update/remove` за зразком `lib/api/races.ts`), `lib/hooks/classes/{keys.ts,useClasses.ts,useClassForm.ts,index.ts}` (`classKeys.list(campaignId)`, `classKeys.detail(campaignId, id)`; без `"use client"` у `keys.ts`), `components/classes/{ClassCard.tsx,ClassForm.tsx,ClassBasicsTab.tsx,ClassFeaturesEditor.tsx,SubclassesEditor.tsx,CreateClassDialog.tsx}`, `app/campaigns/[id]/dm/classes/{page.tsx,page-client.tsx,[classId]/page.tsx}`; modify `app/campaigns/[id]/page.tsx` (пункт `{ path: "classes", icon: GraduationCap, title: "Класи", subtitle: "Класи, підкласи і вміння за рівнями" }` — лише якщо `parseRules(campaign.rules).classes.enabled`), `components/layout/Breadcrumbs.tsx` («Класи»), `components/layout/screen-background.tsx` (`classes: "races"` — той самий фон). Tests: `components/classes/__tests__/ClassFeaturesEditor.test.tsx` (`// @vitest-environment happy-dom`): додати рівень → секція з `AbilityListEditor`; видалити рівень; рівні відсортовані; `lib/hooks/classes/__tests__/useClassForm.test.tsx` — збирання тіла запиту з форми.

UI:
- Список: `HudPage` + `HudPageHeader` («Класи», кнопка «Новий клас» → `CreateClassDialog` з назвою), картки `HudCard`: назва, `d{hitDie}`, тип заклинача («Повний заклинач / Половинний / Третина / Пакт / Не заклинач»), кількість підкласів; клік → `/dm/classes/[classId]`.
- Форма класу (`HudFormPage` + `HudForm`): вкладки `HudTab` «Основне» (назва, іконка, колір, кістка хітів, рятівні — 6 чекбоксів, майстерності — три текстові списки через кому, навички на вибір — число + мультивибір з `DND_SKILLS` і підписів `lib/constants/skills.ts`, тип заклинача, характеристика заклинань), «Вміння за рівнями» (`ClassFeaturesEditor`: кнопка «Додати рівень» з вибором 1–20, на кожен рівень — `HudSection` «Рівень N» з `AbilityListEditor`), «Підкласи» (рівень підкласу; список підкласів: назва + `ClassFeaturesEditor`; id нового підкласу — `crypto.randomUUID().slice(0, 12)`). Збереження — `ActionBar`; помилки здібностей — `withAbilityErrors` як у `CreateRaceDialog`. Видалення — `useConfirm()`; 409 показати через `useNotify()`.

- [ ] Steps: тести → FAIL → реалізація → PASS (`pnpm test:related` по нових файлах) → commit `feat(constructor): classes DM pages`.

---

### Task 9: Персонаж у режимі класів (форма, підвищення рівня, лист)

**Files:** create `components/characters/basic/CharacterClassesField.tsx`, `components/character-profile/ClassLevelUpDialog.tsx`, `lib/hooks/characters/useClassLevelUp.ts` (+ експорт у barrel); modify `components/characters/basic/CharacterBasicInfo.tsx` (у режимі класів — `CharacterClassesField` замість полів класу/підкласу/архетипу; рівень — лише для читання = сума), `components/characters/stats/CharacterHpPreview.tsx` (у режимі класів — `classHp`), `components/character-profile/LevelUpAction.tsx` (у режимі класів — відкриває `ClassLevelUpDialog`), `lib/hooks/characters/useDmCharacterEditor.ts` (level-up з `{ classId, subclassId }`), `lib/api/characters.ts` (тіло level-up), `lib/utils/characters/sheet/build-sheet.ts` (ідентичність «Воїн 5 / Чарівник 2» вже йде з `class`; додати `hitDice` і `pact` у `CharacterSheet` — `types/characters.ts`), `components/character-profile/MagicTab.tsx` (рядок пакту), `lib/utils/characters/character-form.ts` (`classes` у формі). «Режим класів» на клієнті — `useCampaignRules(campaignId).classes.enabled`; класи — `useClasses(campaignId)`.

UI:
- `CharacterClassesField` (лише ДМ): рядки «клас (select) · підклас (select, вимкнений до `subclassLevel`, з підказкою «з рівня N») · рівень (число 1–20) · ✕»; «Додати клас»; під списком — «Загальний рівень: N», «Кістки хітів: 5d10 + 2d6», підказка `skillChoices` першого класу («Оберіть 2 навички з: …»); запис з невідомим `classId` — «Клас не знайдено — оберіть інший».
- `ClassLevelUpDialog` (`ResponsiveDialog hud`): радіо-список класів персонажа («Воїн 5 → 6») + «Новий клас» (select класів, яких ще немає); якщо новий рівень обраного класу ≥ `subclassLevel` і підкласу немає — обов'язковий select підкласу; footer: «Підвищити» (`form="class-level-up-form"`), «Скасувати». Помилки 422 — текстом у діалозі.

Tests: `components/characters/basic/__tests__/CharacterClassesField.test.tsx` (happy-dom): підклас вимкнений до `subclassLevel`; сума рівнів; невідомий клас — підказка. `components/character-profile/__tests__/ClassLevelUpDialog.test.tsx`: підклас обов'язковий на `subclassLevel`; виклик мутації з `{ classId, subclassId }`. Наявні тести форми персонажа — без змін (HOMM-режим).

- [ ] Steps: тести → FAIL → реалізація → PASS → commit `feat(constructor): character classes UI`.

---

### Task 10: Документи

**Files:** `docs/architecture/abilities.md` (джерело `"class"`, `perRest` = `perBattle` до 4d), `docs/architecture/content-api.md` (ресурс `classes`, 409 при видаленні використаного, таблиця бандла), `docs/architecture/battle.md` (учасник у режимі класів: HP/рятівні/слоти/пакт; кола 0–9), `docs/STATUS.md` (рядок «Конструктор кампаній»: 4c-1 готовий, далі 4c-2), `docs/superpowers/constructor-handoff.md` (стан і відкладене).

- [ ] Оновити, commit `docs(constructor): 4c-1 classes`.

---

### Task 11: Повна перевірка

- [ ] `pnpm test:run` — усе зелене (відомий нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` — перезапустити окремо).
- [ ] `pnpm lint` — 0 errors; `pnpm build` — успішно.
- [ ] `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv` — без нових помилок (відомий нестабільний сценарій лабіринту).
- [ ] Живий прогін (`pnpm dev -p 3001`): тестова кампанія → `dm/rules` увімкнути «Класи» → класи Воїн (d10, Сил/Тіл, підклас «Чемпіон» з рівня 3 з вмінням) і Чаклун (d8, пакт, Мдр/Хар) → персонаж Воїн 3 / Чаклун 2 (через форму і level-up з вибором підкласу) → лист: «Воїн 3 / Чаклун 2», кістки, слот пакту → бій: HP, рятівні, вміння підкласу, каст заклинання 1-го кола зі слота пакту; десктоп + 500 px. Тестову кампанію і записи після перевірки видалити.
