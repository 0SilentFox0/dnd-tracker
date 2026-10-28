# Ядро бою, частина A — сховище і пайплайн: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Додати нормалізоване зберігання бою (рядок на учасника, журнал подій, знімки для відкату, версія) і єдиний серверний пайплайн дій, не перемикаючи на них жоден існуючий роут.

**Architecture:** Схема розширюється лише додаванням (expand-only): `BattleScene` отримує `version`/`eventSeq`, з'являються таблиці `battle_participants`, `battle_events`, `battle_snapshots` з RLS. Шар `lib/utils/battle/store/` перетворює `BattleParticipant` ↔ рядки (`split`/`join`), рахує дифф і зберігає все однією транзакцією з optimistic lock. `lib/utils/battle/pipeline/run-battle-mutation.ts` робить auth → доступ → `mutate` → перемога → збереження → Pusher-дельта, із залежностями, які можна підмінити в тестах. Роути переходять на це в частині B (окремий план, один реліз).

**Tech Stack:** Prisma 6 / Postgres 17, Next.js 16 route handlers (`after()` з `next/server`), Supabase `auth.getClaims()`, Pusher, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-05-battle-storage-redesign-design.md` (§3–§6, §9, §12 етап 2)

## Global Constraints

- Міграції лише expand-only: старі колонки `BattleScene` (`status` String, `currentRound`, `currentTurnIndex`, `initiativeOrder`, `pendingSummons`, `battleLog`, `participants`) лишаються і не перейменовуються; нові поля і таблиці лише додаються.
- Кожен `CREATE TABLE` у міграції має `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (перевіряє `prisma/__tests__/migrations-rls.test.ts`).
- Движок правил (`lib/utils/battle/*`, `lib/utils/skills/execution/*`) у цьому плані не змінюється; він і далі працює з `BattleParticipant[]` з `types/battle.ts`.
- Pusher-подія `battle-delta`; якщо серіалізована дельта > 9_500 байт — шлеться `{ battleId, version, refetch: true }`.
- HTTP-коди пайплайну: 400 невалідне тіло, 401 без сесії, 403 не учасник/не DM, 404 немає бою, 409 конфлікт версії, 422 порушення правила (`not_your_turn`, `wrong_status`, `participant_dead`, `invalid_dice`), 429 rate limit.
- Схему перевіряти на локальній БД (`pnpm db:local`, порт 54322). Інтеграційні тести, що пишуть у БД, запускаються **лише** проти `localhost`.
- Імпорти через `@/…`; `padding-line-between-statements`; коментарі мінімальні (лише «чому»).

## Review Focus

1. **Інтеграційний тест збереження запущено з `DATABASE_URL` прод-Supabase** → тест має пропуститися, а не писати в прод (тест у Task 6).
2. **`pendingMoraleCheck: null` у патчі сцени** → у БД має записатися SQL `NULL`, а не JSON `null`/помилка Prisma (тест у Task 6).
3. **Дія без жодної події** (наприклад, чисто технічне оновлення) → версія росте, знімок для відкату не створюється, `eventSeq` не змінюється (тест у Task 6).
4. **Поточний учасник мертвий/непритомний, а запит від його контролера** → 422 `participant_dead`, а не виконання дії (тест у Task 7).
5. **`mutate` кидає доменну помилку** → 422 з кодом, `saveBattle` не викликається, Pusher нічого не шле (тест у Task 7).

---

## File Structure

| Файл | Дія | Відповідальність |
|---|---|---|
| `prisma/schema.prisma` | Modify | `version`, `eventSeq`, моделі `BattleParticipant`, `BattleEvent`, `BattleSnapshot` |
| `prisma/migrations/20261006000000_battle_store/migration.sql` | Create | Згенерований DDL + RLS |
| `lib/utils/common/dice.ts` | Create | `parseDice`, `validateDiceRolls`, `maxRoll`, `averageRoll` |
| `lib/utils/common/__tests__/dice.test.ts` | Create | Тести кубиків |
| `lib/utils/battle/store/types.ts` | Create | `BattleSceneState`, `StoredParticipant`, `ParticipantColumns`, `ParticipantSnapshot`, `ParticipantState`, `NewBattleEvent`, `StoredBattleEvent`, `BattleDelta`, `LoadedBattle`, `BattleMutationOutcome` |
| `lib/utils/battle/store/stable-json.ts` | Create | Детермінований JSON і хеш |
| `lib/utils/battle/store/split-participant.ts` | Create | `splitParticipant`, `joinParticipant` |
| `lib/utils/battle/store/diff-participants.ts` | Create | `diffParticipants` |
| `lib/utils/battle/store/snapshot-state.ts` | Create | `buildSnapshotState` (формат §4.2) |
| `lib/utils/battle/store/errors.ts` | Create | `BattleConflictError`, `BattleAccessError`, `BattleRuleError` |
| `lib/utils/battle/store/load-battle.ts` | Create | `loadBattle` |
| `lib/utils/battle/store/save-battle.ts` | Create | `saveBattle` |
| `lib/utils/battle/store/index.ts` | Create | Barrel |
| `lib/utils/battle/store/__tests__/*.test.ts` | Create | Юніт-тести чистих частин |
| `tests/integration/battle-store.integration.test.ts` | Create | `loadBattle`/`saveBattle` на локальній БД |
| `lib/utils/battle/pipeline/run-battle-mutation.ts` | Create | `runBattleMutation` |
| `lib/utils/battle/pipeline/default-deps.ts` | Create | Справжні `getUserId`, `rateLimit`, `publish` |
| `lib/utils/battle/pipeline/to-api-battle.ts` | Create | Збирає відповідь у формі `BattleScene` з `types/api.ts` |
| `lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts` | Create | Тести пайплайну з підміненими залежностями |

---

### Task 1: Схема і міграція

**Files:**
- Modify: `prisma/schema.prisma` (модель `BattleScene` ~рядок 314)
- Create: `prisma/migrations/20261006000000_battle_store/migration.sql`

**Interfaces:**
- Produces: Prisma-моделі `battleParticipant`, `battleEvent`, `battleSnapshot`; поля `BattleScene.version`, `BattleScene.eventSeq`; relation-поля `BattleScene.battleParticipants`, `.battleEvents`, `.battleSnapshots`.

- [ ] **Step 1: Додати поля і моделі в `schema.prisma`**

У `model BattleScene` перед `campaign Campaign @relation(...)` додати:
```prisma
  version             Int                 @default(0)
  eventSeq            Int                 @default(0)
  battleParticipants  BattleParticipant[]
  battleEvents        BattleEvent[]
  battleSnapshots     BattleSnapshot[]
```
`participants` уже зайняте legacy-колонкою (лобі), тому relation зветься `battleParticipants`.

Після `model BattleScene { … }` додати:
```prisma
model BattleParticipant {
  id                 String      @id
  battleId           String
  sourceType         String
  sourceId           String
  side               String
  controlledBy       String
  orderIndex         Int
  isPending          Boolean     @default(false)
  extraTurnOf        String?
  currentHp          Int
  tempHp             Int
  maxHp              Int
  morale             Int
  status             String
  initiative         Int
  hasUsedAction      Boolean
  hasUsedBonusAction Boolean
  hasUsedReaction    Boolean
  hasExtraTurn       Boolean
  snapshot           Json
  state              Json
  snapshotHash       String
  battle             BattleScene @relation(fields: [battleId], references: [id], onDelete: Cascade)

  @@index([battleId, orderIndex])
  @@map("battle_participants")
}

model BattleEvent {
  id          String      @id @default(cuid())
  battleId    String
  seq         Int
  round       Int
  type        String
  actorId     String?
  targets     Json        @default("[]")
  details     Json        @default("{}")
  hpChanges   Json        @default("[]")
  resultText  String
  cancelledAt DateTime?
  createdAt   DateTime    @default(now())
  battle      BattleScene @relation(fields: [battleId], references: [id], onDelete: Cascade)

  @@unique([battleId, seq])
  @@map("battle_events")
}

model BattleSnapshot {
  battleId String
  seq      Int
  state    Json
  battle   BattleScene @relation(fields: [battleId], references: [id], onDelete: Cascade)

  @@id([battleId, seq])
  @@map("battle_snapshots")
}
```
Run: `pnpm exec prisma format && pnpm exec prisma validate`
Expected: `The schema at prisma/schema.prisma is valid`.

- [ ] **Step 2: Згенерувати міграцію проти локальної БД**

```bash
pnpm db:local
mkdir -p prisma/migrations/20261006000000_battle_store
pnpm exec prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "postgresql://postgres:postgres@localhost:54322/postgres_shadow" \
  --script > prisma/migrations/20261006000000_battle_store/migration.sql
```
Перед цим створити shadow-БД: `docker compose exec db psql -U postgres -c "CREATE DATABASE postgres_shadow;"` (помилка «already exists» — норма).
Дописати в кінець `migration.sql`:
```sql

-- RLS: Supabase Data API (anon key) не має бачити дані бою
ALTER TABLE "battle_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battle_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battle_snapshots" ENABLE ROW LEVEL SECURITY;
```
Перевірити, що SQL лише додає: `grep -E "DROP|RENAME|ALTER COLUMN" prisma/migrations/20261006000000_battle_store/migration.sql`
Expected: порожньо.

- [ ] **Step 3: Застосувати і перевірити**

```bash
pnpm migrate:deploy
pnpm test:run prisma/__tests__/migrations-rls.test.ts
pnpm test:integration tests/integration/db.integration.test.ts
pnpm exec prisma generate
```
Expected: `Applying migration 20261006000000_battle_store`; RLS-тест PASS; db-інтеграційні 5/5 PASS (RLS на всіх таблицях, включно з новими).

- [ ] **Step 4: Коміт**

```bash
git add prisma
git commit -m "feat(db): battle participants, events and snapshots tables (expand-only)"
```

---

