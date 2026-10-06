# Мобільний профіль персонажа — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Один профіль персонажа з табами в стилі HUD для гравця і ДМа, з цифрами від того самого рушія, що й бій, біографією з маркером ДМа і цілями.

**Architecture:** Сервер будує учасника бою (`createBattleParticipantFromCharacter` + `applyBakedAuras`) і чиста функція `buildCharacterSheet` перетворює його на `CharacterSheet` з розкладками; `GET /sheet` — єдине джерело перегляду. UI — `components/character-profile/*` у `HUD_SURFACE`; режим редагування ДМа монтує наявний редактор форми лише при натисканні «Редагувати», тож бібліотеки вантажаться тільки тоді.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Prisma 6 (PostgreSQL), TanStack Query, Zod, Vitest + Testing Library (happy-dom), Tailwind, Radix Tabs, vaul.

**Spec:** `docs/superpowers/specs/2026-10-06-mobile-profile-design.md`

**Уточнення до spec (рішення під час планування):**
- Замість окремого `useCharacterEdit(…, { editing })` режим редагування — компонент `ProfileEditor`, який монтується лише після «Редагувати» і використовує наявний `useDmCharacterEditor`; бібліотеки вантажаться тільки тоді (§3.5 виконується структурою).
- Персональне вміння в листі — один `skill.findFirst` (4 колонки), бо `createBattleParticipantFromCharacter` не віддає рядки `extract-skills` назовні.
- Редагування табів ДМа перевикористовує наявні секції форми (`CharacterAbilityScores`, `CharacterCombatParams`, `CharacterSkillsSection`, `CharacterAbilitiesSection`, `CharacterArtifactsSection`, `CharacterBasicInfo`) — вони ж потрібні сторінці створення персонажа, тож не стають мертвим кодом.
- Характеристика заклинань (`spellcastingAbility`) зараз ніде не редагується — у табі «Магія» редактора з'являється селект.

## Global Constraints

- Гілка `feat/mobile-profile`; кожна задача — окремий коміт із зеленими `pnpm test:run`, `pnpm lint`, `pnpm exec tsc --noEmit`.
- Міграція тільки expand-only: `ADD COLUMN`; жодних `DROP`/`RENAME`; нових таблиць немає.
- Компоненти не імпортують `@/lib/api/*`; запити — `lib/api/characters.ts`, логіка — хуки в `lib/hooks/characters`.
- Діалоги — лише `ResponsiveDialog`; підтвердження — `useConfirm()`; без `window.confirm`/`alert`/`console.log`.
- Стиль профілю: `HUD_SURFACE` + `import "@/components/hud/hud.css"`, метали через `metalClass(spellTier(level))`/класи `metal-*`, без нових кольорових токенів; позначення КБ — «AC».
- Біографія — колонка `background`, розмітка `==…==`; рендер лише текстовими вузлами (без `dangerouslySetInnerHTML`).
- Цілі: `text` 1–300 символів, максимум 30 цілей; `author` ставить сервер.
- Перегляд гравцем робить лише запити `sheet` і `progression`.
- Зона дотику слота прокачки ≥ 44 px на телефоні; на 390 px ніщо не обрізається й немає горизонтального скролу сторінки.
- Коментарі мінімальні (CLAUDE.md); нові ідентифікатори англійською, UI-тексти українською.

## Review Focus

- Персонаж без зброї (немає `attacks`) → таба «Бій» показує порожній стан, чип «Влуч» — «—», без NaN/падінь.
- Персонаж без магії (`spellcastingAbility = null`, усі слоти 0, жодного заклинання) → «Магія» — порожній стан, без кнопки книги.
- Біографія з незакритим `==`, з `==` всередині слова, з `<script>` → показується як текст, нічого не виконується, незакритий маркер лишається літералом.
- Гравець шле PUT цілей, де підмінено `author: "dm"` або видалено/змінено ціль ДМа → цілі ДМа лишаються незмінними, нові цілі гравця отримують `author: "player"`.
- Гравець відкриває `sheet` чужого персонажа (або персонажа іншої кампанії) → 403/404, жодних даних.

---

## Файлова структура

**Нові файли**

| Файл | Відповідальність |
|---|---|
| `prisma/migrations/20261010000000_mobile_profile/migration.sql` | `primaryAbility`, `goals`, `races.icon` |
| `lib/schemas/character-goals.ts` | Zod цілей + `parseGoals` |
| `lib/utils/characters/goals.ts` | `mergePlayerGoals` |
| `lib/utils/characters/biography/highlight.ts` | `parseHighlights`, `toggleHighlight` |
| `lib/utils/characters/sheet/build-sheet.ts` | `buildCharacterSheet` (чиста) |
| `lib/utils/characters/sheet/lines.ts` | побудова розкладок (`abilityLines`, `armorLines`, `attackSheet`) |
| `lib/utils/characters/sheet/index.ts` | барель |
| `lib/utils/plural.ts` | `pluralUk` |
| `app/api/campaigns/[id]/characters/[characterId]/sheet/route.ts` + `sheet-handler.ts` | GET листа |
| `app/api/campaigns/[id]/characters/[characterId]/goals/route.ts` | PUT цілей |
| `lib/hooks/characters/useCharacterSheet.ts` | запит листа + ключ |
| `lib/hooks/characters/useCharacterGoals.ts` | мутація цілей |
| `lib/hooks/characters/useSpellBrowser.ts` | стан книги в режимі перегляду |
| `components/battle/wizards/SpellBookPages.tsx` | стрічки + список + деталь (спільне з боєм) |
| `components/character-profile/*` | профіль (див. задачі 10–13) |

**Видаляються** (задача 14): `app/campaigns/[id]/character/components/character-view/**`, `app/campaigns/[id]/character/character-view-client.tsx`, `app/campaigns/[id]/character/edit/edit-client.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/DmCharacterEditForm*.tsx`, `app/api/campaigns/[id]/characters/[characterId]/damage-preview/`, `components/characters/stats/{CharacterDamageCalculator,CharacterDamagePreview,DamageCalculatorDiceInputs,DamageCalculatorResult,DamageCalculatorSkillsLog,SkillsAffectingDamageList}.tsx`, `components/characters/spells/SpellMultiSelect.tsx`, `lib/hooks/characters/{useCharacterView,useDamagePreview,damage-preview,useDamageCalculator,useDamageCalculator-skills,useDamageCalculator-spell}.ts`, `lib/utils/characters/damage-calculator.ts`.

---

### Task 1: Міграція, схема Prisma, типи й Zod цілей

**Files:**
- Modify: `prisma/schema.prisma` (model `Character`, model `Race`)
- Create: `prisma/migrations/20261010000000_mobile_profile/migration.sql`
- Modify: `types/characters.ts` (додати `AbilityKey`, `CharacterGoal`, `GoalStatus`)
- Create: `lib/schemas/character-goals.ts`; Modify: `lib/schemas/index.ts`
- Create: `lib/utils/characters/goals.ts`
- Test: `lib/utils/characters/__tests__/goals.test.ts`

**Interfaces:**
- Produces: `type AbilityKey`, `ABILITY_KEYS`, `type GoalStatus`, `interface CharacterGoal`, `characterGoalsSchema`, `goalInputSchema`, `parseGoals(raw: unknown): CharacterGoal[]`, `mergePlayerGoals(current: CharacterGoal[], incoming: GoalInput[]): CharacterGoal[]`

- [ ] **Step 1: Схема й міграція**

`prisma/schema.prisma`, у `model Character` після `personalSkillId`:

```prisma
  primaryAbility       String?
  goals                Json                @default("[]")
```

У `model Race` після `abilities`:

```prisma
  icon                 String?
```

`prisma/migrations/20261010000000_mobile_profile/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "characters" ADD COLUMN "primaryAbility" TEXT;
ALTER TABLE "characters" ADD COLUMN "goals" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "races" ADD COLUMN "icon" TEXT;
```

Run: `pnpm exec prisma migrate deploy` (локальна Docker-БД з `.env.local`, порт 54322) → `pnpm exec prisma generate`
Expected: `1 migration applied`; generate без помилок.

- [ ] **Step 2: Типи**

У `types/characters.ts` (на початку файлу, після імпортів):

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

У flat-інтерфейсі `Character` додати `primaryAbility?: AbilityKey | null;` і `goals?: CharacterGoal[];`.

- [ ] **Step 3: Падаючий тест цілей**

`lib/utils/characters/__tests__/goals.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { parseGoals } from "@/lib/schemas/character-goals";
import { mergePlayerGoals } from "@/lib/utils/characters/goals";
import type { CharacterGoal } from "@/types/characters";

const dm: CharacterGoal = { id: "d1", text: "Знайти брата", status: "active", author: "dm" };

const mine: CharacterGoal = { id: "p1", text: "Повернути лук", status: "active", author: "player" };

describe("goals", () => {
  it("parseGoals: невалідний JSON → []", () => {
    expect(parseGoals(null)).toEqual([]);
    expect(parseGoals([{ id: "x" }])).toEqual([]);
    expect(parseGoals([dm])).toEqual([dm]);
  });

  it("гравець не може змінити, видалити чи підробити ціль ДМа", () => {
    const out = mergePlayerGoals([dm, mine], [
      { id: "d1", text: "Зламано", status: "done" },
      { id: "p1", text: "Повернути лук батька", status: "done" },
      { id: "p2", text: "Нова", status: "active" },
    ]);

    expect(out).toEqual([
      dm,
      { id: "p1", text: "Повернути лук батька", status: "done", author: "player" },
      { id: "p2", text: "Нова", status: "active", author: "player" },
    ]);
  });

  it("гравець видаляє свою ціль, ціль ДМа лишається навіть якщо її немає у запиті", () => {
    expect(mergePlayerGoals([dm, mine], [])).toEqual([dm]);
  });

  it("не більше 30 цілей разом", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}`, text: "x", status: "active" as const }));

    expect(mergePlayerGoals([dm], many)).toHaveLength(30);
  });
});
```

Run: `pnpm test:run lib/utils/characters/__tests__/goals.test.ts` → FAIL (module not found).

- [ ] **Step 4: Реалізація**

`lib/schemas/character-goals.ts`:

```ts
import { z } from "zod";

import type { CharacterGoal } from "@/types/characters";

export const MAX_GOALS = 30;

export const goalInputSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().trim().min(1).max(300),
  status: z.enum(["active", "done", "failed"]),
  author: z.enum(["dm", "player"]).optional(),
});

export type GoalInput = z.infer<typeof goalInputSchema>;

export const characterGoalsSchema = z.array(goalInputSchema.required({ author: true })).max(MAX_GOALS);

export const putGoalsSchema = z.object({ goals: z.array(goalInputSchema).max(MAX_GOALS) });

export function parseGoals(raw: unknown): CharacterGoal[] {
  const parsed = characterGoalsSchema.safeParse(raw);

  return parsed.success ? parsed.data : [];
}
```

`lib/schemas/index.ts`: додати `export * from "./character-goals";`.

`lib/utils/characters/goals.ts`:

```ts
import { type GoalInput, MAX_GOALS } from "@/lib/schemas/character-goals";
import type { CharacterGoal } from "@/types/characters";

export function mergePlayerGoals(current: CharacterGoal[], incoming: GoalInput[]): CharacterGoal[] {
  const dmGoals = current.filter((g) => g.author === "dm");

  const dmIds = new Set(dmGoals.map((g) => g.id));

  const own = incoming
    .filter((g) => !dmIds.has(g.id))
    .map((g): CharacterGoal => ({ id: g.id, text: g.text, status: g.status, author: "player" }));

  return [...dmGoals, ...own].slice(0, MAX_GOALS);
}
```

- [ ] **Step 5: Перевірка**

Run: `pnpm test:run lib/utils/characters/__tests__/goals.test.ts prisma/__tests__/migrations-rls.test.ts` → PASS.
Run: `pnpm exec tsc --noEmit && pnpm lint --fix` → без помилок.

- [ ] **Step 6: Commit**

```bash
git add prisma types/characters.ts lib/schemas lib/utils/characters
git commit -m "feat(characters): primaryAbility, goals and race icon columns; goals schema and merge rules"
```

---

### Task 2: Рушій — основна характеристика і майстерність від рівня

**Files:**
- Modify: `types/battle.ts` (`BattleParticipantAbilities`)
- Modify: `lib/utils/common/calculations.ts` (`getAttackAbilityModifier`)
- Modify: `lib/utils/battle/attack/bonus.ts:20-25`
- Modify: `lib/utils/battle/participant/from-character.ts` (abilities, spellcasting)
- Test: `lib/utils/battle/__tests__/primary-ability.test.ts`

**Interfaces:**
- Consumes: `AbilityKey`, `ABILITY_KEYS` (Task 1)
- Produces: `BattleParticipantAbilities.primaryAbility?: AbilityKey`; `getAttackAbilityModifier(abilities: AttackAbilities, attackType): number`; `spellcastingDerived(level: number, ability: string | null, scores: Record<AbilityKey, number>): { saveDC: number; attackBonus: number } | null`

- [ ] **Step 1: Падаючий тест**

`lib/utils/battle/__tests__/primary-ability.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createMockParticipant } from "./mock-participant";

import { AttackType } from "@/lib/constants/battle";
import { calculateAttackBonus } from "@/lib/utils/battle/attack";
import { getAttackAbilityModifier, spellcastingDerived } from "@/lib/utils/common/calculations";
import type { BattleAttack } from "@/types/battle";

const sword = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 1, damageDice: "1d8" } as BattleAttack;

