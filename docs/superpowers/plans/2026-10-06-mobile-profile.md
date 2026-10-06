# Мобільний профіль персонажа — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Один профіль персонажа з табами в стилі HUD для гравця і ДМа: числа рахує сервер тим самим рушієм, що й бій. Біографія з маркером ДМа і цілі. Калькулятор шкоди і акордеони видалені.

**Architecture:** Чиста функція `buildCharacterSheet` будує лист персонажа з `BattleParticipant` (`createBattleParticipantFromCharacter` + `applyBakedAuras`). `GET /sheet` віддає лист, `useCharacterSheet` — єдине джерело перегляду. Редагування ДМа — окреме піддерево `ProfileEditor`, яке монтується лише в режимі «Редагувати»: бібліотеки вантажаться тільки тоді. Основна характеристика вбудовується в `getAttackAbilityModifier`, тож діє і в бою.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Prisma 6 / PostgreSQL, TanStack Query, Zod, Vitest + Testing Library (happy-dom), Tailwind, Radix Tabs, vaul.

**Spec:** `docs/superpowers/specs/2026-10-06-mobile-profile-design.md`

## Global Constraints

- Гілка `feat/mobile-profile`. Мердж у main — лише після «так» користувача. Пуш — лише з зеленими тестами на змердженому результаті.
- Міграції тільки expand-only. Нових таблиць немає. Колонки не видаляємо.
- Компоненти не імпортують `@/lib/api/*`. Запити живуть у `lib/api/<domain>`, логіка — у хуках `lib/hooks/<domain>`.
- Діалоги — тільки `ResponsiveDialog`. Підтвердження й сповіщення — `useConfirm`/`useNotify`.
- Стиль: `HUD_SURFACE` + `import "@/components/hud/hud.css"` + `metalClass`, шрифти Alegreya. Нових кольорів і токенів не вводимо (лише наявні hex із `hud.css`/`progression.css`/`SpellBook.tsx`).
- Позначення: «AC», «Влуч», «Майст», «Ініц», «Швидк». Мова UI — українська, ідентифікатори — англійська.
- Коментарі мінімальні: лише неочевидне «чому», одним рядком.
- Імпорти впорядковує `simple-import-sort`; блок-відступи — `padding-line-between-statements`. Кожна задача закінчується `pnpm lint --fix` на змінених файлах.
- 390 px: без горизонтального скролу, зони дотику ≥ 44 px.
- Гравець у режимі перегляду робить запити лише до `sheet` і `progression`.

## Review Focus

- Персонаж без жодної зброї: `attacks = []`, профіль показує порожній стан, а не падає; чип «Влуч» — «—». Тест у Task 5.
- Біографія з непарною кількістю `==` або з `==` всередині слова: незакритий маркер лишається звичайним текстом, нічого не губиться. Тест у Task 4.
- Гравець шле в `PUT /goals` ціль з id цілі ДМа (спроба переписати): сервер зберігає ціль ДМа незмінною. Тест у Task 7.
- Персонаж ДМа без власника або гравець відкриває чужий `sheet` → 403, а не чужі дані. Тест у Task 6.
- `goals` у БД містить сміття (старі дані або ручна правка): лист повертає `[]` для невалідних записів і не падає. Тест у Task 5.

---

## Карта файлів

**Нові**
- `prisma/migrations/20261010000000_mobile_profile/migration.sql`
- `lib/schemas/characters.ts` — Zod цілей і `primaryAbility`
- `lib/utils/characters/biography/highlight.ts` (+ `__tests__/highlight.test.ts`)
- `lib/utils/characters/goals.ts` (+ `__tests__/goals.test.ts`)
- `lib/utils/characters/sheet/build-character-sheet.ts`, `sheet/lines.ts`, `sheet/index.ts` (+ `__tests__/build-character-sheet.test.ts`)
- `lib/utils/common/plural.ts` (+ `__tests__/plural.test.ts`)
- `app/api/campaigns/[id]/characters/[characterId]/sheet/route.ts`, `sheet/sheet-handler.ts`
- `app/api/campaigns/[id]/characters/[characterId]/goals/route.ts`
- `app/api/__tests__/character-sheet-api.test.ts`, `app/api/__tests__/character-goals-api.test.ts`
- `lib/hooks/characters/useCharacterSheet.ts`, `useCharacterGoals.ts`, `useSpellBrowser.ts`
- `components/battle/wizards/SpellBookPages.tsx`
- `components/character-profile/*` (див. Task 10–13)

**Змінювані (головні)**
- `prisma/schema.prisma`, `types/characters.ts`, `types/battle.ts`, `types/races.ts`, `types/progression.ts`
- `lib/utils/common/calculations.ts`, `lib/utils/battle/attack/bonus.ts`, `lib/utils/battle/participant/from-character.ts`, `lib/utils/abilities/build/bake.ts`
- `app/api/campaigns/[id]/characters/route.ts`, `[characterId]/route.ts`, `update-character-schema.ts`, `build-character-update-data.ts`, `level-up/route.ts`
- `lib/constants/skills.ts`, `lib/utils/characters/character-form.ts`, `lib/hooks/characters/*`, `lib/hooks/skills/useProgressionActions.ts`
- `components/skill-tree/progression/{RacialRow,OfferList,SlotButton}.tsx`, `progression/get-progression-handler.ts`
- `components/races/*`, `lib/schemas/races.ts`
- `components/characters/{basic,stats,skills,artifacts}/*`, `components/ui/responsive-dialog.tsx`
- `app/campaigns/[id]/character/**`, `app/campaigns/[id]/dm/characters/[characterId]/**`

**Видаляються** (Task 14): `app/campaigns/[id]/character/components/**`, `character/edit/edit-client.tsx`, `DmCharacterEditForm*.tsx`, `damage-preview/`, калькулятор і превʼю шкоди, `useCharacterView`, `useDamage*`, `damage-preview.ts`, `damage-calculator.ts`, `CharacterHeroBlock`, `SpellMultiSelect`, `CharacterSpellbook*`, `SpellSlotsBadge`, `read-only` для перегляду (якщо стане без імпортів).

---

### Task 1: Міграція, Prisma, типи й Zod

**Files:**
- Create: `prisma/migrations/20261010000000_mobile_profile/migration.sql`
- Create: `lib/schemas/characters.ts`
- Modify: `prisma/schema.prisma` (model `Character`, model `Race`), `lib/schemas/index.ts`, `types/characters.ts`, `types/races.ts`
- Test: `lib/schemas/__tests__/characters.test.ts`

**Interfaces:**
- Produces: `AbilityKey`, `ABILITY_KEYS`, `CharacterGoal`, `GoalStatus`, `characterGoalsSchema`, `goalInputSchema`, `primaryAbilitySchema`, `parseGoals(raw: unknown): CharacterGoal[]`.

- [ ] **Step 1: Write the failing test** — `lib/schemas/__tests__/characters.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { characterGoalsSchema, parseGoals, primaryAbilitySchema } from "@/lib/schemas/characters";

describe("character schemas", () => {
  it("parseGoals: валідні цілі проходять, сміття → []", () => {
    const ok = [{ id: "g1", text: "Знайти брата", status: "active", author: "dm" }];

    expect(parseGoals(ok)).toEqual(ok);
    expect(parseGoals([{ id: "g1" }])).toEqual([]);
    expect(parseGoals("oops")).toEqual([]);
    expect(parseGoals(null)).toEqual([]);
  });

  it("текст цілі 1..300, не більше 30 цілей", () => {
    const goal = (i: number) => ({ id: `g${i}`, text: "x", status: "active", author: "player" });

    expect(characterGoalsSchema.safeParse([{ ...goal(1), text: "  " }]).success).toBe(false);
    expect(characterGoalsSchema.safeParse([{ ...goal(1), text: "a".repeat(301) }]).success).toBe(false);
    expect(characterGoalsSchema.safeParse(Array.from({ length: 31 }, (_, i) => goal(i))).success).toBe(false);
  });

  it("primaryAbility: одна з шести або null", () => {
    expect(primaryAbilitySchema.parse("dexterity")).toBe("dexterity");
    expect(primaryAbilitySchema.parse(null)).toBeNull();
    expect(primaryAbilitySchema.safeParse("luck").success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run lib/schemas/__tests__/characters.test.ts`
Expected: FAIL — `Cannot find module '@/lib/schemas/characters'`

- [ ] **Step 3: Implement**

`types/characters.ts` — додати на початок файлу:

```ts
export const ABILITY_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

export type AbilityKey = (typeof ABILITY_KEYS)[number];

export type GoalStatus = "active" | "done" | "failed";

export interface CharacterGoal {
  id: string;
  text: string;
  status: GoalStatus;
  author: "dm" | "player";
}
```

У flat-інтерфейсі `Character` (той, де `background?: string` на ~91 рядку) додати `primaryAbility?: AbilityKey | null;` і `goals?: unknown;`.

`lib/schemas/characters.ts`:

```ts
import { z } from "zod";

import { ABILITY_KEYS, type CharacterGoal } from "@/types/characters";

export const primaryAbilitySchema = z.enum(ABILITY_KEYS).nullable();

const goalBase = {
  id: z.string().min(1).max(40),
  text: z.string().trim().min(1).max(300),
  status: z.enum(["active", "done", "failed"]),
};

export const characterGoalSchema = z.object({ ...goalBase, author: z.enum(["dm", "player"]) });

export const characterGoalsSchema = z.array(characterGoalSchema).max(30);

export const goalInputSchema = z.object({
  goals: z.array(z.object({ ...goalBase, author: z.enum(["dm", "player"]).optional() })).max(30),
});

export type GoalInput = z.infer<typeof goalInputSchema>["goals"][number];

export function parseGoals(raw: unknown): CharacterGoal[] {
  const r = characterGoalsSchema.safeParse(raw);

  return r.success ? r.data : [];
}
```

`lib/schemas/index.ts` — додати `export * from "./characters";` (за алфавітом після `./campaigns`).

`prisma/schema.prisma` — у `model Character` після `personalSkillId`:

```prisma
  primaryAbility       String?
  goals                Json                @default("[]")
```

У `model Race` після `abilities`: `icon                 String?`

`prisma/migrations/20261010000000_mobile_profile/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "characters" ADD COLUMN "primaryAbility" TEXT;
ALTER TABLE "characters" ADD COLUMN "goals" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "races" ADD COLUMN "icon" TEXT;
```

`types/races.ts` — у `Race` додати `icon?: string | null;`, у `RaceFormData` додати `icon?: string | null;`.

- [ ] **Step 4: Apply and verify**

Run: `pnpm exec prisma migrate deploy` (з `.env.local`: локальна Docker-БД, порт 54322), потім `pnpm exec prisma generate && pnpm test:run lib/schemas/__tests__/characters.test.ts prisma/__tests__`
Expected: міграцію застосовано, тести PASS (`migrations-rls` зелений, бо нових таблиць немає).

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/schemas types
git add prisma lib/schemas types
git commit -m "feat(profile): primaryAbility, goals and race icon columns with schemas"
```

---

### Task 2: Рушій — основна характеристика й майстерність від рівня

**Files:**
- Modify: `lib/utils/common/calculations.ts` (`getAttackAbilityModifier`), `lib/utils/battle/attack/bonus.ts:20-25`, `lib/utils/battle/participant/from-character.ts:110-150`, `types/battle.ts` (`BattleParticipantAbilities`)
- Test: `lib/utils/battle/__tests__/primary-ability.test.ts`

**Interfaces:**
- Consumes: `AbilityKey` (Task 1).
- Produces: `BattleParticipantAbilities.primaryAbility?: AbilityKey | null`; `getAttackAbilityModifier(abilities: AttackAbilities, attackType)`, де `AttackAbilities = { strength: number; dexterity: number; primaryAbility?: AbilityKey | null } & Partial<Record<AbilityKey, number>>`; `attackAbilityKey(abilities, attackType): AbilityKey`.

- [ ] **Step 1: Write the failing test** — `lib/utils/battle/__tests__/primary-ability.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { createMockParticipant } from "./mock-participant";

import { AttackType } from "@/lib/constants/battle";
import { calculateAttackBonus } from "@/lib/utils/battle/attack";
import { attackAbilityKey, getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import type { BattleAttack } from "@/types/battle";

const sword = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 1, damageDice: "1d8" } as BattleAttack;

