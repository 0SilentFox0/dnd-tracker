# Етап 4d: поза боєм — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ресурси героя (HP, тимч. HP, смерть, слоти й пакт, заряди `perRest`, виснаження) живуть між боями, коли кампанія це вмикає; ДМ запускає короткий/довгий відпочинок для групи, гравець витрачає кістки хітів у вікні короткого відпочинку; перевірки й рятівні кидки з листа кидає сервер із записом у журнал персонажа; досвід за таблицею 5e, натхнення (кидки з листа й атака в бою). HOMM5 без змін.

**Architecture:** нова секція `rules.outOfCombat` (усе вимкнено за замовчуванням). `characters.resources` (JSON) зберігає **витрачене**, а не поточне; `characters.inspiration`; таблиця `character_logs`. Чисті функції — `lib/utils/characters/resources/` (схема, HP, відпочинок, кістки хітів, бій ↔ ресурси, кидок з листа, опис журналу). Бій читає ресурси в `createBattleParticipantFromCharacter` (той самий шлях для старту бою, листа й балансу) і пише їх у `saveBattle` у транзакції завершення. Роути — тонкі `route.ts` + сусідні `*-handler.ts`; спільний доступ і побудова учасника — `lib/server/characters/`.

**Tech Stack:** TypeScript strict, Prisma 6 (PostgreSQL), Zod 4, Vitest, Next.js route handlers, TanStack Query, React 19.

**Spec:** `docs/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md` (розділ «4d. Дизайн: поза боєм»; «Загальні правила етапу 4» і розділи 4a/4c-1 — контекст).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; основну папку `/Users/silentfox/Work/dnd-tracker` не чіпати; БД лише `postgresql://postgres:postgres@localhost:54322/constructor`. Міграцію писати вручну й застосовувати `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy` (**не** `migrate dev`), потім `pnpm exec prisma generate`. Ім'я міграції: `20261029000000_out_of_combat` (остання наявна — `20261028000000_spell_5e_dice`). Кожен `CREATE TABLE` — з `ENABLE ROW LEVEL SECURITY` (`prisma/__tests__/migrations-rls.test.ts`).
- **Нульова зміна поведінки HOMM5:** `rules.outOfCombat` за замовчуванням `{ persistResources: false, longRestHitDice: "half", xp: false, inspiration: false }`. При вимкнених перемикачах старт бою дає повні ресурси, `completeBattle` повертає непритомних до max HP, `saveBattle` не чіпає `characters`, лист і списки виглядають як зараз. Наявні тести (до першого коміту цього плану) не редагувати, крім адитивних змін форми (`DEFAULT_RULES` у `schema.test.ts`, `sheetFixture`, межа розміру OpenAPI); падіння наявного тесту — баг нового коду.
- `resources` зберігає витрачене: відсутнє поле = повне/нуль. `hp` ≥ max не зберігається (`withHp`), при читанні `hp` обрізається до `[0, max]` (`currentHp`).
- `resources`, `inspiration`, `experience` не входять у звичайний PATCH персонажа (`update-character-schema.ts` — `z.object`, зайві ключі відкидаються; не додавати їх туди). Змінюються лише роутами цього плану.
- Рушій бою читає тільки `battle.rules`; нові бонуси — лише через `collectModifiers`/`runAbilities`; колонку `abilities` — лише через `lib/utils/abilities/read.ts`. Будь-який запис snapshot — разом зі `snapshotHash` (пайплайн робить сам).
- Шари: `route.ts` тонкий (Zod через `parseBody`, доступ, виклик сусіднього `*-handler.ts`); клієнтські запити — лише `lib/api/characters.ts`; хуки — `lib/hooks/characters/`; компоненти не імпортують `@/lib/api/*`; ключі запитів — фабрики `characterKeys`; клієнтські модулі не тягнуть zod (`lib/__tests__/client-entry-imports.test.ts`) — типи тіл запитів у `types/characters.ts`, Zod-схеми лише в `lib/schemas/out-of-combat.ts`.
- `lib/server/characters/log.ts` **без** `import "server-only"`: його імпортує `lib/utils/battle/store/persist-resources.ts`, а battle store вантажать симуляції через `tsx` (`scripts/sim/*`), які не можуть імпортувати server-only модулі.
- Помилки API — `{ error, issues? }`, тексти в `lib/constants/api-errors.ts`; «вимкнено в правилах» і порушення умов — **409**.
- Діалоги — `ResponsiveDialog hud`; підтвердження/повідомлення — `useConfirm`/`useNotify`. UI й журнал українською, ідентифікатори англійською; мінімум коментарів. ESLint: padding lines, `simple-import-sort`, `import/no-cycle` (maxDepth 1), `react-hooks/exhaustive-deps` = error.
- Тести: `pnpm test:run <file>` / `pnpm test:related <files>` під час роботи; повний `pnpm test:run`, `pnpm lint`, `pnpm build`, battle-sweep — лише в задачі 14.
- Коміти з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; `.superpowers/` не комітити.

## Review Focus

1. **Max HP героя зменшився між боями** (зняли артефакт, змінили клас, виснаження 2014 ≥ 4 урізало max) при збереженому `resources.hp` більшому за новий max — старт бою, лист і картка ДМ показують `hp = max`, ніколи більше. Тест-якір у задачі 4.
2. **Той самий герой у полі й у резерві / як слот додаткового ходу** при завершенні бою — пишеться рівно один раз і з учасника в полі; герой лише з резерву (`pending`) не пишеться; юніти й призвані — ніколи. Тест у задачі 5.
3. **Відпочинок з `characterIds`, де є чужий / неіснуючий / `PENDING` персонаж** — 400 `REST_CHARACTERS_INVALID`, нічого не записано (жодного `update` і журналу). Тест у задачі 6.
4. **Кістка хітів при повному HP або для класу без невитрачених кісток** — 409 (`HP_FULL` / `NO_HIT_DICE`), кістка не списується. Тест у задачі 7.
5. **`useInspiration` в атаці, коли натхнення немає або правило вимкнене** — 422 без зміни стану (натхнення не знято, атака не проведена); у багатоцільовій атаці перевагу отримує лише перший удар. Тест у задачі 10.

---

## Карта файлів

| Файл | Відповідальність |
|---|---|
| `lib/utils/rules/{schema,defaults,registry}.ts`, `components/rules/RulesForm.tsx`, `components/rules/sections/OutOfCombatSection.tsx` (новий) | `rules.outOfCombat` |
| `prisma/schema.prisma`, `prisma/migrations/20261029000000_out_of_combat/migration.sql` | `characters.resources`, `characters.inspiration`, `character_logs` |
| `types/characters.ts` | `CharacterResources`, `SheetRest`, тіла/відповіді запитів 4d, `CharacterLogEntry` |
| `lib/constants/character-log.ts`, `lib/server/characters/log.ts` | види журналу, `writeCharacterLog` |
| `lib/constants/experience.ts` | пороги 5e, `xpForLevel`, `levelUpAvailable`, `xpShare`, `addExperience` |
| `lib/utils/characters/resources/{schema,hp,rest,hit-dice,battle,sheet-roll,describe-log}.ts` | чиста логіка ресурсів |
| `lib/utils/battle/participant/from-character.ts`, `types/battle.ts` (`battleData.inspiration`) | старт бою з ресурсів |
| `lib/utils/battle/turn/{victory,turn-helpers,advance-turn}.ts`, `lib/utils/battle/pipeline/run-battle-mutation.ts`, `app/api/.../complete/complete-mutation.ts` | перемога → 1 HP |
| `lib/utils/battle/store/{persist-resources,save-battle}.ts` | запис ресурсів при завершенні |
| `lib/server/characters/{access,participant}.ts`, `app/api/.../sheet/sheet-handler.ts` | доступ власник/ДМ, побудова учасника |
| `lib/schemas/out-of-combat.ts`, `lib/constants/api-errors.ts` | Zod тіл, тексти помилок |
| `app/api/campaigns/[id]/rest/{route,rest-handler}.ts` | відпочинок |
| `app/api/campaigns/[id]/characters/[characterId]/hit-dice/{route,hit-die-handler}.ts`, `.../roll/{route,roll-handler}.ts` | кістка хітів, кидок з листа |
| `lib/utils/battle/checks/roll-check.ts`, `lib/utils/battle/saves/roll-save.ts` | параметр `advantage` |
| `app/api/campaigns/[id]/experience/{route,experience-handler}.ts`, `.../characters/[characterId]/inspiration/route.ts`, `.../resources/{route,resources-handler}.ts`, `.../log/{route,read-character-log}.ts` | ДМ-роути, журнал |
| `lib/utils/battle/attack/{bonus,roll}.ts`, `attack/process/run.ts`, `types/attack-process.ts`, `attack-phase/{request,run-attack-phase}.ts`, `app/api/.../attack/attack-mutation.ts`, `types/api.ts`, `lib/utils/battle/flows/attack-flow.ts`, `lib/hooks/battle/useAttackWizard.ts`, `components/battle/wizards/attack/RollStep.tsx` | натхнення в атаці |
| `lib/utils/characters/sheet/{build-sheet,rest-block}.ts`, `app/api/.../characters/list-characters.ts`, `lib/api/characters.ts`, `lib/hooks/characters/{keys,useOutOfCombat,index}.ts` | дані листа, клієнт, хуки |
| `components/character-profile/rest/*`, `ProfileHero.tsx`, `CombatTab.tsx`, `MagicTab.tsx`, `SkillsTab.tsx`, `CharacterProfile.tsx`, `ProfileTabs.tsx` | UI листа |
| `components/characters/rest/*`, `components/characters/list/DmCharacterCard.tsx`, `app/campaigns/[id]/dm/characters/page-client.tsx` | UI ДМ |

---

### Task 1: Правила `outOfCombat`

**Files:**
- Modify: `lib/utils/rules/schema.ts` (секція `outOfCombat` у `sections`, `RulesetSchema`, `RulesetPatchSchema`), `lib/utils/rules/defaults.ts`, `lib/utils/rules/registry.ts`, `components/rules/RulesForm.tsx` (`SECTIONS.outOfCombat`)
- Create: `components/rules/sections/OutOfCombatSection.tsx`
- Test: `lib/utils/rules/__tests__/schema-4d.test.ts`; адитивно додати `outOfCombat` в очікуваний об'єкт `DEFAULT_RULES` у `lib/utils/rules/__tests__/schema.test.ts` (рядок ~14, повна рівність)

**Interfaces — Produces:**

```ts
// lib/utils/rules/schema.ts → sections
outOfCombat: z.strictObject({
  persistResources: z.boolean().default(false),
  longRestHitDice: z.enum(["half", "all"]).default("half"),
  xp: z.boolean().default(false),
  inspiration: z.boolean().default(false),
}),
// Ruleset["outOfCombat"] = { persistResources: boolean; longRestHitDice: "half" | "all"; xp: boolean; inspiration: boolean }
```

`MECHANIC_REGISTRY.outOfCombat = { label: "Поза боєм", description: "Ресурси героїв між боями (HP, слоти, пакт, заряди «за відпочинок», виснаження), короткий і довгий відпочинок, кістки хітів, досвід за таблицею 5e, натхнення. Вимкнено — кожен бій з повними ресурсами." }`. Хеш синхронізації шаблону (`lib/server/templates/sync/hash.ts`) бере ключі з реєстру сам — правок не потребує.

- [ ] **Step 1: Failing test**

```ts
// lib/utils/rules/__tests__/schema-4d.test.ts
import { describe, expect, it } from "vitest";

import { DEFAULT_RULES, MECHANIC_REGISTRY } from "@/lib/utils/rules";
import { mergeRules, parseRules, RulesetPatchSchema } from "@/lib/utils/rules/schema";

const OFF = { persistResources: false, longRestHitDice: "half", xp: false, inspiration: false };

describe("rules.outOfCombat", () => {
  it("defaults to everything off", () => {
    expect(DEFAULT_RULES.outOfCombat).toEqual(OFF);
    expect(parseRules({}).outOfCombat).toEqual(OFF);
  });

  it("falls back to default on an invalid section", () => {
    expect(parseRules({ outOfCombat: { longRestHitDice: "some" } }).outOfCombat).toEqual(OFF);
  });

  it("patches a single toggle", () => {
    const patch = RulesetPatchSchema.parse({ outOfCombat: { persistResources: true, longRestHitDice: "all" } });

    const merged = mergeRules(DEFAULT_RULES, patch);

    expect(merged.ok && merged.rules.outOfCombat).toEqual({ ...OFF, persistResources: true, longRestHitDice: "all" });
  });

  it("is a registered mechanic", () => {
    expect(MECHANIC_REGISTRY.outOfCombat.label).toBe("Поза боєм");
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/rules/__tests__/schema-4d.test.ts` — FAIL (`outOfCombat` undefined).
- [ ] **Step 3: Implement.** Додати секцію в `sections`, `outOfCombat: sections.outOfCombat.prefault({})` у `RulesetSchema`, `outOfCombat: patchSection("outOfCombat").optional()` у `RulesetPatchSchema`, `outOfCombat: { persistResources: false, longRestHitDice: "half", xp: false, inspiration: false }` у `DEFAULT_RULES`, рядок у `MECHANIC_REGISTRY` (останнім), `outOfCombat: OutOfCombatSection` у `SECTIONS`.

```tsx
// components/rules/sections/OutOfCombatSection.tsx
import { RulesSection } from "../RulesSection";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import type { Ruleset } from "@/lib/utils/rules";

type Toggle = { key: "persistResources" | "xp" | "inspiration"; label: string };

const TOGGLES: Toggle[] = [
  { key: "persistResources", label: "Ресурси героїв зберігаються між боями" },
  { key: "xp", label: "Досвід за таблицею 5e (інакше — віхи)" },
  { key: "inspiration", label: "Натхнення" },
];

export function OutOfCombatSection({ form }: { form: RulesFormState }) {
  const section = form.data.outOfCombat;

  const set = (patch: Partial<Ruleset["outOfCombat"]>) => form.set("outOfCombat", { ...section, ...patch });

  return (
    <RulesSection mechanic="outOfCombat">
      <div className="space-y-3">
        {TOGGLES.map((t) => (
          <div key={t.key} className="flex items-center gap-3">
            <Switch id={`rules-ooc-${t.key}`} checked={section[t.key]} onCheckedChange={(v) => set({ [t.key]: v })} />
            <Label htmlFor={`rules-ooc-${t.key}`}>{t.label}</Label>
          </div>
        ))}
        {section.persistResources && (
          <div className="flex items-center gap-3">
            <Switch id="rules-ooc-hit-dice" checked={section.longRestHitDice === "all"} onCheckedChange={(v) => set({ longRestHitDice: v ? "all" : "half" })} />
            <Label htmlFor="rules-ooc-hit-dice">Правила 2024: довгий відпочинок повертає всі кістки хітів (інакше — половину)</Label>
          </div>
        )}
      </div>
    </RulesSection>
  );
}
```

- [ ] **Step 4:** `pnpm test:run lib/utils/rules/__tests__/schema-4d.test.ts` + `pnpm test:related lib/utils/rules/schema.ts lib/utils/rules/registry.ts components/rules/RulesForm.tsx` — PASS. Якщо падає лише межа розміру OpenAPI (`lib/server/content/__tests__/openapi.test.ts`, `toBeLessThan(130_000)`) — підняти до найближчих +5000 і записати в звіт.
- [ ] **Step 5: Commit**

```bash
git add lib/utils/rules components/rules
git commit -m "feat(constructor): 4d rules.outOfCombat

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Дані — міграція, схема ресурсів, журнал

**Files:**
- Modify: `prisma/schema.prisma` (`Character.resources`, `Character.inspiration`, `Character.characterLog`, `Campaign.characterLog`, нова модель `CharacterLog`), `types/characters.ts`
- Create: `prisma/migrations/20261029000000_out_of_combat/migration.sql`, `lib/utils/characters/resources/schema.ts`, `lib/utils/characters/resources/hp.ts`, `lib/constants/character-log.ts`, `lib/server/characters/log.ts`
- Test: `lib/utils/characters/resources/__tests__/schema.test.ts`, `lib/server/characters/__tests__/log.test.ts`

**Interfaces — Produces:**

```ts
// types/characters.ts (додати)
export type RestKindValue = "short" | "long";

export interface CharacterResources {
  hp?: number;
  tempHp?: number;
  dead?: boolean;
  /** ключі "1".."9" і "pact" */
  slotsSpent?: Record<string, number>;
  /** classId → витрачено */
  hitDiceSpent?: Record<string, number>;
  /** ключ вміння (ResolvedAbility.key) → використання perRest */
  charges?: Record<string, { used: number; rest: RestKindValue }>;
  exhaustion?: number;
  shortRestOpen?: boolean;
}

// lib/utils/characters/resources/hp.ts (без zod — його імпортує клієнт)
export function currentHp(r: CharacterResources, maxHp: number): number;           // clamp(r.hp ?? max, 0, max)
export function withHp(r: CharacterResources, hp: number, maxHp: number): CharacterResources; // hp >= max → без поля hp
export function compactResources(r: CharacterResources): CharacterResources;        // прибирає undefined, false, порожні об'єкти, exhaustion 0, tempHp 0

// lib/utils/characters/resources/schema.ts
export const MAX_RESOURCE_EXHAUSTION = 6;           // = MAX_EXHAUSTION рушія (lib/utils/battle/conditions/query.ts)
export const CharacterResourcesSchema: z.ZodType<CharacterResources>;
export function readResources(raw: unknown): CharacterResources;  // невалідне → {}

// lib/constants/character-log.ts
export const CharacterLogKind = { CHECK: "check", SAVE: "save", SHORT_REST: "short_rest", LONG_REST: "long_rest", REST_CLOSED: "rest_closed", HIT_DIE: "hit_die", XP: "xp", INSPIRATION: "inspiration", RESOURCES_EDIT: "resources_edit", BATTLE_RESULT: "battle_result" } as const;
export type CharacterLogKindValue = (typeof CharacterLogKind)[keyof typeof CharacterLogKind];
export const CHARACTER_LOG_PAGE_SIZE = 30;

// lib/server/characters/log.ts
export type CharacterLogInput = { campaignId: string; characterId: string; actorUserId: string | null; kind: CharacterLogKindValue; data: Record<string, unknown> };
export function writeCharacterLog(tx: Pick<Prisma.TransactionClient, "characterLog">, entries: CharacterLogInput[]): Promise<unknown>;
```

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/characters/resources/__tests__/schema.test.ts
import { describe, expect, it } from "vitest";

import { compactResources, currentHp, withHp } from "@/lib/utils/characters/resources/hp";
import { readResources } from "@/lib/utils/characters/resources/schema";

describe("readResources", () => {
  it("empty / invalid → {}", () => {
    for (const raw of [undefined, null, "x", 42, [], { hp: -1 }, { exhaustion: 7 }, { charges: { a: { used: 1, rest: "day" } } }]) expect(readResources(raw)).toEqual({});
  });

  it("keeps valid fields", () => {
    const r = { hp: 0, tempHp: 3, dead: true, slotsSpent: { "1": 2, pact: 1 }, hitDiceSpent: { fighter: 1 }, charges: { "class:f:surge": { used: 1, rest: "short" } }, exhaustion: 2, shortRestOpen: true };

    expect(readResources(r)).toEqual(r);
  });

  it("rejects a foreign slot key", () => {
    expect(readResources({ slotsSpent: { "10": 1 } })).toEqual({});
  });
});

describe("hp helpers", () => {
  it("currentHp clamps to [0, max]; missing = full", () => {
    expect(currentHp({}, 20)).toBe(20);
    expect(currentHp({ hp: 35 }, 20)).toBe(20);
    expect(currentHp({ hp: 0 }, 20)).toBe(0);
  });

  it("withHp drops hp at or above max", () => {
    expect(withHp({ hp: 3 }, 20, 20)).toEqual({});
    expect(withHp({}, 7, 20)).toEqual({ hp: 7 });
  });

  it("compactResources drops neutral values but keeps hp 0", () => {
    expect(compactResources({ hp: 0, tempHp: 0, dead: false, slotsSpent: {}, exhaustion: 0, shortRestOpen: false })).toEqual({ hp: 0 });
  });
});
```

```ts
// lib/server/characters/__tests__/log.test.ts
import { describe, expect, it, vi } from "vitest";

import { writeCharacterLog } from "@/lib/server/characters/log";

describe("writeCharacterLog", () => {
  it("writes all entries in one createMany", async () => {
    const tx = { characterLog: { createMany: vi.fn(async () => ({ count: 2 })) } };

    await writeCharacterLog(tx as never, [
      { campaignId: "c", characterId: "a", actorUserId: "u", kind: "xp", data: { amount: 10 } },
      { campaignId: "c", characterId: "b", actorUserId: null, kind: "battle_result", data: {} },
    ]);

    expect(tx.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ characterId: "a", kind: "xp", data: { amount: 10 } }), expect.objectContaining({ characterId: "b", actorUserId: null })] });
  });

  it("skips the query for an empty list", async () => {
    const tx = { characterLog: { createMany: vi.fn() } };

    await writeCharacterLog(tx as never, []);

    expect(tx.characterLog.createMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/characters/resources/__tests__/schema.test.ts lib/server/characters/__tests__/log.test.ts` — FAIL (модулів немає).
- [ ] **Step 3: Migration + Prisma.**

```sql
-- prisma/migrations/20261029000000_out_of_combat/migration.sql
-- AlterTable
ALTER TABLE "characters" ADD COLUMN "resources" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "characters" ADD COLUMN "inspiration" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "character_logs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "kind" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "character_logs_characterId_createdAt_idx" ON "character_logs"("characterId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "character_logs" ADD CONSTRAINT "character_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_logs" ADD CONSTRAINT "character_logs_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "character_logs" ENABLE ROW LEVEL SECURITY;
```

`prisma/schema.prisma`: у `model Character` після `classes` — `resources Json @default("{}")`, `inspiration Boolean @default(false)`; поруч з `inventoryLog InventoryLog[]` — `characterLog CharacterLog[]`; у `model Campaign` поруч з `inventoryLog` — `characterLog CharacterLog[]`; нова модель після `InventoryLog`:

```prisma
model CharacterLog {
  id          String    @id @default(cuid())
  campaignId  String
  characterId String
  actorUserId String?
  kind        String
  data        Json      @default("{}")
  createdAt   DateTime  @default(now())
  campaign    Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  character   Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@index([characterId, createdAt(sort: Desc)])
  @@map("character_logs")
}
```

Застосувати: `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy && pnpm exec prisma generate`.

- [ ] **Step 4: Implement modules.**

```ts
// lib/utils/characters/resources/hp.ts
import type { CharacterResources } from "@/types/characters";

export function currentHp(r: CharacterResources, maxHp: number): number {
  return Math.min(maxHp, Math.max(0, r.hp ?? maxHp));
}

export function withHp(r: CharacterResources, hp: number, maxHp: number): CharacterResources {
  const { hp: _old, ...rest } = r;

  return hp >= maxHp ? rest : { ...rest, hp: Math.max(0, hp) };
}

const isEmptyObject = (v: unknown) => typeof v === "object" && v !== null && Object.keys(v).length === 0;

export function compactResources(r: CharacterResources): CharacterResources {
  return Object.fromEntries(
    Object.entries(r).filter(([k, v]) => v !== undefined && v !== false && !isEmptyObject(v) && !((k === "exhaustion" || k === "tempHp") && v === 0)),
  ) as CharacterResources;
}
```

```ts
// lib/utils/characters/resources/schema.ts
import { z } from "zod";

import type { CharacterResources } from "@/types/characters";

export const MAX_RESOURCE_EXHAUSTION = 6;

const count = z.number().int().min(0).max(999);

export const CharacterResourcesSchema: z.ZodType<CharacterResources> = z.object({
  hp: z.number().int().min(0).optional(),
  tempHp: z.number().int().min(0).optional(),
  dead: z.boolean().optional(),
  slotsSpent: z.record(z.string().regex(/^([1-9]|pact)$/), count).optional(),
  hitDiceSpent: z.record(z.string().min(1).max(100), count).optional(),
  charges: z.record(z.string().min(1).max(300), z.object({ used: count, rest: z.enum(["short", "long"]) })).optional(),
  exhaustion: z.number().int().min(0).max(MAX_RESOURCE_EXHAUSTION).optional(),
  shortRestOpen: z.boolean().optional(),
});

export function readResources(raw: unknown): CharacterResources {
  const parsed = CharacterResourcesSchema.safeParse(raw ?? {});

  return parsed.success ? parsed.data : {};
}
```