const bow = { id: "b", name: "Лук", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d8" } as BattleAttack;

describe("primaryAbility", () => {
  const scores = { strength: 10, dexterity: 18, constitution: 10, intelligence: 16, wisdom: 10, charisma: 10 };

  it("без основної: ближня — СИЛ, дальня — СПР", () => {
    expect(getAttackAbilityModifier(scores, AttackType.MELEE)).toBe(0);
    expect(getAttackAbilityModifier(scores, AttackType.RANGED)).toBe(4);
  });

  it("основна діє на будь-яку атаку", () => {
    expect(getAttackAbilityModifier({ ...scores, primaryAbility: "dexterity" }, AttackType.MELEE)).toBe(4);
    expect(getAttackAbilityModifier({ ...scores, primaryAbility: "intelligence" }, AttackType.RANGED)).toBe(3);
  });

  it("calculateAttackBonus бере основну + майстерність + бонус зброї", () => {
    const p = createMockParticipant();

    p.abilities = { ...p.abilities, strength: 10, dexterity: 18, primaryAbility: "dexterity", proficiencyBonus: 9 };

    expect(calculateAttackBonus(p, sword)).toBe(4 + 9 + 1);
    expect(calculateAttackBonus(p, bow)).toBe(4 + 9);
  });

  it("СЛ і атака заклинанням від рівня", () => {
    expect(spellcastingDerived(30, "intelligence", scores)).toEqual({ saveDC: 8 + 9 + 3, attackBonus: 9 + 3 });
    expect(spellcastingDerived(30, null, scores)).toBeNull();
  });
});
```

Run: `pnpm test:run lib/utils/battle/__tests__/primary-ability.test.ts` → FAIL.

- [ ] **Step 2: Реалізація**

`types/battle.ts`, в `BattleParticipantAbilities` після `race: string;`:

```ts
  primaryAbility?: AbilityKey;
```

(додати `import type { AbilityKey } from "@/types/characters";` — `types/characters.ts` не імпортує `types/battle.ts`, циклу немає; перевірити `grep -n "types/battle" types/characters.ts`; якщо імпорт є — перенести `AbilityKey`/`ABILITY_KEYS` у новий `types/abilities-core.ts` і реекспортувати з обох).

`lib/utils/common/calculations.ts` — замінити `getAttackAbilityModifier` і додати `spellcastingDerived`:

```ts
type AttackAbilities = { strength: number; dexterity: number; primaryAbility?: AbilityKey | null } & Partial<Record<AbilityKey, number>>;

export function getAttackAbilityModifier(abilities: AttackAbilities, attackType: AttackType | string): number {
  const key = abilities.primaryAbility ?? (attackType === AttackType.MELEE ? "strength" : "dexterity");

  return getAbilityModifier(abilities[key] ?? 10);
}

export function spellcastingDerived(
  level: number,
  ability: string | null | undefined,
  scores: Record<AbilityKey, number>,
): { saveDC: number; attackBonus: number } | null {
  if (!ability || !(ability in scores)) return null;

  const prof = getProficiencyBonus(level);

  const mod = getAbilityModifier(scores[ability as AbilityKey]);

  return { saveDC: getSpellSaveDC(prof, mod), attackBonus: getSpellAttackBonus(prof, mod) };
}
```

(імпорт `import type { AbilityKey } from "@/types/characters";` угорі файлу.)

`lib/utils/battle/attack/bonus.ts` — тіло `calculateAttackBonus`:

```ts
  const statModifier = getAttackAbilityModifier(attacker.abilities, attack.type);
```

(імпорт `getAttackAbilityModifier` з `@/lib/utils/common/calculations`).

`lib/utils/battle/participant/from-character.ts`:

```ts
  const proficiencyBonus = getProficiencyBonus(character.level);

  const scores = { strength: character.strength, dexterity: character.dexterity, constitution: character.constitution, intelligence: character.intelligence, wisdom: character.wisdom, charisma: character.charisma };

  const primary = (ABILITY_KEYS as readonly string[]).includes(character.primaryAbility ?? "") ? (character.primaryAbility as AbilityKey) : undefined;

  const spell = spellcastingDerived(character.level, character.spellcastingAbility, scores);
```

і в об'єкті учасника: `proficiencyBonus,` `primaryAbility: primary,` (в `abilities`), `spellSaveDC: spell?.saveDC,` `spellAttackBonus: spell?.attackBonus,` (в `spellcasting`). Якщо `CharacterFromPrisma` не має `primaryAbility` — він виводиться з Prisma-типу після Task 1, тож тип з'явиться автоматично.

- [ ] **Step 3: Перевірка**

Run: `pnpm test:run lib/utils/battle` → PASS (наявні тести атак теж: у моках модифікатори узгоджені з оцінками).
Run: `pnpm simulate-battle` → той самий результат, що на `main` (порівняти підсумковий рядок `N/N`).
Run: `pnpm exec tsc --noEmit && pnpm lint --fix`.

- [ ] **Step 4: Commit**

```bash
git add types lib/utils/common lib/utils/battle
git commit -m "feat(battle): primary ability drives attack and damage; proficiency and spell DC from level"
```

---

### Task 3: API персонажа — нові поля, мертві поля геть, без денормалізації

**Files:**
- Modify: `app/api/campaigns/[id]/characters/[characterId]/update-character-schema.ts`
- Modify: `app/api/campaigns/[id]/characters/[characterId]/build-character-update-data.ts`, `route.ts` (PATCH)
- Modify: `app/api/campaigns/[id]/characters/[characterId]/level-up/route.ts`, `app/api/campaigns/[id]/characters/route.ts` (POST)
- Modify: `types/characters.ts` (`CharacterFormData`), `lib/utils/characters/character-form.ts`, `lib/hooks/characters/useCharacterForm-defaults.ts`, `useCharacterForm.ts`, `useCharacterForm-bindings.ts`, `components/characters/stats/CharacterCombatParams.tsx`, `components/characters/basic/CharacterBasicInfo.tsx`
- Test: `app/api/__tests__/character-patch-fields.test.ts`; оновити наявні тести `build-character-update-data`, якщо є (`grep -rl buildCharacterUpdateData app lib --include=*.test.ts`)

**Interfaces:**
- Consumes: `characterGoalsSchema`, `AbilityKey` (Task 1)
- Produces: PATCH приймає `primaryAbility: AbilityKey | null`, `goals: CharacterGoal[]`, `background: string`; `CharacterFormData.abilityScores.primaryAbility: AbilityKey | null`; `CharacterFormData.spellcasting.spellcastingAbility: "intelligence" | "wisdom" | "charisma" | ""`

- [ ] **Step 1: Падаючий тест**

`app/api/__tests__/character-patch-fields.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { updateCharacterSchema } from "@/app/api/campaigns/[id]/characters/[characterId]/update-character-schema";

describe("updateCharacterSchema", () => {
  it("приймає primaryAbility, goals, background", () => {
    const parsed = updateCharacterSchema.parse({
      primaryAbility: "dexterity",
      goals: [{ id: "g1", text: "Ціль", status: "active", author: "dm" }],
      background: "Текст ==важливе==",
    });

    expect(parsed.primaryAbility).toBe("dexterity");
    expect(parsed.goals).toHaveLength(1);
  });

  it("null знімає основну характеристику, невідомий ключ — помилка", () => {
    expect(updateCharacterSchema.parse({ primaryAbility: null }).primaryAbility).toBeNull();
    expect(() => updateCharacterSchema.parse({ primaryAbility: "luck" })).toThrow();
  });

  it("мертві поля відкидаються", () => {
    const parsed = updateCharacterSchema.parse({ ideals: "x", hitDice: "1d8", proficiencyBonus: 2 }) as Record<string, unknown>;

    expect(parsed.ideals).toBeUndefined();
    expect(parsed.hitDice).toBeUndefined();
  });
});
```

Run → FAIL.

- [ ] **Step 2: Схема**

`update-character-schema.ts`: видалити `hitDice`, `personalityTraits`, `ideals`, `bonds`, `flaws`, `maxHp`, `currentHp`, `tempHp`; додати:

```ts
  primaryAbility: z.enum(ABILITY_KEYS).nullable().optional(),
  goals: characterGoalsSchema.optional(),
  background: z.string().max(20000).optional(),
```

(імпорти `ABILITY_KEYS` з `@/types/characters`, `characterGoalsSchema` з `@/lib/schemas`). Те саме видалення мертвих полів — у zod-схемі POST у `characters/route.ts`.

- [ ] **Step 3: Без денормалізації**

`build-character-update-data.ts`: прибрати з результату й обчислень `proficiencyBonus`, `passive*`, `spellSaveDC`, `spellAttackBonus`, `maxHp`, `currentHp`, `hitDice`; лишити `finalLevel`, `spellSlotsToSave`, `skillTreeProgressUpdate`, `seenLevel`. У PATCH `route.ts` відповідно прибрати ці поля з `data:`; `goals` записувати як `data.goals as Prisma.InputJsonValue`.

`level-up/route.ts`: прибрати запис `proficiencyBonus`, `spellSaveDC`, `spellAttackBonus`, passive-полів (рядки ~122–160, ~200); HP-приріст у `levelUpDetails` лишити, як є, якщо він показується користувачу.

`characters/route.ts` (POST): прибрати обчислення тих самих колонок (дефолти БД лишаються).

- [ ] **Step 4: Форма**

`types/characters.ts` → `CharacterFormData`: прибрати `combatStats.hitDice`, `roleplay.personalityTraits|ideals|bonds|flaws`; додати `abilityScores.primaryAbility: AbilityKey | null`, `spellcasting.spellcastingAbility: "intelligence" | "wisdom" | "charisma" | ""` (якщо поля ще немає).
`character-form.ts`: у `characterToFormData` — `primaryAbility: (character.primaryAbility as AbilityKey | null) ?? null`, `spellcastingAbility: character.spellcastingAbility ?? ""`; у `formDataToCharacter` — `primaryAbility: formData.abilityScores.primaryAbility`, `spellcastingAbility: formData.spellcasting.spellcastingAbility || null`; прибрати мертві поля.
`useCharacterForm-defaults.ts`: `primaryAbility: null`, `spellcastingAbility: ""`; прибрати мертві.
`useCharacterForm-bindings.ts`: додати в `abilityScores` сетер

```ts
setPrimaryAbility: (key: AbilityKey | null) => setFormData((prev) => ({ ...prev, abilityScores: { ...prev.abilityScores, primaryAbility: key } })),
```

і в `spellcasting` — `setSpellcastingAbility(v)`; прибрати сетери мертвих полів.
`CharacterCombatParams.tsx`: прибрати поле «Кістки Здоров'я».
`CharacterBasicInfo.tsx`: прибрати поле «Передісторія» (біографія тепер у табі «Історія»).

- [ ] **Step 5: Перевірка**

Run: `pnpm test:run app/api lib/utils/characters lib/hooks/characters` → PASS (оновити тести, що чекали мертві поля, видаливши ці очікування).
Run: `pnpm exec tsc --noEmit && pnpm lint --fix`.

- [ ] **Step 6: Commit**

```bash
git add app/api types lib components/characters
git commit -m "feat(characters): PATCH accepts primaryAbility/goals/biography; stop writing derived stats; drop dead form fields"
```

---

### Task 4: Розмітка біографії

**Files:**
- Create: `lib/utils/characters/biography/highlight.ts`, `lib/utils/characters/biography/index.ts`
- Test: `lib/utils/characters/__tests__/highlight.test.ts`

**Interfaces:**
- Produces: `type BioSegment = { text: string; marked: boolean }`; `parseHighlights(src: string): BioSegment[]`; `toggleHighlight(src: string, start: number, end: number): { text: string; start: number; end: number }`; `paragraphs(src: string): string[]`

- [ ] **Step 1: Падаючий тест**

```ts
import { describe, expect, it } from "vitest";

import { paragraphs, parseHighlights, toggleHighlight } from "@/lib/utils/characters/biography";

describe("biography highlights", () => {
  it("розбирає виділення", () => {
    expect(parseHighlights("а ==б== в")).toEqual([
      { text: "а ", marked: false },
      { text: "б", marked: true },
      { text: " в", marked: false },
    ]);
  });

  it("незакритий маркер і порожнє виділення лишаються текстом", () => {
    expect(parseHighlights("а ==б")).toEqual([{ text: "а ==б", marked: false }]);
    expect(parseHighlights("а ==== б")).toEqual([{ text: "а ==== б", marked: false }]);
  });

  it("HTML лишається текстом", () => {
    expect(parseHighlights("==<script>x</script>==")).toEqual([{ text: "<script>x</script>", marked: true }]);
  });

  it("обгортає виділення без пробілів по краях і зсуває курсор", () => {
    expect(toggleHighlight("мати загинула тут", 0, 14)).toEqual({ text: "==мати загинула== тут", start: 2, end: 15 });
  });

  it("знімає виділення, якщо курсор всередині підсвіченого", () => {
    expect(toggleHighlight("а ==брат== в", 5, 7)).toEqual({ text: "а брат в", start: 2, end: 6 });
  });

  it("прибирає вкладені маркери при обгортанні", () => {
    expect(toggleHighlight("а ==б== в", 0, 9).text).toBe("==а б в==");
  });

  it("порожнє виділення нічого не змінює", () => {
    expect(toggleHighlight("abc", 1, 1)).toEqual({ text: "abc", start: 1, end: 1 });
  });

  it("абзаци за порожнім рядком", () => {
    expect(paragraphs("а\nб\n\nв\n\n\n")).toEqual(["а\nб", "в"]);
  });
});
```

Run → FAIL.

- [ ] **Step 2: Реалізація**

`lib/utils/characters/biography/highlight.ts`:

```ts
export type BioSegment = { text: string; marked: boolean };

const MARK = /==([^=\n](?:[^\n]*?[^=\n])?)==/g;

export function parseHighlights(src: string): BioSegment[] {
  const out: BioSegment[] = [];

  let last = 0;

  for (const m of src.matchAll(MARK)) {
    if (m.index > last) out.push({ text: src.slice(last, m.index), marked: false });

    out.push({ text: m[1], marked: true });
    last = m.index + m[0].length;
  }

  if (last < src.length) out.push({ text: src.slice(last), marked: false });

  return out;
}

export function toggleHighlight(src: string, start: number, end: number): { text: string; start: number; end: number } {
  for (const m of src.matchAll(MARK)) {
    const from = m.index + 2;

    const to = from + m[1].length;

    if (start >= from && end <= to) {
      return { text: src.slice(0, m.index) + m[1] + src.slice(m.index + m[0].length), start: m.index, end: m.index + m[1].length };
    }
  }

  let s = start;

  let e = end;

  while (s < e && /\s/.test(src[s])) s++;

  while (e > s && /\s/.test(src[e - 1])) e--;

  if (s === e) return { text: src, start, end };

  const inner = src.slice(s, e).replaceAll("==", "");

  return { text: `${src.slice(0, s)}==${inner}==${src.slice(e)}`, start: s + 2, end: s + 2 + inner.length };
}

export function paragraphs(src: string): string[] {
  return src.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
```

`index.ts`: `export * from "./highlight";`

- [ ] **Step 3: Перевірка** — `pnpm test:run lib/utils/characters/__tests__/highlight.test.ts` → PASS; `pnpm lint --fix`.

Зауваження до тесту «обгортає»: `toggleHighlight("мати загинула тут", 0, 14)` — виділення «мати загинула » з пробілом у кінці; пробіл відсікається, тому `end` = 2 + 13 = 15.

- [ ] **Step 4: Commit**

```bash
git add lib/utils/characters
git commit -m "feat(characters): biography highlight markup (==…==) parse and toggle"
```

---

### Task 5: Лист персонажа — чиста функція

**Files:**
- Modify: `lib/constants/skills.ts` (метадані навичок)
- Modify: `lib/utils/abilities/build/bake.ts` (експорт `bakedStatSources`)
- Modify: `types/characters.ts` (типи листа)
- Create: `lib/utils/characters/sheet/lines.ts`, `build-sheet.ts`, `index.ts`
- Test: `lib/utils/characters/__tests__/build-sheet.test.ts`

**Interfaces:**
- Consumes: `getAttackAbilityModifier`, `spellcastingDerived` (Task 2); `parseGoals` (Task 1); `calculateAttackBonus`, `calculateDamageWithModifiers`, `applyHeroDmDamageMultiplier`, `collectModifiers`, `statWithModifiers`, `getHeroDamageDiceForLevel`, `getHeroMaxHpBreakdown`, `getDiceAverage`, `slotLevels`; `BookSpell` з `@/lib/hooks/battle/useSpellBook` (перенести тип у `types/spells.ts` як `BookSpell` і реекспортувати з хука, щоб `lib/utils` не імпортував хук)
- Produces: `CharacterSheet` та підтипи (нижче), `buildCharacterSheet(input: SheetInput): CharacterSheet`, `DND_SKILL_META`, `bakedStatSources(p, stat)`

- [ ] **Step 1: Типи листа** (`types/characters.ts`)

```ts
export type SheetLineSource = "base" | "ability" | "proficiency" | "weapon" | "level" | "dice" | "skill" | "race" | "artifact" | "artifactSet" | "unit" | "character" | "effect" | "action" | "multiplier";

export interface SheetLine {
  label: string;
  value: string;
  source?: SheetLineSource;
}

export interface SheetTotal {
  total: number;
  lines: SheetLine[];
}

export interface SheetAbility {
  key: AbilityKey;
  score: number;
  mod: number;
  isPrimary: boolean;
  lines: SheetLine[];
}

export interface SheetAttack {
  id: string;
  name: string;
  kind: "melee" | "ranged";
  toHit: SheetTotal;
  avgDamage: SheetTotal;
}

export interface SheetCheck {
  key: string;
  label: string;
  ability: AbilityKey;
  bonus: number;
  proficient: boolean;
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

export interface SheetSet {
  id: string;
  name: string;
  have: number;
  total: number;
  complete: boolean;
  effects: string[];
}

export interface CharacterSheet {
  viewer: { isDM: boolean; isOwner: boolean };
  identity: { id: string; name: string; avatar: string | null; level: number; className: string; subclass: string | null; race: string; raceIcon: string | null; alignment: string | null };
  abilities: SheetAbility[];
  primaryAbility: AbilityKey | null;
  proficiency: number;
  hp: SheetTotal;
  armorClass: SheetTotal;
  initiative: number;
  speed: number;
  morale: number;
  targets: { min: number; max: number };
  immunities: string[];
  languages: string[];
  proficiencies: string[];
  attacks: SheetAttack[];
  bestToHit: number | null;
  saves: SheetCheck[];
  skills: SheetCheck[];
  passives: { perception: number; investigation: number; insight: number };
  magic: { ability: string; saveDC: number; attackBonus: number } | null;
  slots: { level: number; count: number }[];
  spells: BookSpell[];
  items: { grid: Record<string, SheetArtifact | null>; artifacts: SheetArtifact[]; sets: SheetSet[] };
  personalSkill: { id: string; name: string; icon: string | null; description: string | null } | null;
  story: { biography: string | null; goals: CharacterGoal[] };
}
```

- [ ] **Step 2: Метадані навичок** (`lib/constants/skills.ts`)

```ts
export const DND_SKILL_META: Record<DndSkill, { label: string; ability: "strength" | "dexterity" | "intelligence" | "wisdom" | "charisma" }> = {
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

- [ ] **Step 3: `bakedStatSources`** (`lib/utils/abilities/build/bake.ts`)

```ts
export function bakedStatSources(p: BattleParticipant, stat: string): { label: string; value: number; sourceType: ResolvedAbility["source"]["type"] }[] {
  return resolvedAbilitiesOf(p)
    .filter((a) => a.trigger.event === "passive" && !a.condition)
    .flatMap((a) =>
      a.effects
        .filter((e): e is ModifyStat => e.kind === "modifyStat" && e.stat === stat && (e.target ?? "self") === "self" && e.flat !== undefined)
        .map((e) => ({ label: a.source.name, value: resolveFlat(e.flat!, p), sourceType: a.source.type })),
    )
    .filter((x) => x.value !== 0);
}
```

(імпорт `type ResolvedAbility` з `@/types/abilities`.)

- [ ] **Step 4: Падаючий тест**

`lib/utils/characters/__tests__/build-sheet.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { AttackType } from "@/lib/constants/battle";
import { calculateAttackBonus } from "@/lib/utils/battle/attack";
import { buildCharacterSheet, type SheetInput } from "@/lib/utils/characters/sheet";
import type { BattleAttack } from "@/types/battle";

const bow = { id: "bow", name: "Довгий лук", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d8" } as BattleAttack;

const sword = { id: "sw", name: "Кинджал", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d4" } as BattleAttack;

function lira(over: Partial<SheetInput["character"]> = {}, attacks: BattleAttack[] = [bow, sword]): SheetInput {
  const p = createMockParticipant();

  p.abilities = { ...p.abilities, level: 30, strength: 10, dexterity: 18, modifiers: { ...p.abilities.modifiers, strength: 0, dexterity: 4 }, proficiencyBonus: 9, primaryAbility: over.primaryAbility ?? undefined, meleeMultiplier: over.meleeMultiplier ?? 1, rangedMultiplier: 1 };
  p.battleData.attacks = attacks;
  p.combatStats = { ...p.combatStats, armorClass: 14, maxHp: 127 };

  return {
    participant: p,
    viewer: { isDM: false, isOwner: true },
    character: {
      id: "lira", name: "Ліра", avatar: null, level: 30, class: "Ranger", subclass: null, race: "Ельф", alignment: null,
      strength: 10, dexterity: 18, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
      armorClass: 14, savingThrows: { dexterity: true }, skills: { stealth: true, perception: true },
      languages: ["Ельфійська"], proficiencies: {}, immunities: [], spellcastingAbility: null, hpMultiplier: null,
      primaryAbility: null, meleeMultiplier: null, background: "Вона ==вірить== у брата", goals: [{ id: "g", text: "Знайти брата", status: "active", author: "dm" }],
      ...over,
    },
    raceIcon: null,
    artifacts: [{ id: "a1", name: "Кольчуга ельфів", icon: null, slot: "armor", rarity: "rare", description: null, effects: ["AC +2"] }],
    sets: [],
    spells: [],
    personalSkill: null,
  };
}

describe("buildCharacterSheet", () => {
  it("майстерність від рівня і модифікатори характеристик", () => {
    const s = buildCharacterSheet(lira());

    expect(s.proficiency).toBe(9);
    expect(s.abilities.find((a) => a.key === "dexterity")).toMatchObject({ score: 18, mod: 4, isPrimary: false });
  });

  it("основна СПР → +4 і в ближній атаці; влучання = бойовий calculateAttackBonus", () => {
    const input = lira({ primaryAbility: "dexterity" });

    const s = buildCharacterSheet(input);

    const dagger = s.attacks.find((a) => a.id === "sw")!;

    expect(dagger.toHit.total).toBe(calculateAttackBonus(input.participant, sword));
    expect(dagger.toHit.total).toBe(4 + 9);
    expect(dagger.toHit.lines[0]).toMatchObject({ label: "Спритність ★", value: "+4" });
    expect(s.abilities.find((a) => a.key === "dexterity")!.isPrimary).toBe(true);
  });

  it("без основної ближня атака бере СИЛ", () => {
    expect(buildCharacterSheet(lira()).attacks.find((a) => a.id === "sw")!.toHit.total).toBe(0 + 9);
  });

  it("середня шкода: кубики зброї + рівень + кубики рівня + характеристика, з коефіцієнтом ДМа", () => {
    const plain = buildCharacterSheet(lira()).attacks.find((a) => a.id === "sw")!.avgDamage.total;

    const doubled = buildCharacterSheet(lira({ meleeMultiplier: 2 })).attacks.find((a) => a.id === "sw")!.avgDamage.total;

    expect(plain).toBeGreaterThan(30);
    expect(doubled).toBe(Math.floor(plain * 2));
  });

  it("найкраще влучання; без атак — null", () => {
    expect(buildCharacterSheet(lira()).bestToHit).toBe(13);
    expect(buildCharacterSheet(lira({}, [])).bestToHit).toBeNull();
  });

  it("рятівні кидки й навички з майстерністю; пасивне сприйняття", () => {
    const s = buildCharacterSheet(lira());

    expect(s.saves.find((x) => x.key === "dexterity")).toMatchObject({ bonus: 13, proficient: true });
    expect(s.skills.find((x) => x.key === "stealth")).toMatchObject({ label: "Скритність", bonus: 13 });
    expect(s.passives.perception).toBe(10 + 0 + 9);
  });

  it("без магії — magic null і порожні слоти", () => {
    const s = buildCharacterSheet(lira());

    expect(s.magic).toBeNull();
    expect(s.slots).toEqual([]);
  });

  it("історія й ефекти артефактів проходять як є", () => {
    const s = buildCharacterSheet(lira());

    expect(s.story.biography).toBe("Вона ==вірить== у брата");
    expect(s.story.goals).toHaveLength(1);
    expect(s.items.artifacts[0].effects).toEqual(["AC +2"]);
    expect(s.items.grid.armor?.id).toBe("a1");
  });
});
```

Run → FAIL.

- [ ] **Step 5: Реалізація — `lines.ts`**

```ts
import { AttackType } from "@/lib/constants/battle";
import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { bakedStatSources } from "@/lib/utils/abilities/build/bake";
import { collectModifiers, statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { calculateAttackBonus } from "@/lib/utils/battle/attack";
import { getDiceAverage } from "@/lib/utils/battle/balance";
import { calculateDamageWithModifiers } from "@/lib/utils/battle/damage";
import { applyHeroDmDamageMultiplier } from "@/lib/utils/battle/damage/hero-dm-multiplier";
import { getAbilityModifier, getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import type { AbilityKey, SheetAttack, SheetLine, SheetLineSource, SheetTotal } from "@/types/characters";

export const abilityLabel = (key: AbilityKey) => CORE_ABILITY_SCORES.find((a) => a.key === key)?.label ?? key;

export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

const asSource = (t: string): SheetLineSource => t as SheetLineSource;

export function abilityLines(p: BattleParticipant, key: AbilityKey, base: number): SheetLine[] {
  return [{ label: "База", value: String(base), source: "base" }, ...bakedStatSources(p, key).map((s) => ({ label: s.label, value: signed(s.value), source: asSource(s.sourceType) }))];
}

export function armorTotal(p: BattleParticipant): SheetTotal {
  const mods = collectModifiers([p], p.basicInfo.id, { stat: "armor" });

  return {
    total: statWithModifiers([p], p.basicInfo.id, "armor", p.combatStats.armorClass),
    lines: [
      { label: "База", value: String(p.combatStats.armorClass), source: "base" },
      ...mods.entries.flatMap((e) => [
        ...(e.flat ? [{ label: e.label, value: signed(e.flat), source: asSource(e.sourceType) }] : []),
        ...(e.percent ? [{ label: e.label, value: `${signed(e.percent)}%`, source: asSource(e.sourceType) }] : []),
      ]),
    ],
  };
}

function attackAbilityKey(p: BattleParticipant, kind: AttackType): AbilityKey {
  return p.abilities.primaryAbility ?? (kind === AttackType.MELEE ? "strength" : "dexterity");
}

export function attackSheet(p: BattleParticipant, attack: BattleAttack): SheetAttack {
  const type = attack.type === AttackType.RANGED ? AttackType.RANGED : AttackType.MELEE;

  const key = attackAbilityKey(p, type);

  const statMod = getAttackAbilityModifier(p.abilities, type);

  const star = p.abilities.primaryAbility ? " ★" : "";

  const hitMods = collectModifiers([p], p.basicInfo.id, { stat: "attackBonus", attackKind: type === AttackType.RANGED ? "ranged" : "melee" });

  const toHitLines: SheetLine[] = [
    { label: `${abilityLabel(key)}${star}`, value: signed(statMod), source: "ability" },
    { label: "Майстерність", value: signed(p.abilities.proficiencyBonus), source: "proficiency" },
    ...(attack.attackBonus ? [{ label: "Зброя", value: signed(attack.attackBonus), source: "weapon" as const }] : []),
    ...hitMods.entries.filter((e) => e.flat).map((e) => ({ label: e.label, value: signed(e.flat), source: asSource(e.sourceType) })),
  ];

  const isHero = p.basicInfo.sourceType === "character";

  const heroDice = isHero ? getHeroDamageDiceForLevel(p.abilities.level, type) : "";

  const weaponAvg = attack.damageDice ? getDiceAverage(attack.damageDice) : 0;

  const calc = calculateDamageWithModifiers(p, weaponAvg, statMod, type, {
    allParticipants: [p],
    heroLevelPart: isHero ? p.abilities.level : 0,
    heroDicePart: heroDice ? getDiceAverage(heroDice) : 0,
    heroDiceNotation: heroDice,
    weaponDiceNotation: attack.damageDice ?? undefined,
  });

  const dm = applyHeroDmDamageMultiplier(p, type, calc.totalDamage);

  const damageLines: SheetLine[] = [
    ...(attack.damageDice ? [{ label: `Зброя ${attack.damageDice}`, value: weaponAvg.toFixed(1), source: "dice" as const }] : []),
    ...(isHero ? [{ label: `Рівень + ${heroDice}`, value: (p.abilities.level + getDiceAverage(heroDice)).toFixed(1), source: "level" as const }] : []),
    { label: abilityLabel(key), value: signed(statMod), source: "ability" },
    ...calc.steps.filter((s) => s.kind === "percent" || (s.kind === "flat" && s.label !== "Сила" && s.label !== "Спритність" && s.label !== "Рівень героя")).map((s) => ({ label: s.label, value: s.kind === "percent" ? `${signed(s.value)}%` : signed(s.value), source: "skill" as const })),
    ...(dm.multiplier !== 1 ? [{ label: "Коеф. ДМа", value: `×${dm.multiplier}`, source: "multiplier" as const }] : []),
  ];

  return {
    id: attack.id ?? attack.name,
    name: attack.name,
    kind: type === AttackType.RANGED ? "ranged" : "melee",
    toHit: { total: calculateAttackBonus(p, attack), lines: toHitLines },
    avgDamage: { total: dm.damage, lines: damageLines },
  };
}

export const checkBonus = (score: number, proficient: boolean, prof: number) => getAbilityModifier(score) + (proficient ? prof : 0);
```

Примітка: якщо `calc.steps` для персонажа з не-СИЛ/СПР основною дає мітку кроку характеристики інакше (`impl.ts:105` пише «Сила»/«Спритність» за типом атаки), фільтр вище відкидає її за міткою. Додатково виправити `impl.ts`: мітка кроку `statLabel` і рядок `breakdown` мають брати назву фактичної характеристики. Для цього в `context` додати `statLabel?: string` і передавати `abilityLabel(key)` з листа та з `process/compute.ts` (там `getAttackAbilityModifier` — ключ обчислюється тим самим виразом; винести `attackAbilityKey` у `lib/utils/common/calculations.ts` поруч із `getAttackAbilityModifier` і використати в обох місцях). Тоді фільтр стає `s.kind === "percent" || (s.kind === "flat" && s.label !== statLabel && s.label !== "Рівень героя")`.

- [ ] **Step 6: Реалізація — `build-sheet.ts`**

```ts
import { abilityLabel, abilityLines, armorTotal, attackSheet, checkBonus } from "./lines";

import { DND_SAVING_THROWS, DND_SKILL_META, DND_SKILLS } from "@/lib/constants";
import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import { getHeroMaxHpBreakdown } from "@/lib/constants/hero-scaling";
import { parseGoals } from "@/lib/schemas/character-goals";
import { slotLevels } from "@/lib/utils/battle/view";
import { getAbilityModifier, spellcastingDerived } from "@/lib/utils/common/calculations";
import type { BattleParticipant } from "@/types/battle";
import { ABILITY_KEYS, type AbilityKey, type CharacterSheet, type SheetArtifact, type SheetSet } from "@/types/characters";
import type { BookSpell } from "@/types/spells";

export interface SheetInput {
  participant: BattleParticipant;
  viewer: CharacterSheet["viewer"];
  character: Record<AbilityKey, number> & {
    id: string; name: string; avatar: string | null; level: number; class: string; subclass: string | null; race: string; alignment: string | null;
    armorClass: number; savingThrows: unknown; skills: unknown; languages: unknown; proficiencies: unknown; immunities: unknown;
    spellcastingAbility: string | null; hpMultiplier: number | null; meleeMultiplier: number | null; primaryAbility: string | null;
    background: string | null; goals: unknown;
  };
  raceIcon: string | null;
  artifacts: SheetArtifact[];
  sets: SheetSet[];
  spells: BookSpell[];
  personalSkill: CharacterSheet["personalSkill"];
}

const flags = (raw: unknown) => (raw && typeof raw === "object" ? (raw as Record<string, boolean>) : {});

const strings = (raw: unknown) => (Array.isArray(raw) ? raw.map(String) : []);

export function buildCharacterSheet(input: SheetInput): CharacterSheet {
  const { participant: p, character: c } = input;

  const prof = p.abilities.proficiencyBonus;

  const scores = Object.fromEntries(ABILITY_KEYS.map((k) => [k, p.abilities[k]])) as Record<AbilityKey, number>;

  const primary = p.abilities.primaryAbility ?? null;

  const savingThrows = flags(c.savingThrows);

  const skillFlags = flags(c.skills);

  const skills = DND_SKILLS.map((key) => {
    const meta = DND_SKILL_META[key];

    return { key, label: meta.label, ability: meta.ability, proficient: !!skillFlags[key], bonus: checkBonus(scores[meta.ability], !!skillFlags[key], prof) };
  });

  const attacks = p.battleData.attacks.map((a) => attackSheet(p, a));

  const hp = getHeroMaxHpBreakdown(c.level, c.strength, { hpMultiplier: c.hpMultiplier ?? 1 });

  const hpBonus = p.combatStats.maxHp - hp.total;

  const magic = spellcastingDerived(c.level, c.spellcastingAbility, scores);

  const grid = Object.fromEntries(ARTIFACT_GRID_9.map((cell) => [cell.key, input.artifacts.find((a) => a.slot === cell.key) ?? null]));

  return {
    viewer: input.viewer,
    identity: { id: c.id, name: c.name, avatar: c.avatar, level: c.level, className: c.class, subclass: c.subclass, race: c.race, raceIcon: input.raceIcon, alignment: c.alignment },
    abilities: ABILITY_KEYS.map((key) => ({ key, score: scores[key], mod: getAbilityModifier(scores[key]), isPrimary: primary === key, lines: abilityLines(p, key, c[key]) })),
    primaryAbility: primary,
    proficiency: prof,
    hp: { total: p.combatStats.maxHp, lines: [...hp.breakdown.map((b) => ({ label: b, value: "", source: "level" as const })), ...(hpBonus ? [{ label: "Бонуси", value: hpBonus > 0 ? `+${hpBonus}` : String(hpBonus) }] : [])] },
    armorClass: armorTotal(p),
    initiative: p.abilities.initiative,
    speed: p.combatStats.speed,
    morale: p.combatStats.morale,
    targets: { min: p.combatStats.minTargets ?? 1, max: p.combatStats.maxTargets ?? 1 },
    immunities: strings(c.immunities),
    languages: strings(c.languages),
    proficiencies: Object.values(flags(c.proficiencies) as unknown as Record<string, string[]>).flat().map(String),
    attacks,
    bestToHit: attacks.length ? Math.max(...attacks.map((a) => a.toHit.total)) : null,
    saves: DND_SAVING_THROWS.map((key) => ({ key, label: abilityLabel(key), ability: key, proficient: !!savingThrows[key], bonus: checkBonus(scores[key], !!savingThrows[key], prof) })),
    skills,
    passives: {
      perception: 10 + skills.find((s) => s.key === "perception")!.bonus,
      investigation: 10 + skills.find((s) => s.key === "investigation")!.bonus,
      insight: 10 + skills.find((s) => s.key === "insight")!.bonus,
    },
    magic: magic && c.spellcastingAbility ? { ability: abilityLabel(c.spellcastingAbility as AbilityKey), ...magic } : null,
    slots: slotLevels(p).filter((s) => s.max > 0).map((s) => ({ level: s.level, count: s.max })),
    spells: input.spells,
    items: { grid, artifacts: input.artifacts, sets: input.sets },
    personalSkill: input.personalSkill,
    story: { biography: c.background?.trim() ? c.background : null, goals: parseGoals(c.goals) },
  };
}
```

`index.ts`: `export * from "./build-sheet"; export * from "./lines";`

`proficiencies` у БД — `Record<string, string[]>`; `flags()` повертає об'єкт як є, тож каст коректний. Якщо `DND_SKILL_META` не реекспортується з `@/lib/constants` — додати в `lib/constants/index.ts`.

`BookSpell`: перенести тип з `lib/hooks/battle/useSpellBook.ts` у `types/spells.ts` (`export type BookSpell = {...}`), у хуку лишити `export type { BookSpell } from "@/types/spells";`.

- [ ] **Step 7: Перевірка** — `pnpm test:run lib/utils/characters lib/utils/battle` → PASS; `pnpm exec tsc --noEmit && pnpm lint --fix`.

- [ ] **Step 8: Commit**

```bash
git add lib types
git commit -m "feat(characters): buildCharacterSheet — stats, to-hit and average damage from the battle engine"
```

---

### Task 6: `GET /sheet`, клієнт API і `useCharacterSheet`

**Files:**
- Create: `app/api/campaigns/[id]/characters/[characterId]/sheet/route.ts`, `sheet-handler.ts`
- Modify: `lib/api/characters.ts` (+ `getCharacterSheet`)
- Create: `lib/hooks/characters/useCharacterSheet.ts`; Modify: `lib/hooks/characters/index.ts`
- Test: `app/api/__tests__/character-sheet-api.test.ts`

**Interfaces:**
- Consumes: `buildCharacterSheet`, `SheetInput` (Task 5); `abilitySummary` (`lib/utils/abilities/summary.ts`); `loadEquippedArtifactRows`, `createBattleParticipantFromCharacter`, `applyBakedAuras`, `loadArtifactSetBattleMaps`
- Produces: `getCharacterSheet(campaignId, characterId): Promise<CharacterSheet>`; `characterSheetKey(campaignId, characterId?)`; `useCharacterSheet(campaignId, characterId)`

- [ ] **Step 1: Падаючий тест доступу**

`app/api/__tests__/character-sheet-api.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn() } } }));
vi.mock("@/app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler", async (orig) => ({
  ...(await orig<object>()),
  buildSheetFor: vi.fn().mockResolvedValue({ identity: { name: "Ліра" } }),
}));

const access = (userId: string, role: "dm" | "player") => ({ userId, campaign: { id: "camp", members: [{ userId, role }] } }) as never;

const get = async (characterId = "ch") => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/sheet/route");

  return mod.GET(new Request("http://x"), { params: Promise.resolve({ id: "camp", characterId }) }) as Promise<NextResponse>;
};

describe("GET sheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "camp", controlledBy: "owner" } as never);
  });

  it("власник бачить свій лист", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    expect((await get()).status).toBe(200);
  });

  it("інший гравець — 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("other", "player"));
    expect((await get()).status).toBe(403);
  });

  it("ДМ бачить будь-якого", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    expect((await get()).status).toBe(200);
  });

  it("персонаж іншої кампанії — 404", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "other", controlledBy: "owner" } as never);
    expect((await get()).status).toBe(404);
  });
});
```

Run → FAIL.

- [ ] **Step 2: Обробник**

`sheet-handler.ts`:

```ts
import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { loadArtifactSetBattleMaps } from "@/lib/utils/battle/artifact-sets/load-maps";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant";
import { loadEquippedArtifactRows } from "@/lib/utils/battle/participant/extract-artifacts";
import { buildCharacterSheet } from "@/lib/utils/characters/sheet";
import type { CharacterSheet, SheetArtifact, SheetSet } from "@/types/characters";
import type { BookSpell } from "@/types/spells";

export type SheetCharacter = NonNullable<Awaited<ReturnType<typeof loadSheetCharacter>>>;

export const loadSheetCharacter = (characterId: string) => prisma.character.findUnique({ where: { id: characterId }, include: { inventory: true } });

const SPELL_SELECT = {
  id: true, name: true, level: true, type: true, damageType: true, diceCount: true, diceType: true, savingThrow: true, hitCheck: true,
  description: true, icon: true, range: true, duration: true, concentration: true, damageElement: true, spellGroup: { select: { id: true, name: true } },
} as const;

export async function buildSheetFor(character: SheetCharacter, viewer: CharacterSheet["viewer"]): Promise<CharacterSheet> {
  const built = await createBattleParticipantFromCharacter(character, "", ParticipantSide.ALLY);

  const [participant] = applyBakedAuras([built], new Set([built.basicInfo.id]));

  const rows = await loadEquippedArtifactRows(character);

  const setIds = [...new Set(rows.map((r) => r.row.setId).filter((x): x is string => !!x))];

  const known = participant.spellcasting.knownSpells ?? [];

  const [maps, race, spells, personal] = await Promise.all([
    loadArtifactSetBattleMaps(character.campaignId, setIds),
    prisma.race.findFirst({ where: { campaignId: character.campaignId, name: character.race }, select: { icon: true } }),
    known.length ? prisma.spell.findMany({ where: { campaignId: character.campaignId, id: { in: known } }, select: SPELL_SELECT }) : Promise.resolve([]),
    character.personalSkillId ? prisma.skill.findFirst({ where: { id: character.personalSkillId, campaignId: character.campaignId }, select: { id: true, name: true, icon: true, description: true } }) : Promise.resolve(null),
  ]);

  const artifacts: SheetArtifact[] = rows.map(({ row, slot }) => ({ id: row.id, name: row.name, icon: row.icon, slot, rarity: row.rarity, description: row.description, effects: abilitySummary("artifact", row) }));

  const equippedIds = new Set(rows.map((r) => r.row.id));

  const sets: SheetSet[] = setIds.flatMap((id) => {
    const set = maps.artifactSetsById[id];

    const members = maps.artifactSetMemberIds[id] ?? [];

    if (!set) return [];

    const have = members.filter((m) => equippedIds.has(m)).length;

    return [{ id, name: set.name, have, total: members.length, complete: have === members.length && members.length > 0, effects: abilitySummary("artifactSet", set as never) }];
  });

  return buildCharacterSheet({
    participant,
    viewer,
    character: { ...character, goals: character.goals, primaryAbility: character.primaryAbility },
    raceIcon: race?.icon ?? null,
    artifacts,
    sets,
    spells: spells as unknown as BookSpell[],
    personalSkill: personal,
  });
}
```

`route.ts`:

```ts
import { NextResponse } from "next/server";

import { buildSheetFor, loadSheetCharacter } from "./sheet-handler";

import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const access = await requireCampaignAccess(id, false);

    if (access instanceof NextResponse) return access;

    const character = await loadSheetCharacter(characterId);

    if (!character || character.campaignId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isDM = access.campaign.members[0]?.role === "dm";

    const isOwner = character.controlledBy === access.userId;

    if (!isDM && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(await buildSheetFor(character, { isDM, isOwner }));
  } catch (error) {
    return handleApiError(error, { action: "fetch character sheet" });
  }
}
```

Тест мокає `buildSheetFor` у модулі `sheet-handler`, але `route.ts` імпортує `./sheet-handler` — Vitest резолвить обидва в один шлях, мок діє. Якщо ні — у тесті мокати `@/lib/utils/battle/participant` і `buildCharacterSheet` замість обробника.

- [ ] **Step 3: Клієнт і хук**

`lib/api/characters.ts`:

```ts
export const getCharacterSheet = (campaignId: string, characterId: string) => campaignGet<CharacterSheet>(campaignId, `/characters/${characterId}/sheet`);
```

`lib/hooks/characters/useCharacterSheet.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { getCharacterSheet } from "@/lib/api/characters";

export const characterSheetKey = (campaignId: string, characterId?: string) => (characterId ? ["character-sheet", campaignId, characterId] : ["character-sheet", campaignId]);

export function useCharacterSheet(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: characterSheetKey(campaignId, characterId),
    queryFn: () => getCharacterSheet(campaignId, characterId),
    staleTime: 60_000,
    enabled: !!campaignId && !!characterId,
  });
}
```

`index.ts`: `export { characterSheetKey, useCharacterSheet } from "./useCharacterSheet";`

- [ ] **Step 4: Перевірка** — `pnpm test:run app/api/__tests__/character-sheet-api.test.ts` → PASS; `pnpm exec tsc --noEmit && pnpm lint --fix`. Ручна перевірка: `pnpm dev`, увійти, відкрити `http://localhost:3000/api/campaigns/cmuvy29ix0001eyhew9cq07qf/characters/<id Ліри>/sheet` → JSON із `proficiency: 9`.

- [ ] **Step 5: Commit**

```bash
git add app/api lib/api lib/hooks
git commit -m "feat(characters): GET /sheet with owner/DM access and useCharacterSheet"
```

---

### Task 7: Цілі — `PUT /goals` і мутація

**Files:**
- Create: `app/api/campaigns/[id]/characters/[characterId]/goals/route.ts`
- Modify: `lib/api/characters.ts` (+ `putCharacterGoals`)
- Create: `lib/hooks/characters/useCharacterGoals.ts`; Modify: `index.ts`
- Test: `app/api/__tests__/character-goals-api.test.ts`

**Interfaces:**
- Consumes: `putGoalsSchema`, `parseGoals`, `mergePlayerGoals` (Task 1); `characterSheetKey` (Task 6)
- Produces: `putCharacterGoals(campaignId, characterId, goals: GoalInput[]): Promise<{ goals: CharacterGoal[] }>`; `useCharacterGoals(campaignId, characterId)` → `{ save(goals: GoalInput[]): Promise<void>, isPending }`

- [ ] **Step 1: Падаючий тест**

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn(), update: vi.fn() } } }));