describe("основна характеристика", () => {
  it("без primaryAbility: ближня — СИЛ, дальня — СПР", () => {
    const a = { strength: 14, dexterity: 18 };

    expect(getAttackAbilityModifier(a, AttackType.MELEE)).toBe(2);
    expect(getAttackAbilityModifier(a, AttackType.RANGED)).toBe(4);
  });

  it("primaryAbility діє на будь-яку атаку", () => {
    const a = { strength: 10, dexterity: 18, primaryAbility: "dexterity" as const };

    expect(getAttackAbilityModifier(a, AttackType.MELEE)).toBe(4);
    expect(attackAbilityKey(a, AttackType.MELEE)).toBe("dexterity");
  });

  it("calculateAttackBonus бере основну характеристику", () => {
    const base = createMockParticipant();

    const p = { ...base, abilities: { ...base.abilities, strength: 10, dexterity: 18, primaryAbility: "dexterity" as const, proficiencyBonus: 9 } };

    expect(calculateAttackBonus(p, sword)).toBe(1 + 4 + 9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run lib/utils/battle/__tests__/primary-ability.test.ts`
Expected: FAIL — `attackAbilityKey` is not exported.

- [ ] **Step 3: Implement**

`lib/utils/common/calculations.ts` — замінити `getAttackAbilityModifier` наприкінці файлу:

```ts
import type { AbilityKey } from "@/types/characters";

export type AttackAbilities = { strength: number; dexterity: number; primaryAbility?: AbilityKey | null } & Partial<Record<AbilityKey, number>>;

export function attackAbilityKey(abilities: AttackAbilities, attackType: AttackType | string): AbilityKey {
  if (abilities.primaryAbility) return abilities.primaryAbility;

  return attackType === AttackType.MELEE ? "strength" : "dexterity";
}

export function getAttackAbilityModifier(abilities: AttackAbilities, attackType: AttackType | string): number {
  const key = attackAbilityKey(abilities, attackType);

  return getAbilityModifier(abilities[key] ?? 10);
}
```

(`import type { AbilityKey }` перенести до інших імпортів угорі файлу; `pnpm lint --fix` впорядкує.)

`types/battle.ts` — у `BattleParticipantAbilities` після `race: string;`:

```ts
  /** Основна характеристика героя для влучання й шкоди; без неї — СИЛ/СПР */
  primaryAbility?: AbilityKey | null;
```

(+ `import type { AbilityKey } from "./characters";` — якщо це створює цикл імпортів, винести `ABILITY_KEYS`/`AbilityKey` у новий `types/abilities-core.ts` і реекспортувати з `types/characters.ts`.)

`lib/utils/battle/attack/bonus.ts` — тіло `calculateAttackBonus`:

```ts
  const statModifier = getAttackAbilityModifier(attacker.abilities, attack.type);
```

(+ `import { getAttackAbilityModifier } from "@/lib/utils/common/calculations";`)

`lib/utils/battle/participant/from-character.ts`:
- імпортувати `getProficiencyBonus, getSpellAttackBonus, getSpellSaveDC` з `@/lib/utils/common/calculations` і `ABILITY_KEYS, type AbilityKey` з `@/types/characters`;
- перед `const participant` додати:

```ts
  const proficiencyBonus = getProficiencyBonus(character.level);

  const primary = (character as { primaryAbility?: string | null }).primaryAbility;

  const primaryAbility = (ABILITY_KEYS as readonly string[]).includes(primary ?? "") ? (primary as AbilityKey) : null;

  const castingKey = character.spellcastingAbility as AbilityKey | null;

  const castingMod = castingKey ? modifiers[castingKey as keyof typeof modifiers] : null;
```

- в `abilities`: `proficiencyBonus,` замість `character.proficiencyBonus` і додати `primaryAbility,`;
- у `spellcasting`: `spellSaveDC: castingMod != null ? getSpellSaveDC(proficiencyBonus, castingMod) : undefined,` і `spellAttackBonus: castingMod != null ? getSpellAttackBonus(proficiencyBonus, castingMod) : undefined,`.

- [ ] **Step 4: Run tests**

Run: `pnpm test:run lib/utils/battle lib/utils/common`
Expected: PASS (наявні тести бою зелені, бо `modifiers` у моках узгоджені з балами).

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/utils/common lib/utils/battle types
git add lib/utils types
git commit -m "feat(battle): primary ability drives hit and damage; proficiency from level"
```

---

### Task 3: API персонажа — нові поля, мертві поля геть, без денормалізованих колонок

**Files:**
- Modify: `app/api/campaigns/[id]/characters/[characterId]/update-character-schema.ts`, `build-character-update-data.ts`, `route.ts` (PATCH), `app/api/campaigns/[id]/characters/route.ts` (POST), `[characterId]/level-up/route.ts`
- Modify: `types/characters.ts` (`CharacterFormData`, `Character`), `lib/utils/characters/character-form.ts`, `lib/hooks/characters/useCharacterForm-defaults.ts`, `useCharacterForm.ts`, `useCharacterForm-bindings.ts`
- Test: `app/api/__tests__/character-update-fields.test.ts`, наявні тести `build-character-update-data`, якщо є (`pnpm test:run -t "buildCharacterUpdateData"`)

**Interfaces:**
- Consumes: `primaryAbilitySchema`, `goalInputSchema` (Task 1).
- Produces: PATCH приймає `primaryAbility`, `goals` (лише ДМ), `background`; `CharacterFormData.basicInfo.primaryAbility: AbilityKey | null`; із `CharacterFormData` прибрано `roleplay.{personalityTraits,ideals,bonds,flaws}` і `combatStats.hitDice`.

- [ ] **Step 1: Write the failing test** — `app/api/__tests__/character-update-fields.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { updateCharacterSchema } from "@/app/api/campaigns/[id]/characters/[characterId]/update-character-schema";
import { buildCharacterUpdateData } from "@/app/api/campaigns/[id]/characters/[characterId]/build-character-update-data";

describe("PATCH персонажа", () => {
  it("приймає primaryAbility і goals, ігнорує мертві поля", () => {
    const data = updateCharacterSchema.parse({ primaryAbility: "dexterity", goals: [{ id: "g", text: "Ціль", status: "active", author: "dm" }], ideals: "x", hitDice: "1d8" });

    expect(data.primaryAbility).toBe("dexterity");
    expect(data.goals).toHaveLength(1);
    expect("ideals" in data).toBe(false);
    expect("hitDice" in data).toBe(false);
  });

  it("buildCharacterUpdateData більше не рахує денормалізовані стати", () => {
    const out = buildCharacterUpdateData({
      character: { level: 3, experience: 0, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, maxHp: 10, currentHp: 10, hitDice: "1d8", spellcastingAbility: null, spellSaveDC: null, spellAttackBonus: null, spellSlots: {}, immunities: [], skills: {}, seenLevel: null },
      data: {},
      xpMultiplier: 1,
    });

    expect(out).not.toHaveProperty("proficiencyBonus");
    expect(out).not.toHaveProperty("spellSaveDC");
    expect(out).not.toHaveProperty("passivePerception");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run app/api/__tests__/character-update-fields.test.ts`
Expected: FAIL — `primaryAbility` відсутнє в схемі.

- [ ] **Step 3: Implement**

`update-character-schema.ts`:
- видалити `hitDice`, `personalityTraits`, `ideals`, `bonds`, `flaws` (і коментар `// Roleplay`);
- додати:

```ts
  primaryAbility: primaryAbilitySchema.optional(),
  goals: characterGoalsSchema.optional(),
```

(`import { characterGoalsSchema, primaryAbilitySchema } from "@/lib/schemas";`). Zod `object` за замовчуванням відкидає невідомі ключі — так «мертві» поля ігноруються.

`build-character-update-data.ts`:
- прибрати з результату й обчислень `proficiencyBonus`, `passive*`, `spellSaveDC`, `spellAttackBonus` та відповідні імпорти (`getPassiveScore`, `getSpellSaveDC`, `getSpellAttackBonus`, `getProficiencyBonus`), а також змінні `intMod`, `wisMod`, `chaMod`, `characterSkills`, `spellcastingAbility`;
- `hitDice` береться лише з `character.hitDice` (для приросту `maxHp`; колонка лишається в БД).

`[characterId]/route.ts` PATCH:
- з `data:` прибрати `proficiencyBonus`, `passivePerception`, `passiveInvestigation`, `passiveInsight`, `spellSaveDC`, `spellAttackBonus`;
- перед `buildCharacterUpdateData`, коли гравець, відрізати `goals`:

```ts
    if (!isDM) {
      data = { ...data, controlledBy: character.controlledBy, type: character.type, goals: undefined } as typeof data;
    }
```

- `goals: data.goals as Prisma.InputJsonValue | undefined` у `data` update.

`app/api/campaigns/[id]/characters/route.ts` (POST) і `level-up/route.ts`: прибрати запис `proficiencyBonus`, `passive*`, `spellSaveDC`, `spellAttackBonus`, а також обчислення, які після цього стали непотрібні. Перевірка: `grep -n "proficiencyBonus\|spellSaveDC\|passivePerception" app/api/campaigns/\[id\]/characters -r` → порожньо.

Форма:
- `types/characters.ts`:
  - у `CharacterFormData.basicInfo` додати `primaryAbility: AbilityKey | null;`;
  - прибрати `combatStats.hitDice` і `roleplay.{personalityTraits,ideals,bonds,flaws}`;
  - у flat `Character` прибрати `personalityTraits`, `ideals`, `bonds`, `flaws`.
- `character-form.ts`:
  - `characterToFormData`: прибрати відповідні рядки, додати `primaryAbility: (character.primaryAbility as AbilityKey | null) ?? null` у `basicInfo`;
  - `formDataToCharacter`: прибрати 4 roleplay-поля і `hitDice`, додати `primaryAbility: formData.basicInfo.primaryAbility`.
- `useCharacterForm-defaults.ts`: `primaryAbility: null` у `basicInfo`, прибрати `hitDice` і 4 roleplay-поля.
- `useCharacterForm-bindings.ts`: прибрати сетери прибраних полів; у `basicInfo` додати `setPrimaryAbility(value: AbilityKey | null)`, який робить `setFormData(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, primaryAbility: value } }))`.
- `components/characters/stats/CharacterCombatParams.tsx`: прибрати інпут «Кістки Здоров'я».

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm test:run app/api lib/utils/characters lib/hooks/characters && pnpm exec tsc --noEmit -p .`
Expected: PASS, 0 помилок типів.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix app/api/campaigns lib/utils/characters lib/hooks/characters components/characters types
git add -A app/api lib types components/characters
git commit -m "refactor(characters): PATCH takes primaryAbility/goals; drop dead roleplay fields and stored derived stats"
```

---

### Task 4: Розмітка біографії `==…==`

**Files:**
- Create: `lib/utils/characters/biography/highlight.ts`, `lib/utils/characters/biography/index.ts`
- Test: `lib/utils/characters/biography/__tests__/highlight.test.ts`

**Interfaces:**
- Produces: `type BioSegment = { text: string; marked: boolean }`; `parseHighlights(src: string): BioSegment[][]` (масив абзаців); `toggleHighlight(src: string, start: number, end: number): { text: string; start: number; end: number }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { parseHighlights, toggleHighlight } from "@/lib/utils/characters/biography";

describe("parseHighlights", () => {
  it("виділення й абзаци", () => {
    expect(parseHighlights("Мати ==загинула== від культу\n\nБрат зник")).toEqual([
      [{ text: "Мати ", marked: false }, { text: "загинула", marked: true }, { text: " від культу", marked: false }],
      [{ text: "Брат зник", marked: false }],
    ]);
  });

  it("незакритий маркер — звичайний текст", () => {
    expect(parseHighlights("a ==b c")).toEqual([[{ text: "a ==b c", marked: false }]]);
  });

  it("порожній і null-подібний вхід", () => {
    expect(parseHighlights("")).toEqual([]);
    expect(parseHighlights("====")).toEqual([[{ text: "====", marked: false }]]);
  });
});

describe("toggleHighlight", () => {
  it("обгортає виділення", () => {
    expect(toggleHighlight("брат зник", 5, 9)).toEqual({ text: "брат ==зник==", start: 7, end: 11 });
  });

  it("знімає, якщо виділення всередині підсвіченого", () => {
    expect(toggleHighlight("брат ==зник== тут", 8, 10)).toEqual({ text: "брат зник тут", start: 5, end: 9 });
  });

  it("порожнє або пробільне виділення — без змін", () => {
    expect(toggleHighlight("abc", 1, 1)).toEqual({ text: "abc", start: 1, end: 1 });
    expect(toggleHighlight("a  b", 1, 3)).toEqual({ text: "a  b", start: 1, end: 3 });
  });

  it("вкладені маркери всередині виділення прибираються", () => {
    expect(toggleHighlight("x ==y== z", 0, 9).text).toBe("==x y z==");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run lib/utils/characters/biography`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `highlight.ts`

```ts
export type BioSegment = { text: string; marked: boolean };

const MARK = /==([^\n]+?)==/g;

function segmentsOf(paragraph: string): BioSegment[] {
  const out: BioSegment[] = [];

  let last = 0;

  for (const m of paragraph.matchAll(MARK)) {
    if (m.index > last) out.push({ text: paragraph.slice(last, m.index), marked: false });

    out.push({ text: m[1], marked: true });
    last = m.index + m[0].length;
  }

  if (last < paragraph.length) out.push({ text: paragraph.slice(last), marked: false });

  return out;
}

export function parseHighlights(src: string): BioSegment[][] {
  return src
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(segmentsOf);
}

export function toggleHighlight(src: string, start: number, end: number): { text: string; start: number; end: number } {
  for (const m of src.matchAll(MARK)) {
    const from = m.index + 2;

    const to = from + m[1].length;

    if (start >= from && end <= to && start < end) {
      return { text: src.slice(0, m.index) + m[1] + src.slice(m.index + m[0].length), start: start - 2, end: end - 2 };
    }
  }

  const picked = src.slice(start, end);

  if (!picked.trim()) return { text: src, start, end };

  const inner = picked.replaceAll("==", "").replace(/\s+/g, " ").trim();

  const text = `${src.slice(0, start)}==${inner}==${src.slice(end)}`;

  return { text, start: start + 2, end: start + 2 + inner.length };
}
```

`index.ts`: `export * from "./highlight";`

> Перевірка прикладу «вкладені маркери»: `"x ==y== z"` → `inner = "x y z"` → `"==x y z=="`. ✓

- [ ] **Step 4: Run tests**

Run: `pnpm test:run lib/utils/characters/biography`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/utils/characters/biography
git add lib/utils/characters/biography
git commit -m "feat(profile): biography highlight markup parser and toggler"
```

---

### Task 5: `buildCharacterSheet` — лист персонажа

**Files:**
- Modify: `lib/constants/skills.ts` (метадані навичок), `lib/utils/abilities/build/bake.ts` (джерела запечених бонусів), `types/characters.ts` (тип `CharacterSheet`)
- Create: `lib/utils/characters/sheet/lines.ts`, `build-character-sheet.ts`, `index.ts`
- Test: `lib/utils/characters/sheet/__tests__/build-character-sheet.test.ts`

**Interfaces:**
- Consumes: `attackAbilityKey`, `getAttackAbilityModifier` (Task 2), `parseGoals` (Task 1), `calculateAttackBonus`, `calculateDamageWithModifiers`, `applyHeroDmDamageMultiplier`, `collectModifiers`, `withSelf`, `getDiceAverage`, `getHeroDamageDiceForLevel`, `getHeroMaxHpBreakdown`, `slotLevels`.
- Produces: `buildCharacterSheet(input: SheetInput): CharacterSheet`; `bakedStatSources(p, stat): { label: string; value: number; source: AbilitySource["type"] }[]`; `DND_SKILL_META`; тип `CharacterSheet` (нижче) — його споживають Task 6, 10–13.

- [ ] **Step 1: Add types** — `types/characters.ts`:

```ts
export type SheetLineSource = "base" | "ability" | "proficiency" | "weapon" | "level" | "dice" | "skill" | "race" | "artifact" | "artifactSet" | "unit" | "character" | "effect" | "action" | "multiplier";

export interface SheetLine {
  label: string;
  value: string;
  source?: SheetLineSource;
}

export interface SheetStat {
  total: number;
  lines: SheetLine[];
}

export interface SheetAttack {
  id: string;
  name: string;
  kind: "melee" | "ranged";
  toHit: SheetStat;
  avgDamage: SheetStat;
}

export interface SheetArtifact {
  id: string;
  name: string;
  icon: string | null;
  slot: string;
  rarity: string | null;
  description: string | null;
  effects: string[];
}

export interface CharacterSheet {
  viewer: { isDM: boolean; isOwner: boolean };
  identity: { id: string; name: string; avatar: string | null; level: number; className: string; subclass: string | null; race: string; raceIcon: string | null; alignment: string | null };
  abilities: { key: AbilityKey; score: number; mod: number; isPrimary: boolean; lines: SheetLine[] }[];
  proficiency: number;
  hp: SheetStat;
  armorClass: SheetStat;
  initiative: number;
  speed: number;
  morale: number;
  targets: { min: number; max: number };
  immunities: string[];
  languages: string[];
  proficiencies: string[];
  attacks: SheetAttack[];
  saves: { key: AbilityKey; label: string; bonus: number; proficient: boolean }[];
  skills: { key: string; label: string; ability: AbilityKey; bonus: number; proficient: boolean }[];
  passives: { perception: number; investigation: number; insight: number };
  magic: { ability: AbilityKey; saveDC: number; attackBonus: number } | null;
  slots: { level: number; count: number }[];
  spells: BookSpellDto[];
  items: { grid: Record<string, SheetArtifact | null>; artifacts: SheetArtifact[]; sets: { id: string; name: string; have: number; total: number; complete: boolean; effects: string[] }[] };
  personalSkill: { id: string; name: string; icon: string | null; description: string | null } | null;
  story: { biography: string | null; goals: CharacterGoal[] };
}
```

`BookSpellDto` — перенести тип `BookSpell` з `lib/hooks/battle/useSpellBook.ts` у `types/spells.ts` як `BookSpellDto` і в `useSpellBook.ts` написати `export type BookSpell = BookSpellDto;` (типи не мають жити в хуках, а лист серверний).

- [ ] **Step 2: Add skill metadata** — `lib/constants/skills.ts` (після `DND_SKILLS`):

```ts
export const DND_SKILL_META: Record<(typeof DND_SKILLS)[number], { label: string; ability: "strength" | "dexterity" | "intelligence" | "wisdom" | "charisma" }> = {
  acrobatics: { label: "Акробатика", ability: "dexterity" },
  animalHandling: { label: "Поводження з тваринами", ability: "wisdom" },
  arcana: { label: "Магія", ability: "intelligence" },
  athletics: { label: "Атлетика", ability: "strength" },
  deception: { label: "Обман", ability: "charisma" },
  history: { label: "Історія", ability: "intelligence" },
  insight: { label: "Проникливість", ability: "wisdom" },
  intimidation: { label: "Залякування", ability: "charisma" },
  investigation: { label: "Розслідування", ability: "intelligence" },
  medicine: { label: "Медицина", ability: "wisdom" },
  nature: { label: "Природа", ability: "intelligence" },
  perception: { label: "Сприйняття", ability: "wisdom" },
  performance: { label: "Виступ", ability: "charisma" },
  persuasion: { label: "Переконання", ability: "charisma" },
  religion: { label: "Релігія", ability: "intelligence" },
  sleightOfHand: { label: "Спритність рук", ability: "dexterity" },
  stealth: { label: "Скритність", ability: "dexterity" },
  survival: { label: "Виживання", ability: "wisdom" },
};
```

`CharacterSkillsSection.tsx`: підписи навичок — `DND_SKILL_META[skill].label`, а рятівних кидків — `CORE_ABILITY_SCORES.find(a => a.key === ability)?.label`.

- [ ] **Step 3: Add baked sources** — `lib/utils/abilities/build/bake.ts`:

```ts
export function bakedStatSources(p: BattleParticipant, stat: string): { label: string; value: number; source: ResolvedAbility["source"]["type"] }[] {
  return resolvedAbilitiesOf(p)
    .filter((a) => a.trigger.event === "passive" && !a.condition)
    .flatMap((a) =>
      a.effects
        .filter((e): e is ModifyStat => e.kind === "modifyStat" && e.stat === stat && (e.target ?? "self") === "self" && e.flat !== undefined)
        .map((e) => ({ label: a.source.name, value: resolveFlat(e.flat!, p), source: a.source.type })),
    )
    .filter((x) => x.value !== 0);
}
```

(+ `import type { ResolvedAbility } from "@/types/abilities";`)

- [ ] **Step 4: Write the failing test** — `lib/utils/characters/sheet/__tests__/build-character-sheet.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { AttackType } from "@/lib/constants/battle";
import { calculateDamageWithModifiers } from "@/lib/utils/battle/damage";
import { buildCharacterSheet, type SheetInput } from "@/lib/utils/characters/sheet";
import { getDiceAverage } from "@/lib/utils/battle/balance";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const bow = { id: "bow", name: "Довгий лук", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d8" } as BattleAttack;

const dagger = { id: "dg", name: "Кинджал", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d4" } as BattleAttack;

function lira(over: Partial<BattleParticipant["abilities"]> = {}, attacks: BattleAttack[] = [bow, dagger]): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    abilities: { ...base.abilities, level: 30, strength: 10, dexterity: 18, modifiers: { ...base.abilities.modifiers, strength: 0, dexterity: 4 }, proficiencyBonus: 9, race: "Ельф", ...over },
    combatStats: { ...base.combatStats, armorClass: 14, maxHp: 127 },
    battleData: { ...base.battleData, attacks },
  };
}

const input = (p: BattleParticipant, character: Partial<SheetInput["character"]> = {}): SheetInput => ({
  participant: p,
  viewer: { isDM: false, isOwner: true },
  character: { id: "lira", name: "Ліра", avatar: null, level: 30, class: "Ranger", subclass: null, race: "Ельф", alignment: null, armorClass: 14, strength: 10, dexterity: 18, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, savingThrows: { dexterity: true }, skills: { perception: true }, languages: ["Ельфійська"], proficiencies: {}, immunities: [], spellcastingAbility: null, hpMultiplier: null, background: "Мати ==загинула==", goals: [{ id: "g", text: "Знайти брата", status: "active", author: "dm" }], ...character },
  raceIcon: null,
  artifacts: [],
  sets: [],
  spells: [],
  personalSkill: null,
});

describe("buildCharacterSheet", () => {
  it("майстерність з учасника (від рівня), модифікатори, ★ на основній", () => {
    const s = buildCharacterSheet(input(lira({ primaryAbility: "dexterity" })));

    expect(s.proficiency).toBe(9);
    expect(s.abilities.find((a) => a.key === "dexterity")).toMatchObject({ score: 18, mod: 4, isPrimary: true });
    expect(s.abilities.find((a) => a.key === "strength")?.isPrimary).toBe(false);
  });

  it("основна СПР: +4 у влучанні й шкоді ближньої атаки", () => {
    const withPrimary = buildCharacterSheet(input(lira({ primaryAbility: "dexterity" })));

    const without = buildCharacterSheet(input(lira()));

    const d1 = withPrimary.attacks.find((a) => a.id === "dg")!;

    const d0 = without.attacks.find((a) => a.id === "dg")!;

    expect(d1.toHit.total - d0.toHit.total).toBe(4);
    expect(d1.avgDamage.total - d0.avgDamage.total).toBe(4);
    expect(d1.toHit.lines[0]).toMatchObject({ label: "Спритність ★", value: "+4", source: "ability" });
  });

  it("≈шкода = бойовий calculateDamageWithModifiers від середніх кубиків × коеф. ДМа", () => {
    const p = lira({ rangedMultiplier: 1.5 });

    const s = buildCharacterSheet(input(p));

    const expected = calculateDamageWithModifiers(p, getDiceAverage("1d8"), 4, AttackType.RANGED, {
      allParticipants: [p],
      heroLevelPart: 30,
      heroDicePart: getDiceAverage(getHeroDamageDiceForLevel(30, AttackType.RANGED)),
    }).totalDamage;

    expect(s.attacks.find((a) => a.id === "bow")!.avgDamage.total).toBe(Math.floor(expected * 1.5));
  });

  it("без зброї — порожні атаки", () => {
    expect(buildCharacterSheet(input(lira({}, []))).attacks).toEqual([]);
  });

  it("рятівні кидки, навички, пасивні", () => {
    const s = buildCharacterSheet(input(lira()));

    expect(s.saves.find((x) => x.key === "dexterity")).toMatchObject({ bonus: 13, proficient: true });
    expect(s.skills.find((x) => x.key === "perception")).toMatchObject({ label: "Сприйняття", bonus: 9, proficient: true });
    expect(s.passives.perception).toBe(19);
  });

  it("AC: база + розкладка; HP з учасника", () => {
    const s = buildCharacterSheet(input(lira()));

    expect(s.armorClass.total).toBe(14);
    expect(s.armorClass.lines[0]).toMatchObject({ label: "База", value: "14", source: "base" });
    expect(s.hp.total).toBe(127);
  });

  it("історія: біографія як є, невалідні цілі → []", () => {
    expect(buildCharacterSheet(input(lira())).story.biography).toBe("Мати ==загинула==");
    expect(buildCharacterSheet(input(lira(), { goals: [{ bad: true }] })).story.goals).toEqual([]);
  });

  it("магія лише зі spellcastingAbility; слоти з учасника", () => {
    const p = lira();

    p.spellcasting = { ...p.spellcasting, spellSlots: { "1": { max: 4, current: 4 }, "2": { max: 0, current: 0 } } };

    expect(buildCharacterSheet(input(p)).magic).toBeNull();
    expect(buildCharacterSheet(input(p)).slots).toEqual([{ level: 1, count: 4 }]);
    expect(buildCharacterSheet(input(p, { spellcastingAbility: "wisdom" })).magic).toEqual({ ability: "wisdom", saveDC: 17, attackBonus: 9 });
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `pnpm test:run lib/utils/characters/sheet`
Expected: FAIL — module not found.

- [ ] **Step 6: Implement** — `lib/utils/characters/sheet/lines.ts`

```ts
import type { ModifierEntry } from "@/lib/utils/abilities/engine/collect-modifiers";
import type { DamageStep } from "@/types/battle";
import type { SheetLine } from "@/types/characters";

export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export const entryLines = (entries: ModifierEntry[]): SheetLine[] =>
  entries.flatMap((e) => [
    ...(e.flat ? [{ label: e.label, value: signed(e.flat), source: e.sourceType }] : []),
    ...(e.percent ? [{ label: e.label, value: `${signed(e.percent)}%`, source: e.sourceType }] : []),
  ]);

export const stepLines = (steps: DamageStep[]): SheetLine[] =>
  steps.map((s) => ({
    label: s.label,
    value: s.kind === "percent" ? `${signed(s.value)}%` : s.kind === "dice" ? `${Math.round(s.value * 10) / 10}` : signed(Math.round(s.value * 10) / 10),
    source: s.kind === "dice" ? "dice" : undefined,
  }));
```

`lib/utils/characters/sheet/build-character-sheet.ts`:

```ts
import { AttackType } from "@/lib/constants/battle";
import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import { getHeroDamageDiceForLevel, getHeroMaxHpBreakdown } from "@/lib/constants/hero-scaling";
import { DND_SAVING_THROWS, DND_SKILL_META, DND_SKILLS } from "@/lib/constants/skills";
import { bakedStatSources } from "@/lib/utils/abilities/build/bake";
import { collectModifiers, statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import { calculateAttackBonus } from "@/lib/utils/battle/attack";
import { getDiceAverage } from "@/lib/utils/battle/balance";
import { calculateDamageWithModifiers } from "@/lib/utils/battle/damage";
import { applyHeroDmDamageMultiplier } from "@/lib/utils/battle/damage/hero-dm-multiplier";
import { slotLevels } from "@/lib/utils/battle/view";
import { attackAbilityKey, getAbilityModifier, getAttackAbilityModifier, getSpellAttackBonus, getSpellSaveDC } from "@/lib/utils/common/calculations";
import { parseGoals } from "@/lib/schemas/characters";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import { ABILITY_KEYS, type AbilityKey, type CharacterSheet, type SheetArtifact, type SheetAttack, type SheetLine } from "@/types/characters";
import type { BookSpellDto } from "@/types/spells";

import { entryLines, signed, stepLines } from "./lines";

export interface SheetInput {
  participant: BattleParticipant;
  viewer: CharacterSheet["viewer"];
  character: {
    id: string; name: string; avatar: string | null; level: number; class: string; subclass: string | null; race: string; alignment: string | null;
    armorClass: number; strength: number; dexterity: number; constitution: number; intelligence: number; wisdom: number; charisma: number;
    savingThrows: unknown; skills: unknown; languages: unknown; proficiencies: unknown; immunities: unknown;
    spellcastingAbility: string | null; hpMultiplier: number | null; background: string | null; goals: unknown;
  };
  raceIcon: string | null;
  artifacts: (SheetArtifact & { gridSlot: string })[];
  sets: CharacterSheet["items"]["sets"];
  spells: BookSpellDto[];
  personalSkill: CharacterSheet["personalSkill"];
}

const LABEL = Object.fromEntries(CORE_ABILITY_SCORES.map((a) => [a.key, a.label])) as Record<AbilityKey, string>;

const flags = (raw: unknown): Record<string, boolean> => (raw && typeof raw === "object" ? (raw as Record<string, boolean>) : {});

const strings = (raw: unknown): string[] => (Array.isArray(raw) ? raw.map(String).filter(Boolean) : []);

function attackOf(p: BattleParticipant, a: BattleAttack): SheetAttack {
  const type = a.type === AttackType.RANGED ? AttackType.RANGED : AttackType.MELEE;

  const key = attackAbilityKey(p.abilities, type);

  const statMod = getAttackAbilityModifier(p.abilities, type);

  const hit = collectModifiers(withSelf([p], p), p.basicInfo.id, { stat: "attackBonus", attackKind: type === AttackType.RANGED ? "ranged" : "melee" });

  const toHitLines: SheetLine[] = [
    { label: `${LABEL[key]}${p.abilities.primaryAbility ? " ★" : ""}`, value: signed(statMod), source: "ability" },
    { label: "Майстерність", value: signed(p.abilities.proficiencyBonus), source: "proficiency" },
    ...(a.attackBonus ? [{ label: "Зброя", value: signed(a.attackBonus), source: "weapon" as const }] : []),
    ...entryLines(hit.entries),
  ];

  const heroDice = getHeroDamageDiceForLevel(p.abilities.level, type);

  const calc = calculateDamageWithModifiers(p, getDiceAverage(a.damageDice ?? ""), statMod, type, {
    allParticipants: [p],
    heroLevelPart: p.abilities.level,
    heroDicePart: getDiceAverage(heroDice),
    heroDiceNotation: heroDice,
  });

  const dm = applyHeroDmDamageMultiplier(p, type, calc.totalDamage);

  return {
    id: a.id ?? a.name,
    name: a.name,
    kind: type === AttackType.RANGED ? "ranged" : "melee",
    toHit: { total: calculateAttackBonus(p, a), lines: toHitLines },
    avgDamage: { total: dm.damage, lines: [...stepLines(calc.steps), ...(dm.multiplier !== 1 ? [{ label: "Коеф. ДМа", value: `×${dm.multiplier}`, source: "multiplier" as const }] : [])] },
  };
}

export function buildCharacterSheet(input: SheetInput): CharacterSheet {
  const { participant: p, character: c } = input;

  const prof = p.abilities.proficiencyBonus;

  const mod = (k: AbilityKey) => getAbilityModifier(p.abilities[k]);

  const saveFlags = flags(c.savingThrows);

  const skillFlags = flags(c.skills);

  const skillBonus = (k: (typeof DND_SKILLS)[number]) => mod(DND_SKILL_META[k].ability) + (skillFlags[k] ? prof : 0);

  const armor = collectModifiers(withSelf([p], p), p.basicInfo.id, { stat: "armor" });

  const hpBase = getHeroMaxHpBreakdown(c.level, c.strength, { hpMultiplier: c.hpMultiplier ?? 1 });

  const casting = (ABILITY_KEYS as readonly string[]).includes(c.spellcastingAbility ?? "") ? (c.spellcastingAbility as AbilityKey) : null;

  const grid: CharacterSheet["items"]["grid"] = {};

  for (const art of input.artifacts) grid[art.gridSlot] = { id: art.id, name: art.name, icon: art.icon, slot: art.slot, rarity: art.rarity, description: art.description, effects: art.effects };

  return {
    viewer: input.viewer,
    identity: { id: c.id, name: c.name, avatar: c.avatar, level: c.level, className: c.class, subclass: c.subclass, race: c.race, raceIcon: input.raceIcon, alignment: c.alignment },
    abilities: ABILITY_KEYS.map((key) => ({
      key,
      score: p.abilities[key],
      mod: mod(key),
      isPrimary: p.abilities.primaryAbility === key,
      lines: [{ label: "База", value: String(c[key]), source: "base" as const }, ...bakedStatSources(p, key).map((b) => ({ label: b.label, value: signed(b.value), source: b.source }))],
    })),
    proficiency: prof,
    hp: { total: p.combatStats.maxHp, lines: [...hpBase.breakdown.map((l) => ({ label: l, value: "" })), ...bakedStatSources(p, "maxHp").map((b) => ({ label: b.label, value: signed(b.value), source: b.source }))] },
    armorClass: { total: statWithModifiers(withSelf([p], p), p.basicInfo.id, "armor", c.armorClass), lines: [{ label: "База", value: String(c.armorClass), source: "base" }, ...entryLines(armor.entries)] },
    initiative: p.abilities.initiative,
    speed: p.combatStats.speed,
    morale: p.combatStats.morale,
    targets: { min: p.combatStats.minTargets ?? 1, max: p.combatStats.maxTargets ?? 1 },
    immunities: strings(c.immunities),
    languages: strings(c.languages),
    proficiencies: Object.values(flags(c.proficiencies) as unknown as Record<string, unknown>).flatMap(strings),
    attacks: (p.battleData.attacks ?? []).map((a) => attackOf(p, a)),
    saves: DND_SAVING_THROWS.map((key) => ({ key, label: LABEL[key], bonus: mod(key) + (saveFlags[key] ? prof : 0), proficient: !!saveFlags[key] })),
    skills: DND_SKILLS.map((key) => ({ key, label: DND_SKILL_META[key].label, ability: DND_SKILL_META[key].ability, bonus: skillBonus(key), proficient: !!skillFlags[key] })),
    passives: { perception: 10 + skillBonus("perception"), investigation: 10 + skillBonus("investigation"), insight: 10 + skillBonus("insight") },
    magic: casting ? { ability: casting, saveDC: getSpellSaveDC(prof, mod(casting)), attackBonus: getSpellAttackBonus(prof, mod(casting)) } : null,
    slots: slotLevels(p).filter((s) => s.max > 0).map((s) => ({ level: s.level, count: s.max })),
    spells: input.spells,
    items: { grid, artifacts: input.artifacts.map(({ gridSlot: _g, ...a }) => a), sets: input.sets },
    personalSkill: input.personalSkill,
    story: { biography: c.background?.trim() ? c.background : null, goals: parseGoals(c.goals) },
  };
}
```

`index.ts`: `export * from "./build-character-sheet";`

> Якщо `DND_SAVING_THROWS` типізований ширше за `AbilityKey`, привести через `as AbilityKey`. Якщо `proficiencies` — `Record<string, string[]>`, `flatMap(strings)` дає плаский список назв.

- [ ] **Step 7: Run tests**

Run: `pnpm test:run lib/utils/characters/sheet lib/utils/abilities lib/constants`
Expected: PASS. Якщо тест «≈шкода» розходиться на заокругленні — **не** підганяти тест; звірити, що `attackOf` викликає ті самі функції, що `computeHitDamage` (`lib/utils/battle/attack/process/compute.ts:60-110`), і виправити реалізацію.

- [ ] **Step 8: Commit**

```bash
pnpm lint --fix lib/utils/characters/sheet lib/utils/abilities/build lib/constants types components/characters/skills lib/hooks/battle
git add lib types components/characters/skills
git commit -m "feat(profile): buildCharacterSheet — derived stats with breakdowns from the battle engine"
```

---

### Task 6: `GET /sheet` + клієнт + `useCharacterSheet`

**Files:**
- Create: `app/api/campaigns/[id]/characters/[characterId]/sheet/route.ts`, `sheet/sheet-handler.ts`
- Create: `lib/hooks/characters/useCharacterSheet.ts`
- Modify: `lib/api/characters.ts`, `lib/hooks/characters/index.ts`
- Test: `app/api/__tests__/character-sheet-api.test.ts`

**Interfaces:**
- Consumes: `buildCharacterSheet`, `SheetInput` (Task 5).
- Produces: `getCharacterSheet(campaignId, characterId): Promise<CharacterSheet>` (`lib/api`); `characterSheetKey(campaignId, characterId)`; `useCharacterSheet(campaignId, characterId)`; `invalidateCharacterSheet(queryClient, campaignId, characterId?)`.

- [ ] **Step 1: Write the failing test** — `app/api/__tests__/character-sheet-api.test.ts`

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/utils/battle/participant", () => ({ createBattleParticipantFromCharacter: vi.fn(async () => createMockParticipant()) }));
vi.mock("@/lib/utils/battle/participant/extract-artifacts", () => ({ loadEquippedArtifactRows: vi.fn(async () => []) }));
vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findUnique: vi.fn() },
    race: { findFirst: vi.fn(async () => ({ icon: "/elf.png" })) },
    spell: { findMany: vi.fn(async () => []) },
    skill: { findFirst: vi.fn(async () => null) },
    artifactSet: { findMany: vi.fn(async () => []) },
    artifact: { findMany: vi.fn(async () => []) },
  },
}));

const access = (userId: string, role: "dm" | "player") => ({ userId, campaign: { id: "camp", members: [{ userId, role }] } }) as never;

const CHAR = { id: "ch", campaignId: "camp", controlledBy: "owner", name: "Ліра", avatar: null, level: 30, class: "Ranger", subclass: null, race: "Ельф", alignment: null, armorClass: 14, strength: 10, dexterity: 18, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, savingThrows: {}, skills: {}, languages: [], proficiencies: {}, immunities: [], spellcastingAbility: null, hpMultiplier: null, background: null, goals: [], personalSkillId: null, inventory: null };

const get = async () => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/sheet/route");

  return mod.GET(new Request("http://x"), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("GET sheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue(CHAR as never);
  });

  it("власник бачить свій лист з іконкою раси", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const res = await get();

    expect(res.status).toBe(200);
    expect(await getResponseJson(res)).toMatchObject({ identity: { name: "Ліра", raceIcon: "/elf.png" }, viewer: { isDM: false, isOwner: true } });
  });

  it("чужий гравець → 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("stranger", "player"));

    expect((await get()).status).toBe(403);
  });

  it("ДМ бачить будь-кого", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));

    expect((await get()).status).toBe(200);
  });

  it("персонаж іншої кампанії → 404", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ ...CHAR, campaignId: "other" } as never);

    expect((await get()).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run app/api/__tests__/character-sheet-api.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Implement** — `sheet/sheet-handler.ts`

```ts
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { loadArtifactSetBattleMaps } from "@/lib/utils/battle/artifact-sets/load-maps";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant";
import { loadEquippedArtifactRows } from "@/lib/utils/battle/participant/extract-artifacts";
import { buildCharacterSheet } from "@/lib/utils/characters/sheet";
import type { CharacterSheet } from "@/types/characters";
import type { BookSpellDto } from "@/types/spells";

const SPELL_SELECT = { id: true, name: true, level: true, type: true, damageType: true, diceCount: true, diceType: true, savingThrow: true, hitCheck: true, description: true, icon: true, range: true, duration: true, concentration: true, damageElement: true, spellGroup: { select: { id: true, name: true } } } as const;

export type SheetResult = { sheet: CharacterSheet } | { error: string; status: 403 | 404 };

export async function loadCharacterSheet(campaignId: string, characterId: string, viewer: { userId: string; isDM: boolean }): Promise<SheetResult> {
  const character = await prisma.character.findUnique({ where: { id: characterId }, include: { inventory: true } });

  if (!character || character.campaignId !== campaignId) return { error: "Not found", status: 404 };

  const isOwner = character.controlledBy === viewer.userId;

  if (!viewer.isDM && !isOwner) return { error: "Forbidden", status: 403 };

  const built = await createBattleParticipantFromCharacter(character, "", ParticipantSide.ALLY);

  const [participant] = applyBakedAuras([built], new Set([built.basicInfo.id]));

  const rows = await loadEquippedArtifactRows(character);

  const setIds = [...new Set(rows.map((r) => r.row.setId).filter((id): id is string => !!id))];

  const known = participant.spellcasting.knownSpells ?? [];

  const [maps, race, spells, personal] = await Promise.all([
    loadArtifactSetBattleMaps(campaignId, setIds),
    prisma.race.findFirst({ where: { campaignId, name: character.race }, select: { icon: true } }),
    known.length ? prisma.spell.findMany({ where: { campaignId, id: { in: known } }, select: SPELL_SELECT }) : Promise.resolve([]),
    character.personalSkillId ? prisma.skill.findFirst({ where: { id: character.personalSkillId, campaignId }, select: { id: true, name: true, icon: true, description: true } }) : Promise.resolve(null),
  ]);

  const equippedIds = new Set(rows.map((r) => r.row.id));

  const sheet = buildCharacterSheet({
    participant,
    viewer: { isDM: viewer.isDM, isOwner },
    character,
    raceIcon: race?.icon ?? null,
    artifacts: rows.map(({ row, slot }) => ({ id: row.id, name: row.name, icon: row.icon, slot: row.slot, rarity: row.rarity, description: row.description, effects: abilitySummary("artifact", row), gridSlot: slot })),
    sets: setIds.flatMap((id) => {
      const set = maps.artifactSetsById[id];

      const members = maps.artifactSetMemberIds[id] ?? [];

      if (!set) return [];

      const have = members.filter((m) => equippedIds.has(m)).length;

      return [{ id, name: set.name, have, total: members.length, complete: have === members.length && members.length > 0, effects: abilitySummary("artifactSet", set as never) }];
    }),
    spells: spells as unknown as BookSpellDto[],
    personalSkill: personal,
  });

  return { sheet };
}
```

`sheet/route.ts`:

```ts
import { NextResponse } from "next/server";

import { loadCharacterSheet } from "./sheet-handler";

import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const access = await requireCampaignAccess(id, false);

    if (access instanceof NextResponse) return access;

    const result = await loadCharacterSheet(id, characterId, { userId: access.userId, isDM: access.campaign.members[0]?.role === "dm" });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json(result.sheet);
  } catch (error) {
    return handleApiError(error, { action: "fetch character sheet" });
  }
}
```

> Якщо `access.campaign` у типі `CampaignAccessResult` не має `members`, розширити тип у `api-auth.ts` (повертати `members` з уже прочитаного рядка — PATCH персонажа вже на них покладається).

`lib/api/characters.ts` — додати:

```ts
export const getCharacterSheet = (campaignId: string, characterId: string) => campaignGet<CharacterSheet>(campaignId, `/characters/${characterId}/sheet`);
```

`lib/hooks/characters/useCharacterSheet.ts`:

```ts
"use client";

import { type QueryClient, useQuery } from "@tanstack/react-query";

import { getCharacterSheet } from "@/lib/api/characters";

export const characterSheetKey = (campaignId: string, characterId: string) => ["character-sheet", campaignId, characterId] as const;

export function invalidateCharacterSheet(queryClient: QueryClient, campaignId: string, characterId?: string) {
  return queryClient.invalidateQueries({ queryKey: characterId ? characterSheetKey(campaignId, characterId) : ["character-sheet", campaignId] });
}

export function useCharacterSheet(campaignId: string, characterId: string) {
  return useQuery({ queryKey: characterSheetKey(campaignId, characterId), queryFn: () => getCharacterSheet(campaignId, characterId), staleTime: 60_000, enabled: !!campaignId && !!characterId });
}
```

`index.ts`: `export { characterSheetKey, invalidateCharacterSheet, useCharacterSheet } from "./useCharacterSheet";`

- [ ] **Step 4: Run tests**

Run: `pnpm test:run app/api/__tests__/character-sheet-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Smoke against local DB**

Run: `pnpm dev`, далі в браузері під гравцем (Task 16 налаштовує) відкрити `http://localhost:3000/api/campaigns/cmuvy29ix0001eyhew9cq07qf/characters/<id Ліри>/sheet`. Id Ліри: `psql "$DATABASE_URL" -At -c "select id from characters where name='Ліра'"`.
Expected: JSON, `proficiency: 9`, атаки з `toHit`/`avgDamage`.

- [ ] **Step 6: Commit**

```bash
pnpm lint --fix app/api/campaigns lib/api lib/hooks/characters
git add app/api lib
git commit -m "feat(profile): GET character sheet endpoint and useCharacterSheet"
```

---

### Task 7: Цілі — `PUT /goals`, злиття, хук

**Files:**
- Create: `lib/utils/characters/goals.ts`, `app/api/campaigns/[id]/characters/[characterId]/goals/route.ts`, `lib/hooks/characters/useCharacterGoals.ts`
- Modify: `lib/api/characters.ts`, `lib/hooks/characters/index.ts`
- Test: `lib/utils/characters/__tests__/goals.test.ts`, `app/api/__tests__/character-goals-api.test.ts`

**Interfaces:**
- Consumes: `goalInputSchema`, `GoalInput`, `parseGoals` (Task 1), `characterSheetKey` (Task 6).
- Produces: `mergeGoals(current: CharacterGoal[], incoming: GoalInput[], role: "dm" | "player"): CharacterGoal[]`; `putCharacterGoals(campaignId, characterId, goals: GoalInput[]): Promise<{ goals: CharacterGoal[] }>`; `useCharacterGoals(campaignId, characterId)` → `{ save(goals: CharacterGoal[]): Promise<void>, isPending }`; `newGoalId(): string`.

- [ ] **Step 1: Write failing tests**

`lib/utils/characters/__tests__/goals.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { mergeGoals } from "@/lib/utils/characters/goals";
import type { CharacterGoal } from "@/types/characters";

const dm: CharacterGoal = { id: "d1", text: "Знайти брата", status: "active", author: "dm" };

const mine: CharacterGoal = { id: "p1", text: "Лук", status: "active", author: "player" };

describe("mergeGoals", () => {
  it("гравець: цілі ДМа незмінні, свої — з author=player", () => {
    const out = mergeGoals([dm, mine], [{ id: "d1", text: "ЗЛАМАНО", status: "done" }, { id: "p1", text: "Лук батька", status: "done" }, { id: "p2", text: "Нова", status: "active", author: "dm" }], "player");

    expect(out).toEqual([dm, { ...mine, text: "Лук батька", status: "done" }, { id: "p2", text: "Нова", status: "active", author: "player" }]);
  });

  it("гравець не може видалити ціль ДМа", () => {
    expect(mergeGoals([dm, mine], [], "player")).toEqual([dm]);
  });

  it("ДМ змінює все; author за замовчуванням dm, наявний зберігається", () => {
    expect(mergeGoals([dm, mine], [{ id: "p1", text: "Лук", status: "failed" }, { id: "d2", text: "Х", status: "active" }], "dm")).toEqual([
      { ...mine, status: "failed" },
      { id: "d2", text: "Х", status: "active", author: "dm" },
    ]);
  });
});
```

`app/api/__tests__/character-goals-api.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn(), update: vi.fn(async ({ data }) => data) } } }));

const access = (userId: string, role: "dm" | "player") => ({ userId, campaign: { id: "camp", members: [{ userId, role }] } }) as never;

const put = async (body: unknown) => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/goals/route");

  return mod.PUT(new Request("http://x", { method: "PUT", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("PUT goals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "camp", controlledBy: "owner", goals: [{ id: "d1", text: "ДМ", status: "active", author: "dm" }] } as never);
  });

  it("власник додає свою ціль, ціль ДМа не змінюється", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const res = await put({ goals: [{ id: "d1", text: "x", status: "done" }, { id: "p1", text: "Моя", status: "active" }] });

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data.goals).toEqual([
      { id: "d1", text: "ДМ", status: "active", author: "dm" },
      { id: "p1", text: "Моя", status: "active", author: "player" },
    ]);
  });

  it("чужий гравець → 403; невалідне тіло → 400", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("stranger", "player"));
    expect((await put({ goals: [] })).status).toBe(403);

    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    expect((await put({ goals: [{ id: "x", text: "", status: "active" }] })).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm test:run lib/utils/characters/__tests__/goals.test.ts app/api/__tests__/character-goals-api.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`lib/utils/characters/goals.ts`:

```ts
import type { GoalInput } from "@/lib/schemas/characters";
import type { CharacterGoal } from "@/types/characters";

export const newGoalId = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function mergeGoals(current: CharacterGoal[], incoming: GoalInput[], role: "dm" | "player"): CharacterGoal[] {
  const byId = new Map(current.map((g) => [g.id, g]));

  if (role === "dm") {
    return incoming.map((g) => ({ id: g.id, text: g.text, status: g.status, author: byId.get(g.id)?.author ?? g.author ?? "dm" }));
  }

  const dmGoals = current.filter((g) => g.author === "dm");

  const dmIds = new Set(dmGoals.map((g) => g.id));

  const own = incoming.filter((g) => !dmIds.has(g.id)).map((g) => ({ id: g.id, text: g.text, status: g.status, author: "player" as const }));

  return [...dmGoals, ...own].slice(0, 30);
}
```

`goals/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { goalInputSchema, parseGoals } from "@/lib/schemas";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { mergeGoals } from "@/lib/utils/characters/goals";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const access = await requireCampaignAccess(id, false);

    if (access instanceof NextResponse) return access;

    const character = await prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true, controlledBy: true, goals: true } });

    if (!character || character.campaignId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isDM = access.campaign.members[0]?.role === "dm";

    if (!isDM && character.controlledBy !== access.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = goalInputSchema.safeParse(await request.json());

    if (!parsed.success) return NextResponse.json({ error: "Invalid goals" }, { status: 400 });

    const goals = mergeGoals(parseGoals(character.goals), parsed.data.goals, isDM ? "dm" : "player");

    await prisma.character.update({ where: { id: characterId }, data: { goals: goals as unknown as Prisma.InputJsonValue } });

    return NextResponse.json({ goals });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid goals" }, { status: 400 });

    return handleApiError(error, { action: "update goals" });
  }
}
```

`lib/api/characters.ts`:

```ts
export const putCharacterGoals = (campaignId: string, characterId: string, goals: GoalInput[]) =>
  campaignRequest<{ goals: CharacterGoal[] }>(campaignId, `/characters/${characterId}/goals`, { method: "PUT", body: { goals } });
