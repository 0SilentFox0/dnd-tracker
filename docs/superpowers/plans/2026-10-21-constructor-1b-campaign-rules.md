# Конструктор 1b: правила кампанії — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ДМ вмикає, вимикає й налаштовує механіки своєї кампанії (мораль, крити, формули DC і бонусу майстерності, масштабування героїв, межі ініціативи, назви базових атак) на сторінці «Правила». Бій фіксує правила під час старту, а `rules = {}` дає рівно поточну поведінку.

**Architecture:**
- `campaigns.rules JSONB` валідує `RulesetSchema` (Zod, `.prefault({})` на кожній секції), тож порожній об'єкт стає повним `Ruleset` зі значеннями за замовчуванням.
- Реєстр `MECHANIC_REGISTRY` описує секції для UI.
- Під час старту бою правила копіюються в `battle_scenes.rules`, а `loadBattle` віддає їх у `meta.rules`.
- Правила доходять до рушія двома шляхами:
  - **(а) вбудовуються в знімок учасника під час побудови:** proficiency, DC, кубики героя, HP, обмеження моралі, назви атак;
  - **(б) передаються контекстом дії** (`AbilityRunContext.rules`) для кидка атаки й критів.
- Клієнт бере правила з `BattleScene.rules`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Prisma 6, PostgreSQL (локальний Docker), Vitest, Zod 4, TanStack Query.

**Spec:** `docs/superpowers/specs/2026-10-20-campaign-constructor-design.md` (розділ A, частина «1b»).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`. Основну папку не чіпати.
- БД — тільки `postgresql://postgres:postgres@localhost:54322/constructor`. Prod і `prodcopy` не чіпати. Міграції тільки розширюють схему: `pnpm exec prisma migrate deploy`, ніколи не `migrate dev`.
- **Нульова зміна за замовчуванням.** `parseRules({})`, `parseRules(null)` і бій без `rules` поводяться рівно як до 1b. Очікувані значення наявних тестів не змінюються; дозволено лише додавати у фікстури дані на кшталт `rules`.
- Zod 4: для вкладених об'єктів зі значеннями за замовчуванням використовувати `.prefault({})`, а не `.default({})`, бо `default` у Zod 4 не парсить значення і не підставляє внутрішні defaults.
- Знімки учасників старих боїв не мають нових полів. Скрізь, де поле читається, діє запасне значення, рівне старій константі (`moraleCap ?? 3`, `heroDice ?? undefined` → стандартна таблиця).
- Конвенції CLAUDE.md:
  - компоненти не імпортують `@/lib/api/*`; ключі запитів — фабрики `keys.ts`;
  - сторінки — `HudFormPage` + `HudTab`; `ResponsiveDialog` замість Radix Dialog;
  - порожній рядок навколо `const`/`if`/`return`; мінімум коментарів; тексти UI українською.
- Тести під час роботи: `pnpm test:changed` або `pnpm test:related <files>`. Повний `pnpm test:run` — один раз у Task 10.
- **Поза 1b (рішення плану; повідомити користувача):**
  - слоти заклинань за правилами — етап 4, разом із класами;
  - довідники типів шкоди і статів — етап 4;
  - архетипи героїв лишаються в коді;
  - кубик моралі лишається d10, налаштовується тільки межа ±N;
  - таблиці критів — каталог у коді, ДМ вимикає окремі ефекти.

## Review Focus

1. **Активний бій, розпочатий до деплою** (`battle_scenes.rules = null`, учасники без `moraleCap`/`heroDice`). Бій триває за старими правилами: мораль ±3, крит на 20, стандартні кубики. Тест додається в Task 3.
2. **ДМ змінює правила посеред бою.** Активний бій їх не помічає, бо читає зафіксовану копію; бій зі статусом `prepared` бере нові. Тест додається в Task 3.
3. **Мораль вимкнена, а в учасника є прапорець `minMorale` або ефект `changeMorale`.** Мораль лишається 0, перевірка моралі не вимагається, `morale-check` відповідає 422, а не створює пропуск ходу. Тест додається в Task 4.
4. **Невалідні правила в БД** (руками зламаний JSON, невідомі ключі, `critOn` > 20). `parseRules` повертає значення за замовчуванням для зламаної секції і не кидає виняток, а PATCH відповідає 400. Тест додається в Task 1.
5. **Крит-поріг з правил разом із модифікатором `critThreshold` зі здібності.** Сумуються як зараз: `max(2, critOn + mod)`. Клієнтський `resolveAttackRoll` дає той самий результат, що й сервер. Тест додається в Task 5.

---

## File Structure