### Task 2: Кубики `lib/utils/common/dice.ts`

**Files:**
- Create: `lib/utils/common/dice.ts`
- Create: `lib/utils/common/__tests__/dice.test.ts`

**Interfaces:**
- Produces:
  - `type DiceFormula = { groups: Array<{ count: number; size: number }>; flat: number }`
  - `parseDice(formula: string): DiceFormula | null`
  - `validateDiceRolls(formula: string, rolls: number[], opts?: { critical?: boolean }): { ok: true } | { ok: false; reason: "invalid_formula" | "count_mismatch" | "out_of_range" }`
  - `maxRoll(formula: string): number` (0 для невалідної)
  - `averageRoll(formula: string): number` (0 для невалідної; середнє d6 = 3.5)

Існуючі 6 парсерів **не** переводяться на цей модуль у цьому плані (це змінює числа шкоди — вирішується в під-проєкті «система умінь»).

- [ ] **Step 1: Тести**

```ts
import { describe, expect, it } from "vitest";

import { averageRoll, maxRoll, parseDice, validateDiceRolls } from "@/lib/utils/common/dice";

describe("parseDice", () => {
  it("2d6+3", () => {
    expect(parseDice("2d6+3")).toEqual({ groups: [{ count: 2, size: 6 }], flat: 3 });
  });

  it("кілька груп і мінус: 1d8 + 1d6 - 1", () => {
    expect(parseDice("1d8 + 1d6 - 1")).toEqual({
      groups: [
        { count: 1, size: 8 },
        { count: 1, size: 6 },
      ],
      flat: -1,
    });
  });

  it("d20 без кількості — один кубик", () => {
    expect(parseDice("d20")).toEqual({ groups: [{ count: 1, size: 20 }], flat: 0 });
  });

  it("лише число", () => {
    expect(parseDice("5")).toEqual({ groups: [], flat: 5 });
  });

  it("великі літери і пробіли", () => {
    expect(parseDice(" 3D4 ")).toEqual({ groups: [{ count: 3, size: 4 }], flat: 0 });
  });

  it("невалідне — null", () => {
    expect(parseDice("abc")).toBeNull();
    expect(parseDice("")).toBeNull();
    expect(parseDice("2d0")).toBeNull();
    expect(parseDice("0d6")).toBeNull();
  });
});

describe("validateDiceRolls", () => {
  it("коректні кидки", () => {
    expect(validateDiceRolls("2d6+3", [1, 6])).toEqual({ ok: true });
  });

  it("не та кількість", () => {
    expect(validateDiceRolls("2d6", [4])).toEqual({ ok: false, reason: "count_mismatch" });
    expect(validateDiceRolls("2d6", [4, 4, 4])).toEqual({ ok: false, reason: "count_mismatch" });
  });

  it("поза межами кубика: 0, 7 на d6, від'ємне, дробове", () => {
    expect(validateDiceRolls("1d6", [0])).toEqual({ ok: false, reason: "out_of_range" });
    expect(validateDiceRolls("1d6", [7])).toEqual({ ok: false, reason: "out_of_range" });
    expect(validateDiceRolls("1d6", [-3])).toEqual({ ok: false, reason: "out_of_range" });
    expect(validateDiceRolls("1d6", [2.5])).toEqual({ ok: false, reason: "out_of_range" });
  });

  it("кидки перевіряються по групах у порядку формули", () => {
    expect(validateDiceRolls("1d4+1d12", [3, 11])).toEqual({ ok: true });
    expect(validateDiceRolls("1d4+1d12", [11, 3])).toEqual({ ok: false, reason: "out_of_range" });
  });

  it("крит подвоює кількість кубиків", () => {
    expect(validateDiceRolls("1d8+2", [3, 8], { critical: true })).toEqual({ ok: true });
    expect(validateDiceRolls("1d8+2", [3], { critical: true })).toEqual({ ok: false, reason: "count_mismatch" });
  });

  it("невалідна формула", () => {
    expect(validateDiceRolls("xyz", [1])).toEqual({ ok: false, reason: "invalid_formula" });
  });
});

describe("maxRoll / averageRoll", () => {
  it("максимум 2d6+3 = 15", () => {
    expect(maxRoll("2d6+3")).toBe(15);
  });

  it("середнє 1d6 = 3.5 (без округлення)", () => {
    expect(averageRoll("1d6")).toBe(3.5);
    expect(averageRoll("2d6+3")).toBe(10);
  });

  it("невалідна формула — 0", () => {
    expect(maxRoll("x")).toBe(0);
    expect(averageRoll("x")).toBe(0);
  });
});
```

- [ ] **Step 2: Запустити — FAIL**

Run: `pnpm test:run lib/utils/common/__tests__/dice.test.ts`
Expected: FAIL — `Cannot find package '@/lib/utils/common/dice'`.

- [ ] **Step 3: Реалізація**

```ts
export type DiceFormula = {
  groups: Array<{ count: number; size: number }>;
  flat: number;
};

type DiceValidation =
  | { ok: true }
  | { ok: false; reason: "invalid_formula" | "count_mismatch" | "out_of_range" };

const TERM = /^([+-]?)(\d*)d(\d+)$|^([+-]?)(\d+)$/;

export function parseDice(formula: string): DiceFormula | null {
  const compact = formula.replace(/\s+/g, "").toLowerCase();

  if (!compact) return null;

  const terms = compact.match(/[+-]?[^+-]+/g);

  if (!terms) return null;

  const result: DiceFormula = { groups: [], flat: 0 };

  for (const term of terms) {
    const m = TERM.exec(term);

    if (!m) return null;

    if (m[3] !== undefined) {
      if (m[1] === "-") return null;

      const count = m[2] === "" ? 1 : Number(m[2]);

      const size = Number(m[3]);

      if (count < 1 || size < 1) return null;

      result.groups.push({ count, size });
    } else {
      const value = Number(m[5]);

      result.flat += m[4] === "-" ? -value : value;
    }
  }

  return result;
}

export function validateDiceRolls(
  formula: string,
  rolls: number[],
  opts: { critical?: boolean } = {},
): DiceValidation {
  const parsed = parseDice(formula);

  if (!parsed) return { ok: false, reason: "invalid_formula" };

  const multiplier = opts.critical ? 2 : 1;

  const sizes = parsed.groups.flatMap((g) =>
    Array.from({ length: g.count * multiplier }, () => g.size),
  );

  if (sizes.length !== rolls.length) return { ok: false, reason: "count_mismatch" };

  const inRange = rolls.every(
    (roll, i) => Number.isInteger(roll) && roll >= 1 && roll <= sizes[i],
  );

  return inRange ? { ok: true } : { ok: false, reason: "out_of_range" };
}

export function maxRoll(formula: string): number {
  const parsed = parseDice(formula);

  if (!parsed) return 0;

  return parsed.groups.reduce((sum, g) => sum + g.count * g.size, parsed.flat);
}

export function averageRoll(formula: string): number {
  const parsed = parseDice(formula);

  if (!parsed) return 0;

  return parsed.groups.reduce(
    (sum, g) => sum + (g.count * (g.size + 1)) / 2,
    parsed.flat,
  );
}
```
Порядок кидків при криті: кубики кожної групи подвоєні підряд (`1d4+1d12` з критом → `[d4,d4,d12,d12]`).

- [ ] **Step 4: Запустити — PASS**

Run: `pnpm test:run lib/utils/common/__tests__/dice.test.ts && pnpm lint lib/utils/common/dice.ts`
Expected: усі PASS; lint без помилок.

- [ ] **Step 5: Коміт**

```bash
git add lib/utils/common/dice.ts lib/utils/common/__tests__/dice.test.ts
git commit -m "feat(dice): single dice parser with roll validation"
```

---

### Task 3: Типи сховища, стабільний JSON, `split`/`join`

**Files:**
- Create: `lib/utils/battle/store/types.ts`, `stable-json.ts`, `split-participant.ts`
- Create: `lib/utils/battle/store/__tests__/split-participant.test.ts`

**Interfaces:**
- Consumes: `BattleParticipant` з `@/types/battle`; фікстура `createMockParticipant` з `@/lib/utils/skills/__tests__/skill-triggers-execution-mocks`.
- Produces (`types.ts`):
```ts
import type { BattleParticipant } from "@/types/battle";

export type BattleStatus = "prepared" | "active" | "completed";

export interface BattleSceneState {
  id: string;
  campaignId: string;
  status: BattleStatus;
  round: number;
  turnIndex: number;
  version: number;
  eventSeq: number;
  pendingMoraleCheck: unknown | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface ParticipantColumns {
  id: string;
  sourceType: string;
  sourceId: string;
  side: string;
  controlledBy: string;
  orderIndex: number;
  isPending: boolean;
  extraTurnOf: string | null;
  currentHp: number;
  tempHp: number;
  maxHp: number;
  morale: number;
  status: string;
  initiative: number;
  hasUsedAction: boolean;
  hasUsedBonusAction: boolean;
  hasUsedReaction: boolean;
  hasExtraTurn: boolean;
}

export type ParticipantSnapshot = Record<string, unknown>;

export interface ParticipantState {
  activeEffects: unknown[];
  skillUsageCounts?: Record<string, number>;
  pendingExtraActions?: number;
  spellSlotsCurrent: Record<string, number>;
}

export interface StoredParticipant {
  columns: ParticipantColumns;
  snapshot: ParticipantSnapshot;
  state: ParticipantState;
  snapshotHash: string;
}

export interface NewBattleEvent {
  type: string;
  round: number;
  actorId?: string | null;
  targets?: unknown[];
  details?: Record<string, unknown>;
  hpChanges?: unknown[];
  resultText: string;
}

export interface StoredBattleEvent extends Required<Omit<NewBattleEvent, "actorId">> {
  seq: number;
  actorId: string | null;
}

export interface LoadedBattle {
  scene: BattleSceneState;
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  isDM: boolean;
}

export type ScenePatch = Partial<
  Pick<BattleSceneState, "status" | "round" | "turnIndex" | "pendingMoraleCheck" | "startedAt" | "completedAt">
>;

export interface BattleMutationOutcome {
  scene?: ScenePatch;
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  events: NewBattleEvent[];
}

export interface BattleDelta {
  battleId: string;
  version: number;
  scene: Pick<BattleSceneState, "status" | "round" | "turnIndex" | "pendingMoraleCheck">;
  upserted: BattleParticipant[];
  removed: string[];
  events: StoredBattleEvent[];
}
```
- Produces (`stable-json.ts`): `stableStringify(value: unknown): string`, `hashJson(value: unknown): string` (sha1 hex).
- Produces (`split-participant.ts`): `splitParticipant(p: BattleParticipant, place: { orderIndex: number; isPending: boolean }): StoredParticipant`, `joinParticipant(stored: StoredParticipant, battleId: string): BattleParticipant`.