```

> Звірити сигнатуру `campaignRequest` з `lib/api/client.ts:130` (як передається метод і тіло) і підлаштувати виклик під неї.

`lib/hooks/characters/useCharacterGoals.ts`:

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { characterSheetKey } from "./useCharacterSheet";

import { putCharacterGoals } from "@/lib/api/characters";
import { useNotify } from "@/lib/hooks/common";
import type { CharacterGoal, CharacterSheet } from "@/types/characters";

export function useCharacterGoals(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const key = characterSheetKey(campaignId, characterId);

  const setGoals = (goals: CharacterGoal[]) => queryClient.setQueryData<CharacterSheet>(key, (old) => (old ? { ...old, story: { ...old.story, goals } } : old));

  const mutation = useMutation({
    mutationFn: (goals: CharacterGoal[]) => putCharacterGoals(campaignId, characterId, goals),
    onMutate: (goals) => {
      const prev = queryClient.getQueryData<CharacterSheet>(key)?.story.goals;

      setGoals(goals);

      return { prev };
    },
    onError: (_e, _g, ctx) => {
      if (ctx?.prev) setGoals(ctx.prev);

      void notify("Не вдалося зберегти цілі");
    },
    onSuccess: ({ goals }) => setGoals(goals),
  });

  return { save: (goals: CharacterGoal[]) => mutation.mutateAsync(goals).then(() => undefined), isPending: mutation.isPending };
}
```

