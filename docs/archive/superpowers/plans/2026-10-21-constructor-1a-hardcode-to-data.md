# Конструктор 1a: хардкод за назвами → дані — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** прибрати з рушія і UI всі прив'язки до конкретних назв контенту (заклинань, рас, гілок, героїв): кожна з них стає полем у БД, яке ДМ редагує, а наявні кампанії отримують ці поля через одноразовий бекфіл.

**Architecture:** нові nullable-колонки (`spells.fx`, `spell_groups.color/icon`, `main_skills.role`) і здібності (`abilities`) у рас, юнітів та скілів замість `if (name …)`. Таблиці «назва → значення» переїжджають з `lib/` у `scripts/constructor/backfill/`, де ними один раз користується бекфіл. Рушій читає тільки дані.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Prisma 6, PostgreSQL (локальний Docker), Vitest, Zod 4, TanStack Query.

**Spec:** `docs/superpowers/specs/2026-10-20-campaign-constructor-design.md` (розділ B, частина «1a»).

## Global Constraints

- Уся робота — у worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`. Основну папку `/Users/silentfox/Work/dnd-tracker` не чіпати.
- БД — тільки `postgresql://postgres:postgres@localhost:54322/constructor`. Prod і `prodcopy` не чіпати. Скрипти без `--allow-remote` відмовляються працювати з нелокальною БД.
- Міграції тільки розширюють схему (expand-only): лише nullable-колонки, нічого не видаляємо і не перейменовуємо.
- Поведінка без нових даних не змінюється, якщо задача прямо не каже інакше. Наявні тести не редагуються, крім тестів, що перевіряють саме видалену таблицю «назва → значення»: вони переїжджають до тестів бекфілу.
- Рядок у рушії, порівняний із назвою контенту (`name.includes("…")`, `name === "…"`), — це баг цього етапу.
- Конвенції репо (CLAUDE.md): компоненти не імпортують `@/lib/api/*`; ключі запитів — фабрики з `keys.ts`; `ResponsiveDialog` замість Radix Dialog; порожній рядок навколо `const`/`if`/`return`; мінімум коментарів; тексти UI українською.
- Команди: `pnpm test:run <file>`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`.

## Review Focus

1. **Активний бій зі старими знімками.** Ефекти, накладені до деплою, не мають `fxAura`, а учасники — нових здібностей. Бій не повинен падати: анімація береться із загальних правил, ініціатива перераховується зі знімка. Тест додається в Task 2.
2. **Кампанія без жодної групи чи гілки з `role`.** Колір і іконка повертають запасний варіант, `magicMainSkillIds` — порожню множину для порожнього списку, без винятків. Тести додаються в Tasks 3 і 4.
3. **Повторний запуск бекфілу** (ідемпотентність): здібності не дублюються, вже заповнені поля не перезаписуються. Тест додається в Task 9.
4. **Раса з текстом імунітету і непорожнім `abilities`.** Зараз текст ігнорується, і бекфіл теж не повинен додавати до неї здібність «Імунітети». Тест додається в Task 8.
5. **Невалідний `fx` у PATCH** (невідомий archetype). Відповідь 400 з issues, а не збереження сміття, бо інакше впаде FX-шар у клієнті. Тест додається в Task 1.

---

## File Structure

| Файл | Що робить |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261022000000_constructor_content_fields/migration.sql` | Нові колонки |
| `lib/utils/battle/fx/spell-fx-schema.ts` (новий) | `SpellFxSchema` (Zod) з enum-ів архетипів, стихій та аур |
| `lib/utils/battle/fx/types.ts` | Масиви `FX_ARCHETYPES`, `FX_ELEMENTS`, `FX_AURA_KINDS` (`as const`), з яких виводяться union-и |
| `lib/utils/battle/fx/spells.ts` | Лишається тільки тип `SpellFx`; `SPELL_FX`/`spellFx` видаляються |
| `lib/utils/battle/spell/cast/{state,finish}.ts`, `to-castable.ts`, `types/spell-process.ts` | `CastableSpell.fx`; `actionDetails.spellFx`; `ActiveEffect.fxAura` |
| `lib/utils/battle/fx/{map-action,aura}.ts`, `components/spells/preview/SpellBattlePreview.tsx` | Читають FX з даних |
| `lib/constants/spell-groups.ts` (новий) | `SPELL_GROUP_ICON_KEYS`, запасний колір |
| `lib/utils/spells/spell-icons.ts`, `lib/constants/spells.ts` | Колір та іконка з групи |
| `lib/constants/main-skills.ts` | `MAIN_SKILL_ROLES` |
| `lib/utils/battle/balance/{magic-school,dpr}.ts`, `lib/constants/dpr-by-main-skill.ts` | Магія за `role`/`spellGroupId` |
| `lib/utils/battle/turn/initiative.ts`, `lib/utils/battle/attack/bonus.ts`, `lib/utils/abilities/build/resolve.ts`, `lib/utils/races/race-effects.ts` | Видалення хардкоду |
| `scripts/constructor/backfill/*.ts` (нові) | Чисті функції бекфілу + таблиці за назвами + раннер |
| `components/spells/form/SpellFxFields.tsx`, `app/campaigns/[id]/dm/spell-groups/*`, `components/spells/groups/*`, `components/main-skills/MainSkillFormFields.tsx` | Редактори |
| `lib/__tests__/no-content-names.test.ts` (новий) | Захист від регресу |

---

### Task 0: Середовище

**Files:** `.env.local` у worktree (не комітиться).

- [ ] **Step 1: Docker і БД.** Docker Desktop має бути запущений; якщо ні, попросіть користувача запустити. Потім:
```bash
cd /Users/silentfox/Work/dnd-tracker-constructor
pnpm install --frozen-lockfile
pnpm db:local
./scripts/db/prodcopy-db.sh constructor
```
Очікується: БД `constructor` створена, скрипт повідомляє про успішне відновлення.

- [ ] **Step 2: env.** Скопіюйте `.env.local` з основної папки й замініть БД:
```bash
cp /Users/silentfox/Work/dnd-tracker/.env.local .env.local
sed -i '' -E 's#^DATABASE_URL=.*#DATABASE_URL=postgresql://postgres:postgres@localhost:54322/constructor#; s#^DIRECT_URL=.*#DIRECT_URL=postgresql://postgres:postgres@localhost:54322/constructor#' .env.local
grep -E '^(DATABASE_URL|DIRECT_URL)=' .env.local
```
Очікується: обидва рядки вказують на `/constructor`.

- [ ] **Step 3: Базова лінія.**
```bash
pnpm exec prisma generate && pnpm test:run 2>&1 | tail -5
```
Запишіть кількість пройдених і провалених тестів. Ці числа — еталон: після кожної задачі провалених не може стати більше.

---

### Task 1: Міграція, схеми і FX-каталог як дані

**Files:**
- Modify: `prisma/schema.prisma` (моделі `Spell`, `SpellGroup`, `MainSkill`)
- Create: `prisma/migrations/20261022000000_constructor_content_fields/migration.sql`
- Modify: `lib/utils/battle/fx/types.ts`
- Create: `lib/utils/battle/fx/spell-fx-schema.ts`
- Modify: `lib/schemas/spells.ts`, `lib/schemas/main-skills.ts`, `lib/constants/main-skills.ts`
- Create: `lib/constants/spell-groups.ts`
- Test: `lib/utils/battle/fx/__tests__/spell-fx-schema.test.ts`, `lib/schemas/__tests__/constructor-fields.test.ts`

**Interfaces:**
- Produces:
  - `FX_ARCHETYPES`, `FX_ELEMENTS`, `FX_AURA_KINDS` (readonly-масиви);
  - `SpellFxSchema: z.ZodType<SpellFx>`;
  - `MAIN_SKILL_ROLES = ["attack","ranged","defense","magic","leadership","race","ultimate","personal"] as const`, `type MainSkillRole`;
  - `SPELL_GROUP_ICON_KEYS = ["moon","flame","sparkles","sun","shell"] as const`, `type SpellGroupIconKey`, `SPELL_GROUP_FALLBACK_COLOR = "#6d7177"`;
  - Prisma: `Spell.fx Json?`, `SpellGroup.color String?`, `SpellGroup.icon String?`, `MainSkill.role String?`;
  - Zod: `spellFields.fx`, `createSpellGroupSchema`/`updateSpellGroupSchema` з `color`/`icon`, `create/updateMainSkillSchema.role`.