Поділ полів (спека §4.1): у колонки — `basicInfo.{id,sourceType,sourceId,side,controlledBy}`, `combatStats.{currentHp,tempHp,maxHp,morale,status}`, `abilities.initiative`, усі `actionFlags`; у `state` — `battleData.{activeEffects,skillUsageCounts,pendingExtraActions}` і `spellSlots[*].current`; усе інше — у `snapshot`. `basicInfo.battleId` не зберігається (береться з рядка). `battleData.pendingScopedArtifactBonuses` не зберігається (потрібне лише під час старту бою). `extraTurnOf` у цьому плані завжди `null` (механіка екстра-ходу змінюється в частині C).

- [ ] **Step 1: Тести**

`lib/utils/battle/store/__tests__/split-participant.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { joinParticipant, splitParticipant } from "@/lib/utils/battle/store/split-participant";
import { hashJson, stableStringify } from "@/lib/utils/battle/store/stable-json";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";
import type { BattleParticipant } from "@/types/battle";

function richParticipant(): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, avatar: "https://x/a.png", instanceNumber: 2 },
    combatStats: { ...base.combatStats, currentHp: 7, tempHp: 3, morale: -1, status: "unconscious" },
    spellcasting: {
      spellcastingAbility: "wisdom",
      spellSaveDC: 13,
      spellSlots: { "1": { max: 3, current: 1 }, "2": { max: 2, current: 2 } },
      knownSpells: ["s1", "s2"],
    },
    battleData: {
      ...base.battleData,
      attacks: [{ name: "Меч", type: "melee", attackBonus: 5, damageDice: "1d8+3", damageType: "slashing" }],
      activeEffects: [{ id: "e1", name: "Отрута", duration: 2 } as never],
      skillUsageCounts: { sk1: 1 },
      pendingExtraActions: 1,
      extras: { critThreshold: 19 },
    } as BattleParticipant["battleData"],
    actionFlags: { hasUsedAction: true, hasUsedBonusAction: false, hasUsedReaction: true, hasExtraTurn: false },
  };
}

describe("stableStringify", () => {
  it("не залежить від порядку ключів", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
    expect(hashJson({ b: 1, a: 2 })).toBe(hashJson({ a: 2, b: 1 }));
  });

  it("ігнорує undefined як JSON", () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
  });
});

describe("splitParticipant / joinParticipant", () => {
  it("round-trip повертає того самого учасника", () => {
    const p = richParticipant();

    const stored = splitParticipant(p, { orderIndex: 3, isPending: false });

    expect(joinParticipant(stored, p.basicInfo.battleId)).toEqual(p);
  });

  it("гарячі поля — у колонках", () => {
    const stored = splitParticipant(richParticipant(), { orderIndex: 3, isPending: true });

    expect(stored.columns).toMatchObject({
      id: "p1",
      orderIndex: 3,
      isPending: true,
      extraTurnOf: null,
      currentHp: 7,
      tempHp: 3,
      morale: -1,
      status: "unconscious",
      initiative: 10,
      hasUsedAction: true,
      hasUsedReaction: true,
    });
  });

  it("поточні слоти і ефекти — у state, максимум слотів — у snapshot", () => {
    const stored = splitParticipant(richParticipant(), { orderIndex: 0, isPending: false });

    expect(stored.state.spellSlotsCurrent).toEqual({ "1": 1, "2": 2 });
    expect(stored.state.activeEffects).toHaveLength(1);
    expect(stableStringify(stored.snapshot)).not.toContain('"current"');
    expect(stableStringify(stored.snapshot)).not.toContain('"activeEffects"');
  });

  it("зміна лише HP не змінює snapshotHash", () => {
    const p = richParticipant();

    const a = splitParticipant(p, { orderIndex: 0, isPending: false });

    const b = splitParticipant(
      { ...p, combatStats: { ...p.combatStats, currentHp: 1 } },
      { orderIndex: 0, isPending: false },
    );

    expect(b.snapshotHash).toBe(a.snapshotHash);
  });

  it("бафф AC змінює snapshotHash", () => {
    const p = richParticipant();

    const a = splitParticipant(p, { orderIndex: 0, isPending: false });

    const b = splitParticipant(
      { ...p, combatStats: { ...p.combatStats, armorClass: p.combatStats.armorClass + 2 } },
      { orderIndex: 0, isPending: false },
    );

    expect(b.snapshotHash).not.toBe(a.snapshotHash);
  });

  it("pendingScopedArtifactBonuses не зберігається", () => {
    const p = richParticipant();

    p.battleData.pendingScopedArtifactBonuses = [{} as never];

    const stored = splitParticipant(p, { orderIndex: 0, isPending: false });

    expect(stableStringify(stored.snapshot)).not.toContain("pendingScopedArtifactBonuses");
  });
});
```

- [ ] **Step 2: Запустити — FAIL**

Run: `pnpm test:run lib/utils/battle/store/__tests__/split-participant.test.ts`
Expected: FAIL — `Cannot find package '@/lib/utils/battle/store/split-participant'`.

- [ ] **Step 3: Реалізація**

`lib/utils/battle/store/types.ts` — вміст з блоку Interfaces вище.

`lib/utils/battle/store/stable-json.ts`:
```ts
import { createHash } from "node:crypto";

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
        .map((k) => [k, normalize((value as Record<string, unknown>)[k])]),
    );
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function hashJson(value: unknown): string {
  return createHash("sha1").update(stableStringify(value)).digest("hex");
}
```

`lib/utils/battle/store/split-participant.ts`:
```ts
import { hashJson } from "./stable-json";
import type { ParticipantSnapshot, ParticipantState, StoredParticipant } from "./types";

import type { BattleParticipant } from "@/types/battle";

export function splitParticipant(
  p: BattleParticipant,
  place: { orderIndex: number; isPending: boolean },
): StoredParticipant {
  const { id, sourceType, sourceId, side, controlledBy, battleId: _battleId, ...basicRest } = p.basicInfo;

  const { initiative, ...abilitiesRest } = p.abilities;

  const { currentHp, tempHp, maxHp, morale, status, ...combatRest } = p.combatStats;

  const {
    activeEffects,
    skillUsageCounts,
    pendingExtraActions,
    pendingScopedArtifactBonuses: _scoped,
    ...battleDataRest
  } = p.battleData;

  const spellSlotsCurrent: Record<string, number> = {};

  const spellSlotsMax: Record<string, { max: number }> = {};

  for (const [level, slot] of Object.entries(p.spellcasting.spellSlots ?? {})) {
    spellSlotsCurrent[level] = slot.current;
    spellSlotsMax[level] = { max: slot.max };
  }

  const snapshot: ParticipantSnapshot = {
    basicInfo: basicRest,
    abilities: abilitiesRest,
    combatStats: combatRest,
    spellcasting: { ...p.spellcasting, spellSlots: spellSlotsMax },
    battleData: battleDataRest,
  };

  const state: ParticipantState = {
    activeEffects: activeEffects ?? [],
    skillUsageCounts,
    pendingExtraActions,
    spellSlotsCurrent,
  };

  return {
    columns: {
      id,
      sourceType,
      sourceId,
      side,
      controlledBy,
      orderIndex: place.orderIndex,
      isPending: place.isPending,
      extraTurnOf: null,
      currentHp,
      tempHp,
      maxHp,
      morale,
      status,
      initiative,
      hasUsedAction: p.actionFlags.hasUsedAction,
      hasUsedBonusAction: p.actionFlags.hasUsedBonusAction,
      hasUsedReaction: p.actionFlags.hasUsedReaction,
      hasExtraTurn: p.actionFlags.hasExtraTurn,
    },
    snapshot,
    state,
    snapshotHash: hashJson(snapshot),
  };
}

export function joinParticipant(stored: StoredParticipant, battleId: string): BattleParticipant {
  const { columns: c, state } = stored;

  const s = stored.snapshot as {
    basicInfo: Record<string, unknown>;
    abilities: Record<string, unknown>;
    combatStats: Record<string, unknown>;
    spellcasting: Record<string, unknown> & { spellSlots?: Record<string, { max: number }> };
    battleData: Record<string, unknown>;
  };

  const spellSlots: Record<string, { max: number; current: number }> = {};

  for (const [level, slot] of Object.entries(s.spellcasting.spellSlots ?? {})) {
    spellSlots[level] = { max: slot.max, current: state.spellSlotsCurrent[level] ?? slot.max };
  }

  return {
    basicInfo: {
      ...s.basicInfo,
      id: c.id,
      battleId,
      sourceId: c.sourceId,
      sourceType: c.sourceType,
      side: c.side,
      controlledBy: c.controlledBy,
    },
    abilities: { ...s.abilities, initiative: c.initiative },
    combatStats: {
      ...s.combatStats,
      currentHp: c.currentHp,
      tempHp: c.tempHp,
      maxHp: c.maxHp,
      morale: c.morale,
      status: c.status,
    },
    spellcasting: { ...s.spellcasting, spellSlots },
    battleData: {
      ...s.battleData,
      activeEffects: state.activeEffects,
      ...(state.skillUsageCounts !== undefined && { skillUsageCounts: state.skillUsageCounts }),
      ...(state.pendingExtraActions !== undefined && { pendingExtraActions: state.pendingExtraActions }),
    },
    actionFlags: {
      hasUsedAction: c.hasUsedAction,
      hasUsedBonusAction: c.hasUsedBonusAction,
      hasUsedReaction: c.hasUsedReaction,
      hasExtraTurn: c.hasExtraTurn,
    },
  } as BattleParticipant;
}
```
`_battleId`/`_scoped` — навмисно відкинуті; якщо ESLint скаржиться на unused vars із префіксом `_`, додати їх у `argsIgnorePattern`/`varsIgnorePattern` не можна без зміни конфігу — тоді замінити деструктуризацію на `const { pendingScopedArtifactBonuses, ...rest }` + `void pendingScopedArtifactBonuses;`.