| Файл | Що робить |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261023000000_campaign_rules/migration.sql` | `campaigns.rules JSONB NOT NULL DEFAULT '{}'`, `battle_scenes.rules JSONB` |
| `lib/utils/rules/schema.ts` | `RulesetSchema`, `type Ruleset`, `parseRules`, `DEFAULT_RULES`, `RulesetPatchSchema` |
| `lib/utils/rules/registry.ts` | `MECHANIC_REGISTRY` (секції, підписи, описи) |
| `lib/utils/rules/formulas.ts` | Чисті функції: `proficiencyForLevel`, `saveDc`, `heroDiceTable`, `heroHpParams` |
| `lib/utils/rules/index.ts` | Barrel |
| `app/api/campaigns/[id]/rules/route.ts`, `lib/api/rules.ts`, `lib/hooks/campaigns/{keys.ts,useCampaignRules.ts}` | API, клієнт, хуки |
| `lib/utils/battle/store/{types,load-battle,save-battle}.ts`, `pipeline/battle-response.ts`, `types/api.ts`, `start/start-mutation.ts` | Фіксація в бою та видача клієнту |
| `lib/utils/battle/types/participant.ts` (`CampaignSpellContext.rules`), `start-build-context.ts`, `participant/load-character-context.ts`, `balance/character-stats.ts` | Правила під час побудови учасника |
| `lib/utils/abilities/engine/core/types.ts` (`AbilityRunContext.rules`) + місця, що будують `flow.ctx` | Правила в атаці, реталіації і призові |
| Механіки | `morale/*`, `abilities/engine/effects/morale.ts`, `attack/roll.ts`, `constants/critical-effects.ts`, `common/attack-roll-helpers.ts`, `common/calculations.ts`, `spell/power.ts`, `balance/stats.ts`, `constants/hero-scaling.ts`, `damage/hero-damage.ts`, `characters/hero-hp.ts`, `participant/{from-character,from-unit,extract-attacks}.ts` |
| `app/campaigns/[id]/dm/rules/page.tsx`, `components/rules/*` | Сторінка «Правила» |

---

### Task 1: Схема правил, міграція, реєстр

**Files:**
- Create: `lib/utils/rules/{schema,registry,formulas,index}.ts`, `prisma/migrations/20261023000000_campaign_rules/migration.sql`
- Modify: `prisma/schema.prisma` (`Campaign.rules Json @default("{}")`, `BattleScene.rules Json?`)
- Test: `lib/utils/rules/__tests__/{schema,formulas}.test.ts`

**Interfaces:**
- Produces:
```ts
export type Ruleset = z.infer<typeof RulesetSchema>;
export const DEFAULT_RULES: Ruleset;              // = RulesetSchema.parse({})
export function parseRules(raw: unknown): Ruleset; // never throws; per-section fallback
export const RulesetPatchSchema;                   // deep-partial for PATCH, strict keys
export type MechanicKey = keyof Ruleset;           // "morale" | "criticals" | "formulas" | "heroScaling" | "initiative" | "defaultAttacks"
export const MECHANIC_REGISTRY: Record<MechanicKey, { label: string; description: string }>;
export function proficiencyForLevel(level: number, f: Ruleset["formulas"]): number;
export function heroDiceTable(rules: Ruleset, kind: "melee" | "ranged"): Record<number, string> | undefined;
```

- [ ] **Step 1: Тест схеми (падає).**
```ts
// lib/utils/rules/__tests__/schema.test.ts
import { describe, expect, it } from "vitest";

import { DEFAULT_RULES, parseRules, RulesetPatchSchema } from "@/lib/utils/rules";

describe("parseRules", () => {
  it("empty / null / garbage → defaults equal to today's constants", () => {
    for (const raw of [{}, null, undefined, "x", 42]) expect(parseRules(raw)).toEqual(DEFAULT_RULES);

    expect(DEFAULT_RULES).toEqual({
      morale: { enabled: true, cap: 3 },
      criticals: { critOn: 20, fumbleOn: 1, effects: true, disabledSuccess: [], disabledFail: [] },
      formulas: { saveDcBase: 8, proficiencyBase: 2, proficiencyEvery: 4 },
      heroScaling: { meleeDiceByLevel: null, rangedDiceByLevel: null, hpBaseLevels: 3, hpConCoefficient: 1.5 },
      initiative: { heroMin: 10, heroMax: 16 },
      defaultAttacks: { meleeName: "Звичайний удар", rangedName: "Звичайний постріл" },
    });
  });

  it("keeps valid sections and falls back only for a broken one", () => {
    const r = parseRules({ morale: { enabled: false }, criticals: { critOn: 99 } });

    expect(r.morale).toEqual({ enabled: false, cap: 3 });
    expect(r.criticals).toEqual(DEFAULT_RULES.criticals);
  });

  it("drops unknown top-level keys", () => {
    expect(parseRules({ luck: { enabled: true } })).toEqual(DEFAULT_RULES);
  });
});

describe("RulesetPatchSchema", () => {
  it("accepts a partial section, rejects out-of-range and unknown keys", () => {
    expect(RulesetPatchSchema.safeParse({ criticals: { critOn: 19 } }).success).toBe(true);
    expect(RulesetPatchSchema.safeParse({ criticals: { critOn: 21 } }).success).toBe(false);
    expect(RulesetPatchSchema.safeParse({ criticals: { critOnn: 19 } }).success).toBe(false);
    expect(RulesetPatchSchema.safeParse({ luck: {} }).success).toBe(false);
  });

  it("initiative min must not exceed max", () => {
    expect(RulesetPatchSchema.safeParse({ initiative: { heroMin: 20, heroMax: 10 } }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Схема.**
```ts
// lib/utils/rules/schema.ts
import { z } from "zod";

const level = z.string().regex(/^([1-9]|1\d|20)$/);

const DiceTable = z.record(level, z.string().regex(/^\d+d\d+([+-]\d+d\d+)*$/));

const sections = {
  morale: z.strictObject({ enabled: z.boolean().default(true), cap: z.number().int().min(1).max(10).default(3) }),
  criticals: z.strictObject({
    critOn: z.number().int().min(2).max(20).default(20),
    fumbleOn: z.number().int().min(0).max(5).default(1),
    effects: z.boolean().default(true),
    disabledSuccess: z.array(z.string()).default([]),
    disabledFail: z.array(z.string()).default([]),
  }),
  formulas: z.strictObject({
    saveDcBase: z.number().int().min(0).max(20).default(8),
    proficiencyBase: z.number().int().min(0).max(10).default(2),
    proficiencyEvery: z.number().int().min(1).max(20).default(4),
  }),
  heroScaling: z.strictObject({
    meleeDiceByLevel: DiceTable.nullable().default(null),
    rangedDiceByLevel: DiceTable.nullable().default(null),
    hpBaseLevels: z.number().int().min(0).max(10).default(3),
    hpConCoefficient: z.number().min(0).max(5).default(1.5),
  }),
  initiative: z
    .strictObject({ heroMin: z.number().int().min(0).max(50).default(10), heroMax: z.number().int().min(0).max(50).default(16) })
    .refine((v) => v.heroMin <= v.heroMax, { message: "Мінімум ініціативи більший за максимум" }),
  defaultAttacks: z.strictObject({ meleeName: z.string().trim().min(1).max(60).default("Звичайний удар"), rangedName: z.string().trim().min(1).max(60).default("Звичайний постріл") }),
};

type Sections = typeof sections;

export const RulesetSchema = z.object(
  Object.fromEntries(Object.entries(sections).map(([k, s]) => [k, s.prefault({})])) as { [K in keyof Sections]: z.ZodPrefault<Sections[K]> },
);

export type Ruleset = z.infer<typeof RulesetSchema>;

export const DEFAULT_RULES: Ruleset = RulesetSchema.parse({});

export function parseRules(raw: unknown): Ruleset {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  return Object.fromEntries(
    (Object.keys(sections) as (keyof Sections)[]).map((k) => {
      const parsed = sections[k].safeParse(obj[k] ?? {});

      return [k, parsed.success ? parsed.data : DEFAULT_RULES[k]];
    }),
  ) as Ruleset;
}

export const RulesetPatchSchema = z.strictObject(
  Object.fromEntries(Object.entries(sections).map(([k, s]) => [k, (s as z.ZodObject).partial().optional()])) as { [K in keyof Sections]: z.ZodOptional<z.ZodType> },
);
```
Перевірте типи Zod 4 (`ZodPrefault`, `.partial()` на `strictObject` з `.refine` — `refine` повертає не `ZodObject`). Якщо `.partial()` недоступний після `refine`, тримайте в `sections.initiative` чистий `strictObject`, а `refine` застосовуйте окремо: у `RulesetSchema` (через `superRefine` на рівні секції) і в `RulesetPatchSchema` (на злитому значенні в роуті, Task 2). Мета тестів незмінна. Мапінг через `Object.fromEntries` можна замінити явним переліком шести ключів, якщо так типи простіші.

- [ ] **Step 3: Тест формул (падає), потім формули.**
```ts
// lib/utils/rules/__tests__/formulas.test.ts
import { describe, expect, it } from "vitest";

import { DEFAULT_RULES, heroDiceTable, proficiencyForLevel } from "@/lib/utils/rules";
import { getProficiencyBonus } from "@/lib/utils/common/calculations";

describe("proficiencyForLevel", () => {
  it("defaults reproduce getProficiencyBonus for levels 1..20", () => {
    for (let l = 1; l <= 20; l++) expect(proficiencyForLevel(l, DEFAULT_RULES.formulas)).toBe(getProficiencyBonus(l));
  });

  it("custom: base 1, every 3", () => {
    expect(proficiencyForLevel(1, { ...DEFAULT_RULES.formulas, proficiencyBase: 1, proficiencyEvery: 3 })).toBe(1);
    expect(proficiencyForLevel(4, { ...DEFAULT_RULES.formulas, proficiencyBase: 1, proficiencyEvery: 3 })).toBe(2);
  });
});

describe("heroDiceTable", () => {
  it("undefined when not overridden; numeric keys when overridden", () => {
    expect(heroDiceTable(DEFAULT_RULES, "melee")).toBeUndefined();
    expect(heroDiceTable({ ...DEFAULT_RULES, heroScaling: { ...DEFAULT_RULES.heroScaling, meleeDiceByLevel: { "1": "1d6" } } }, "melee")).toEqual({ 1: "1d6" });
  });
});
```
```ts
// lib/utils/rules/formulas.ts
import type { Ruleset } from "./schema";

export const proficiencyForLevel = (level: number, f: Ruleset["formulas"]) => f.proficiencyBase + Math.floor((Math.max(1, level) - 1) / f.proficiencyEvery);

export function heroDiceTable(rules: Ruleset, kind: "melee" | "ranged"): Record<number, string> | undefined {
  const t = kind === "melee" ? rules.heroScaling.meleeDiceByLevel : rules.heroScaling.rangedDiceByLevel;

  return t ? Object.fromEntries(Object.entries(t).map(([k, v]) => [Number(k), v])) : undefined;
}
```

- [ ] **Step 4: Реєстр і barrel.**
```ts
// lib/utils/rules/registry.ts
import type { Ruleset } from "./schema";

export type MechanicKey = keyof Ruleset;

export const MECHANIC_REGISTRY = {
  morale: { label: "Мораль", description: "Перевірка d10 на початку ходу: позитивна мораль — шанс додаткового ходу, негативна — пропуск. Межа — максимальне значення ±N." },
  criticals: { label: "Критичні удари", description: "Поріг кріту і провалу на d20 та таблиці критичних ефектів." },
  formulas: { label: "Формули", description: "DC рятівного кидка = база + майстерність + модифікатор; бонус майстерності росте з рівнем героя." },
  heroScaling: { label: "Сила героїв", description: "Кубики шкоди героя за рівнем і формула HP." },
  initiative: { label: "Ініціатива", description: "Допустимий діапазон ініціативи героя." },
  defaultAttacks: { label: "Базові атаки", description: "Назви атак, які отримує герой без зброї." },
} satisfies Record<MechanicKey, { label: string; description: string }>;
```
`index.ts` реекспортує `schema`, `registry`, `formulas`.

- [ ] **Step 5: Prisma і міграція.**
```sql
-- prisma/migrations/20261023000000_campaign_rules/migration.sql
ALTER TABLE "campaigns" ADD COLUMN "rules" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "battle_scenes" ADD COLUMN "rules" JSONB;
```
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/constructor DIRECT_URL=postgresql://postgres:postgres@localhost:54322/constructor pnpm exec prisma migrate deploy && pnpm exec prisma generate
```

- [ ] **Step 6: Тести і коміт.** `pnpm test:run lib/utils/rules && pnpm exec tsc --noEmit`, далі `git commit -m "feat(constructor): campaign rules schema, registry and migration"`.

---

### Task 2: API правил і хук

**Files:**
- Create: `app/api/campaigns/[id]/rules/route.ts`, `lib/api/rules.ts`, `lib/hooks/campaigns/useCampaignRules.ts`
- Modify: `lib/hooks/campaigns/keys.ts` (або створіть його, якщо в домені ще немає фабрики; додайте `campaignKeys.rules(id)`), `lib/hooks/campaigns/index.ts`, `lib/utils/api/api-auth.ts:66-109` (`requireCampaignAccess` повертає `campaign.rules: Ruleset`)
- Test: `app/api/__tests__/campaign-rules-api.test.ts`

**Interfaces:**
- Consumes: `parseRules`, `RulesetPatchSchema`, `Ruleset` (Task 1).
- Produces:
  - `GET /api/campaigns/[id]/rules` → `Ruleset` (будь-який учасник);
  - `PATCH` → `Ruleset` (тільки ДМ; тіло — `RulesetPatchSchema`; глибоке злиття по секціях, потім `parseRules` з перевіркою refine; 400 з `issues`);
  - `getCampaignRules(campaignId)`, `updateCampaignRules(campaignId, patch)`;
  - `useCampaignRules(campaignId)` → `{ data: Ruleset | undefined, … }`, `useUpdateCampaignRules(campaignId)`;
  - `requireCampaignAccess(...).campaign.rules`.

- [ ] **Step 1: Тест роуту (падає).** За зразком наявних тестів API в `app/api/__tests__` (дивіться, як вони мокають `requireCampaignAccess`/`requireDM` і `prisma`):
  - GET від гравця → 200 і `DEFAULT_RULES` для `rules = {}`;
  - PATCH від гравця → 403;
  - PATCH від ДМ `{ morale: { enabled: false } }` → 200, у відповіді `morale.enabled === false`, `criticals` за замовчуванням; `prisma.campaign.update` отримав злитий об'єкт;
  - PATCH `{ criticals: { critOn: 30 } }` → 400 з `issues`;
  - PATCH `{ initiative: { heroMin: 20 } }` при збережених `heroMax: 16` → 400, бо refine перевіряється на злитому значенні.

- [ ] **Step 2: Роут.**
```ts
// app/api/campaigns/[id]/rules/route.ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { mergeRules, RulesetPatchSchema } from "@/lib/utils/rules";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;

    const access = await requireCampaignAccess(id);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(access.campaign.rules);
  } catch (error) {
    return handleApiError(error, { action: "get campaign rules" });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const patch = await parseBody(RulesetPatchSchema, req);

    if (patch instanceof NextResponse) return patch;

    const merged = mergeRules(access.campaign.rules, patch);

    if (!merged.ok) return NextResponse.json({ error: merged.error, issues: merged.issues }, { status: 400 });

    await prisma.campaign.update({ where: { id }, data: { rules: merged.rules as Prisma.InputJsonObject } });

    return NextResponse.json(merged.rules);
  } catch (error) {
    return handleApiError(error, { action: "update campaign rules" });
  }
}
```
Порядок імпортів виправте через `pnpm lint --fix`. Точні сигнатури `requireDM`/`requireCampaignAccess` і форму `access` звірте з `lib/utils/api/api-auth.ts`. Якщо `requireDM` не повертає `campaign`, завантажте правила через `prisma.campaign.findUnique({ select: { rules: true } })`. Тексти помилок беріть з `lib/constants/api-errors.ts` (додайте `INVALID_RULES: "Некоректні правила кампанії"`).

`mergeRules` додайте в `lib/utils/rules/schema.ts` і покрийте тестом у `schema.test.ts`:
```ts
export function mergeRules(current: Ruleset, patch: Record<string, Record<string, unknown> | undefined>):
  { ok: true; rules: Ruleset } | { ok: false; error: string; issues: z.core.$ZodIssue[] } {
  const next = Object.fromEntries((Object.keys(current) as (keyof Ruleset)[]).map((k) => [k, { ...current[k], ...(patch[k] ?? {}) }]));

  const parsed = RulesetSchema.safeParse(next);

  return parsed.success ? { ok: true, rules: parsed.data } : { ok: false, error: "INVALID_RULES", issues: parsed.error.issues };
}
```

- [ ] **Step 3: `requireCampaignAccess`.** Поверніть `rules: parseRules(campaign.rules)` поряд із `maxLevel` (рядки ~101-109). Тип результату розширте.

- [ ] **Step 4: Клієнт і хуки.** `lib/api/rules.ts` — тонкі `get`/`patch` за зразком `lib/api/campaigns.ts`. У `useCampaignRules` використайте `useQuery({ queryKey: campaignKeys.rules(campaignId), queryFn, staleTime: REFERENCE_STALE_MS })`, якщо така константа є в `lib/hooks/common`, інакше 5 хв. `useUpdateCampaignRules` після успіху робить `setQueryData` з відповіддю.

- [ ] **Step 5: Тести і коміт.** `pnpm test:related app/api/campaigns/[id]/rules/route.ts lib/utils/api/api-auth.ts && pnpm exec tsc --noEmit`, далі `git commit -m "feat(constructor): campaign rules API and hooks"`.

---

### Task 3: Правила в бою — фіксація на старті, контекст побудови і дії

**Files:**
- Modify: `lib/utils/battle/store/types.ts` (`BattleMeta.rules: Ruleset`, `ScenePatch.rules?: Ruleset`), `store/load-battle.ts:~113,143`, `store/save-battle.ts:~158-168`, `pipeline/battle-response.ts:~54`, `types/api.ts:35-56` (`BattleScene.rules: Ruleset`)
- Modify: `app/api/campaigns/[id]/battles/[battleId]/start/start-mutation.ts:~31` (`scene.rules = ctx.meta.rules`)
- Modify: `lib/utils/battle/types/participant.ts:33` (`CampaignSpellContext.rules: Ruleset`), `start-build-context.ts:54,146`, `participant/load-character-context.ts:39,115` (+ сигнатура: `maxLevel` → `{ maxLevel, rules }`), `read-sheet.ts`/`sheet-handler.ts` (передають `rules` з `requireCampaignAccess`), `balance/character-stats.ts` (через `buildCampaignContextForStart`)
- Modify: `lib/utils/abilities/engine/core/types.ts:6` (`AbilityRunContext.rules?: Ruleset`) і місця, що будують `flow.ctx`: `attack/process/run.ts:44`, `attack/retaliation.ts:~89`, `turn/berserk.ts`, `spell/cast/*` (там, де будується `ctx` з `round`/`rng`/`map`); вхідні типи `AttackPhaseInput`, `RetaliationInput`, `AdvanceTurnInput` отримують `rules?: Ruleset` і заповнюються з `ctx.meta.rules` у мутаціях (attack, spell, next-turn, ability-use, bonus-action)
- Test: `lib/utils/battle/store/__tests__/load-battle-rules.test.ts`, `app/api/__tests__/battle-start-rules.test.ts` (або поряд із наявними тестами start-мутації)

**Interfaces:**
- Consumes: `parseRules`, `Ruleset`.
- Produces: `ctx.meta.rules: Ruleset` у кожній мутації; `BattleScene.rules` у клієнті; `context.rules` у `createBattleParticipantFromCharacter`/`FromUnit`; `flow.ctx.rules` у рушії дій. `createBattleParticipantFromUnit` отримує необов'язковий останній параметр `rules?: Ruleset` (без нього — `DEFAULT_RULES`), а `ability-summons.ts:83` передає `flow.ctx.rules`.

- [ ] **Step 1: Тести (падають).**
  - `loadBattle`: сцена `prepared` з `rules: null` і кампанія з `{ morale: { enabled: false } }` → `meta.rules.morale.enabled === false`; сцена `active` з `rules: {}` і та сама кампанія → `meta.rules` дорівнює `DEFAULT_RULES` (зафіксовано на старті); сцена `active` з `rules: null` (бій до деплою) → `DEFAULT_RULES`.
  - Старт: `createStartMutation(fakeBuild)` повертає `scene.rules`, що дорівнює `ctx.meta.rules`; `saveBattle` пише колонку (тест на рівні `save-battle`: patch з `rules` потрапляє в `data`).
  - `toBattleResponse` містить `rules`.

  Фікстури беріть із сусідніх тестів `store/__tests__` і `pipeline/__tests__`.

- [ ] **Step 2: Реалізація.**
  - `load-battle.ts`: у select сцени `rules: true`, у select кампанії `rules: true`;
    `meta.rules = parseRules(row.status === BattleStatus.PREPARED ? row.campaign.rules : (row.rules ?? {}))`.
    Для бою зі статусом не `prepared` і без копії — `parseRules({})`, тобто старі константи, а не нові правила кампанії. Так старий бій не змінить поведінку посеред гри.
  - `save-battle.ts`: якщо `patch.scene.rules !== undefined`, у `data` записується `rules`.
  - `start-mutation.ts`: у повернений `scene` додайте `rules: ctx.meta.rules`.
  - `battle-response.ts`: `rules: meta.rules`.
  - `CampaignSpellContext.rules` заповнюється з `parseRules(campaign.rules)` у `start-build-context` і `load-character-context`. Тут потрібні живі правила кампанії: побудова відбувається на старті, а лист персонажа — поза боєм.
  - Учасник, якого додають у вже активний бій (`add-participant-mutation`, `reveal-participant-mutation`), будується з `ctx.meta.rules`. Передайте його в контекст, якщо ці мутації будують контекст самі.

- [ ] **Step 3: Контекст дії.** `AbilityRunContext.rules?: Ruleset`. Усюди, де будується `{ round, rng, map }`, додайте `rules`, який мутація передає з `ctx.meta.rules` через вхідний тип фази. Поки нічого це поле не читає: Tasks 4–8 почнуть його використовувати.

- [ ] **Step 4: Тести і коміт.** `pnpm test:related` по змінених файлах + `pnpm test:run lib/utils/battle/store lib/utils/battle/pipeline app/api/__tests__` + `tsc`. Далі `git commit -m "feat(constructor): rules frozen into the battle at start and threaded into build/action context"`.

---

### Task 4: Мораль — вимикання і межа

**Files:**
- Modify: `types/battle.ts` (`BattleParticipant.abilities.moraleCap?: number`), `participant/from-character.ts`, `participant/from-unit.ts` (запис `moraleCap = rules.morale.enabled ? rules.morale.cap : 0`)
- Modify: `lib/utils/abilities/engine/effects/morale.ts:7,42,50`, `abilities/registry/effects/state.ts:176`, `abilities/build/bake.ts:30`
- Modify: `app/api/.../morale-check/morale-check-mutation.ts` (422, якщо `!ctx.meta.rules.morale.enabled`)
- Modify (UI): `components/battle/participants/MyHeroPanel.tsx:28,42`, `components/battle/turn/ActionGrid.tsx:11,34`, `components/character-profile/CombatTab.tsx:86`, `components/characters/stats/CharacterCombatParams.tsx:15` (межі з `rules.morale.cap`; сховати, якщо вимкнено)
- Test: `lib/utils/battle/morale/__tests__/morale-rules.test.ts`, тест мутації

**Interfaces:**
- Consumes: `context.rules` (Task 3), `BattleScene.rules`, `useCampaignRules`.
- Produces: `combineMorale(base, timedFlat, flags, cap = 3)`; `moraleCapOf(p) = p.abilities.moraleCap ?? 3`.

- [ ] **Step 1: Тести (падають).**
```ts
// lib/utils/battle/morale/__tests__/morale-rules.test.ts
describe("morale rules", () => {
  it("cap 0 (morale disabled) → neutral, no check awaited, even with minMorale / +2 effect", () => {
    const p = participant({ morale: 2, moraleCap: 0, abilities: [minMoraleFlag(1)], timedMorale: 2 });

    expect(effectiveMorale(p, [p]).value).toBe(0);
    expect(awaitsMoraleCheck(scopeFor(p), p.basicInfo.id)).toBe(false);
    expect(needsMoraleCheck(p, [p], null)).toBe(false);
  });

  it("cap 5 lets morale reach 5; missing cap (old snapshot) clamps to 3", () => {
    expect(effectiveMorale(participant({ morale: 5, moraleCap: 5 }), []).value).toBe(5);
    expect(effectiveMorale(participant({ morale: 5 }), []).value).toBe(3);
  });

  it("changeMorale effect respects the cap", () => {
    // applyChangeMorale на учасника з moraleCap 1 і morale 1, delta +2 → combatStats.morale === 1
  });
});
```
Фабрики — з сусідніх `morale/__tests__`. Тест мутації: `moraleCheckMutation` з `ctx.meta.rules.morale.enabled = false` кидає помилку, яку pipeline перетворює на 422. Скористайтеся тим самим класом помилки, що вже кидають мутації для 422 (`grep -rn "422" lib/utils/battle/pipeline`).

- [ ] **Step 2: Реалізація.**
  - `morale.ts`:
```ts
export const moraleCapOf = (p: BattleParticipant) => p.abilities.moraleCap ?? 3;

const clampMorale = (v: number, cap: number) => Math.max(-cap, Math.min(cap, v));
```
  - `combineMorale(..., cap = 3)`: якщо `cap === 0`, повертає `{ value: 0, ignored: true }` до перевірки `flags.min`; інакше рахує як зараз, але з `clampMorale(v, cap)`.
  - `ownMorale` і всі виклики `combineMorale` (`effective-morale.ts`) передають `moraleCapOf(p)`. `state.ts:176` і `bake.ts:30` використовують `clampMorale` з тим самим `moraleCapOf(p)`; експортуйте його з `morale.ts`.
  - `from-character.ts` і `from-unit.ts` записують `abilities.moraleCap` з `context.rules` (або з параметра `rules` для юніта; якщо його немає — `DEFAULT_RULES`).
  - `morale-check-mutation.ts`: на початку `if (!ctx.meta.rules.morale.enabled) throw …422 «Мораль вимкнена в правилах кампанії»`.
  - UI: у бою беріть `scene.battle.rules.morale` (через `useBattleScene()`); поза боєм — `useCampaignRules(campaignId)`. Якщо мораль вимкнена, бейдж моралі, плитка моралі й рядок моралі на листі ховаються. Поле в `CharacterCombatParams` отримує `min={-cap} max={cap}`.

- [ ] **Step 3: Тести і коміт.** `pnpm test:related` + `pnpm test:run lib/utils/battle/morale lib/utils/abilities`, далі `git commit -m "feat(constructor): morale can be disabled and its cap set per campaign"`.

---

### Task 5: Критичні удари

**Files:**
- Modify: `lib/utils/battle/attack/roll.ts:12-67` (`opts.rules`), `lib/constants/critical-effects.ts:381` (`getRandomCriticalEffect(type, rng, disabledIds = [])`), `attack/process/run.ts:67,75`, `attack/retaliation.ts:~103`, `turn/berserk.ts:85` (передають `flow.ctx.rules`), `lib/utils/battle/common/attack-roll-helpers.ts:48,50` (`resolveAttackRoll(data, targetAC, totalAttackBonus, crit = { critOn: 20, fumbleOn: 1 })`), `lib/hooks/battle/useAttackWizard.ts:107` (передає `scene.battle.rules.criticals`)
- Test: `lib/utils/battle/attack/__tests__/crit-rules.test.ts`, доповнити `common/__tests__` для `resolveAttackRoll`

**Interfaces:**
- Consumes: `flow.ctx.rules` (Task 3).
- Produces: `calculateAttackRoll(..., opts: { …; rules?: Ruleset })`.

- [ ] **Step 1: Тести (падають).**
  - Без `rules` (або з `DEFAULT_RULES`): d20 = 20 — крит, 19 — ні, 1 — провал (як зараз).
  - `critOn: 19`: 19 — крит; разом із модифікатором `critThreshold -1` зі здібності крит уже на 18 (`max(2, 19 - 1)`).
  - `fumbleOn: 0`: 1 — не провал; `fumbleOn: 2`: 2 — провал.
  - `effects: false`: крит є (подвоєння лишається там, де воно не належить таблиці), але `criticalEffect` не обирається; провал є, а ефект провалу не обирається.
  - `disabledSuccess: [<усі id, крім одного>]`: випадковий ефект — завжди той один.
  - `resolveAttackRoll` (клієнт) з `{ critOn: 19, fumbleOn: 1 }` для d20 = 19 дає крит — так само, як сервер. Для цілісності тест порівнює результати обох функцій на d20 = 1..20.

- [ ] **Step 2: Реалізація.**
  - `roll.ts`: `const c = (opts.rules ?? DEFAULT_RULES).criticals;`, далі `critThreshold = Math.max(2, c.critOn + mod)`, `isCriticalFail = c.fumbleOn > 0 && finalRoll <= c.fumbleOn` (за замовчуванням `fumbleOn = 1`, тобто `=== 1`, як зараз). Ефекти обираються тільки при `c.effects`, а `getRandomCriticalEffect(type, rng, type === "success" ? c.disabledSuccess : c.disabledFail)`; якщо після фільтра список порожній — без ефекту.
  - Подвоєння шкоди при криті: з'ясуйте, чи воно іде від ефекту `double_damage` з таблиці, чи від самого `isCritical` (`process/compute.ts:~108`), і опишіть це у звіті. Механіку не змінюйте: `effects: false` вимикає лише вибір ефекту з таблиці.
  - `attack-roll-helpers.ts`: замінити `d20 === 20`/`d20 === 1` на параметри; `useAttackWizard` передає `scene.battle.rules.criticals`. Наявне ігнорування модифікатора `critThreshold` у клієнтській функції не виправляйте в цій задачі, а запишіть у звіт як знахідку.

- [ ] **Step 3: Тести і коміт.** `pnpm test:related` + `pnpm test:run lib/utils/battle/attack lib/utils/battle/common`, далі `git commit -m "feat(constructor): crit and fumble thresholds and crit tables from campaign rules"`.

---

### Task 6: Формули — DC і бонус майстерності

**Files:**
- Modify: `lib/utils/common/calculations.ts:18-31,69-75` (`getSpellSaveDC(prof, mod, base = 8)`, `spellcastingDerived(level, ability, scores, formulas = DEFAULT_RULES.formulas)`)
- Modify: `participant/from-character.ts:80,170` (`proficiencyForLevel(level, context.rules.formulas)`, `spellcastingDerived(..., context.rules.formulas)`), `participant/from-unit.ts` (вбудувати `spellcasting.spellSaveDC = base + prof + mod` для юніта з кастом, якщо поле зараз порожнє — інакше `spell/power.ts:20` бере запасне `8`), `lib/utils/battle/spell/power.ts:20` (запасне значення `8` лишається для старих знімків), `lib/utils/battle/balance/stats.ts:119` (`bestSpell(spells, unit, saveDcBase = 8)`; виклик передає `campaignContext.rules.formulas.saveDcBase`)
- Test: `lib/utils/battle/participant/__tests__/formulas-rules.test.ts`

**Interfaces:**
- Consumes: `proficiencyForLevel`, `context.rules`.

- [ ] **Step 1: Тести (падають).** Герой 5-го рівня, INT 16:
  - з `DEFAULT_RULES`: `proficiencyBonus === 3`, `spellSaveDC === 8 + 3 + 3 = 14` — як зараз;
  - з `saveDcBase 10, proficiencyBase 1, proficiencyEvery 2`: prof `1 + floor(4/2) = 3`, DC `10 + 3 + 3 = 16`.

  Юніт із заклинанням і `proficiencyBonus 2`, WIS 14, при `saveDcBase 10` → `spellSaveDc(p) === 14`. Баланс: `bestSpell` з `saveDcBase 10` дає DC на 2 більший, ніж із 8.

- [ ] **Step 2: Реалізація** за списком файлів. `getProficiencyBonus(level)` лишається: через нього працюють юніти й форми поза кампанією, і він дорівнює `proficiencyForLevel(level, DEFAULT_RULES.formulas)`, що перевіряє тест Task 1.

- [ ] **Step 3: Тести і коміт.** `pnpm test:related` + `pnpm test:run lib/utils/battle/participant lib/utils/battle/balance lib/utils/common`, далі `git commit -m "feat(constructor): save DC base and proficiency progression from campaign rules"`.

---

### Task 7: Сила героїв — кубики за рівнем і HP

**Files:**
- Modify: `types/battle.ts` (`abilities.heroDice?: { melee?: Record<number, string>; ranged?: Record<number, string> }`), `participant/from-character.ts` (записує `heroDice` з `heroDiceTable(context.rules, …)`, лише якщо таблиця задана)
- Modify: `lib/utils/battle/damage/hero-damage.ts:20` (`getHeroDamageDiceForLevel(level, type, { meleeDiceByLevel: p.abilities.heroDice?.melee, rangedDiceByLevel: p.abilities.heroDice?.ranged })`)
- Modify: `lib/constants/hero-scaling.ts:61` (`getHeroMaxHpBreakdown(level, con, archetype, hp = { baseLevels: HP_BASE_LEVELS, conCoefficient: HP_CON_COEFFICIENT })`), `lib/utils/characters/hero-hp.ts:3` (`heroBaseHp(c, hp?)`), виклики: `from-character.ts:84` (з `context.rules.heroScaling`), `characters/sheet/build-sheet.ts:82` (з правил, що їх отримує лист через `loadCharacterContext`), `components/characters/list/DmCharacterCard.tsx:52` (з `useCampaignRules`)
- Test: `lib/utils/battle/damage/__tests__/hero-dice-rules.test.ts`, `lib/utils/characters/__tests__/hero-hp-rules.test.ts`

- [ ] **Step 1: Тести (падають).**
  - Учасник без `heroDice` → кубики, як зараз (`getHeroDamageDiceForLevel(5, MELEE)`).
  - З `heroDice.melee = { 5: "2d10" }` на 5-му рівні — `"2d10"`. Для 6-го рівня, якого немає в таблиці, діє правило `getDiceForLevel`: `resolved[clamped] ?? resolved[20] ?? "1d4"`. Зафіксуйте в тесті фактичну поведінку і опишіть у звіті. Важливо: часткова таблиця не повинна падати.
  - `heroBaseHp` з `{ baseLevels: 3, conCoefficient: 1.5 }` дорівнює поточному значенню; з `{ baseLevels: 1, conCoefficient: 1 }` — інше, перевірте за формулою з `hero-scaling.ts:61`.

- [ ] **Step 2: Реалізація** за списком файлів. Решта ланцюжка (`average.ts`, `stats.ts`, `amount.ts`, `lines.ts`, `useAttackWizard`) змін не потребує: вона йде через `heroAttackDamageParts(p, …)`, який тепер читає `p.abilities.heroDice`. Перевірте пошуком `getHeroDamageDiceForLevel(`, що інших прямих викликів немає.

  Редактор таблиці кубиків — у Task 9. Часткову таблицю він доповнює значеннями за замовчуванням під час збереження, щоб у БД завжди лежала повна таблиця 1..20 або `null`.

- [ ] **Step 3: Тести і коміт.** `pnpm test:related` + `pnpm test:run lib/utils/battle/damage lib/utils/characters lib/utils/battle/balance`, далі `git commit -m "feat(constructor): hero damage dice and HP formula from campaign rules"`.

---

### Task 8: Ініціатива героя і назви базових атак

**Files:**
- Modify: `lib/constants/characters.ts:8-10` (`HERO_INITIATIVE` лишається як значення за замовчуванням), `app/api/campaigns/[id]/characters/create-character-schema.ts:29`, `.../[characterId]/update-character-schema.ts:29` (Zod-межі розширити до `0..50`), роути create/patch (перевірка діапазону з `rules.initiative` → 400 `INITIATIVE_OUT_OF_RANGE`), `lib/utils/characters/form/defaults.ts:30`, `character-form.ts:47`, `components/characters/stats/CharacterCombatParams.tsx:11` (min/max з `useCampaignRules`)
- Modify: `lib/utils/battle/participant/extract-attacks.ts:19-24` (`extractAttacksFromCharacter(character, preloadedArtifactsById?, names = DEFAULT_RULES.defaultAttacks)`), `from-character.ts:60` (передає `context.rules.defaultAttacks`), `balance/stats.ts:185` (`bestAttack` — якщо дублює `DEFAULT_ATTACKS`, переведіть на ту саму функцію або константу)
- Test: `app/api/__tests__/character-initiative-rules.test.ts`, `lib/utils/battle/participant/__tests__/default-attacks-rules.test.ts`

- [ ] **Step 1: Тести (падають).**
  - Створення героя з `initiative: 18` у кампанії з `heroMax: 20` → 201; у кампанії без правил → 400.
  - Герой без зброї: базові атаки звуться `rules.defaultAttacks.meleeName`/`rangedName`; без правил — «Звичайний удар»/«Звичайний постріл».

- [ ] **Step 2: Реалізація** за списком файлів. Перевірку діапазону виконуйте в обробнику роуту (там є `requireCampaignAccess(...).campaign.rules`), а не в статичній Zod-схемі. Тексти помилок — у `lib/constants/api-errors.ts`. Після цього з `ALLOWED` у `lib/__tests__/no-content-names.test.ts` приберіть записи про базові атаки з позначкою `1b`, якщо такі є.

- [ ] **Step 3: Тести і коміт.** `pnpm test:related` + `pnpm test:run lib/utils/battle/participant app/api/__tests__ lib/__tests__`, далі `git commit -m "feat(constructor): hero initiative range and default attack names from campaign rules"`.

---

### Task 9: Сторінка «Правила»

**Files:**
- Create: `app/campaigns/[id]/dm/rules/page.tsx`, `components/rules/RulesForm.tsx`, `components/rules/sections/{MoraleSection,CriticalsSection,FormulasSection,HeroScalingSection,InitiativeSection,DefaultAttacksSection}.tsx`, `components/rules/DiceTableEditor.tsx`, `lib/hooks/campaigns/useRulesForm.ts`
- Modify: DM-навігація (`components/layout/Header.tsx` або місце, де «Школи магії»): посилання «Правила»
- Test: `lib/hooks/campaigns/__tests__/useRulesForm.test.ts`, `components/rules/__tests__/rules-form.test.tsx`

**Interfaces:**
- Consumes: `useCampaignRules`, `useUpdateCampaignRules`, `MECHANIC_REGISTRY`, `CRITICAL_SUCCESS_EFFECTS`/`CRITICAL_FAIL_EFFECTS` (id + назва), `DEFAULT_RULES`, `getHeroDamageDiceForLevel`.
- Produces: `useRulesForm(campaignId)` → `{ form: { data: Ruleset; set: (key, value) => void }, save, isSaving, isDirty, reset }` (форма об'єктів за конвенцією репо `{data,set}`).

- [ ] **Step 1: Тест хука (падає).** `useRulesForm` ініціалізується даними з запиту; `set("morale", { enabled: false, cap: 3 })` робить `isDirty === true`; `save()` викликає мутацію з **патчем лише змінених секцій**; `reset()` повертає дані з сервера. Мутацію мокніть.

- [ ] **Step 2: Сторінка.**
  - `page.tsx` — серверна, з guard ДМ, за зразком `dm/spell-groups/page.tsx`, з `HudFormPage` «Правила кампанії».
  - `RulesForm` — `HudForm` із `HudTab` на кожну секцію в порядку `MECHANIC_REGISTRY`; на кожній вкладці `HudSection` з `description`; `ActionBar` «Зберегти»/«Скасувати».
  - **Мораль:** перемикач «Увімкнена», число «Межа ±N» (1..10, вимкнене, коли мораль вимкнена).
  - **Крити:** «Крит на (d20 ≥)» 2..20, «Провал на (d20 ≤)» 0..5 (0 — без провалу), перемикач «Таблиці критичних ефектів», два списки чекбоксів «Ефекти криту» і «Ефекти провалу» (назви з каталогу; галочка = увімкнено; зберігаються як `disabled*`).
  - **Формули:** «База DC», «Майстерність на 1 рівні», «+1 кожні N рівнів» і рядок-підказка з прикладом: «Рівень 5: майстерність X, DC = база + X + мод».
  - **Сила героїв:** `DiceTableEditor` для ближньої і дальньої атаки — 20 рядків (рівень → кубики), плейсхолдер з `getHeroDamageDiceForLevel(level, type)`, кнопка «Скинути до стандартних» (→ `null`); поля «Базових рівнів HP» і «Коефіцієнт CON». Порожні клітинки під час збереження заповнюються плейсхолдером.
  - **Ініціатива:** min/max.
  - **Базові атаки:** дві назви.
  - Під формою — примітка: «Зміни діють для нових боїв; бій, що вже йде, використовує правила, зафіксовані на його старті».
  - Помилки 400 показуються через `useNotify()`.

- [ ] **Step 3: Компонентний тест** (`// @vitest-environment happy-dom`, `ConfirmProvider`, хуки замоканi): вимкнення моралі блокує поле межі, а «Зберегти» відправляє `{ morale: { enabled: false, cap: 3 } }`.

- [ ] **Step 4: Перевірка і коміт.** `pnpm exec tsc --noEmit && pnpm lint && pnpm test:related <нові файли>`, далі `git commit -m "feat(constructor): DM rules page"`.

---

### Task 10: Повна перевірка 1b

- [ ] **Step 1:** `pnpm exec tsc --noEmit && pnpm lint && pnpm test:run && pnpm build`. Очікується: усе зелене; можливі падіння лише через відомі таймаути під навантаженням (`character-sheet-api`, `battle-fx`), які проходять окремо.
- [ ] **Step 2: Sweep за замовчуванням.** `DATABASE_URL=…/constructor pnpm battle-sweep` → ті самі 2 відомі помилки лабіринту, що й до 1b, і жодних нових.
- [ ] **Step 3: Sweep зі зміненими правилами.** На копії кампанії (не на основній) або тимчасово на основній з відновленням після тесту: `update campaigns set rules = '{"morale":{"enabled":false},"criticals":{"critOn":19}}'`. Запустіть sweep і перевірте у звіті, що в логах немає подій `morale_skip` чи додаткових ходів від моралі, а криті на 19 трапляються (`grep` по логу/JSON звіту). Потім поверніть `rules = '{}'`.
- [ ] **Step 4: Звіт.** Числа, винятки поза планом, знахідки (наприклад, клієнтський `resolveAttackRoll` ігнорує `critThreshold`).