`index.ts`: `export { useCharacterGoals } from "./useCharacterGoals";`

- [ ] **Step 4: Run tests**

Run: `pnpm test:run lib/utils/characters app/api/__tests__/character-goals-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/utils/characters app/api/campaigns lib/api lib/hooks/characters
git add lib app/api
git commit -m "feat(profile): character goals endpoint — players edit only their own goals"
```

---

### Task 8: Іконка раси, відмінок, зона дотику слота (проблема 5)

**Files:**
- Create: `lib/utils/common/plural.ts`, `lib/utils/common/__tests__/plural.test.ts`
- Modify: `lib/schemas/races.ts`, `components/races/RaceFormFields.tsx`, `components/races/RaceEditFormUtils.ts`, `components/races/RaceEditForm.tsx` (якщо `dataToSave` перелічує поля), `types/progression.ts`, `app/api/campaigns/[id]/characters/[characterId]/progression/load-progression-context.ts`, `get-progression-handler.ts`, `components/skill-tree/progression/RacialRow.tsx`, `OfferList.tsx`, `SlotButton.tsx`
- Test: `components/skill-tree/progression/__tests__/racial-row-icon.test.tsx`, наявні тести прогресії

**Interfaces:**
- Produces: `pluralUk(n: number, forms: [string, string, string]): string`; `CharacterProgressionDto.raceIcon: string | null`.

- [ ] **Step 1: Write failing tests**

`lib/utils/common/__tests__/plural.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { pluralUk } from "@/lib/utils/common/plural";

const f: [string, string, string] = ["варіант", "варіанти", "варіантів"];

describe("pluralUk", () => {
  it.each([[1, "варіант"], [2, "варіанти"], [4, "варіанти"], [5, "варіантів"], [11, "варіантів"], [12, "варіантів"], [21, "варіант"], [22, "варіанти"], [0, "варіантів"]])("%i → %s", (n, w) => {
    expect(pluralUk(n, f)).toBe(w);
  });
});
```

`components/skill-tree/progression/__tests__/racial-row-icon.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RacialRow } from "@/components/skill-tree/progression/RacialRow";

describe("RacialRow", () => {
  it("іконка раси замість літери", () => {
    const dto = { race: "Ельф", raceIcon: "https://x/elf.png", skills: {} } as never;

    render(<RacialRow states={[]} tree={{ nodes: new Map() } as never} dto={dto} onSelect={() => {}} />);

    expect(screen.getByRole("img", { name: "Ельф" })).toBeTruthy();
    expect(screen.queryByText("Е")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm test:run lib/utils/common/__tests__/plural.test.ts components/skill-tree/progression/__tests__/racial-row-icon.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/utils/common/plural.ts`:

```ts
export function pluralUk(n: number, [one, few, many]: [string, string, string]): string {
  const a = Math.abs(n) % 100;

  const b = a % 10;

  if (a > 10 && a < 20) return many;

  if (b === 1) return one;

  if (b >= 2 && b <= 4) return few;

  return many;
}
```

`OfferList.tsx`: `Ще {list.length - 3} {pluralUk(list.length - 3, ["варіант", "варіанти", "варіантів"])} ▾`.

`SlotButton.tsx`: до `className` кнопки додати `relative after:absolute after:-inset-1 after:content-['']` — невидиме поле дотику +4 px з кожного боку (42 → 50 px). Сусіди не перекриваються, бо між слотами `gap-2` (8 px).

Прогресія:
- `types/progression.ts`: у `CharacterProgressionDto` додати `raceIcon: string | null;`;
- `load-progression-context.ts`: поруч із `skillTree.findFirst` паралельно (`Promise.all`) читати `prisma.race.findFirst({ where: { campaignId, name: character.race }, select: { icon: true } })` і повертати `raceIcon` у контексті;
- `get-progression-handler.ts`: прокинути `raceIcon` у DTO;
- оновити фікстури DTO в наявних тестах (`grep -rln "seenLevel: 3, isOwner" lib components app`), додавши `raceIcon: null`.

`RacialRow.tsx` — голова:

```tsx
        <span className="branch-frame hud-sc text-lg">
          {dto.raceIcon ? <OptimizedImage src={dto.raceIcon} alt={dto.race} width={52} height={52} className="h-full w-full object-cover" fallback={<span>{dto.race[0] ?? "?"}</span>} /> : (dto.race[0] ?? "?")}
        </span>
```

(+ `import { OptimizedImage } from "@/components/common/OptimizedImage";`)

Раса:
- `lib/schemas/races.ts`: у `createRaceSchema` і `updateRaceSchema` додати `icon: z.string().url().nullable().optional(),`;
- `RaceEditFormUtils.getInitialRaceFormData`: приймати `icon?: string | null` і повертати `icon: race.icon ?? null`;
- `RaceFormFields.tsx`: після поля назви додати

```tsx
      <ImageUpload value={formData.icon ?? ""} onChange={(v) => setFormData((prev) => ({ ...prev, icon: v || null }))} label="Іконка раси" placeholder="URL зображення або завантажте файл" previewAlt="Іконка раси" />
```

- `app/api/campaigns/[id]/races/route.ts` (POST) і `[raceId]/route.ts` (PATCH) — передати `icon` у `data`, якщо поля перелічені явно.

- [ ] **Step 4: Run tests**

Run: `pnpm test:run lib/utils/common components/skill-tree components/races app/api lib/hooks/skills`
Expected: PASS.

- [ ] **Step 5: Set Lira's race icon locally**

Залити іконку ельфів HoMM V у Supabase Storage тим самим шляхом, що й іконки гілок (подивитися будь-який `icon` з `main_skills` дерева ельфів у локальній БД і взяти той самий бакет/префікс). Потім: `psql "$DATABASE_URL" -c "update races set icon='<url>' where name='Ельф' and \"campaignId\"='cmuvy29ix0001eyhew9cq07qf'"`. Якщо готової іконки немає — поставити URL іконки ультимейта ельфійського дерева й повідомити про це в звіті.

- [ ] **Step 6: Commit**

```bash
pnpm lint --fix lib/utils/common components/skill-tree components/races lib/schemas types app/api/campaigns
git add -A lib components types app/api
git commit -m "fix(progression): race icon in the racial row, Ukrainian plural, 44px+ slot hit area"
```

---

### Task 9: Книга заклинань — `SpellBookPages` і перегляд у профілі

**Files:**
- Create: `components/battle/wizards/SpellBookPages.tsx`, `lib/hooks/characters/useSpellBrowser.ts`, `components/character-profile/magic/ProfileSpellBook.tsx`
- Modify: `components/battle/wizards/SpellBook.tsx`, `lib/hooks/characters/index.ts`
- Test: наявний `components/battle/wizards/__tests__/spell-book.test.tsx` (без змін — має лишитися зеленим), новий `components/character-profile/__tests__/profile-spell-book.test.tsx`

**Interfaces:**
- Consumes: `BookSpellDto` (Task 5).
- Produces: `SpellBookPages` props `{ byLevel: Record<number, BookSpellDto[]>; slotOf: (level: number) => number; level: number; selected: BookSpellDto | null; pickedId?: string | null; showDetail: boolean; wide: boolean; onLevel(l: number): void; onPick(s: BookSpellDto): void; detail?: ReactNode }`; `useSpellBrowser(spells: BookSpellDto[])` → `{ open: boolean; setOpen(o: boolean): void; level: number; setLevel(l): void; selected: BookSpellDto | null; pick(s): void; back(): void; byLevel }`; `ProfileSpellBook({ spells, slots, open, onOpenChange })`.