- [ ] **Step 4: Запустити — PASS**

Run: `pnpm test:run lib/utils/battle/store/__tests__/split-participant.test.ts && pnpm lint lib/utils/battle/store && npx tsc --noEmit -p .`
Expected: усі PASS; lint і tsc чисті.

- [ ] **Step 5: Коміт**

```bash
git add lib/utils/battle/store
git commit -m "feat(battle-store): split/join participant into columns, snapshot and state"
```

---

### Task 4: Дифф учасників і стан знімка

**Files:**
- Create: `lib/utils/battle/store/diff-participants.ts`, `snapshot-state.ts`
- Create: `lib/utils/battle/store/__tests__/diff-participants.test.ts`, `snapshot-state.test.ts`

**Interfaces:**
- Consumes: `StoredParticipant`, `BattleSceneState` (Task 3), `stableStringify`.
- Produces:
  - `diffParticipants(before: StoredParticipant[], after: StoredParticipant[]): { created: StoredParticipant[]; updated: Array<{ next: StoredParticipant; columnsChanged: boolean; stateChanged: boolean; snapshotChanged: boolean }>; removed: StoredParticipant[] }` — незмінені учасники не потрапляють в `updated`.
  - `type SnapshotState = { scene: Pick<BattleSceneState, "round" | "turnIndex" | "status" | "pendingMoraleCheck">; participants: Array<{ columns: ParticipantColumns; state: ParticipantState }>; changedSnapshots?: Record<string, ParticipantSnapshot>; removed?: StoredParticipant[] }`
  - `buildSnapshotState(scene: BattleSceneState, before: StoredParticipant[], diff: ReturnType<typeof diffParticipants>): SnapshotState`

- [ ] **Step 1: Тести**

`diff-participants.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { diffParticipants } from "@/lib/utils/battle/store/diff-participants";
import { splitParticipant } from "@/lib/utils/battle/store/split-participant";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const at = (i: number) => ({ orderIndex: i, isPending: false });

const a = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "a" } });

const b = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "b" } });

describe("diffParticipants", () => {
  it("нічого не змінилось — порожній дифф", () => {
    const before = [splitParticipant(a, at(0)), splitParticipant(b, at(1))];

    const after = [splitParticipant(a, at(0)), splitParticipant(b, at(1))];

    expect(diffParticipants(before, after)).toEqual({ created: [], updated: [], removed: [] });
  });

  it("змінилось HP одного — один update лише колонок", () => {
    const before = [splitParticipant(a, at(0)), splitParticipant(b, at(1))];

    const hurt = { ...b, combatStats: { ...b.combatStats, currentHp: 3 } };

    const diff = diffParticipants(before, [splitParticipant(a, at(0)), splitParticipant(hurt, at(1))]);

    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0]).toMatchObject({ columnsChanged: true, stateChanged: false, snapshotChanged: false });
    expect(diff.updated[0].next.columns.id).toBe("b");
  });

  it("новий ефект — stateChanged", () => {
    const before = [splitParticipant(a, at(0))];

    const poisoned = { ...a, battleData: { ...a.battleData, activeEffects: [{ id: "e" } as never] } };

    const diff = diffParticipants(before, [splitParticipant(poisoned, at(0))]);

    expect(diff.updated[0]).toMatchObject({ columnsChanged: false, stateChanged: true, snapshotChanged: false });
  });

  it("зміна порядку — columnsChanged через orderIndex", () => {
    const before = [splitParticipant(a, at(0)), splitParticipant(b, at(1))];

    const diff = diffParticipants(before, [splitParticipant(b, at(0)), splitParticipant(a, at(1))]);

    expect(diff.updated.map((u) => u.next.columns.id).sort()).toEqual(["a", "b"]);
  });

  it("доданий і видалений", () => {
    const before = [splitParticipant(a, at(0))];

    const diff = diffParticipants(before, [splitParticipant(b, at(0))]);

    expect(diff.created.map((p) => p.columns.id)).toEqual(["b"]);
    expect(diff.removed.map((p) => p.columns.id)).toEqual(["a"]);
  });
});
```

`snapshot-state.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { diffParticipants } from "@/lib/utils/battle/store/diff-participants";
import { buildSnapshotState } from "@/lib/utils/battle/store/snapshot-state";
import { splitParticipant } from "@/lib/utils/battle/store/split-participant";
import type { BattleSceneState } from "@/lib/utils/battle/store/types";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const scene: BattleSceneState = {
  id: "b1",
  campaignId: "c1",
  status: "active",
  round: 2,
  turnIndex: 1,
  version: 5,
  eventSeq: 9,
  pendingMoraleCheck: null,
  startedAt: null,
  completedAt: null,
};

describe("buildSnapshotState", () => {
  it("зберігає сцену і гарячий стан усіх учасників ДО дії, без важкого snapshot", () => {
    const p = createMockParticipant();

    const before = [splitParticipant(p, { orderIndex: 0, isPending: false })];

    const state = buildSnapshotState(scene, before, diffParticipants(before, before));

    expect(state.scene).toEqual({ round: 2, turnIndex: 1, status: "active", pendingMoraleCheck: null });
    expect(state.participants).toHaveLength(1);
    expect(state.participants[0]).not.toHaveProperty("snapshot");
    expect(state.changedSnapshots).toBeUndefined();
    expect(state.removed).toBeUndefined();
  });

  it("якщо дія змінила snapshot — кладе СТАРИЙ snapshot; видалених — повністю", () => {
    const p = createMockParticipant();

    const q = createMockParticipant({ basicInfo: { ...p.basicInfo, id: "q" } });

    const before = [splitParticipant(p, { orderIndex: 0, isPending: false }), splitParticipant(q, { orderIndex: 1, isPending: false })];

    const buffed = { ...p, combatStats: { ...p.combatStats, armorClass: 99 } };

    const after = [splitParticipant(buffed, { orderIndex: 0, isPending: false })];

    const state = buildSnapshotState(scene, before, diffParticipants(before, after));

    expect(state.changedSnapshots?.p1).toEqual(before[0].snapshot);
    expect(state.removed?.map((r) => r.columns.id)).toEqual(["q"]);
  });
});
```

- [ ] **Step 2: Запустити — FAIL**

Run: `pnpm test:run lib/utils/battle/store/__tests__/diff-participants.test.ts lib/utils/battle/store/__tests__/snapshot-state.test.ts`
Expected: FAIL — модулі не знайдено.

- [ ] **Step 3: Реалізація**

`diff-participants.ts`:
```ts
import { stableStringify } from "./stable-json";
import type { ParticipantColumns, StoredParticipant } from "./types";

export interface ParticipantUpdate {
  next: StoredParticipant;
  columnsChanged: boolean;
  stateChanged: boolean;
  snapshotChanged: boolean;
}

export interface ParticipantsDiff {
  created: StoredParticipant[];
  updated: ParticipantUpdate[];
  removed: StoredParticipant[];
}

function sameColumns(a: ParticipantColumns, b: ParticipantColumns): boolean {
  return (Object.keys(a) as Array<keyof ParticipantColumns>).every((k) => a[k] === b[k]);
}

export function diffParticipants(before: StoredParticipant[], after: StoredParticipant[]): ParticipantsDiff {
  const prev = new Map(before.map((p) => [p.columns.id, p]));

  const nextIds = new Set(after.map((p) => p.columns.id));

  const created: StoredParticipant[] = [];

  const updated: ParticipantUpdate[] = [];

  for (const next of after) {
    const old = prev.get(next.columns.id);

    if (!old) {
      created.push(next);
      continue;
    }

    const columnsChanged = !sameColumns(old.columns, next.columns);

    const stateChanged = stableStringify(old.state) !== stableStringify(next.state);

    const snapshotChanged = old.snapshotHash !== next.snapshotHash;

    if (columnsChanged || stateChanged || snapshotChanged) {
      updated.push({ next, columnsChanged, stateChanged, snapshotChanged });
    }
  }

  const removed = before.filter((p) => !nextIds.has(p.columns.id));

  return { created, updated, removed };
}
```

`snapshot-state.ts`:
```ts
import type { ParticipantsDiff } from "./diff-participants";
import type {
  BattleSceneState,
  ParticipantColumns,
  ParticipantSnapshot,
  ParticipantState,
  StoredParticipant,
} from "./types";

export interface SnapshotState {
  scene: Pick<BattleSceneState, "round" | "turnIndex" | "status" | "pendingMoraleCheck">;
  participants: Array<{ columns: ParticipantColumns; state: ParticipantState }>;
  changedSnapshots?: Record<string, ParticipantSnapshot>;
  removed?: StoredParticipant[];
}

export function buildSnapshotState(
  scene: BattleSceneState,
  before: StoredParticipant[],
  diff: ParticipantsDiff,
): SnapshotState {
  const prev = new Map(before.map((p) => [p.columns.id, p]));

  const changed = diff.updated.filter((u) => u.snapshotChanged);

  const result: SnapshotState = {
    scene: {
      round: scene.round,
      turnIndex: scene.turnIndex,
      status: scene.status,
      pendingMoraleCheck: scene.pendingMoraleCheck,
    },
    participants: before.map((p) => ({ columns: p.columns, state: p.state })),
  };

  if (changed.length > 0) {
    result.changedSnapshots = Object.fromEntries(
      changed.map((u) => [u.next.columns.id, prev.get(u.next.columns.id)!.snapshot]),
    );
  }

  if (diff.removed.length > 0) result.removed = diff.removed;

  return result;
}
```