```ts
// lib/constants/character-log.ts
export const CharacterLogKind = {
  CHECK: "check",
  SAVE: "save",
  SHORT_REST: "short_rest",
  LONG_REST: "long_rest",
  REST_CLOSED: "rest_closed",
  HIT_DIE: "hit_die",
  XP: "xp",
  INSPIRATION: "inspiration",
  RESOURCES_EDIT: "resources_edit",
  BATTLE_RESULT: "battle_result",
} as const;

export type CharacterLogKindValue = (typeof CharacterLogKind)[keyof typeof CharacterLogKind];

export const CHARACTER_LOG_PAGE_SIZE = 30;
```

```ts
// lib/server/characters/log.ts
import type { Prisma } from "@prisma/client";

import type { CharacterLogKindValue } from "@/lib/constants/character-log";

// без server-only: модуль імпортує battle store, який вантажать симуляції через tsx
export type CharacterLogInput = { campaignId: string; characterId: string; actorUserId: string | null; kind: CharacterLogKindValue; data: Record<string, unknown> };

export async function writeCharacterLog(tx: Pick<Prisma.TransactionClient, "characterLog">, entries: CharacterLogInput[]): Promise<unknown> {
  if (entries.length === 0) return;

  return tx.characterLog.createMany({ data: entries.map((e) => ({ ...e, data: e.data as Prisma.InputJsonValue })) });
}
```

- [ ] **Step 5:** нові тести + `pnpm test:run prisma/__tests__/migrations-rls.test.ts` — PASS.
- [ ] **Step 6: Commit**

```bash
git add prisma lib/utils/characters/resources lib/constants/character-log.ts lib/server/characters/log.ts lib/server/characters/__tests__/log.test.ts types/characters.ts
git commit -m "feat(constructor): 4d character resources column, inspiration, character_logs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Чисті функції — відпочинок, кістки хітів, досвід

**Files:**
- Create: `lib/utils/characters/resources/hit-dice.ts`, `lib/utils/characters/resources/rest.ts`, `lib/constants/experience.ts`
- Test: `lib/utils/characters/resources/__tests__/rest.test.ts`, `lib/utils/characters/resources/__tests__/hit-dice.test.ts`, `lib/constants/__tests__/experience.test.ts`

**Interfaces:**
- Consumes: `CharacterResources` (types/characters.ts), `compactResources`, `currentHp`, `withHp` (задача 2), `PACT_KEY` (`lib/utils/spells/slot-keys.ts`), `ResolvedClassEntry` (`types/classes.ts`).
- Produces:

```ts
// hit-dice.ts
export interface HitDiceEntry { classId: string; name: string; die: number; level: number }
export function hitDicePool(entries: ResolvedClassEntry[]): HitDiceEntry[];
export function restoreHitDice(spent: Record<string, number> | undefined, pool: HitDiceEntry[], mode: "half" | "all"): Record<string, number> | undefined;
export type SpendHitDieError = "closed" | "dead" | "no_dice" | "hp_full";
export type SpendHitDieResult =
  | { ok: true; resources: CharacterResources; die: number; healed: number; hpBefore: number; hpAfter: number }
  | { ok: false; error: SpendHitDieError };
export function spendHitDie(r: CharacterResources, input: { pool: HitDiceEntry[]; classId: string; roll: number; conMod: number; maxHp: number }): SpendHitDieResult;

// rest.ts
export type RestAction = "short" | "long" | "close";
export function applyRest(action: RestAction, r: CharacterResources, opts: { pool: HitDiceEntry[]; longRestHitDice: "half" | "all" }): CharacterResources;

// lib/constants/experience.ts
export const XP_THRESHOLDS: Record<number, number>;   // рівень 2..20 → поріг
export function xpForLevel(level: number): number | null;  // null для рівня > 20 або < 1; рівень 1 → 0
export function levelUpAvailable(c: { level: number; experience: number }, maxLevel: number): boolean;
export function xpShare(amount: number, count: number, split: boolean): number;  // split → знак(amount) × ⌊|amount| / count⌋
export function addExperience(current: number, delta: number): number;           // не нижче 0
```

Рішення щодо специфікації: короткий відпочинок теж **пропускає мертвих** (як довгий); `close` закриває вікно й мертвим.

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/characters/resources/__tests__/hit-dice.test.ts
import { describe, expect, it } from "vitest";

import { type HitDiceEntry, hitDicePool, restoreHitDice, spendHitDie } from "@/lib/utils/characters/resources/hit-dice";
import type { GameClassData, ResolvedClassEntry } from "@/types/classes";

const pool: HitDiceEntry[] = [
  { classId: "wiz", name: "Маг", die: 6, level: 3 },
  { classId: "fig", name: "Воїн", die: 10, level: 2 },
];

describe("hitDicePool", () => {
  it("skips unresolved classes", () => {
    const fig = { id: "fig", name: "Воїн", hitDie: 10 } as GameClassData;

    const entries: ResolvedClassEntry[] = [{ classId: "fig", level: 2, class: fig, subclass: null }, { classId: "ghost", level: 1, class: null, subclass: null }];

    expect(hitDicePool(entries)).toEqual([{ classId: "fig", name: "Воїн", die: 10, level: 2 }]);
  });
});

describe("restoreHitDice", () => {
  it("half of total level (min 1), biggest dice first", () => {
    expect(restoreHitDice({ wiz: 3, fig: 2 }, pool, "half")).toEqual({ wiz: 3 });
  });

  it("half is at least 1", () => {
    expect(restoreHitDice({ fig: 1 }, [{ classId: "fig", name: "Воїн", die: 10, level: 1 }], "half")).toBeUndefined();
  });

  it("all restores everything", () => {
    expect(restoreHitDice({ wiz: 3, fig: 2 }, pool, "all")).toBeUndefined();
  });

  it("drops classes the hero no longer has", () => {
    expect(restoreHitDice({ old: 2, wiz: 1 }, pool, "half")).toBeUndefined();
  });
});

describe("spendHitDie", () => {
  const open = { shortRestOpen: true, hp: 5 };

  it("heals d + CON up to max and counts the die", () => {
    expect(spendHitDie(open, { pool, classId: "fig", roll: 7, conMod: 2, maxHp: 30 })).toEqual({
      ok: true, die: 10, healed: 9, hpBefore: 5, hpAfter: 14, resources: { shortRestOpen: true, hp: 14, hitDiceSpent: { fig: 1 } },
    });
  });

  it("healing reaching max drops hp", () => {
    const r = spendHitDie({ shortRestOpen: true, hp: 28 }, { pool, classId: "fig", roll: 7, conMod: 0, maxHp: 30 });

    expect(r.ok && r.resources).toEqual({ shortRestOpen: true, hitDiceSpent: { fig: 1 } });
  });

  it("negative CON never heals below 0", () => {
    const r = spendHitDie(open, { pool, classId: "wiz", roll: 1, conMod: -3, maxHp: 30 });

    expect(r.ok && r.healed).toBe(0);
  });

  it.each([
    [{ hp: 5 }, "fig", "closed"],
    [{ ...open, dead: true }, "fig", "dead"],
    [{ ...open, hitDiceSpent: { fig: 2 } }, "fig", "no_dice"],
    [open, "rogue", "no_dice"],
    [{ shortRestOpen: true }, "fig", "hp_full"],
  ])("%j / %s → %s", (r, classId, error) => {
    expect(spendHitDie(r, { pool, classId, roll: 5, conMod: 0, maxHp: 30 })).toEqual({ ok: false, error });
  });
});
```

```ts
// lib/utils/characters/resources/__tests__/rest.test.ts
import { describe, expect, it } from "vitest";

import type { HitDiceEntry } from "@/lib/utils/characters/resources/hit-dice";
import { applyRest } from "@/lib/utils/characters/resources/rest";
import type { CharacterResources } from "@/types/characters";

const pool: HitDiceEntry[] = [{ classId: "fig", name: "Воїн", die: 10, level: 4 }];

const opts = { pool, longRestHitDice: "half" as const };

const tired: CharacterResources = {
  hp: 3, tempHp: 4, slotsSpent: { "1": 2, pact: 1 }, hitDiceSpent: { fig: 4 },
  charges: { a: { used: 1, rest: "short" }, b: { used: 2, rest: "long" } }, exhaustion: 2,
};

describe("applyRest", () => {
  it("short: pact and short charges back, window opens", () => {
    expect(applyRest("short", tired, opts)).toEqual({
      hp: 3, tempHp: 4, slotsSpent: { "1": 2 }, hitDiceSpent: { fig: 4 }, charges: { b: { used: 2, rest: "long" } }, exhaustion: 2, shortRestOpen: true,
    });
  });

  it("long: everything back, half hit dice, exhaustion −1, window closes", () => {
    expect(applyRest("long", { ...tired, shortRestOpen: true }, opts)).toEqual({ hitDiceSpent: { fig: 2 }, exhaustion: 1 });
  });

  it("long with 2024 hit dice restores all", () => {
    expect(applyRest("long", tired, { ...opts, longRestHitDice: "all" })).toEqual({ exhaustion: 1 });
  });

  it("long: last exhaustion level disappears", () => {
    expect(applyRest("long", { exhaustion: 1 }, opts)).toEqual({});
  });

  it("dead heroes are skipped by short and long", () => {
    const dead: CharacterResources = { hp: 0, dead: true, slotsSpent: { pact: 1 } };

    expect(applyRest("short", dead, opts)).toBe(dead);
    expect(applyRest("long", dead, opts)).toBe(dead);
  });

  it("close only closes the window", () => {
    expect(applyRest("close", { hp: 3, shortRestOpen: true }, opts)).toEqual({ hp: 3 });
  });
});
```

```ts
// lib/constants/__tests__/experience.test.ts
import { describe, expect, it } from "vitest";

import { addExperience, levelUpAvailable, xpForLevel, xpShare } from "@/lib/constants/experience";

describe("experience", () => {
  it("5e thresholds", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(300);
    expect(xpForLevel(5)).toBe(6500);
    expect(xpForLevel(20)).toBe(355000);
    expect(xpForLevel(21)).toBeNull();
  });

  it("levelUpAvailable respects threshold and campaign max level", () => {
    expect(levelUpAvailable({ level: 1, experience: 300 }, 20)).toBe(true);
    expect(levelUpAvailable({ level: 1, experience: 299 }, 20)).toBe(false);
    expect(levelUpAvailable({ level: 5, experience: 999999 }, 5)).toBe(false);
    expect(levelUpAvailable({ level: 20, experience: 999999 }, 30)).toBe(false);
  });

  it("xpShare splits evenly, rounding toward zero", () => {
    expect(xpShare(1000, 3, true)).toBe(333);
    expect(xpShare(-100, 3, true)).toBe(-33);
    expect(xpShare(1000, 3, false)).toBe(1000);
  });

  it("addExperience never goes below 0", () => {
    expect(addExperience(50, -100)).toBe(0);
    expect(addExperience(50, 25)).toBe(75);
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/characters/resources/__tests__/rest.test.ts lib/utils/characters/resources/__tests__/hit-dice.test.ts lib/constants/__tests__/experience.test.ts` — FAIL.
- [ ] **Step 3: Implement.**

```ts
// lib/utils/characters/resources/hit-dice.ts
import { currentHp, withHp } from "./hp";

import type { CharacterResources } from "@/types/characters";
import type { ResolvedClassEntry } from "@/types/classes";

export interface HitDiceEntry {
  classId: string;
  name: string;
  die: number;
  level: number;
}

export function hitDicePool(entries: ResolvedClassEntry[]): HitDiceEntry[] {
  return entries.flatMap((e) => (e.class ? [{ classId: e.classId, name: e.class.name, die: e.class.hitDie, level: e.level }] : []));
}

export function restoreHitDice(spent: Record<string, number> | undefined, pool: HitDiceEntry[], mode: "half" | "all"): Record<string, number> | undefined {
  if (!spent) return undefined;

  const total = pool.reduce((sum, e) => sum + e.level, 0);

  let left = mode === "all" ? Number.POSITIVE_INFINITY : Math.max(1, Math.floor(total / 2));

  const next: Record<string, number> = {};

  for (const e of [...pool].sort((a, b) => b.die - a.die)) {
    const was = spent[e.classId] ?? 0;

    const back = Math.min(was, left);

    left -= back;

    if (was - back > 0) next[e.classId] = was - back;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export type SpendHitDieError = "closed" | "dead" | "no_dice" | "hp_full";

export type SpendHitDieResult =
  | { ok: true; resources: CharacterResources; die: number; healed: number; hpBefore: number; hpAfter: number }
  | { ok: false; error: SpendHitDieError };

export function spendHitDie(r: CharacterResources, input: { pool: HitDiceEntry[]; classId: string; roll: number; conMod: number; maxHp: number }): SpendHitDieResult {
  if (!r.shortRestOpen) return { ok: false, error: "closed" };

  if (r.dead) return { ok: false, error: "dead" };

  const entry = input.pool.find((e) => e.classId === input.classId);

  const spent = r.hitDiceSpent?.[input.classId] ?? 0;

  if (!entry || spent >= entry.level) return { ok: false, error: "no_dice" };

  const hpBefore = currentHp(r, input.maxHp);

  if (hpBefore >= input.maxHp) return { ok: false, error: "hp_full" };

  const healed = Math.max(0, input.roll + input.conMod);

  const hpAfter = Math.min(input.maxHp, hpBefore + healed);

  const counted = { ...r, hitDiceSpent: { ...r.hitDiceSpent, [input.classId]: spent + 1 } };

  return { ok: true, die: entry.die, healed, hpBefore, hpAfter, resources: withHp(counted, hpAfter, input.maxHp) };
}
```

```ts
// lib/utils/characters/resources/rest.ts
import { type HitDiceEntry, restoreHitDice } from "./hit-dice";
import { compactResources } from "./hp";

import { PACT_KEY } from "@/lib/utils/spells/slot-keys";
import type { CharacterResources } from "@/types/characters";

export type RestAction = "short" | "long" | "close";

function withoutKey<T>(record: Record<string, T> | undefined, drop: (key: string, value: T) => boolean): Record<string, T> | undefined {
  return record && Object.fromEntries(Object.entries(record).filter(([k, v]) => !drop(k, v)));
}

export function applyRest(action: RestAction, r: CharacterResources, opts: { pool: HitDiceEntry[]; longRestHitDice: "half" | "all" }): CharacterResources {
  if (action === "close") return compactResources({ ...r, shortRestOpen: undefined });

  if (r.dead) return r;

  if (action === "short") {
    return compactResources({
      ...r,
      slotsSpent: withoutKey(r.slotsSpent, (k) => k === PACT_KEY),
      charges: withoutKey(r.charges, (_k, c) => c.rest === "short"),
      shortRestOpen: true,
    });
  }

  return compactResources({
    hitDiceSpent: restoreHitDice(r.hitDiceSpent, opts.pool, opts.longRestHitDice),
    exhaustion: Math.max(0, (r.exhaustion ?? 0) - 1),
  });
}
```

```ts
// lib/constants/experience.ts
export const XP_THRESHOLDS: Record<number, number> = {
  2: 300, 3: 900, 4: 2700, 5: 6500, 6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000,
  11: 85000, 12: 100000, 13: 120000, 14: 140000, 15: 165000, 16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000,
};

export function xpForLevel(level: number): number | null {
  if (level === 1) return 0;

  return XP_THRESHOLDS[level] ?? null;
}

export function levelUpAvailable(c: { level: number; experience: number }, maxLevel: number): boolean {
  const next = xpForLevel(c.level + 1);

  return c.level < maxLevel && next !== null && c.experience >= next;
}

export function xpShare(amount: number, count: number, split: boolean): number {
  if (!split || count <= 1) return amount;

  return Math.sign(amount) * Math.floor(Math.abs(amount) / count);
}

export function addExperience(current: number, delta: number): number {
  return Math.max(0, current + delta);
}
```

- [ ] **Step 4:** ті самі тести — PASS.
- [ ] **Step 5: Commit**

```bash
git add lib/utils/characters/resources lib/constants/experience.ts lib/constants/__tests__/experience.test.ts
git commit -m "feat(constructor): 4d rest, hit dice and experience pure logic

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Старт бою з ресурсів

**Files:**
- Create: `lib/utils/characters/resources/battle.ts`
- Modify: `lib/utils/battle/participant/from-character.ts` (останній `return`), `types/battle.ts` (`battleData.inspiration?: boolean` поруч з `attacksLeft`)
- Test: `lib/utils/battle/participant/__tests__/from-character-resources.test.ts`

**Interfaces:**
- Consumes: `readResources` (задача 2), `currentHp` (задача 2), `applyCondition5e`, `PERMANENT_ROUNDS` (`@/lib/utils/battle/conditions`), `startDying` (`@/lib/utils/battle/death-saves`), `CombatStatus` (`@/lib/constants/battle`), `Ruleset["outOfCombat"]` (задача 1).
- Produces:

```ts
// lib/utils/characters/resources/battle.ts
export const REST_EXHAUSTION_KEY = "rest:exhaustion";
export interface StoredCharacterState { resources: CharacterResources | null; inspiration: boolean | null }  // null — правило вимкнене
export function storedCharacterState(character: { resources?: unknown; inspiration?: boolean | null }, rules: Ruleset): StoredCharacterState;
export function applyCharacterResources(p: BattleParticipant, state: StoredCharacterState, rules: Ruleset): BattleParticipant;
// types/battle.ts → BattleParticipant["battleData"]
inspiration?: boolean;  // натхнення героя в бою (лише коли rules.outOfCombat.inspiration)
```

Порядок у `applyCharacterResources`: натхнення → виснаження (`applyCondition5e`, 2014 ≥ 4 урізає max HP) → слоти (`current = max(0, max − slotsSpent[k])`, і класові, і збережені, і пакт) → заряди (`abilityUsage[key] = { battle: used, round: 0, turn: 0 }` лише для вмінь з `limits.perRest`) → HP (`dead` → `DEAD`, HP 0; інакше `currentHp(r, maxHp)` з уже урізаним max, `tempHp`; HP 0 → `startDying`, якщо `rules.deathSaves.enabled`, інакше `UNCONSCIOUS`). Учасник, якого виснаження 6 уже вбило, лишається `DEAD`.

`createBattleParticipantFromCharacter` використовують старт бою, лист (`buildSheetFor`) і баланс (`balance/character-stats.ts`) — усі троє бачать ті самі ресурси (рішення: баланс рахує поточний стан групи, сетап і старт бою узгоджені).

- [ ] **Step 1: Failing test**

```ts
// lib/utils/battle/participant/__tests__/from-character-resources.test.ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { exhaustionLevel } from "@/lib/utils/battle/conditions";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { parseRules } from "@/lib/utils/rules/schema";
import type { GameClassData } from "@/types/classes";

const base = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Воїн", level: 3,
  strength: 10, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 1, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "warrior", classes: [], resources: {}, inspiration: false,
};

const surge = { id: "surge", name: "Другий подих", trigger: { event: "action" }, limits: { perRest: { rest: "short", uses: 1 } }, effects: [{ kind: "note", text: "x" }] };

const cls = (over: Partial<GameClassData> & { id: string }): GameClassData => ({
  name: over.id, icon: null, color: null, hitDie: 10, savingThrows: ["strength", "constitution"],
  proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] },
  caster: "none", spellcastingAbility: null, features: [], subclassLevel: 3, subclasses: [], ...over,
});

const fighter = cls({ id: "fighter", name: "Воїн", features: [{ level: 1, abilities: [surge as never] }] });

const warlock = cls({ id: "warlock", name: "Чорнокнижник", hitDie: 8, caster: "pact", spellcastingAbility: "charisma", savingThrows: ["wisdom", "charisma"] });

const FIGHTER3 = [{ classId: "fighter", level: 3 }];

const build = (outOfCombat: object, character: object, extra: object = {}) => {
  const context = {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [],
    racesByName: { "Людина": null }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {},
    rules: parseRules({ classes: { enabled: true }, outOfCombat, ...extra }), classesById: { fighter, warlock },
  } as never;

  return createBattleParticipantFromCharacter({ ...base, classes: FIGHTER3, ...character } as never, "b1", ParticipantSide.ALLY, undefined, context);
};

const PERSIST = { persistResources: true };