const access = (userId: string, role: "dm" | "player") => ({ userId, campaign: { id: "camp", members: [{ userId, role }] } }) as never;

const DM_GOAL = { id: "d1", text: "Знайти брата", status: "active", author: "dm" };

const put = async (goals: unknown) => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/goals/route");

  return mod.PUT(new Request("http://x", { method: "PUT", body: JSON.stringify({ goals }) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("PUT goals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "camp", controlledBy: "owner", goals: [DM_GOAL] } as never);
    vi.mocked(prisma.character.update).mockImplementation(((args: { data: { goals: unknown } }) => Promise.resolve({ goals: args.data.goals })) as never);
  });

  it("гравець: ціль ДМа незмінна, author ставить сервер", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const res = await put([{ ...DM_GOAL, text: "Зламано", author: "player" }, { id: "p1", text: "Моя", status: "active", author: "dm" }]);

    expect(res.status).toBe(200);
    expect(await getResponseJson(res)).toEqual({ goals: [DM_GOAL, { id: "p1", text: "Моя", status: "active", author: "player" }] });
  });

  it("чужий гравець — 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("other", "player"));
    expect((await put([])).status).toBe(403);
  });

  it("ДМ пише все; без author — dm", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));

    const res = await put([{ id: "n", text: "Нова", status: "done" }]);

    expect(await getResponseJson(res)).toEqual({ goals: [{ id: "n", text: "Нова", status: "done", author: "dm" }] });
  });

  it("текст понад 300 символів — 400", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    expect((await put([{ id: "x", text: "a".repeat(301), status: "active" }])).status).toBe(400);
  });
});
```

Run → FAIL.

- [ ] **Step 2: Маршрут**

```ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { parseGoals, putGoalsSchema } from "@/lib/schemas/character-goals";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { mergePlayerGoals } from "@/lib/utils/characters/goals";
import type { CharacterGoal } from "@/types/characters";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const access = await requireCampaignAccess(id, false);

    if (access instanceof NextResponse) return access;

    const character = await prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true, controlledBy: true, goals: true } });

    if (!character || character.campaignId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isDM = access.campaign.members[0]?.role === "dm";

    if (!isDM && character.controlledBy !== access.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = putGoalsSchema.safeParse(await request.json());

    if (!parsed.success) return NextResponse.json({ error: "Invalid goals" }, { status: 400 });

    const goals: CharacterGoal[] = isDM
      ? parsed.data.goals.map((g) => ({ id: g.id, text: g.text, status: g.status, author: g.author ?? "dm" }))
      : mergePlayerGoals(parseGoals(character.goals), parsed.data.goals);

    const updated = await prisma.character.update({ where: { id: characterId }, data: { goals: goals as unknown as Prisma.InputJsonValue }, select: { goals: true } });

    return NextResponse.json({ goals: parseGoals(updated.goals) });
  } catch (error) {
    return handleApiError(error, { action: "update character goals" });
  }
}
```

Перевірити, що в `lib/api/client.ts` є PUT-хелпер; якщо немає — додати `campaignPut` поруч із `campaignPatch` (та сама форма, `method: "PUT"`).

- [ ] **Step 3: Клієнт і хук**

`lib/api/characters.ts`:

```ts
export const putCharacterGoals = (campaignId: string, characterId: string, goals: GoalInput[]) => campaignPut<{ goals: CharacterGoal[] }>(campaignId, `/characters/${characterId}/goals`, { goals });
```

`useCharacterGoals.ts`:

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { characterSheetKey } from "./useCharacterSheet";

import { putCharacterGoals } from "@/lib/api/characters";
import { useNotify } from "@/lib/hooks/common";
import type { GoalInput } from "@/lib/schemas/character-goals";
import type { CharacterSheet } from "@/types/characters";

export function useCharacterGoals(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const key = characterSheetKey(campaignId, characterId);

  const mutation = useMutation({
    mutationFn: (goals: GoalInput[]) => putCharacterGoals(campaignId, characterId, goals),
    onSuccess: ({ goals }) => queryClient.setQueryData<CharacterSheet>(key, (old) => (old ? { ...old, story: { ...old.story, goals } } : old)),
    onError: () => void notify("Не вдалося зберегти цілі"),
  });

  return { save: async (goals: GoalInput[]) => void (await mutation.mutateAsync(goals)), isPending: mutation.isPending };
}
```