- [ ] **Step 4: Запустити — PASS**

Run: `pnpm test:run lib/utils/battle/store && pnpm lint lib/utils/battle/store`
Expected: усі PASS; lint чистий.

- [ ] **Step 5: Коміт**

```bash
git add lib/utils/battle/store
git commit -m "feat(battle-store): participant diff and rollback snapshot state"
```

---

### Task 5: Помилки сховища

**Files:**
- Create: `lib/utils/battle/store/errors.ts`
- Create: `lib/utils/battle/store/__tests__/errors.test.ts`

**Interfaces:**
- Produces:
  - `class BattleConflictError extends Error { readonly currentVersion?: number }`
  - `class BattleAccessError extends Error { readonly status: 401 | 403 | 404 }`
  - `type BattleRuleCode = "not_your_turn" | "wrong_status" | "participant_dead" | "invalid_dice" | "action_used" | "invalid_target"`
  - `class BattleRuleError extends Error { readonly code: BattleRuleCode }`

- [ ] **Step 1: Тест**

```ts
import { describe, expect, it } from "vitest";

import { BattleAccessError, BattleConflictError, BattleRuleError } from "@/lib/utils/battle/store/errors";

describe("battle store errors", () => {
  it("несуть дані для HTTP-відповіді і розрізняються через instanceof", () => {
    const conflict = new BattleConflictError(7);

    const access = new BattleAccessError(403, "Не учасник кампанії");

    const rule = new BattleRuleError("not_your_turn", "Зараз не ваш хід");

    expect(conflict).toBeInstanceOf(BattleConflictError);
    expect(conflict.currentVersion).toBe(7);
    expect(access.status).toBe(403);
    expect(rule.code).toBe("not_your_turn");
    expect(rule).not.toBeInstanceOf(BattleAccessError);
  });
});
```

- [ ] **Step 2: Запустити — FAIL**

Run: `pnpm test:run lib/utils/battle/store/__tests__/errors.test.ts`
Expected: FAIL — модуль не знайдено.

- [ ] **Step 3: Реалізація**

```ts
export class BattleConflictError extends Error {
  constructor(readonly currentVersion?: number) {
    super("Стан бою змінився");
    this.name = "BattleConflictError";
  }
}

export class BattleAccessError extends Error {
  constructor(
    readonly status: 401 | 403 | 404,
    message: string,
  ) {
    super(message);
    this.name = "BattleAccessError";
  }
}

export type BattleRuleCode =
  | "not_your_turn"
  | "wrong_status"
  | "participant_dead"
  | "invalid_dice"
  | "action_used"
  | "invalid_target";

export class BattleRuleError extends Error {
  constructor(
    readonly code: BattleRuleCode,
    message: string,
  ) {
    super(message);
    this.name = "BattleRuleError";
  }
}
```

- [ ] **Step 4: Запустити — PASS, коміт**

Run: `pnpm test:run lib/utils/battle/store/__tests__/errors.test.ts`
Expected: PASS.
```bash
git add lib/utils/battle/store/errors.ts lib/utils/battle/store/__tests__/errors.test.ts
git commit -m "feat(battle-store): typed conflict, access and rule errors"
```

---

### Task 6: `loadBattle` і `saveBattle`

**Files:**
- Create: `lib/utils/battle/store/load-battle.ts`, `save-battle.ts`, `index.ts`
- Create: `tests/integration/battle-store.integration.test.ts`

**Interfaces:**
- Consumes: усе з Tasks 1, 3, 4, 5; `prisma` з `@/lib/db`.
- Produces:
  - `type BattleDb = Pick<PrismaClient, "battleScene" | "battleParticipant" | "battleEvent" | "battleSnapshot" | "$transaction">`
  - `loadBattle(db: BattleDb, args: { battleId: string; campaignId: string; userId: string }): Promise<(LoadedBattle & { isMember: boolean }) | null>` — `null`, якщо бою з таким `campaignId` немає.
  - `saveBattle(db: BattleDb, before: LoadedBattle, outcome: BattleMutationOutcome): Promise<BattleDelta>` — кидає `BattleConflictError`, якщо версія змінилась.
  - `lib/utils/battle/store/index.ts` реекспортує все з `types`, `errors`, `split-participant`, `diff-participants`, `snapshot-state`, `load-battle`, `save-battle`.

- [ ] **Step 1: Інтеграційний тест**

`tests/integration/battle-store.integration.test.ts`:
```ts
/**
 * Пише в БД — лише локальна Docker-БД (pnpm db:local). На будь-якому іншому хості — skip.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { BattleConflictError, loadBattle, saveBattle } from "@/lib/utils/battle/store";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const url = process.env.DATABASE_URL ?? "";

const isLocal = /@(localhost|127\.0\.0\.1):/.test(url);

const ids = { user: "it-user", dm: "it-dm", campaign: "it-campaign", battle: "it-battle" };

const hero = createMockParticipant({
  basicInfo: { ...createMockParticipant().basicInfo, id: "hero", battleId: ids.battle, controlledBy: ids.user },
});

const goblin = createMockParticipant({
  basicInfo: { ...createMockParticipant().basicInfo, id: "gob", battleId: ids.battle, side: "enemy", controlledBy: "dm" },
});

async function cleanup() {
  await prisma.battleScene.deleteMany({ where: { id: ids.battle } });
  await prisma.campaign.deleteMany({ where: { id: ids.campaign } });
  await prisma.user.deleteMany({ where: { id: { in: [ids.user, ids.dm] } } });
}

describe.skipIf(!isLocal)("battle store (local DB)", () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.user.createMany({
      data: [
        { id: ids.user, email: "it-user@x.test", displayName: "Гравець" },
        { id: ids.dm, email: "it-dm@x.test", displayName: "DM" },
      ],
    });
    await prisma.campaign.create({
      data: {
        id: ids.campaign,
        name: "IT",
        inviteCode: "it-code",
        dmUserId: ids.dm,
        members: {
          create: [
            { userId: ids.user, role: "player" },
            { userId: ids.dm, role: "dm" },
          ],
        },
      },
    });
    await prisma.battleScene.create({
      data: { id: ids.battle, campaignId: ids.campaign, name: "Бій", status: "active" },
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("порожній бій завантажується; DM визначається з членства", async () => {
    const asDm = await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm });

    expect(asDm?.isDM).toBe(true);
    expect(asDm?.participants).toEqual([]);
    expect(asDm?.scene.version).toBe(0);

    const asPlayer = await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.user });

    expect(asPlayer?.isDM).toBe(false);
    expect(asPlayer?.isMember).toBe(true);

    expect(await loadBattle(prisma, { battleId: ids.battle, campaignId: "other", userId: ids.dm })).toBeNull();
  });

  it("збереження створює учасників, подію і знімок; версія +1", async () => {
    const before = (await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm }))!;

    const delta = await saveBattle(prisma, before, {
      participants: [hero, goblin],
      pending: [],
      events: [{ type: "start", round: 1, resultText: "Бій почався" }],
    });

    expect(delta.version).toBe(1);
    expect(delta.upserted.map((p) => p.basicInfo.id).sort()).toEqual(["gob", "hero"]);
    expect(delta.events[0].seq).toBe(1);

    const after = (await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm }))!;

    expect(after.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "gob"]);
    expect(after.participants[0]).toEqual(hero);
    expect(after.scene.eventSeq).toBe(1);
    expect(await prisma.battleSnapshot.count({ where: { battleId: ids.battle } })).toBe(1);
  });

  it("зміна HP одного учасника — у дельті лише він", async () => {
    const before = (await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm }))!;

    const hurt = { ...before.participants[1], combatStats: { ...before.participants[1].combatStats, currentHp: 2 } };

    const delta = await saveBattle(prisma, before, {
      participants: [before.participants[0], hurt],
      pending: [],
      events: [{ type: "attack", round: 1, actorId: "hero", resultText: "Удар" }],
    });

    expect(delta.upserted.map((p) => p.basicInfo.id)).toEqual(["gob"]);
    expect(delta.removed).toEqual([]);
  });

  it("два збереження з однієї версії — друге отримує конфлікт", async () => {
    const before = (await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm }))!;

    const outcome = { participants: before.participants, pending: [], events: [] };

    await saveBattle(prisma, before, outcome);

    await expect(saveBattle(prisma, before, outcome)).rejects.toBeInstanceOf(BattleConflictError);
  });

  it("pendingMoraleCheck: null записується як SQL NULL", async () => {
    const before = (await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm }))!;

    await saveBattle(prisma, before, {
      scene: { pendingMoraleCheck: { participantId: "hero", d10Roll: 5 } },
      participants: before.participants,
      pending: [],
      events: [],
    });

    const mid = (await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm }))!;

    await saveBattle(prisma, mid, { scene: { pendingMoraleCheck: null }, participants: mid.participants, pending: [], events: [] });

    const rows = await prisma.$queryRaw<Array<{ isnull: boolean }>>`
      SELECT "pendingMoraleCheck" IS NULL AS isnull FROM battle_scenes WHERE id = ${ids.battle}
    `;

    expect(rows[0].isnull).toBe(true);
  });

  it("дія без подій: версія росте, eventSeq і кількість знімків — ні", async () => {
    const before = (await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm }))!;

    const snapshots = await prisma.battleSnapshot.count({ where: { battleId: ids.battle } });

    const delta = await saveBattle(prisma, before, { participants: before.participants, pending: [], events: [] });

    const after = (await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm }))!;

    expect(delta.version).toBe(before.scene.version + 1);
    expect(after.scene.eventSeq).toBe(before.scene.eventSeq);
    expect(await prisma.battleSnapshot.count({ where: { battleId: ids.battle } })).toBe(snapshots);
  });

  it("учасник у pending завантажується окремо", async () => {
    const before = (await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm }))!;

    const summon = createMockParticipant({ basicInfo: { ...hero.basicInfo, id: "wolf", controlledBy: ids.user } });

    await saveBattle(prisma, before, { participants: before.participants, pending: [summon], events: [] });

    const after = (await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm }))!;

    expect(after.pending.map((p) => p.basicInfo.id)).toEqual(["wolf"]);
    expect(after.participants.map((p) => p.basicInfo.id)).not.toContain("wolf");
  });
});
```