describe("battle start from stored resources", () => {
  it("persistResources off: full resources, stored state ignored (HOMM behaviour)", async () => {
    const p = await build({}, { resources: { hp: 1, exhaustion: 3, charges: { "class:fighter:surge": { used: 1, rest: "short" } } }, inspiration: true });

    expect(p.combatStats.currentHp).toBe(p.combatStats.maxHp);
    expect(p.combatStats.status).toBe("active");
    expect(exhaustionLevel(p)).toBe(0);
    expect(p.battleData.abilityUsage).toEqual({});
    expect(p.battleData.inspiration).toBeUndefined();
  });

  it("HP and temp HP from resources; stored HP above max is clamped", async () => {
    const hurt = await build(PERSIST, { resources: { hp: 5, tempHp: 4 } });

    expect(hurt.combatStats).toMatchObject({ currentHp: 5, tempHp: 4, status: "active" });

    const over = await build(PERSIST, { resources: { hp: 9999 } });

    expect(over.combatStats.currentHp).toBe(over.combatStats.maxHp);
  });

  it("0 HP starts unconscious; with death saves — dying", async () => {
    const down = await build(PERSIST, { resources: { hp: 0 } });

    expect(down.combatStats).toMatchObject({ currentHp: 0, status: "unconscious" });
    expect(down.battleData.deathSaves).toBeUndefined();

    const dying = await build(PERSIST, { resources: { hp: 0 } }, { deathSaves: { enabled: true } });

    expect(dying.combatStats.status).toBe("unconscious");
    expect(dying.battleData.deathSaves).toEqual({ successes: 0, failures: 0, stable: false });
  });

  it("dead stays dead", async () => {
    expect((await build(PERSIST, { resources: { dead: true, hp: 0 } })).combatStats).toMatchObject({ currentHp: 0, status: "dead" });
  });

  it("pact slots: spent subtracted, never below 0", async () => {
    const one = await build(PERSIST, { classes: [{ classId: "warlock", level: 3 }], resources: { slotsSpent: { pact: 1 } } });

    expect(one.spellcasting.spellSlots?.pact).toMatchObject({ max: 2, current: 1 });

    const none = await build(PERSIST, { classes: [{ classId: "warlock", level: 3 }], resources: { slotsSpent: { pact: 5 } } });

    expect(none.spellcasting.spellSlots?.pact?.current).toBe(0);
  });

  it("perRest charges become battle usage", async () => {
    const p = await build(PERSIST, { resources: { charges: { "class:fighter:surge": { used: 1, rest: "short" }, "gone:x:y": { used: 3, rest: "long" } } } });

    expect(p.battleData.abilityUsage).toEqual({ "class:fighter:surge": { battle: 1, round: 0, turn: 0 } });
  });

  it("exhaustion 4 (2014) halves max HP and clamps the stored HP to it", async () => {
    const fresh = await build(PERSIST, {});

    const tired = await build(PERSIST, { resources: { exhaustion: 4, hp: 9999 } });

    expect(exhaustionLevel(tired)).toBe(4);
    expect(tired.combatStats.maxHp).toBe(Math.ceil(fresh.combatStats.maxHp / 2));
    expect(tired.combatStats.currentHp).toBe(tired.combatStats.maxHp);
  });

  it("inspiration comes from the column when the rule is on", async () => {
    expect((await build({ inspiration: true }, { inspiration: true })).battleData.inspiration).toBe(true);
    expect((await build({ inspiration: true }, { inspiration: false })).battleData.inspiration).toBe(false);
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/battle/participant/__tests__/from-character-resources.test.ts` — FAIL.
- [ ] **Step 3: Implement.**

```ts
// lib/utils/characters/resources/battle.ts
import { currentHp } from "./hp";
import { readResources } from "./schema";

import { CombatStatus } from "@/lib/constants/battle";
import { applyCondition5e, PERMANENT_ROUNDS } from "@/lib/utils/battle/conditions";
import { startDying } from "@/lib/utils/battle/death-saves";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { CharacterResources } from "@/types/characters";

export const REST_EXHAUSTION_KEY = "rest:exhaustion";

export interface StoredCharacterState {
  resources: CharacterResources | null;
  inspiration: boolean | null;
}

export function storedCharacterState(character: { resources?: unknown; inspiration?: boolean | null }, rules: Ruleset): StoredCharacterState {
  return {
    resources: rules.outOfCombat.persistResources ? readResources(character.resources) : null,
    inspiration: rules.outOfCombat.inspiration ? !!character.inspiration : null,
  };
}

function withExhaustion(p: BattleParticipant, level: number, rules: Ruleset): BattleParticipant {
  if (level <= 0) return p;

  const applied = applyCondition5e([p], p.basicInfo.id, {
    key: "exhaustion",
    rounds: PERMANENT_ROUNDS,
    permanent: true,
    levels: level,
    source: undefined,
    sourceName: "Виснаження",
    timedKey: REST_EXHAUSTION_KEY,
    round: 0,
    rules,
  });

  return applied.participants[0] ?? p;
}

function withSpentSlots(p: BattleParticipant, spent: CharacterResources["slotsSpent"]): BattleParticipant {
  const slots = p.spellcasting.spellSlots;

  if (!spent || !slots) return p;

  const next = Object.fromEntries(Object.entries(slots).map(([k, s]) => [k, { ...s, current: Math.max(0, s.max - (spent[k] ?? 0)) }]));

  return { ...p, spellcasting: { ...p.spellcasting, spellSlots: next } };
}

function withCharges(p: BattleParticipant, charges: CharacterResources["charges"]): BattleParticipant {
  if (!charges) return p;

  const usage = { ...p.battleData.abilityUsage };

  for (const a of p.battleData.resolvedAbilities) {
    const used = a.limits?.perRest ? (charges[a.key]?.used ?? 0) : 0;

    if (used > 0) usage[a.key] = { battle: used, round: 0, turn: 0 };
  }

  return { ...p, battleData: { ...p.battleData, abilityUsage: usage } };
}

function withHpState(p: BattleParticipant, r: CharacterResources, rules: Ruleset): BattleParticipant {
  const stats = p.combatStats;

  if (stats.status === CombatStatus.DEAD) return p;

  if (r.dead) return { ...p, combatStats: { ...stats, currentHp: 0, tempHp: 0, status: CombatStatus.DEAD } };

  const hp = currentHp(r, stats.maxHp);

  const tempHp = r.tempHp ?? 0;

  if (hp > 0) return { ...p, combatStats: { ...stats, currentHp: hp, tempHp } };

  const down = { ...p, combatStats: { ...stats, tempHp } };

  return rules.deathSaves.enabled ? startDying(down, rules) : { ...down, combatStats: { ...down.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } };
}

export function applyCharacterResources(p: BattleParticipant, state: StoredCharacterState, rules: Ruleset): BattleParticipant {
  const inspired = state.inspiration === null ? p : { ...p, battleData: { ...p.battleData, inspiration: state.inspiration } };

  const r = state.resources;

  if (!r) return inspired;

  return withHpState(withCharges(withSpentSlots(withExhaustion(inspired, r.exhaustion ?? 0, rules), r.slotsSpent), r.charges), r, rules);
}
```

У `from-character.ts` замінити останній `return`:

```ts
  const ready = { ...baked, spellcasting: { ...baked.spellcasting, spellSaveDC: spell?.saveDC, spellAttackBonus: spell?.attackBonus } };

  return applyCharacterResources(ready, storedCharacterState(character, rules), rules);
```

(імпорт `applyCharacterResources, storedCharacterState` з `@/lib/utils/characters/resources/battle`). Якщо `status` у `combatStats` має вужчий тип, ніж рядок, — використати наявний тип `CombatStatus` без `as`.

- [ ] **Step 4:** новий тест + `pnpm test:related lib/utils/battle/participant/from-character.ts lib/utils/characters/resources/battle.ts` — PASS (наявні тести from-character, листа й балансу без змін).
- [ ] **Step 5: Commit**

```bash
git add lib/utils/characters/resources/battle.ts lib/utils/battle/participant types/battle.ts
git commit -m "feat(constructor): 4d battle start from stored resources

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Завершення бою — запис ресурсів, перемога з 1 HP

**Files:**
- Modify: `lib/utils/characters/resources/battle.ts` (+ `applyBattleResult`, `spentSlots`, `battleResultLogData`), `lib/utils/battle/store/save-battle.ts` (гілка `completing`), `lib/utils/battle/turn/victory.ts` (`completeBattle(..., rules?)`), `lib/utils/battle/turn/turn-helpers.ts` (`ApplyVictoryParams.rules?`), `lib/utils/battle/turn/advance-turn.ts` (передати `rules`), `lib/utils/battle/pipeline/run-battle-mutation.ts` (`withVictory(scene, result, rules)` + виклик із `loaded.meta.rules`), `app/api/campaigns/[id]/battles/[battleId]/complete/complete-mutation.ts` (`ctx.meta.rules`)
- Create: `lib/utils/battle/store/persist-resources.ts`
- Test: `lib/utils/characters/resources/__tests__/battle-result.test.ts`, `lib/utils/battle/store/__tests__/save-battle-resources.test.ts`, `lib/utils/battle/turn/__tests__/victory-persist.test.ts`

**Interfaces:**
- Consumes: `compactResources`, `currentHp`, `withHp`, `readResources` (задача 2), `exhaustionLevel` (`@/lib/utils/battle/conditions`), `writeCharacterLog`, `CharacterLogKind` (задача 2).
- Produces:

```ts
// battle.ts
export function spentSlots(p: BattleParticipant): Record<string, number>;
export function applyBattleResult(r: CharacterResources, p: BattleParticipant): CharacterResources;
export function battleResultLogData(before: CharacterResources, p: BattleParticipant, battleId: string): Record<string, unknown>;
// persist-resources.ts
export function persistedHeroes(participants: BattleParticipant[]): BattleParticipant[];
export function persistCharacterResources(tx: Pick<Prisma.TransactionClient, "character" | "characterLog">, battle: { campaignId: string; battleId: string; rules: Ruleset }, participants: BattleParticipant[]): Promise<void>;
// victory.ts
export function completeBattle(initiativeOrder: BattleParticipant[], result: "victory" | "defeat", currentRound: number, rules?: Ruleset): { updatedParticipants: BattleParticipant[]; battleAction: BattleAction };
```

`applyBattleResult`: `hp` = `currentHp` учасника (`withHp` проти `maxHp` учасника), `tempHp` (>0), `dead` при `DEAD` (тоді `hp: 0`), `slotsSpent` = `max − current` по всіх слотах, `charges`: для вмінь учасника з `perRest` — `abilityUsage[key].battle` (0 → прибрати), заряди вмінь, яких в учасника немає, лишаються; `exhaustion = exhaustionLevel(p)`; `shortRestOpen` скидається; `hitDiceSpent` без змін. Інші стани й концентрація не переносяться.

`persistedHeroes`: лише `sourceType === "character"`, без `isExtraTurnSlot`, перший екземпляр на `sourceId`. Резерв — це `outcome.pending`, його не передаємо.

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/characters/resources/__tests__/battle-result.test.ts
import { describe, expect, it } from "vitest";

import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { applyBattleResult, battleResultLogData } from "@/lib/utils/characters/resources/battle";
import type { BattleParticipant } from "@/types/battle";

const surge = resolved({ trigger: { event: "action" }, limits: { perRest: { rest: "short", uses: 1 } }, effects: [{ kind: "note", text: "x" }] } as never, { type: "class", id: "fighter" });

const hero = (over: { hp?: number; temp?: number; status?: string; usage?: number; exhaustion?: number } = {}): BattleParticipant => {
  const p = createMockParticipant();

  return {
    ...p,
    combatStats: { ...p.combatStats, maxHp: 20, currentHp: over.hp ?? 20, tempHp: over.temp ?? 0, status: (over.status ?? "active") as never },
    spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 4, current: 1 }, "2": { max: 2, current: 2 }, pact: { max: 2, current: 0, level: 3 } } },
    battleData: {
      ...p.battleData,
      resolvedAbilities: [surge],
      abilityUsage: over.usage ? { [surge.key]: { battle: over.usage, round: 0, turn: 0 } } : {},
      activeEffects: over.exhaustion ? [{ id: "ex", name: "Виснаження", type: "debuff", duration: 99, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [{ type: "exhaustion", value: over.exhaustion }] } as never] : [],
    },
  };
};

describe("applyBattleResult", () => {
  it("writes HP, temp HP, spent slots, used charges; closes the rest window", () => {
    expect(applyBattleResult({ shortRestOpen: true, hitDiceSpent: { fighter: 1 } }, hero({ hp: 7, temp: 3, usage: 1 }))).toEqual({
      hp: 7, tempHp: 3, slotsSpent: { "1": 3, pact: 2 }, hitDiceSpent: { fighter: 1 }, charges: { [surge.key]: { used: 1, rest: "short" } },
    });
  });

  it("full HP and nothing spent → only untouched fields remain", () => {
    const fresh = hero();

    fresh.spellcasting.spellSlots = {};

    expect(applyBattleResult({ hp: 3 }, fresh)).toEqual({});
  });

  it("keeps charges of abilities the hero does not have, drops unused own ones", () => {
    expect(applyBattleResult({ charges: { other: { used: 2, rest: "long" }, [surge.key]: { used: 1, rest: "short" } } }, hero()).charges).toEqual({ other: { used: 2, rest: "long" } });
  });

  it("dead hero: dead flag and 0 HP", () => {
    expect(applyBattleResult({}, hero({ hp: 0, status: "dead" }))).toMatchObject({ hp: 0, dead: true });
  });

  it("exhaustion level from effects", () => {
    expect(applyBattleResult({}, hero({ exhaustion: 2 })).exhaustion).toBe(2);
  });

  it("log data: HP before/after", () => {
    expect(battleResultLogData({ hp: 15 }, hero({ hp: 7 }), "b1")).toMatchObject({ battleId: "b1", hpBefore: 15, hpAfter: 7, maxHp: 20, dead: false });
  });
});
```

```ts
// lib/utils/battle/store/__tests__/save-battle-resources.test.ts
import { describe, expect, it, vi } from "vitest";

import { BattleStatus } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleDb } from "@/lib/utils/battle/store/load-battle";
import { saveBattle } from "@/lib/utils/battle/store/save-battle";
import type { LoadedBattle } from "@/lib/utils/battle/store/types";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const hero = (id: string, sourceId: string, stats: Partial<BattleParticipant["combatStats"]> = {}, info: Partial<BattleParticipant["basicInfo"]> = {}): BattleParticipant => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id, sourceId, sourceType: "character", ...info }, combatStats: { ...p.combatStats, ...stats } };
};

const RULES: Ruleset = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources: true, inspiration: true } };

const loaded = (rules: Ruleset, participants: BattleParticipant[], pending: BattleParticipant[] = []): LoadedBattle => ({
  scene: { id: "b1", campaignId: "c1", status: BattleStatus.ACTIVE, round: 3, turnIndex: 0, version: 1, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  meta: { name: "Бій", description: null, setup: [], friendlyFire: false, rules, map: null, createdAt: new Date() },
  participants,
  pending,
  isDM: true,
});

function fakeDb(rows: Array<{ id: string; resources: unknown }>) {
  const tx = {
    battleScene: { updateMany: vi.fn(async () => ({ count: 1 })) },
    battleParticipant: { createMany: vi.fn(), deleteMany: vi.fn() },
    battleEvent: { createMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    battleSnapshot: { createMany: vi.fn(), deleteMany: vi.fn() },
    character: { findMany: vi.fn(async () => rows), update: vi.fn(async () => ({})) },
    characterLog: { createMany: vi.fn(async () => ({ count: 0 })) },
    $executeRaw: vi.fn(),
  };

  const db = { $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)) } as unknown as BattleDb;

  return { db, tx };
}

const COMPLETE = { status: BattleStatus.COMPLETED, completedAt: new Date() };

describe("saveBattle: resources write-back", () => {
  it("rules off → characters untouched", async () => {
    const a = hero("pa", "ch-a", { currentHp: 5 });

    const { db, tx } = fakeDb([]);

    await saveBattle(db, loaded(DEFAULT_RULES, [a]), { participants: [a], pending: [], events: [], scene: COMPLETE });

    expect(tx.character.findMany).not.toHaveBeenCalled();
  });

  it("not completing → characters untouched", async () => {
    const a = hero("pa", "ch-a", { currentHp: 5 });

    const { db, tx } = fakeDb([]);

    await saveBattle(db, loaded(RULES, [a]), { participants: [a], pending: [], events: [], scene: { turnIndex: 0 } });

    expect(tx.character.findMany).not.toHaveBeenCalled();
  });

  it("one write per hero from the field; extra-turn slot, units and reserve skipped", async () => {
    const slot = hero("pa-x", "ch-a", { currentHp: 20 }, { isExtraTurnSlot: true });

    const a = hero("pa", "ch-a", { currentHp: 7, maxHp: 20 });

    const unit = hero("u1", "unit-1", { currentHp: 1 }, { sourceType: "unit" });

    const reserve = hero("pb", "ch-b", { currentHp: 2 });

    const { db, tx } = fakeDb([{ id: "ch-a", resources: { shortRestOpen: true, hitDiceSpent: { f: 1 } } }]);

    await saveBattle(db, loaded(RULES, [slot, a, unit], [reserve]), { participants: [slot, a, unit], pending: [reserve], events: [], scene: COMPLETE });

    expect(tx.character.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["ch-a"] }, campaignId: "c1" } }));
    expect(tx.character.update).toHaveBeenCalledTimes(1);
    expect(tx.character.update).toHaveBeenCalledWith({ where: { id: "ch-a" }, data: { resources: { hp: 7, hitDiceSpent: { f: 1 } }, inspiration: false } });
    expect(tx.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ characterId: "ch-a", kind: "battle_result", actorUserId: null, data: expect.objectContaining({ battleId: "b1", hpBefore: 20, hpAfter: 7 }) })] });
  });

  it("dead hero and spent inspiration are written", async () => {
    const a = hero("pa", "ch-a", { currentHp: 0, status: "dead" });

    a.battleData = { ...a.battleData, inspiration: true };

    const { db, tx } = fakeDb([{ id: "ch-a", resources: {} }]);

    await saveBattle(db, loaded(RULES, [a]), { participants: [a], pending: [], events: [], scene: COMPLETE });

    expect(tx.character.update).toHaveBeenCalledWith({ where: { id: "ch-a" }, data: { resources: { hp: 0, dead: true }, inspiration: true } });
  });
});
```

```ts
// lib/utils/battle/turn/__tests__/victory-persist.test.ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { completeBattle } from "@/lib/utils/battle/turn/victory";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const base = createMockParticipant();

const downed = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero", side: ParticipantSide.ALLY }, combatStats: { ...base.combatStats, currentHp: 0, status: "unconscious" } });