- [ ] **Step 1: Write the failing test** — `components/character-profile/__tests__/profile-spell-book.test.tsx`

```tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { ProfileSpellBook } from "@/components/character-profile/magic/ProfileSpellBook";

const spells = [
  { id: "mark", name: "Мітка мисливця", level: 1, type: "target", damageType: "damage", diceCount: 1, diceType: "d6", description: "Позначає ціль" },
  { id: "fog", name: "Туманна хмара", level: 1, type: "aoe", damageType: "all" },
] as never;

describe("ProfileSpellBook", () => {
  it("список кола → деталь без кнопок дії", () => {
    mockMatchMedia(true);
    render(<ProfileSpellBook spells={spells} slots={[{ level: 1, count: 4 }]} open onOpenChange={() => {}} />);

    expect(screen.getByRole("button", { name: /I коло, слотів 4/ })).toBeTruthy();
    fireEvent.click(screen.getByText("Мітка мисливця"));
    expect(screen.getByText("Позначає ціль")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Обрати цілі|Застосувати/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm test:run components/character-profile/__tests__/profile-spell-book.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Extract `SpellBookPages`**

У `SpellBook.tsx` вирізати в `SpellBookPages.tsx`: константи `LEVELS`, `CIRCLE`, `METAL`, розмітку `ribbons`, `listPage` і верхню частину `detailPage` (іконка, назва, школа, опис, сітка «Шкода/Дальність/Влучання/Тривалість»). Порядок і класи не змінювати. Експортувати `CIRCLE`.

```tsx
"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";

import { metalClass } from "@/components/battle/hud";
import { cn } from "@/lib/utils";
import { ROMAN, spellTier } from "@/lib/utils/battle/view";
import type { BookSpellDto } from "@/types/spells";

const LEVELS = [0, 1, 2, 3, 4, 5] as const;

export const CIRCLE = ["Замовляння", "Перше коло", "Друге коло", "Третє коло", "Четверте коло", "П'яте коло"];

const METAL = ["залізне", "бронзове", "срібне", "золоте", "міфрилове", "платинове"];

export interface SpellBookPagesProps {
  byLevel: Record<number, BookSpellDto[]>;
  slotOf: (level: number) => number;
  level: number;
  selected: BookSpellDto | null;
  pickedId?: string | null;
  showDetail: boolean;
  wide: boolean;
  onLevel: (level: number) => void;
  onPick: (spell: BookSpellDto) => void;
  detail?: ReactNode;
}

export function SpellBookPages({ byLevel, slotOf, level, selected, pickedId, showDetail, wide, onLevel, onPick, detail }: SpellBookPagesProps) {
  // ribbons / listPage / spellHeader — перенесена без змін розмітка з SpellBook.tsx,
  // де state.level → level, book.setLevel → onLevel, book.pick → onPick, state.pick?.spellId → pickedId.
  const spellHeader = selected && (/* верх detailPage від <div className="flex items-center gap-4"> до кінця сітки 2×2 */ null);

  return (
    <div className="relative pr-11">
      {/* ribbons */}
      <div className={cn("hud-book relative min-h-[70dvh] bg-[#e9dec5] shadow-[inset_14px_0_18px_-10px_rgba(60,40,20,.55)]", wide && "grid grid-cols-2")}>
        {(wide || !showDetail) && /* listPage */ null}
        {(wide || showDetail) && (selected ? <div className="relative flex h-full flex-col px-5 pb-5 pt-6">{spellHeader}{detail}</div> : wide && <div className="flex items-center justify-center italic text-[#7a6650]">Оберіть заклинання</div>)}
      </div>
    </div>
  );
}
```

> У цьому блоці коментарі `/* … */` позначають **перенесення наявної розмітки** з `SpellBook.tsx:31-87` (стрічки, список, шапка деталі). Код уже існує, його не вигадуємо. Реалізатор переносить його дослівно з наведеними перейменуваннями; у фінальному файлі цих коментарів-заглушок не лишається.

`SpellBook.tsx` після рефакторингу: `ResponsiveDialog` → `<SpellBookPages byLevel={byLevel} slotOf={slotOf} level={state.level} selected={selected} pickedId={state.pick?.spellId} showDetail={showDetail} wide={wide} onLevel={book.setLevel} onPick={book.pick} detail={…} />`. Тут `detail` — наявні гілки `state.step === "spell"` (тільки кнопка «Обрати цілі»/«Далі»), `targets`, `rolls`, `summary`. Шапку деталі показуємо лише для кроку `spell`: для решти кроків передати `selected` і рендерити шапку тільки коли `state.step === "spell"`. Для цього додати проп `showHeader?: boolean` (за замовчуванням `true`); бій передає `showHeader={state.step === "spell"}`.

- [ ] **Step 4: `useSpellBrowser` and `ProfileSpellBook`**

`lib/hooks/characters/useSpellBrowser.ts`:

```ts
"use client";

import { useMemo, useState } from "react";

import type { BookSpellDto } from "@/types/spells";

export function useSpellBrowser(spells: BookSpellDto[]) {
  const byLevel = useMemo(() => {
    const map: Record<number, BookSpellDto[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };

    for (const s of spells) (map[s.level] ??= []).push(s);

    for (const list of Object.values(map)) list.sort((a, b) => a.name.localeCompare(b.name, "uk"));

    return map;
  }, [spells]);

  const firstLevel = [1, 2, 3, 4, 5, 0].find((l) => byLevel[l]?.length) ?? 1;

  const [level, setLevel] = useState<number | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  return {
    byLevel,
    level: level ?? firstLevel,
    setLevel: (l: number) => {
      setLevel(l);
      setSelectedId(null);
    },
    selected: spells.find((s) => s.id === selectedId) ?? null,
    pick: (s: BookSpellDto) => setSelectedId(s.id),
    back: () => setSelectedId(null),
  };
}
```

`components/character-profile/magic/ProfileSpellBook.tsx`:

```tsx
"use client";

import { SpellBookPages } from "@/components/battle/wizards/SpellBookPages";
import { HUD_SURFACE } from "@/components/hud/fonts";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useSpellBrowser } from "@/lib/hooks/characters";
import { useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { BookSpellDto } from "@/types/spells";

export function ProfileSpellBook({ spells, slots, open, onOpenChange }: { spells: BookSpellDto[]; slots: { level: number; count: number }[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const book = useSpellBrowser(spells);

  const wide = useMediaQuery("(min-width: 1024px)");

  const showDetail = !!book.selected;

  const slotOf = (l: number) => (l === 0 ? Infinity : (slots.find((s) => s.level === l)?.count ?? 0));

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={showDetail && !wide ? "← До списку" : "Книга заклинань"} size="lg" className={cn(HUD_SURFACE, "max-w-[980px] border-none bg-[#3a2016] p-2.5 text-[#2a2018] shadow-[0_30px_80px_rgba(0,0,0,.9),inset_0_0_0_2px_#2a160f]")}>
      <SpellBookPages byLevel={book.byLevel} slotOf={slotOf} level={book.level} selected={book.selected} pickedId={book.selected?.id} showDetail={showDetail} wide={wide} onLevel={book.setLevel} onPick={book.pick} />
      {showDetail && !wide && (
        <button type="button" onClick={book.back} className="hud-sc mt-2 h-11 w-full text-sm text-[#e6dccb]">
          ← Назад
        </button>
      )}
    </ResponsiveDialog>
  );
}
```

> Якщо `HUD_SURFACE` експортується з `@/components/battle/hud`, а не з `@/components/hud/fonts`, взяти той самий шлях, що в `SpellBook.tsx`, і поправити `vi.mock` у тесті.

- [ ] **Step 5: Run tests**

Run: `pnpm test:run components/battle components/character-profile lib/hooks/battle`
Expected: PASS — бойовий `spell-book.test.tsx` без змін зелений.

- [ ] **Step 6: Commit**

```bash
pnpm lint --fix components/battle/wizards components/character-profile lib/hooks/characters
git add components lib/hooks/characters
git commit -m "refactor(spellbook): extract SpellBookPages; read-only profile spellbook"
```

---

### Task 10: Каркас профілю — контекст, hero, таби, «Бій»

**Files:**
- Create: `components/character-profile/{CharacterProfile.tsx,ProfileContext.tsx,ProfileHero.tsx,ProfileTabs.tsx,StatBreakdown.tsx,index.ts,profile.css}`
- Create: `components/character-profile/combat/{CombatTab.tsx,AbilityGrid.tsx,AttackList.tsx,DefenseList.tsx,SavesSkills.tsx}`
- Test: `components/character-profile/__tests__/combat-tab.test.tsx`, `profile-tabs.test.tsx`
- Test fixture: `components/character-profile/__tests__/sheet-fixture.ts`

**Interfaces:**
- Consumes: `CharacterSheet` (Task 5), `useCharacterSheet` (Task 6).
- Produces:
  - `ProfileContext`: `{ sheet: CharacterSheet; campaignId: string; characterId: string; editing: boolean; setEditing(v: boolean): void }` + `useProfile()`;
  - `ProfileTabs({ tabs: { value: ProfileTab; label: string; content: ReactNode }[] })`; `type ProfileTab = "basic" | "combat" | "skills" | "magic" | "items" | "story"`;
  - `CharacterProfile({ campaignId, characterId, canEdit })`;
  - `StatBreakdown({ lines })`.

- [ ] **Step 1: Fixture** — `sheet-fixture.ts` (спільна для Task 10–13):

```ts
import type { CharacterSheet } from "@/types/characters";

export const sheetFixture = (over: Partial<CharacterSheet> = {}): CharacterSheet => ({
  viewer: { isDM: false, isOwner: true },
  identity: { id: "lira", name: "Ліра", avatar: null, level: 30, className: "Слідопит", subclass: null, race: "Ельф", raceIcon: null, alignment: null },
  abilities: [
    { key: "strength", score: 10, mod: 0, isPrimary: false, lines: [{ label: "База", value: "10", source: "base" }] },
    { key: "dexterity", score: 18, mod: 4, isPrimary: true, lines: [{ label: "База", value: "18", source: "base" }] },
    { key: "constitution", score: 10, mod: 0, isPrimary: false, lines: [] },
    { key: "intelligence", score: 10, mod: 0, isPrimary: false, lines: [] },
    { key: "wisdom", score: 10, mod: 0, isPrimary: false, lines: [] },
    { key: "charisma", score: 10, mod: 0, isPrimary: false, lines: [] },
  ],
  proficiency: 9,
  hp: { total: 127, lines: [] },
  armorClass: { total: 14, lines: [{ label: "База", value: "14", source: "base" }] },
  initiative: 4,
  speed: 30,
  morale: 1,
  targets: { min: 1, max: 3 },
  immunities: ["контроль"],
  languages: ["Ельфійська"],
  proficiencies: [],
  attacks: [{ id: "bow", name: "Довгий лук", kind: "ranged", toHit: { total: 13, lines: [{ label: "Спритність ★", value: "+4", source: "ability" }, { label: "Майстерність", value: "+9", source: "proficiency" }] }, avgDamage: { total: 47, lines: [{ label: "Кубики", value: "4.5", source: "dice" }] } }],
  saves: [{ key: "dexterity", label: "Спритність", bonus: 13, proficient: true }],
  skills: [{ key: "perception", label: "Сприйняття", ability: "wisdom", bonus: 9, proficient: true }],
  passives: { perception: 19, investigation: 10, insight: 10 },
  magic: null,
  slots: [{ level: 1, count: 4 }, { level: 2, count: 2 }],
  spells: [],
  items: { grid: {}, artifacts: [], sets: [] },
  personalSkill: null,
  story: { biography: "Мати ==загинула==", goals: [] },
  ...over,
});
```

- [ ] **Step 2: Write failing tests**

`combat-tab.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { sheetFixture } from "./sheet-fixture";

import { CombatTab } from "@/components/character-profile/combat/CombatTab";
import { ProfileProvider } from "@/components/character-profile/ProfileContext";

const wrap = (sheet = sheetFixture()) => render(<ProfileProvider value={{ sheet, campaignId: "c", characterId: "lira", editing: false, setEditing: () => {} }}><CombatTab /></ProfileProvider>);

describe("CombatTab", () => {
  it("характеристики з модифікатором і ★ на основній", () => {
    wrap();

    expect(screen.getByLabelText("Спритність 18, модифікатор +4, основна")).toBeTruthy();
  });

  it("атака: влучання і ≈шкода, розкладка за тапом", () => {
    wrap();

    expect(screen.getByText("+13")).toBeTruthy();
    expect(screen.getByText("≈47")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Довгий лук/ }));
    expect(screen.getByText("Майстерність")).toBeTruthy();
  });

  it("без атак — порожній стан", () => {
    wrap(sheetFixture({ attacks: [] }));

    expect(screen.getByText("Немає зброї")).toBeTruthy();
  });

  it("захист, імунітети, навички", () => {
    wrap();

    expect(screen.getByText("контроль")).toBeTruthy();
    expect(screen.getByText(/Сприйняття/)).toBeTruthy();
  });
});
```

`profile-tabs.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const replace = vi.fn();

let search = new URLSearchParams("tab=story");

vi.mock("next/navigation", () => ({ useSearchParams: () => search, useRouter: () => ({ replace }), usePathname: () => "/campaigns/c/character" }));

import { ProfileTabs } from "@/components/character-profile/ProfileTabs";

const tabs = [
  { value: "combat" as const, label: "Бій", content: <p>бій</p> },
  { value: "story" as const, label: "Історія", content: <p>історія</p> },
];