- [ ] **Step 1: Масиви FX у `types.ts`.** Перетворіть три union-и на масиви `as const`, не змінюючи значень. Наприклад:
```ts
export const FX_ARCHETYPES = ["melee", "ranged", "bolt", /* …усі поточні значення FxArchetype у тому ж порядку… */] as const;

export type FxArchetype = (typeof FX_ARCHETYPES)[number];
```
Те саме для `FX_ELEMENTS`/`FxElement` (12 значень) і `FX_AURA_KINDS`/`FxAuraKind` (39 значень). Значення беріть дослівно з наявних union-ів у `lib/utils/battle/fx/types.ts`.

- [ ] **Step 2: Тест схеми FX.**
```ts
// lib/utils/battle/fx/__tests__/spell-fx-schema.test.ts
import { describe, expect, it } from "vitest";

import { SpellFxSchema } from "@/lib/utils/battle/fx/spell-fx-schema";

describe("SpellFxSchema", () => {
  it("accepts a partial fx", () => {
    expect(SpellFxSchema.parse({ archetype: "swarm", element: "nature" })).toEqual({ archetype: "swarm", element: "nature" });
  });

  it("rejects an unknown archetype", () => {
    expect(SpellFxSchema.safeParse({ archetype: "nope" }).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(SpellFxSchema.safeParse({ archetype: "swarm", color: "red" }).success).toBe(false);
  });
});
```
Run: `pnpm test:run lib/utils/battle/fx/__tests__/spell-fx-schema.test.ts`. Очікується: FAIL (модуля немає).

- [ ] **Step 3: Схема.**
```ts
// lib/utils/battle/fx/spell-fx-schema.ts
import { z } from "zod";

import { FX_ARCHETYPES, FX_AURA_KINDS, FX_ELEMENTS } from "./types";

export const SpellFxSchema = z.strictObject({
  archetype: z.enum(FX_ARCHETYPES).optional(),
  element: z.enum(FX_ELEMENTS).optional(),
  aura: z.enum(FX_AURA_KINDS).optional(),
});
```
Run знову: PASS.

- [ ] **Step 4: Prisma і міграція.** У `schema.prisma` додайте `fx Json?` у `Spell`, `color String?` і `icon String?` у `SpellGroup`, `role String?` у `MainSkill`.
```sql
-- prisma/migrations/20261022000000_constructor_content_fields/migration.sql
ALTER TABLE "spells" ADD COLUMN "fx" JSONB;
ALTER TABLE "spell_groups" ADD COLUMN "color" TEXT, ADD COLUMN "icon" TEXT;
ALTER TABLE "main_skills" ADD COLUMN "role" TEXT;
```
```bash
pnpm exec prisma migrate deploy && pnpm exec prisma generate
```
Очікується: `1 migration applied`. Не використовуйте `migrate dev`: БД — копія prod, і drift-перевірка може запропонувати reset.

- [ ] **Step 5: Константи.**
```ts
// lib/constants/spell-groups.ts
export const SPELL_GROUP_ICON_KEYS = ["moon", "flame", "sparkles", "sun", "shell"] as const;

export type SpellGroupIconKey = (typeof SPELL_GROUP_ICON_KEYS)[number];

export const SPELL_GROUP_FALLBACK_COLOR = "#6d7177";
```
У `lib/constants/main-skills.ts` додайте (наявні експорти поки не чіпайте — їх прибирає Task 4):
```ts
export const MAIN_SKILL_ROLES = ["attack", "ranged", "defense", "magic", "leadership", "race", "ultimate", "personal"] as const;

export type MainSkillRole = (typeof MAIN_SKILL_ROLES)[number];

export const MAIN_SKILL_ROLE_LABELS: Record<MainSkillRole, string> = {
  attack: "Напад",
  ranged: "Стрільба",
  defense: "Захист",
  magic: "Магія",
  leadership: "Лідерство",
  race: "Раса",
  ultimate: "Ультимат",
  personal: "Персональні",
};
```

- [ ] **Step 6: Тест Zod-схем API.**
```ts
// lib/schemas/__tests__/constructor-fields.test.ts
import { describe, expect, it } from "vitest";

import { updateMainSkillSchema } from "@/lib/schemas/main-skills";
import { updateSpellGroupSchema, updateSpellSchema } from "@/lib/schemas/spells";

describe("constructor content fields", () => {
  it("spell fx: valid passes, unknown archetype fails, null clears", () => {
    expect(updateSpellSchema.safeParse({ fx: { archetype: "swarm" } }).success).toBe(true);
    expect(updateSpellSchema.safeParse({ fx: { archetype: "nope" } }).success).toBe(false);
    expect(updateSpellSchema.safeParse({ fx: null }).success).toBe(true);
  });

  it("spell group: hex color and known icon", () => {
    expect(updateSpellGroupSchema.safeParse({ color: "#12a52b", icon: "moon" }).success).toBe(true);
    expect(updateSpellGroupSchema.safeParse({ color: "green" }).success).toBe(false);
    expect(updateSpellGroupSchema.safeParse({ icon: "skull" }).success).toBe(false);
  });

  it("main skill role: known role or null", () => {
    expect(updateMainSkillSchema.safeParse({ role: "magic" }).success).toBe(true);
    expect(updateMainSkillSchema.safeParse({ role: null }).success).toBe(true);
    expect(updateMainSkillSchema.safeParse({ role: "wizardry" }).success).toBe(false);
  });
});
```
Run: FAIL.

- [ ] **Step 7: Розширте схеми.**
  - `lib/schemas/spells.ts`: у `spellFields` додайте `fx: SpellFxSchema.nullable().optional()`. У `createSpellGroupSchema` і `updateSpellGroupSchema` додайте `color: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().optional()` і `icon: z.enum(SPELL_GROUP_ICON_KEYS).nullable().optional()`. Якщо `updateSpellGroupSchema` зараз вимагає `name`, зробіть `name` optional, але залиште `.refine`, що хоч одне поле передане.
  - `lib/schemas/main-skills.ts`: `role: z.enum(MAIN_SKILL_ROLES).nullable().optional()` в обидві схеми.

  Run: PASS.

- [ ] **Step 8: Роути пропускають нові поля.** Перевірте, що `app/api/campaigns/[id]/spells/groups/[groupId]/route.ts` (PATCH) і `.../spells/groups/route.ts` (POST) передають у `prisma.spellGroup.update/create` `color` та `icon`, а не тільки `name`. Якщо поля вибираються вручну, додайте їх; якщо передається весь `data`, змін не треба. Те саме для spells PATCH/POST (`fx`) і main-skills PATCH/POST (`role`). Prisma `Json?` вимагає `Prisma.DbNull` для `null`: використовуйте `fx: data.fx === null ? Prisma.DbNull : data.fx`, якщо поле передано.

- [ ] **Step 9: Перевірка і коміт.**
```bash
pnpm exec tsc --noEmit && pnpm test:run lib/schemas lib/utils/battle/fx
git add prisma lib/utils/battle/fx lib/schemas lib/constants app/api
git commit -m "feat(constructor): content fields for spell fx, spell group color/icon, main skill role"
```

---

### Task 2: FX заклинання з даних замість назви

**Files:**
- Modify: `lib/utils/battle/types/spell-process.ts` (`CastableSpell`), `lib/utils/battle/spell/to-castable.ts`, `lib/utils/battle/fx/spell-preview.ts:48,90`
- Modify: `lib/utils/battle/spell/cast/state.ts:80-84`, `lib/utils/battle/spell/cast/finish.ts:94-106`
- Modify: `types/battle.ts` (`ActiveEffect.fxAura?`, `actionDetails.spellFx?`)
- Modify: `lib/utils/battle/fx/map-action.ts:36-42`, `lib/utils/battle/fx/aura.ts:49`, `components/spells/preview/SpellBattlePreview.tsx:15`
- Modify: `lib/utils/battle/fx/spells.ts`, `lib/utils/battle/fx/index.ts`
- Create: `scripts/constructor/backfill/spell-fx-by-name.ts` (переїзд таблиці)
- Modify/Move tests: `lib/utils/battle/fx/__tests__/spell-names.test.ts` → `scripts/constructor/backfill/__tests__/spell-fx-by-name.test.ts`; `map-action.test.ts`, `aura.test.ts`

**Interfaces:**
- Consumes: `SpellFx`, `SpellFxSchema` (Task 1).
- Produces:
  - `CastableSpell.fx?: SpellFx | null`;
  - `BattleAction.actionDetails.spellFx?: SpellFx`;
  - `ActiveEffect.fxAura?: FxAuraKind`;
  - `PreviewSpell.fx?: SpellFx | null`;
  - `SPELL_FX_BY_NAME: Record<string, SpellFx>` у `scripts/constructor/backfill/spell-fx-by-name.ts`.