describe("completeBattle with persisted resources", () => {
  it("victory revives unconscious allies with 1 HP", () => {
    const rules = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources: true } };

    const { updatedParticipants, battleAction } = completeBattle([downed], "victory", 3, rules);

    expect(updatedParticipants[0].combatStats).toMatchObject({ currentHp: 1, status: "active" });
    expect(battleAction.hpChanges).toEqual([expect.objectContaining({ participantId: "hero", oldHp: 0, newHp: 1 })]);
  });

  it("default rules keep max HP", () => {
    expect(completeBattle([downed], "victory", 3, DEFAULT_RULES).updatedParticipants[0].combatStats.currentHp).toBe(downed.combatStats.maxHp);
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/characters/resources/__tests__/battle-result.test.ts lib/utils/battle/store/__tests__/save-battle-resources.test.ts lib/utils/battle/turn/__tests__/victory-persist.test.ts` — FAIL.
- [ ] **Step 3: Implement `battle.ts` additions.**

```ts
// lib/utils/characters/resources/battle.ts (додати; імпортувати compactResources, withHp з "./hp", exhaustionLevel з "@/lib/utils/battle/conditions")
export function spentSlots(p: BattleParticipant): Record<string, number> {
  return Object.fromEntries(Object.entries(p.spellcasting.spellSlots ?? {}).flatMap(([k, s]) => (s.max - s.current > 0 ? [[k, s.max - s.current]] : [])));
}

function battleCharges(prev: CharacterResources["charges"], p: BattleParticipant): CharacterResources["charges"] {
  const perRest = p.battleData.resolvedAbilities.flatMap((a) => (a.limits?.perRest ? [{ key: a.key, rest: a.limits.perRest.rest }] : []));

  const own = new Set(perRest.map((a) => a.key));

  const kept = Object.entries(prev ?? {}).filter(([k]) => !own.has(k));

  const used = perRest.flatMap(({ key, rest }) => {
    const n = p.battleData.abilityUsage?.[key]?.battle ?? 0;

    return n > 0 ? [[key, { used: n, rest }] as const] : [];
  });

  return Object.fromEntries([...kept, ...used]);
}

export function applyBattleResult(r: CharacterResources, p: BattleParticipant): CharacterResources {
  const { maxHp, currentHp: hp, tempHp, status } = p.combatStats;

  const dead = status === CombatStatus.DEAD;

  const next: CharacterResources = {
    ...r,
    tempHp: dead ? undefined : tempHp,
    dead: dead || undefined,
    slotsSpent: spentSlots(p),
    charges: battleCharges(r.charges, p),
    exhaustion: exhaustionLevel(p),
    shortRestOpen: undefined,
  };

  return compactResources(dead ? { ...next, hp: 0 } : withHp(next, Math.max(0, hp), maxHp));
}

export function battleResultLogData(before: CharacterResources, p: BattleParticipant, battleId: string): Record<string, unknown> {
  const { maxHp, currentHp: hp, status } = p.combatStats;

  return { battleId, hpBefore: currentHp(before, maxHp), hpAfter: Math.max(0, hp), maxHp, dead: status === CombatStatus.DEAD, slotsSpent: spentSlots(p) };
}
```

- [ ] **Step 4: Implement write-back.**

```ts
// lib/utils/battle/store/persist-resources.ts
import type { Prisma } from "@prisma/client";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { type CharacterLogInput, writeCharacterLog } from "@/lib/server/characters/log";
import { applyBattleResult, battleResultLogData } from "@/lib/utils/characters/resources/battle";
import { readResources } from "@/lib/utils/characters/resources/schema";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export function persistedHeroes(participants: BattleParticipant[]): BattleParticipant[] {
  const seen = new Set<string>();

  return participants.filter((p) => {
    const { sourceType, sourceId, isExtraTurnSlot } = p.basicInfo;

    if (sourceType !== ParticipantSourceType.CHARACTER || isExtraTurnSlot || seen.has(sourceId)) return false;

    seen.add(sourceId);

    return true;
  });
}

export async function persistCharacterResources(
  tx: Pick<Prisma.TransactionClient, "character" | "characterLog">,
  battle: { campaignId: string; battleId: string; rules: Ruleset },
  participants: BattleParticipant[],
): Promise<void> {
  const { persistResources, inspiration } = battle.rules.outOfCombat;

  if (!persistResources && !inspiration) return;

  const heroes = persistedHeroes(participants);

  if (heroes.length === 0) return;

  const rows = await tx.character.findMany({ where: { id: { in: heroes.map((h) => h.basicInfo.sourceId) }, campaignId: battle.campaignId }, select: { id: true, resources: true } });

  const byId = new Map(rows.map((r) => [r.id, r]));

  const logs: CharacterLogInput[] = [];

  for (const hero of heroes) {
    const row = byId.get(hero.basicInfo.sourceId);

    if (!row) continue;

    const before = readResources(row.resources);

    await tx.character.update({
      where: { id: row.id },
      data: {
        ...(persistResources && { resources: applyBattleResult(before, hero) as Prisma.InputJsonValue }),
        ...(inspiration && { inspiration: !!hero.battleData.inspiration }),
      },
    });

    if (persistResources) logs.push({ campaignId: battle.campaignId, characterId: row.id, actorUserId: null, kind: CharacterLogKind.BATTLE_RESULT, data: battleResultLogData(before, hero, battle.battleId) });
  }

  await writeCharacterLog(tx, logs);
}
```

У `save-battle.ts` замінити останній рядок транзакції:

```ts
    if (completing) {
      await persistCharacterResources(tx, { campaignId: scene.campaignId, battleId: scene.id, rules: before.meta.rules }, outcome.participants);
      await tx.$executeRaw(pruneSnapshotsSql(scene.id));
    }
```

- [ ] **Step 5: Victory.** У `victory.ts` додати параметр `rules?: Ruleset` (імпорт типу з `@/lib/utils/rules`):

```ts
  const reviveHp = (p: BattleParticipant) => (rules?.outOfCombat.persistResources ? 1 : p.combatStats.maxHp);
```

і використати `reviveHp(p)` замість `p.combatStats.maxHp` у `updatedParticipants` (`currentHp`) та в `hpChanges` (`newHp: reviveHp(p)`, `change: p.combatStats.currentHp - reviveHp(p)`). Викликачі: `complete-mutation.ts` → `completeBattle(ctx.participants, result, ctx.scene.round, ctx.meta.rules)`; `run-battle-mutation.ts` → `function withVictory(scene: BattleSceneState, result: MutationResult, rules: Ruleset)`, усередині `completeBattle(result.participants, victory.result, round, rules)`, виклик `withVictory(loaded.scene, isDryRun ? placed : withModeAfterMutation(map, loaded.scene, placed), loaded.meta.rules)`; `turn-helpers.ts` → поле `rules?: Ruleset` у `ApplyVictoryParams`, `completeBattle(order, result, nextRound, params.rules)`; `advance-turn.ts` → `applyVictoryCompletion({ …, rules })`.

- [ ] **Step 6:** нові тести + `pnpm test:related lib/utils/battle/store/save-battle.ts lib/utils/battle/turn/victory.ts lib/utils/battle/turn/turn-helpers.ts lib/utils/battle/pipeline/run-battle-mutation.ts` — PASS (наявні `victory.test.ts`, `save-battle-map.test.ts` без змін).
- [ ] **Step 7: Commit**

```bash
git add lib/utils/characters/resources lib/utils/battle/store lib/utils/battle/turn lib/utils/battle/pipeline/run-battle-mutation.ts "app/api/campaigns/[id]/battles/[battleId]/complete/complete-mutation.ts"
git commit -m "feat(constructor): 4d write resources back on battle completion, revive with 1 HP

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Спільні серверні модулі й роут відпочинку

**Files:**
- Create: `lib/schemas/out-of-combat.ts`, `lib/server/characters/access.ts`, `lib/server/characters/participant.ts`, `app/api/campaigns/[id]/rest/route.ts`, `app/api/campaigns/[id]/rest/rest-handler.ts`
- Modify: `lib/constants/api-errors.ts`, `types/characters.ts` (тіла/відповіді 4d), `app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts` (використати `buildCharacterParticipant`)
- Test: `lib/server/characters/__tests__/access.test.ts`, `app/api/campaigns/[id]/rest/__tests__/rest.test.ts`

**Interfaces:**
- Consumes: `applyRest` (задача 3), `hitDicePool` (задача 3), `readResources`, `writeCharacterLog`, `CharacterLogKind` (задача 2), `requireCampaignAccess`/`requireDM`/`CampaignAccessResult` (`lib/utils/api/api-auth.ts`), `loadOwned`, `parseBody`, `errorResponse`, `handleApiError`, `loadClassesById` (`lib/utils/battle/participant/load-classes.ts`), `resolveClassEntries` (`lib/utils/spells/class-slots.ts`), `CharacterClassesSchema` (`lib/schemas/classes.ts`).
- Produces (використовують задачі 7–9, 11):

```ts
// lib/constants/api-errors.ts (додати в API_ERRORS)
OOC_RESOURCES_DISABLED: "Ресурси між боями вимкнені в правилах кампанії",
OOC_XP_DISABLED: "Досвід за таблицею вимкнений у правилах кампанії",
OOC_INSPIRATION_DISABLED: "Натхнення вимкнене в правилах кампанії",
NO_INSPIRATION: "У героя немає натхнення",
REST_CHARACTERS_INVALID: "Відпочинок — лише для схвалених героїв цієї кампанії",
XP_CHARACTERS_INVALID: "Досвід — лише для схвалених героїв цієї кампанії",
SHORT_REST_CLOSED: "Кістки хітів витрачають лише під час короткого відпочинку",
CHARACTER_DEAD: "Герой мертвий",
NO_HIT_DICE: "Невитрачених кісток хітів цього класу немає",
HP_FULL: "Здоров'я вже повне",

// types/characters.ts (додати; DndSkill — type-імпорт з @/lib/constants/skills, CharacterLogKindValue — з @/lib/constants/character-log)
export type RestBody = { kind: "short" | "long" | "close"; characterIds: string[] };
export type SheetRollSubject = { kind: "check"; skill: DndSkill } | { kind: "check"; ability: AbilityKey } | { kind: "save"; ability: AbilityKey };
export type SheetRollBody = SheetRollSubject & { useInspiration?: boolean };
export interface SheetRollResult { label: string; rolls: number[]; roll: number; mod: number; bonus: number; total: number; mode: "advantage" | "disadvantage" | "normal"; autoFail: boolean; inspirationUsed: boolean }
export interface HitDieResult { die: number; roll: number; healed: number; hpBefore: number; hpAfter: number; resources: CharacterResources }
export type AwardXpBody = { characterIds: string[]; amount: number; split: boolean; note?: string };
export type ResourcesEditBody = { hp?: number; tempHp?: number; exhaustion?: number; dead?: boolean; reset?: true };
export interface CharacterLogEntry { id: string; kind: CharacterLogKindValue; data: Record<string, unknown>; createdAt: string; actor: { id: string; displayName: string | null } | null }

// lib/schemas/out-of-combat.ts
export const restSchema; export type RestInput = z.infer<typeof restSchema>;
export const hitDieSchema; export type HitDieInput = z.infer<typeof hitDieSchema>;
export const sheetRollSchema; export type SheetRollInput = z.infer<typeof sheetRollSchema>;
export const experienceSchema; export type ExperienceInput = z.infer<typeof experienceSchema>;
export const inspirationSchema;
export const resourcesEditSchema; export type ResourcesEditInput = z.infer<typeof resourcesEditSchema>;

// lib/server/characters/access.ts
export const loadCharacterWithInventory: (characterId: string) => Promise<CharacterWithInventory | null>;
export type CharacterWithInventory = Prisma.CharacterGetPayload<{ include: { inventory: true } }>;
export function requireCharacterAccess(campaignId: string, characterId: string, opts?: { dmOnly?: boolean }): Promise<{ access: CampaignAccessResult; character: CharacterWithInventory } | NextResponse>;  // 404 / 403 (чужий персонаж, чужий гравець)

// lib/server/characters/participant.ts
export function buildCharacterParticipant(character: CharacterFromPrisma, campaign: { maxLevel: number; rules: Ruleset }): Promise<CharacterContext & { participant: BattleParticipant }>;

// app/api/campaigns/[id]/rest/rest-handler.ts
export function restParty(access: CampaignAccessResult, body: RestInput): Promise<NextResponse>;  // 200 { characters: { id, resources }[] }
```

- [ ] **Step 1: Failing tests**

```ts
// lib/server/characters/__tests__/access.test.ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn() } } }));

const as = (userId: string, isDM: boolean) => vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId, isDM, campaign: { id: "camp" } } as never);

const status = (r: unknown) => (r instanceof NextResponse ? r.status : 200);

describe("requireCharacterAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "camp", controlledBy: "owner" } as never);
  });

  it("owner and DM pass, another player gets 403", async () => {
    as("owner", false);
    expect(status(await requireCharacterAccess("camp", "ch"))).toBe(200);

    as("dm", true);
    expect(status(await requireCharacterAccess("camp", "ch"))).toBe(200);

    as("other", false);
    expect(status(await requireCharacterAccess("camp", "ch"))).toBe(403);
  });

  it("character of another campaign → 403, missing → 404", async () => {
    as("dm", true);
    vi.mocked(prisma.character.findUnique).mockResolvedValueOnce({ id: "ch", campaignId: "elsewhere", controlledBy: "owner" } as never);
    expect(status(await requireCharacterAccess("camp", "ch"))).toBe(403);

    vi.mocked(prisma.character.findUnique).mockResolvedValueOnce(null);
    expect(status(await requireCharacterAccess("camp", "ch"))).toBe(404);
  });

  it("dmOnly asks requireCampaignAccess for a DM", async () => {
    as("dm", true);
    await requireCharacterAccess("camp", "ch", { dmOnly: true });

    expect(apiAuth.requireCampaignAccess).toHaveBeenCalledWith("camp", true);
  });
});
```

```ts
// app/api/campaigns/[id]/rest/__tests__/rest.test.ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/cache/reference-data", () => ({
  getCachedClasses: vi.fn(async () => [{ id: "fig", name: "Воїн", hitDie: 10, caster: "none", savingThrows: [], proficiencies: {}, skillChoices: {}, features: [], subclasses: [], subclassLevel: 3 }]),
}));
vi.mock("@/lib/db", () => {
  const prisma = { character: { findMany: vi.fn(), update: vi.fn() }, characterLog: { createMany: vi.fn() }, $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const rules = (persistResources: boolean) => ({ ...DEFAULT_RULES, classes: { enabled: true }, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources } });

const asDM = (persist = true) => vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: rules(persist) } } as never);

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp" }) }) as Promise<NextResponse>;
};

describe("POST /rest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("409 when persistResources is off", async () => {
    asDM(false);

    expect((await post({ kind: "short", characterIds: ["a"] })).status).toBe(409);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("400 when an id is foreign, missing or pending — nothing written", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", classes: [], resources: {} }] as never);

    const res = await post({ kind: "long", characterIds: ["a", "foreign"] });

    expect(res.status).toBe(400);
    expect(prisma.character.update).not.toHaveBeenCalled();
    expect(prisma.characterLog.createMany).not.toHaveBeenCalled();
  });

  it("long rest restores, returns new resources and logs", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", classes: [{ classId: "fig", level: 4 }], resources: { hp: 3, hitDiceSpent: { fig: 4 }, exhaustion: 1, shortRestOpen: true } }] as never);

    const res = await post({ kind: "long", characterIds: ["a"] });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ characters: [{ id: "a", resources: { hitDiceSpent: { fig: 2 } } }] });
    expect(prisma.character.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["a"] }, campaignId: "camp", status: "active" } }));
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ characterId: "a", kind: "long_rest", actorUserId: "dm" })] });
  });

  it("short rest opens the hit dice window", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", classes: [], resources: { slotsSpent: { pact: 1 } } }] as never);

    expect(await (await post({ kind: "short", characterIds: ["a"] })).json()).toEqual({ characters: [{ id: "a", resources: { shortRestOpen: true } }] });
  });

  it("player gets the 403 from requireDM", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await post({ kind: "short", characterIds: ["a"] })).status).toBe(403);
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/server/characters/__tests__/access.test.ts "app/api/campaigns/[id]/rest/__tests__/rest.test.ts"` — FAIL.
- [ ] **Step 3: Schemas, errors, types.**

```ts
// lib/schemas/out-of-combat.ts
import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { DND_SKILLS } from "@/lib/constants/skills";
import { MAX_RESOURCE_EXHAUSTION } from "@/lib/utils/characters/resources/schema";

const characterIds = z.array(z.string().min(1).max(100)).min(1).max(50);

const useInspiration = z.boolean().optional();

export const restSchema = z.object({ kind: z.enum(["short", "long", "close"]), characterIds });

export type RestInput = z.infer<typeof restSchema>;

export const hitDieSchema = z.object({ classId: z.string().min(1).max(100) });

export type HitDieInput = z.infer<typeof hitDieSchema>;

export const sheetRollSchema = z.union([
  z.object({ kind: z.literal("check"), skill: z.enum(DND_SKILLS), useInspiration }),
  z.object({ kind: z.literal("check"), ability: z.enum(ABILITY_KEYS), useInspiration }),
  z.object({ kind: z.literal("save"), ability: z.enum(ABILITY_KEYS), useInspiration }),
]);

export type SheetRollInput = z.infer<typeof sheetRollSchema>;

export const experienceSchema = z.object({
  characterIds,
  amount: z.number().int().min(-1_000_000).max(1_000_000).refine((n) => n !== 0, "Сума досвіду не може бути 0"),
  split: z.boolean().default(false),
  note: z.string().trim().max(200).optional(),
});

export type ExperienceInput = z.infer<typeof experienceSchema>;

export const inspirationSchema = z.object({ value: z.boolean() });

export const resourcesEditSchema = z
  .object({
    hp: z.number().int().min(0).max(9999).optional(),
    tempHp: z.number().int().min(0).max(999).optional(),
    exhaustion: z.number().int().min(0).max(MAX_RESOURCE_EXHAUSTION).optional(),
    dead: z.boolean().optional(),
    reset: z.literal(true).optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Порожня правка");

export type ResourcesEditInput = z.infer<typeof resourcesEditSchema>;
```

Додати тексти в `API_ERRORS` і типи в `types/characters.ts` (див. Interfaces).

- [ ] **Step 4: Shared server modules.**

```ts
// lib/server/characters/access.ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import "server-only";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { type CampaignAccessResult, requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";

export type CharacterWithInventory = Prisma.CharacterGetPayload<{ include: { inventory: true } }>;

export const loadCharacterWithInventory = (characterId: string) => prisma.character.findUnique({ where: { id: characterId }, include: { inventory: true } });

export async function requireCharacterAccess(
  campaignId: string,
  characterId: string,
  opts: { dmOnly?: boolean } = {},
): Promise<{ access: CampaignAccessResult; character: CharacterWithInventory } | NextResponse> {
  const access = await requireCampaignAccess(campaignId, !!opts.dmOnly);

  if (access instanceof NextResponse) return access;

  const character = await loadOwned(loadCharacterWithInventory(characterId), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (character instanceof NextResponse) return character;

  if (!access.isDM && character.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  return { access, character };
}
```

```ts
// lib/server/characters/participant.ts
import { ParticipantSide } from "@/lib/constants/battle";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant";
import { type CharacterContext, loadCharacterContext } from "@/lib/utils/battle/participant/load-character-context";
import type { CharacterFromPrisma } from "@/lib/utils/battle/types/participant";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

/** Учасник з листа: той самий шлях, що й старт бою (ресурси, виснаження, аури). */
export async function buildCharacterParticipant(character: CharacterFromPrisma, campaign: { maxLevel: number; rules: Ruleset }): Promise<CharacterContext & { participant: BattleParticipant }> {
  const loaded = await loadCharacterContext(character, campaign);

  const built = await createBattleParticipantFromCharacter(character, "", ParticipantSide.ALLY, undefined, loaded.context);

  const [participant] = applyBakedAuras([built], new Set([built.basicInfo.id]));

  return { ...loaded, participant };
}
```

У `sheet-handler.ts` замінити перші три рядки `buildSheetFor` на `const { context, race, tree, participant } = await buildCharacterParticipant(character, campaign);` і прибрати невикористані імпорти (`ParticipantSide`, `applyBakedAuras`, `createBattleParticipantFromCharacter`, `loadCharacterContext`).

- [ ] **Step 5: Rest route.**

```ts
// app/api/campaigns/[id]/rest/rest-handler.ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { CharacterClassesSchema } from "@/lib/schemas/classes";
import type { RestInput } from "@/lib/schemas/out-of-combat";
import { writeCharacterLog } from "@/lib/server/characters/log";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadClassesById } from "@/lib/utils/battle/participant/load-classes";
import { hitDicePool } from "@/lib/utils/characters/resources/hit-dice";
import { applyRest } from "@/lib/utils/characters/resources/rest";
import { readResources } from "@/lib/utils/characters/resources/schema";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";

const LOG_KIND = { short: CharacterLogKind.SHORT_REST, long: CharacterLogKind.LONG_REST, close: CharacterLogKind.REST_CLOSED } as const;

export async function restParty(access: CampaignAccessResult, body: RestInput): Promise<NextResponse> {
  const { campaign } = access;

  const { outOfCombat } = campaign.rules;

  if (!outOfCombat.persistResources) return errorResponse(API_ERRORS.OOC_RESOURCES_DISABLED, 409);

  const ids = [...new Set(body.characterIds)];

  const characters = await prisma.character.findMany({ where: { id: { in: ids }, campaignId: campaign.id, status: CharacterStatus.ACTIVE }, select: { id: true, classes: true, resources: true } });

  if (characters.length !== ids.length) return errorResponse(API_ERRORS.REST_CHARACTERS_INVALID, 400);

  const classesById = body.kind === "long" && campaign.rules.classes.enabled ? await loadClassesById(campaign.id) : {};

  const updated = characters.map((c) => {
    const entries = CharacterClassesSchema.safeParse(c.classes);

    const pool = entries.success ? hitDicePool(resolveClassEntries(entries.data, classesById)) : [];

    return { id: c.id, resources: applyRest(body.kind, readResources(c.resources), { pool, longRestHitDice: outOfCombat.longRestHitDice }) };
  });

  await prisma.$transaction(async (tx) => {
    for (const u of updated) await tx.character.update({ where: { id: u.id }, data: { resources: u.resources as Prisma.InputJsonValue } });

    await writeCharacterLog(tx, updated.map((u) => ({ campaignId: campaign.id, characterId: u.id, actorUserId: access.userId, kind: LOG_KIND[body.kind], data: {} })));
  });

  return NextResponse.json({ characters: updated });
}
```

```ts
// app/api/campaigns/[id]/rest/route.ts
import { NextResponse } from "next/server";

import { restParty } from "./rest-handler";

import { restSchema } from "@/lib/schemas/out-of-combat";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CampaignRouteContext } from "@/types/api";

export async function POST(request: Request, { params }: CampaignRouteContext) {
  try {
    const { id } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(restSchema, request);

    if (body instanceof NextResponse) return body;

    return await restParty(access, body);
  } catch (error) {
    return handleApiError(error, { action: "rest party" });
  }
}
```

- [ ] **Step 6:** нові тести + `pnpm test:related "app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts"` — PASS.
- [ ] **Step 7: Commit**

```bash
git add lib/schemas/out-of-combat.ts lib/server/characters lib/constants/api-errors.ts types/characters.ts "app/api/campaigns/[id]/rest" "app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts"
git commit -m "feat(constructor): 4d party rest route, character access and participant helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Кістки хітів і кидки з листа

**Files:**
- Modify: `lib/utils/battle/checks/roll-check.ts` (параметр `advantage`), `lib/utils/battle/saves/roll-save.ts` (параметр `advantage`)
- Create: `lib/utils/characters/resources/sheet-roll.ts`, `app/api/campaigns/[id]/characters/[characterId]/hit-dice/{route,hit-die-handler}.ts`, `app/api/campaigns/[id]/characters/[characterId]/roll/{route,roll-handler}.ts`
- Test: `lib/utils/characters/resources/__tests__/sheet-roll.test.ts`, `app/api/campaigns/[id]/characters/[characterId]/hit-dice/__tests__/hit-dice.test.ts`, `app/api/campaigns/[id]/characters/[characterId]/roll/__tests__/roll.test.ts`

**Interfaces:**
- Consumes: `requireCharacterAccess`, `CharacterWithInventory` (задача 6), `buildCharacterParticipant` (задача 6), `hitDicePool`, `spendHitDie`, `SpendHitDieError` (задача 3), `readResources`, `writeCharacterLog`, `CharacterLogKind` (задача 2), `hitDieSchema`, `sheetRollSchema`, тексти `API_ERRORS.*` (задача 6), `rollDie` (`lib/utils/common/dice.ts`), `ABILITY_LABELS` (`lib/constants/abilities.ts`), `DND_SKILL_META` (`lib/constants/skills.ts`).
- Produces:

```ts
// roll-check.ts / roll-save.ts — нове необов'язкове поле входу (за замовчуванням false)
rollCheck(input: { …; advantage?: boolean })  // додаткова причина переваги, скасовується будь-якою перешкодою
rollSave(input: { …; advantage?: boolean })
// sheet-roll.ts
export function sheetRollLabel(subject: SheetRollSubject): string;
export function rollFromSheet(p: BattleParticipant, subject: SheetRollSubject, opts: { rules: Ruleset; rng: () => number; inspiration: boolean }): SheetRollResult;
// POST …/hit-dice  { classId } → 200 HitDieResult | 409
// POST …/roll      SheetRollBody → 200 SheetRollResult | 409 (натхнення)
```

Натхнення з листа знімається атомарно: `updateMany({ where: { id, inspiration: true }, data: { inspiration: false } })`; `count === 0` → 409 `NO_INSPIRATION`, журнал не пишеться.

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/characters/resources/__tests__/sheet-roll.test.ts
import { describe, expect, it } from "vitest";

import { ABILITY_LABELS } from "@/lib/constants/abilities";
import { seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { rollFromSheet } from "@/lib/utils/characters/resources/sheet-roll";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const rogue = (exhausted = false): BattleParticipant => {
  const p = createMockParticipant();

  return {
    ...p,
    abilities: { ...p.abilities, skillProficiencies: ["stealth"] },
    battleData: {
      ...p.battleData,
      activeEffects: exhausted ? [{ id: "ex", name: "Виснаження", type: "debuff", duration: 99, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [{ type: "exhaustion", value: 1 }] } as never] : [],
    },
  };
};

const opts = (inspiration: boolean) => ({ rules: DEFAULT_RULES, rng: seq(0.5, 0.95), inspiration });

describe("rollFromSheet", () => {
  it("skill check: d20 + DEX + proficiency", () => {
    expect(rollFromSheet(rogue(), { kind: "check", skill: "stealth" }, opts(false))).toMatchObject({ rolls: [11], roll: 11, mod: 1, bonus: 2, total: 14, mode: "normal", inspirationUsed: false });
  });

  it("inspiration gives advantage", () => {
    expect(rollFromSheet(rogue(), { kind: "check", skill: "stealth" }, opts(true))).toMatchObject({ rolls: [11, 20], roll: 20, total: 23, mode: "advantage", inspirationUsed: true });
  });

  it("inspiration cancels exhaustion disadvantage (2014)", () => {
    expect(rollFromSheet(rogue(true), { kind: "check", skill: "stealth" }, opts(true))).toMatchObject({ rolls: [11], mode: "normal" });
    expect(rollFromSheet(rogue(true), { kind: "check", skill: "stealth" }, opts(false))).toMatchObject({ rolls: [11, 20], roll: 11, mode: "disadvantage" });
  });

  it("saving throw has its own label", () => {
    const r = rollFromSheet(rogue(), { kind: "save", ability: "wisdom" }, opts(false));

    expect(r.label).toContain(ABILITY_LABELS.wisdom);
    expect(r).toMatchObject({ total: 11, autoFail: false });
  });
});
```

```ts
// app/api/campaigns/[id]/characters/[characterId]/hit-dice/__tests__/hit-dice.test.ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));
vi.mock("@/lib/server/characters/participant", () => ({
  buildCharacterParticipant: vi.fn(async () => ({ participant: { abilities: { modifiers: { constitution: 2 } }, combatStats: { maxHp: 30 } } })),
}));
vi.mock("@/lib/utils/common/dice", async (orig) => ({ ...(await orig<object>()), rollDie: vi.fn(() => 6) }));
vi.mock("@/lib/cache/reference-data", () => ({
  getCachedClasses: vi.fn(async () => [{ id: "fig", name: "Воїн", hitDie: 10, caster: "none", savingThrows: [], proficiencies: {}, skillChoices: {}, features: [], subclasses: [], subclassLevel: 3 }]),
}));
vi.mock("@/lib/db", () => {
  const prisma = { character: { update: vi.fn() }, characterLog: { createMany: vi.fn() }, $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const rules = (persistResources = true) => ({ ...DEFAULT_RULES, classes: { enabled: true }, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources } });

const gate = (resources: object, persist = true) =>
  vi.mocked(access.requireCharacterAccess).mockResolvedValue({
    access: { userId: "owner", isDM: false, campaign: { id: "camp", maxLevel: 20, rules: rules(persist) } },
    character: { id: "ch", campaignId: "camp", classes: [{ classId: "fig", level: 3 }], resources },
  } as never);

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("POST hit-dice", () => {
  beforeEach(() => vi.clearAllMocks());

  it("heals d10 + CON and counts the die", async () => {
    gate({ shortRestOpen: true, hp: 10 });

    const res = await post({ classId: "fig" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ die: 10, roll: 6, healed: 8, hpBefore: 10, hpAfter: 18, resources: { shortRestOpen: true, hp: 18, hitDiceSpent: { fig: 1 } } });
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "hit_die", actorUserId: "owner" })] });
  });

  it.each([
    [{ hp: 10 }, API_ERRORS.SHORT_REST_CLOSED],
    [{ shortRestOpen: true }, API_ERRORS.HP_FULL],
    [{ shortRestOpen: true, hp: 1, hitDiceSpent: { fig: 3 } }, API_ERRORS.NO_HIT_DICE],
    [{ shortRestOpen: true, hp: 0, dead: true }, API_ERRORS.CHARACTER_DEAD],
  ])("409 for %j", async (resources, error) => {
    gate(resources);

    const res = await post({ classId: "fig" });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(error);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("409 when persistResources is off", async () => {
    gate({ shortRestOpen: true, hp: 1 }, false);

    expect((await post({ classId: "fig" })).status).toBe(409);
  });

  it("access errors pass through", async () => {
    vi.mocked(access.requireCharacterAccess).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await post({ classId: "fig" })).status).toBe(403);
  });
});
```

```ts
// app/api/campaigns/[id]/characters/[characterId]/roll/__tests__/roll.test.ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));
vi.mock("@/lib/server/characters/participant", () => ({ buildCharacterParticipant: vi.fn(async () => ({ participant: createMockParticipant() })) }));
vi.mock("@/lib/db", () => {
  const prisma = { character: { updateMany: vi.fn(async () => ({ count: 1 })) }, characterLog: { createMany: vi.fn() }, $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const gate = (inspirationRule: boolean) =>
  vi.mocked(access.requireCharacterAccess).mockResolvedValue({
    access: { userId: "owner", isDM: false, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, inspiration: inspirationRule } } } },
    character: { id: "ch", campaignId: "camp", inspiration: true },
  } as never);

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("POST roll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skill check without inspiration: result + log, inspiration untouched", async () => {
    gate(true);

    const res = await post({ kind: "check", skill: "stealth" });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ mode: "normal", inspirationUsed: false });
    expect(json.total).toBe(json.roll + json.mod + json.bonus);
    expect(prisma.character.updateMany).not.toHaveBeenCalled();
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "check" })] });
  });

  it("inspiration spends the flag and rolls with advantage", async () => {
    gate(true);

    const json = await (await post({ kind: "save", ability: "wisdom", useInspiration: true })).json();

    expect(json).toMatchObject({ mode: "advantage", inspirationUsed: true });
    expect(json.rolls).toHaveLength(2);
    expect(prisma.character.updateMany).toHaveBeenCalledWith({ where: { id: "ch", inspiration: true }, data: { inspiration: false } });
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "save" })] });
  });

  it("no inspiration left → 409, nothing logged", async () => {
    gate(true);
    vi.mocked(prisma.character.updateMany).mockResolvedValueOnce({ count: 0 } as never);

    const res = await post({ kind: "check", ability: "strength", useInspiration: true });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(API_ERRORS.NO_INSPIRATION);
    expect(prisma.characterLog.createMany).not.toHaveBeenCalled();
  });

  it("inspiration rule off → 409", async () => {
    gate(false);

    expect((await post({ kind: "check", skill: "stealth", useInspiration: true })).status).toBe(409);
  });

  it("invalid skill → 400", async () => {
    gate(true);

    expect((await post({ kind: "check", skill: "flying" })).status).toBe(400);
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/characters/resources/__tests__/sheet-roll.test.ts "app/api/campaigns/[id]/characters/[characterId]/hit-dice/__tests__/hit-dice.test.ts" "app/api/campaigns/[id]/characters/[characterId]/roll/__tests__/roll.test.ts"` — FAIL.
- [ ] **Step 3: `advantage` у кидках.** `roll-check.ts`: у `checkMode` додати останній параметр `extraAdvantage = false` і `const adv = labels("checkAdvantage").length > 0 || extraAdvantage;`; у `rollCheck` input — `advantage?: boolean`, виклик `checkMode(actor, skillOf(subject), participants, rules, !!input.advantage)`. `passivePerception` не змінюється. `roll-save.ts`: у `rollSave` input — `advantage?: boolean`;

```ts
  const sm = saveRollMode(target, ability, participants, { vsSpell });

  const mode: SaveRollMode = input.advantage ? (sm.reasons.disadvantage.length > 0 ? "normal" : "advantage") : sm.mode;

  const { autoFail } = sm;
```

(решта функції без змін; `saveRollMode` не змінюється).

- [ ] **Step 4: `sheet-roll.ts`.**

```ts
// lib/utils/characters/resources/sheet-roll.ts
import { ABILITY_LABELS } from "@/lib/constants/abilities";
import { DND_SKILL_META } from "@/lib/constants/skills";
import { rollCheck } from "@/lib/utils/battle/checks/roll-check";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { SheetRollResult, SheetRollSubject } from "@/types/characters";

export function sheetRollLabel(subject: SheetRollSubject): string {
  if (subject.kind === "save") return `Рятівний кидок: ${ABILITY_LABELS[subject.ability]}`;

  return "skill" in subject ? DND_SKILL_META[subject.skill].label : `Перевірка: ${ABILITY_LABELS[subject.ability]}`;
}

export function rollFromSheet(p: BattleParticipant, subject: SheetRollSubject, opts: { rules: Ruleset; rng: () => number; inspiration: boolean }): SheetRollResult {
  const base = { label: sheetRollLabel(subject), inspirationUsed: opts.inspiration };

  const shared = { participants: [p], rules: opts.rules, rng: opts.rng, advantage: opts.inspiration };

  if (subject.kind === "save") {
    const r = rollSave({ target: p, ability: subject.ability, dc: 0, ...shared });

    return { ...base, rolls: r.rolls, roll: r.roll, mod: r.mod, bonus: r.bonus, total: r.total, mode: r.mode, autoFail: r.autoFail };
  }

  const r = rollCheck({ actor: p, subject: "skill" in subject ? { skill: subject.skill } : { ability: subject.ability }, ...shared });

  return { ...base, rolls: r.rolls, roll: r.roll, mod: r.mod, bonus: r.bonus, total: r.total, mode: r.mode, autoFail: false };
}
```

- [ ] **Step 5: Routes.**

```ts
// app/api/campaigns/[id]/characters/[characterId]/hit-dice/hit-die-handler.ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import { CharacterClassesSchema } from "@/lib/schemas/classes";
import type { HitDieInput } from "@/lib/schemas/out-of-combat";
import type { CharacterWithInventory } from "@/lib/server/characters/access";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { buildCharacterParticipant } from "@/lib/server/characters/participant";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadClassesById } from "@/lib/utils/battle/participant/load-classes";
import { hitDicePool, spendHitDie, type SpendHitDieError } from "@/lib/utils/characters/resources/hit-dice";
import { readResources } from "@/lib/utils/characters/resources/schema";
import { rollDie } from "@/lib/utils/common/dice";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";
import type { HitDieResult } from "@/types/characters";

const ERRORS: Record<SpendHitDieError, string> = {
  closed: API_ERRORS.SHORT_REST_CLOSED,
  dead: API_ERRORS.CHARACTER_DEAD,
  no_dice: API_ERRORS.NO_HIT_DICE,
  hp_full: API_ERRORS.HP_FULL,
};

export async function spendHitDieFor(access: CampaignAccessResult, character: CharacterWithInventory, body: HitDieInput): Promise<NextResponse> {
  const { rules, maxLevel } = access.campaign;

  if (!rules.outOfCombat.persistResources) return errorResponse(API_ERRORS.OOC_RESOURCES_DISABLED, 409);

  const entries = rules.classes.enabled ? CharacterClassesSchema.safeParse(character.classes) : null;

  const pool = entries?.success ? hitDicePool(resolveClassEntries(entries.data, await loadClassesById(character.campaignId))) : [];

  const { participant } = await buildCharacterParticipant(character, { maxLevel, rules });

  const roll = rollDie(pool.find((e) => e.classId === body.classId)?.die ?? 1, Math.random);

  const result = spendHitDie(readResources(character.resources), { pool, classId: body.classId, roll, conMod: participant.abilities.modifiers.constitution, maxHp: participant.combatStats.maxHp });

  if (!result.ok) return errorResponse(ERRORS[result.error], 409);

  await prisma.$transaction(async (tx) => {
    await tx.character.update({ where: { id: character.id }, data: { resources: result.resources as Prisma.InputJsonValue } });
    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.HIT_DIE, data: { classId: body.classId, die: result.die, roll, healed: result.healed, hpBefore: result.hpBefore, hpAfter: result.hpAfter } }]);
  });

  const response: HitDieResult = { die: result.die, roll, healed: result.healed, hpBefore: result.hpBefore, hpAfter: result.hpAfter, resources: result.resources };

  return NextResponse.json(response);
}
```

```ts
// app/api/campaigns/[id]/characters/[characterId]/hit-dice/route.ts
import { NextResponse } from "next/server";

import { spendHitDieFor } from "./hit-die-handler";

import { hitDieSchema } from "@/lib/schemas/out-of-combat";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CharacterRouteContext } from "@/types/api";

export async function POST(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    const gate = await requireCharacterAccess(id, characterId);

    if (gate instanceof NextResponse) return gate;

    const body = await parseBody(hitDieSchema, request);

    if (body instanceof NextResponse) return body;

    return await spendHitDieFor(gate.access, gate.character, body);
  } catch (error) {
    return handleApiError(error, { action: "spend hit die" });
  }
}
```

```ts
// app/api/campaigns/[id]/characters/[characterId]/roll/roll-handler.ts
import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import type { SheetRollInput } from "@/lib/schemas/out-of-combat";
import type { CharacterWithInventory } from "@/lib/server/characters/access";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { buildCharacterParticipant } from "@/lib/server/characters/participant";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { rollFromSheet } from "@/lib/utils/characters/resources/sheet-roll";

export async function rollForSheet(access: CampaignAccessResult, character: CharacterWithInventory, body: SheetRollInput): Promise<NextResponse> {
  const { rules, maxLevel } = access.campaign;

  const inspired = !!body.useInspiration;

  if (inspired && !rules.outOfCombat.inspiration) return errorResponse(API_ERRORS.OOC_INSPIRATION_DISABLED, 409);

  const { participant } = await buildCharacterParticipant(character, { maxLevel, rules });

  const { useInspiration: _drop, ...subject } = body;

  const result = rollFromSheet(participant, subject, { rules, rng: Math.random, inspiration: inspired });

  const logged = await prisma.$transaction(async (tx) => {
    if (inspired) {
      const { count } = await tx.character.updateMany({ where: { id: character.id, inspiration: true }, data: { inspiration: false } });

      if (count === 0) return false;
    }

    await writeCharacterLog(tx, [{
      campaignId: character.campaignId,
      characterId: character.id,
      actorUserId: access.userId,
      kind: body.kind === "save" ? CharacterLogKind.SAVE : CharacterLogKind.CHECK,
      data: { label: result.label, rolls: result.rolls, total: result.total, mode: result.mode, ...(result.autoFail && { autoFail: true }), ...(inspired && { inspiration: true }) },
    }]);

    return true;
  });

  if (!logged) return errorResponse(API_ERRORS.NO_INSPIRATION, 409);

  return NextResponse.json(result);
}
```

`roll/route.ts` — як `hit-dice/route.ts`, але `sheetRollSchema` + `rollForSheet`, `action: "roll from sheet"`. Якщо TS не звужує `subject` після деструктуризації union — передати `body as SheetRollSubject` (тип з `@/types/characters`).

- [ ] **Step 6:** нові тести + `pnpm test:related lib/utils/battle/checks/roll-check.ts lib/utils/battle/saves/roll-save.ts` — PASS (наявні тести перевірок і рятівних без змін).
- [ ] **Step 7: Commit**

```bash
git add lib/utils/battle/checks lib/utils/battle/saves lib/utils/characters/resources "app/api/campaigns/[id]/characters/[characterId]/hit-dice" "app/api/campaigns/[id]/characters/[characterId]/roll"
git commit -m "feat(constructor): 4d hit dice and server-side sheet rolls

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 8: Досвід і натхнення (ДМ)

**Files:**
- Create: `app/api/campaigns/[id]/experience/{route,experience-handler}.ts`, `app/api/campaigns/[id]/characters/[characterId]/inspiration/{route,set-inspiration}.ts`
- Test: `app/api/campaigns/[id]/experience/__tests__/experience.test.ts`, `app/api/campaigns/[id]/characters/[characterId]/inspiration/__tests__/inspiration.test.ts`

**Interfaces:**
- Consumes: `experienceSchema`, `ExperienceInput`, `inspirationSchema` (задача 6), `requireDM`, `requireCharacterAccess` (задача 6), `xpShare`, `addExperience` (задача 3), `writeCharacterLog`, `CharacterLogKind` (задача 2), `API_ERRORS.OOC_XP_DISABLED`, `XP_CHARACTERS_INVALID`, `OOC_INSPIRATION_DISABLED`.
- Produces:
  - `POST /api/campaigns/[id]/experience` (ДМ) `AwardXpBody` → `200 { characters: { id: string; experience: number }[] }`; `rules.outOfCombat.xp` вимкнено → 409; чужий/неіснуючий/`PENDING` id → 400. Кожному — `xpShare(amount, n, split)`, досвід не нижче 0 (`addExperience`); журнал `xp` з `{ amount, total, note? }`.
  - `POST …/characters/[characterId]/inspiration` (ДМ) `{ value: boolean }` → `200 { inspiration: boolean }`; правило вимкнене → 409; журнал `inspiration` з `{ value }`.
  - `awardExperience(access: CampaignAccessResult, body: ExperienceInput): Promise<NextResponse>`; `setInspiration(access: CampaignAccessResult, character: { id: string; campaignId: string }, value: boolean): Promise<NextResponse>`.

- [ ] **Step 1: Failing tests**

```ts
// app/api/campaigns/[id]/experience/__tests__/experience.test.ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/db", () => {
  const prisma = { character: { findMany: vi.fn(), update: vi.fn() }, characterLog: { createMany: vi.fn() }, $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const asDM = (xp = true) => vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, xp } } } } as never);

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp" }) }) as Promise<NextResponse>;
};