(`useNotify` — перевірити сигнатуру в `lib/hooks/common`; якщо приймає об'єкт — передати `{ title: "…" }`.)

- [ ] **Step 4: Перевірка** — `pnpm test:run app/api/__tests__/character-goals-api.test.ts` → PASS; tsc + lint.

- [ ] **Step 5: Commit**

```bash
git add app/api lib
git commit -m "feat(characters): PUT /goals — player edits own goals, DM edits all"
```

---

### Task 8: Іконка раси, відмінок, зона дотику слота

**Files:**
- Modify: `lib/schemas/races.ts`, `types/races.ts`, `components/races/RaceEditFormUtils.ts`, `components/races/RaceFormFields.tsx`
- Modify: `types/progression.ts`, `app/api/campaigns/[id]/characters/[characterId]/progression/load-progression-context.ts`, `get-progression-handler.ts`
- Modify: `components/skill-tree/progression/RacialRow.tsx`, `OfferList.tsx`, `SlotButton.tsx`
- Create: `lib/utils/plural.ts`
- Test: `lib/utils/__tests__/plural.test.ts`, `components/skill-tree/__tests__/progression-polish.test.tsx`

**Interfaces:**
- Produces: `pluralUk(n: number, forms: [string, string, string]): string`; `CharacterProgressionDto.raceIcon: string | null`; `Race.icon?: string | null`; `RaceFormData.icon: string`

- [ ] **Step 1: Падаючі тести**

`lib/utils/__tests__/plural.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { pluralUk } from "@/lib/utils/plural";

const f: [string, string, string] = ["варіант", "варіанти", "варіантів"];

describe("pluralUk", () => {
  it.each([[1, "варіант"], [2, "варіанти"], [4, "варіанти"], [5, "варіантів"], [11, "варіантів"], [12, "варіантів"], [21, "варіант"], [22, "варіанти"], [0, "варіантів"]])("%i → %s", (n, w) => {
    expect(pluralUk(n, f)).toBe(w);
  });
});
```

`components/skill-tree/__tests__/progression-polish.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SlotButton } from "@/components/skill-tree/progression/SlotButton";

describe("SlotButton", () => {
  it("має розширену зону дотику (≥44 px через псевдоелемент)", () => {
    render(<SlotButton state={{ state: "available", nodeId: "n" } as never} label="Удар" icon={null} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Вивчити: Удар" }).className).toMatch(/after:-inset-1/);
  });
});
```

Run → FAIL.

- [ ] **Step 2: Реалізація**

`lib/utils/plural.ts`:

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

`SlotButton.tsx`: до `className` кнопки додати `relative after:absolute after:-inset-1 after:content-['']` (видимий розмір той самий; зона = слот + 4 px з кожного боку, 42 → 50 px; сусіди в `BranchRow` мають `gap-2` = 8 px, тож зони не перекриваються).

`RacialRow.tsx`, голова рядка:

```tsx
<span className="branch-frame hud-sc text-lg">
  {dto.raceIcon ? <OptimizedImage src={dto.raceIcon} alt="" width={52} height={52} className="h-full w-full object-cover" fallback={<span>{dto.race[0] ?? "?"}</span>} /> : (dto.race[0] ?? "?")}
</span>
```

`types/progression.ts`: `raceIcon: string | null;` у `CharacterProgressionDto`.
`load-progression-context.ts`: паралельно з `skillTree.findFirst` — `prisma.race.findFirst({ where: { campaignId, name: character.race }, select: { icon: true } })`, повернути `raceIcon` у контексті; `get-progression-handler.ts` кладе `raceIcon` у DTO. Оновити мок `prisma` у `app/api/__tests__/progression-actions-api.test.ts` та тестах GET прогресії (`race: { findFirst: vi.fn().mockResolvedValue(null) }`) і фікстури DTO в `lib/hooks/skills/__tests__/*` (`raceIcon: null`).

Раса: `lib/schemas/races.ts` — `icon: z.string().max(2000).nullable().optional()` у create/update; `types/races.ts` — `icon?: string | null` у `Race`, `icon: string` у `RaceFormData`; `getInitialRaceFormData` — `icon: (race as { icon?: string | null }).icon ?? ""`; `CreateRaceDialog` дефолт `icon: ""`; `RaceFormFields.tsx` — після назви:

```tsx
<ImageUpload value={formData.icon} onChange={(v) => setFormData((prev) => ({ ...prev, icon: v }))} label="Іконка раси" placeholder="URL зображення або завантажте файл з комп’ютера" previewAlt="Іконка раси" />
```

При збереженні `icon: formData.icon || null` (у `RaceEditForm` `dataToSave` і в `CreateRaceDialog`). Маршрути рас пишуть `data` через spread — перевірити, що `icon` доходить до `prisma.race.update/create`.

- [ ] **Step 3: Перевірка** — `pnpm test:run lib/utils components/skill-tree components/races app/api lib/hooks/skills` → PASS; tsc + lint. Локально: у редакторі раси «Ельф» завантажити іконку ельфів HoMM V (файл з тих, що вже в Storage для дерева ельфів).

- [ ] **Step 4: Commit**

```bash
git add lib components types app/api
git commit -m "feat(races): race icon in editor and progression row; plural offers label; 44px slot hit area"
```

---

### Task 9: Книга заклинань — спільні сторінки

**Files:**
- Create: `lib/utils/spells/group-by-level.ts`, `components/battle/wizards/SpellBookPages.tsx`
- Modify: `components/battle/wizards/SpellBook.tsx`, `lib/hooks/battle/useSpellBook.ts`
- Create: `lib/hooks/characters/useSpellBrowser.ts`; Modify: `index.ts`
- Create: `components/character-profile/ProfileSpellBook.tsx`
- Test: `components/character-profile/__tests__/profile-spell-book.test.tsx`; наявний `components/battle/wizards/__tests__/spell-book.test.tsx` має лишитися зеленим

**Interfaces:**
- Consumes: `BookSpell` (`types/spells.ts`, Task 5)
- Produces:
  - `SpellBookPages({ byLevel, slotOf, level, selected, pickedId, wide, showDetail, onLevel, onPick, detail }: SpellBookPagesProps)` де `detail: ReactNode` — вміст правої/деталь-сторінки;
  - `SpellDetail({ spell, children }: { spell: BookSpell; children?: ReactNode })` — шапка, опис, сітка 2×2;
  - `groupSpellsByLevel(spells: BookSpell[]): Record<number, BookSpell[]>`;
  - `useSpellBrowser(spells: BookSpell[], slots: { level: number; count: number }[])` → `{ open, setOpen, level, setLevel, selected, pick, back, byLevel, slotOf }`;
  - `ProfileSpellBook({ spells, slots, open, onOpenChange })`.

- [ ] **Step 1: Падаючий тест**

```tsx
// @vitest-environment happy-dom
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

import { ProfileSpellBook } from "@/components/character-profile/ProfileSpellBook";
import type { BookSpell } from "@/types/spells";

const spells: BookSpell[] = [
  { id: "m", name: "Мітка мисливця", level: 1, type: "target", damageType: "damage", diceCount: 1, diceType: "d6", concentration: true },
  { id: "c", name: "Туманна хмара", level: 1, type: "aoe", damageType: "all" },
];

function Harness() {
  const [open, setOpen] = useState(true);

  return <ProfileSpellBook spells={spells} slots={[{ level: 1, count: 4 }]} open={open} onOpenChange={setOpen} />;
}

describe("ProfileSpellBook", () => {
  it("відкривається на першому колі зі слотами, показує деталь без дій бою", () => {
    mockMatchMedia(true);
    render(<Harness />);

    expect(screen.getByRole("button", { name: /I коло, слотів 4/ })).toBeTruthy();
    fireEvent.click(screen.getByText("Мітка мисливця"));
    expect(screen.getAllByText("Мітка мисливця").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Обрати цілі/ })).toBeNull();
  });
});
```

Run → FAIL.

- [ ] **Step 2: Винести сторінки**

`lib/utils/spells/group-by-level.ts`:

```ts
import type { BookSpell } from "@/types/spells";

export function groupSpellsByLevel(spells: BookSpell[]): Record<number, BookSpell[]> {
  const map: Record<number, BookSpell[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };

  for (const s of spells) (map[s.level] ??= []).push(s);

  for (const list of Object.values(map)) list.sort((a, b) => a.name.localeCompare(b.name, "uk"));

  return map;
}
```

`SpellBookPages.tsx` — перенести з `SpellBook.tsx` без зміни розмітки/класів: константи `LEVELS`, `CIRCLE`, `METAL`, стрічки (`ribbons`), `listPage`, верхню частину кроку `"spell"` (шапка, опис, сітка 2×2) як `SpellDetail`, і обгортку сторінки:

```tsx
"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";

import { metalClass } from "@/components/battle/hud";
import { cn } from "@/lib/utils";
import { ROMAN, spellTier } from "@/lib/utils/battle/view";
import type { BookSpell } from "@/types/spells";

export const LEVELS = [0, 1, 2, 3, 4, 5] as const;

export const CIRCLE = ["Замовляння", "Перше коло", "Друге коло", "Третє коло", "Четверте коло", "П'яте коло"];

const METAL = ["залізне", "бронзове", "срібне", "золоте", "міфрилове", "платинове"];

export interface SpellBookPagesProps {
  byLevel: Record<number, BookSpell[]>;
  slotOf: (level: number) => number;
  level: number;
  pickedId: string | null;
  wide: boolean;
  showDetail: boolean;
  onLevel: (level: number) => void;
  onPick: (spell: BookSpell) => void;
  detail: ReactNode;
}

export function SpellBookPages({ byLevel, slotOf, level, pickedId, wide, showDetail, onLevel, onPick, detail }: SpellBookPagesProps) {
  return (
    <div className="relative pr-11">
      <div className="absolute right-1.5 top-6 z-10 flex flex-col gap-1.5">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            aria-label={`${ROMAN[l]} коло, слотів ${l === 0 ? "∞" : slotOf(l)}`}
            onClick={() => onLevel(l)}
            className={cn("hud-sc flex h-14 flex-col items-center justify-center gap-1 pb-1.5 text-[13px] [clip-path:polygon(0_0,100%_0,100%_100%,50%_86%,0_100%)]", metalClass(spellTier(l)), "metal-fill", level === l ? "-ml-2 w-10" : "w-8", l > 0 && slotOf(l) === 0 && "opacity-55 grayscale")}
          >
            {ROMAN[l]}
            <span className="font-sans text-[11px] opacity-85">{l === 0 ? "∞" : slotOf(l)}</span>
          </button>
        ))}
      </div>
      <div className={cn("hud-book relative min-h-[70dvh] bg-[#e9dec5] shadow-[inset_14px_0_18px_-10px_rgba(60,40,20,.55)]", wide && "grid grid-cols-2")}>
        {(wide || !showDetail) && (
          <div className="px-5 pb-12 pt-4">
            <div className="text-[13px] italic text-[#7a6650]">Книга заклинань</div>
            <div className="hud-sc flex items-center gap-3 text-2xl font-bold leading-8">
              {CIRCLE[level]}
              <span className="font-sans text-[13px] font-normal italic tracking-normal text-[#6d7177]">{METAL[level]} коло</span>
            </div>
            <div className="my-1 h-px bg-[#2a2018]/35" />
            {(byLevel[level] ?? []).length === 0 && <p className="py-6 text-center italic text-[#7a6650]">На цьому колі заклинань немає</p>}
            {(byLevel[level] ?? []).map((s) => (
              <button key={s.id} type="button" onClick={() => onPick(s)} className={cn("flex h-[72px] w-full items-center gap-3 border-b border-[#2a2018]/15 text-left", pickedId === s.id && "-mx-3 w-[calc(100%+1.5rem)] bg-[#9c2a1d]/10 px-3 shadow-[inset_3px_0_0_#9c2a1d]")}>
                <span className="flex size-10 shrink-0 items-center justify-center border border-[#2a2018] bg-[#2a2018]/5">
                  {s.icon ? <Image src={s.icon} alt="" width={26} height={26} className="size-[26px] object-contain" /> : <Sparkles className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="hud-sc block truncate text-[17px] font-bold">{s.name}</span>
                  <span className="block truncate text-sm italic text-[#6b5a45]">{[s.savingThrow && `рятівний кидок ${s.savingThrow.ability}`, s.hitCheck && "атака заклинанням", s.range].filter(Boolean).join(" · ")}</span>
                </span>
                {s.diceCount && s.diceType && <span className="w-11 text-right text-[15px] text-[#7a2a1f]">{s.diceCount}{s.diceType}</span>}
              </button>
            ))}
          </div>
        )}
        {(wide || showDetail) && (detail ?? (wide && <div className="flex items-center justify-center italic text-[#7a6650]">Оберіть заклинання</div>))}
      </div>
    </div>
  );
}

export function SpellDetail({ spell, children }: { spell: BookSpell; children?: ReactNode }) {
  return (
    <div className="relative flex h-full flex-col px-5 pb-5 pt-6">
      <div className="flex items-center gap-4">
        <span className="flex size-16 items-center justify-center border border-[#2a2018] bg-[#7a2a1f]/10 text-[#7a2a1f]">
          {spell.icon ? <Image src={spell.icon} alt="" width={44} height={44} /> : <Sparkles className="size-10" />}
        </span>
        <div>
          <div className="hud-sc text-[26px] font-bold leading-[30px]">{spell.name}</div>
          <div className="text-sm italic text-[#7a6650]">{spell.spellGroup?.name ?? "Без школи"} · {CIRCLE[spell.level].toLowerCase()}{spell.concentration ? " · концентрація" : ""}</div>
        </div>
      </div>
      {spell.description && <p className="mt-4 text-[17px] leading-6 first-letter:float-left first-letter:pr-1.5 first-letter:pt-1 first-letter:font-[family-name:var(--font-hud-sc)] first-letter:text-[52px] first-letter:leading-[44px] first-letter:text-[#7a2a1f]">{spell.description}</p>}
      <div className="mt-4 grid grid-cols-2 border-t border-[#2a2018]/25">
        {[["Шкода", spell.diceCount && spell.diceType ? `${spell.diceCount}${spell.diceType} ${spell.damageElement ?? ""}` : "—"], ["Дальність", spell.range ?? "—"], ["Влучання", spell.hitCheck ? "атака заклинанням" : spell.savingThrow ? `рятівний ${spell.savingThrow.ability}` : "автоматично"], ["Тривалість", spell.duration ?? "миттєво"]].map(([a, b]) => (
          <div key={a} className="flex h-12 flex-col justify-center border-b border-[#2a2018]/15 odd:border-r odd:pr-3 even:pl-3">
            <span className="text-xs italic text-[#7a6650]">{a}</span>
            <span className="text-base">{b}</span>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
```

`SpellBook.tsx`: замінити `ribbons`/`listPage`/шапку кроку `"spell"` на `SpellBookPages` і `SpellDetail`; крок `"spell"` = `<SpellDetail spell={selected}><button … seal mt-auto>Обрати цілі</button></SpellDetail>`; кроки `targets`/`rolls`/`summary` лишаються як є, обгорнуті в той самий `<div className="relative flex h-full flex-col px-5 pb-5 pt-6">`. `useSpellBook` використовує `groupSpellsByLevel` замість власного `byLevel`-обчислення.

- [ ] **Step 3: Хук і шторка профілю**

`lib/hooks/characters/useSpellBrowser.ts`:

```ts
"use client";

import { useMemo, useState } from "react";

import { groupSpellsByLevel } from "@/lib/utils/spells/group-by-level";
import type { BookSpell } from "@/types/spells";

export function useSpellBrowser(spells: BookSpell[], slots: { level: number; count: number }[]) {
  const byLevel = useMemo(() => groupSpellsByLevel(spells), [spells]);

  const first = [1, 2, 3, 4, 5, 0].find((l) => (byLevel[l] ?? []).length > 0) ?? 0;

  const [level, setLevel] = useState(first);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = spells.find((s) => s.id === selectedId) ?? null;

  return {
    byLevel,
    level,
    selected,
    slotOf: (l: number) => (l === 0 ? Infinity : (slots.find((s) => s.level === l)?.count ?? 0)),
    setLevel: (l: number) => { setLevel(l); setSelectedId(null); },
    pick: (s: BookSpell) => setSelectedId(s.id),
    back: () => setSelectedId(null),
  };
}
```



`components/character-profile/ProfileSpellBook.tsx`:

```tsx
"use client";

import { HUD_SURFACE } from "@/components/battle/hud";
import { SpellBookPages, SpellDetail } from "@/components/battle/wizards/SpellBookPages";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useSpellBrowser } from "@/lib/hooks/characters";
import { useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { BookSpell } from "@/types/spells";

export function ProfileSpellBook({ spells, slots, open, onOpenChange }: { spells: BookSpell[]; slots: { level: number; count: number }[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const book = useSpellBrowser(spells, slots);

  const wide = useMediaQuery("(min-width: 1024px)");

  const showDetail = !!book.selected;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={showDetail && !wide ? "← До списку" : "Книга заклинань"} size="lg" className={cn(HUD_SURFACE, "max-w-[980px] border-none bg-[#3a2016] p-2.5 text-[#2a2018] shadow-[0_30px_80px_rgba(0,0,0,.9),inset_0_0_0_2px_#2a160f]")}>
      <SpellBookPages byLevel={book.byLevel} slotOf={book.slotOf} level={book.level} pickedId={book.selected?.id ?? null} wide={wide} showDetail={showDetail} onLevel={book.setLevel} onPick={book.pick} detail={book.selected && <SpellDetail spell={book.selected} />} />
      {showDetail && !wide && <button type="button" onClick={book.back} className="hud-sc mt-2 h-10 w-full text-sm text-[#e6dccb]">← Назад</button>}
    </ResponsiveDialog>
  );
}
```

- [ ] **Step 4: Перевірка** — `pnpm test:run components/battle components/character-profile lib/hooks/battle` → PASS; tsc + lint.

- [ ] **Step 5: Commit**

```bash
git add components lib
git commit -m "refactor(spellbook): share book pages between battle and profile; read-only profile spellbook"
```

---

### Task 10: Каркас профілю — hero, таби, режим перегляду «Бій»

**Files:**
- Create: `components/character-profile/{CharacterProfile,ProfileContext,ProfileHero,ProfileTabs,CombatTab,Breakdown,index}.tsx|ts`
- Test: `components/character-profile/__tests__/profile-view.test.tsx`
- Test fixture: `components/character-profile/__tests__/sheet-fixture.ts`

**Interfaces:**
- Consumes: `CharacterSheet` (Task 5), `useCharacterSheet` (Task 6)
- Produces:
  - `ProfileContext` = `{ campaignId: string; characterId: string; sheet: CharacterSheet; canEdit: boolean }`; `useProfile()`;
  - `CharacterProfile({ campaignId, characterId, canEdit }: { campaignId: string; characterId: string; canEdit: boolean })`;
  - `ProfileTabs({ tabs, value, onValueChange }: { tabs: { id: ProfileTabId; label: string; content: ReactNode }[]; value: ProfileTabId; onValueChange: (id: ProfileTabId) => void })`;
  - `type ProfileTabId = "basic" | "combat" | "skills" | "magic" | "items" | "story"`;
  - `Breakdown({ total, lines, open })` — розкладка під рядком;
  - `ProfileHero({ actions }: { actions?: ReactNode })`.

- [ ] **Step 1: Фікстура й падаючий тест**

`sheet-fixture.ts` — повний `CharacterSheet` Ліри (усі поля з Task 5; 2 атаки, слоти `[{level:1,count:4},{level:2,count:2}]`, одне заклинання, артефакт у `grid.armor`, сет 2/3, `story` з біографією `"Мати ==загинула== давно"` і двома цілями (ДМа і гравця), `viewer: { isDM: false, isOwner: true }`), експорт `export const sheetFixture: CharacterSheet` і `export const withSheet = (over: Partial<CharacterSheet>) => ({ ...sheetFixture, ...over })`.

`profile-view.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sheetFixture, withSheet } from "./sheet-fixture";

const replace = vi.fn();

let search = new URLSearchParams();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/c/1/character", useSearchParams: () => search }));
vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/components/skill-tree/progression", () => ({ ProgressionPanel: () => <div>прокачка</div>, LevelUpOverlay: () => null, FreePointBadge: () => null }));

const sheetQuery = { data: sheetFixture, isPending: false, error: null } as { data: unknown; isPending: boolean; error: unknown };

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useCharacterSheet: () => sheetQuery }));

import { CharacterProfile } from "@/components/character-profile";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

describe("CharacterProfile — перегляд", () => {
  beforeEach(() => {
    search = new URLSearchParams();
    sheetQuery.data = sheetFixture;
  });

  it("hero: імʼя, HP, AC, Влуч, Майст", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);

    expect(screen.getByRole("heading", { name: "Ліра" })).toBeTruthy();
    expect(screen.getByText(`HP ${sheetFixture.hp.total}`)).toBeTruthy();
    expect(screen.getByLabelText("AC")).toHaveTextContent(String(sheetFixture.armorClass.total));
    expect(screen.getByLabelText("Влучання")).toHaveTextContent("+13");
  });

  it("таба з URL; перемикання пише ?tab=", () => {
    search = new URLSearchParams("tab=magic");
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);

    expect(screen.getByRole("tab", { name: "Магія" })).toHaveAttribute("data-state", "active");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Речі" }));
    expect(replace).toHaveBeenCalledWith("/c/1/character?tab=items", { scroll: false });
  });

  it("атака: влучання і середня шкода, розкладка за тапом", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);

    const row = screen.getByRole("button", { name: /Довгий лук/ });

    expect(row).toHaveTextContent("+13");
    expect(row).toHaveTextContent("≈");
    fireEvent.click(row);
    expect(screen.getByText("Майстерність")).toBeTruthy();
  });

  it("без атак — порожній стан і «—» у чипі", () => {
    sheetQuery.data = withSheet({ attacks: [], bestToHit: null });
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);

    expect(screen.getByText("Немає зброї — атак поки немає")).toBeTruthy();
    expect(screen.getByLabelText("Влучання")).toHaveTextContent("—");
  });

  it("гравець не бачить «Редагувати»", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);
    expect(screen.queryByRole("button", { name: "Редагувати" })).toBeNull();
  });
});
```

(`renderWithConfirm` — перевірити фактичну назву експорту в `components/ui/__tests__/render-with-confirm.tsx`, а також обгорнути в `QueryClientProvider`, якщо хелпер цього не робить.)

Run → FAIL.

- [ ] **Step 2: Контекст, таби, розкладка**

`ProfileContext.tsx`:

```tsx
"use client";

import { createContext, useContext } from "react";

import type { CharacterSheet } from "@/types/characters";

export interface ProfileContextValue {
  campaignId: string;
  characterId: string;
  sheet: CharacterSheet;
  canEdit: boolean;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);

  if (!ctx) throw new Error("useProfile поза ProfileContext");

  return ctx;
}
```

`ProfileTabs.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ProfileTabId = "basic" | "combat" | "skills" | "magic" | "items" | "story";

export interface ProfileTab {
  id: ProfileTabId;
  label: string;
  content: ReactNode;
}

export function ProfileTabs({ tabs, value, onValueChange }: { tabs: ProfileTab[]; value: ProfileTabId; onValueChange: (id: ProfileTabId) => void }) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as ProfileTabId)}>
      <TabsList className="sticky top-[52px] z-20 flex h-auto w-full gap-1 rounded-none border-b border-[#3a2e22] bg-[#110e0b]/95 p-1.5 backdrop-blur">
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="hud-sc min-w-0 flex-1 rounded-md px-1 py-2 text-[13px] text-[#8f8473] data-[state=active]:metal-gold data-[state=active]:metal-fill data-[state=active]:font-bold data-[state=active]:shadow-none">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.id} value={t.id} className="mt-0 px-4 py-3">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

(Tailwind `data-[state=active]:metal-gold` не працює для довільних класів; замість цього в `components/hud/hud.css` додати
`.profile-tab[data-state="active"] { background: linear-gradient(135deg, #8a6414, #e6c25a 55%, #8a6414); color: #2a1d05; font-weight: 700; }`
і давати тригеру клас `profile-tab`.)

`Breakdown.tsx`:

```tsx
import type { SheetLine } from "@/types/characters";

export function Breakdown({ lines }: { lines: SheetLine[] }) {
  return (
    <ul className="mt-2 space-y-0.5 border-t border-[#3a2e22] pt-2 text-xs text-[#b8ab95]">
      {lines.map((l, i) => (
        <li key={i} className="flex justify-between gap-3">
          <span className="min-w-0 truncate">{l.label}</span>
          {l.value && <span className="shrink-0 tabular-nums text-[#efe5d2]">{l.value}</span>}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Hero**

`ProfileHero.tsx`:

```tsx
"use client";

import { type ReactNode, useState } from "react";

import { Breakdown } from "./Breakdown";
import { useProfile } from "./ProfileContext";

import { OptimizedImage } from "@/components/common/OptimizedImage";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

function Chip({ label, short, value }: { label: string; short: string; value: string }) {
  return (
    <div aria-label={label} className="min-w-0 flex-1 rounded-lg border border-[#4a3c2c] bg-[#1c1610] px-1 py-1 text-center">
      <b className="block text-lg leading-6 text-[#efe5d2]">{value}</b>
      <span className="text-[10px] uppercase text-[#8f8473]">{short}</span>
    </div>
  );
}

export function ProfileHero({ actions }: { actions?: ReactNode }) {
  const { sheet } = useProfile();

  const [hpOpen, setHpOpen] = useState(false);

  const id = sheet.identity;

  return (
    <header className="px-4 pt-4 pb-3">
      <div className="flex items-center gap-3">
        <div className="size-14 shrink-0 overflow-hidden rounded-full border-2 border-[#c9b37a] bg-[#2a2016]">
          {id.avatar ? <OptimizedImage src={id.avatar} alt="" width={56} height={56} className="size-full object-cover" /> : <span className="hud-sc flex size-full items-center justify-center text-2xl">{id.name[0]}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="hud-sc truncate text-xl leading-7 text-[#efe5d2]">{id.name}</h1>
          <p className="flex items-center gap-1.5 truncate text-xs text-[#8f8473]">
            {id.level} рів. · {id.className}{id.subclass ? ` (${id.subclass})` : ""} ·
            {id.raceIcon && <OptimizedImage src={id.raceIcon} alt="" width={14} height={14} className="size-3.5 rounded-sm" />}
            {id.race}{id.alignment ? ` · ${id.alignment}` : ""}
          </p>
          <button type="button" onClick={() => setHpOpen((v) => !v)} className="mt-1 text-sm text-[#e6dccb] underline-offset-2 hover:underline">
            HP {sheet.hp.total}
          </button>
        </div>
        {actions}
      </div>
      {hpOpen && <Breakdown lines={sheet.hp.lines} />}
      <div className="mt-3 flex gap-1.5">
        <Chip label="AC" short="AC" value={String(sheet.armorClass.total)} />
        <Chip label="Ініціатива" short="Ініц" value={signed(sheet.initiative)} />
        <Chip label="Швидкість" short="Швидк" value={String(sheet.speed)} />
        <Chip label="Влучання" short="Влуч" value={sheet.bestToHit === null ? "—" : signed(sheet.bestToHit)} />
        <Chip label="Майстерність" short="Майст" value={signed(sheet.proficiency)} />
      </div>
    </header>
  );
}
```

Sticky-стиснення (spec §4.2): обгортка hero в `CharacterProfile` має окремий рядок `sticky top-0 z-30 h-[52px]` («Ліра · 30 · HP · AC · Влуч»), що з'являється, коли `IntersectionObserver` повідомляє, що повний hero пішов з екрана (`useInView` — перевірити наявність у `lib/hooks/common`; якщо немає — локальний `useEffect` з `IntersectionObserver` у `CharacterProfile`, з try/catch для середовищ без IO).

- [ ] **Step 4: «Бій»**

`CombatTab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Crosshair, Swords } from "lucide-react";

import { Breakdown } from "./Breakdown";
import { useProfile } from "./ProfileContext";

import { EmptyState } from "@/components/common/states";
import { cn } from "@/lib/utils";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

const SHORT: Record<string, string> = { strength: "СИЛ", dexterity: "СПР", constitution: "ТІЛ", intelligence: "ІНТ", wisdom: "МУД", charisma: "ХАР" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 first:mt-0">
      <h2 className="hud-sc mb-1.5 text-[13px] tracking-[.06em] text-[#c9b37a]">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, lines }: { label: string; value: string; lines?: import("@/types/characters").SheetLine[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#2a2218] py-1.5 text-sm">
      <button type="button" disabled={!lines?.length} onClick={() => setOpen((v) => !v)} className="flex w-full justify-between gap-3 text-left disabled:cursor-default">
        <span>{label}</span>
        <span className="tabular-nums text-[#efe5d2]">{value}</span>
      </button>
      {open && lines && <Breakdown lines={lines} />}
    </div>
  );
}

export function CombatTab() {
  const { sheet } = useProfile();

  const [openAttack, setOpenAttack] = useState<string | null>(null);

  return (
    <>
      <Section title="ХАРАКТЕРИСТИКИ">
        <div className="grid grid-cols-6 gap-1">
          {sheet.abilities.map((a) => (
            <div key={a.key} className={cn("rounded-lg border bg-[#1a140f] py-1 text-center", a.isPrimary ? "border-[#c9b37a] shadow-[inset_0_0_0_1px_#c9b37a]" : "border-[#4a3c2c]")}>
              <small className="block text-[10px] text-[#8f8473]">{SHORT[a.key]}{a.isPrimary ? " ★" : ""}</small>
              <b className="block text-[17px] leading-5">{a.score}</b>
              <small className={cn("text-[11px]", a.isPrimary ? "text-[#c9b37a]" : "text-[#8f8473]")}>{signed(a.mod)}</small>
            </div>
          ))}
        </div>
      </Section>
      <Section title="АТАКИ">
        {sheet.attacks.length === 0 ? (
          <EmptyState title="Немає зброї — атак поки немає" />
        ) : (
          sheet.attacks.map((a) => (
            <div key={a.id} className="mb-1.5 rounded-[10px] border border-[#4a3c2c] bg-[#1a140f] px-2.5 py-2">
              <button type="button" onClick={() => setOpenAttack((v) => (v === a.id ? null : a.id))} className="flex w-full items-center justify-between gap-2 text-left">
                <span className="flex min-w-0 items-center gap-1.5 truncate">{a.kind === "ranged" ? <Crosshair className="size-4 shrink-0" /> : <Swords className="size-4 shrink-0" />}{a.name}</span>
                <span className="shrink-0 whitespace-nowrap text-sm text-[#8f8473]">
                  <b className="text-lg text-[#efe5d2]">{signed(a.toHit.total)}</b> влуч · <b className="text-lg text-[#efe5d2]">≈{a.avgDamage.total}</b> шкода
                </span>
              </button>
              {openAttack === a.id && (
                <>
                  <Breakdown lines={a.toHit.lines} />
                  <Breakdown lines={a.avgDamage.lines} />
                </>
              )}
            </div>
          ))
        )}
      </Section>
      <Section title="ЗАХИСТ І ПАРАМЕТРИ">
        <Row label="AC" value={String(sheet.armorClass.total)} lines={sheet.armorClass.lines} />
        <Row label="Ініціатива" value={signed(sheet.initiative)} />
        <Row label="Швидкість" value={String(sheet.speed)} />
        <Row label="Мораль" value={signed(sheet.morale)} />
        <Row label="Цілей за атаку" value={sheet.targets.min === sheet.targets.max ? String(sheet.targets.max) : `${sheet.targets.min}–${sheet.targets.max}`} />
        {sheet.immunities.length > 0 && <Row label="Імунітети" value={sheet.immunities.join(", ")} />}
      </Section>
      <Section title="РЯТІВНІ КИДКИ">
        <ul className="grid grid-cols-2 gap-x-4 text-sm">
          {sheet.saves.map((s) => (
            <li key={s.key} className="flex justify-between border-b border-[#2a2218] py-1"><span>{s.proficient ? "● " : ""}{s.label}</span><span className="tabular-nums">{signed(s.bonus)}</span></li>
          ))}
        </ul>
      </Section>
      <Section title="НАВИЧКИ">
        <ul className="grid grid-cols-2 gap-x-4 text-sm">
          {sheet.skills.map((s) => (
            <li key={s.key} className="flex justify-between gap-2 border-b border-[#2a2218] py-1"><span className="min-w-0 truncate">{s.proficient ? "● " : ""}{s.label}</span><span className="tabular-nums">{signed(s.bonus)}</span></li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[#8f8473]">Пасивні: сприйняття {sheet.passives.perception} · розслідування {sheet.passives.investigation} · проникливість {sheet.passives.insight}</p>
        {(sheet.languages.length > 0 || sheet.proficiencies.length > 0) && <p className="mt-1 text-xs text-[#8f8473]">{[sheet.languages.length ? `Мови: ${sheet.languages.join(", ")}` : null, sheet.proficiencies.length ? `Володіння: ${sheet.proficiencies.join(", ")}` : null].filter(Boolean).join(" · ")}</p>}
      </Section>
    </>
  );
}
```

(`EmptyState` — перевірити пропси в `components/common/states`; якщо `title` має іншу назву — підставити.)

- [ ] **Step 5: `CharacterProfile`** (перегляд; таби «Вміння/Магія/Речі/Історія» тимчасово — `null`-контент, заповнюються в Task 11–12)

```tsx
"use client";

import "@/components/hud/hud.css";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CombatTab } from "./CombatTab";
import { ProfileContext } from "./ProfileContext";
import { ProfileHero } from "./ProfileHero";
import { type ProfileTab, type ProfileTabId, ProfileTabs } from "./ProfileTabs";

import { HUD_SURFACE } from "@/components/battle/hud";
import { QueryState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useCharacterSheet } from "@/lib/hooks/characters";
import { cn } from "@/lib/utils";

const VIEW_TABS: ProfileTabId[] = ["combat", "skills", "magic", "items", "story"];

export function CharacterProfile({ campaignId, characterId, canEdit }: { campaignId: string; characterId: string; canEdit: boolean }) {
  const query = useCharacterSheet(campaignId, characterId);

  const router = useRouter();

  const pathname = usePathname();

  const params = useSearchParams();

  const fromUrl = params.get("tab") as ProfileTabId | null;

  const tab: ProfileTabId = fromUrl && VIEW_TABS.includes(fromUrl) ? fromUrl : "combat";

  const [editing, setEditing] = useState(false);

  const setTab = (id: ProfileTabId) => {
    const next = new URLSearchParams(params.toString());

    next.set("tab", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <QueryState query={query}>
      {(sheet) => (
        <ProfileContext.Provider value={{ campaignId, characterId, sheet, canEdit }}>
          <div className={cn(HUD_SURFACE, "mx-auto min-h-dvh max-w-3xl bg-[radial-gradient(120%_60%_at_50%_0%,#2a221a,#110e0b_70%)]")}>
            {editing ? null : (
              <>
                <ProfileHero actions={canEdit ? <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>Редагувати</Button> : null} />
                <ProfileTabs value={tab} onValueChange={setTab} tabs={viewTabs()} />
              </>
            )}
          </div>
        </ProfileContext.Provider>
      )}
    </QueryState>
  );
}

function viewTabs(): ProfileTab[] {
  return [
    { id: "combat", label: "Бій", content: <CombatTab /> },
    { id: "skills", label: "Вміння", content: null },
    { id: "magic", label: "Магія", content: null },
    { id: "items", label: "Речі", content: null },
    { id: "story", label: "Історія", content: null },
  ];
}
```

(`QueryState` — перевірити сигнатуру children-render-prop у `components/common/states`; у DM-сторінці вона вже так використовується.)

`index.ts`: `export { CharacterProfile } from "./CharacterProfile";`

- [ ] **Step 6: Перевірка** — `pnpm test:run components/character-profile` → PASS; tsc + lint.

- [ ] **Step 7: Commit**

```bash
git add components
git commit -m "feat(profile): HUD profile shell — hero chips, tabs in URL, combat tab with to-hit and average damage"
```

---

### Task 11: Таби «Вміння», «Магія», «Речі»

**Files:**
- Create: `components/character-profile/{SkillsTab,MagicTab,ItemsTab,ArtifactSheet}.tsx`
- Modify: `components/character-profile/CharacterProfile.tsx` (`viewTabs`)
- Test: `components/character-profile/__tests__/profile-tabs.test.tsx`

**Interfaces:**
- Consumes: `useProfile`, `ProfileSpellBook` (Task 9), `ProgressionPanel`, `ARTIFACT_GRID_9`, `metalClass`, `spellTier`, `ROMAN`
- Produces: `SkillsTab({ manage }: { manage?: boolean })`, `MagicTab()`, `ItemsTab()`

- [ ] **Step 1: Падаючий тест**

```tsx
// @vitest-environment happy-dom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { sheetFixture, withSheet } from "./sheet-fixture";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/p", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/components/skill-tree/progression", () => ({ ProgressionPanel: () => <div>прокачка</div> }));

import { ItemsTab, MagicTab, SkillsTab } from "@/components/character-profile";
import { ProfileContext } from "@/components/character-profile/ProfileContext";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet } from "@/types/characters";

const inProfile = (ui: React.ReactNode, sheet: CharacterSheet = sheetFixture) =>
  renderWithConfirm(<ProfileContext.Provider value={{ campaignId: "c", characterId: "ch", sheet, canEdit: false }}>{ui}</ProfileContext.Provider>);

describe("таби профілю", () => {
  it("Магія: слоти «I · 4», кнопка книги відкриває шторку", () => {
    inProfile(<MagicTab />);

    expect(screen.getByLabelText("I коло: 4 слоти")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Книга заклинань" }));
    expect(screen.getAllByText("Книга заклинань").length).toBeGreaterThan(1);
  });

  it("Магія без заклинань і слотів — порожній стан", () => {
    inProfile(<MagicTab />, withSheet({ magic: null, slots: [], spells: [] }));

    expect(screen.getByText("Магії поки немає")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Книга заклинань" })).toBeNull();
  });

  it("Речі: список по артефактах з ефектами і сетом have/total; тап — шторка", () => {
    inProfile(<ItemsTab />);

    const a = sheetFixture.items.artifacts[0];

    expect(screen.getByText(a.effects[0])).toBeTruthy();
    expect(screen.getByText(/2\/3/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: new RegExp(a.name) })[0]);
    expect(screen.getByRole("dialog")).toHaveAccessibleName(a.name);
  });

  it("Вміння: персональне вміння і прокачка", () => {
    inProfile(<SkillsTab />, withSheet({ personalSkill: { id: "s", name: "Око яструба", icon: null, description: "Бачить далеко" } }));

    expect(screen.getByText("Око яструба")).toBeTruthy();
    expect(screen.getByText("прокачка")).toBeTruthy();
  });
});
```

Run → FAIL.

- [ ] **Step 2: Реалізація**

`SkillsTab.tsx`:

```tsx
"use client";

import { useProfile } from "./ProfileContext";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { ProgressionPanel } from "@/components/skill-tree/progression";

export function SkillsTab({ manage = false }: { manage?: boolean }) {
  const { campaignId, characterId, sheet } = useProfile();

  const personal = sheet.personalSkill;

  return (
    <>
      {personal && (
        <section className="mb-3 flex gap-3 rounded-[10px] border border-[#c9b37a]/40 bg-[#1a140f] p-3">
          <span className="branch-frame size-12 shrink-0 overflow-hidden">{personal.icon ? <OptimizedImage src={personal.icon} alt="" width={48} height={48} className="size-full object-cover" /> : <span className="hud-sc flex size-full items-center justify-center">{personal.name[0]}</span>}</span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase text-[#c9b37a]">Персональне вміння</p>
            <h3 className="hud-sc text-base text-[#efe5d2]">{personal.name}</h3>
            {personal.description && <p className="mt-1 text-[13px] leading-snug text-[#b8ab95]">{personal.description}</p>}
          </div>
        </section>
      )}
      <div className="-mx-4">
        <ProgressionPanel campaignId={campaignId} characterId={characterId} canManage={manage} />
      </div>
    </>
  );
}
```

`MagicTab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";

import { ProfileSpellBook } from "./ProfileSpellBook";
import { useProfile } from "./ProfileContext";

import { metalClass } from "@/components/battle/hud";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROMAN, spellTier } from "@/lib/utils/battle/view";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function MagicTab() {
  const { sheet } = useProfile();

  const [open, setOpen] = useState(false);

  if (!sheet.magic && sheet.slots.length === 0 && sheet.spells.length === 0) return <EmptyState title="Магії поки немає" />;

  return (
    <>
      {sheet.magic && (
        <div className="flex justify-between text-sm text-[#8f8473]">
          <span>СЛ заклинань <b className="text-lg text-[#efe5d2]">{sheet.magic.saveDC}</b></span>
          <span>Атака закл. <b className="text-lg text-[#efe5d2]">{signed(sheet.magic.attackBonus)}</b></span>
          <span>{sheet.magic.ability}</span>
        </div>
      )}
      {sheet.slots.length > 0 && (
        <>
          <h2 className="hud-sc mt-3 mb-1.5 text-[13px] tracking-[.06em] text-[#c9b37a]">СЛОТИ</h2>
          <div className="flex flex-wrap gap-1.5">
            {sheet.slots.map((s) => (
              <span key={s.level} aria-label={`${ROMAN[s.level]} коло: ${s.count} слоти`} className={cn("hud-sc metal-fill rounded-md px-3 py-1.5 text-sm", metalClass(spellTier(s.level)))}>
                {ROMAN[s.level]} · {s.count}
              </span>
            ))}
          </div>
        </>
      )}
      {sheet.spells.length > 0 && (
        <>
          <Button type="button" className="hud-sc mt-4 h-12 w-full gap-2 bg-[#7a2a1f] text-[#f3e7cc] hover:bg-[#8a3427]" onClick={() => setOpen(true)}>
            <BookOpen className="size-5" />Книга заклинань
          </Button>
          <ProfileSpellBook spells={sheet.spells} slots={sheet.slots} open={open} onOpenChange={setOpen} />
        </>
      )}
    </>
  );
}
```

(`ProfileSpellBook` перенести в `components/character-profile/` вже зроблено в Task 9; aria-label «слоти» — без відмінків, бо для 1 слота це ок як позначка; якщо хочеться точно — `pluralUk(s.count, ["слот","слоти","слотів"])` і тест оновити відповідно.)

`ItemsTab.tsx` + `ArtifactSheet.tsx`:

```tsx
"use client";

import { useState } from "react";

import { useProfile } from "./ProfileContext";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import { cn } from "@/lib/utils";
import type { SheetArtifact } from "@/types/characters";

const RARITY_RING: Record<string, string> = { rare: "border-[#8fd0e8]", epic: "border-[#c08ff0]", legendary: "border-[#e6c25a]" };

function Icon({ a, size }: { a: SheetArtifact; size: number }) {
  return a.icon ? <OptimizedImage src={a.icon} alt="" width={size} height={size} className="size-full object-cover" /> : <span className="hud-sc">{a.name[0]}</span>;
}

export function ItemsTab() {
  const { sheet } = useProfile();

  const [shown, setShown] = useState<SheetArtifact | null>(null);

  return (
    <>
      <div className="mx-auto grid w-[204px] grid-cols-3 gap-1.5">
        {ARTIFACT_GRID_9.map((cell) => {
          const a = sheet.items.grid[cell.key];

          return a ? (
            <button key={cell.key} type="button" aria-label={`${cell.label}: ${a.name}`} onClick={() => setShown(a)} className={cn("flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-[#1a140f]", RARITY_RING[a.rarity ?? ""] ?? "border-[#4a3c2c]")}>
              <Icon a={a} size={64} />
            </button>
          ) : (
            <span key={cell.key} title={cell.label} className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[#3a2e22] text-[10px] text-[#5d5346]">{cell.label}</span>
          );
        })}
      </div>
      <h2 className="hud-sc mt-4 mb-1.5 text-[13px] tracking-[.06em] text-[#c9b37a]">ЩО ДАЮТЬ РЕЧІ</h2>
      {sheet.items.artifacts.length === 0 && <p className="text-sm text-[#8f8473]">Нічого не вдягнено.</p>}
      <ul>
        {sheet.items.artifacts.map((a) => (
          <li key={a.id}>
            <button type="button" onClick={() => setShown(a)} className="flex w-full gap-2 border-b border-[#2a2218] py-2 text-left">
              <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#4a3c2c]"><Icon a={a} size={32} /></span>
              <span className="min-w-0">
                <span className="block text-sm text-[#efe5d2]">{a.name}</span>
                <span className="block text-xs text-[#8f8473]">{a.effects.length ? a.effects.join(" · ") : "без ефектів"}</span>
              </span>
            </button>
          </li>
        ))}
        {sheet.items.sets.map((s) => (
          <li key={s.id} className="border-b border-[#2a2218] py-2">
            <span className={cn("block text-sm", s.complete ? "text-[#e6c25a]" : "text-[#efe5d2]")}>✦ Сет «{s.name}» {s.have}/{s.total}</span>
            <span className="block text-xs text-[#8f8473]">{s.complete ? s.effects.join(" · ") : `Ефекти з повним сетом: ${s.effects.join(" · ") || "—"}`}</span>
          </li>
        ))}
      </ul>
      <ResponsiveDialog open={!!shown} onOpenChange={(o) => !o && setShown(null)} title={shown?.name ?? ""} description={shown?.rarity ?? undefined}>
        {shown?.description && <p className="text-sm">{shown.description}</p>}
        <ul className="mt-2 list-disc pl-5 text-sm">
          {shown?.effects.map((e) => <li key={e}>{e}</li>)}
        </ul>
      </ResponsiveDialog>
    </>
  );
}
```

(Ключі рідкостей — перевірити значення в `lib/constants/artifacts.ts` і підставити фактичні.)

`CharacterProfile.tsx` `viewTabs()` — `<SkillsTab />`, `<MagicTab />`, `<ItemsTab />`; `index.ts` — експорт `SkillsTab`, `MagicTab`, `ItemsTab`.

- [ ] **Step 3: Перевірка** — `pnpm test:run components/character-profile` → PASS; tsc + lint.

- [ ] **Step 4: Commit**

```bash
git add components
git commit -m "feat(profile): skills, magic (slot plates + spellbook sheet) and items (effects per artifact) tabs"
```

---

### Task 12: Таба «Історія» — біографія і цілі

**Files:**
- Create: `components/character-profile/{StoryTab,BiographyText,GoalList}.tsx`
- Modify: `CharacterProfile.tsx`, `index.ts`
- Test: `components/character-profile/__tests__/story-tab.test.tsx`

**Interfaces:**
- Consumes: `parseHighlights`, `paragraphs` (Task 4); `useCharacterGoals` (Task 7); `useProfile`
- Produces: `BiographyText({ text }: { text: string })`; `GoalList({ editable }: { editable: "own" | "all" | "none" })`; `StoryTab()`

- [ ] **Step 1: Падаючий тест**

```tsx
// @vitest-environment happy-dom
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { sheetFixture, withSheet } from "./sheet-fixture";

const save = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useCharacterGoals: () => ({ save, isPending: false }) }));

import { BiographyText, StoryTab } from "@/components/character-profile";
import { ProfileContext } from "@/components/character-profile/ProfileContext";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet } from "@/types/characters";

const inProfile = (sheet: CharacterSheet) => renderWithConfirm(<ProfileContext.Provider value={{ campaignId: "c", characterId: "ch", sheet, canEdit: sheet.viewer.isDM }}><StoryTab /></ProfileContext.Provider>);

describe("Історія", () => {
  it("виділення — <mark>, HTML — текст", () => {
    renderWithConfirm(<BiographyText text={"Мати ==загинула== <b>давно</b>"} />);

    expect(screen.getByText("загинула").tagName).toBe("MARK");
    expect(screen.getByText(/<b>давно<\/b>/)).toBeTruthy();
  });

  it("гравець бачить бейдж «від гравця», редагує лише свої цілі", () => {
    inProfile(sheetFixture);

    expect(screen.getByText("від гравця")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Редагувати ціль/ })).toHaveLength(1);
  });

  it("гравець додає ціль — шле всі свої цілі + нову", async () => {
    inProfile(sheetFixture);

    fireEvent.click(screen.getByRole("button", { name: "Додати ціль" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Нова ціль" }), { target: { value: "Купити коня" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти ціль" }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][0].map((g: { text: string }) => g.text)).toContain("Купити коня");
  });

  it("порожня біографія — підказка", () => {
    inProfile(withSheet({ story: { biography: null, goals: [] } }));

    expect(screen.getByText("Біографію ще не написано")).toBeTruthy();
  });
});
```

Run → FAIL.

- [ ] **Step 2: Реалізація**

`BiographyText.tsx`:

```tsx
import { paragraphs, parseHighlights } from "@/lib/utils/characters/biography";

export function BiographyText({ text }: { text: string }) {
  return (
    <div className="hud-book space-y-3 text-[15px] leading-relaxed text-[#e6dccb]">
      {paragraphs(text).map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {parseHighlights(p).map((s, j) => (s.marked ? <mark key={j} className="bg-[linear-gradient(transparent_55%,rgba(201,179,122,.45)_55%)] text-[#efe5d2]">{s.text}</mark> : s.text))}
        </p>
      ))}
    </div>
  );
}
```

`GoalList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { useProfile } from "./ProfileContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCharacterGoals } from "@/lib/hooks/characters";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { CharacterGoal, GoalStatus } from "@/types/characters";