- [ ] **Step 1: Перенесіть таблицю.** Скопіюйте об'єкт `SPELL_FX` з `lib/utils/battle/fx/spells.ts:11-55` дослівно у:
```ts
// scripts/constructor/backfill/spell-fx-by-name.ts
import type { SpellFx } from "@/lib/utils/battle/fx/spells";

export const SPELL_FX_BY_NAME: Record<string, SpellFx> = {
  // …43 записи з SPELL_FX без змін…
};
```
Перенесіть `lib/utils/battle/fx/__tests__/spell-names.test.ts` у `scripts/constructor/backfill/__tests__/spell-fx-by-name.test.ts`, замінивши `SPELL_FX`/`spellFx` на `SPELL_FX_BY_NAME` і доступ за ключем. Якщо тест перевіряє назви з `data/library`, ця перевірка лишається. Перевірте, що `vitest.config.mts` підхоплює `scripts/**/__tests__`; якщо ні, додайте `scripts/**/*.test.ts` в `include`.

- [ ] **Step 2: Тести на нову поведінку (падають).** У `lib/utils/battle/fx/__tests__/map-action.test.ts` додайте:
```ts
it("takes the spell signature from actionDetails.spellFx, not the name", () => {
  const action = spellAction({ spellName: "Рій ос", spellFx: { archetype: "bolt", element: "cold" } });

  expect(mapAction(action)[0]).toMatchObject({ archetype: "bolt", element: "cold" });
});

it("an action without spellFx falls back to the generic rules even for a known name", () => {
  const action = spellAction({ spellName: "Рій ос" });

  expect(mapAction(action)[0].archetype).not.toBe("swarm");
});
```
`spellAction` — наявний у файлі хелпер для дії-заклинання. Якщо його немає, створіть мінімальний `BattleAction` з `actionType: "spell"` за зразком найближчого тесту в тому ж файлі. Аналогічно в `aura.test.ts`:
```ts
it("uses effect.fxAura when present", () => {
  expect(auraOf(effect({ name: "Будь-що", fxAura: "stings", duration: 2 }))).toBe("stings");
});

it("an old effect without fxAura (snapshot before the deploy) gets a generic aura, no throw", () => {
  expect(() => auraOf(effect({ name: "Рій ос", duration: 2, type: "debuff" }))).not.toThrow();
  expect(auraOf(effect({ name: "Рій ос", duration: 2, type: "debuff" }))).toBe("curse");
});
```
Run: `pnpm test:run lib/utils/battle/fx`. Очікується: FAIL у нових тестах.

- [ ] **Step 3: Типи.**
  - У `CastableSpell` додайте `fx?: SpellFx | null`.
  - У `types/battle.ts`: в `ActiveEffect` додайте `fxAura?: FxAuraKind` поряд із `fxElement`; у `actionDetails` поряд із `spellName` додайте `spellFx?: SpellFx`.
  - Імпортуйте типи через `import type` з `@/lib/utils/battle/fx/types` та `.../fx/spells`. Якщо це створює цикл імпортів (`import/no-cycle`), оголосіть `SpellFx` прямо в `fx/types.ts` і реекспортуйте з `spells.ts`.

- [ ] **Step 4: Звідки береться `fx`.**
  - `to-castable.ts`: `fx: parseSpellFx(row.fx)`, де
```ts
// lib/utils/battle/fx/spell-fx-schema.ts (додати)
export function parseSpellFx(raw: unknown): SpellFx | null {
  const parsed = SpellFxSchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}
```
  - `spell-preview.ts`: `PreviewSpell` отримує `fx?: SpellFx | null`, а рядок 90 передає `fx` далі в `CastableSpell`.

- [ ] **Step 5: Сервер записує FX у дію та ефект.**
  - `state.ts` `actionOf`: `actionDetails: { spellId: spell.id, spellName: spell.name, spellLevel: spell.level, ...(spell.fx && { spellFx: spell.fx }) }`.
  - `finish.ts`: цикл у рядках 96-106 зараз ставить `fxElement` лише при `meta.spellDamageType`. Змініть умову так, щоб ефект отримував `fxElement` (якщо є `meta.spellDamageType`) і `fxAura` (якщо є `spell.fx?.aura`):
```ts
const stamp = { ...(meta.spellDamageType && { fxElement: meta.spellDamageType }), ...(spell.fx?.aura && { fxAura: spell.fx.aura }) };

if (Object.keys(stamp).length > 0) {
  for (const { id, name, targetId } of applied) {
    if (name !== spell.name) continue;

    const target = findParticipant(flow.ps, targetId);

    if (!target) continue;

    put(flow, { ...target, battleData: { ...target.battleData, activeEffects: target.battleData.activeEffects.map((e) => (e.id === id ? { ...e, ...stamp } : e)) } });
  }
}
```
  `name !== spell.name` — це не прив'язка до контенту: так ефект відрізняється від ефектів, накладених тригерами під час касту, і так було й раніше.

- [ ] **Step 6: Клієнт читає з даних.**
  - `map-action.ts`: `const signature = action.actionDetails.spellFx;` (прибрати імпорт `spellFx`).
  - `aura.ts:49`: `const named = effect.fxAura;`.
  - `SpellBattlePreview.tsx:15`: `const archetype = props.spell.fx?.archetype;`. Переконайтесь, що три виклики (`SpellBookPages.tsx:107`, `SpellReferenceCard.tsx:118`, `FxSpells.tsx:71`) передають `fx` у `PreviewSpell`. Якщо об'єкт складається вручну, додайте `fx: spell.fx`; тип клієнтського `Spell` (`types/spells.ts`) отримує `fx?: SpellFx | null`.
  - `fx/spells.ts`: лишаються тільки `SpellFx` (або реекспорт). `SPELL_FX`, `spellFx` і реекспорт у `fx/index.ts` видаляються.

- [ ] **Step 7: Прогін.**
```bash
pnpm exec tsc --noEmit && pnpm test:run lib/utils/battle scripts/constructor components/spells
```
Очікується: PASS. Якщо падає наявний тест, який чекав сигнатурну анімацію за назвою (`impact.test.ts` тощо), додайте у фікстуру дії `spellFx: SPELL_FX_BY_NAME["<та сама назва>"]`, а не змінюйте очікуване значення.

- [ ] **Step 8: Коміт.**
```bash
git add -A lib types components scripts/constructor vitest.config.mts
git commit -m "feat(constructor): spell FX read from spells.fx instead of the spell name"
```

---

### Task 3: Колір та іконка групи заклинань з даних

**Files:**
- Modify: `lib/constants/spells.ts:33-42`, `lib/utils/spells/spell-icons.ts`
- Modify (споживачі): `components/spells/book/SpellBookPages.tsx:94`, `book/SchoolTabs.tsx`, `book/SchoolHeading.tsx`, `book/SpellRow.tsx`, `lib/hooks/spells/useSchoolFilter.ts:13` (`groupSpellsBySchool`), `components/spells/list/SpellCard.tsx:43`, `list/SpellPrintCard.tsx:13`, `list/SpellGroupAccordion.tsx:38`, `components/spells/SpellDropdownContent.tsx:61`
- Create: `scripts/constructor/backfill/spell-group-look-by-name.ts`
- Test: `lib/utils/spells/__tests__/spell-icons.test.ts` (переписати), `lib/constants/__tests__/spell-school-color.test.ts`

**Interfaces:**
- Consumes: `SPELL_GROUP_ICON_KEYS`, `SPELL_GROUP_FALLBACK_COLOR` (Task 1).
- Produces:
  - `type SpellGroupLook = { color?: string | null; icon?: string | null }`;
  - `spellSchoolColor(group: SpellGroupLook | null | undefined): string`;
  - `getSpellGroupIcon(group: SpellGroupLook | null | undefined): LucideIcon`;
  - `SPELL_GROUP_LOOK_BY_NAME: Record<string, { color?: string; icon?: SpellGroupIconKey }>`.

- [ ] **Step 1: Таблиця для бекфілу.**
```ts
// scripts/constructor/backfill/spell-group-look-by-name.ts
import type { SpellGroupIconKey } from "@/lib/constants/spell-groups";

export const SPELL_GROUP_LOOK_BY_NAME: Record<string, { color?: string; icon?: SpellGroupIconKey }> = {
  Природа: { color: "#12a52b" },
  Світло: { color: "#f2b300", icon: "sun" },
  Темрява: { color: "#7a1fe6", icon: "moon" },
  Хаос: { color: "#ec1c0c", icon: "flame" },
  Dark: { icon: "moon" },
  Destr: { icon: "flame" },
  Summ: { icon: "sparkles" },
  Light: { icon: "sun" },
};
```
Іконки для Світло/Темрява/Хаос — це нове, але очевидне відображення. Решта значень дослівно з поточного коду.