describe("POST /experience", () => {
  beforeEach(() => vi.clearAllMocks());

  it("409 when the XP table is off", async () => {
    asDM(false);

    expect((await post({ characterIds: ["a"], amount: 100 })).status).toBe(409);
  });

  it("split divides evenly and logs each hero", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", experience: 0 }, { id: "b", experience: 100 }, { id: "c", experience: 7 }] as never);

    const res = await post({ characterIds: ["a", "b", "c"], amount: 1000, split: true, note: "Дракон" });

    expect(await res.json()).toEqual({ characters: [{ id: "a", experience: 333 }, { id: "b", experience: 433 }, { id: "c", experience: 340 }] });
    expect(prisma.character.update).toHaveBeenCalledWith({ where: { id: "b" }, data: { experience: 433 } });
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([expect.objectContaining({ characterId: "a", kind: "xp", data: { amount: 333, total: 333, note: "Дракон" } })]) });
  });

  it("negative amount never goes below 0", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", experience: 50 }] as never);

    expect(await (await post({ characterIds: ["a"], amount: -100 })).json()).toEqual({ characters: [{ id: "a", experience: 0 }] });
  });

  it("400 for a foreign id and for amount 0", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", experience: 0 }] as never);

    expect((await post({ characterIds: ["a", "x"], amount: 10 })).status).toBe(400);
    expect((await post({ characterIds: ["a"], amount: 0 })).status).toBe(400);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });
});
```

```ts
// app/api/campaigns/[id]/characters/[characterId]/inspiration/__tests__/inspiration.test.ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));
vi.mock("@/lib/db", () => {
  const prisma = { character: { update: vi.fn() }, characterLog: { createMany: vi.fn() }, $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const gate = (inspiration: boolean) =>
  vi.mocked(access.requireCharacterAccess).mockResolvedValue({
    access: { userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, inspiration } } } },
    character: { id: "ch", campaignId: "camp" },
  } as never);

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("POST inspiration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DM only", async () => {
    gate(true);
    await post({ value: true });

    expect(access.requireCharacterAccess).toHaveBeenCalledWith("camp", "ch", { dmOnly: true });
  });

  it("sets the flag and logs", async () => {
    gate(true);

    const res = await post({ value: true });

    expect(await res.json()).toEqual({ inspiration: true });
    expect(prisma.character.update).toHaveBeenCalledWith({ where: { id: "ch" }, data: { inspiration: true } });
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "inspiration", data: { value: true } })] });
  });

  it("409 when inspiration is off", async () => {
    gate(false);

    expect((await post({ value: true })).status).toBe(409);
  });
});
```

- [ ] **Step 2:** `pnpm test:run "app/api/campaigns/[id]/experience/__tests__/experience.test.ts" "app/api/campaigns/[id]/characters/[characterId]/inspiration/__tests__/inspiration.test.ts"` — FAIL.
- [ ] **Step 3: Implement.**

```ts
// app/api/campaigns/[id]/experience/experience-handler.ts
import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { addExperience, xpShare } from "@/lib/constants/experience";
import { prisma } from "@/lib/db";
import type { ExperienceInput } from "@/lib/schemas/out-of-combat";
import { writeCharacterLog } from "@/lib/server/characters/log";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";

export async function awardExperience(access: CampaignAccessResult, body: ExperienceInput): Promise<NextResponse> {
  const { campaign } = access;

  if (!campaign.rules.outOfCombat.xp) return errorResponse(API_ERRORS.OOC_XP_DISABLED, 409);

  const ids = [...new Set(body.characterIds)];

  const characters = await prisma.character.findMany({ where: { id: { in: ids }, campaignId: campaign.id, status: CharacterStatus.ACTIVE }, select: { id: true, experience: true } });

  if (characters.length !== ids.length) return errorResponse(API_ERRORS.XP_CHARACTERS_INVALID, 400);

  const share = xpShare(body.amount, ids.length, body.split);

  const updated = characters.map((c) => ({ id: c.id, experience: addExperience(c.experience, share) }));

  await prisma.$transaction(async (tx) => {
    for (const u of updated) await tx.character.update({ where: { id: u.id }, data: { experience: u.experience } });

    await writeCharacterLog(tx, updated.map((u) => ({ campaignId: campaign.id, characterId: u.id, actorUserId: access.userId, kind: CharacterLogKind.XP, data: { amount: share, total: u.experience, ...(body.note && { note: body.note }) } })));
  });

  return NextResponse.json({ characters: updated });
}
```

`experience/route.ts` — як `rest/route.ts` (задача 6): `requireDM(id)` → `parseBody(experienceSchema, request)` → `awardExperience(access, body)`, `action: "award experience"`.

```ts
// app/api/campaigns/[id]/characters/[characterId]/inspiration/set-inspiration.ts
import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import { writeCharacterLog } from "@/lib/server/characters/log";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";

export async function setInspiration(access: CampaignAccessResult, character: { id: string; campaignId: string }, value: boolean): Promise<NextResponse> {
  if (!access.campaign.rules.outOfCombat.inspiration) return errorResponse(API_ERRORS.OOC_INSPIRATION_DISABLED, 409);

  await prisma.$transaction(async (tx) => {
    await tx.character.update({ where: { id: character.id }, data: { inspiration: value } });
    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.INSPIRATION, data: { value } }]);
  });

  return NextResponse.json({ inspiration: value });
}
```

```ts
// app/api/campaigns/[id]/characters/[characterId]/inspiration/route.ts
import { NextResponse } from "next/server";

import { setInspiration } from "./set-inspiration";

import { inspirationSchema } from "@/lib/schemas/out-of-combat";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CharacterRouteContext } from "@/types/api";

export async function POST(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    const gate = await requireCharacterAccess(id, characterId, { dmOnly: true });

    if (gate instanceof NextResponse) return gate;

    const body = await parseBody(inspirationSchema, request);

    if (body instanceof NextResponse) return body;

    return await setInspiration(gate.access, gate.character, body.value);
  } catch (error) {
    return handleApiError(error, { action: "set inspiration" });
  }
}
```

- [ ] **Step 4:** ті самі тести — PASS.
- [ ] **Step 5: Commit**

```bash
git add "app/api/campaigns/[id]/experience" "app/api/campaigns/[id]/characters/[characterId]/inspiration"
git commit -m "feat(constructor): 4d experience award and inspiration routes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Правка ресурсів (ДМ) і журнал персонажа

**Files:**
- Create: `lib/utils/characters/resources/edit.ts`, `app/api/campaigns/[id]/characters/[characterId]/resources/{route,resources-handler}.ts`, `app/api/campaigns/[id]/characters/[characterId]/log/{route,read-character-log}.ts`
- Test: `lib/utils/characters/resources/__tests__/edit.test.ts`, `app/api/campaigns/[id]/characters/[characterId]/resources/__tests__/resources.test.ts`, `app/api/campaigns/[id]/characters/[characterId]/log/__tests__/log.test.ts`

**Interfaces:**
- Consumes: `resourcesEditSchema`, `ResourcesEditInput` (задача 6), `requireCharacterAccess`, `buildCharacterParticipant` (задача 6), `compactResources`, `withHp`, `readResources`, `writeCharacterLog`, `CharacterLogKind`, `CHARACTER_LOG_PAGE_SIZE` (задача 2), `PUBLIC_USER_SELECT` (`lib/server/users/db-user.ts`), `CharacterLogEntry` (задача 6).
- Produces:

```ts
// edit.ts
export function editResources(r: CharacterResources, patch: ResourcesEditBody, maxHp?: number): CharacterResources;
// PATCH …/characters/[characterId]/resources (ДМ) ResourcesEditBody → 200 { resources: CharacterResources }; persistResources вимкнено → 409; журнал resources_edit { before, after }
// GET …/characters/[characterId]/log?cursor= (власник або ДМ) → 200 { entries: CharacterLogEntry[]; nextCursor: string | null }, сторінки по 30
```

`editResources`: `reset` → `{}`; інакше по черзі `tempHp`, `exhaustion`, `hp` (з `maxHp` — через `withHp`, без — як є), потім `dead: true` → `{ dead: true, hp: 0 }` без тимч. HP; `dead: false` → прибрати `dead`, HP 0 → 1. Результат — `compactResources`. `maxHp` сервер рахує (`buildCharacterParticipant`) лише коли в тілі є `hp`.

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/characters/resources/__tests__/edit.test.ts
import { describe, expect, it } from "vitest";

import { editResources } from "@/lib/utils/characters/resources/edit";

describe("editResources", () => {
  it("reset clears everything", () => {
    expect(editResources({ hp: 3, dead: true, exhaustion: 2 }, { reset: true })).toEqual({});
  });

  it("hp at or above max means full", () => {
    expect(editResources({ hp: 3 }, { hp: 30 }, 30)).toEqual({});
    expect(editResources({}, { hp: 12 }, 30)).toEqual({ hp: 12 });
  });

  it("kill and revive", () => {
    expect(editResources({ hp: 9, tempHp: 4 }, { dead: true })).toEqual({ dead: true, hp: 0 });
    expect(editResources({ dead: true, hp: 0 }, { dead: false })).toEqual({ hp: 1 });
  });

  it("exhaustion 0 removes the field, other fields kept", () => {
    expect(editResources({ exhaustion: 3, slotsSpent: { "1": 1 } }, { exhaustion: 0 })).toEqual({ slotsSpent: { "1": 1 } });
  });
});
```

```ts
// app/api/campaigns/[id]/characters/[characterId]/resources/__tests__/resources.test.ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";
import * as participant from "@/lib/server/characters/participant";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));
vi.mock("@/lib/server/characters/participant", () => ({ buildCharacterParticipant: vi.fn(async () => ({ participant: { combatStats: { maxHp: 30 } } })) }));
vi.mock("@/lib/db", () => {
  const prisma = { character: { update: vi.fn() }, characterLog: { createMany: vi.fn() }, $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const gate = (persistResources = true) =>
  vi.mocked(access.requireCharacterAccess).mockResolvedValue({
    access: { userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources } } } },
    character: { id: "ch", campaignId: "camp", resources: { hp: 4, exhaustion: 2 } },
  } as never);

const patch = async (body: object) => {
  const { PATCH } = await import("../route");

  return PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("PATCH resources", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DM only; 409 when persistResources is off", async () => {
    gate(false);

    expect((await patch({ exhaustion: 0 })).status).toBe(409);
    expect(access.requireCharacterAccess).toHaveBeenCalledWith("camp", "ch", { dmOnly: true });
  });

  it("heals to full via hp = max and logs before/after", async () => {
    gate();

    const res = await patch({ hp: 30 });

    expect(await res.json()).toEqual({ resources: { exhaustion: 2 } });
    expect(participant.buildCharacterParticipant).toHaveBeenCalledTimes(1);
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "resources_edit", data: { before: { hp: 4, exhaustion: 2 }, after: { exhaustion: 2 } } })] });
  });

  it("without hp the participant is not built", async () => {
    gate();
    await patch({ exhaustion: 0 });

    expect(participant.buildCharacterParticipant).not.toHaveBeenCalled();
  });

  it("empty body → 400", async () => {
    gate();

    expect((await patch({})).status).toBe(400);
  });
});
```

```ts
// app/api/campaigns/[id]/characters/[characterId]/log/__tests__/log.test.ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { characterLog: { findMany: vi.fn() }, user: { findMany: vi.fn(async () => [{ id: "dm", displayName: "Майстер" }]) } } }));

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `l${i}`, kind: "xp", data: { amount: i }, createdAt: new Date(0), actorUserId: i === 0 ? null : "dm" }));

const get = async (query = "") => {
  const { GET } = await import("../route");

  return GET(new Request(`http://x/log${query}`), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("GET character log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(access.requireCharacterAccess).mockResolvedValue({ access: { userId: "owner", isDM: false }, character: { id: "ch", campaignId: "camp" } } as never);
  });

  it("pages of 30 with a cursor", async () => {
    vi.mocked(prisma.characterLog.findMany).mockResolvedValue(rows(31) as never);

    const json = await (await get()).json();

    expect(json.entries).toHaveLength(30);
    expect(json.nextCursor).toBe("l29");
    expect(json.entries[0].actor).toBeNull();
    expect(json.entries[1].actor).toEqual({ id: "dm", displayName: "Майстер" });
    expect(prisma.characterLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { characterId: "ch" }, take: 31 }));
  });

  it("passes the cursor and ends the list", async () => {
    vi.mocked(prisma.characterLog.findMany).mockResolvedValue(rows(2) as never);

    const json = await (await get("?cursor=l29")).json();

    expect(json.nextCursor).toBeNull();
    expect(prisma.characterLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ cursor: { id: "l29" }, skip: 1 }));
  });

  it("another player's 403 passes through", async () => {
    vi.mocked(access.requireCharacterAccess).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await get()).status).toBe(403);
  });
});
```

- [ ] **Step 2:** запустити три нові файли — FAIL.
- [ ] **Step 3: Implement.**

```ts
// lib/utils/characters/resources/edit.ts
import { compactResources, withHp } from "./hp";

import type { CharacterResources, ResourcesEditBody } from "@/types/characters";

export function editResources(r: CharacterResources, patch: ResourcesEditBody, maxHp?: number): CharacterResources {
  if (patch.reset) return {};

  let next: CharacterResources = { ...r };

  if (patch.tempHp !== undefined) next.tempHp = patch.tempHp;

  if (patch.exhaustion !== undefined) next.exhaustion = patch.exhaustion;

  if (patch.hp !== undefined) next = maxHp === undefined ? { ...next, hp: patch.hp } : withHp(next, patch.hp, maxHp);

  if (patch.dead === true) next = { ...next, dead: true, hp: 0, tempHp: undefined };

  if (patch.dead === false) next = { ...next, dead: undefined, ...(next.hp === 0 && { hp: 1 }) };

  return compactResources(next);
}
```

```ts
// app/api/campaigns/[id]/characters/[characterId]/resources/resources-handler.ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import type { ResourcesEditInput } from "@/lib/schemas/out-of-combat";
import type { CharacterWithInventory } from "@/lib/server/characters/access";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { buildCharacterParticipant } from "@/lib/server/characters/participant";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { editResources } from "@/lib/utils/characters/resources/edit";
import { readResources } from "@/lib/utils/characters/resources/schema";