- [ ] **Step 2: Запустити — FAIL**

Run: `pnpm db:local && pnpm test:integration tests/integration/battle-store.integration.test.ts`
Expected: FAIL — `loadBattle`/`saveBattle` не експортуються з `@/lib/utils/battle/store`.

Перевірити захист від проду: `DATABASE_URL=postgresql://u:p@db.example.com:5432/x pnpm test:integration tests/integration/battle-store.integration.test.ts`
Expected: suite `skipped`, жодного підключення.

- [ ] **Step 3: Реалізація**

`load-battle.ts`:
```ts
import type { PrismaClient } from "@prisma/client";

import { joinParticipant } from "./split-participant";
import type { BattleSceneState, BattleStatus, LoadedBattle, ParticipantColumns, ParticipantSnapshot, ParticipantState } from "./types";

import type { BattleParticipant } from "@/types/battle";

export type BattleDb = Pick<
  PrismaClient,
  "battleScene" | "battleParticipant" | "battleEvent" | "battleSnapshot" | "$transaction"
>;

type ParticipantRow = ParticipantColumns & {
  battleId: string;
  snapshot: unknown;
  state: unknown;
  snapshotHash: string;
};

export function rowToParticipant(row: ParticipantRow): BattleParticipant {
  const { battleId, snapshot, state, snapshotHash, ...columns } = row;

  return joinParticipant(
    {
      columns,
      snapshot: snapshot as ParticipantSnapshot,
      state: state as ParticipantState,
      snapshotHash,
    },
    battleId,
  );
}

export async function loadBattle(
  db: BattleDb,
  args: { battleId: string; campaignId: string; userId: string },
): Promise<(LoadedBattle & { isMember: boolean }) | null> {
  const row = await db.battleScene.findFirst({
    where: { id: args.battleId, campaignId: args.campaignId },
    include: {
      battleParticipants: { orderBy: { orderIndex: "asc" } },
      campaign: { select: { members: { where: { userId: args.userId }, select: { role: true } } } },
    },
  });

  if (!row) return null;

  const scene: BattleSceneState = {
    id: row.id,
    campaignId: row.campaignId,
    status: row.status as BattleStatus,
    round: row.currentRound,
    turnIndex: row.currentTurnIndex,
    version: row.version,
    eventSeq: row.eventSeq,
    pendingMoraleCheck: row.pendingMoraleCheck ?? null,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };

  const membership = row.campaign.members[0];

  const all = row.battleParticipants.map((p) => ({ isPending: p.isPending, participant: rowToParticipant(p) }));

  return {
    scene,
    participants: all.filter((p) => !p.isPending).map((p) => p.participant),
    pending: all.filter((p) => p.isPending).map((p) => p.participant),
    isDM: membership?.role === "dm",
    isMember: Boolean(membership),
  };
}
```

`save-battle.ts`:
```ts
import { Prisma } from "@prisma/client";

import { diffParticipants } from "./diff-participants";
import { BattleConflictError } from "./errors";
import type { BattleDb } from "./load-battle";
import { buildSnapshotState } from "./snapshot-state";
import { joinParticipant, splitParticipant } from "./split-participant";
import type { BattleDelta, BattleMutationOutcome, LoadedBattle, StoredBattleEvent, StoredParticipant } from "./types";

import type { BattleParticipant } from "@/types/battle";

function toStored(participants: BattleParticipant[], pending: BattleParticipant[]): StoredParticipant[] {
  return [
    ...participants.map((p, i) => splitParticipant(p, { orderIndex: i, isPending: false })),
    ...pending.map((p, i) => splitParticipant(p, { orderIndex: i, isPending: true })),
  ];
}

function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

export async function saveBattle(
  db: BattleDb,
  before: LoadedBattle,
  outcome: BattleMutationOutcome,
): Promise<BattleDelta> {
  const { scene } = before;

  const patch = outcome.scene ?? {};

  const beforeStored = toStored(before.participants, before.pending);

  const afterStored = toStored(outcome.participants, outcome.pending);

  const diff = diffParticipants(beforeStored, afterStored);

  const firstSeq = scene.eventSeq + 1;

  const events: StoredBattleEvent[] = outcome.events.map((e, i) => ({
    seq: firstSeq + i,
    type: e.type,
    round: e.round,
    actorId: e.actorId ?? null,
    targets: e.targets ?? [],
    details: e.details ?? {},
    hpChanges: e.hpChanges ?? [],
    resultText: e.resultText,
  }));

  const nextScene = { ...scene, ...patch };

  await db.$transaction(async (tx) => {
    const { count } = await tx.battleScene.updateMany({
      where: { id: scene.id, version: scene.version },
      data: {
        version: { increment: 1 },
        eventSeq: scene.eventSeq + events.length,
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.round !== undefined && { currentRound: patch.round }),
        ...(patch.turnIndex !== undefined && { currentTurnIndex: patch.turnIndex }),
        ...(patch.pendingMoraleCheck !== undefined && { pendingMoraleCheck: jsonOrNull(patch.pendingMoraleCheck) }),
        ...(patch.startedAt !== undefined && { startedAt: patch.startedAt }),
        ...(patch.completedAt !== undefined && { completedAt: patch.completedAt }),
      },
    });

    if (count === 0) throw new BattleConflictError();

    if (diff.created.length > 0) {
      await tx.battleParticipant.createMany({
        data: diff.created.map((p) => ({
          ...p.columns,
          battleId: scene.id,
          snapshot: p.snapshot as Prisma.InputJsonValue,
          state: p.state as unknown as Prisma.InputJsonValue,
          snapshotHash: p.snapshotHash,
        })),
      });
    }

    if (diff.removed.length > 0) {
      await tx.battleParticipant.deleteMany({
        where: { battleId: scene.id, id: { in: diff.removed.map((p) => p.columns.id) } },
      });
    }

    for (const u of diff.updated) {
      const { id, ...columns } = u.next.columns;

      await tx.battleParticipant.update({
        where: { id },
        data: {
          ...(u.columnsChanged && columns),
          ...(u.stateChanged && { state: u.next.state as unknown as Prisma.InputJsonValue }),
          ...(u.snapshotChanged && {
            snapshot: u.next.snapshot as Prisma.InputJsonValue,
            snapshotHash: u.next.snapshotHash,
          }),
        },
      });
    }

    if (events.length > 0) {
      await tx.battleSnapshot.create({
        data: {
          battleId: scene.id,
          seq: firstSeq,
          state: buildSnapshotState(scene, beforeStored, diff) as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.battleEvent.createMany({
        data: events.map((e) => ({
          ...e,
          battleId: scene.id,
          targets: e.targets as Prisma.InputJsonValue,
          details: e.details as Prisma.InputJsonValue,
          hpChanges: e.hpChanges as Prisma.InputJsonValue,
        })),
      });
    }
  });

  return {
    battleId: scene.id,
    version: scene.version + 1,
    scene: {
      status: nextScene.status,
      round: nextScene.round,
      turnIndex: nextScene.turnIndex,
      pendingMoraleCheck: nextScene.pendingMoraleCheck,
    },
    upserted: [...diff.created, ...diff.updated.map((u) => u.next)].map((p) => joinParticipant(p, scene.id)),
    removed: diff.removed.map((p) => p.columns.id),
    events,
  };
}
```

`index.ts`:
```ts
export * from "./diff-participants";
export * from "./errors";
export * from "./load-battle";
export * from "./save-battle";
export * from "./snapshot-state";
export * from "./split-participant";
export * from "./types";
```

- [ ] **Step 4: Запустити — PASS**

```bash
pnpm test:integration tests/integration/battle-store.integration.test.ts
pnpm test:run lib/utils/battle/store
npx tsc --noEmit -p . && pnpm lint lib/utils/battle/store tests/integration
```
Expected: 7 інтеграційних PASS; юніт-тести PASS; tsc і lint чисті.

- [ ] **Step 5: Коміт**

```bash
git add lib/utils/battle/store tests/integration/battle-store.integration.test.ts
git commit -m "feat(battle-store): load and save battle with optimistic lock, events and rollback snapshots"
```

---

### Task 7: Пайплайн `runBattleMutation`

**Files:**
- Create: `lib/utils/battle/pipeline/run-battle-mutation.ts`, `default-deps.ts`, `to-api-battle.ts`
- Create: `lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts`