const ORDER: Record<GoalStatus, number> = { active: 0, done: 1, failed: 2 };

const NEXT: Record<GoalStatus, GoalStatus> = { active: "done", done: "failed", failed: "active" };

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `g${Date.now()}${Math.random().toString(36).slice(2, 6)}`).slice(0, 40);

export function GoalList() {
  const { campaignId, characterId, sheet } = useProfile();

  const { save, isPending } = useCharacterGoals(campaignId, characterId);

  const confirm = useConfirm();

  const isDM = sheet.viewer.isDM;

  const canAdd = isDM || sheet.viewer.isOwner;

  const goals = [...sheet.story.goals].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  const mine = (g: CharacterGoal) => isDM || (sheet.viewer.isOwner && g.author === "player");

  const [draft, setDraft] = useState<{ id: string | null; text: string } | null>(null);

  const send = (next: CharacterGoal[]) => save(isDM ? next : next.filter((g) => g.author === "player"));

  const commit = async () => {
    if (!draft || !draft.text.trim()) return;

    const text = draft.text.trim().slice(0, 300);

    const next = draft.id
      ? sheet.story.goals.map((g) => (g.id === draft.id ? { ...g, text } : g))
      : [...sheet.story.goals, { id: newId(), text, status: "active" as const, author: isDM ? ("dm" as const) : ("player" as const) }];

    await send(next);
    setDraft(null);
  };

  const remove = async (g: CharacterGoal) => {
    if (await confirm({ title: `Видалити ціль «${g.text}»?`, confirmLabel: "Видалити" })) await send(sheet.story.goals.filter((x) => x.id !== g.id));
  };

  return (
    <section>
      <h2 className="hud-sc mb-1.5 text-[13px] tracking-[.06em] text-[#c9b37a]">ЦІЛІ</h2>
      {goals.length === 0 && <p className="text-sm text-[#8f8473]">Цілей поки немає.</p>}
      <ul>
        {goals.map((g) => (
          <li key={g.id} className="flex items-start gap-2 border-b border-[#2a2218] py-2 text-sm">
            <button type="button" disabled={!isDM || isPending} aria-label={`Статус: ${g.status}`} onClick={() => send(sheet.story.goals.map((x) => (x.id === g.id ? { ...x, status: NEXT[x.status] } : x)))} className="mt-0.5 size-5 shrink-0 text-[#c9b37a] disabled:cursor-default">
              {g.status === "done" ? <Check className="size-4" /> : g.status === "failed" ? <X className="size-4" /> : "◆"}
            </button>
            <span className={cn("min-w-0 flex-1", g.status !== "active" && "text-[#8f8473] line-through")}>
              {g.text}
              {g.author === "player" && <span className="ml-1.5 rounded border border-[#6f8fb0] px-1 text-[10px] text-[#6f8fb0] no-underline">від гравця</span>}
            </span>
            {mine(g) && (
              <>
                <Button type="button" size="icon" variant="ghost" className="size-8" aria-label={`Редагувати ціль ${g.text}`} onClick={() => setDraft({ id: g.id, text: g.text })}><Pencil className="size-4" /></Button>
                <Button type="button" size="icon" variant="ghost" className="size-8" aria-label={`Видалити ціль ${g.text}`} onClick={() => remove(g)}><Trash2 className="size-4" /></Button>
              </>
            )}
          </li>
        ))}
      </ul>
      {draft ? (
        <div className="mt-2 flex gap-2">
          <Input aria-label="Нова ціль" maxLength={300} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} className="h-11" autoFocus />
          <Button type="button" className="h-11" aria-label="Зберегти ціль" disabled={isPending || !draft.text.trim()} onClick={commit}><Check className="size-4" /></Button>
          <Button type="button" variant="ghost" className="h-11" aria-label="Скасувати" onClick={() => setDraft(null)}><X className="size-4" /></Button>
        </div>
      ) : (
        canAdd && <Button type="button" variant="ghost" className="mt-1 h-11 gap-1 px-0 text-[#c9b37a]" onClick={() => setDraft({ id: null, text: "" })}><Plus className="size-4" />Додати ціль</Button>
      )}
    </section>
  );
}
```

`StoryTab.tsx`:

```tsx
"use client";