export async function editResourcesFor(access: CampaignAccessResult, character: CharacterWithInventory, body: ResourcesEditInput): Promise<NextResponse> {
  const { rules, maxLevel } = access.campaign;

  if (!rules.outOfCombat.persistResources) return errorResponse(API_ERRORS.OOC_RESOURCES_DISABLED, 409);

  const before = readResources(character.resources);

  const maxHp = body.hp === undefined ? undefined : (await buildCharacterParticipant(character, { maxLevel, rules })).participant.combatStats.maxHp;

  const after = editResources(before, body, maxHp);

  await prisma.$transaction(async (tx) => {
    await tx.character.update({ where: { id: character.id }, data: { resources: after as Prisma.InputJsonValue } });
    await writeCharacterLog(tx, [{ campaignId: character.campaignId, characterId: character.id, actorUserId: access.userId, kind: CharacterLogKind.RESOURCES_EDIT, data: { before, after } }]);
  });

  return NextResponse.json({ resources: after });
}
```

`resources/route.ts` — `export async function PATCH`, `requireCharacterAccess(id, characterId, { dmOnly: true })` → `parseBody(resourcesEditSchema, request)` → `editResourcesFor(gate.access, gate.character, body)`, `action: "edit character resources"` (будова як `inspiration/route.ts`).

```ts
// app/api/campaigns/[id]/characters/[characterId]/log/read-character-log.ts
import { NextResponse } from "next/server";

import { CHARACTER_LOG_PAGE_SIZE } from "@/lib/constants/character-log";
import { prisma } from "@/lib/db";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import type { CharacterLogEntry } from "@/types/characters";

export async function readCharacterLog(campaignId: string, characterId: string, cursor: string | null): Promise<NextResponse> {
  const gate = await requireCharacterAccess(campaignId, characterId);

  if (gate instanceof NextResponse) return gate;

  const rows = await prisma.characterLog.findMany({
    where: { characterId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: CHARACTER_LOG_PAGE_SIZE + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const page = rows.slice(0, CHARACTER_LOG_PAGE_SIZE);

  const actorIds = [...new Set(page.flatMap((r) => (r.actorUserId ? [r.actorUserId] : [])))];

  const users = actorIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: PUBLIC_USER_SELECT }) : [];

  const nameOf = new Map(users.map((u) => [u.id, u.displayName ?? null]));

  const entries = page.map((r): CharacterLogEntry => ({
    id: r.id,
    kind: r.kind as CharacterLogEntry["kind"],
    data: r.data as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
    actor: r.actorUserId ? { id: r.actorUserId, displayName: nameOf.get(r.actorUserId) ?? null } : null,
  }));

  return NextResponse.json({ entries, nextCursor: rows.length > CHARACTER_LOG_PAGE_SIZE ? page[page.length - 1].id : null });
}
```

```ts
// app/api/campaigns/[id]/characters/[characterId]/log/route.ts
import { readCharacterLog } from "./read-character-log";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CharacterRouteContext } from "@/types/api";

export async function GET(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    return await readCharacterLog(id, characterId, new URL(request.url).searchParams.get("cursor"));
  } catch (error) {
    return handleApiError(error, { action: "read character log" });
  }
}
```

- [ ] **Step 4:** ті самі тести — PASS.
- [ ] **Step 5: Commit**

```bash
git add lib/utils/characters/resources "app/api/campaigns/[id]/characters/[characterId]/resources" "app/api/campaigns/[id]/characters/[characterId]/log"
git commit -m "feat(constructor): 4d DM resources edit and character log

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Натхнення в атаці

**Files:**
- Create: `lib/utils/battle/attack/inspiration.ts`
- Modify: `lib/utils/battle/attack/bonus.ts` (`SourceOpts.inspiration`, причина переваги; `predictAttack(..., opts)`), `lib/utils/battle/attack/roll.ts` (тип `opts.inspiration`), `lib/utils/battle/types/attack-process.ts` (`inspiration?: boolean` поруч з `rollMode`), `lib/utils/battle/attack/process/run.ts` (передати `inspiration: params.inspiration` в обидва виклики `calculateAttackRoll`), `lib/utils/battle/attack-phase/request.ts` (`AttackRequest.useInspiration?`), `lib/utils/battle/attack-phase/run-attack-phase.ts` (`inspiration: !!data.useInspiration && i === 0` у `processAttack`), `app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation.ts` (схема + перевірка + зняття), `types/api.ts` (`AttackData.useInspiration?`), `lib/utils/battle/flows/attack-flow.ts`, `lib/hooks/battle/useAttackWizard.ts`, `components/battle/wizards/attack/RollStep.tsx`
- Test: `lib/utils/battle/attack/__tests__/inspiration.test.ts`, `app/api/__tests__/battles/attack-inspiration.test.ts`, `lib/utils/battle/flows/__tests__/attack-flow-inspiration.test.ts`

**Interfaces:**
- Consumes: `battleData.inspiration` (задача 4), `API_ERRORS.NO_INSPIRATION` (задача 6), `Ruleset["outOfCombat"]` (задача 1).
- Produces:

```ts
// lib/utils/battle/attack/inspiration.ts (без zod — його імпортує клієнт)
export const INSPIRATION_LABEL = "Натхнення";
export function canUseInspiration(p: BattleParticipant | undefined | null, rules: Ruleset | undefined | null): boolean;  // rules.outOfCombat.inspiration && p.battleData.inspiration
export function spendInspiration(ps: BattleParticipant[], id: string): BattleParticipant[];
// bonus.ts
rollModeReasons(attacker, attack, participants, opts: SourceOpts & { inspiration?: boolean })  // inspiration → "Натхнення" серед advantage
predictAttack(attacker, target, attack, participants, round?, map?, opts?: { inspiration?: boolean })
// attackBodySchema + AttackRequest + AttackData: useInspiration?: boolean
// attack-flow.ts
AttackFlowState.inspiration?: boolean
AttackFlowAction | { type: "SET_INSPIRATION"; value: boolean; forced?: ForcedMode }
// useAttackWizard: view.inspirationAvailable: boolean; actions.setInspiration(value: boolean): void
```

Правила: перевірка в мутації до `runAttackPhase` — `!canUseInspiration(attacker, ctx.meta.rules)` → `BattleRuleError("action_rejected", API_ERRORS.NO_INSPIRATION)` (422, стан не змінюється); інакше натхнення знімається в `ctx.participants` до фази атаки. Перевага — лише першому удару (`i === 0`). `SET_INSPIRATION` діє лише на кроці `roll`, поки `index === 0` і перший удар ще не кинуто; `CONFIRM_TARGETS` скидає `inspiration` (режими ударів перераховуються без нього).

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/battle/attack/__tests__/inspiration.test.ts
import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { rollModeReasons } from "@/lib/utils/battle/attack/bonus";
import { canUseInspiration, INSPIRATION_LABEL, spendInspiration } from "@/lib/utils/battle/attack/inspiration";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleAttack } from "@/types/battle";

const sword: BattleAttack = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8", damageType: "slashing" };

const on = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, inspiration: true } };

describe("inspiration in attacks", () => {
  it("adds an advantage reason only when asked", () => {
    const p = createMockParticipant();

    expect(rollModeReasons(p, sword, [p], { inspiration: true }).advantage).toEqual([INSPIRATION_LABEL]);
    expect(rollModeReasons(p, sword, [p]).advantage).toEqual([]);
  });

  it("canUseInspiration needs the rule and the flag", () => {
    const p = createMockParticipant();

    const inspired = { ...p, battleData: { ...p.battleData, inspiration: true } };

    expect(canUseInspiration(inspired, on)).toBe(true);
    expect(canUseInspiration(inspired, DEFAULT_RULES)).toBe(false);
    expect(canUseInspiration(p, on)).toBe(false);
  });

  it("spendInspiration clears only the attacker", () => {
    const a = { ...createMockParticipant(), battleData: { ...createMockParticipant().battleData, inspiration: true } };

    const [after] = spendInspiration([a], a.basicInfo.id);

    expect(after.battleData.inspiration).toBe(false);
  });
});
```

```ts
// app/api/__tests__/battles/attack-inspiration.test.ts
import { describe, expect, it } from "vitest";

import { attackBodySchema, attackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const base = createMockParticipant();

const sword: BattleAttack = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" };

const hero = (inspiration: boolean, maxTargets = 1): BattleParticipant => ({
  ...base,
  basicInfo: { ...base.basicInfo, id: "hero", controlledBy: "user-1" },
  combatStats: { ...base.combatStats, maxTargets },
  battleData: { ...base.battleData, attacks: [sword], inspiration },
});

const goblin = (id: string) =>
  createMockParticipant({ basicInfo: { ...base.basicInfo, id, side: ParticipantSide.ENEMY, controlledBy: "dm" }, combatStats: { ...base.combatStats, maxHp: 100, currentHp: 100 } });

const RULES = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, inspiration: true } };

const ctx = (h: BattleParticipant, rules = RULES, foes = [goblin("gob")]) =>
  ({
    scene: { id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 2, eventSeq: 3, pendingMoraleCheck: null, startedAt: null, completedAt: null },
    participants: [h, ...foes],
    pending: [],
    meta: { map: null, rules },
    userId: "user-1",
    isDM: false,
  }) as unknown as BattleMutationContext;

const body = (over: Record<string, unknown> = {}) => attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "s", d20Roll: 2, advantageRoll: 19, damageRolls: [4], ...over });

const failure = (run: Promise<unknown>) => run.then(() => undefined, (e: { code?: string; message?: string }) => ({ code: e.code, message: e.message }));

const advantageNotes = (events: unknown) => (JSON.stringify(events).match(/перевага/g) ?? []).length;

describe("attack with inspiration", () => {
  it("advantage from inspiration; the flag is spent", async () => {
    const out = await attackMutation(ctx(hero(true)), body({ useInspiration: true }));

    const self = out.participants.find((p) => p.basicInfo.id === "hero") as BattleParticipant;

    expect(advantageNotes(out.events)).toBeGreaterThan(0);
    expect(self.battleData.inspiration).toBe(false);
  });

  it("without useInspiration the flag stays and no advantage", async () => {
    const out = await attackMutation(ctx(hero(true)), body());

    expect(advantageNotes(out.events)).toBe(0);
    expect((out.participants.find((p) => p.basicInfo.id === "hero") as BattleParticipant).battleData.inspiration).toBe(true);
  });

  it("no inspiration or rule off → 422, nothing happens", async () => {
    expect(await failure(attackMutation(ctx(hero(false)), body({ useInspiration: true })))).toEqual({ code: "action_rejected", message: API_ERRORS.NO_INSPIRATION });
    expect(await failure(attackMutation(ctx(hero(true), DEFAULT_RULES), body({ useInspiration: true })))).toEqual({ code: "action_rejected", message: API_ERRORS.NO_INSPIRATION });
  });

  it("multi-target: only the first strike gets advantage", async () => {
    const out = await attackMutation(
      ctx(hero(true, 2), RULES, [goblin("gob"), goblin("gob2")]),
      attackBodySchema.parse({ attackerId: "hero", targetIds: ["gob", "gob2"], attackId: "s", attackRolls: [2, 2], secondRolls: [19, 19], damageRolls: [4], useInspiration: true }),
    );

    expect(advantageNotes(out.events)).toBe(1);
  });
});
```

(Якщо мутація для двох цілей вимагає іншої форми `damageRolls` — підлаштувати лише тіло запиту за `attack-mutation.test.ts`, не очікування.)

```ts
// lib/utils/battle/flows/__tests__/attack-flow-inspiration.test.ts
import { describe, expect, it } from "vitest";

import { attackFlow, attackPayload, initialAttackFlow } from "@/lib/utils/battle/flows/attack-flow";

const atRoll = attackFlow(attackFlow(initialAttackFlow, { type: "OPEN", weaponCount: 1, attackId: "s", maxTargets: 1, diceSlots: [8], targetIds: ["gob"] }), { type: "CONFIRM_TARGETS" });

describe("attack flow: inspiration", () => {
  it("SET_INSPIRATION sets the flag and the first strike's forced mode", () => {
    const s = attackFlow(atRoll, { type: "SET_INSPIRATION", value: true, forced: { mode: "advantage", reason: "Перевага: Натхнення" } });

    expect(s.inspiration).toBe(true);
    expect(s.strikes[0].forced?.mode).toBe("advantage");
    expect(attackPayload(s, "hero")).toMatchObject({ useInspiration: true });
  });

  it("switching off drops the forced mode", () => {
    const on = attackFlow(atRoll, { type: "SET_INSPIRATION", value: true, forced: { mode: "advantage", reason: "x" } });

    const off = attackFlow(on, { type: "SET_INSPIRATION", value: false });

    expect(off.inspiration).toBeUndefined();
    expect(off.strikes[0].forced).toBeUndefined();
    expect(attackPayload(off, "hero")).not.toHaveProperty("useInspiration");
  });

  it("ignored after the first die is rolled", () => {
    const rolled = attackFlow(attackFlow(attackFlow(initialAttackFlow, { type: "OPEN", weaponCount: 1, attackId: "s", maxTargets: 2, diceSlots: [8], targetIds: ["a", "b"] }), { type: "CONFIRM_TARGETS" }), { type: "ROLL", d20: 10, outcome: "hit" });

    expect(attackFlow(rolled, { type: "SET_INSPIRATION", value: true })).toBe(rolled);
  });
});
```

- [ ] **Step 2:** запустити три нові файли — FAIL.
- [ ] **Step 3: Server.**

```ts
// lib/utils/battle/attack/inspiration.ts
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export const INSPIRATION_LABEL = "Натхнення";

export function canUseInspiration(p: BattleParticipant | undefined | null, rules: Ruleset | undefined | null): boolean {
  return !!rules?.outOfCombat?.inspiration && !!p?.battleData.inspiration;
}

export function spendInspiration(ps: BattleParticipant[], id: string): BattleParticipant[] {
  return ps.map((p) => (p.basicInfo.id === id ? { ...p, battleData: { ...p.battleData, inspiration: false } } : p));
}
```

`bonus.ts`: `type SourceOpts = { …; inspiration?: boolean }`; у `advantage` додати `...(opts.inspiration ? [INSPIRATION_LABEL] : [])`; `predictAttack(…, map?: BattleMapConfig | null, opts: { inspiration?: boolean } = {})` і `rollModeReasons(self, attack, ps, { extra, targetId: target.basicInfo.id, targetExtra, map, inspiration: opts.inspiration })`. `roll.ts`: у тип `opts` `calculateAttackRoll` додати `inspiration?: boolean` (він уже передає `opts` у `rollModeReasons`).

`attack-mutation.ts`: у `attackBodySchema` — `useInspiration: z.boolean().optional()`; у `createAttackMutation` після `assertCanAct`:

```ts
    let participants = ctx.participants;

    if (data.useInspiration) {
      if (!canUseInspiration(findParticipant(participants, data.attackerId), ctx.meta.rules)) throw new BattleRuleError("action_rejected", API_ERRORS.NO_INSPIRATION);

      participants = spendInspiration(participants, data.attackerId);
    }
```

і далі `initiativeOrder: participants` у `runAttackPhase` (`loadHitSpells(ctx, …)` без змін — натхнення на заклинання при влучанні не впливає). Імпорти: `API_ERRORS` з `@/lib/constants/api-errors`, `canUseInspiration, spendInspiration` з `@/lib/utils/battle/attack/inspiration`.

- [ ] **Step 4: Client.** `attack-flow.ts`:

```ts
// AttackFlowState
  inspiration?: boolean;
// AttackFlowAction
  | { type: "SET_INSPIRATION"; value: boolean; forced?: ForcedMode }
// reducer
    case "SET_INSPIRATION": {
      if (s.step !== "roll" || s.index !== 0 || s.strikes[0]?.d20 !== undefined) return s;

      const strikes = s.strikes.map((st, i) => {
        if (i !== 0) return st;

        const { forced: _old, ...rest } = st;

        return a.forced ? { ...rest, forced: a.forced } : rest;
      });

      return { ...s, strikes, inspiration: a.value || undefined };
    }
```

У `CONFIRM_TARGETS` додати `inspiration: undefined` до нового стану; в `attackPayload` у `base` — `...(s.inspiration && { useInspiration: true })`. `types/api.ts` → `AttackData.useInspiration?: boolean`.

`useAttackWizard.ts`: імпорт `canUseInspiration`; у `view` — `inspirationAvailable: canUseInspiration(attacker, scene.battle.rules)`; в `actions`:

```ts
    setInspiration: (value: boolean) => {
      const t = byId(state.strikes[0]?.targetId ?? "");

      const forced = attacker && attack && t ? forcedModeOf(predictAttack(attacker, t, attack, order, scene.battle.currentRound, map, { inspiration: value })) : undefined;

      dispatch({ type: "SET_INSPIRATION", value, forced });
    },
```

`RollStep.tsx` — після блоку режимів:

```tsx
      {view.inspirationAvailable && state.index === 0 && (
        <label className="mt-2 flex items-center gap-2 text-sm text-[#cdb87e]">
          <Switch checked={!!state.inspiration} onCheckedChange={actions.setInspiration} aria-label="Натхнення" />
          ✦ Натхнення — перевага на цей кидок
        </label>
      )}
```

(імпорт `Switch` з `@/components/ui/switch`; `AttackWizardModel` у `wizards/attack/shared.ts` виводиться з хука — правки не потрібні, якщо тип береться як `ReturnType<typeof useAttackWizard>`; інакше додати поля).

- [ ] **Step 5:** нові тести + `pnpm test:related lib/utils/battle/attack/bonus.ts lib/utils/battle/attack/roll.ts lib/utils/battle/attack-phase/run-attack-phase.ts lib/utils/battle/flows/attack-flow.ts lib/hooks/battle/useAttackWizard.ts "app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation.ts"` — PASS (наявні тести атак без змін).
- [ ] **Step 6: Commit**

```bash
git add lib/utils/battle lib/hooks/battle/useAttackWizard.ts components/battle/wizards/attack/RollStep.tsx "app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation.ts" app/api/__tests__/battles/attack-inspiration.test.ts types/api.ts
git commit -m "feat(constructor): 4d inspiration grants advantage on an attack

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 11: Дані листа, список персонажів, клієнт і хуки

**Files:**
- Create: `lib/utils/characters/sheet/rest-block.ts`, `lib/utils/characters/resources/describe-log.ts`, `lib/hooks/characters/useOutOfCombat.ts`
- Modify: `types/characters.ts` (`SheetRest`, `CharacterSheet.rest`, `CharacterSheet.slots[].current`, `CharacterListItem`), `lib/utils/characters/sheet/build-sheet.ts`, `app/api/campaigns/[id]/characters/list-characters.ts` (`LIST_SELECT`), `lib/api/characters.ts`, `lib/hooks/characters/keys.ts`, `lib/hooks/characters/index.ts`, `components/character-profile/__tests__/sheet-fixture.ts` (адитивно: `rest: null`, `current` у слотах)
- Test: `lib/utils/characters/sheet/__tests__/rest-block.test.ts`, `lib/utils/characters/resources/__tests__/describe-log.test.ts`

**Interfaces:**
- Consumes: `readResources` (задача 2), `hitDicePool` (задача 3), `xpForLevel`, `levelUpAvailable` (задача 3), тіла/відповіді з `types/characters.ts` (задача 6), `campaignGet/campaignPost/campaignPatch` (`lib/api/client.ts`), `useCrudMutation` (`lib/hooks/common`), `ENTITY_STALE_MS` (`lib/providers/query-provider`).
- Produces:

```ts
// types/characters.ts
export interface SheetRest {
  persist: boolean;
  hp: { current: number; max: number; temp: number } | null;            // null, коли persist вимкнено
  dead: boolean;
  exhaustion: number;
  shortRestOpen: boolean;
  hitDice: { classId: string; name: string; die: number; total: number; spent: number }[];
  charges: { key: string; name: string; uses: number; used: number; rest: "short" | "long" }[];
  inspiration: boolean | null;                                            // null — натхнення вимкнене
  xp: { value: number; next: number | null; levelUp: boolean } | null;    // null — віхи
}
// CharacterSheet: rest: SheetRest | null; slots: { level: number; count: number; current: number }[]
// CharacterListItem: & { experience?: number; inspiration?: boolean; resources?: CharacterResources }

// rest-block.ts
export function buildRestBlock(input: { participant: BattleParticipant; character: { level: number; resources?: unknown; inspiration?: boolean; experience?: number }; classes?: ResolvedClassEntry[]; rules?: Ruleset; maxLevel: number }): SheetRest | null;  // null — усі перемикачі вимкнені

// describe-log.ts (клієнт)
export function describeCharacterLog(e: Pick<CharacterLogEntry, "kind" | "data">): string;

// keys.ts
log: (campaignId: string, characterId: string) => ["character-log", campaignId, characterId] as const,
logs: (campaignId: string) => ["character-log", campaignId] as const,

// lib/api/characters.ts
export const postRest: (campaignId: string, body: RestBody) => Promise<{ characters: { id: string; resources: CharacterResources }[] }>;
export const postHitDie: (campaignId: string, characterId: string, classId: string) => Promise<HitDieResult>;
export const postSheetRoll: (campaignId: string, characterId: string, body: SheetRollBody) => Promise<SheetRollResult>;
export const postExperience: (campaignId: string, body: AwardXpBody) => Promise<{ characters: { id: string; experience: number }[] }>;
export const postInspiration: (campaignId: string, characterId: string, value: boolean) => Promise<{ inspiration: boolean }>;
export const patchResources: (campaignId: string, characterId: string, body: ResourcesEditBody) => Promise<{ resources: CharacterResources }>;
export const getCharacterLog: (campaignId: string, characterId: string, cursor?: string) => Promise<{ entries: CharacterLogEntry[]; nextCursor: string | null }>;

// lib/hooks/characters/useOutOfCombat.ts (експорт з index.ts)
export function useRest(campaignId: string);                                  // mutateOk(body: RestBody)
export function useAwardXp(campaignId: string);                               // mutateOk(body: AwardXpBody)
export function useSpendHitDie(campaignId: string, characterId: string);      // mutateAsync(classId) → HitDieResult
export function useSheetRoll(campaignId: string, characterId: string);        // mutateAsync(body: SheetRollBody) → SheetRollResult
export function useInspiration(campaignId: string, characterId: string);      // mutateOk(value: boolean)
export function useEditResources(campaignId: string, characterId: string);    // mutateOk(body: ResourcesEditBody)
export function useCharacterLog(campaignId: string, characterId: string, enabled?: boolean);  // useInfiniteQuery
```

Інвалідація: групові (`useRest`, `useAwardXp`) — `characterKeys.sheet(c)` (усі листи кампанії), `characterKeys.lists(c)`, `characterKeys.logs(c)`; на героя — `characterKeys.sheet(c, id)`, `characterKeys.lists(c)`, `characterKeys.log(c, id)`; `useSheetRoll` — лише `log(c, id)`, а з `useInspiration` у тілі — ще `sheet(c, id)`.

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/characters/sheet/__tests__/rest-block.test.ts
import { describe, expect, it } from "vitest";

import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { buildRestBlock } from "@/lib/utils/characters/sheet/rest-block";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { GameClassData } from "@/types/classes";

const surge = resolved({ trigger: { event: "action" }, limits: { perRest: { rest: "short", uses: 1 } }, effects: [{ kind: "note", text: "x" }] } as never, { type: "class", id: "fighter" });

const p = (() => {
  const base = createMockParticipant();

  return { ...base, combatStats: { ...base.combatStats, maxHp: 30, currentHp: 12, tempHp: 2 }, battleData: { ...base.battleData, resolvedAbilities: [surge], abilityUsage: { [surge.key]: { battle: 1, round: 0, turn: 0 } } } };
})();