**Interfaces:**
- Consumes: `loadBattle`, `saveBattle`, errors, types (Tasks 3–6); `checkVictoryConditions`, `completeBattle` з `@/lib/utils/battle/battle-victory`; `checkRateLimit`, `BATTLE_RATE_LIMITS`, `rateLimitResponse` з `@/lib/utils/api/rate-limit`; `battleChannelName` з `@/lib/pusher-channels`.
- Produces:
```ts
export type BattleAccess = "dm" | "turnController" | "member";

export interface BattleMutationContext {
  scene: BattleSceneState;
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  userId: string;
  isDM: boolean;
}

export interface MutationResult extends BattleMutationOutcome {
  response?: Record<string, unknown>;
}

export interface PipelineDeps {
  getUserId(): Promise<string | null>;
  rateLimit(input: { userId: string; scope: keyof typeof BATTLE_RATE_LIMITS; battleId: string }): Promise<RateLimitResult>;
  loadBattle(args: { battleId: string; campaignId: string; userId: string }): Promise<(LoadedBattle & { isMember: boolean }) | null>;
  saveBattle(before: LoadedBattle, outcome: BattleMutationOutcome): Promise<BattleDelta>;
  publish(battleId: string, payload: BattleDelta | { battleId: string; version: number; refetch: true }): void;
}

export interface RunBattleMutationOptions<TBody> {
  params: { id: string; battleId: string };
  access: BattleAccess;
  requireStatus?: BattleStatus | BattleStatus[];
  schema?: ZodType<TBody>;
  rateLimitScope?: keyof typeof BATTLE_RATE_LIMITS;
  mutate(ctx: BattleMutationContext, body: TBody): MutationResult | Promise<MutationResult>;
}

export async function runBattleMutation<TBody>(
  req: Request,
  options: RunBattleMutationOptions<TBody>,
  deps?: PipelineDeps,
): Promise<NextResponse>;

export const PUSHER_DELTA_LIMIT_BYTES = 9_500;
```
- `toApiBattle(scene: BattleSceneState, participants: BattleParticipant[], pending: BattleParticipant[]): Pick<BattleScene, "id" | "campaignId" | "status" | "currentRound" | "currentTurnIndex" | "initiativeOrder" | "pendingSummons"> & { version: number }`

Тіло відповіді 200: `{ battle: toApiBattle(...), delta, ...result.response }`.

- [ ] **Step 1: Тести**

`lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { PipelineDeps } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { BattleDelta, LoadedBattle } from "@/lib/utils/battle/store";
import { BattleConflictError, BattleRuleError } from "@/lib/utils/battle/store";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const hero = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "hero", controlledBy: "u-player" } });

const goblin = createMockParticipant({
  basicInfo: { ...createMockParticipant().basicInfo, id: "gob", side: "enemy", controlledBy: "dm" },
});

function loaded(over: Partial<LoadedBattle> = {}): LoadedBattle & { isMember: boolean } {
  return {
    scene: {
      id: "b1",
      campaignId: "c1",
      status: "active",
      round: 1,
      turnIndex: 0,
      version: 3,
      eventSeq: 4,
      pendingMoraleCheck: null,
      startedAt: null,
      completedAt: null,
    },
    participants: [hero, goblin],
    pending: [],
    isDM: false,
    isMember: true,
    ...over,
  };
}

function delta(): BattleDelta {
  return {
    battleId: "b1",
    version: 4,
    scene: { status: "active", round: 1, turnIndex: 0, pendingMoraleCheck: null },
    upserted: [],
    removed: [],
    events: [],
  };
}

function deps(over: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    getUserId: vi.fn(async () => "u-player"),
    rateLimit: vi.fn(async () => ({ allowed: true, count: 1, limit: 30, retryAfterSeconds: 10 })),
    loadBattle: vi.fn(async () => loaded()),
    saveBattle: vi.fn(async () => delta()),
    publish: vi.fn(),
    ...over,
  };
}

const params = { id: "c1", battleId: "b1" };

const req = (body: unknown = {}) =>
  new Request("http://x/api", { method: "POST", body: JSON.stringify(body) });

const noop = vi.fn((ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [] }));

describe("runBattleMutation", () => {
  it("без сесії — 401, БД не чіпаємо", async () => {
    const d = deps({ getUserId: vi.fn(async () => null) });

    const res = await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    expect(res.status).toBe(401);
    expect(d.loadBattle).not.toHaveBeenCalled();
  });

  it("немає бою — 404", async () => {
    const res = await runBattleMutation(req(), { params, access: "member", mutate: noop }, deps({ loadBattle: vi.fn(async () => null) }));

    expect(res.status).toBe(404);
  });

  it("не учасник кампанії — 403", async () => {
    const res = await runBattleMutation(
      req(),
      { params, access: "member", mutate: noop },
      deps({ loadBattle: vi.fn(async () => ({ ...loaded(), isMember: false })) }),
    );

    expect(res.status).toBe(403);
  });

  it("dm-дія від гравця — 403", async () => {
    const res = await runBattleMutation(req(), { params, access: "dm", mutate: noop }, deps());

    expect(res.status).toBe(403);
  });

  it("turnController: не твій хід — 422 not_your_turn", async () => {
    const res = await runBattleMutation(
      req(),
      { params, access: "turnController", mutate: noop },
      deps({ loadBattle: vi.fn(async () => loaded({ scene: { ...loaded().scene, turnIndex: 1 } })) }),
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "not_your_turn" });
  });

  it("turnController: твій учасник непритомний — 422 participant_dead", async () => {
    const downed = { ...hero, combatStats: { ...hero.combatStats, status: "unconscious" as const } };

    const res = await runBattleMutation(
      req(),
      { params, access: "turnController", mutate: noop },
      deps({ loadBattle: vi.fn(async () => loaded({ participants: [downed, goblin] })) }),
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "participant_dead" });
  });

  it("невідповідний статус бою — 422 wrong_status", async () => {
    const res = await runBattleMutation(req(), { params, access: "member", requireStatus: "prepared", mutate: noop }, deps());

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "wrong_status" });
  });

  it("невалідне тіло — 400, mutate не викликається", async () => {
    const mutate = vi.fn(noop);

    const res = await runBattleMutation(
      req({ targetId: 5 }),
      { params, access: "member", schema: z.object({ targetId: z.string() }), mutate },
      deps(),
    );

    expect(res.status).toBe(400);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("expectedVersion застаріла — 409 без мутації", async () => {
    const mutate = vi.fn(noop);

    const res = await runBattleMutation(
      req({ expectedVersion: 2 }),
      { params, access: "member", schema: z.object({ expectedVersion: z.number() }), mutate },
      deps(),
    );

    expect(res.status).toBe(409);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("конфлікт при збереженні — 409", async () => {
    const res = await runBattleMutation(
      req(),
      { params, access: "member", mutate: noop },
      deps({ saveBattle: vi.fn(async () => { throw new BattleConflictError(); }) }),
    );

    expect(res.status).toBe(409);
  });

  it("mutate кидає правило — 422, нічого не зберігається і не публікується", async () => {
    const d = deps();

    const res = await runBattleMutation(
      req(),
      {
        params,
        access: "member",
        mutate: () => {
          throw new BattleRuleError("invalid_dice", "Кидок поза межами кубика");
        },
      },
      d,
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "invalid_dice" });
    expect(d.saveBattle).not.toHaveBeenCalled();
    expect(d.publish).not.toHaveBeenCalled();
  });

  it("rate limit — 429", async () => {
    const res = await runBattleMutation(
      req(),
      { params, access: "member", rateLimitScope: "attack", mutate: noop },
      deps({ rateLimit: vi.fn(async () => ({ allowed: false, count: 31, limit: 30, retryAfterSeconds: 4 })) }),
    );

    expect(res.status).toBe(429);
  });

  it("усі вороги впали — бій завершується тим самим збереженням", async () => {
    const d = deps();

    const deadGoblin = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 0, status: "dead" as const } };

    await runBattleMutation(
      req(),
      { params, access: "member", mutate: () => ({ participants: [hero, deadGoblin], pending: [], events: [] }) },
      d,
    );

    const outcome = vi.mocked(d.saveBattle).mock.calls[0][1];

    expect(outcome.scene?.status).toBe("completed");
    expect(outcome.scene?.completedAt).toBeInstanceOf(Date);
    expect(outcome.events.at(-1)?.type).toBe("battle_end");
  });

  it("успіх — 200, відповідь з battle і delta, публікація дельти", async () => {
    const d = deps();

    const res = await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.delta.version).toBe(4);
    expect(json.battle.initiativeOrder).toHaveLength(2);
    expect(d.publish).toHaveBeenCalledWith("b1", expect.objectContaining({ version: 4 }));
  });

  it("завелика дельта — публікується refetch", async () => {
    const big = { ...delta(), upserted: Array.from({ length: 40 }, () => hero) };

    const d = deps({ saveBattle: vi.fn(async () => big) });

    await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    expect(d.publish).toHaveBeenCalledWith("b1", { battleId: "b1", version: 4, refetch: true });
  });
});
```

- [ ] **Step 2: Запустити — FAIL**

Run: `pnpm test:run lib/utils/battle/pipeline`
Expected: FAIL — модуль не знайдено.

- [ ] **Step 3: Реалізація**

`to-api-battle.ts`:
```ts
import type { BattleSceneState } from "@/lib/utils/battle/store";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

export function toApiBattle(scene: BattleSceneState, participants: BattleParticipant[], pending: BattleParticipant[]) {
  return {
    id: scene.id,
    campaignId: scene.campaignId,
    status: scene.status,
    currentRound: scene.round,
    currentTurnIndex: scene.turnIndex,
    initiativeOrder: participants,
    pendingSummons: pending,
    version: scene.version,
  } satisfies Pick<
    BattleScene,
    "id" | "campaignId" | "status" | "currentRound" | "currentTurnIndex" | "initiativeOrder" | "pendingSummons"
  > & { version: number };
}
```