import { BiographyText } from "./BiographyText";
import { GoalList } from "./GoalList";
import { useProfile } from "./ProfileContext";

export function StoryTab() {
  const { sheet } = useProfile();

  return (
    <>
      <GoalList />
      <h2 className="hud-sc mt-5 mb-1.5 text-[13px] tracking-[.06em] text-[#c9b37a]">БІОГРАФІЯ</h2>
      {sheet.story.biography ? <BiographyText text={sheet.story.biography} /> : <p className="text-sm text-[#8f8473]">Біографію ще не написано</p>}
    </>
  );
}
```

Тест «гравець редагує лише свої»: фікстура має 1 ціль ДМа і 1 гравця → кнопок «Редагувати ціль» одна. Кнопка «Додати ціль» має `aria-label` не задавати — її ім'я з тексту «Додати ціль».

`CharacterProfile` → `story: <StoryTab />`; експорт `StoryTab`, `BiographyText`.

- [ ] **Step 3: Перевірка** — `pnpm test:run components/character-profile` → PASS; tsc + lint.

- [ ] **Step 4: Commit**

```bash
git add components
git commit -m "feat(profile): story tab — highlighted biography and goals (player adds own, DM manages all)"
```

---

### Task 13: Режим редагування ДМа

**Files:**
- Modify: `lib/hooks/characters/useDmCharacterEditor.ts` (параметр `onSaved`, без router), `useCharacterEditor.ts` (без змін логіки)
- Create: `components/character-profile/{ProfileEditor,BasicEditTab,BiographyEditor,PrimaryAbilityPicker}.tsx`
- Modify: `components/characters/stats/CharacterAbilityScores.tsx` (рядок основної характеристики), `components/characters/skills/CharacterSkillsSection.tsx` (українські назви з `DND_SKILL_META`/`CORE_ABILITY_SCORES`)
- Modify: `CharacterProfile.tsx`
- Test: `components/character-profile/__tests__/profile-editor.test.tsx`

**Interfaces:**
- Consumes: `useDmCharacterEditor` (наявний), `toggleHighlight` (Task 4), форма з Task 3 (`abilityScores.primaryAbility`, `setPrimaryAbility`, `spellcasting.setSpellcastingAbility`), `characterSheetKey`
- Produces: `ProfileEditor({ onDone }: { onDone: () => void })`; `BiographyEditor({ value, onChange })`; `PrimaryAbilityPicker({ value, onChange })`

- [ ] **Step 1: Падаючий тест**

```tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BiographyEditor } from "@/components/character-profile/BiographyEditor";
import { PrimaryAbilityPicker } from "@/components/character-profile/PrimaryAbilityPicker";