- [ ] **Step 2: Тести (падають).**
```ts
// lib/constants/__tests__/spell-school-color.test.ts
import { describe, expect, it } from "vitest";

import { spellSchoolColor } from "@/lib/constants/spells";

describe("spellSchoolColor", () => {
  it("uses the group colour", () => expect(spellSchoolColor({ color: "#123456" })).toBe("#123456"));

  it("falls back for a group without colour, null, or a name-only legacy call", () => {
    expect(spellSchoolColor({ color: null })).toBe("#6d7177");
    expect(spellSchoolColor(null)).toBe("#6d7177");
  });
});
```
```ts
// lib/utils/spells/__tests__/spell-icons.test.ts (замінити вміст)
import { Moon, Shell } from "lucide-react";
import { describe, expect, it } from "vitest";

import { getSpellGroupIcon } from "@/lib/utils/spells/spell-icons";

describe("getSpellGroupIcon", () => {
  it("maps the icon key", () => expect(getSpellGroupIcon({ icon: "moon" })).toBe(Moon));

  it("unknown or missing key → Shell", () => {
    expect(getSpellGroupIcon({ icon: "skull" })).toBe(Shell);
    expect(getSpellGroupIcon(undefined)).toBe(Shell);
  });
});
```

- [ ] **Step 3: Реалізація.**
```ts
// lib/utils/spells/spell-icons.ts
import { Flame, LucideIcon, Moon, Shell, Sparkles, Sun } from "lucide-react";

import type { SpellGroupIconKey } from "@/lib/constants/spell-groups";

export type SpellGroupLook = { color?: string | null; icon?: string | null };

const ICONS: Record<SpellGroupIconKey, LucideIcon> = { moon: Moon, flame: Flame, sparkles: Sparkles, sun: Sun, shell: Shell };

export function getSpellGroupIcon(group: SpellGroupLook | null | undefined): LucideIcon {
  return (group?.icon && Object.hasOwn(ICONS, group.icon) ? ICONS[group.icon as SpellGroupIconKey] : undefined) ?? Shell;
}
```
```ts
// lib/constants/spells.ts — замість SPELL_SCHOOL_COLORS/spellSchoolColor
export function spellSchoolColor(group: { color?: string | null } | null | undefined): string {
  return group?.color || SPELL_GROUP_FALLBACK_COLOR;
}
```

- [ ] **Step 4: Споживачі.** Скрізь, де передається назва, передавайте об'єкт групи:
  - `SpellCard`, `SpellPrintCard`: `getSpellGroupIcon(spell.spellGroup)`;
  - `SpellBookPages`: `spellSchoolColor(spell.spellGroup)`;
  - `SpellGroupAccordion`: знайдіть групу в пропі `spellGroups` за id і передайте її;
  - `SpellDropdownContent`: передайте групу з мапи, з якої береться displayName.

  `groupSpellsBySchool` (`useSchoolFilter.ts`) нехай повертає в кожній групі також `color` (з `spell.spellGroup?.color`). `SchoolTabs`, `SchoolHeading` і `SpellRow` отримують `school: { name: string; color?: string | null }` замість рядка і рахують колір через `spellSchoolColor(school)`. Переконайтесь, що запити, які віддають заклинання з `spellGroup`, повертають `color` та `icon`: `include: { spellGroup: true }` повертає всі поля, але `select: { spellGroup: { select: { id, name } } }` треба розширити. Знайти такі місця: `grep -rn "spellGroup: { select" lib app`.

- [ ] **Step 5: Прогін і коміт.**
```bash
pnpm exec tsc --noEmit && pnpm test:run lib/utils/spells lib/constants components/spells lib/hooks/spells
git add -A && git commit -m "feat(constructor): spell group colour and icon come from the group row"
```

---

### Task 4: Роль гілки (`main_skills.role`) замість назв

**Files:**
- Modify: `lib/utils/battle/balance/magic-school.ts`, `lib/utils/battle/balance/dpr.ts:7-11`, `lib/utils/battle/balance/hero-power.ts:18-22`, `lib/utils/battle/types/participant.ts:35` (`campaignContext.mainSkills`)
- Modify: `lib/constants/dpr-by-main-skill.ts` (видалити `MAGIC_MAIN_SKILL_IDS`, `MAGIC_MAIN_SKILL_NAME_ALIASES`; `DPR_BY_LEVEL_*` лишаються)
- Modify: `components/characters/abilities/CharacterAbilitiesSection.tsx:22`
- Modify: `lib/constants/main-skills.ts` (видалити `MAIN_SKILL_BY_CATEGORY`, `MAIN_SKILL_ALIASES`, `getCanonicalMainSkillName`, `getMainSkillNameVariants`, якщо після переносу ними користуються тільки скрипти)
- Create: `scripts/constructor/backfill/main-skill-role-by-name.ts`
- Test: `lib/utils/battle/balance/__tests__/magic-school.test.ts` (новий), `dpr.test.ts`, `stats.test.ts`, `components/characters/abilities/__tests__/character-abilities-section.test.tsx`