const fighter = { id: "fighter", name: "Воїн", hitDie: 10 } as GameClassData;

const rules = (ooc: Partial<Ruleset["outOfCombat"]>): Ruleset => ({ ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, ...ooc } });

describe("buildRestBlock", () => {
  it("null when every out-of-combat toggle is off", () => {
    expect(buildRestBlock({ participant: p, character: { level: 3 }, rules: DEFAULT_RULES, maxLevel: 20 })).toBeNull();
    expect(buildRestBlock({ participant: p, character: { level: 3 }, maxLevel: 20 })).toBeNull();
  });

  it("persisted resources: HP, hit dice, charges", () => {
    const block = buildRestBlock({
      participant: p,
      character: { level: 3, resources: { hitDiceSpent: { fighter: 1 }, exhaustion: 2, shortRestOpen: true } },
      classes: [{ classId: "fighter", level: 3, class: fighter, subclass: null }],
      rules: rules({ persistResources: true }),
      maxLevel: 20,
    });

    expect(block).toMatchObject({
      persist: true,
      hp: { current: 12, max: 30, temp: 2 },
      exhaustion: 2,
      shortRestOpen: true,
      hitDice: [{ classId: "fighter", name: "Воїн", die: 10, total: 3, spent: 1 }],
      charges: [{ key: surge.key, uses: 1, used: 1, rest: "short" }],
      inspiration: null,
      xp: null,
    });
  });

  it("xp and inspiration without persisted resources", () => {
    expect(buildRestBlock({ participant: p, character: { level: 1, experience: 300, inspiration: true }, rules: rules({ xp: true, inspiration: true }), maxLevel: 20 })).toMatchObject({
      persist: false, hp: null, hitDice: [], charges: [], inspiration: true, xp: { value: 300, next: 300, levelUp: true },
    });
  });
});
```

```ts
// lib/utils/characters/resources/__tests__/describe-log.test.ts
import { describe, expect, it } from "vitest";

import { describeCharacterLog } from "@/lib/utils/characters/resources/describe-log";

describe("describeCharacterLog", () => {
  it.each([
    [{ kind: "check", data: { label: "Скритність", rolls: [11, 20], total: 23, mode: "advantage", inspiration: true } }, "🎲 Скритність: 11 / 20 → 23 (перевага) · натхнення"],
    [{ kind: "save", data: { label: "Рятівний кидок: Мудрість", rolls: [], total: 0, autoFail: true } }, "🎲 Рятівний кидок: Мудрість: автопровал"],
    [{ kind: "hit_die", data: { die: 10, roll: 6, healed: 8, hpBefore: 10, hpAfter: 18 } }, "🎲 Кістка хітів d10: 6 → +8 HP (10 → 18)"],
    [{ kind: "xp", data: { amount: -50, total: 0 } }, "⭐ Досвід -50 (разом 0)"],
    [{ kind: "battle_result", data: { hpBefore: 20, hpAfter: 0, maxHp: 20, dead: true } }, "⚔ Після бою: HP 20 → 0 / 20 · загинув"],
    [{ kind: "short_rest", data: {} }, "☕ Короткий відпочинок"],
  ] as const)("%j", (entry, text) => {
    expect(describeCharacterLog(entry as never)).toBe(text);
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/characters/sheet/__tests__/rest-block.test.ts lib/utils/characters/resources/__tests__/describe-log.test.ts` — FAIL.
- [ ] **Step 3: Implement pure parts.**

```ts
// lib/utils/characters/sheet/rest-block.ts
import { levelUpAvailable, xpForLevel } from "@/lib/constants/experience";
import { hitDicePool } from "@/lib/utils/characters/resources/hit-dice";
import { readResources } from "@/lib/utils/characters/resources/schema";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { SheetRest } from "@/types/characters";
import type { ResolvedClassEntry } from "@/types/classes";

export function buildRestBlock(input: {
  participant: BattleParticipant;
  character: { level: number; resources?: unknown; inspiration?: boolean; experience?: number };
  classes?: ResolvedClassEntry[];
  rules?: Ruleset;
  maxLevel: number;
}): SheetRest | null {
  const ooc = input.rules?.outOfCombat;

  if (!ooc || (!ooc.persistResources && !ooc.xp && !ooc.inspiration)) return null;

  const { participant: p, character: c } = input;

  const persist = ooc.persistResources;

  const r = persist ? readResources(c.resources) : {};

  const experience = c.experience ?? 0;

  return {
    persist,
    hp: persist ? { current: p.combatStats.currentHp, max: p.combatStats.maxHp, temp: p.combatStats.tempHp } : null,
    dead: !!r.dead,
    exhaustion: r.exhaustion ?? 0,
    shortRestOpen: !!r.shortRestOpen,
    hitDice: persist ? hitDicePool(input.classes ?? []).map((e) => ({ classId: e.classId, name: e.name, die: e.die, total: e.level, spent: Math.min(e.level, r.hitDiceSpent?.[e.classId] ?? 0) })) : [],
    charges: persist
      ? p.battleData.resolvedAbilities.flatMap((a) => (a.limits?.perRest ? [{ key: a.key, name: a.name, uses: a.limits.perRest.uses, used: p.battleData.abilityUsage?.[a.key]?.battle ?? 0, rest: a.limits.perRest.rest }] : []))
      : [],
    inspiration: ooc.inspiration ? !!c.inspiration : null,
    xp: ooc.xp ? { value: experience, next: xpForLevel(c.level + 1), levelUp: levelUpAvailable({ level: c.level, experience }, input.maxLevel) } : null,
  };
}
```

```ts
// lib/utils/characters/resources/describe-log.ts
import type { CharacterLogEntry } from "@/types/characters";

const MODE_NOTE: Record<string, string> = { advantage: " (перевага)", disadvantage: " (перешкода)" };

export function describeCharacterLog(e: Pick<CharacterLogEntry, "kind" | "data">): string {
  const d = e.data;

  const num = (k: string) => (typeof d[k] === "number" ? (d[k] as number) : 0);

  switch (e.kind) {
    case "check":
    case "save": {
      const rolls = Array.isArray(d.rolls) ? (d.rolls as number[]).join(" / ") : "";

      const result = d.autoFail ? "автопровал" : `${rolls} → ${num("total")}${MODE_NOTE[String(d.mode)] ?? ""}`;

      return `🎲 ${String(d.label ?? "Кидок")}: ${result}${d.inspiration ? " · натхнення" : ""}`;
    }
    case "short_rest":
      return "☕ Короткий відпочинок";
    case "long_rest":
      return "🛏 Довгий відпочинок";
    case "rest_closed":
      return "Відпочинок завершено";
    case "hit_die":
      return `🎲 Кістка хітів d${num("die")}: ${num("roll")} → +${num("healed")} HP (${num("hpBefore")} → ${num("hpAfter")})`;
    case "xp":
      return `⭐ Досвід ${num("amount") > 0 ? "+" : ""}${num("amount")} (разом ${num("total")})${typeof d.note === "string" ? ` · ${d.note}` : ""}`;
    case "inspiration":
      return d.value ? "✦ Отримано натхнення" : "✦ Натхнення знято";
    case "resources_edit":
      return "ДМ змінив ресурси";
    case "battle_result":
      return `⚔ Після бою: HP ${num("hpBefore")} → ${num("hpAfter")} / ${num("maxHp")}${d.dead ? " · загинув" : ""}`;
  }
}
```

- [ ] **Step 4: Sheet + list.** `build-sheet.ts`: у `SheetInput.character` додати `resources?: unknown; inspiration?: boolean; experience?: number`; у результат — `rest: buildRestBlock({ participant: p, character: c, classes: input.classes, rules: input.rules, maxLevel: input.maxLevel })` і `slots: slotLevels(p).filter((s) => s.max > 0).map((s) => ({ level: s.level, count: s.max, current: s.current }))`. `buildSheetFor` уже передає Prisma-рядок персонажа — нові колонки йдуть самі. `list-characters.ts`: `LIST_SELECT` + `experience: true, inspiration: true, resources: true`. У `sheet-fixture.ts` — `rest: null` і `current` (= `count`) у кожному слоті.
- [ ] **Step 5: Client + hooks.**

```ts
// lib/api/characters.ts (додати; типи — з @/types/characters)
export const postRest = (campaignId: string, body: RestBody) => campaignPost<{ characters: { id: string; resources: CharacterResources }[] }>(campaignId, "/rest", body);

export const postHitDie = (campaignId: string, characterId: string, classId: string) => campaignPost<HitDieResult>(campaignId, `/characters/${characterId}/hit-dice`, { classId });

export const postSheetRoll = (campaignId: string, characterId: string, body: SheetRollBody) => campaignPost<SheetRollResult>(campaignId, `/characters/${characterId}/roll`, body);

export const postExperience = (campaignId: string, body: AwardXpBody) => campaignPost<{ characters: { id: string; experience: number }[] }>(campaignId, "/experience", body);

export const postInspiration = (campaignId: string, characterId: string, value: boolean) => campaignPost<{ inspiration: boolean }>(campaignId, `/characters/${characterId}/inspiration`, { value });

export const patchResources = (campaignId: string, characterId: string, body: ResourcesEditBody) => campaignPatch<{ resources: CharacterResources }>(campaignId, `/characters/${characterId}/resources`, body);

export const getCharacterLog = (campaignId: string, characterId: string, cursor?: string) =>
  campaignGet<{ entries: CharacterLogEntry[]; nextCursor: string | null }>(campaignId, `/characters/${characterId}/log${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
```

```ts
// lib/hooks/characters/useOutOfCombat.ts
"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { getCharacterLog, patchResources, postExperience, postHitDie, postInspiration, postRest, postSheetRoll } from "@/lib/api/characters";
import { useCrudMutation } from "@/lib/hooks/common";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";
import type { AwardXpBody, ResourcesEditBody, RestBody, SheetRollBody } from "@/types/characters";

const partyKeys = (c: string) => [characterKeys.sheet(c), characterKeys.lists(c), characterKeys.logs(c)];

const heroKeys = (c: string, id: string) => [characterKeys.sheet(c, id), characterKeys.lists(c), characterKeys.log(c, id)];

export function useRest(campaignId: string) {
  return useCrudMutation({ mutationFn: (body: RestBody) => postRest(campaignId, body), invalidateKeys: partyKeys(campaignId), errorText: "Не вдалося провести відпочинок" });
}

export function useAwardXp(campaignId: string) {
  return useCrudMutation({ mutationFn: (body: AwardXpBody) => postExperience(campaignId, body), invalidateKeys: partyKeys(campaignId), errorText: "Не вдалося нарахувати досвід" });
}

export function useSpendHitDie(campaignId: string, characterId: string) {
  return useCrudMutation({ mutationFn: (classId: string) => postHitDie(campaignId, characterId, classId), invalidateKeys: heroKeys(campaignId, characterId) });
}

export function useSheetRoll(campaignId: string, characterId: string) {
  return useCrudMutation({
    mutationFn: (body: SheetRollBody) => postSheetRoll(campaignId, characterId, body),
    invalidateKeys: (_r, body) => (body.useInspiration ? heroKeys(campaignId, characterId) : [characterKeys.log(campaignId, characterId)]),
  });
}

export function useInspiration(campaignId: string, characterId: string) {
  return useCrudMutation({ mutationFn: (value: boolean) => postInspiration(campaignId, characterId, value), invalidateKeys: heroKeys(campaignId, characterId), errorText: "Не вдалося змінити натхнення" });
}

export function useEditResources(campaignId: string, characterId: string) {
  return useCrudMutation({ mutationFn: (body: ResourcesEditBody) => patchResources(campaignId, characterId, body), invalidateKeys: heroKeys(campaignId, characterId), errorText: "Не вдалося змінити ресурси" });
}

export function useCharacterLog(campaignId: string, characterId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: characterKeys.log(campaignId, characterId),
    queryFn: ({ pageParam }) => getCharacterLog(campaignId, characterId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    staleTime: ENTITY_STALE_MS,
  });
}
```

`index.ts`: `export { useAwardXp, useCharacterLog, useEditResources, useInspiration, useRest, useSheetRoll, useSpendHitDie } from "./useOutOfCombat";`.

- [ ] **Step 6:** нові тести + `pnpm test:related lib/utils/characters/sheet/build-sheet.ts "app/api/campaigns/[id]/characters/list-characters.ts" lib/hooks/characters/index.ts lib/api/characters.ts` і `pnpm test:run lib/__tests__/client-entry-imports.test.ts` — PASS.
- [ ] **Step 7: Commit**

```bash
git add types/characters.ts lib/utils/characters lib/api/characters.ts lib/hooks/characters "app/api/campaigns/[id]/characters/list-characters.ts" components/character-profile/__tests__/sheet-fixture.ts
git commit -m "feat(constructor): 4d sheet rest block, client api and hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: UI листа персонажа

**Files:**
- Create: `components/character-profile/rest/HitDicePanel.tsx`, `components/character-profile/rest/RestBadges.tsx`, `components/character-profile/rest/SheetRollDialog.tsx`, `components/character-profile/rest/CharacterLogTab.tsx`, `components/character-profile/rest/ChargesList.tsx`
- Modify: `components/character-profile/ProfileHero.tsx`, `CombatTab.tsx`, `MagicTab.tsx`, `SkillsTab.tsx`, `CharacterProfile.tsx`, `ProfileTabs.tsx` (`ProfileTabId` + `"log"`)
- Test: `components/character-profile/rest/__tests__/hit-dice-panel.test.tsx`, `components/character-profile/rest/__tests__/sheet-roll-dialog.test.tsx`

**Interfaces:**
- Consumes: `sheet.rest: SheetRest | null` (задача 11), `useSpendHitDie`, `useSheetRoll`, `useCharacterLog` (задача 11), `describeCharacterLog` (задача 11), `useProfile` (`components/character-profile/ProfileContext.tsx`), `DiceStage`/`DiceStageHandle` (`components/battle/fx/dice/DiceStage.tsx`), `DiceThrowSpec` (`lib/utils/battle/fx/dice`), `cryptoRandom` (`lib/utils/common/dice.ts`).
- Produces: `SheetRollRequest = { label: string; subject: SheetRollSubject }`; `SheetRollDialog({ request, onClose }: { request: SheetRollRequest | null; onClose: () => void })`.

Правило показу: усе нове — лише коли `sheet.rest !== null` (HOMM5 і кампанії з вимкненими перемикачами бачать лист як зараз, тести `profile-view.test.tsx` без змін). Кидки й кістки хітів — власник або ДМ (`sheet.viewer.isOwner || sheet.viewer.isDM`).

- [ ] **Step 1: Failing component tests**

```tsx
// components/character-profile/rest/__tests__/hit-dice-panel.test.tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "../../__tests__/sheet-fixture";
import { ProfileProvider } from "../../ProfileContext";
import { HitDicePanel } from "../HitDicePanel";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet, SheetRest } from "@/types/characters";

const h = vi.hoisted(() => ({ spend: { mutateAsync: vi.fn(async () => ({ roll: 6, healed: 8 })), isPending: false } }));

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useSpendHitDie: () => h.spend }));

const rest = (over: Partial<SheetRest> = {}): SheetRest => ({
  persist: true, hp: { current: 10, max: 30, temp: 0 }, dead: false, exhaustion: 0, shortRestOpen: true,
  hitDice: [{ classId: "fig", name: "Воїн", die: 10, total: 3, spent: 1 }], charges: [], inspiration: null, xp: null, ...over,
});

const show = (r: SheetRest, viewer: CharacterSheet["viewer"] = { isDM: false, isOwner: true }) =>
  renderWithConfirm(
    <ProfileProvider campaignId="c" characterId="ch" sheet={{ ...sheetFixture, viewer, rest: r }} canEdit={false}>
      <HitDicePanel />
    </ProfileProvider>,
  );

describe("HitDicePanel", () => {
  afterEach(cleanup);

  it("spend button in the short rest window", () => {
    show(rest());

    expect(screen.getByText(/витрачено 1 \/ 3/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Витратити" }));

    expect(h.spend.mutateAsync).toHaveBeenCalledWith("fig");
  });

  it("no button outside the window, when all spent, or for a stranger", () => {
    show(rest({ shortRestOpen: false }));
    expect(screen.queryByRole("button", { name: "Витратити" })).toBeNull();
    cleanup();

    show(rest({ hitDice: [{ classId: "fig", name: "Воїн", die: 10, total: 3, spent: 3 }] }));
    expect(screen.queryByRole("button", { name: "Витратити" })).toBeNull();
    cleanup();

    show(rest(), { isDM: false, isOwner: false });
    expect(screen.queryByRole("button", { name: "Витратити" })).toBeNull();
  });

  it("renders nothing without persisted resources", () => {
    show(rest({ persist: false, hitDice: [] }));

    expect(screen.queryByLabelText("Кістки хітів")).toBeNull();
  });
});
```

```tsx
// components/character-profile/rest/__tests__/sheet-roll-dialog.test.tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "../../__tests__/sheet-fixture";
import { ProfileProvider } from "../../ProfileContext";
import { SheetRollDialog } from "../SheetRollDialog";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { SheetRest } from "@/types/characters";

const h = vi.hoisted(() => ({ roll: { mutateAsync: vi.fn(async () => ({ label: "Скритність", rolls: [11, 20], roll: 20, mod: 4, bonus: 2, total: 26, mode: "advantage", autoFail: false, inspirationUsed: true })), isPending: false } }));

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useSheetRoll: () => h.roll }));
vi.mock("@/components/battle/fx/dice/DiceStage", () => ({ DiceStage: () => null }));

const rest: SheetRest = { persist: false, hp: null, dead: false, exhaustion: 0, shortRestOpen: false, hitDice: [], charges: [], inspiration: true, xp: null };