`run-battle-mutation.ts`:
```ts
import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { defaultPipelineDeps } from "./default-deps";
import { toApiBattle } from "./to-api-battle";

import type { BATTLE_RATE_LIMITS, RateLimitResult } from "@/lib/utils/api/rate-limit";
import { rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { checkVictoryConditions, completeBattle } from "@/lib/utils/battle/battle-victory";
import type {
  BattleDelta,
  BattleMutationOutcome,
  BattleSceneState,
  BattleStatus,
  LoadedBattle,
} from "@/lib/utils/battle/store";
import { BattleAccessError, BattleConflictError, BattleRuleError } from "@/lib/utils/battle/store";
import type { BattleParticipant } from "@/types/battle";

export const PUSHER_DELTA_LIMIT_BYTES = 9_500;

export type BattleAccess = "dm" | "turnController" | "member";

export interface BattleMutationContext {
  scene: BattleSceneState;
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  userId: string;
  isDM: boolean;
}

export interface MutationResult extends BattleMutationOutcome {
  response?: Record<string, unknown>;
}

type RefetchPayload = { battleId: string; version: number; refetch: true };

export interface PipelineDeps {
  getUserId(): Promise<string | null>;
  rateLimit(input: { userId: string; scope: keyof typeof BATTLE_RATE_LIMITS; battleId: string }): Promise<RateLimitResult>;
  loadBattle(args: { battleId: string; campaignId: string; userId: string }): Promise<(LoadedBattle & { isMember: boolean }) | null>;
  saveBattle(before: LoadedBattle, outcome: BattleMutationOutcome): Promise<BattleDelta>;
  publish(battleId: string, payload: BattleDelta | RefetchPayload): void;
}

export interface RunBattleMutationOptions<TBody> {
  params: { id: string; battleId: string };
  access: BattleAccess;
  requireStatus?: BattleStatus | BattleStatus[];
  schema?: ZodType<TBody>;
  rateLimitScope?: keyof typeof BATTLE_RATE_LIMITS;
  mutate(ctx: BattleMutationContext, body: TBody): MutationResult | Promise<MutationResult>;
}

function assertAccess(access: BattleAccess, ctx: BattleMutationContext): void {
  if (access === "member" || ctx.isDM) return;

  if (access === "dm") throw new BattleAccessError(403, "Лише DM");

  const current = ctx.participants[ctx.scene.turnIndex];

  if (!current || current.basicInfo.controlledBy !== ctx.userId) {
    throw new BattleRuleError("not_your_turn", "Зараз не ваш хід");
  }

  if (current.combatStats.status !== "active") {
    throw new BattleRuleError("participant_dead", "Учасник не може діяти");
  }
}

function withVictory(scene: BattleSceneState, result: MutationResult): MutationResult {
  const status = result.scene?.status ?? scene.status;

  if (status !== "active") return result;

  const victory = checkVictoryConditions(result.participants);

  if (!victory.result) return result;

  const round = result.scene?.round ?? scene.round;

  const { updatedParticipants, battleAction } = completeBattle(result.participants, victory.result, round);

  return {
    ...result,
    participants: updatedParticipants,
    scene: { ...result.scene, status: "completed", completedAt: new Date() },
    events: [
      ...result.events,
      { type: "battle_end", round, resultText: battleAction.resultText, hpChanges: battleAction.hpChanges },
    ],
  };
}

function errorResponse(err: unknown): NextResponse {
  if (err instanceof BattleConflictError) {
    return NextResponse.json({ code: "conflict", error: err.message, version: err.currentVersion }, { status: 409 });
  }

  if (err instanceof BattleAccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  if (err instanceof BattleRuleError) {
    return NextResponse.json({ code: err.code, error: err.message }, { status: 422 });
  }

  console.error("[battle-pipeline] unexpected error", err);

  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

async function readBody<TBody>(req: Request, schema?: ZodType<TBody>) {
  if (!schema) return { ok: true as const, body: undefined as TBody };

  const raw = await req.json().catch(() => undefined);

  const parsed = schema.safeParse(raw);

  return parsed.success
    ? { ok: true as const, body: parsed.data }
    : { ok: false as const, issues: parsed.error.issues };
}

export async function runBattleMutation<TBody>(
  req: Request,
  options: RunBattleMutationOptions<TBody>,
  deps: PipelineDeps = defaultPipelineDeps,
): Promise<NextResponse> {
  try {
    const { id: campaignId, battleId } = options.params;

    const userId = await deps.getUserId();

    if (!userId) throw new BattleAccessError(401, "Unauthorized");

    const [rate, loaded, parsed] = await Promise.all([
      options.rateLimitScope ? deps.rateLimit({ userId, scope: options.rateLimitScope, battleId }) : null,
      deps.loadBattle({ battleId, campaignId, userId }),
      readBody(req, options.schema),
    ]);

    if (rate && !rate.allowed) return rateLimitResponse(rate);

    if (!parsed.ok) {
      return NextResponse.json({ error: "invalid_body", issues: parsed.issues }, { status: 400 });
    }

    if (!loaded) throw new BattleAccessError(404, "Not found");

    if (!loaded.isMember) throw new BattleAccessError(403, "Forbidden");

    const ctx: BattleMutationContext = {
      scene: loaded.scene,
      participants: loaded.participants,
      pending: loaded.pending,
      userId,
      isDM: loaded.isDM,
    };

    assertAccess(options.access, ctx);

    const allowed = options.requireStatus
      ? ([] as BattleStatus[]).concat(options.requireStatus)
      : null;

    if (allowed && !allowed.includes(loaded.scene.status)) {
      throw new BattleRuleError("wrong_status", `Дія недоступна в статусі «${loaded.scene.status}»`);
    }

    const expected = (parsed.body as { expectedVersion?: unknown } | undefined)?.expectedVersion;

    if (typeof expected === "number" && expected !== loaded.scene.version) {
      throw new BattleConflictError(loaded.scene.version);
    }

    const result = withVictory(loaded.scene, await options.mutate(ctx, parsed.body));

    const delta = await deps.saveBattle(loaded, result);

    const nextScene = { ...loaded.scene, ...result.scene, version: delta.version };

    const payload =
      JSON.stringify(delta).length > PUSHER_DELTA_LIMIT_BYTES
        ? { battleId, version: delta.version, refetch: true as const }
        : delta;

    deps.publish(battleId, payload);

    return NextResponse.json({
      battle: toApiBattle(nextScene, result.participants, result.pending),
      delta,
      ...result.response,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
```
Пайплайн не знає про Prisma: `default-deps.ts` прив'язує `prisma` до `loadBattle`/`saveBattle`.

`default-deps.ts`:
```ts
import { after } from "next/server";

import type { PipelineDeps } from "./run-battle-mutation";

import { prisma } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { battleChannelName } from "@/lib/pusher-channels";
import { createClient } from "@/lib/supabase/server";
import { BATTLE_RATE_LIMITS, checkRateLimit } from "@/lib/utils/api/rate-limit";
import { loadBattle, saveBattle } from "@/lib/utils/battle/store";
import { safePusherTrigger } from "@/lib/utils/pusher/safe-trigger";

export const defaultPipelineDeps: PipelineDeps = {
  async getUserId() {
    const supabase = await createClient();

    const { data } = await supabase.auth.getClaims();

    return data?.claims?.sub ?? null;
  },
  rateLimit: ({ userId, scope, battleId }) =>
    checkRateLimit({ userId, scope, battleId, ...BATTLE_RATE_LIMITS[scope] }),
  loadBattle: (args) => loadBattle(prisma, args),
  saveBattle: (before, outcome) => saveBattle(prisma, before, outcome),
  publish(battleId, payload) {
    after(() => {
      safePusherTrigger(pusherServer, battleChannelName(battleId), "battle-delta", payload, {
        action: "battle mutation",
        battleId,
      });
    });
  },
};
```
Якщо `import/no-cycle` спрацює на пару `run-battle-mutation.ts` ↔ `default-deps.ts`, винести `PipelineDeps` і пов'язані типи в `lib/utils/battle/pipeline/types.ts` і імпортувати звідти в обидва файли.

- [ ] **Step 4: Запустити — PASS**

```bash
pnpm test:run lib/utils/battle/pipeline
npx tsc --noEmit -p . && pnpm lint lib/utils/battle/pipeline
```
Expected: 15 PASS; tsc і lint чисті.

- [ ] **Step 5: Повний прогін і коміт**

```bash
pnpm test:run && pnpm build
git add lib/utils/battle/pipeline
git commit -m "feat(battle-pipeline): runBattleMutation with access, victory check, optimistic save and pusher delta"
```
Expected: усі тести PASS; build успішний.

---

## Що далі (окремі плани, не в цьому)

- **Частина B — роути (один реліз):** перенести всі battle-роути на `runBattleMutation` (start → next-turn зі злиттям двох движків ходу → attack з `endTurn` і `attack/resolve` → spell → bonus-action/morale → DM-роути → rollback через `BattleSnapshot`), `GET` бою з rows і пагінацією подій, валідація кубиків через `validateDiceRolls`, видалення `strip-battle-payload.ts`, `attack-handler.ts`, `attack-and-next-turn`. Після релізу — contract-міграція, що прибирає старі JSON-колонки.
- **Частина C — правила движка** (спека §10).
- **Клієнт** (спека §11) — разом із під-проєктом «мобільний бій».

## Self-review (виконано)

- **Покриття етапу 2 спеки:** схема §4 (expand-only варіант) — Task 1; §4.1 поділ полів — Task 3; §4.2 знімок — Task 4; §5 сховище — Tasks 3–6; §6 пайплайн, коди помилок, дельта ≤ 9 500 байт, `expectedVersion`, перевірка перемоги в одному місці — Task 7; §9 модуль кубиків — Task 2. Роути, rollback-ендпоінт, клієнт — частини B/C і клієнтський план.
- **Розбіжності зі спекою (свідомі):** колонки `status`/`currentRound`/`currentTurnIndex` не перейменовуються на `status enum`/`round`/`turnIndex` — правило expand-only з `CLAUDE.md`; маппінг у `loadBattle`/`saveBattle`. Relation учасників зветься `battleParticipants`, бо `participants` зайняте legacy-колонкою.
- **Плейсхолдерів немає**; імена `splitParticipant`, `joinParticipant`, `diffParticipants`, `buildSnapshotState`, `loadBattle`, `saveBattle`, `runBattleMutation`, `PipelineDeps` узгоджені між задачами.