describe("редактор ДМа", () => {
  it("Маркер обгортає виділене", () => {
    const onChange = vi.fn();

    render(<BiographyEditor value="мати загинула тут" onChange={onChange} />);

    const area = screen.getByRole("textbox", { name: "Біографія" }) as HTMLTextAreaElement;

    area.setSelectionRange(0, 13);
    fireEvent.click(screen.getByRole("button", { name: "Маркер" }));
    expect(onChange).toHaveBeenCalledWith("==мати загинула== тут");
  });

  it("основна характеристика — одна; повторний клік знімає", () => {
    const onChange = vi.fn();

    const { rerender } = render(<PrimaryAbilityPicker value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Спритність — основна" }));
    expect(onChange).toHaveBeenLastCalledWith("dexterity");
    rerender(<PrimaryAbilityPicker value="dexterity" onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Спритність — основна" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
```

Run → FAIL.

- [ ] **Step 2: Дрібні редактори**

`BiographyEditor.tsx`:

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
    const el = ref.current;

    if (!el) return;

    const next = toggleHighlight(value, el.selectionStart, el.selectionEnd);

    onChange(next.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="hud-sc text-[13px] text-[#c9b37a]">БІОГРАФІЯ</span>
        <Button type="button" size="sm" variant="outline" className="h-10 gap-1.5" onMouseDown={(e) => e.preventDefault()} onClick={mark}>
          <Highlighter className="size-4" />Маркер
        </Button>
      </div>
      <Textarea ref={ref} aria-label="Біографія" value={value} onChange={(e) => onChange(e.target.value)} rows={12} className="font-[family-name:var(--font-hud-book)] text-[15px]" />
      <p className="text-xs text-[#8f8473]">Виділіть фрагмент і натисніть «Маркер» — гравець побачить його підсвіченим. Повторне натискання всередині підсвіченого знімає виділення.</p>
    </div>
  );
}
```

(`onMouseDown preventDefault` — щоб textarea не втратила виділення при тапі по кнопці.)

`PrimaryAbilityPicker.tsx`:

```tsx
import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import type { AbilityKey } from "@/types/characters";

export function PrimaryAbilityPicker({ value, onChange }: { value: AbilityKey | null; onChange: (v: AbilityKey | null) => void }) {
  return (
    <fieldset className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      <legend className="mb-1 text-xs text-[#8f8473]">Основна характеристика (влучання й шкода)</legend>
      {CORE_ABILITY_SCORES.map((a) => (
        <label key={a.key} className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" aria-label={`${a.label} — основна`} checked={value === a.key} onChange={() => onChange(value === a.key ? null : a.key)} className="size-5 accent-[#c9b37a]" />
          {a.label}
        </label>
      ))}
    </fieldset>
  );
}
```

`CharacterAbilityScores.tsx`: прийняти `primary?: { value: AbilityKey | null; onChange: (v: AbilityKey | null) => void }` і рендерити під сіткою `{primary && <PrimaryAbilityPicker … />}` (імпорт з `@/components/character-profile/PrimaryAbilityPicker`; якщо це створює цикл імпортів — перенести `PrimaryAbilityPicker` у `components/characters/stats/`). Показувати модифікатор біля кожного інпуту: `({signed(getAbilityModifier(score))})`.

`CharacterSkillsSection.tsx`: підписи — `CORE_ABILITY_SCORES.find(...).label` для рятівних і `DND_SKILL_META[skill].label` для навичок; чекбокси `size-5`, рядок `h-11`.

- [ ] **Step 3: `ProfileEditor`**

`useDmCharacterEditor.ts`: сигнатура `({ campaignId, characterId, onSaved }: { …; onSaved: () => void })`, передати `onSaved` в `useCharacterEditor` замість `router.push`; `useRouter` прибрати. Додати `deleteCharacter`:

```ts
  const del = useDeleteCharacter(campaignId);

  const remove = async () => {
    const ok = await confirm({ title: `Видалити персонажа ${editor.form.basicInfo.name}?`, confirmLabel: "Видалити", onConfirm: () => del.mutateAsync(characterId) });

    return ok;
  };
```

і повернути `remove`. Зберегти: `useUpdateCharacter` — додати в `invalidateKeys` `["character-sheet", campaignId, characterId]`.

`ProfileEditor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { BasicEditTab } from "./BasicEditTab";
import { BiographyEditor } from "./BiographyEditor";
import { GoalList } from "./GoalList";
import { ProfileHero } from "./ProfileHero";
import { useProfile } from "./ProfileContext";
import { type ProfileTabId, ProfileTabs } from "./ProfileTabs";
import { SkillsTab } from "./SkillsTab";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { ActionBar } from "@/components/common/ActionBar";
import { LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { useDmCharacterEditor } from "@/lib/hooks/characters";

const SPELL_ABILITIES = [{ value: "", label: "Немає" }, { value: "intelligence", label: "Інтелект" }, { value: "wisdom", label: "Мудрість" }, { value: "charisma", label: "Харизма" }];

export function ProfileEditor({ onDone }: { onDone: () => void }) {
  const { campaignId, characterId } = useProfile();

  const router = useRouter();

  const editor = useDmCharacterEditor({ campaignId, characterId, onSaved: onDone });

  const [tab, setTab] = useState<ProfileTabId>("basic");

  if (!editor.ready) return <LoadingState rows={6} label="Завантаження редактора…" />;

  const { form, equipped, setEquipped, artifacts, artifactSets } = editor;

  const { formData, setFormData, abilityScores, combatStats, skills, abilities, spellcasting } = form;

  return (
    <form id="profile-edit" onSubmit={form.handleSubmit}>
      <ProfileHero actions={<Button type="button" size="sm" variant="outline" onClick={() => void editor.levelUp()}>+ рівень</Button>} />
      {form.error && <p className="mx-4 rounded border border-[#9c2a1d] bg-[#9c2a1d]/15 px-3 py-2 text-sm">{form.error}</p>}
      <ProfileTabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { id: "basic", label: "Основне", content: <BasicEditTab editor={editor} onDeleted={() => router.push(`/campaigns/${campaignId}/dm/characters`)} /> },
          {
            id: "combat",
            label: "Бій",
            content: (
              <div className="space-y-6">
                <CharacterAbilityScores abilityScores={abilityScores} primary={{ value: abilityScores.primaryAbility, onChange: abilityScores.setPrimaryAbility }} />
                <CharacterCombatParams combatStats={combatStats} />
                <CharacterSkillsSection skills={skills} />
              </div>
            ),
          },
          { id: "skills", label: "Вміння", content: <div className="space-y-4"><CharacterAbilitiesSection campaignId={campaignId} abilities={abilities} /><SkillsTab manage /></div> },
          {
            id: "magic",
            label: "Магія",
            content: <SelectField label="Характеристика заклинань" value={spellcasting.spellcastingAbility} onValueChange={spellcasting.setSpellcastingAbility} options={SPELL_ABILITIES} />,
          },
          {
            id: "items",
            label: "Речі",
            content: (
              <CharacterArtifactsSection
                knownSpellIds={spellcasting.knownSpells}
                campaignId={campaignId}
                characterId={characterId}
                progressionCharacterId={characterId}
                equipped={equipped}
                artifacts={artifacts.map((a) => ({ id: a.id, name: a.name, slot: a.slot ?? "item", icon: a.icon ?? null }))}
                artifactSets={artifactSets}
                onEquippedChange={setEquipped}
                spellSlots={formData.spellcasting.spellSlots}
              />
            ),
          },
          {
            id: "story",
            label: "Історія",
            content: (
              <div className="space-y-6">
                <GoalList />
                <BiographyEditor value={formData.basicInfo.background ?? ""} onChange={(v) => setFormData((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, background: v } }))} />
              </div>
            ),
          },
        ]}
      />
      <ActionBar className="px-4">
        <Button type="button" variant="outline" onClick={onDone}>Скасувати</Button>
        <Button type="submit" form="profile-edit" disabled={form.loading || editor.membersLoading}>{form.loading ? "Збереження…" : "Зберегти"}</Button>
      </ActionBar>
    </form>
  );
}
```

(Пропси `SelectField`, `CharacterAbilitiesSection`, `CharacterArtifactsSection` — звірити з фактичними сигнатурами; `useDmCharacterEditor` уже вантажить артефакти/сети з `enabled: loaded`, а сам хук монтується лише в режимі редагування — вимога «бібліотеки тільки при редагуванні» виконана самою структурою.)

`BasicEditTab.tsx`:

```tsx
"use client";

import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import type { DmCharacterEditor } from "@/lib/hooks/characters";

type Coef = "hpMultiplier" | "meleeMultiplier" | "rangedMultiplier";

export function BasicEditTab({ editor, onDeleted }: { editor: DmCharacterEditor; onDeleted: () => void }) {
  const { form, members, races } = editor;

  const coef = form.formData.scalingCoefficients;

  const setCoef = (key: Coef, v: number) =>
    form.setFormData((prev) => ({ ...prev, scalingCoefficients: { hpMultiplier: prev.scalingCoefficients?.hpMultiplier ?? 1, meleeMultiplier: prev.scalingCoefficients?.meleeMultiplier ?? 1, rangedMultiplier: prev.scalingCoefficients?.rangedMultiplier ?? 1, [key]: v } }));

  return (
    <div className="space-y-6">
      <CharacterBasicInfo basicInfo={form.basicInfo} campaignMembers={members} races={races} />
      <CharacterHpPreview level={form.basicInfo.level} strength={form.abilityScores.strength} coefficient={coef?.hpMultiplier ?? 1} onCoefficientChange={(v) => setCoef("hpMultiplier", v)} isDm />
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput label="Коеф. ближньої шкоди" type="number" step="0.1" min={0.1} max={3} value={coef?.meleeMultiplier ?? 1} onChange={(e) => setCoef("meleeMultiplier", Number(e.target.value) || 1)} />
        <LabeledInput label="Коеф. дальньої шкоди" type="number" step="0.1" min={0.1} max={3} value={coef?.rangedMultiplier ?? 1} onChange={(e) => setCoef("rangedMultiplier", Number(e.target.value) || 1)} />
      </div>
      <Button type="button" variant="destructive" className="h-11 w-full" onClick={async () => { if (await editor.remove()) onDeleted(); }}>
        Видалити персонажа
      </Button>
    </div>
  );
}
```

`CharacterProfile.tsx`: `{editing ? <ProfileEditor onDone={() => setEditing(false)} /> : …}`; у редагуванні таба з URL не використовується. Після `onSaved` інвалідація листа робить `useUpdateCharacter` (Step 3), тож повернення в перегляд показує нові цифри.

- [ ] **Step 4: Перевірка** — `pnpm test:run components lib/hooks/characters` → PASS; tsc + lint. Перевірити в `components/ui/__tests__/eslint-guards.test.ts`, що нових заборонених імпортів немає (`pnpm lint`).

- [ ] **Step 5: Commit**

```bash
git add components lib
git commit -m "feat(profile): DM edit mode in the same tabs — basic tab, primary ability, biography marker, two-button ActionBar"
```

---

### Task 14: Маршрути на новий профіль, видалення старого, інвалідація листа

**Files:**
- Modify: `app/campaigns/[id]/character/page.tsx`, `app/campaigns/[id]/character/edit/page.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/page.tsx`
- Create: `app/campaigns/[id]/character/character-page-client.tsx` (обгортка з `LevelUpOverlay` / `FreePointBadge`)
- Delete: файли з розділу «Видаляються» (див. файлову структуру)
- Modify: `lib/hooks/characters/index.ts`, `lib/hooks/characters/useCharacters.ts`, `lib/hooks/skills/useProgressionActions.ts`, `lib/hooks/characters/useEquipArtifact.ts`, `lib/api/characters.ts`, `types/characters.ts` (прибрати `DamagePreview*`), `lib/utils/battle/damage/hero-dm-multiplier.ts` (коментар)
- Modify tests: `app/campaigns/[id]/dm/characters/__tests__/page-client.test.tsx`, `components/characters/__tests__/CharacterSpellbook.test.tsx` (видалити, якщо компонент іде), тести хуків, що мокали `damage-preview`

**Interfaces:**
- Consumes: `CharacterProfile` (Task 10–13), `characterSheetKey` (Task 6)

- [ ] **Step 1: Інвалідація**

`useProgressionActions.ts`: замінити цикл по `"character-damage-preview"`, `"damage-calculator-*"` на `void queryClient.invalidateQueries({ queryKey: characterSheetKey(campaignId, characterId) });`.
`useLevelUpCharacter`: замінити три старі ключі на `["character-sheet", campaignId]`.
`useEquipArtifact.ts`: `onSuccess: () => queryClient.invalidateQueries({ queryKey: characterSheetKey(campaignId, characterId) })`.
Падаючий тест спершу — `lib/hooks/skills/__tests__/useProgressionActions*.test.tsx`: очікувати виклик `invalidateQueries` з `["character-sheet", "c", "ch"]` (оновити наявне очікування старих ключів).

- [ ] **Step 2: Маршрути**

`app/campaigns/[id]/character/page.tsx` — серверний компонент: той самий пошук персонажа, але `select: { id: true }` (без `inventory`), і рендер `<CharacterPageClient campaignId={id} characterId={character.id} canEdit={isDM} />`.

`character-page-client.tsx`:

```tsx
"use client";

import { CharacterProfile } from "@/components/character-profile";
import { FreePointBadge, LevelUpOverlay } from "@/components/skill-tree/progression";

export function CharacterPageClient({ campaignId, characterId, canEdit }: { campaignId: string; characterId: string; canEdit: boolean }) {
  return (
    <>
      <CharacterProfile campaignId={campaignId} characterId={characterId} canEdit={canEdit} />
      <LevelUpOverlay campaignId={campaignId} characterId={characterId} />
      <FreePointBadge campaignId={campaignId} characterId={characterId} />
    </>
  );
}
```

(пропси `LevelUpOverlay`/`FreePointBadge` — скопіювати з того, як їх викликає нинішній `character-view-client.tsx`.)

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

(Перемикач «Перегляд як гравець» зникає: ДМ і так бачить те саме, що гравець, у режимі перегляду.)

`character/edit/page.tsx`: після пошуку персонажа — `redirect(\`/campaigns/${id}/dm/characters/${character.id}\`)`; `edit-client.tsx` видалити.

- [ ] **Step 3: Видалення**

```bash
git rm -r "app/campaigns/[id]/character/components" "app/campaigns/[id]/character/character-view-client.tsx" "app/campaigns/[id]/character/edit/edit-client.tsx" \
  "app/campaigns/[id]/dm/characters/[characterId]/DmCharacterEditForm.tsx" "app/campaigns/[id]/dm/characters/[characterId]/DmCharacterEditFormAccordion.tsx" \
  "app/api/campaigns/[id]/characters/[characterId]/damage-preview" \
  components/characters/stats/CharacterDamageCalculator.tsx components/characters/stats/CharacterDamagePreview.tsx \
  components/characters/stats/DamageCalculatorDiceInputs.tsx components/characters/stats/DamageCalculatorResult.tsx \
  components/characters/stats/DamageCalculatorSkillsLog.tsx components/characters/stats/SkillsAffectingDamageList.tsx \
  components/characters/spells/SpellMultiSelect.tsx \
  lib/hooks/characters/useCharacterView.ts lib/hooks/characters/useDamagePreview.ts lib/hooks/characters/damage-preview.ts \
  lib/hooks/characters/useDamageCalculator.ts lib/hooks/characters/useDamageCalculator-skills.ts lib/hooks/characters/useDamageCalculator-spell.ts \
  lib/utils/characters/damage-calculator.ts
```

Прибрати їхні експорти з барелів, `getDamagePreview` з `lib/api/characters.ts`, `DamagePreviewItem/Response` з `types/characters.ts`. Потім знайти осиротілих:

Run: `pnpm exec tsc --noEmit` → виправити всі «Cannot find module».
Run: для кожного файлу в `components/characters/**`, `lib/utils/artifacts/**`, `lib/hooks/characters/**`: `grep -rl "<ім'я експорту>" app components lib --include=*.ts --include=*.tsx | grep -v __tests__` — якщо поза власним файлом і тестами нікого, видалити разом із тестом. Кандидати, які треба перевірити: `CharacterSpellbook.tsx`, `CharacterSpellbookDialog.tsx`, `SpellSlotsBadge.tsx`, `ArtifactDeltaBadge.tsx`, `sum-equipped-artifact-flat-bonuses.ts`, `components/ui/read-only-context.tsx` (`ReadOnlyProvider`), `useHeroScalingCoefficients.ts`, `getArtifactAttackBonus`/`getArtifactDamageBonus`/`getAttackDamageModifier` у `calculations.ts`.

`hero-dm-multiplier.ts:2` — коментар «збіг з damage-preview API» замінити на «як у листі персонажа (buildCharacterSheet)».

- [ ] **Step 4: Перевірка**

Run: `pnpm test:run` → усі тести PASS (оновити/видалити тести видалених модулів).
Run: `pnpm exec tsc --noEmit && pnpm lint` → 0 помилок.
Run: `pnpm build` → успішно (ловить серверні/клієнтські межі `"use client"`).

- [ ] **Step 5: Commit**

```bash
git add -A app components lib types
git commit -m "feat(profile): player and DM routes use the new profile; remove accordions, damage calculator and damage-preview"
```

---

### Task 15: Перший тап після закриття шторки

**Files:**
- Modify: `components/ui/responsive-dialog.tsx`
- Test: `components/ui/__tests__/responsive-dialog.test.tsx`

- [ ] **Step 1: Відтворення (superpowers:systematic-debugging)**

`pnpm dev`, вікно 390×844 (Chrome DevTools device mode або `resize_window`), профіль Ліри → «Речі» → тап по артефакту → закрити шторку свайпом/тапом по оверлею → одразу тап по табі «Магія». Зафіксувати: чи перемикається таба з першого тапу. Під час закриття в консолі виконати `getComputedStyle(document.body).pointerEvents` і `document.querySelectorAll("[data-vaul-overlay]").length` через 50, 200, 500 мс після закриття. Очікувана причина: Radix Dialog усередині vaul під час анімації закриття лишає `body { pointer-events: none }` (модальний шар `DismissableLayer`), і перший тап поглинається. Якщо замір показує іншу причину — виправлення під неї, тест під неї.

- [ ] **Step 2: Падаючий тест** (для підтвердженої гіпотези)

```tsx
  it("телефон: після закриття шторки body знову приймає дотики", async () => {
    mockMatchMedia(true);

    function Harness() {
      const [open, setOpen] = useState(true);

      return <ResponsiveDialog open={open} onOpenChange={setOpen} title="Т">вміст<Button onClick={() => setOpen(false)}>Закрити</Button></ResponsiveDialog>;
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Закрити" }));

    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe("none"));
  });
```

Run → FAIL (або PASS — тоді happy-dom не відтворює механізм; лишити тест як регресійний і покладатися на ручну перевірку з Step 4).

- [ ] **Step 3: Виправлення**

У гілці `isMobile` передати в `Root` колбек, що знімає блокування одразу після закриття, не чекаючи кінця анімації:

```tsx
const releaseBody = () => {
  if (document.body.style.pointerEvents === "none") document.body.style.pointerEvents = "";
};
```

і `onOpenChange={(next) => { handleOpenChange(next); if (!next) requestAnimationFrame(releaseBody); }}` плюс `onAnimationEnd={(open) => { if (!open) releaseBody(); }}` (проп `onAnimationEnd` є у vaul 1.1). Для вкладених шторок (`nested`) нічого не знімати, поки відкритий батько: перевіряти `document.querySelectorAll("[data-slot=sheet]").length === 0` перед `releaseBody`.

- [ ] **Step 4: Перевірка** — тест PASS; `pnpm test:run components/ui`; ручне повторення Step 1 — таба перемикається з першого тапу; вкладена шторка (артефакт у редакторі ДМа → вибір) не ламається.

- [ ] **Step 5: Commit**

```bash
git add components/ui
git commit -m "fix(ui): release body pointer lock right after a sheet closes so the next tap is not lost"
```

---

### Task 16: Перевірка в браузері, simulate-battle, фінальний прогін

- [ ] **Step 1: Автоматика** — `pnpm test:run`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm simulate-battle` → усе зелене; результат simulate-battle збігається з `main`.

- [ ] **Step 2: Гравець, 390 px** — `pnpm dev`, `http://localhost:3000/campaigns/cmuvy29ix0001eyhew9cq07qf/character`:
  - кожна таба без горизонтального скролу (`document.documentElement.scrollWidth <= 390`);
  - мережа під час перегляду: лише `/sheet` і `/progression` (без `/skills`, `/main-skills`, `/artifacts`, `/artifact-sets`, `/spells`);
  - Майст +9; «Бій» — атаки з «влуч · ≈шкода»; «Магія» — слоти й шторка книги; «Речі» — ефекти; «Історія» — додати власну ціль, вона зберігається після перезавантаження;
  - рядок «Раса» в прокачці показує іконку; «Ще N варіантів» з правильним відмінком.

- [ ] **Step 3: ДМ** — `UPDATE campaign_members SET role='dm' WHERE id='preview-player-member';` (локальна БД), відкрити `/campaigns/cmuvy29ix0001eyhew9cq07qf/dm/characters/<id Ліри>`: «Редагувати» → позначити СПР основною, у біографії виділити фрагмент «Маркером», «Зберегти» (ActionBar влазить на 390 px, «Зберегти» не обрізане), «+ рівень» у hero працює. Повернути роль: `UPDATE campaign_members SET role='player' WHERE id='preview-player-member';` — **обов'язково**, перевірити `SELECT role …`.

- [ ] **Step 4: Бій** — створити/відкрити бій з Лірою в SIM-кампанії; «Влуч» у майстрі атаки = значення з профілю.

- [ ] **Step 5: Desktop ≥ 1024 px** — профіль центрований (`max-w-3xl`), книга двосторінкова.

- [ ] **Step 6: Рев'ю** — один opus-рев'ю всієї гілки (`superpowers:requesting-code-review` проти `main`), виправити знахідки окремими комітами, повторно Step 1. Мердж у `main` — лише після «так» користувача; пуш — лише із зеленими тестами на змердженому результаті.