describe("SheetRollDialog", () => {
  afterEach(cleanup);

  it("rolls on the server with inspiration and shows the total", async () => {
    mockMatchMedia(false);
    renderWithConfirm(
      <ProfileProvider campaignId="c" characterId="ch" sheet={{ ...sheetFixture, rest }} canEdit={false}>
        <SheetRollDialog request={{ label: "Скритність", subject: { kind: "check", skill: "stealth" } }} onClose={() => {}} />
      </ProfileProvider>,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Натхнення" }));
    fireEvent.click(screen.getByRole("button", { name: "Кинути" }));

    await waitFor(() => expect(screen.getByText("26")).toBeTruthy());
    expect(h.roll.mutateAsync).toHaveBeenCalledWith({ kind: "check", skill: "stealth", useInspiration: true });
  });
});
```

(Якщо `mockMatchMedia` має іншу сигнатуру — взяти використання з `components/character-profile/__tests__/profile-view.test.tsx`.)

- [ ] **Step 2:** `pnpm test:run components/character-profile/rest/__tests__` — FAIL.
- [ ] **Step 3: Components.**

```tsx
// components/character-profile/rest/HitDicePanel.tsx
"use client";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { useSpendHitDie } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";

export function HitDicePanel() {
  const { campaignId, characterId, sheet } = useProfile();

  const spend = useSpendHitDie(campaignId, characterId);

  const notify = useNotify();

  const rest = sheet.rest;

  if (!rest?.persist || rest.hitDice.length === 0) return null;

  const canSpend = rest.shortRestOpen && !rest.dead && (sheet.viewer.isOwner || sheet.viewer.isDM);

  const onSpend = (classId: string) =>
    spend.mutateAsync(classId).then(
      (r) => notify(`Кістка хітів: ${r.roll} → +${r.healed} HP`),
      (e: Error) => notify(e.message || "Не вдалося витратити кістку хітів"),
    );

  return (
    <ul aria-label="Кістки хітів" className="mt-2 space-y-1 text-sm">
      {rest.hitDice.map((d) => (
        <li key={d.classId} className="flex min-h-9 items-center justify-between gap-2">
          <span className="text-hud-muted">
            {d.name} · d{d.die}: витрачено {d.spent} / {d.total}
          </span>
          {canSpend && d.spent < d.total && (
            <Button type="button" size="sm" variant="outline" disabled={spend.isPending} onClick={() => void onSpend(d.classId)}>
              Витратити
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
```

```tsx
// components/character-profile/rest/RestBadges.tsx
"use client";

import { useProfile } from "../ProfileContext";

import { HudPill } from "@/components/hud/page";

export function RestBadges() {
  const { sheet } = useProfile();

  const rest = sheet.rest;

  if (!rest) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
      {rest.dead && <HudPill tone="silver">Загинув</HudPill>}
      {rest.exhaustion > 0 && <HudPill tone="silver">Виснаження {rest.exhaustion}</HudPill>}
      {rest.inspiration && <HudPill tone="gold">✦ Натхнення</HudPill>}
      {rest.shortRestOpen && <HudPill tone="gold">Короткий відпочинок</HudPill>}
      {rest.xp && (
        <span className="text-hud-muted">
          Досвід {rest.xp.value}
          {rest.xp.next !== null && ` / ${rest.xp.next}`}
          {rest.xp.levelUp && <b className="ml-1 text-hud-gold">· доступне підвищення рівня</b>}
        </span>
      )}
    </div>
  );
}
```

```tsx
// components/character-profile/rest/SheetRollDialog.tsx
"use client";

import { useRef, useState } from "react";

import { useProfile } from "../ProfileContext";

import "@/components/battle/fx/fx.css";
import { DiceStage, type DiceStageHandle } from "@/components/battle/fx/dice/DiceStage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Switch } from "@/components/ui/switch";
import { useSheetRoll } from "@/lib/hooks/characters";
import { cryptoRandom } from "@/lib/utils/common/dice";
import { signed } from "@/lib/utils/common/format";
import type { SheetRollResult, SheetRollSubject } from "@/types/characters";

export interface SheetRollRequest {
  label: string;
  subject: SheetRollSubject;
}

const MODE_TEXT = { advantage: "з перевагою", disadvantage: "з перешкодою", normal: "" } as const;

export function SheetRollDialog({ request, onClose }: { request: SheetRollRequest | null; onClose: () => void }) {
  const { campaignId, characterId, sheet } = useProfile();

  const roll = useSheetRoll(campaignId, characterId);

  const stage = useRef<DiceStageHandle>(null);

  const [useInspiration, setUseInspiration] = useState(false);

  const [result, setResult] = useState<SheetRollResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setResult(null);
    setError(null);
    setUseInspiration(false);
    onClose();
  };

  const throwDice = async () => {
    if (!request) return;

    setError(null);

    try {
      const r = await roll.mutateAsync({ ...request.subject, ...(useInspiration && { useInspiration: true }) });

      setResult(r);
      void stage.current?.play({ seed: Math.floor(cryptoRandom() * 2 ** 31), groups: [r.rolls.map((value) => ({ sides: 20 as const, value }))] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося кинути");
    }
  };

  return (
    <ResponsiveDialog
      hud
      open={!!request}
      onOpenChange={(o) => !o && close()}
      title={request?.label ?? ""}
      footer={
        <Button type="button" disabled={roll.isPending} onClick={() => void throwDice()}>
          Кинути
        </Button>
      }
    >
      {sheet.rest?.inspiration && !result && (
        <div className="flex items-center gap-3">
          <Switch id="sheet-roll-inspiration" aria-label="Натхнення" checked={useInspiration} onCheckedChange={setUseInspiration} />
          <Label htmlFor="sheet-roll-inspiration">✦ Натхнення — перевага, натхнення буде витрачено</Label>
        </div>
      )}
      {result && (
        <div aria-live="polite" className="text-center">
          <div className="text-4xl font-bold tabular-nums text-hud-gold-bright">{result.autoFail ? "✕" : result.total}</div>
          <div className="text-xs text-hud-muted">
            {result.autoFail ? "Автопровал" : `d20 ${result.rolls.join(" / ")} ${MODE_TEXT[result.mode]} · ${signed(result.mod + result.bonus)}`}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}
      <DiceStage ref={stage} />
    </ResponsiveDialog>
  );
}
```

```tsx
// components/character-profile/rest/ChargesList.tsx
"use client";

import { useProfile } from "../ProfileContext";

import { HudSection } from "@/components/hud/form";

const REST_LABEL = { short: "короткий відпочинок", long: "довгий відпочинок" } as const;

export function ChargesList() {
  const { sheet } = useProfile();

  const charges = sheet.rest?.persist ? sheet.rest.charges : [];

  if (charges.length === 0) return null;

  return (
    <HudSection title="ЗАРЯДИ">
      <ul className="text-sm">
        {charges.map((c) => (
          <li key={c.key} className="flex justify-between gap-2 border-b border-[#2a2218] py-1">
            <span className="min-w-0 truncate">{c.name}</span>
            <span className="shrink-0 tabular-nums text-hud-muted">
              {Math.max(0, c.uses - c.used)} / {c.uses} · {REST_LABEL[c.rest]}
            </span>
          </li>
        ))}
      </ul>
    </HudSection>
  );
}
```

```tsx
// components/character-profile/rest/CharacterLogTab.tsx
"use client";

import { useProfile } from "../ProfileContext";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useCharacterLog } from "@/lib/hooks/characters";
import { describeCharacterLog } from "@/lib/utils/characters/resources/describe-log";

export function CharacterLogTab() {
  const { campaignId, characterId } = useProfile();

  const log = useCharacterLog(campaignId, characterId);

  const entries = log.data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <HudSection title="ЖУРНАЛ">
      {entries.length === 0 && <p className="text-sm text-hud-muted">{log.isPending ? "Завантаження…" : "Записів ще немає."}</p>}
      <ul>
        {entries.map((e) => (
          <li key={e.id} className="break-words border-b border-[#2a2218] py-1.5 text-xs text-hud-muted">
            {new Date(e.createdAt).toLocaleString("uk-UA")} · {e.actor?.displayName ?? "Система"} · <span className="text-hud-ink">{describeCharacterLog(e)}</span>
          </li>
        ))}
      </ul>
      {log.hasNextPage && (
        <Button variant="outline" size="sm" className="mt-2" disabled={log.isFetchingNextPage} onClick={() => void log.fetchNextPage()}>
          Показати ще
        </Button>
      )}
    </HudSection>
  );
}
```

- [ ] **Step 4: Wire into the sheet.**
  - `ProfileHero.tsx`: текст кнопки HP — `sheet.rest?.hp ? \`HP ${sheet.rest.hp.current} / ${sheet.rest.hp.max}${sheet.rest.hp.temp ? \` (+${sheet.rest.hp.temp})\` : ""}\` : \`HP ${sheet.hp.total}\``, далі як було (`· ${sheet.hitDice}`); під кнопкою — `<RestBadges />` і `<HitDicePanel />`. У `CompactHero` — те саме `HP` (current/max), коли `sheet.rest?.hp`.
  - `CombatTab.tsx`: `const canRoll = !!sheet.rest && (sheet.viewer.isOwner || sheet.viewer.isDM)`; стан `const [rollRequest, setRollRequest] = useState<SheetRollRequest | null>(null)`; у списках «РЯТІВНІ КИДКИ» і «НАВИЧКИ» вміст `<li>` загорнути в `<button type="button" disabled={!canRoll} onClick={() => setRollRequest(…)} className="flex w-full justify-between gap-2 text-left disabled:cursor-default">` (той самий вміст); для рятівного — `{ label: \`Рятівний кидок: ${s.label}\`, subject: { kind: "save", ability: s.ability } }`, для навички — `{ label: s.label, subject: { kind: "check", skill: s.key as DndSkill } }`; наприкінці — `<SheetRollDialog request={rollRequest} onClose={() => setRollRequest(null)} />` (лише коли `canRoll`).
  - `MagicTab.tsx`: коли `sheet.rest?.persist`, слот показує `{roman} · {s.current}/{s.count}` (і `aria-label` з «залишилось»), пакт уже показує `current/max`.
  - `SkillsTab.tsx`: `<ChargesList />` після `RacePassive`.
  - `ProfileTabs.tsx`: `ProfileTabId` + `"log"`. `CharacterProfile.tsx`: `VIEW_TABS` + `"log"`; `viewTabs(withLog: boolean)` додає `{ id: "log", label: "Журнал", content: <CharacterLogTab /> }`, коли `withLog`; у рендері `const tabs = viewTabs(!!sheet.rest)` і `value={tabs.some((t) => t.id === tab) ? tab : "combat"}`.

- [ ] **Step 5:** нові тести + `pnpm test:run components/character-profile` — PASS (наявні `profile-view`, `profile-tabs` без змін).
- [ ] **Step 6: Commit**

```bash
git add components/character-profile
git commit -m "feat(constructor): 4d character sheet — HP, hit dice, sheet rolls, charges, log tab

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: UI ДМ — відпочинок, досвід, ресурси, натхнення

**Files:**
- Create: `components/characters/rest/RestDialog.tsx`, `components/characters/rest/ExperienceDialog.tsx`, `components/characters/rest/PartyRestActions.tsx`, `components/character-profile/rest/ResourcesDialog.tsx`, `components/character-profile/rest/DmRestActions.tsx`
- Modify: `app/campaigns/[id]/dm/characters/page-client.tsx` (кнопки в `HudPageHeader.actions`), `components/characters/list/DmCharacterCard.tsx`, `components/character-profile/CharacterProfile.tsx` (`DmRestActions` в `actions` героя для ДМ)
- Test: `components/characters/rest/__tests__/rest-dialog.test.tsx`, `components/characters/list/__tests__/dm-card-rest.test.tsx`

**Interfaces:**
- Consumes: `useRest`, `useAwardXp`, `useEditResources`, `useInspiration` (задача 11), `useCampaignRules` (`lib/hooks/campaigns`), `CharacterListItem` з `experience/inspiration/resources` (задача 11), `currentHp` (`lib/utils/characters/resources/hp.ts`), `levelUpAvailable` (`lib/constants/experience.ts`), `ResponsiveDialog`, `Checkbox` (`components/ui/checkbox`), `Switch`, `Input` (`components/ui/input`).
- Produces: `RestDialog({ campaignId, characters, open, onOpenChange })`, `ExperienceDialog({ campaignId, characters, open, onOpenChange })`, `PartyRestActions({ campaignId, characters }: { campaignId: string; characters: CharacterListItem[] })`, `ResourcesDialog({ open, onOpenChange })`, `DmRestActions()`; `DmCharacterCard` отримує необов'язковий проп `maxLevel?: number` (за замовчуванням 20).

Показ: кнопки «Відпочинок» і «Завершити відпочинок» (остання — коли хоч в одного героя `resources.shortRestOpen`) — при `rules.outOfCombat.persistResources`; «Досвід» — при `rules.outOfCombat.xp`. На листі героя для ДМ: «Ресурси» (при `persist`) і перемикач натхнення (при `rest.inspiration !== null`). Картка ДМ: HP `currentHp(resources, max)` / max (при `persist`), «✦» (натхнення), «Рівень доступний» (при `xp` і `levelUpAvailable`). Усе приховано, коли перемикачі вимкнені (HOMM5 без змін).

- [ ] **Step 1: Failing tests**

```tsx
// components/characters/rest/__tests__/rest-dialog.test.tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RestDialog } from "../RestDialog";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterListItem } from "@/types/characters";

const h = vi.hoisted(() => ({ rest: { mutateOk: vi.fn(async () => true), isPending: false } }));

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useRest: () => h.rest }));

const hero = (id: string, name: string) => ({ id, name, campaignId: "c", type: "player", controlledBy: "u", level: 3, class: "Воїн", race: "Людина" }) as CharacterListItem;

describe("RestDialog", () => {
  afterEach(cleanup);

  it("all heroes preselected; unchecking one and choosing long rest sends the rest", async () => {
    mockMatchMedia(false);

    const onOpenChange = vi.fn();

    renderWithConfirm(<RestDialog campaignId="c" characters={[hero("a", "Ліра"), hero("b", "Торін")]} open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Торін" }));
    fireEvent.click(screen.getByRole("button", { name: "Довгий" }));
    fireEvent.click(screen.getByRole("button", { name: "Почати відпочинок" }));

    expect(h.rest.mutateOk).toHaveBeenCalledWith({ kind: "long", characterIds: ["a"] });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("start is disabled with nobody selected", () => {
    mockMatchMedia(false);
    renderWithConfirm(<RestDialog campaignId="c" characters={[hero("a", "Ліра")]} open onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Ліра" }));

    expect((screen.getByRole("button", { name: "Почати відпочинок" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

```tsx
// components/characters/list/__tests__/dm-card-rest.test.tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DmCharacterCard } from "../DmCharacterCard";

import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { CharacterListItem } from "@/types/characters";

const h = vi.hoisted(() => ({ rules: null as unknown }));

vi.mock("@/lib/hooks/campaigns", async (orig) => ({ ...(await orig<object>()), useCampaignRules: () => ({ data: h.rules }) }));
vi.mock("@/lib/hooks/classes", () => ({ useClassMode: () => ({ enabled: false, byId: {}, classes: [], pending: false }) }));

const hero = { id: "a", name: "Ліра", campaignId: "c", type: "player", controlledBy: "u", level: 1, class: "Воїн", race: "Людина", constitution: 10, armorClass: 12, initiative: 0, experience: 300, inspiration: true, resources: { hp: 3 } } as CharacterListItem;

const show = () => render(<DmCharacterCard character={hero} campaignId="c" busy={false} actions={{ onDelete: () => {} }} />);

describe("DmCharacterCard: out of combat", () => {
  afterEach(cleanup);

  it("HOMM rules: no rest badges", () => {
    h.rules = DEFAULT_RULES;
    show();

    expect(screen.queryByText("✦")).toBeNull();
    expect(screen.queryByText("Рівень доступний")).toBeNull();
  });

  it("all toggles on: current HP, inspiration, level-up badge", () => {
    h.rules = { ...DEFAULT_RULES, outOfCombat: { persistResources: true, longRestHitDice: "half", xp: true, inspiration: true } };
    show();

    expect(screen.getByLabelText("HP").textContent).toContain("3");
    expect(screen.getByText("✦")).toBeTruthy();
    expect(screen.getByText("Рівень доступний")).toBeTruthy();
  });
});
```

(Якщо `HudStatChip` не ставить `aria-label` без `label` — передати `label="HP"` у картці; рендер може потребувати мока `next/link` або `ActionsMenu` — взяти з наявних тестів `components/characters/list/__tests__`.)

- [ ] **Step 2:** `pnpm test:run components/characters/rest components/characters/list/__tests__/dm-card-rest.test.tsx` — FAIL.
- [ ] **Step 3: DM party dialogs.**

```tsx
// components/characters/rest/RestDialog.tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useRest } from "@/lib/hooks/characters";
import { cn } from "@/lib/utils";
import type { CharacterListItem } from "@/types/characters";

const KINDS = [["short", "Короткий"], ["long", "Довгий"]] as const;

interface RestDialogProps {
  campaignId: string;
  characters: CharacterListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RestDialog({ campaignId, characters, open, onOpenChange }: RestDialogProps) {
  const rest = useRest(campaignId);

  const [kind, setKind] = useState<"short" | "long">("short");

  const [picked, setPicked] = useState<Set<string>>(() => new Set(characters.map((c) => c.id)));

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);

      if (!next.delete(id)) next.add(id);

      return next;
    });

  const start = () => void rest.mutateOk({ kind, characterIds: [...picked] }).then((ok) => ok && onOpenChange(false));

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Відпочинок"
      description="Короткий: слоти пакту, заряди «до короткого відпочинку», вікно кісток хітів. Довгий: усе, половина кісток хітів, виснаження −1. Мертві пропускаються."
      footer={
        <Button type="button" disabled={picked.size === 0 || rest.isPending} onClick={start}>
          Почати відпочинок
        </Button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2">
        {KINDS.map(([k, label]) => (
          <Button key={k} type="button" variant="outline" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn(kind === k && "border-hud-gold-strong bg-hud-gold-strong/20")}>
            {label}
          </Button>
        ))}
      </div>
      <ul className="space-y-1">
        {characters.map((c) => (
          <li key={c.id}>
            <label className="flex min-h-10 items-center gap-3 text-sm">
              <Checkbox aria-label={c.name} checked={picked.has(c.id)} onCheckedChange={() => toggle(c.id)} />
              {c.name}
            </label>
          </li>
        ))}
      </ul>
    </ResponsiveDialog>
  );
}
```

```tsx
// components/characters/rest/ExperienceDialog.tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Switch } from "@/components/ui/switch";
import { useAwardXp } from "@/lib/hooks/characters";
import type { CharacterListItem } from "@/types/characters";

interface ExperienceDialogProps {
  campaignId: string;
  characters: CharacterListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExperienceDialog({ campaignId, characters, open, onOpenChange }: ExperienceDialogProps) {
  const award = useAwardXp(campaignId);

  const [picked, setPicked] = useState<Set<string>>(() => new Set(characters.map((c) => c.id)));

  const [amount, setAmount] = useState("");

  const [split, setSplit] = useState(true);

  const [note, setNote] = useState("");

  const value = Number.parseInt(amount, 10);

  const valid = Number.isFinite(value) && value !== 0 && picked.size > 0;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);

      if (!next.delete(id)) next.add(id);

      return next;
    });

  const submit = () =>
    void award.mutateOk({ characterIds: [...picked], amount: value, split, ...(note.trim() && { note: note.trim() }) }).then((ok) => ok && onOpenChange(false));

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Досвід"
      footer={
        <Button type="button" disabled={!valid || award.isPending} onClick={submit}>
          Нарахувати
        </Button>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="xp-amount">Сума (від'ємна — виправлення)</Label>
          <Input id="xp-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <Switch id="xp-split" checked={split} onCheckedChange={setSplit} />
          <Label htmlFor="xp-split">Поділити між обраними</Label>
        </div>
        <div>
          <Label htmlFor="xp-note">Примітка</Label>
          <Input id="xp-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <ul className="space-y-1">
          {characters.map((c) => (
            <li key={c.id}>
              <label className="flex min-h-10 items-center gap-3 text-sm">
                <Checkbox aria-label={c.name} checked={picked.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                {c.name} · {c.experience ?? 0}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </ResponsiveDialog>
  );
}
```

```tsx
// components/characters/rest/PartyRestActions.tsx
"use client";

import { useState } from "react";

import { ExperienceDialog } from "./ExperienceDialog";
import { RestDialog } from "./RestDialog";

import { Button } from "@/components/ui/button";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useRest } from "@/lib/hooks/characters";
import type { CharacterListItem } from "@/types/characters";

export function PartyRestActions({ campaignId, characters }: { campaignId: string; characters: CharacterListItem[] }) {
  const { data: rules } = useCampaignRules(campaignId);

  const rest = useRest(campaignId);

  const [open, setOpen] = useState<"rest" | "xp" | null>(null);

  const ooc = rules?.outOfCombat;

  if (!ooc || characters.length === 0 || (!ooc.persistResources && !ooc.xp)) return null;

  const resting = characters.filter((c) => c.resources?.shortRestOpen).map((c) => c.id);

  return (
    <>
      {ooc.persistResources && (
        <Button type="button" variant="outline" onClick={() => setOpen("rest")}>
          Відпочинок
        </Button>
      )}
      {ooc.persistResources && resting.length > 0 && (
        <Button type="button" variant="outline" disabled={rest.isPending} onClick={() => void rest.mutateOk({ kind: "close", characterIds: resting })}>
          Завершити відпочинок
        </Button>
      )}
      {ooc.xp && (
        <Button type="button" variant="outline" onClick={() => setOpen("xp")}>
          Досвід
        </Button>
      )}
      {open === "rest" && <RestDialog campaignId={campaignId} characters={characters} open onOpenChange={(o) => !o && setOpen(null)} />}
      {open === "xp" && <ExperienceDialog campaignId={campaignId} characters={characters} open onOpenChange={(o) => !o && setOpen(null)} />}
    </>
  );
}
```

`page-client.tsx`: у `actions` `HudPageHeader` перед `DeleteAllButton` — `<PartyRestActions campaignId={campaignId} characters={page.query.data ?? []} />`.

- [ ] **Step 4: Card + sheet DM actions.** `DmCharacterCard.tsx`:

```tsx
  const ooc = rules?.outOfCombat;

  const maxHp = characterBaseHp(character, { entries, formula: rules && heroHpFormula(rules.heroScaling) }).total;

  const hp = ooc?.persistResources && character.resources ? currentHp(character.resources, maxHp) : maxHp;

  const levelReady = !!ooc?.xp && levelUpAvailable({ level: character.level, experience: character.experience ?? 0 }, maxLevel);
```

Новий необов'язковий проп картки `maxLevel?: number` (за замовчуванням 20; `page-client.tsx` передає наявний `maxLevel`), імпорти `currentHp` з `@/lib/utils/characters/resources/hp` і `levelUpAvailable` з `@/lib/constants/experience`. HP-чип: `<HudStatChip short="HP" label="HP" value={ooc?.persistResources ? \`${hp}/${maxHp}\` : maxHp} />`. Поруч з `HudPill` типу героя: `{ooc?.inspiration && character.inspiration && <span title="Натхнення" className="text-hud-gold">✦</span>}` і `{levelReady && <HudPill tone="gold">Рівень доступний</HudPill>}`.

```tsx
// components/character-profile/rest/ResourcesDialog.tsx
"use client";

import { useState } from "react";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useEditResources } from "@/lib/hooks/characters";
import type { ResourcesEditBody } from "@/types/characters";

const FORM_ID = "resources-edit-form";

export function ResourcesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { campaignId, characterId, sheet } = useProfile();

  const edit = useEditResources(campaignId, characterId);

  const rest = sheet.rest;

  const [hp, setHp] = useState(String(rest?.hp?.current ?? ""));

  const [temp, setTemp] = useState(String(rest?.hp?.temp ?? 0));

  const [exhaustion, setExhaustion] = useState(String(rest?.exhaustion ?? 0));

  const send = (body: ResourcesEditBody) => void edit.mutateOk(body).then((ok) => ok && onOpenChange(false));

  const save = () => send({ hp: Number(hp), tempHp: Number(temp), exhaustion: Number(exhaustion) });

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Ресурси героя"
      footer={
        <>
          <Button type="button" variant="outline" disabled={edit.isPending} onClick={() => send({ reset: true })}>
            Повністю відновити
          </Button>
          <Button type="button" variant="outline" disabled={edit.isPending} onClick={() => send({ dead: !rest?.dead })}>
            {rest?.dead ? "Воскресити" : "Позначити загиблим"}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={edit.isPending}>
            Зберегти
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="grid grid-cols-3 gap-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div>
          <Label htmlFor="res-hp">HP (макс. {rest?.hp?.max ?? "—"})</Label>
          <Input id="res-hp" type="number" min={0} value={hp} onChange={(e) => setHp(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="res-temp">Тимч. HP</Label>
          <Input id="res-temp" type="number" min={0} value={temp} onChange={(e) => setTemp(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="res-exh">Виснаження</Label>
          <Input id="res-exh" type="number" min={0} max={6} value={exhaustion} onChange={(e) => setExhaustion(e.target.value)} />
        </div>
      </form>
    </ResponsiveDialog>
  );
}
```

```tsx
// components/character-profile/rest/DmRestActions.tsx
"use client";

import { useState } from "react";

import { useProfile } from "../ProfileContext";
import { ResourcesDialog } from "./ResourcesDialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useInspiration } from "@/lib/hooks/characters";

export function DmRestActions() {
  const { campaignId, characterId, sheet } = useProfile();

  const inspiration = useInspiration(campaignId, characterId);

  const [open, setOpen] = useState(false);

  const rest = sheet.rest;

  if (!rest || !sheet.viewer.isDM) return null;

  return (
    <>
      {rest.persist && (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          Ресурси
        </Button>
      )}
      {rest.inspiration !== null && (
        <div className="flex items-center gap-2">
          <Switch id="dm-inspiration" checked={rest.inspiration} disabled={inspiration.isPending} onCheckedChange={(v) => void inspiration.mutateOk(v)} />
          <Label htmlFor="dm-inspiration">✦ Натхнення</Label>
        </div>
      )}
      {open && <ResourcesDialog open onOpenChange={setOpen} />}
    </>
  );
}
```

`CharacterProfile.tsx`: `actions` героя для ДМ — `<>{редагування як було}<DmRestActions /></>` (коли `canEdit && sheet.viewer.isDM`).

- [ ] **Step 5:** нові тести + `pnpm test:run components/characters components/character-profile "app/campaigns/[id]/dm/characters/__tests__"` — PASS.
- [ ] **Step 6: Commit**

```bash
git add components/characters components/character-profile "app/campaigns/[id]/dm/characters/page-client.tsx"
git commit -m "feat(constructor): 4d DM rest, experience, resources and inspiration UI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Документи й повна перевірка

**Files:**
- Modify: `docs/architecture/battle.md` (новий розділ «5e: поза боєм» перед «Changing battle behavior»), `docs/architecture/abilities.md` (речення про `perRest` у пункті 4c-1), `docs/STATUS.md` (рядок «Конструктор кампаній»: «4d поза боєм готовий»)

- [ ] **Step 1: `battle.md`** — розділ «5e: поза боєм» (українською, стисло, у стилі сусідніх розділів):
  - `rules.outOfCombat` (`persistResources`, `longRestHitDice`, `xp`, `inspiration`; усе вимкнено за замовчуванням, не залежить від `classes.enabled`);
  - `characters.resources` зберігає витрачене (`lib/utils/characters/resources/`: `schema`, `hp` — `currentHp`/`withHp`/`compactResources`); `characters.inspiration`; журнал `character_logs` (`writeCharacterLog`, види в `lib/constants/character-log.ts`);
  - старт бою: `createBattleParticipantFromCharacter` → `applyCharacterResources` (HP з обрізанням, 0 HP → непритомний/умирає, `dead`, слоти й пакт, заряди `perRest` → `abilityUsage`, виснаження через `applyCondition5e`, `battleData.inspiration`); той самий шлях — лист і баланс;
  - завершення: `saveBattle` (гілка `completing`) → `persistCharacterResources` (лише герої в полі, один раз на `sourceId`, журнал `battle_result`); перемога при `persistResources` повертає непритомних з 1 HP (`completeBattle(…, rules)`);
  - роути: `POST /rest` (ДМ), `…/hit-dice`, `…/roll` (власник або ДМ, `rollCheck`/`rollSave` з `advantage`), `POST /experience`, `…/inspiration`, `PATCH …/resources` (ДМ), `GET …/log`; 409 для вимкнених правил;
  - натхнення в атаці: `useInspiration` → причина переваги «Натхнення» в `rollModeReasons` (лише перший удар), знімається в мутації; клієнт — `SET_INSPIRATION` у майстрі атаки.
- [ ] **Step 2: `abilities.md`** — у пункті 4c-1 замінити «до 4d рушій трактує як `perBattle = uses` …» на: «у бою `perRest` рахується лічильником `abilityUsage[key].battle` (як `perBattle = uses`); при `rules.outOfCombat.persistResources` використання переживають бій (`resources.charges` з видом відпочинку) і відновлюються коротким (`rest: "short"`) або довгим відпочинком».
- [ ] **Step 3: `STATUS.md`** — у рядку «Конструктор кампаній» після фрагмента 4c-2 додати: «**4d «поза боєм» готовий** (`rules.outOfCombat`, `characters.resources`/`inspiration`, `character_logs`, старт/завершення бою з ресурсами, відпочинки, кістки хітів, кидки з листа, досвід 5e, натхнення; спек — розділ 4d того ж файлу, план `docs/superpowers/plans/2026-10-22-constructor-4d-out-of-combat.md`; опис — `docs/architecture/battle.md` «5e: поза боєм»)» і замінити «далі 4d поза боєм, 4e…» на «далі 4e…».
- [ ] **Step 4: Full verification.**
  - `pnpm test:run` — усі зелені (відомий нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` — перезапустити окремо).
  - `pnpm lint` — 0 errors.
  - `pnpm build`.
  - `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv` — без регресу на HOMM5 (відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається»).
- [ ] **Step 5: Commit**

```bash
git add docs/architecture/battle.md docs/architecture/abilities.md docs/STATUS.md
git commit -m "docs(constructor): 4d out-of-combat architecture and status

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6:** звіт контролеру: список комітів, відхилення від плану, підняті межі (OpenAPI), нестабільні тести.

(Фінальне рев'ю opus, хвиля виправлень, повторне рев'ю, `/simplify`, живий прогін за §12 спеку, хендоф і пам'ять — робить контролер після задачі 14.)