describe("ProfileTabs", () => {
  it("відкриває табу з ?tab= і пише вибір у URL", () => {
    render(<ProfileTabs tabs={tabs} />);

    expect(screen.getByText("історія")).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Бій" }));
    expect(replace).toHaveBeenCalledWith("/campaigns/c/character?tab=combat", { scroll: false });
  });

  it("невідома таба → перша", () => {
    search = new URLSearchParams("tab=zzz");
    render(<ProfileTabs tabs={tabs} />);

    expect(screen.getAllByText("бій").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run to verify fail**

Run: `pnpm test:run components/character-profile`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement**

`ProfileContext.tsx`:

```tsx
"use client";

import { createContext, useContext } from "react";

import type { CharacterSheet } from "@/types/characters";

export interface ProfileContextValue {
  sheet: CharacterSheet;
  campaignId: string;
  characterId: string;
  editing: boolean;
  setEditing: (v: boolean) => void;
}

const Ctx = createContext<ProfileContextValue | null>(null);

export const ProfileProvider = Ctx.Provider;

export function useProfile(): ProfileContextValue {
  const v = useContext(Ctx);

  if (!v) throw new Error("useProfile outside ProfileProvider");

  return v;
}
```

`profile.css`:

```css
.character-profile { background: radial-gradient(120% 60% at 50% 0, #2a221a, #110e0b 70%); min-height: 100dvh; }
.character-profile .hud-h { font-family: var(--font-hud-sc), serif; font-size: 13px; letter-spacing: 0.06em; color: var(--gold); margin: 14px 0 6px; }
.character-profile .hud-card { border: 1px solid #4a3c2c; background: #1a140f; border-radius: 10px; }
.character-profile .hud-chip { border: 1px solid #4a3c2c; background: #1c1610; border-radius: 8px; min-width: 52px; min-height: 44px; }
```

`ProfileTabs.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ProfileTab = "basic" | "combat" | "skills" | "magic" | "items" | "story";

export function ProfileTabs({ tabs }: { tabs: { value: ProfileTab; label: string; content: ReactNode }[] }) {
  const search = useSearchParams();

  const router = useRouter();

  const pathname = usePathname();

  const wanted = search.get("tab");

  const value = tabs.some((t) => t.value === wanted) ? (wanted as ProfileTab) : tabs[0].value;

  const select = (next: string) => {
    const params = new URLSearchParams(search);

    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={value} onValueChange={select}>
      <TabsList className="sticky top-[52px] z-20 flex h-auto w-full gap-1 rounded-none border-b border-[#3a2e22] bg-[#0f0c09]/95 p-1.5 backdrop-blur">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="hud-sc h-11 min-w-0 flex-1 px-1 text-[13px] text-[var(--muted)] data-[state=active]:metal-gold data-[state=active]:metal-fill data-[state=active]:font-bold data-[state=active]:shadow-none">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-0 px-4 pb-28">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

> `data-[state=active]:metal-gold` — варіант Tailwind з довільним класом не спрацює, бо `metal-gold` не утиліта Tailwind. Тому активну табу оформлюємо через CSS у `profile.css`:
> `.character-profile [role=tab][data-state=active] { --m1:#8a6414; --m2:#e6c25a; background: linear-gradient(135deg,var(--m1),var(--m2) 55%,var(--m1)); color:#2a1d05; font-weight:700; }`
> і прибираємо ці два `data-[state=active]:` класи з `className`.

`StatBreakdown.tsx`:

```tsx
import type { SheetLine } from "@/types/characters";

export function StatBreakdown({ lines }: { lines: SheetLine[] }) {
  return (
    <ul className="mt-1 space-y-0.5 text-xs text-[var(--muted)]">
      {lines.map((l, i) => (
        <li key={i} className="flex justify-between gap-3">
          <span className="min-w-0 truncate">{l.label}</span>
          {l.value && <span className="shrink-0 tabular-nums text-[var(--bone)]">{l.value}</span>}
        </li>
      ))}
    </ul>
  );
}
```

`combat/AbilityGrid.tsx`:

```tsx
import { useProfile } from "../ProfileContext";

import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import { cn } from "@/lib/utils";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function AbilityGrid() {
  const { sheet } = useProfile();

  return (
    <div className="grid grid-cols-6 gap-1">
      {sheet.abilities.map((a) => {
        const meta = CORE_ABILITY_SCORES.find((x) => x.key === a.key)!;

        return (
          <div key={a.key} aria-label={`${meta.label} ${a.score}, модифікатор ${signed(a.mod)}${a.isPrimary ? ", основна" : ""}`} className={cn("hud-card flex flex-col items-center py-1.5", a.isPrimary && "border-[var(--gold)] shadow-[inset_0_0_0_1px_var(--gold)]")}>
            <span className="text-[10px] uppercase text-[var(--muted)]">{meta.label.slice(0, 3)}{a.isPrimary ? " ★" : ""}</span>
            <span className="text-lg font-bold text-[var(--ink)]">{a.score}</span>
            <span className={cn("text-[11px]", a.isPrimary ? "text-[var(--gold)]" : "text-[var(--muted)]")}>{signed(a.mod)}</span>
          </div>
        );
      })}
    </div>
  );
}
```

`combat/AttackList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Crosshair, Swords } from "lucide-react";

import { useProfile } from "../ProfileContext";
import { StatBreakdown } from "../StatBreakdown";

import { EmptyState } from "@/components/common/states";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function AttackList() {
  const { sheet } = useProfile();

  const [open, setOpen] = useState<string | null>(null);

  if (sheet.attacks.length === 0) return <EmptyState title="Немає зброї" description="Екіпіруйте зброю в табі «Речі»" />;

  return (
    <ul className="space-y-1.5">
      {sheet.attacks.map((a) => (
        <li key={a.id} className="hud-card">
          <button type="button" aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)} className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left">
            {a.kind === "ranged" ? <Crosshair className="size-4 shrink-0 text-[var(--gold)]" /> : <Swords className="size-4 shrink-0 text-[var(--gold)]" />}
            <span className="min-w-0 flex-1 truncate">{a.name}</span>
            <span className="text-lg font-bold tabular-nums text-[var(--ink)]">{signed(a.toHit.total)}</span>
            <span className="text-[11px] text-[var(--muted)]">влуч</span>
            <span className="ml-2 text-lg font-bold tabular-nums text-[var(--ink)]">≈{a.avgDamage.total}</span>
            <span className="text-[11px] text-[var(--muted)]">шкода</span>
          </button>
          {open === a.id && (
            <div className="grid gap-2 border-t border-[#3a2e22] px-3 py-2 sm:grid-cols-2">
              <div><div className="hud-sc text-xs text-[var(--gold)]">Влучання</div><StatBreakdown lines={a.toHit.lines} /></div>
              <div><div className="hud-sc text-xs text-[var(--gold)]">Середня шкода</div><StatBreakdown lines={a.avgDamage.lines} /></div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
```

> Перевірити пропси `EmptyState` у `components/common/states` (`title`/`description` або інші) і використати їх.

`combat/DefenseList.tsx`:

```tsx
"use client";

import { useState } from "react";

import { useProfile } from "../ProfileContext";
import { StatBreakdown } from "../StatBreakdown";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

const Row = ({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) => (
  <div className="border-b border-[#2a2218] py-2 text-sm">
    <div className="flex justify-between gap-3"><span>{label}</span><span className="tabular-nums text-[var(--ink)]">{value}</span></div>
    {children}
  </div>
);

export function DefenseList() {
  const { sheet } = useProfile();

  const [acOpen, setAcOpen] = useState(false);

  return (
    <div>
      <button type="button" className="block w-full text-left" aria-expanded={acOpen} onClick={() => setAcOpen(!acOpen)}>
        <Row label="AC" value={String(sheet.armorClass.total)}>{acOpen && <StatBreakdown lines={sheet.armorClass.lines} />}</Row>
      </button>
      <Row label="Ініціатива · Швидкість" value={`${signed(sheet.initiative)} · ${sheet.speed}`} />
      <Row label="Мораль · Цілей" value={`${signed(sheet.morale)} · ${sheet.targets.min}–${sheet.targets.max}`} />
      {sheet.immunities.length > 0 && (
        <Row label="Імунітети" value="">
          <div className="mt-1 flex flex-wrap gap-1">{sheet.immunities.map((i) => <span key={i} className="rounded border border-[#4a3c2c] px-1.5 text-xs">{i}</span>)}</div>
        </Row>
      )}
    </div>
  );
}
```

`combat/SavesSkills.tsx`:

```tsx
import { useProfile } from "../ProfileContext";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function SavesSkills() {
  const { sheet } = useProfile();

  const item = (x: { key: string; label: string; bonus: number; proficient: boolean }) => (
    <li key={x.key} className="flex justify-between gap-2 py-0.5">
      <span className={x.proficient ? "text-[var(--ink)]" : "text-[var(--muted)]"}>{x.proficient ? "● " : ""}{x.label}</span>
      <span className="tabular-nums">{signed(x.bonus)}</span>
    </li>
  );

  return (
    <div className="space-y-3 text-sm">
      <ul className="grid grid-cols-2 gap-x-4">{sheet.saves.map(item)}</ul>
      <ul className="grid grid-cols-2 gap-x-4">{sheet.skills.map(item)}</ul>
      <p className="text-xs text-[var(--muted)]">Пасивні: сприйняття {sheet.passives.perception} · розслідування {sheet.passives.investigation} · проникливість {sheet.passives.insight}</p>
      {(sheet.languages.length > 0 || sheet.proficiencies.length > 0) && <p className="text-xs text-[var(--muted)]">{[...sheet.languages, ...sheet.proficiencies].join(" · ")}</p>}
    </div>
  );
}
```

`combat/CombatTab.tsx`:

```tsx
import { AbilityGrid } from "./AbilityGrid";
import { AttackList } from "./AttackList";
import { DefenseList } from "./DefenseList";
import { SavesSkills } from "./SavesSkills";

export function CombatTab() {
  return (
    <>
      <h3 className="hud-h">Характеристики</h3>
      <AbilityGrid />
      <h3 className="hud-h">Атаки</h3>
      <AttackList />
      <h3 className="hud-h">Захист і параметри</h3>
      <DefenseList />
      <h3 className="hud-h">Рятівні кидки · навички</h3>
      <SavesSkills />
    </>
  );
}
```

`ProfileHero.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { useProfile } from "./ProfileContext";
import { StatBreakdown } from "./StatBreakdown";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Button } from "@/components/ui/button";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function ProfileHero({ actions }: { actions?: { onEdit?: () => void; onLevelUp?: () => void } }) {
  const { sheet } = useProfile();

  const { identity: id } = sheet;

  const [hpOpen, setHpOpen] = useState(false);

  const [compact, setCompact] = useState(false);

  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;

    if (!el) return;

    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting));

    io.observe(el);

    return () => io.disconnect();
  }, []);

  const bestHit = sheet.attacks.length ? Math.max(...sheet.attacks.map((a) => a.toHit.total)) : null;

  const chips: [string, string][] = [["AC", String(sheet.armorClass.total)], ["Ініц", signed(sheet.initiative)], ["Швидк", String(sheet.speed)], ["Влуч", bestHit == null ? "—" : signed(bestHit)], ["Майст", signed(sheet.proficiency)]];

  return (
    <>
      <header className="px-4 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--gold)] bg-[#2a2016]">
            {id.avatar ? <OptimizedImage src={id.avatar} alt="" width={56} height={56} className="size-full object-cover" fallback={<span className="hud-sc text-xl">{id.name[0]}</span>} /> : <span className="hud-sc text-xl">{id.name[0]}</span>}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="hud-sc truncate text-xl text-[var(--ink)]">{id.name}</h1>
            <p className="flex items-center gap-1 truncate text-xs text-[var(--muted)]">
              {id.level} рів. · {id.className}{id.subclass ? ` (${id.subclass})` : ""} · {id.raceIcon && <OptimizedImage src={id.raceIcon} alt="" width={14} height={14} className="inline size-3.5" />}{id.race}{id.alignment ? ` · ${id.alignment}` : ""}
            </p>
            <button type="button" onClick={() => setHpOpen(!hpOpen)} aria-expanded={hpOpen} className="mt-1 min-h-11 text-left text-sm">
              <span className="text-[var(--muted)]">HP </span><span className="font-bold text-[var(--ink)]">{sheet.hp.total}</span>
            </button>
          </div>
          {(actions?.onEdit || actions?.onLevelUp) && (
            <div className="flex shrink-0 flex-col gap-1">
              {actions.onEdit && <Button size="icon" variant="outline" aria-label="Редагувати" onClick={actions.onEdit} className="size-11"><Pencil /></Button>}
              {actions.onLevelUp && <Button size="icon" variant="outline" aria-label={`Підняти рівень до ${id.level + 1}`} onClick={actions.onLevelUp} className="size-11"><Plus /></Button>}
            </div>
          )}
        </div>
        {hpOpen && <StatBreakdown lines={sheet.hp.lines} />}
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {chips.map(([label, value]) => (
            <div key={label} className="hud-chip flex flex-col items-center justify-center py-1">
              <span className="text-base font-bold leading-5 text-[var(--ink)]">{value}</span>
              <span className="text-[10px] uppercase text-[var(--muted)]">{label}</span>
            </div>
          ))}
        </div>
      </header>
      <div ref={sentinel} aria-hidden className="h-px" />
      <div aria-hidden={!compact} className={`sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-[#3a2e22] bg-[#0f0c09]/95 px-4 text-xs backdrop-blur transition-opacity ${compact ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <span className="hud-sc text-sm text-[var(--ink)]">{id.name} · {id.level}</span>
        <span className="text-[var(--muted)]">HP {sheet.hp.total} · AC {sheet.armorClass.total} · Влуч {bestHit == null ? "—" : signed(bestHit)}</span>
      </div>
    </>
  );
}
```

> Sticky-рядок висотою 52 px завжди займає місце, а `ProfileTabs` липне під ним (`top-[52px]`). На 390 px це прийнятно, бо hero прокручується над ним. Якщо в браузері (Task 16) рядок виглядатиме як зайвий проміжок до прокрутки, зробити його `fixed` і додати `top` табам лише при `compact`.

`CharacterProfile.tsx` (у цьому завданні — лише перегляд; редактор додає Task 13):

```tsx
"use client";

import "@/components/hud/hud.css";
import "./profile.css";

import { useState } from "react";

import { CombatTab } from "./combat/CombatTab";
import { ProfileHero } from "./ProfileHero";
import { ProfileProvider } from "./ProfileContext";
import { ProfileTabs } from "./ProfileTabs";

import { ErrorState, LoadingState } from "@/components/common/states";
import { HUD_SURFACE } from "@/components/hud/fonts";
import { FreePointBadge, LevelUpOverlay } from "@/components/skill-tree/progression";
import { useCharacterSheet } from "@/lib/hooks/characters";
import { cn } from "@/lib/utils";

export function CharacterProfile({ campaignId, characterId, canEdit }: { campaignId: string; characterId: string; canEdit: boolean }) {
  const query = useCharacterSheet(campaignId, characterId);

  const [editing, setEditing] = useState(false);

  if (query.isPending) return <LoadingState rows={6} label="Завантаження персонажа…" />;

  if (query.isError || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const sheet = query.data;

  return (
    <ProfileProvider value={{ sheet, campaignId, characterId, editing, setEditing }}>
      <div className={cn(HUD_SURFACE, "character-profile mx-auto max-w-3xl")}>
        <ProfileHero actions={canEdit ? { onEdit: () => setEditing(true) } : undefined} />
        <ProfileTabs tabs={[{ value: "combat", label: "Бій", content: <CombatTab /> }]} />
        <LevelUpOverlay campaignId={campaignId} characterId={characterId} />
        <FreePointBadge campaignId={campaignId} characterId={characterId} />
      </div>
    </ProfileProvider>
  );
}
```

> Звірити пропси `LevelUpOverlay`/`FreePointBadge` і `ErrorState` з тим, як їх викликає старий `character-view-client.tsx`, і передати так само. `index.ts`: `export { CharacterProfile } from "./CharacterProfile";`.

- [ ] **Step 5: Run tests**

Run: `pnpm test:run components/character-profile`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm lint --fix components/character-profile
git add components/character-profile
git commit -m "feat(profile): HUD profile shell — hero, URL tabs, combat tab"
```

---

### Task 11: Таби «Вміння», «Магія», «Речі»

**Files:**
- Create: `components/character-profile/skills/SkillsTab.tsx`, `magic/MagicTab.tsx`, `magic/SlotPlate.tsx`, `items/ItemsTab.tsx`, `items/ArtifactSheet.tsx`
- Modify: `components/character-profile/CharacterProfile.tsx`
- Test: `components/character-profile/__tests__/magic-items.test.tsx`

**Interfaces:**
- Consumes: `useProfile` (Task 10), `ProfileSpellBook` (Task 9), `ProgressionPanel`.
- Produces: `SkillsTab`, `MagicTab`, `ItemsTab`.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

import { sheetFixture } from "./sheet-fixture";

import { ItemsTab } from "@/components/character-profile/items/ItemsTab";
import { MagicTab } from "@/components/character-profile/magic/MagicTab";
import { ProfileProvider } from "@/components/character-profile/ProfileContext";
import { mockMatchMedia } from "@/components/ui/__tests__/match-media";

const ring = { id: "r", name: "Кільце вогню", icon: null, slot: "ring", rarity: "rare", description: "Гаряче", effects: ["Шкода вогнем +2"] };

const wrap = (node: React.ReactNode, over = {}) => render(<ProfileProvider value={{ sheet: sheetFixture(over), campaignId: "c", characterId: "lira", editing: false, setEditing: () => {} }}>{node}</ProfileProvider>);

describe("MagicTab", () => {
  it("слоти «I · 4», кнопка книги", () => {
    mockMatchMedia(true);
    wrap(<MagicTab />);

    expect(screen.getByLabelText("Слоти I кола: 4")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Книга заклинань" })).toBeTruthy();
  });
});

describe("ItemsTab", () => {
  it("список по артефактах з ефектами; тап відкриває опис", () => {
    mockMatchMedia(true);
    wrap(<ItemsTab />, { items: { grid: { ring1: ring }, artifacts: [ring], sets: [{ id: "s", name: "Мисливець", have: 2, total: 3, complete: false, effects: ["Ініціатива +1"] }] } });

    expect(screen.getByText("Шкода вогнем +2")).toBeTruthy();
    expect(screen.getByText(/Мисливець · 2\/3/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /Кільце вогню/ })[0]);
    expect(screen.getByText("Гаряче")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm test:run components/character-profile/__tests__/magic-items.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`magic/SlotPlate.tsx`:

```tsx
import { metalClass } from "@/components/battle/hud";
import { cn } from "@/lib/utils";
import { ROMAN, spellTier } from "@/lib/utils/battle/view";

export function SlotPlate({ level, count }: { level: number; count: number }) {
  return (
    <span aria-label={`Слоти ${ROMAN[level]} кола: ${count}`} className={cn("hud-sc flex h-11 min-w-16 items-center justify-center gap-1.5 rounded-md px-2 text-sm metal-fill", metalClass(spellTier(level)))}>
      {ROMAN[level]} <span aria-hidden>·</span> {count}
    </span>
  );
}
```

`magic/MagicTab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";

import { useProfile } from "../ProfileContext";
import { ProfileSpellBook } from "./ProfileSpellBook";
import { SlotPlate } from "./SlotPlate";

import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";

export function MagicTab() {
  const { sheet } = useProfile();

  const [open, setOpen] = useState(false);

  if (!sheet.magic && sheet.slots.length === 0 && sheet.spells.length === 0) return <EmptyState title="Магії немає" />;

  return (
    <>
      {sheet.magic && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-[var(--muted)]">
          <div className="hud-chip py-1"><b className="block text-lg text-[var(--ink)]">{sheet.magic.saveDC}</b>СЛ</div>
          <div className="hud-chip py-1"><b className="block text-lg text-[var(--ink)]">+{sheet.magic.attackBonus}</b>Атака</div>
          <div className="hud-chip py-1"><b className="block text-sm leading-7 text-[var(--ink)]">{CORE_ABILITY_SCORES.find((a) => a.key === sheet.magic!.ability)?.label}</b>Характ.</div>
        </div>
      )}
      <h3 className="hud-h">Слоти</h3>
      <div className="flex flex-wrap gap-1.5">{sheet.slots.map((s) => <SlotPlate key={s.level} {...s} />)}</div>
      <Button type="button" onClick={() => setOpen(true)} className="hud-sc mt-4 h-12 w-full bg-[#7a2a1f] text-[#f3e7cc] hover:bg-[#8a3427]">
        <BookOpen /> Книга заклинань
      </Button>
      <ProfileSpellBook spells={sheet.spells} slots={sheet.slots} open={open} onOpenChange={setOpen} />
    </>
  );
}
```

`items/ArtifactSheet.tsx`:

```tsx
import type { SheetArtifact } from "@/types/characters";

import { HUD_SURFACE } from "@/components/hud/fonts";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

export function ArtifactSheet({ artifact, onClose }: { artifact: SheetArtifact | null; onClose: () => void }) {
  return (
    <ResponsiveDialog open={!!artifact} onOpenChange={(o) => !o && onClose()} title={artifact?.name ?? ""} description={artifact?.rarity ?? undefined} className={`${HUD_SURFACE} bg-[#16110d] text-[var(--bone)]`}>
      {artifact?.description && <p className="hud-book text-[15px] leading-6">{artifact.description}</p>}
      <ul className="mt-3 space-y-1 text-sm">{artifact?.effects.map((e) => <li key={e}>◆ {e}</li>)}</ul>
    </ResponsiveDialog>
  );
}
```

`items/ItemsTab.tsx`:

```tsx
"use client";

import { useState } from "react";

import { useProfile } from "../ProfileContext";
import { ArtifactSheet } from "./ArtifactSheet";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { EmptyState } from "@/components/common/states";
import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import type { SheetArtifact } from "@/types/characters";

const Icon = ({ a, size }: { a: SheetArtifact; size: number }) => (a.icon ? <OptimizedImage src={a.icon} alt="" width={size} height={size} className="size-full object-contain" fallback={<span className="hud-sc">{a.name[0]}</span>} /> : <span className="hud-sc">{a.name[0]}</span>);

export function ItemsTab() {
  const { sheet } = useProfile();

  const [shown, setShown] = useState<SheetArtifact | null>(null);

  const { grid, artifacts, sets } = sheet.items;

  return (
    <>
      <div className="mx-auto mt-4 grid w-[216px] grid-cols-3 gap-1.5">
        {ARTIFACT_GRID_9.map((cell) => {
          const a = grid[cell.key];

          return a ? (
            <button key={cell.key} type="button" aria-label={`${cell.label}: ${a.name}`} onClick={() => setShown(a)} className="hud-card flex aspect-square items-center justify-center overflow-hidden border-[var(--gold)] p-1">
              <Icon a={a} size={64} />
            </button>
          ) : (
            <div key={cell.key} aria-label={`${cell.label}: порожньо`} className="hud-card flex aspect-square items-center justify-center text-[10px] text-[var(--muted)]">{cell.label}</div>
          );
        })}
      </div>
      <h3 className="hud-h">Бонуси від речей</h3>
      {artifacts.length === 0 && sets.length === 0 ? (
        <EmptyState title="Нічого не екіпіровано" />
      ) : (
        <ul className="divide-y divide-[#2a2218] text-sm">
          {artifacts.map((a) => (
            <li key={a.id}>
              <button type="button" aria-label={a.name} onClick={() => setShown(a)} className="flex min-h-11 w-full items-start gap-2 py-2 text-left">
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden"><Icon a={a} size={32} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[var(--ink)]">{a.name}</span>
                  <span className="block text-xs text-[var(--muted)]">{a.effects.length ? a.effects.join(" · ") : "без ефектів"}</span>
                </span>
              </button>
            </li>
          ))}
          {sets.map((s) => (
            <li key={s.id} className="py-2">
              <span className={s.complete ? "text-[var(--gold)]" : "text-[var(--muted)]"}>✦ {s.name} · {s.have}/{s.total}</span>
              <span className="block text-xs text-[var(--muted)]">{s.complete ? s.effects.join(" · ") : `Ще ${s.total - s.have} до бонусу: ${s.effects.join(" · ")}`}</span>
            </li>
          ))}
        </ul>
      )}
      <ArtifactSheet artifact={shown} onClose={() => setShown(null)} />
    </>
  );
}
```

`skills/SkillsTab.tsx`:

```tsx
import { useProfile } from "../ProfileContext";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { ProgressionPanel } from "@/components/skill-tree/progression";

export function SkillsTab() {
  const { sheet, campaignId, characterId } = useProfile();

  const p = sheet.personalSkill;

  return (
    <>
      <div className="-mx-4 mt-2"><ProgressionPanel campaignId={campaignId} characterId={characterId} canManage={sheet.viewer.isDM} /></div>
      <h3 className="hud-h">Персональне вміння</h3>
      {p ? (
        <div className="hud-card flex gap-3 p-3">
          {p.icon && <OptimizedImage src={p.icon} alt="" width={44} height={44} className="size-11 shrink-0" />}
          <div><div className="hud-sc text-[var(--ink)]">{p.name}</div>{p.description && <p className="text-sm text-[var(--muted)]">{p.description}</p>}</div>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">Не обрано</p>
      )}
    </>
  );
}
```

`CharacterProfile.tsx`: таби стають

```tsx
const tabs = [
  { value: "combat" as const, label: "Бій", content: <CombatTab /> },
  { value: "skills" as const, label: "Вміння", content: <SkillsTab /> },
  { value: "magic" as const, label: "Магія", content: <MagicTab /> },
  { value: "items" as const, label: "Речі", content: <ItemsTab /> },
];
```

- [ ] **Step 4: Run tests**

Run: `pnpm test:run components/character-profile`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix components/character-profile
git add components/character-profile
git commit -m "feat(profile): skills, magic (slots + spellbook) and items (per-artifact effects) tabs"
```

---

### Task 12: Таба «Історія» — цілі й біографія

**Files:**
- Create: `components/character-profile/story/{StoryTab.tsx,GoalList.tsx,BiographyText.tsx,BiographyEditor.tsx}`
- Modify: `CharacterProfile.tsx` (додати табу)
- Test: `components/character-profile/__tests__/story-tab.test.tsx`

**Interfaces:**
- Consumes: `parseHighlights`, `toggleHighlight` (Task 4); `useCharacterGoals`, `newGoalId` (Task 7).
- Produces: `BiographyText({ text })`; `BiographyEditor({ value, onChange })`; `GoalList()` (читає `useProfile`).

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const save = vi.fn(async () => {});

vi.mock("@/lib/hooks/characters", () => ({ useCharacterGoals: () => ({ save, isPending: false }) }));

import { sheetFixture } from "./sheet-fixture";

import { ProfileProvider } from "@/components/character-profile/ProfileContext";
import { BiographyEditor } from "@/components/character-profile/story/BiographyEditor";
import { BiographyText } from "@/components/character-profile/story/BiographyText";
import { GoalList } from "@/components/character-profile/story/GoalList";
import type { CharacterGoal } from "@/types/characters";

const dmGoal: CharacterGoal = { id: "d1", text: "Знайти брата", status: "active", author: "dm" };

const myGoal: CharacterGoal = { id: "p1", text: "Повернути лук", status: "active", author: "player" };

const done: CharacterGoal = { id: "d2", text: "Вступити в гільдію", status: "done", author: "dm" };

const wrap = (isDM: boolean) => render(<ProfileProvider value={{ sheet: sheetFixture({ viewer: { isDM, isOwner: !isDM }, story: { biography: null, goals: [done, dmGoal, myGoal] } }), campaignId: "c", characterId: "lira", editing: false, setEditing: () => {} }}><GoalList /></ProfileProvider>);

describe("BiographyText", () => {
  it("підсвічує ==…== як <mark>, без HTML-ін'єкцій", () => {
    const { container } = render(<BiographyText text={"Мати ==загинула== <b>x</b>"} />);

    expect(container.querySelector("mark")?.textContent).toBe("загинула");
    expect(container.querySelector("b")).toBeNull();
  });
});

describe("BiographyEditor", () => {
  it("Маркер обгортає виділене", () => {
    const onChange = vi.fn();

    render(<BiographyEditor value="брат зник" onChange={onChange} />);

    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    ta.setSelectionRange(5, 9);
    fireEvent.click(screen.getByRole("button", { name: "Маркер" }));
    expect(onChange).toHaveBeenCalledWith("брат ==зник==");
  });
});

describe("GoalList", () => {
  it("активні зверху, виконані нижче; бейдж «від гравця»", () => {
    wrap(false);

    const items = screen.getAllByRole("listitem").map((li) => li.textContent);

    expect(items[0]).toContain("Знайти брата");
    expect(items[2]).toContain("Вступити в гільдію");
    expect(screen.getByText("від гравця")).toBeTruthy();
  });

  it("гравець редагує лише свої цілі й може додати нову", async () => {
    wrap(false);

    expect(screen.getAllByRole("button", { name: /Видалити ціль/ })).toHaveLength(1);
    fireEvent.change(screen.getByPlaceholderText("Нова ціль"), { target: { value: "Втекти" } });
    fireEvent.click(screen.getByRole("button", { name: "Додати ціль" }));
    expect(save).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ text: "Втекти", author: "player", status: "active" })]));
  });

  it("ДМ бачить зміну статусу для всіх цілей", () => {
    wrap(true);

    expect(screen.getAllByRole("button", { name: /Статус/ })).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm test:run components/character-profile/__tests__/story-tab.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`story/BiographyText.tsx`:

```tsx
import { parseHighlights } from "@/lib/utils/characters/biography";

export function BiographyText({ text }: { text: string }) {
  return (
    <div className="hud-book space-y-3 text-[15px] leading-6">
      {parseHighlights(text).map((para, i) => (
        <p key={i}>
          {para.map((s, j) => (s.marked ? <mark key={j} className="bg-[linear-gradient(transparent_55%,rgba(201,179,122,.4)_55%)] text-[var(--ink)]">{s.text}</mark> : <span key={j}>{s.text}</span>))}
        </p>
      ))}
    </div>
  );
}
```

`story/BiographyEditor.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { Highlighter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toggleHighlight } from "@/lib/utils/characters/biography";

export function BiographyEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const mark = () => {
    const ta = ref.current;

    if (!ta) return;

    const next = toggleHighlight(value, ta.selectionStart, ta.selectionEnd);

    onChange(next.text);
    requestAnimationFrame(() => ta.setSelectionRange(next.start, next.end));
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={mark} className="h-11" aria-label="Маркер"><Highlighter /> Маркер</Button>
      <Textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={12} className="hud-book text-[15px]" placeholder="Біографія героя. Виділіть фрагмент і натисніть «Маркер», щоб позначити важливе." />
    </div>
  );
}
```

`story/GoalList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Check, Circle, Trash2, X } from "lucide-react";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCharacterGoals } from "@/lib/hooks/characters";
import { cn } from "@/lib/utils";
import { newGoalId } from "@/lib/utils/characters/goals";
import type { CharacterGoal, GoalStatus } from "@/types/characters";

const NEXT: Record<GoalStatus, GoalStatus> = { active: "done", done: "failed", failed: "active" };

const ICON = { active: Circle, done: Check, failed: X };

const STATUS_LABEL: Record<GoalStatus, string> = { active: "активна", done: "виконана", failed: "провалена" };

export function GoalList() {
  const { sheet, campaignId, characterId } = useProfile();

  const { save, isPending } = useCharacterGoals(campaignId, characterId);

  const [draft, setDraft] = useState("");

  const goals = sheet.story.goals;

  const isDM = sheet.viewer.isDM;

  const canEdit = (g: CharacterGoal) => isDM || (sheet.viewer.isOwner && g.author === "player");

  const ordered = [...goals.filter((g) => g.status === "active"), ...goals.filter((g) => g.status !== "active")];

  const add = () => {
    const text = draft.trim();

    if (!text) return;

    void save([...goals, { id: newGoalId(), text, status: "active", author: isDM ? "dm" : "player" }]);
    setDraft("");
  };

  return (
    <>
      <ul className="divide-y divide-[#2a2218]">
        {ordered.map((g) => {
          const Icon = ICON[g.status];

          return (
            <li key={g.id} className="flex items-start gap-2 py-2 text-sm">
              {canEdit(g) ? (
                <Button type="button" size="icon" variant="ghost" aria-label={`Статус: ${STATUS_LABEL[g.status]}`} disabled={isPending} onClick={() => void save(goals.map((x) => (x.id === g.id ? { ...x, status: NEXT[x.status] } : x)))} className="size-11 shrink-0 text-[var(--gold)]"><Icon /></Button>
              ) : (
                <Icon aria-label={STATUS_LABEL[g.status]} className="mt-3 size-4 shrink-0 text-[var(--gold)]" />
              )}
              <span className={cn("flex-1 pt-2.5", g.status === "done" && "text-[var(--muted)] line-through", g.status === "failed" && "text-[var(--muted)]")}>
                {g.text}
                {g.author === "player" && <span className="ml-1.5 rounded border border-[var(--ally)] px-1 text-[10px] text-[var(--ally)]">від гравця</span>}
              </span>
              {canEdit(g) && (
                <Button type="button" size="icon" variant="ghost" aria-label={`Видалити ціль ${g.text}`} disabled={isPending} onClick={() => void save(goals.filter((x) => x.id !== g.id))} className="size-11 shrink-0 text-[var(--muted)]"><Trash2 /></Button>
              )}
            </li>
          );
        })}
      </ul>
      {(isDM || sheet.viewer.isOwner) && (
        <div className="mt-2 flex gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Нова ціль" maxLength={300} className="h-11" />
          <Button type="button" onClick={add} disabled={isPending || !draft.trim()} className="h-11" aria-label="Додати ціль">Додати</Button>
        </div>
      )}
    </>
  );
}
```

> «ДМ бачить зміну статусу для всіх цілей» у тесті очікує 3 кнопки «Статус». Для ДМа `canEdit` → true для всіх трьох цілей ✓. У гравця кнопок «Видалити ціль» рівно одна (`p1`) ✓.

`story/StoryTab.tsx`:

```tsx
import { useProfile } from "../ProfileContext";
import { BiographyText } from "./BiographyText";
import { GoalList } from "./GoalList";

export function StoryTab() {
  const { sheet } = useProfile();

  return (
    <>
      <h3 className="hud-h">Цілі</h3>
      <GoalList />
      <h3 className="hud-h">Біографія</h3>
      {sheet.story.biography ? <BiographyText text={sheet.story.biography} /> : <p className="text-sm text-[var(--muted)]">ДМ ще не написав біографію.</p>}
    </>
  );
}
```

`CharacterProfile.tsx`: додати `{ value: "story" as const, label: "Історія", content: <StoryTab /> }` у кінець `tabs`.

- [ ] **Step 4: Run tests**

Run: `pnpm test:run components/character-profile`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix components/character-profile
git add components/character-profile
git commit -m "feat(profile): story tab — goals and highlighted biography"
```

---

### Task 13: Режим редагування ДМа

**Files:**
- Create: `components/character-profile/edit/{ProfileEditor.tsx,BasicEditTab.tsx,CombatEditTab.tsx,SkillsEditTab.tsx,MagicEditTab.tsx,ItemsEditTab.tsx,StoryEditTab.tsx}`
- Modify: `lib/hooks/characters/useDmCharacterEditor.ts`, `useCharacterEditor.ts`, `useCharacters.ts`, `useEquipArtifact.ts`, `components/characters/stats/CharacterAbilityScores.tsx`, `components/characters/basic/CharacterBasicInfo.tsx`, `CharacterProfile.tsx`
- Test: `components/character-profile/__tests__/profile-editor.test.tsx`, `lib/hooks/characters/__tests__/dm-editor-lazy.test.tsx`

**Interfaces:**
- Consumes: `useDmCharacterEditor`, `invalidateCharacterSheet` (Task 6), `BiographyEditor` (Task 12), `ProfileTabs`, `ProfileHero`.
- Produces: `useDmCharacterEditor({ campaignId, characterId, onSaved, onDeleted })` — більше не робить `router.push` сам; `ProfileEditor({ onClose })`; `CharacterAbilityScores` приймає `primary?: { value: AbilityKey | null; onChange(v: AbilityKey | null): void }`.

- [ ] **Step 1: Write failing tests**

`lib/hooks/characters/__tests__/dm-editor-lazy.test.tsx` — бібліотеки вантажаться лише коли змонтовано редактор:

```tsx
// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const listArtifacts = vi.fn(async () => []);

vi.mock("@/lib/api/artifacts", async (orig) => ({ ...(await orig<object>()), getArtifacts: listArtifacts }));
vi.mock("@/lib/hooks/characters/useCharacterSheet", () => ({
  useCharacterSheet: () => ({ isPending: false, isError: false, data: (globalThis as { __sheet: unknown }).__sheet }),
  characterSheetKey: () => ["character-sheet"],
  invalidateCharacterSheet: vi.fn(),
}));

import { sheetFixture } from "@/components/character-profile/__tests__/sheet-fixture";
import { CharacterProfile } from "@/components/character-profile";

describe("профіль ДМа", () => {
  it("у перегляді не вантажить бібліотеку артефактів", () => {
    (globalThis as { __sheet: unknown }).__sheet = sheetFixture({ viewer: { isDM: true, isOwner: false } });
    render(<QueryClientProvider client={new QueryClient()}><CharacterProfile campaignId="c" characterId="lira" canEdit /></QueryClientProvider>);

    expect(screen.getByRole("button", { name: "Редагувати" })).toBeTruthy();
    expect(listArtifacts).not.toHaveBeenCalled();
  });
});
```

> Назву функції списку артефактів (`getArtifacts`/`listArtifacts`) звірити з `lib/api/artifacts.ts` і тим, що викликає `useArtifactsList`. Якщо профіль у тесті потребує `next/navigation`, замокати його як у `profile-tabs.test.tsx`; `ProgressionPanel`/`LevelUpOverlay` — `vi.mock("@/components/skill-tree/progression", () => ({ ProgressionPanel: () => null, LevelUpOverlay: () => null, FreePointBadge: () => null }))`.

`components/character-profile/__tests__/profile-editor.test.tsx` — ActionBar рівно з двома кнопками і чекбокс основної:

```tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";

describe("CharacterAbilityScores — основна характеристика", () => {
  it("чекбокс позначає одну основну, повторний клік знімає", () => {
    const onChange = vi.fn();

    const abilityScores = { strength: 10, dexterity: 18, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, setters: {} } as never;

    const { rerender } = render(<CharacterAbilityScores abilityScores={abilityScores} primary={{ value: null, onChange }} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Основна: Спритність" }));
    expect(onChange).toHaveBeenCalledWith("dexterity");

    rerender(<CharacterAbilityScores abilityScores={abilityScores} primary={{ value: "dexterity", onChange }} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Основна: Спритність" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
```

> Форму пропа `abilityScores` взяти з наявного `CharacterAbilityScores.tsx` (група з `useCharacterForm`) і за потреби доповнити мок.

- [ ] **Step 2: Run to verify fail**

Run: `pnpm test:run components/character-profile lib/hooks/characters`
Expected: FAIL.

- [ ] **Step 3: Implement — hooks**

`useCharacterEditor.ts`: прибрати з повернення `members`/`membersLoading`/`races`, лише якщо вони більше ніде не потрібні. Інакше лишити — редактор і так монтується тільки в режимі редагування.

`useDmCharacterEditor.ts`:

```ts
export function useDmCharacterEditor({ campaignId, characterId, onSaved, onDeleted }: { campaignId: string; characterId: string; onSaved: () => void; onDeleted: () => void }) {
  const queryClient = useQueryClient();

  const editor = useCharacterEditor({
    campaignId,
    characterId,
    onSaved: () => {
      void invalidateCharacterSheet(queryClient, campaignId, characterId);
      onSaved();
    },
  });

  // … артефакти/сети як зараз …

  const deleteMutation = useDeleteCharacter(campaignId);

  const remove = async () => {
    const ok = await confirm({ title: `Видалити ${editor.form.basicInfo.name}?`, description: "Персонажа буде видалено назавжди.", confirmLabel: "Видалити", destructive: true, onConfirm: () => deleteMutation.mutateAsync(characterId) });

    if (ok) onDeleted();
  };

  return { ...editor, campaignId, characterId, artifacts, artifactSets: artifactSets as ArtifactSetRow[], remove };
}
```

- `levelUp` переїжджає в хук `useLevelUp(campaignId, characterId)` (у тому ж файлі або `useLevelUp.ts`). Тіло — наявне з `confirm`/`notify` без `editor.form.setFormData`; після успіху `invalidateCharacterSheet`. Хук викликається з `CharacterProfile` для кнопки «+ рівень» у hero, навіть поза редагуванням.
- Перевірити, які опції приймає `useConfirm` (`destructive`, `description`), і використовувати лише наявні.

`useCharacters.ts`: у `useUpdateCharacter`, `useLevelUpCharacter` замінити ключі `character-damage-preview`/`damage-calculator-*` на `["character-sheet", campaignId]`.

`useEquipArtifact.ts`: додати `onSuccess: () => invalidateCharacterSheet(queryClient, campaignId, characterId)`.

`lib/hooks/skills/useProgressionActions.ts:41-43`: цикл по трьох префіксах замінити на `void invalidateCharacterSheet(queryClient, campaignId, characterId);`.

- [ ] **Step 4: Implement — components**

`CharacterAbilityScores.tsx`:
- прибрати `ArtifactDeltaBadge` і проп бонусів артефактів, якщо після Task 14 їх ніхто не передає (перевірити `grep -rn "CharacterAbilityScores" app components`);
- додати опційний проп `primary`; під кожним інпутом:

```tsx
{primary && (
  <label className="mt-1 flex min-h-11 items-center gap-1.5 text-xs">
    <Checkbox aria-label={`Основна: ${label}`} checked={primary.value === key} onCheckedChange={() => primary.onChange(primary.value === key ? null : key)} />
    основна
  </label>
)}
```

`CharacterBasicInfo.tsx`: прибрати поле `background` («Передісторія»): тепер воно живе в табі «Історія».

`edit/ProfileEditor.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";

import { useProfile } from "../ProfileContext";
import { ProfileTabs } from "../ProfileTabs";
import { BasicEditTab } from "./BasicEditTab";
import { CombatEditTab } from "./CombatEditTab";
import { ItemsEditTab } from "./ItemsEditTab";
import { MagicEditTab } from "./MagicEditTab";
import { SkillsEditTab } from "./SkillsEditTab";
import { StoryEditTab } from "./StoryEditTab";

import { ActionBar } from "@/components/common/ActionBar";
import { LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useDmCharacterEditor } from "@/lib/hooks/characters";

export function ProfileEditor() {
  const { campaignId, characterId, setEditing } = useProfile();

  const router = useRouter();

  const editor = useDmCharacterEditor({ campaignId, characterId, onSaved: () => setEditing(false), onDeleted: () => router.push(`/campaigns/${campaignId}/dm/characters`) });

  if (!editor.ready) return <LoadingState rows={6} label="Завантаження редактора…" />;

  const { form } = editor;

  return (
    <form onSubmit={form.handleSubmit}>
      {form.error && <p role="alert" className="mx-4 mt-3 rounded border border-[#9c2a1d] bg-[#9c2a1d]/15 px-3 py-2 text-sm">{form.error}</p>}
      <ProfileTabs
        tabs={[
          { value: "basic", label: "Основне", content: <BasicEditTab editor={editor} /> },
          { value: "combat", label: "Бій", content: <CombatEditTab editor={editor} /> },
          { value: "skills", label: "Вміння", content: <SkillsEditTab editor={editor} /> },
          { value: "magic", label: "Магія", content: <MagicEditTab editor={editor} /> },
          { value: "items", label: "Речі", content: <ItemsEditTab editor={editor} /> },
          { value: "story", label: "Історія", content: <StoryEditTab editor={editor} /> },
        ]}
      />
      <ActionBar className="fixed inset-x-0 bottom-0 z-40 bg-[#0f0c09]/95 px-4 sm:sticky">
        <Button type="button" variant="outline" onClick={() => setEditing(false)}>Скасувати</Button>
        <Button type="submit" disabled={form.loading}>{form.loading ? "Збереження…" : "Зберегти"}</Button>
      </ActionBar>
    </form>
  );
}
```

Вкладки редагування — тонкі обгортки над наявними секціями форми (їх же використовує `/dm/characters/new`):
- `BasicEditTab`:
  - `<CharacterBasicInfo basicInfo={form.basicInfo} campaignMembers={editor.members} races={editor.races} />`;
  - `<CharacterHpPreview … isDm />` з коефіцієнтом HP (наявний код із `DmCharacterEditFormAccordion.tsx:57-74`);
  - два `LabeledInput` «Коеф. ближньої шкоди»/«Коеф. дальньої шкоди», `type="number" step="0.1" min="0.1" max="3"`, що пишуть у `formData.scalingCoefficients.meleeMultiplier`/`rangedMultiplier`;
  - знизу `<Button type="button" variant="destructive" onClick={editor.remove}>Видалити персонажа</Button>`.
- `CombatEditTab`:
  - `<CharacterAbilityScores abilityScores={form.abilityScores} primary={{ value: form.basicInfo.primaryAbility, onChange: form.basicInfo.setPrimaryAbility }} />`;
  - `<CharacterCombatParams combatStats={form.combatStats} />`;
  - `<CharacterSkillsSection skills={form.skills} />`.
- `SkillsEditTab`: `<CharacterAbilitiesSection campaignId={campaignId} abilities={form.abilities} />` + `<ProgressionPanel campaignId={campaignId} characterId={characterId} canManage />`.
- `MagicEditTab`: `SelectField` «Характеристика заклинань» (`none`/`intelligence`/`wisdom`/`charisma`) → `form.spellcasting` сетер `spellcastingAbility`. Якщо в `useCharacterForm-bindings.ts` такого сетера немає, додати `setSpellcastingAbility(v: "intelligence" | "wisdom" | "charisma" | null)` за зразком інших сетерів.
- `ItemsEditTab`: `<CharacterArtifactsSection … />` з тими самими пропсами, що в `DmCharacterEditFormAccordion.tsx:131-146`.
- `StoryEditTab`:
  - `<BiographyEditor value={form.basicInfo.background ?? ""} onChange={form.basicInfo.setBackground} />` — сетер `background` уже є в `useCharacterForm-bindings.ts:75`; звірити його назву;
  - `<GoalList />` — цілі зберігаються окремим запитом одразу, не через «Зберегти».

`CharacterProfile.tsx` — фінальна версія тіла:

```tsx
  const levelUp = useLevelUp(campaignId, characterId);

  const isDM = sheet.viewer.isDM && canEdit;

  return (
    <ProfileProvider value={{ sheet, campaignId, characterId, editing, setEditing }}>
      <div className={cn(HUD_SURFACE, "character-profile mx-auto max-w-3xl")}>
        <ProfileHero actions={isDM && !editing ? { onEdit: () => setEditing(true), onLevelUp: () => void levelUp() } : undefined} />
        {editing ? <ProfileEditor /> : <ProfileTabs tabs={tabs} />}
        {!editing && <LevelUpOverlay … />}
        {!editing && <FreePointBadge … />}
      </div>
    </ProfileProvider>
  );
```

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm test:run components lib/hooks && pnpm exec tsc --noEmit -p .`
Expected: PASS, 0 помилок.

- [ ] **Step 6: Commit**

```bash
pnpm lint --fix components lib/hooks
git add components lib/hooks
git commit -m "feat(profile): DM edit mode in tabs — two-button ActionBar, level-up in hero, primary ability checkbox"
```

---

### Task 14: Підключити маршрути й прибрати старе

**Files:**
- Modify: `app/campaigns/[id]/character/page.tsx`, `app/campaigns/[id]/character/edit/page.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/page.tsx`
- Delete: див. «Видаляються» в карті файлів
- Modify: `lib/hooks/characters/index.ts`, `lib/api/characters.ts`, `types/characters.ts`, `lib/utils/battle/damage/hero-dm-multiplier.ts` (коментар)
- Test: `app/campaigns/[id]/dm/characters/__tests__/page-client.test.tsx` (наявний, має бути зеленим)

- [ ] **Step 1: Routes**

`character/page.tsx` — замість `CharacterViewClient`:

```tsx
  return <CharacterProfile campaignId={id} characterId={character.id} canEdit={isDM} />;
```

(запит `findFirst` — лише `select: { id: true }`, без `inventory`; прибрати `campaign` з деструктуризації, якщо не потрібен.)

`character/edit/page.tsx` — тіло після перевірок:

```tsx
  redirect(`/campaigns/${id}/dm/characters/${character.id}`);
```

(залишити `isDM`-перевірку й пошук свого героя; `PlayerCharacterEditClient` більше не імпортується.)

`dm/characters/[characterId]/page.tsx`:

```tsx
"use client";

import { use } from "react";

import { CharacterProfile } from "@/components/character-profile";

export default function DmCharacterPage({ params }: { params: Promise<{ id: string; characterId: string }> }) {
  const { id, characterId } = use(params);

  return <CharacterProfile campaignId={id} characterId={characterId} canEdit />;
}
```

(Перемикач «Перегляд як гравець» більше не потрібен: ДМ бачить той самий профіль, а редагування — окремий режим.)

- [ ] **Step 2: Delete dead code**

```bash
git rm -r "app/campaigns/[id]/character/components" "app/campaigns/[id]/character/character-view-client.tsx" "app/campaigns/[id]/character/edit/edit-client.tsx" \
  "app/campaigns/[id]/dm/characters/[characterId]/DmCharacterEditForm.tsx" "app/campaigns/[id]/dm/characters/[characterId]/DmCharacterEditFormAccordion.tsx" \
  "app/api/campaigns/[id]/characters/[characterId]/damage-preview" \
  components/characters/stats/CharacterDamageCalculator.tsx components/characters/stats/CharacterDamagePreview.tsx components/characters/stats/DamageCalculatorDiceInputs.tsx \
  components/characters/stats/DamageCalculatorResult.tsx components/characters/stats/DamageCalculatorSkillsLog.tsx components/characters/stats/SkillsAffectingDamageList.tsx \
  components/characters/spells/SpellMultiSelect.tsx \
  lib/hooks/characters/useCharacterView.ts lib/hooks/characters/useDamagePreview.ts lib/hooks/characters/damage-preview.ts \
  lib/hooks/characters/useDamageCalculator.ts lib/hooks/characters/useDamageCalculator-skills.ts lib/hooks/characters/useDamageCalculator-spell.ts \
  lib/utils/characters/damage-calculator.ts
```

Потім:
- `lib/hooks/characters/index.ts` — прибрати експорти видалених хуків;
- `lib/api/characters.ts` — прибрати `getDamagePreview` і реекспорт `DamagePreviewResponse`;
- `types/characters.ts` — прибрати `DamagePreviewItem`, `DamagePreviewResponse`;
- коментар у `hero-dm-multiplier.ts:2` → `Коефіцієнти melee/ranged DM для героїв.`

Далі пройтися по сиротах, поки кожна команда не стане порожньою:

```bash
for f in components/characters/artifacts/CharacterSpellbook components/characters/artifacts/CharacterSpellbookDialog components/characters/artifacts/SpellSlotsBadge components/characters/stats/ArtifactDeltaBadge components/characters/artifacts/CharacterCompletedArtifactSetsSummary lib/utils/artifacts/sum-equipped-artifact-flat-bonuses components/ui/read-only-context; do
  n=$(grep -rln "$(basename $f)" app components lib --include='*.ts' --include='*.tsx' | grep -v "^$f" | grep -v __tests__ | wc -l); echo "$n $f"; done
```

Кожен файл із `0` видалити разом з його тестом (`git rm`) і повторювати, доки нових нулів не буде. Ті, що ще мають імпорти (наприклад, `CharacterArtifactsSection` використовує `CharacterSpellbook` для `/new`), лишаються.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit -p . && pnpm lint && pnpm test:run`
Expected: 0 помилок типів, 0 помилок lint, усі тести PASS. Тести видалених модулів видалено разом з ними; живі тести не вимикаємо.

Run: `grep -rn "damage-preview\|useCharacterView\|DamageCalculator\|CharacterViewAccordion\|CharacterHeroBlock" app components lib types`
Expected: порожньо.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(profile): both routes render CharacterProfile; remove accordions, damage calculator and damage-preview"
```

---

### Task 15: Перший тап після закриття шторки (проблема 4)

**Files:**
- Modify: `components/ui/responsive-dialog.tsx`
- Test: `components/ui/__tests__/responsive-dialog.test.tsx` (новий кейс)

- [ ] **Step 1: Reproduce (superpowers:systematic-debugging)**

Запустити `pnpm dev`, Chrome у режимі 390 px. Відкрити профіль гравця → «Речі» → тап по артефакту (шторка) → закрити свайпом або тапом по оверлею → **одразу** тапнути табу «Бій». Перед тапом у консолі:

```js
[document.body.style.pointerEvents, getComputedStyle(document.body).pointerEvents, document.querySelectorAll('[data-vaul-overlay]').length]
```

Записати, що саме блокує тап: `pointer-events: none` на `body` (Radix `DismissableLayer` знімає його лише після анімації закриття) чи живий оверлей. Не переходити до Step 2 без підтвердженої причини.

- [ ] **Step 2: Write the failing test** (для підтвердженої причини `body.style.pointerEvents`)

```tsx
  it("телефон: після закриття шторки body знову клікабельний одразу", async () => {
    mockMatchMedia(true);

    function Harness() {
      const [open, setOpen] = useState(true);

      return <ResponsiveDialog open={open} onOpenChange={setOpen} title="Т">вміст</ResponsiveDialog>;
    }

    render(<Harness />);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe("none"), { timeout: 50 });
  });
```

(додати `waitFor` до імпорту з `@testing-library/react`.)

Run: `pnpm test:run components/ui/__tests__/responsive-dialog.test.tsx`
Expected: FAIL (поки шторка анімується, `pointer-events` лишається `none`).

- [ ] **Step 3: Fix** — у мобільній гілці `ResponsiveDialog`:

```tsx
  const handleOpenChange = (next: boolean) => {
    if (!next && !dismissible) return;

    // vaul тримає body.pointer-events=none до кінця анімації — перший тап після закриття губився
    if (!next && isMobile) requestAnimationFrame(() => document.body.style.removeProperty("pointer-events"));

    onOpenChange(next);
  };
```

Якщо в Step 1 причиною виявився оверлей, а не `body`: замість цього додати `className="… data-[state=closed]:pointer-events-none"` на `Drawer.Overlay` і змінити тест на перевірку `getComputedStyle(overlay).pointerEvents === "none"` після закриття.

- [ ] **Step 4: Verify**

Run: `pnpm test:run components/ui` → PASS. Повторити Step 1 у браузері: перший тап відкриває табу.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix components/ui
git add components/ui
git commit -m "fix(ui): first tap after closing a bottom sheet is no longer swallowed"
```

---

### Task 16: Перевірка в браузері й повний прогін

**Files:** — (лише дані локальної БД; роль повертається назад)

- [ ] **Step 1: Full checks**

Run: `pnpm exec tsc --noEmit -p . && pnpm lint && pnpm test:run && pnpm simulate-battle`
Expected: усе зелене; `simulate-battle` без регресій (записати підсумковий рядок у звіт).

- [ ] **Step 2: Player view at 390 px**

`pnpm dev`; Chrome (claude-in-chrome), вікно 390×844; `http://localhost:3000/campaigns/cmuvy29ix0001eyhew9cq07qf/character`. Перевірити:
- кожна таба відкривається і нічого не обрізається, горизонтального скролу немає (`document.documentElement.scrollWidth <= innerWidth`);
- «Бій»: СПР без ★ (поки не позначено), атаки з влуч/≈шкода, розкладка відкривається;
- «Магія»: плитки «I · N», книга відкривається, заклинання гортаються;
- «Речі»: ефекти артефактів, шторка опису;
- «Історія»: додати ціль → вона з'являється з бейджем «від гравця»;
- `read_network_requests`: під час перегляду є лише `/sheet`, `/progression` (+ `seen-level`/`campaign-members`, якщо їх викликає оверлей), **немає** `/skills`, `/main-skills`, `/artifacts`, `/artifact-sets`, `/spells`;
- проблема 4: тап одразу після закриття шторки спрацьовує.

- [ ] **Step 3: DM view**

```bash
psql "$DATABASE_URL" -c "update campaign_members set role='dm' where id='preview-player-member'"
```

Перевірити на 390 px:
- «Редагувати» → таби з «Основне»; ActionBar «Скасувати · Зберегти» — обидві кнопки повністю видно;
- чекбокс «основна» на СПР → «Зберегти» → «Бій» показує ★ і влучання ближньої +4;
- «Історія»: виділити фрагмент → «Маркер» → «Зберегти» → золоте підсвічування в перегляді;
- «+ рівень» у hero працює з підтвердженням;
- `/campaigns/…/battles/<бій з Лірою>` (або новий бій через `pnpm seed-mock-battle`, якщо він доступний для цієї кампанії) — «Влуч» Ліри в атаці збігається з профілем.

Повернути роль: `psql "$DATABASE_URL" -c "update campaign_members set role='player' where id='preview-player-member'"` і перевірити `select role from campaign_members where id='preview-player-member'` → `player`.

- [ ] **Step 4: Desktop sanity**

1280 px: таби, книга у дві сторінки, профіль не розтягнутий (max-w-3xl).

- [ ] **Step 5: Commit fixes, if any**

Кожен знайдений дефект — окремий коміт `fix(profile): …` з тестом, якщо він відтворюваний у Vitest.

---

### Task 17: Рев'ю гілки

- [ ] **Step 1:** Один opus-рев'ю всієї гілки (`superpowers:requesting-code-review`, `git diff main...feat/mobile-profile`) проти spec і цього плану.
- [ ] **Step 2:** Обробити зауваження (`superpowers:receiving-code-review`): виправлення окремими комітами, тести зелені.
- [ ] **Step 3:** Звіт користувачу: що зроблено, скріншоти 390 px, результати тестів і `simulate-battle`, відхилення від spec. **Не мерджити й не пушити** без «так».