**Interfaces:**
- Consumes: `MainSkillRole` (Task 1).
- Produces:
  - `magicMainSkillIds(mainSkills: Array<{ id: string; role?: string | null; spellGroupId?: string | null }>): Set<string>`;
  - `getSpellDprFromBranchLevels(levels, magicMainSkillIds: Set<string>)` (параметр обов'язковий);
  - `MAIN_SKILL_ROLE_BY_NAME: Record<string, MainSkillRole>`;
  - `campaignContext.mainSkills: { id; spellGroupId; name; role }[]`.

- [ ] **Step 1: Таблиця для бекфілу.** Перенесіть знання з `MAIN_SKILL_BY_CATEGORY`, `MAIN_SKILL_ALIASES` і `MAGIC_MAIN_SKILL_NAME_ALIASES`:
```ts
// scripts/constructor/backfill/main-skill-role-by-name.ts
import type { MainSkillRole } from "@/lib/constants/main-skills";

const normalize = (name: string) => name.toLowerCase().trim().replace(/\s+/g, " ");

const TABLE: Record<string, MainSkillRole> = {
  напад: "attack",
  стрільба: "ranged",
  захист: "defense",
  "магія світла": "magic",
  "магія темряви": "magic",
  "магія хаосу": "magic",
  "магія призиву": "magic",
  "темна магія": "magic",
  світло: "magic",
  темрява: "magic",
  хаос: "magic",
  призив: "magic",
  сорсерія: "magic",
  лідерство: "leadership",
  раса: "race",
  ультимат: "ultimate",
  персональні: "personal",
};

export function mainSkillRoleByName(name: string): MainSkillRole | null {
  return TABLE[normalize(name).replace(/_/g, " ")] ?? null;
}
```
Перенесіть сюди й тест: `scripts/constructor/backfill/__tests__/main-skill-role-by-name.test.ts`. Він перевіряє `"Магія Світла"→magic`, `"магія_хаосу"→magic`, `"Персональні"→personal`, `"Щось"→null`.

- [ ] **Step 2: Тест `magic-school` (падає).**
```ts
// lib/utils/battle/balance/__tests__/magic-school.test.ts
import { describe, expect, it } from "vitest";

import { magicMainSkillIds } from "@/lib/utils/battle/balance/magic-school";

describe("magicMainSkillIds", () => {
  it("role magic or a linked spell group counts as magic; the name does not", () => {
    const ids = magicMainSkillIds([
      { id: "a", role: "magic" },
      { id: "b", role: null, spellGroupId: "g1" },
      { id: "c", role: "attack" },
      { id: "d", role: null, spellGroupId: null },
    ]);

    expect([...ids].sort()).toEqual(["a", "b"]);
  });

  it("empty campaign → empty set", () => expect(magicMainSkillIds([]).size).toBe(0));
});
```

- [ ] **Step 3: Реалізація.**
```ts
// lib/utils/battle/balance/magic-school.ts
export function magicMainSkillIds(mainSkills: Array<{ id: string; role?: string | null; spellGroupId?: string | null }>): Set<string> {
  return new Set(mainSkills.filter((ms) => ms.role === "magic" || !!ms.spellGroupId).map((ms) => ms.id));
}
```
`isMagicMainSkill` видаляється.
  - `dpr.ts`: `const isMagic = (id: string, magicMainSkillIds: Set<string>) => magicMainSkillIds.has(id);`, параметр `getSpellDprFromBranchLevels` обов'язковий.
  - `hero-power.ts`: `spellSchoolIds` уже рахує `spellGroupId`, тож лишіть один набір `magicMainSkillIds(mainSkills)` і передавайте його туди, куди зараз іде об'єднання.
  - У `campaignContext.mainSkills` додайте `role` і там, де контекст будується з Prisma (`grep -rn "mainSkills:" lib/utils/battle app/api | grep -i select`), додайте `role: true` у select.

- [ ] **Step 4: Наявні тести balance.** `dpr.test.ts` і `stats.test.ts` могли покладатися на id `"sorcery"` або назву «Магія Світла» без set. Якщо падають, у фікстурах додайте `role: "magic"` гілці або передайте `new Set(["sorcery"])` — саме як дані, а не новий рядок у коді. Очікувані числа не змінюйте.

- [ ] **Step 5: Персональна гілка.** У `CharacterAbilitiesSection.tsx:22`: `mainSkills.find((ms) => ms.role === "personal")?.id`. У тесті цього компонента фікстурі персональної гілки додайте `role: "personal"`.

- [ ] **Step 6: Прибирання констант.** `grep -rn "MAIN_SKILL_BY_CATEGORY\|MAIN_SKILL_ALIASES\|getCanonicalMainSkillName\|getMainSkillNameVariants\|MAGIC_MAIN_SKILL" lib app components scripts`. Якщо лишилися лише `scripts/import/import-skills-library.ts` (застарілий імпорт), перенесіть потрібні йому константи в сам скрипт і видаліть їх з `lib/constants`. Рядок `name: "Раса"` у `skills/progression/tree-json.ts:73` і `edit.ts:59` — це підпис вбудованої гілки `RACIAL_BRANCH_ID`, а не контент, тому лишається.

- [ ] **Step 7: Прогін і коміт.**
```bash
pnpm exec tsc --noEmit && pnpm test:run lib/utils/battle/balance components/characters scripts/constructor
git add -A && git commit -m "feat(constructor): main skill role replaces name/alias lists for magic and personal branches"
```

---

### Task 5: Ініціатива без імен героїв

**Files:**
- Modify: `lib/utils/battle/turn/initiative.ts:10-29`
- Create: `scripts/constructor/backfill/always-first.ts`
- Test: `lib/utils/battle/turn/__tests__/initiative.test.ts` (новий або наявний), `scripts/constructor/backfill/__tests__/always-first.test.ts`

**Interfaces:**
- Produces:
  - `ALWAYS_FIRST_ABILITY: Ability` (passive, `modifyStat initiative flat 999`, `id: "constructor-always-first"`, `name: "Завжди першим"`);
  - `withAlwaysFirst(abilities: unknown): { abilities: Ability[]; changed: boolean }` — ідемпотентно додає здібність;
  - `isAlwaysFirstName(name: string): boolean` — правило за назвою, тільки для бекфілу.

- [ ] **Step 1: Тести рушія (падають).**
```ts
// lib/utils/battle/turn/__tests__/initiative.test.ts
import { describe, expect, it } from "vitest";

import { calculateInitiative } from "@/lib/utils/battle/turn/initiative";
import { makeParticipant } from "@/lib/utils/battle/__tests__/helpers"; // наявна фабрика; якщо інша назва — використайте ту, що в сусідніх тестах turn/

describe("calculateInitiative", () => {
  it("does not special-case names any more", () => {
    const p = makeParticipant({ name: "Файдаен", baseInitiative: 12 });

    expect(calculateInitiative(p)).toBe(12);
  });
});
```

- [ ] **Step 2: Видаліть хардкод.** У `calculateInitiative` лишається тільки рядок `return participant.abilities.baseInitiative + collectModifiers(...).flat;`, а коментар і змінні `nameLower`/`raceLower` прибираються.

- [ ] **Step 3: Бекфіл-функції.**
```ts
// scripts/constructor/backfill/always-first.ts
import type { Ability } from "@/lib/utils/abilities/schema";
import { readAbilities } from "@/lib/utils/abilities/read";

export const ALWAYS_FIRST_ABILITY = {
  id: "constructor-always-first",
  name: "Завжди першим",
  trigger: { event: "passive" },
  effects: [{ kind: "modifyStat", stat: "initiative", flat: 999, target: "self" }],
} as Ability;

const NAMES = ["фајдаен", "файдаен", "айвен", "iven"];

export const isAlwaysFirstName = (name: string) => NAMES.some((n) => name.toLowerCase().includes(n));

export function withAlwaysFirst(abilities: unknown): { abilities: Ability[]; changed: boolean } {
  const list = readAbilities(abilities);

  if (list.some((a) => a.id === ALWAYS_FIRST_ABILITY.id)) return { abilities: list, changed: false };

  return { abilities: [...list, ALWAYS_FIRST_ABILITY], changed: true };
}
```
Перевірте точну форму ефекту `modifyStat` у `lib/utils/abilities/schema/effects.ts` (назви полів `stat`, `flat`/`value`, `target`/`appliesTo`) і приведіть об'єкт до неї. Тест має пропускати `ALWAYS_FIRST_ABILITY` через `AbilitySchema.parse`. Ім'я реального рідера в `read.ts` — те, яким читають колонку `abilities`.

```ts
// scripts/constructor/backfill/__tests__/always-first.test.ts
import { describe, expect, it } from "vitest";

import { AbilitySchema } from "@/lib/utils/abilities/schema";

import { ALWAYS_FIRST_ABILITY, isAlwaysFirstName, withAlwaysFirst } from "../always-first";

describe("always-first backfill", () => {
  it("is a valid ability", () => expect(() => AbilitySchema.parse(ALWAYS_FIRST_ABILITY)).not.toThrow());

  it("matches the old hardcoded names", () => {
    expect(isAlwaysFirstName("Файдаен")).toBe(true);
    expect(isAlwaysFirstName("Iven the Bold")).toBe(true);
    expect(isAlwaysFirstName("Годрік")).toBe(false);
  });

  it("is idempotent", () => {
    const once = withAlwaysFirst([]);
    const twice = withAlwaysFirst(once.abilities);

    expect(once.changed).toBe(true);
    expect(twice.changed).toBe(false);
    expect(twice.abilities).toHaveLength(1);
  });
});
```

- [ ] **Step 4: Тест «здібність працює в бою».** У `initiative.test.ts` додайте: учасник, зібраний з юніта (`buildParticipantFromUnit` або фабрика з `participant/__tests__`) з `abilities: [ALWAYS_FIRST_ABILITY]` і `initiative 12`, має `calculateInitiative(p) === 1011` (999 вбудовується в `baseInitiative` через `bakePassives`), а в `sortByInitiative` іде першим. Імпортуйте `ALWAYS_FIRST_ABILITY` зі скрипта.

  Зміна поведінки відома й прийнятна: раніше ініціатива дорівнювала рівно 999, тепер це 999 + база.

- [ ] **Step 5: Прогін і коміт.**
```bash
pnpm test:run lib/utils/battle scripts/constructor
git add -A && git commit -m "feat(constructor): drop name-based initiative 999; backfill gives an always-first ability"
```

---

### Task 6: «Ельфійське око» як здібність раси

**Files:**
- Modify: `lib/utils/battle/attack/bonus.ts:42-46`
- Create: `scripts/constructor/backfill/elf-eye.ts`
- Test: `lib/utils/battle/attack/__tests__/bonus-elf.test.ts` (новий), `scripts/constructor/backfill/__tests__/elf-eye.test.ts`

**Interfaces:**
- Produces:
  - `ELF_EYE_ABILITY: Ability` = `{ id: "constructor-elf-eye", name: "Ельфійське око", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "advantage", attackKind: "ranged" }] }` — **без** `condition`: пасивні умови виконуються з `event: null`, і `attackKind` там завжди хибний;
  - `isElfRaceName(name: string): boolean` (`/elf|ельф/i`);
  - `withElfEye(abilities: unknown): { abilities: Ability[]; changed: boolean }`.

- [ ] **Step 1: Тести (падають).**
```ts
// lib/utils/battle/attack/__tests__/bonus-elf.test.ts
import { describe, expect, it } from "vitest";

import { rollModeReasons } from "@/lib/utils/battle/attack/bonus";
import { ELF_EYE_ABILITY } from "@/scripts/constructor/backfill/elf-eye";
// фабрики учасника/атаки — ті самі, що в сусідніх attack/__tests__

describe("elf eye", () => {
  it("a race named elf without the ability gets no advantage", () => {
    const elf = participant({ race: "elf", resolvedAbilities: [] });

    expect(rollModeReasons(elf, rangedAttack, [elf, target], {}).advantage).toEqual([]);
  });

  it("the ability gives advantage on ranged, not on melee", () => {
    const anyone = participant({ race: "human", resolvedAbilities: [resolved(ELF_EYE_ABILITY)] });

    expect(rollModeReasons(anyone, rangedAttack, [anyone, target], {}).advantage).toContain("Ельфійське око");
    expect(rollModeReasons(anyone, meleeAttack, [anyone, target], {}).advantage).toEqual([]);
  });
});
```
Точна сигнатура `rollModeReasons` і форма результату — у `bonus.ts`; приведіть тест до неї. `resolved()` — хелпер, що перетворює `Ability` на `ResolvedAbility` (знайдіть наявний у `abilities/__tests__` або зберіть через `collectUnitAbilities`).

- [ ] **Step 2: Видаліть хардкод.** У `bonus.ts` приберіть рядок `...(attacker.abilities.race?.toLowerCase().includes("elf") && kind === AttackType.RANGED ? ["Ельфійське око"] : []),`. Якщо `AttackType` більше не використовується, приберіть імпорт.

- [ ] **Step 3: Бекфіл-функції** за зразком Task 5 (`withElfEye` ідемпотентний за `id`). Тест: `AbilitySchema.parse(ELF_EYE_ABILITY)` проходить; `isElfRaceName("Лісові ельфи")`, `isElfRaceName("Elf")` повертають true, `isElfRaceName("Гноми")` — false; повторне застосування не дублює.

- [ ] **Step 4: Прогін і коміт.**
```bash
pnpm test:run lib/utils/battle/attack scripts/constructor
git add -A && git commit -m "feat(constructor): elf ranged advantage is a race ability, not a race-name check"
```

---

### Task 7: Рівень скіла без визначення за назвою

**Files:**
- Modify: `lib/utils/abilities/build/resolve.ts:15-19`
- Delete: `inferLevelFromSkillName` з `lib/utils/battle/participant/parse.ts` (весь файл, якщо в ньому більше нічого немає)
- Test: `lib/utils/abilities/build/__tests__/resolve.test.ts` (новий або наявний)

**Interfaces:**
- Produces: `isLevelLine(source) = source.line?.levelNode === true`.

Бекфіл для цієї задачі не потрібен. `levelNode` ставить `extract-skills.ts:74` для кожного нового знімка, а запасний варіант за назвою працював лише для знімків, зроблених до появи `levelNode`.

- [ ] **Step 1: Тест (падає).**
```ts
it("a line without levelNode is not a level line even if the name says «Експерт»", () => {
  const picked = pickHighestPerLine([
    source({ id: "s1", name: "Напад — Експерт", line: { mainSkillId: "m", level: "expert" } }),
    source({ id: "s2", name: "Напад — Базовий", line: { mainSkillId: "m", level: "basic" } }),
  ]);

  expect(picked.map((s) => s.id).sort()).toEqual(["s1", "s2"]);
});
```
`source()` — мінімальний `AbilitySource` за типом з `types/abilities.ts`; `pickHighestPerLine` експортуйте, якщо зараз він приватний.

- [ ] **Step 2: Реалізація.** `return source.line?.levelNode === true;`. Видаліть імпорт і саму функцію `inferLevelFromSkillName` (`grep -rn inferLevelFromSkillName` має бути порожнім).

- [ ] **Step 3: Прогін і коміт.**
```bash
pnpm test:run lib/utils/abilities lib/utils/battle/participant
git add -A && git commit -m "feat(constructor): skill level lines come only from levelNode"
```

---

### Task 8: Імунітети раси зі здібностей, а не з тексту

**Files:**
- Modify: `lib/utils/races/race-effects.ts` (видалити `extractRaceImmunities`; `getUnitImmunities` лишає тільки `unit.immunities`)
- Modify: `lib/utils/characters/character-race-effects.ts:7` (`getCharacterImmunities` без тексту раси)
- Move: `lib/constants/immunities.ts` → `scripts/constructor/backfill/race-immunities-from-text.ts` (разом із логікою парсингу)
- Modify: callers — `participant/from-unit.ts:147`, `from-character.ts:93`, `app/api/.../sheet/sheet-handler.ts:47`, `components/units/list/UnitCard.tsx:54`, `components/units/form/UnitImmunities.tsx:25,27`
- Test: `lib/utils/races/__tests__/race-immunities.test.ts` (переписати), `scripts/constructor/backfill/__tests__/race-immunities-from-text.test.ts`

**Interfaces:**
- Consumes: `immunityAbilities(strings)` з `lib/utils/abilities/build/immunities.ts` (лишається: перетворює `unit.immunities` на здібність).
- Produces:
  - `raceImmunityAbility(race: { passiveAbility?: unknown; abilities?: unknown }): Ability | null` — для бекфілу; повертає `null`, якщо `abilities` раси непорожні або текст без імунітетів;
  - `getUnitImmunities(unit: Unit): string[]`;
  - `getCharacterImmunities(...)` без раси.

- [ ] **Step 1: Перенесіть парсер.** Скопіюйте тіло `extractRaceImmunities` і константи `COMMON_IMMUNITIES`/`IMMUNITY_PATTERNS` у `scripts/constructor/backfill/race-immunities-from-text.ts`. Перейменуйте в `parseRaceImmunityText(race): string[]`, поведінку не змінюйте. Додайте:
```ts
export function raceImmunityAbility(race: { passiveAbility?: unknown; abilities?: unknown }): Ability | null {
  if (Array.isArray(race.abilities) && race.abilities.length > 0) return null;

  const strings = parseRaceImmunityText(race);

  return strings.length > 0 ? immunityAbilities(strings)[0] ?? null : null;
}
```
Звірте форму результату `immunityAbilities` (масив `ResolvedAbility` чи `Ability`?). Для запису в колонку `abilities` потрібен `Ability`, без `source`/`key` — відкиньте ці поля, якщо вони там є. Перенесіть `lib/utils/races/__tests__/race-immunities.test.ts` у бекфіл-тест, адаптувавши імпорти, і додайте:
```ts
it("race with non-empty abilities and immunity text → null (as today: text ignored)", () => {
  expect(raceImmunityAbility({ passiveAbility: "Імунітет до вогню", abilities: [{ id: "x" }] })).toBeNull();
});

it("race without abilities and with «імунітет до вогню» → fire resistance ability", () => {
  const a = raceImmunityAbility({ passiveAbility: "Імунітет до вогню", abilities: [] });

  expect(JSON.stringify(a)).toContain("fire");
});
```

- [ ] **Step 2: Рушій без тексту.** У `race-effects.ts` `getUnitImmunities(unit)` повертає `Array.isArray(unit.immunities) ? unit.immunities : []`. Параметр `race` приберіть і оновіть усі виклики, а `extractRaceImmunities` видаліть. Те саме для `getCharacterImmunities`. Видаліть `lib/constants/immunities.ts`. У `lib/utils/races/__tests__/race-immunities.test.ts` лишіть тест: «раса з текстом "Імунітет до вогню" більше не дає юніту імунітету, тільки `unit.immunities`».

- [ ] **Step 3: Прогін і коміт.**
```bash
pnpm exec tsc --noEmit && pnpm test:run lib/utils/races lib/utils/abilities lib/utils/battle/participant components/units scripts/constructor
git add -A && git commit -m "feat(constructor): race immunities are race abilities; text parsing moves to the backfill"
```

---

### Task 9: Раннер бекфілу

**Files:**
- Create: `scripts/constructor/backfill/plan.ts` (чиста функція: рядки кампанії → список змін)
- Create: `scripts/constructor/backfill-content-fields.ts` (раннер: Prisma, `--dry-run`, звіт)
- Modify: `package.json` (`"constructor:backfill": "tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/constructor/backfill-content-fields.ts"`)
- Test: `scripts/constructor/backfill/__tests__/plan.test.ts`

**Interfaces:**
- Consumes: `SPELL_FX_BY_NAME`, `SPELL_GROUP_LOOK_BY_NAME`, `mainSkillRoleByName`, `withAlwaysFirst`/`isAlwaysFirstName`, `withElfEye`/`isElfRaceName`, `raceImmunityAbility`.
- Produces:
```ts
export type CampaignRows = {
  spells: { id: string; name: string; fx: unknown }[];
  spellGroups: { id: string; name: string; color: string | null; icon: string | null }[];
  mainSkills: { id: string; name: string; role: string | null }[];
  races: { id: string; name: string; abilities: unknown; passiveAbility: unknown }[];
  units: { id: string; name: string; abilities: unknown }[];
  personalSkills: { id: string; characterName: string; abilities: unknown }[];
};

export type Change =
  | { table: "spell"; id: string; data: { fx: SpellFx } }
  | { table: "spellGroup"; id: string; data: { color?: string; icon?: string } }
  | { table: "mainSkill"; id: string; data: { role: MainSkillRole } }
  | { table: "race" | "unit" | "skill"; id: string; data: { abilities: Ability[] }; reason: string };

export function planBackfill(rows: CampaignRows): { changes: Change[]; warnings: string[] };
```

- [ ] **Step 1: Тест (падає).**
```ts
// scripts/constructor/backfill/__tests__/plan.test.ts
import { describe, expect, it } from "vitest";

import { planBackfill, type CampaignRows } from "../plan";

const empty: CampaignRows = { spells: [], spellGroups: [], mainSkills: [], races: [], units: [], personalSkills: [] };

describe("planBackfill", () => {
  it("fills empty fields by name", () => {
    const { changes } = planBackfill({
      ...empty,
      spells: [{ id: "s", name: "Рій ос", fx: null }],
      spellGroups: [{ id: "g", name: "Темрява", color: null, icon: null }],
      mainSkills: [{ id: "m", name: "Магія Світла", role: null }],
      races: [{ id: "r", name: "Ельфи", abilities: [], passiveAbility: "Імунітет до вогню" }],
      units: [{ id: "u", name: "Файдаен", abilities: [] }],
    });

    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "spell", id: "s" }),
      expect.objectContaining({ table: "spellGroup", id: "g", data: { color: "#7a1fe6", icon: "moon" } }),
      expect.objectContaining({ table: "mainSkill", id: "m", data: { role: "magic" } }),
      expect.objectContaining({ table: "race", id: "r" }),
      expect.objectContaining({ table: "unit", id: "u" }),
    ]));
  });

  it("race gets elf eye AND immunities in one change (abilities merged, immunity computed from the original row)", () => {
    const { changes } = planBackfill({ ...empty, races: [{ id: "r", name: "Ельфи", abilities: [], passiveAbility: "Імунітет до вогню" }] });
    const race = changes.filter((c) => c.table === "race");

    expect(race).toHaveLength(1);
    expect((race[0].data as { abilities: unknown[] }).abilities).toHaveLength(2);
  });

  it("never overwrites filled fields and is idempotent", () => {
    const rows: CampaignRows = {
      ...empty,
      spells: [{ id: "s", name: "Рій ос", fx: { archetype: "bolt" } }],
      spellGroups: [{ id: "g", name: "Темрява", color: "#000000", icon: "sun" }],
      mainSkills: [{ id: "m", name: "Магія Світла", role: "attack" }],
    };

    expect(planBackfill(rows).changes).toEqual([]);
  });

  it("unknown names produce no changes", () => {
    expect(planBackfill({ ...empty, spells: [{ id: "s", name: "Новий спел", fx: null }] }).changes).toEqual([]);
  });
});
```

- [ ] **Step 2: Реалізація `plan.ts`.** Для кожної таблиці:
  - змінювати лише порожні поля (`fx == null`, `color == null`, `icon == null`, `role == null`);
  - раси: імунітет рахується з **вихідного** рядка (до додавання «Ока»), щоб правило «непорожні abilities → без імунітету» стосувалося стану до бекфілу; потім послідовно `withElfEye` (якщо `isElfRaceName`), додавання здібності імунітету (якщо її `id` ще немає) і `withAlwaysFirst` (якщо `name.toLowerCase() === "фајдаен"`). Виходить одна `Change` на расу, якщо хоч щось змінилося;
  - юніти: `withAlwaysFirst` за `isAlwaysFirstName(name)`;
  - персональні скіли героїв: `withAlwaysFirst` за `isAlwaysFirstName(characterName)`;
  - `warnings`: героїв із «завжди першим» ім'ям без персонального скіла не можна обробити автоматично; додайте рядок «Герой X: немає персонального скіла — додайте здібність вручну».

  Здібність імунітету отримує фіксований `id: "constructor-race-immunities"`, щоб повторний запуск її не дублював.

- [ ] **Step 3: Раннер.**
```ts
#!/usr/bin/env tsx
// scripts/constructor/backfill-content-fields.ts
// pnpm constructor:backfill <campaignId|--all> [--dry-run] [--allow-remote]
import type { Prisma } from "@prisma/client";

import { assertSeedTarget } from "../seed/seed-library-lib";
import { planBackfill } from "./backfill/plan";

import { prisma } from "@/lib/db";

async function loadRows(campaignId: string) {
  const [spells, spellGroups, mainSkills, races, units, characters] = await Promise.all([
    prisma.spell.findMany({ where: { campaignId }, select: { id: true, name: true, fx: true } }),
    prisma.spellGroup.findMany({ where: { campaignId }, select: { id: true, name: true, color: true, icon: true } }),
    prisma.mainSkill.findMany({ where: { campaignId }, select: { id: true, name: true, role: true } }),
    prisma.race.findMany({ where: { campaignId }, select: { id: true, name: true, abilities: true, passiveAbility: true } }),
    prisma.unit.findMany({ where: { campaignId }, select: { id: true, name: true, abilities: true } }),
    prisma.character.findMany({ where: { campaignId, personalSkillId: { not: null } }, select: { name: true, personalSkillId: true } }),
  ]);

  const skills = await prisma.skill.findMany({ where: { id: { in: characters.map((c) => c.personalSkillId!) } }, select: { id: true, abilities: true } });

  const personalSkills = characters.map((c) => ({ id: c.personalSkillId!, characterName: c.name, abilities: skills.find((s) => s.id === c.personalSkillId)?.abilities ?? [] }));

  return { spells, spellGroups, mainSkills, races, units, personalSkills };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  const target = args.find((a) => !a.startsWith("--"));
  const ids = args.includes("--all") ? (await prisma.campaign.findMany({ select: { id: true } })).map((c) => c.id) : target ? [target] : [];

  if (ids.length === 0) throw new Error("usage: constructor:backfill <campaignId|--all> [--dry-run]");

  for (const campaignId of ids) {
    const { changes, warnings } = planBackfill(await loadRows(campaignId));

    console.log(`\n${campaignId}: ${changes.length} змін`);
    for (const c of changes) console.log(`  ${c.table} ${c.id} ${"reason" in c ? c.reason : JSON.stringify(c.data)}`);
    for (const w of warnings) console.warn(`  ⚠ ${w}`);

    if (dryRun || changes.length === 0) continue;

    await prisma.$transaction(changes.map((c) => {
      const data = c.data as Prisma.InputJsonObject;

      switch (c.table) {
        case "spell": return prisma.spell.update({ where: { id: c.id }, data });
        case "spellGroup": return prisma.spellGroup.update({ where: { id: c.id }, data });
        case "mainSkill": return prisma.mainSkill.update({ where: { id: c.id }, data });
        case "race": return prisma.race.update({ where: { id: c.id }, data });
        case "unit": return prisma.unit.update({ where: { id: c.id }, data });
        case "skill": return prisma.skill.update({ where: { id: c.id }, data });
      }
    }));
  }

  console.log("\nКеш довідників оновиться протягом 300 с (скрипт не інвалідує Next data cache).");
}

main().finally(() => prisma.$disconnect());
```
Звірте назву поля `personalSkillId` у моделі `Character` (`prisma/schema.prisma:73`) і сигнатуру `assertSeedTarget`. Якщо `ts` скаржиться на тип `data`, приведіть кожну гілку до відповідного `Prisma.<Model>UpdateInput`.

- [ ] **Step 4: Прогін тестів, коміт.**
```bash
pnpm test:run scripts/constructor
git add -A && git commit -m "feat(constructor): content-field backfill (dry-run report, idempotent)"
```

- [ ] **Step 5: Запуск на `constructor`.**
```bash
pnpm constructor:backfill --all --dry-run | tee /tmp/backfill-dry.txt
```
Перевірте звіт: є зміни для заклинань із `SPELL_FX_BY_NAME`, груп Природа/Світло/Темрява/Хаос, гілок, раси ельфів, Файдаен та Айвен (раса, юніт або персональний скіл), рас з імунітетом у тексті. Попередження про героїв без персонального скіла передайте користувачу. Потім:
```bash
pnpm constructor:backfill --all && pnpm constructor:backfill --all --dry-run | grep -c "0 змін"
```
Очікується: після реального запуску dry-run показує «0 змін» для кожної кампанії (ідемпотентність на живих даних).

---

### Task 10: Редактори

**Files:**
- Create: `components/spells/form/SpellFxFields.tsx`; Modify: `components/spells/form/SpellFormBasicFields.tsx` (або вкладка в `spell-form-tabs.ts`), `lib/utils/spells/model/form.ts` (`fx` у `defaultSpellForm`/`spellToForm`/`formToPayload`)
- Create: `app/campaigns/[id]/dm/spell-groups/page.tsx`, `components/spells/groups/SpellGroupList.tsx`, `components/spells/groups/SpellGroupDialog.tsx`
- Modify: `lib/api/spells.ts` (`updateSpellGroup(campaignId, groupId, { name?, color?, icon? })` замість або поряд із `renameSpellGroup`), `lib/hooks/spells/useSpells.ts` (`useUpdateSpellGroup`)
- Modify: `components/main-skills/MainSkillFormFields.tsx`, `lib/hooks/skills/useMainSkillForm.ts` (`role`)
- Modify: навігація DM (там, де посилання на `dm/spells`; `grep -rn "dm/spells\"" components app`)
- Test: `lib/utils/spells/model/__tests__/form-fx.test.ts`, `components/spells/groups/__tests__/spell-group-dialog.test.tsx`

**Interfaces:**
- Consumes: `FX_ARCHETYPES`, `FX_ELEMENTS`, `FX_AURA_KINDS`, `SPELL_GROUP_ICON_KEYS`, `MAIN_SKILL_ROLES`, `MAIN_SKILL_ROLE_LABELS`.
- Produces: `useUpdateSpellGroup(campaignId)` — мутація з інвалідацією `spellKeys` для груп і заклинань.

- [ ] **Step 1: Тест мапінгу форми (падає).**
```ts
// lib/utils/spells/model/__tests__/form-fx.test.ts
import { describe, expect, it } from "vitest";

import { defaultSpellForm, formToPayload, spellToForm } from "@/lib/utils/spells/model/form";

describe("spell form fx", () => {
  it("round-trips fx", () => {
    const form = spellToForm({ ...minimalSpell, fx: { archetype: "swarm", aura: "stings" } });

    expect(formToPayload(form).fx).toEqual({ archetype: "swarm", aura: "stings" });
  });

  it("an empty fx form sends null (clears the column)", () => {
    expect(formToPayload({ ...defaultSpellForm(), fx: {} }).fx).toBeNull();
  });
});
```
`minimalSpell` візьміть з наявних тестів `model/__tests__`. Реалізуйте в `form.ts`: `fx: spell.fx ?? {}` у формі; у payload — `Object.values(fx).some(Boolean) ? fx : null`.

- [ ] **Step 2: `SpellFxFields`.** Три `Select` (shadcn з `components/ui`) — «Анімація», «Стихія», «Аура»; у кожному першим варіантом «Авто» (значення `undefined`), далі значення з `FX_*`. Пропси `{ value: SpellFx; onChange: (fx: SpellFx) => void }`. Поряд — кнопка «Переглянути», яка відкриває наявний `SpellBattlePreview` з поточним `fx`, якщо в редакторі вже є прев'ю; якщо немає, кнопку не додавати. Підключіть у вкладку «Основне» форми заклинання під рядком групи.

- [ ] **Step 3: Сторінка груп.**
  - `dm/spell-groups/page.tsx` — серверна сторінка за зразком `app/campaigns/[id]/dm/main-skills/page.tsx` (guard ДМ, `HudPage` + `HudPageHeader` «Школи магії»).
  - `SpellGroupList` використовує `useSpellGroups(campaignId)`, `QueryState`, по `HudCard` на групу: кольоровий кружок, іконка (`getSpellGroupIcon(group)`), назва, кнопка «Редагувати».
  - `SpellGroupDialog` — `ResponsiveDialog hud` з формою: Назва; Колір (`<input type="color">`); Іконка — 5 кнопок-іконок з `SPELL_GROUP_ICON_KEYS`, обрана підсвічена; кнопка «Зберегти» у `footer` з `form="spell-group-form"`, яка викликає `useUpdateSpellGroup`.
  - Додайте посилання «Школи магії» поруч із «Заклинання» в DM-навігації.

  Компонентний тест (`// @vitest-environment happy-dom`, рендер в `ConfirmProvider` через `components/ui/__tests__/render-with-confirm.tsx`, хук замоканий): вибір іконки `moon` і кольору `#123456` → мутація отримує `{ name, color: "#123456", icon: "moon" }`.

- [ ] **Step 4: Роль гілки.** У `MainSkillFormFields.tsx` додайте `Select` «Роль» зі значеннями `MAIN_SKILL_ROLES` (підписи — `MAIN_SKILL_ROLE_LABELS`) і «Без ролі» (`null`); `useMainSkillForm` передає `role`. Підказка під полем: «Магія — рахується як магічна школа в балансі; Персональні — гілка особистих скілів героя».

- [ ] **Step 5: Прогін, lint, коміт.**
```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test:run lib/utils/spells components/spells components/main-skills
git add -A && git commit -m "feat(constructor): editors for spell fx, spell schools (colour/icon) and main skill role"
```

---

### Task 11: Захист від регресу — назви контенту в коді

**Files:**
- Create: `lib/__tests__/no-content-names.test.ts`

- [ ] **Step 1: Тест.**
```ts
// lib/__tests__/no-content-names.test.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildLibrary } from "@/data/library/build";

const ROOTS = ["lib/utils", "lib/constants", "components/battle"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);

    if (statSync(p).isDirectory()) return f === "__tests__" ? [] : files(p);

    return /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe("engine has no content names", () => {
  it("no library race/unit/spell/branch name appears as a string literal", () => {
    const lib = buildLibrary();
    const names = [...lib.races, ...lib.units, ...lib.spells, ...lib.branches].map((x) => x.name).filter((n) => n.length >= 4);
    const offenders: string[] = [];

    for (const file of ROOTS.flatMap(files)) {
      const src = readFileSync(file, "utf8");

      for (const name of names) if (src.includes(`"${name}"`) || src.includes(`'${name}'`)) offenders.push(`${file}: ${name}`);
    }

    expect(offenders).toEqual([]);
  });
});
```
Звірте форму результату `buildLibrary()` (`data/library/build.ts`): назви полів масивів можуть відрізнятися. Візьміть ті, що містять расу, юніт, заклинання й гілку.

- [ ] **Step 2: Прогін.** `pnpm test:run lib/__tests__/no-content-names.test.ts`. Якщо тест знаходить порушників, для кожного вирішіть:
  - це прив'язка рушія до контенту — перенесіть у дані так само, як у Tasks 2–8, і повідомте користувачу;
  - це збіг із системним підписом (наприклад, «Раса» як назва вбудованої гілки `RACIAL_BRANCH_ID`) — додайте точковий виняток у тест `const ALLOWED = new Set(["lib/utils/skills/progression/tree-json.ts: Раса", …])` з коментарем, чому.

  Атаки за замовчуванням («Звичайний удар/постріл») переходять у `rules.defaultAttacks` в етапі 1b. Якщо тест їх знаходить, тимчасово додайте їх у `ALLOWED` з позначкою `// 1b: rules.defaultAttacks`.

- [ ] **Step 3: Коміт.**
```bash
git add lib/__tests__/no-content-names.test.ts && git commit -m "test(constructor): guard against content names in engine code"
```

---

### Task 12: Повна перевірка 1a

- [ ] **Step 1: Статика і тести.**
```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test:run 2>&1 | tail -5 && pnpm build
```
Очікується: провалених тестів не більше, ніж на базовій лінії з Task 0, і жодного нового.

- [ ] **Step 2: Бої на `constructor`.**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/constructor pnpm battle-sweep
```
Очікується: exit 0, у звіті `<tmp>/battle-sweep/battle-sweep.md` немає помилок. Порівняйте зі звітом основної папки на `prodcopy`, якщо він є: кількість боїв і перемог має бути співставною.

- [ ] **Step 3: Браузер** (`pnpm dev` у worktree, порт 3000, якщо основна папка не запущена; інакше `-p 3001`). Від імені ДМ HOMM-кампанії:
  1. «Школи магії»: змінити колір і іконку Темряви → книга заклинань показує новий колір.
  2. Заклинання «Рій ос»: у FX стоїть `swarm/nature/stings`; змінити на `bolt/cold` → у бою анімація відповідає новому значенню.
  3. Гілка: роль «Магія» видно у формі.
  4. Бій з ельфом-стрільцем: у кидку атаки є «Ельфійське око»; учасник із «Завжди першим» іде першим у черзі.

  Видаліть тестові бої після перевірки (див. пам'ять: тестові бої прибирати).

- [ ] **Step 4: Звіт користувачу.** Що зроблено, вивід тестів і sweep, попередження бекфілу (герої без персонального скіла), відомі зміни поведінки (ініціатива 999 → 999 + база). Злиття в `main` не робимо: воно буде одне, наприкінці етапу 1 (після 1b і 1c).
