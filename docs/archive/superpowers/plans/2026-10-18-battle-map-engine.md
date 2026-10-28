# Battle Map — блок 1: рушій — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Серверний рушій бойової карти: геометрія сітки (квадрат/гекс), модель (карта бою, позиція й рух учасника, розмір юніта), авторозстановка, мутація `move` і просторові правила атак. UI — у блоці 2.

**Architecture:** Чиста геометрія в `lib/utils/battle/grid/` (без залежностей від БД). Карта — `battle_scenes.map JSONB` у `meta` бою; позиція й витрачений рух — у `battle_participants.state` (як `pendingExtraActions`), тож дельта, відкат і клієнтський кеш працюють без нових механізмів. Розстановка — крок пайплайна `runBattleMutation` (після `mutate`, перед перевіркою перемоги), тому старт, призиви, резерв і add-participant отримують позиції в одному місці. Без карти (`map = null`) або без позиції в учасника просторові правила не діють.

**Tech Stack:** TypeScript strict, Prisma 6 + PostgreSQL, Zod, Vitest, TanStack Query.

**Spec:** `docs/archive/superpowers/specs/2026-10-18-battle-map.md`

## Global Constraints

- Пакетний менеджер `pnpm`; тести `pnpm test:run <path>`; lint `pnpm lint`; типи `pnpm exec tsc --noEmit`.
- Міграції expand-only; нових таблиць немає (RLS не потрібен).
- Імпорти лише через `@/…`; порядок — `simple-import-sort` (`pnpm lint --fix`); порожній рядок навколо `const`/`let`/`if`/`return`/блоків (`padding-line-between-statements`).
- Тексти помилок і коментарі — українською; ідентифікатори — англійською. Коментарі мінімальні: лише «чому».
- Помилки правил — `BattleRuleError(code, message)` (`lib/utils/battle/store`), доступу — `BattleAccessError(status, message)`.
- Компоненти не імпортують `@/lib/api/*`; клієнтські запити — `lib/api/battles.ts`, хук — `lib/hooks/battles/useBattles.ts`.
- Будь-яке нове поле `battleData`, що живе в `state`, додається в `ParticipantState`, `splitParticipant`, `joinParticipant` і `PATCHABLE_PARTICIPANT_FIELDS.battleData` — інакше дельта пришле повного учасника або загубить поле.

## Review Focus

- Бій без карти (`meta.map = null`) і учасник без `position`: атака, рух і пайплайн поводяться рівно як до змін (атака не відхиляється, позиції не зʼявляються).
- Істота 2×2 біля краю карти або поруч з іншою: розстановка й рух не виводять footprint за межі та не перекривають чужий footprint.
- Мертвий учасник і учасник у резерві (`battleData.reserved`) не блокують клітинки й не вважаються «ворогом поруч» для стрільця.
- Повторний запит `move` у той самий хід: бюджет сумується (`movementUsed`), а на початку наступного власного ходу обнуляється.
- `GET` бою (dryRun) не розставляє учасників — позиції зʼявляються лише в збережених мутаціях.

---

## File Structure

| Файл | Відповідальність |
|---|---|
| `lib/constants/battle.ts` | `GridShape`, `CELL_FEET`, `DEFAULT_BATTLE_MAP` |
| `types/battle.ts` | `GridPoint`, `BattleMapConfig`; `battleData.position/movementUsed`; `combatStats.gridSize` |
| `lib/utils/battle/grid/geometry.ts` | клітинки: сусіди, відстань, межі, footprint, відстань між footprint |
| `lib/utils/battle/grid/occupancy.ts` | хто займає клітинки, чи можна стати якорем |
| `lib/utils/battle/grid/path.ts` | BFS досяжності й вартість руху, бюджет руху |
| `lib/utils/battle/grid/placement.ts` | авторозстановка учасників без позиції |
| `lib/utils/battle/grid/attack-reach.ts` | дальність атаки, правила melee/ranged |
| `lib/utils/battle/grid/index.ts` | barrel |
| `lib/schemas/battles.ts` | `battleMapSchema`, поле `map` у create |
| `prisma/schema.prisma` + міграція | `BattleScene.map`, `Unit.gridSize` |
| `lib/utils/battle/store/*` | `meta.map`, state ↔ `position/movementUsed`, патч |
| `lib/utils/battle/pipeline/*` | `map` у відповіді, крок розстановки |
| `app/api/campaigns/[id]/battles/[battleId]/move/*` | мутація й роут `move` |
| `app/api/.../attack/attack-mutation.ts` | виклик правил атак |
| `lib/utils/battle/turn/start-end.ts` | скидання `movementUsed` |
| `lib/utils/abilities/schema/kinds.ts`, `registry/labels.ts` | стан `immobilized` |
| `lib/api/battles.ts`, `lib/hooks/battles/useBattles.ts`, `types/api.ts` | клієнт `move` |

---

### Task 1: Геометрія сітки

**Files:**
- Modify: `lib/constants/battle.ts` (додати в кінець)
- Modify: `types/battle.ts` (нові типи перед `BattleParticipantCombatStats`)
- Create: `lib/utils/battle/grid/geometry.ts`
- Create: `lib/utils/battle/grid/index.ts`
- Test: `lib/utils/battle/grid/__tests__/geometry.test.ts`

**Interfaces:**
- Produces:
  - `GridShape = { SQUARE: "square", HEX: "hex" }`, `type GridShape`, `CELL_FEET = 5`, `DEFAULT_BATTLE_MAP: BattleMapConfig`
  - `interface GridPoint { x: number; y: number }`
  - `interface BattleMapConfig { grid: GridShape; cols: number; rows: number; background: string | null; opacity: number }`
  - `cellKey(p: GridPoint): string`
  - `neighbors(grid: GridShape, p: GridPoint): GridPoint[]`
  - `cellDistance(grid: GridShape, a: GridPoint, b: GridPoint): number`
  - `inBounds(map: Pick<BattleMapConfig, "cols" | "rows">, p: GridPoint): boolean`
  - `footprint(grid: GridShape, anchor: GridPoint, size: number): GridPoint[]`
  - `footprintDistance(grid: GridShape, a: GridPoint[], b: GridPoint[]): number`

- [ ] **Step 1: Константи й типи**

У кінець `lib/constants/battle.ts`:

```ts
export const GridShape = {
  SQUARE: "square",
  HEX: "hex",
} as const;

export type GridShape = (typeof GridShape)[keyof typeof GridShape];

export const CELL_FEET = 5;

export const DEFAULT_BATTLE_MAP = {
  grid: GridShape.SQUARE,
  cols: 20,
  rows: 12,
  background: null,
  opacity: 0.35,
} as const satisfies BattleMapConfig;
```

і `import type { BattleMapConfig } from "@/types/battle";` угорі (перевір, що `types/battle.ts` не імпортує значення з `lib/constants/battle.ts` циклічно — `import type` цикл не створює; якщо `import/no-cycle` все ж скаржиться, прибери `satisfies` і тип імпорту).

У `types/battle.ts` перед `export interface BattleParticipantCombatStats` (додай `GridShape` до наявного імпорту з `@/lib/constants/battle`, якщо він є, або `import type { GridShape } from "@/lib/constants/battle";`):

```ts
export interface GridPoint {
  x: number;
  y: number;
}

/** Карта бою: сітка поверх фону; клітинка = 5 футів */
export interface BattleMapConfig {
  grid: GridShape;
  cols: number;
  rows: number;
  background: string | null;
  /** Прозорість ліній сітки, 0..1 */
  opacity: number;
}
```

- [ ] **Step 2: Failing test**

`lib/utils/battle/grid/__tests__/geometry.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { cellDistance, cellKey, footprint, footprintDistance, inBounds, neighbors } from "../geometry";

import { GridShape } from "@/lib/constants/battle";

const sq = GridShape.SQUARE;

const hex = GridShape.HEX;

describe("квадратна сітка", () => {
  it("8 сусідів і відстань Чебишева", () => {
    expect(neighbors(sq, { x: 5, y: 5 })).toHaveLength(8);
    expect(cellDistance(sq, { x: 0, y: 0 }, { x: 3, y: 2 })).toBe(3);
    expect(cellDistance(sq, { x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
  });

  it("footprint 2×2 від лівого верхнього якоря", () => {
    expect(footprint(sq, { x: 1, y: 1 }, 2).map(cellKey).sort()).toEqual(["1:1", "1:2", "2:1", "2:2"]);
    expect(footprint(sq, { x: 1, y: 1 }, 1)).toEqual([{ x: 1, y: 1 }]);
  });

  it("відстань між footprint — мінімум по клітинках", () => {
    const big = footprint(sq, { x: 0, y: 0 }, 2);

    expect(footprintDistance(sq, big, [{ x: 2, y: 1 }])).toBe(1);
    expect(footprintDistance(sq, big, [{ x: 4, y: 0 }])).toBe(3);
  });
});

describe("гекс-сітка (pointy-top, odd-r)", () => {
  it("6 сусідів, усі на відстані 1 — для парного й непарного рядка", () => {
    for (const p of [{ x: 4, y: 4 }, { x: 4, y: 5 }]) {
      const ns = neighbors(hex, p);

      expect(ns).toHaveLength(6);
      expect(ns.every((n) => cellDistance(hex, p, n) === 1)).toBe(true);
    }
  });

  it("відстань по рядку й по діагоналі", () => {
    expect(cellDistance(hex, { x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
    expect(cellDistance(hex, { x: 0, y: 0 }, { x: 0, y: 2 })).toBe(2);
    expect(cellDistance(hex, { x: 0, y: 0 }, { x: 1, y: 2 })).toBe(2);
  });

  it("велика істота на гексах — якір і 6 сусідів", () => {
    expect(footprint(hex, { x: 4, y: 4 }, 2)).toHaveLength(7);
    expect(footprint(hex, { x: 4, y: 4 }, 3)).toHaveLength(7);
    expect(footprint(hex, { x: 4, y: 4 }, 1)).toHaveLength(1);
  });
});

it("межі карти", () => {
  const map = { cols: 3, rows: 2 };

  expect(inBounds(map, { x: 2, y: 1 })).toBe(true);
  expect(inBounds(map, { x: 3, y: 0 })).toBe(false);
  expect(inBounds(map, { x: 0, y: -1 })).toBe(false);
});
```

- [ ] **Step 3: Run — FAIL**

Run: `pnpm test:run lib/utils/battle/grid/__tests__/geometry.test.ts`
Expected: FAIL — `Cannot find module '../geometry'`.

- [ ] **Step 4: Реалізація**

`lib/utils/battle/grid/geometry.ts`:

```ts
import { GridShape } from "@/lib/constants/battle";
import type { BattleMapConfig, GridPoint } from "@/types/battle";

const SQUARE_DIRS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
] as const;

// odd-r: непарні рядки зсунуті на пів клітинки праворуч
const HEX_DIRS_EVEN = [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]] as const;

const HEX_DIRS_ODD = [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]] as const;

export function cellKey(p: GridPoint): string {
  return `${p.x}:${p.y}`;
}

export function neighbors(grid: GridShape, p: GridPoint): GridPoint[] {
  const dirs = grid === GridShape.HEX ? (p.y % 2 === 0 ? HEX_DIRS_EVEN : HEX_DIRS_ODD) : SQUARE_DIRS;

  return dirs.map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy }));
}

function toCube(p: GridPoint) {
  const q = p.x - (p.y - (p.y & 1)) / 2;

  return { q, r: p.y, s: -q - p.y };
}

export function cellDistance(grid: GridShape, a: GridPoint, b: GridPoint): number {
  if (grid === GridShape.HEX) {
    const ca = toCube(a);

    const cb = toCube(b);

    return Math.max(Math.abs(ca.q - cb.q), Math.abs(ca.r - cb.r), Math.abs(ca.s - cb.s));
  }

  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function inBounds(map: Pick<BattleMapConfig, "cols" | "rows">, p: GridPoint): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < map.cols && p.y < map.rows;
}

export function footprint(grid: GridShape, anchor: GridPoint, size: number): GridPoint[] {
  if (size <= 1) return [anchor];

  if (grid === GridShape.HEX) return [anchor, ...neighbors(grid, anchor)];

  const cells: GridPoint[] = [];

  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) cells.push({ x: anchor.x + dx, y: anchor.y + dy });
  }

  return cells;
}

export function footprintDistance(grid: GridShape, a: GridPoint[], b: GridPoint[]): number {
  let best = Infinity;

  for (const p of a) {
    for (const q of b) best = Math.min(best, cellDistance(grid, p, q));
  }

  return best;
}
```

`lib/utils/battle/grid/index.ts`:

```ts
export * from "./geometry";
```

- [ ] **Step 5: Run — PASS**

Run: `pnpm test:run lib/utils/battle/grid/__tests__/geometry.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/constants/battle.ts types/battle.ts lib/utils/battle/grid
git commit -m "feat(battle-map): grid geometry for square and hex maps"
```

---

### Task 2: Модель — карта бою, позиція, рух, розмір юніта

**Files:**
- Modify: `prisma/schema.prisma` (`BattleScene` ~301, `Unit` ~126)
- Create: `prisma/migrations/20261019000000_battle_map/migration.sql`
- Modify: `types/battle.ts` (`BattleParticipantCombatStats`, `BattleParticipantBattleData`)
- Modify: `lib/schemas/battles.ts`, `lib/schemas/units.ts`, `types/units.ts`
- Modify: `app/api/campaigns/[id]/battles/route.ts` (POST), `app/api/campaigns/[id]/battles/[battleId]/route.ts` (PATCH schema)
- Modify: `lib/utils/battle/store/types.ts`, `split-participant.ts`, `participant-patch.ts`, `load-battle.ts`
- Modify: `lib/utils/battle/pipeline/battle-response.ts`, `types/api.ts` (`BattleScene`)
- Modify: `lib/utils/battle/participant/from-unit.ts:127`
- Modify: `app/api/__tests__/battles/fixtures.ts` (`meta.map: null`)
- Test: `lib/utils/battle/store/__tests__/battle-map-state.test.ts`

**Interfaces:**
- Consumes: `GridPoint`, `BattleMapConfig`, `GridShape`, `DEFAULT_BATTLE_MAP` (Task 1)
- Produces:
  - `BattleMeta.map: BattleMapConfig | null`; `BattleScene.map?: BattleMapConfig | null` (відповідь API)
  - `battleData.position?: GridPoint`, `battleData.movementUsed?: number`
  - `combatStats.gridSize?: number`
  - `ParticipantState.position?: GridPoint`, `ParticipantState.movementUsed?: number`
  - `battleMapSchema` (Zod) у `lib/schemas/battles.ts`

- [ ] **Step 1: Prisma + міграція**

У `model BattleScene` після `pendingMoraleCheck Json?`: `map                Json?`. У `model Unit` після `speed`: `gridSize         Int      @default(1)` (вирівнювання як у сусідніх полів).

`prisma/migrations/20261019000000_battle_map/migration.sql`:

```sql
ALTER TABLE "battle_scenes" ADD COLUMN "map" JSONB;

ALTER TABLE "units" ADD COLUMN "gridSize" INTEGER NOT NULL DEFAULT 1;
```

Run: `pnpm exec prisma generate`
Expected: `Generated Prisma Client`.

Застосувати локально (Docker DB `pnpm db:local`, якщо не запущена): `pnpm exec prisma migrate deploy` з локальним `DATABASE_URL`/`DIRECT_URL` з `.env.local` (перевір, що він вказує на `localhost:54322`, **не** на prod; якщо на prod — пропусти цей крок і зазнач у звіті).

- [ ] **Step 2: Типи**

`types/battle.ts`, у `BattleParticipantCombatStats` після `speed`:

```ts
  /** Сторона footprint у клітинках (1–3); немає = 1 */
  gridSize?: number;
```

У `BattleParticipantBattleData` після `auraZones`:

```ts
  /** Якір (лівий верхній кут footprint) на карті бою; немає — учасник поза картою */
  position?: GridPoint;
  /** Клітинок пройдено в поточному ході */
  movementUsed?: number;
```

`types/units.ts` — поряд зі `speed: number;` додати `gridSize: number;`.
`types/api.ts` — у `BattleScene` після `pendingMoraleCheck?: unknown;`: `map?: BattleMapConfig | null;` (імпорт типу з `@/types/battle`).

- [ ] **Step 3: Zod**

`lib/schemas/battles.ts`:

```ts
export const battleMapSchema = z.object({
  grid: z.enum([GridShape.SQUARE, GridShape.HEX]),
  cols: z.number().int().min(4).max(60),
  rows: z.number().int().min(4).max(60),
  background: z.string().url().nullable(),
  opacity: z.number().min(0).max(1),
});
```

і в `createBattleSchema` поле `map: battleMapSchema.nullable().optional(),` (імпорт `GridShape` з `@/lib/constants/battle`).
`lib/schemas/units.ts` — поряд з кожним `speed` (рядки ~43, ~68, ~93) додати `gridSize`: у create/import `z.number().int().min(1).max(3).default(1)`, в update `z.number().int().min(1).max(3).optional()`.

POST `battles/route.ts` — у `prisma.battleScene.create` додати `...(data.map && { map: data.map }),`.
PATCH `[battleId]/route.ts` — у `patchBattleSchema` додати `map: battleMapSchema.nullable().optional(),`; при `null` Prisma потребує `Prisma.DbNull`, тому замінити `data: { ...parsed, version: … }` на:

```ts
    const { map, ...rest } = parsed;

    await prisma.battleScene.update({
      where: { id: battleId },
      data: { ...rest, ...(map !== undefined && { map: map ?? Prisma.DbNull }), version: { increment: 1 } },
    });
```

(`import { Prisma } from "@prisma/client";`).

- [ ] **Step 4: Failing test для store**

`lib/utils/battle/store/__tests__/battle-map-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildParticipantPatch } from "../participant-patch";
import { joinParticipant, splitParticipant } from "../split-participant";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";

const base = createMockParticipant();

const placed = { ...base, battleData: { ...base.battleData, position: { x: 3, y: 4 }, movementUsed: 2 } };

describe("позиція й рух у state", () => {
  it("живуть у state, а не в знімку, і переживають split/join", () => {
    const stored = splitParticipant(placed, { orderIndex: 0, isPending: false });

    expect(stored.state.position).toEqual({ x: 3, y: 4 });
    expect(stored.state.movementUsed).toBe(2);
    expect(JSON.stringify(stored.snapshot)).not.toContain("movementUsed");
    expect(joinParticipant(stored, "b1").battleData).toMatchObject({ position: { x: 3, y: 4 }, movementUsed: 2 });
  });

  it("крок змінює лише state — знімок і hash ті самі", () => {
    const moved = { ...placed, battleData: { ...placed.battleData, position: { x: 4, y: 4 } } };

    expect(splitParticipant(moved, { orderIndex: 0, isPending: false }).snapshotHash).toBe(splitParticipant(placed, { orderIndex: 0, isPending: false }).snapshotHash);
  });

  it("патч несе position і movementUsed", () => {
    const moved = { ...placed, battleData: { ...placed.battleData, position: { x: 4, y: 4 }, movementUsed: 3 } };

    expect(buildParticipantPatch(placed, moved)).toEqual({ id: base.basicInfo.id, battleData: { position: { x: 4, y: 4 }, movementUsed: 3 } });
  });

  it("учасник без позиції не отримує полів", () => {
    const stored = splitParticipant(base, { orderIndex: 0, isPending: false });

    expect(joinParticipant(stored, "b1").battleData).not.toHaveProperty("position");
  });
});
```

Run: `pnpm test:run lib/utils/battle/store/__tests__/battle-map-state.test.ts`
Expected: FAIL (позиція потрапляє в знімок, патч не містить полів).

- [ ] **Step 5: Store**

`store/types.ts` — у `ParticipantState`:

```ts
  position?: GridPoint;
  movementUsed?: number;
```

(імпорт `GridPoint`), а в `BattleMeta` — `map: BattleMapConfig | null;`.

`split-participant.ts`:
- `const { activeEffects, abilityUsage, pendingExtraActions, position, movementUsed, ...battleDataWithScoped } = p.battleData;`
- у `state`: `...(position !== undefined && { position }), ...(movementUsed !== undefined && { movementUsed }),`
- у `joinParticipant` після рядка з `pendingExtraActions`:

```ts
      ...(state.position !== undefined && { position: state.position }),
      ...(state.movementUsed !== undefined && { movementUsed: state.movementUsed }),
```

`participant-patch.ts` — `battleData: ["activeEffects", "abilityUsage", "pendingExtraActions", "position", "movementUsed"],`.

`load-battle.ts` — у `select` додати `map: true,`; у `meta`: `map: (row.map ?? null) as BattleMapConfig | null,`.

`battle-response.ts` — у `toBattleResponse` після `pendingMoraleCheck`: `map: meta.map,`.

`app/api/__tests__/battles/fixtures.ts` — у `meta` додати `map: null`. Знайди інші місця, що будують `BattleMeta` вручну: `grep -rn "friendlyFire: false, createdAt" lib app --include=*.ts` — додай `map: null` усюди, де tsc скаржиться.

`from-unit.ts:127` — після `speed: unit.speed,` додати `gridSize: unit.gridSize ?? 1,`.

- [ ] **Step 6: Run — PASS + tsc**

Run: `pnpm test:run lib/utils/battle/store app/api/__tests__/battles lib/utils/battle/pipeline`
Expected: PASS.
Run: `pnpm exec tsc --noEmit`
Expected: без помилок (виправ решту ручних `BattleMeta` / `Unit`-фікстур, на які вкаже tsc).

- [ ] **Step 7: Commit**

```bash
git add prisma lib/schemas types lib/utils/battle/store lib/utils/battle/pipeline lib/utils/battle/participant app/api
git commit -m "feat(battle-map): battle map config, participant position and movement in state, unit grid size"
```

---

### Task 3: Зайнятість клітинок і пошук шляху

**Files:**
- Create: `lib/utils/battle/grid/occupancy.ts`, `lib/utils/battle/grid/path.ts`
- Modify: `lib/utils/battle/grid/index.ts`
- Test: `lib/utils/battle/grid/__tests__/path.test.ts`

**Interfaces:**
- Consumes: Task 1 geometry; `isActive` з `@/lib/utils/abilities/engine/core/participants`; `hasEffectMarker` з `@/lib/utils/battle/participant/state`
- Produces:
  - `sizeOf(p: BattleParticipant): number`
  - `isOnMap(p: BattleParticipant): boolean` — активний, не в резерві, має `position`
  - `cellsOf(grid: GridShape, p: BattleParticipant): GridPoint[]`
  - `canStand(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, anchor: GridPoint): boolean`
  - `reachable(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, budget: number): Map<string, number>` — ключ `cellKey(anchor)`, значення — вартість; лише клітинки, де можна стати
  - `movementBudget(p: BattleParticipant): number` — `floor(speed / CELL_FEET)`, 0 при `immobilized`
  - `remainingMovement(p: BattleParticipant): number`

- [ ] **Step 1: Failing test**

`lib/utils/battle/grid/__tests__/path.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { canStand, movementBudget, reachable, remainingMovement } from "../path";

import { CombatStatus, GridShape, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { grid: GridShape.SQUARE, cols: 6, rows: 3, background: null, opacity: 0.3 };

function at(id: string, position: GridPoint, side: string = ParticipantSide.ALLY, extra: Partial<BattleParticipant["combatStats"]> = {}): BattleParticipant {
  const p = createMockParticipant();

  return {
    ...p,
    basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    combatStats: { ...p.combatStats, speed: 30, ...extra },
    battleData: { ...p.battleData, position },
  };
}

describe("рух по сітці", () => {
  it("бюджет = speed / 5 мінус пройдене", () => {
    const hero = at("h", { x: 0, y: 0 });

    expect(movementBudget(hero)).toBe(6);
    expect(remainingMovement({ ...hero, battleData: { ...hero.battleData, movementUsed: 4 } })).toBe(2);
  });

  it("ворожа стіна блокує, союзник прохідний, але стати на нього не можна", () => {
    const hero = at("h", { x: 0, y: 1 });

    const wall = [0, 1, 2].map((y) => at(`e${y}`, { x: 2, y }, ParticipantSide.ENEMY));

    const reach = reachable(map, [hero, ...wall], hero, 6);

    expect(reach.has("3:1")).toBe(false);

    const ally = at("a", { x: 1, y: 1 });

    const reach2 = reachable(map, [hero, ally], hero, 6);

    expect(reach2.get("2:1")).toBe(2);
    expect(reach2.has("1:1")).toBe(false);
  });

  it("мертвий ворог не блокує", () => {
    const hero = at("h", { x: 0, y: 1 });

    const dead = at("d", { x: 1, y: 1 }, ParticipantSide.ENEMY, { status: CombatStatus.DEAD, currentHp: 0 });

    expect(canStand(map, [hero, dead], hero, { x: 1, y: 1 })).toBe(true);
  });

  it("2×2 не виходить за край і не стає на чужу клітинку", () => {
    const ogre = at("o", { x: 0, y: 0 }, ParticipantSide.ENEMY, { gridSize: 2 });

    expect(canStand(map, [ogre], ogre, { x: 5, y: 0 })).toBe(false);
    expect(canStand(map, [ogre], ogre, { x: 4, y: 1 })).toBe(true);

    const hero = at("h", { x: 3, y: 1 });

    expect(canStand(map, [ogre, hero], ogre, { x: 2, y: 0 })).toBe(false);
  });

  it("immobilized — бюджет 0", () => {
    const hero = at("h", { x: 0, y: 0 });

    const rooted = { ...hero, battleData: { ...hero.battleData, activeEffects: [{ id: "r", name: "Коріння", type: "condition", duration: 1, effects: [{ type: "immobilized" }] }] } } as unknown as BattleParticipant;

    expect(movementBudget(rooted)).toBe(0);
  });
});
```

Перед запуском звір форму маркера стану з тестами `lib/utils/battle/turn/__tests__/start-end.test.ts` (пошук `no_bonus_action`) і з `findEffectMarker` у `lib/utils/battle/participant/state.ts`; якщо ефект-маркер будується інакше — виправ фікстуру `rooted` під наявну форму (наприклад, тим самим хелпером, що використовують ці тести).

Run: `pnpm test:run lib/utils/battle/grid/__tests__/path.test.ts`
Expected: FAIL — `Cannot find module '../path'`.

- [ ] **Step 2: Стан `immobilized`**

`lib/utils/abilities/schema/kinds.ts` — у `CONDITION_KEYS` додати `"immobilized",`.
`lib/utils/abilities/registry/labels.ts` — поряд з `disable_ranged_attacks`: `immobilized: "знерухомлений",`.
Якщо якийсь тест фіксує кількість/перелік `CONDITION_KEYS` — онови його.

- [ ] **Step 3: Реалізація**

`lib/utils/battle/grid/occupancy.ts`:

```ts
import { cellKey, footprint, inBounds } from "./geometry";

import type { GridShape } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export function sizeOf(p: BattleParticipant): number {
  return Math.min(3, Math.max(1, p.combatStats.gridSize ?? 1));
}

export function isOnMap(p: BattleParticipant): boolean {
  return p.battleData.position !== undefined && !p.battleData.reserved && isActive(p);
}

export function cellsOf(grid: GridShape, p: BattleParticipant): GridPoint[] {
  return p.battleData.position ? footprint(grid, p.battleData.position, sizeOf(p)) : [];
}

export function occupiedBy(grid: GridShape, participants: BattleParticipant[], filter: (p: BattleParticipant) => boolean): Set<string> {
  return new Set(participants.filter((p) => isOnMap(p) && filter(p)).flatMap((p) => cellsOf(grid, p).map(cellKey)));
}

export function fits(map: BattleMapConfig, anchor: GridPoint, size: number, blocked: Set<string>): boolean {
  return footprint(map.grid, anchor, size).every((c) => inBounds(map, c) && !blocked.has(cellKey(c)));
}

export function canStand(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, anchor: GridPoint): boolean {
  const others = occupiedBy(map.grid, participants, (p) => p.basicInfo.id !== mover.basicInfo.id);

  return fits(map, anchor, sizeOf(mover), others);
}
```

`lib/utils/battle/grid/path.ts`:

```ts
import { cellKey, neighbors } from "./geometry";
import { fits, occupiedBy, sizeOf } from "./occupancy";

import { CELL_FEET } from "@/lib/constants/battle";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

export { canStand } from "./occupancy";

export function movementBudget(p: BattleParticipant): number {
  if (hasEffectMarker(p, "immobilized")) return 0;

  return Math.max(0, Math.floor(p.combatStats.speed / CELL_FEET));
}

export function remainingMovement(p: BattleParticipant): number {
  return Math.max(0, movementBudget(p) - (p.battleData.movementUsed ?? 0));
}

// союзники прохідні, вороги — стіна; стати можна лише на вільне місце
export function reachable(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, budget: number): Map<string, number> {
  const start = mover.battleData.position;

  const result = new Map<string, number>();

  if (!start) return result;

  const size = sizeOf(mover);

  const notMe = (p: BattleParticipant) => p.basicInfo.id !== mover.basicInfo.id;

  const walls = occupiedBy(map.grid, participants, (p) => notMe(p) && p.basicInfo.side !== mover.basicInfo.side);

  const taken = occupiedBy(map.grid, participants, notMe);

  const seen = new Map([[cellKey(start), 0]]);

  const queue = [start];

  while (queue.length > 0) {
    const cur = queue.shift()!;

    const cost = seen.get(cellKey(cur))!;

    if (cost >= budget) continue;

    for (const next of neighbors(map.grid, cur)) {
      const key = cellKey(next);

      if (seen.has(key) || !fits(map, next, size, walls)) continue;

      seen.set(key, cost + 1);
      queue.push(next);

      if (fits(map, next, size, taken)) result.set(key, cost + 1);
    }
  }

  return result;
}
```

Обидва нові модулі додати в `index.ts`: `export * from "./occupancy"; export * from "./path";` (у `path.ts` прибери реекспорт `canStand`, якщо barrel дає дубль — тоді в тесті імпортуй `canStand` з `../occupancy`).

- [ ] **Step 4: Run — PASS**

Run: `pnpm test:run lib/utils/battle/grid lib/utils/abilities`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/battle/grid lib/utils/abilities
git commit -m "feat(battle-map): occupancy, reachable cells and movement budget; immobilized condition"
```

---

### Task 4: Авторозстановка в пайплайні

**Files:**
- Create: `lib/utils/battle/grid/placement.ts`
- Modify: `lib/utils/battle/grid/index.ts`
- Modify: `lib/utils/battle/pipeline/run-battle-mutation.ts` (рядок з `withVictory(... guardTurnOrder(...))`)
- Test: `lib/utils/battle/grid/__tests__/placement.test.ts`, доповнити `lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 3 (`fits`, `occupiedBy`, `sizeOf`, `cellKey`, `cellDistance`)
- Produces:
  - `placeParticipants(map: BattleMapConfig, participants: BattleParticipant[]): BattleParticipant[]` — ставить лише активних, не в резерві, без `position`; решту повертає тими самими обʼєктами
  - `withPlacement(map: BattleMapConfig | null, status: BattleStatus, result: MutationResult): MutationResult` у `run-battle-mutation.ts` (не експортувати назовні, якщо не потрібно тестам)

- [ ] **Step 1: Failing test**

`lib/utils/battle/grid/__tests__/placement.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { cellDistance } from "../geometry";
import { placeParticipants } from "../placement";

import { GridShape, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const map: BattleMapConfig = { grid: GridShape.SQUARE, cols: 10, rows: 5, background: null, opacity: 0.3 };

function p(id: string, side: string, battleData: Partial<BattleParticipant["battleData"]> = {}, gridSize?: number): BattleParticipant {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    combatStats: { ...b.combatStats, ...(gridSize && { gridSize }) },
    battleData: { ...b.battleData, ...battleData },
  };
}

describe("авторозстановка", () => {
  it("союзники ліворуч, вороги праворуч, без перекриттів", () => {
    const out = placeParticipants(map, [p("a1", ParticipantSide.ALLY), p("a2", ParticipantSide.ALLY), p("e1", ParticipantSide.ENEMY, {}, 2)]);

    const [a1, a2, e1] = out.map((x) => x.battleData.position!);

    expect(a1.x).toBe(0);
    expect(a2.x).toBe(0);
    expect(a1.y).not.toBe(a2.y);
    expect(e1.x).toBe(8);
  });

  it("вже розставлених і резерв не чіпає", () => {
    const placed = p("a1", ParticipantSide.ALLY, { position: { x: 4, y: 4 } });

    const reserve = p("r", ParticipantSide.ENEMY, { reserved: true });

    const out = placeParticipants(map, [placed, reserve]);

    expect(out[0]).toBe(placed);
    expect(out[1].battleData.position).toBeUndefined();
  });

  it("призваний стає поруч із призивачем", () => {
    const summoner = p("s", ParticipantSide.ALLY, { position: { x: 5, y: 2 } });

    const out = placeParticipants(map, [summoner, p("wolf", ParticipantSide.ALLY, { summonedBy: "s" })]);

    expect(cellDistance(map.grid, out[1].battleData.position!, { x: 5, y: 2 })).toBe(1);
  });
});
```

Run: `pnpm test:run lib/utils/battle/grid/__tests__/placement.test.ts`
Expected: FAIL — модуля немає.

- [ ] **Step 2: Реалізація**

`lib/utils/battle/grid/placement.ts`:

```ts
import { cellDistance, cellKey, footprint } from "./geometry";
import { fits, isOnMap, sizeOf } from "./occupancy";

import { ParticipantSide } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

function sideAnchors(map: BattleMapConfig, side: string): GridPoint[] {
  const cols = Array.from({ length: map.cols }, (_, i) => (side === ParticipantSide.ENEMY ? map.cols - 1 - i : i));

  const mid = (map.rows - 1) / 2;

  const rows = Array.from({ length: map.rows }, (_, i) => i).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);

  return cols.flatMap((x) => rows.map((y) => ({ x, y })));
}

function nearAnchors(map: BattleMapConfig, center: GridPoint): GridPoint[] {
  const all: GridPoint[] = [];

  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) all.push({ x, y });
  }

  return all.sort((a, b) => cellDistance(map.grid, a, center) - cellDistance(map.grid, b, center));
}

export function placeParticipants(map: BattleMapConfig, participants: BattleParticipant[]): BattleParticipant[] {
  const blocked = new Set(participants.filter(isOnMap).flatMap((p) => footprint(map.grid, p.battleData.position!, sizeOf(p)).map(cellKey)));

  const positions = new Map(participants.filter(isOnMap).map((p) => [p.basicInfo.id, p.battleData.position!]));

  return participants.map((p) => {
    if (p.battleData.position || p.battleData.reserved || !isActive(p)) return p;

    const size = sizeOf(p);

    // великі істоти: якір лівий верхній, тож ворожий край зсуваємо на розмір
    const shift = (a: GridPoint) => (p.basicInfo.side === ParticipantSide.ENEMY ? { x: a.x - size + 1, y: a.y } : a);

    const summoner = p.battleData.summonedBy ? positions.get(p.battleData.summonedBy) : undefined;

    const candidates = summoner ? nearAnchors(map, summoner) : sideAnchors(map, p.basicInfo.side).map(shift);

    const anchor = candidates.find((a) => fits(map, a, size, blocked));

    if (!anchor) return p;

    for (const c of footprint(map.grid, anchor, size)) blocked.add(cellKey(c));
    positions.set(p.basicInfo.id, anchor);

    return { ...p, battleData: { ...p.battleData, position: anchor } };
  });
}
```

Додай `export * from "./placement";` в `index.ts`.

Примітка: тест «вороги праворуч» з `gridSize: 2` очікує `x = 8` (10 колонок, якір зсунутий на 1). Якщо `isOnMap` для мок-учасника повертає false через статус — перевір дефолтний `status` у `createMockParticipant` (має бути живий).

- [ ] **Step 3: Run — PASS**

Run: `pnpm test:run lib/utils/battle/grid/__tests__/placement.test.ts`
Expected: PASS.

- [ ] **Step 4: Крок пайплайна — failing test**

У `lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts` знайди, як тест будує `loaded` (фікстура `LoadedBattle` з `meta`) і як перевіряє аргумент `saveBattle`. Додай два тести за тим самим шаблоном:

```ts
  it("розставляє учасників без позиції, коли в бою є карта", async () => {
    // loaded.meta.map = { grid: "square", cols: 10, rows: 5, background: null, opacity: 0.3 }
    // mutate повертає ctx.participants без змін
    // очікування: saveBattle отримав outcome.participants, де в кожного активного є battleData.position
  });

  it("GET (dryRun) і бій без карти позицій не додають", async () => {
    // 1) map: null → outcome.participants без position
    // 2) dryRun: () => true з картою → saveBattle не викликано, у JSON-відповіді initiativeOrder без position
  });
```

Заповни тіла за наявними тестами цього файлу (ті самі хелпери `deps`/`loaded`, ті самі `expect` на `saveBattle.mock.calls[0][1]`). Run — FAIL.

- [ ] **Step 5: Крок пайплайна — реалізація**

У `run-battle-mutation.ts`:

```ts
import { placeParticipants } from "@/lib/utils/battle/grid/placement";
import type { BattleMapConfig } from "@/types/battle";

function withPlacement(map: BattleMapConfig | null, status: BattleStatus, result: MutationResult): MutationResult {
  if (!map || (result.scene?.status ?? status) !== BattleStatus.ACTIVE) return result;

  return { ...result, participants: placeParticipants(map, result.participants) };
}
```

і рядок з `const result = withVictory(...)` замінити на:

```ts
    const mutated = guardTurnOrder(loaded.scene, loaded.participants, await options.mutate(ctx, parsed.body), new URL(req.url).pathname.split("/").pop());

    const isDryRun = options.dryRun?.(parsed.body) ?? false;

    const result = withVictory(loaded.scene, isDryRun ? mutated : withPlacement(loaded.meta.map, loaded.scene.status, mutated));
```

і далі `if (options.dryRun?.(parsed.body))` → `if (isDryRun)`.

- [ ] **Step 6: Run — PASS**

Run: `pnpm test:run lib/utils/battle/pipeline lib/utils/battle/grid app/api/__tests__/battles`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/utils/battle/grid lib/utils/battle/pipeline
git commit -m "feat(battle-map): auto-place participants without a position in the battle pipeline"
```

---

### Task 5: Мутація `move` і скидання руху на початку ходу

**Files:**
- Create: `app/api/campaigns/[id]/battles/[battleId]/move/move-mutation.ts`, `.../move/route.ts`
- Modify: `lib/utils/api/rate-limit.ts` (`BATTLE_RATE_LIMITS`)
- Modify: `lib/utils/battle/turn/start-end.ts` (блок «5. Скидаємо флаги дій»)
- Modify: `types/api.ts` (`MoveParticipantData`), `lib/api/battles.ts`, `lib/hooks/battles/useBattles.ts`, `lib/hooks/battles/index.ts`
- Test: `app/api/__tests__/battles/move-mutation.test.ts`, доповнити `lib/utils/battle/turn/__tests__/start-end.test.ts`

**Interfaces:**
- Consumes: `reachable`, `remainingMovement`, `canStand`, `cellKey` (Tasks 1, 3); `canActNow` (`@/lib/utils/battle/common/control`); `assertNotPanicking` (`@/lib/utils/battle/turn`); `findParticipant`, `isActive`
- Produces:
  - `moveSchema = z.object({ participantId: z.string(), to: z.object({ x: z.number().int().min(0), y: z.number().int().min(0) }) })`
  - `moveMutation(ctx: BattleMutationContext, data: MoveBody): MutationResult` — без подій журналу (рух не засмічує лог і не тягне egress)
  - `interface MoveParticipantData { participantId: string; to: GridPoint }`
  - `moveParticipant(campaignId, battleId, data: WithVersion<MoveParticipantData>): Promise<BattleMutationResponse>`
  - `useMoveParticipant(c: string, b: string, o?: ActionOpts)`

- [ ] **Step 1: Failing test мутації**

`app/api/__tests__/battles/move-mutation.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { moveMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/move/move-mutation";
import { GridShape } from "@/lib/constants/battle";
import { BattleAccessError } from "@/lib/utils/battle/store";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { grid: GridShape.SQUARE, cols: 10, rows: 5, background: null, opacity: 0.3 };

const at = (p: BattleParticipant, position: GridPoint, movementUsed?: number): BattleParticipant => ({
  ...p,
  combatStats: { ...p.combatStats, speed: 30 },
  battleData: { ...p.battleData, position, ...(movementUsed !== undefined && { movementUsed }) },
});

const ctx = (over: Parameters<typeof context>[0] = {}) => {
  const base = context({ participants: [at(hero, { x: 0, y: 0 }), at(goblin, { x: 9, y: 4 })], ...over });

  return { ...base, meta: { ...base.meta, map } };
};

describe("move mutation", () => {
  it("рухає у свій хід і рахує витрачені клітинки, без подій журналу", () => {
    const out = moveMutation(ctx(), { participantId: "hero", to: { x: 3, y: 2 } });

    expect(out.participants[0].battleData).toMatchObject({ position: { x: 3, y: 2 }, movementUsed: 3 });
    expect(out.events).toEqual([]);
  });

  it("далі за бюджет або на зайняту клітинку — відмова", () => {
    expect(() => moveMutation(ctx(), { participantId: "hero", to: { x: 7, y: 0 } })).toThrow(expect.objectContaining({ code: "action_rejected" }));

    const tired = ctx({ participants: [at(hero, { x: 0, y: 0 }, 5), at(goblin, { x: 9, y: 4 })] });

    expect(() => moveMutation(tired, { participantId: "hero", to: { x: 2, y: 0 } })).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });

  it("гравець не рухає чужого учасника; ДМ ставить будь-кого вільно, не витрачаючи рух", () => {
    expect(() => moveMutation(ctx(), { participantId: "gob", to: { x: 8, y: 4 } })).toThrow(BattleAccessError);

    const out = moveMutation({ ...ctx(), isDM: true }, { participantId: "gob", to: { x: 1, y: 0 } });

    expect(out.participants[1].battleData.position).toEqual({ x: 1, y: 0 });
    expect(out.participants[1].battleData.movementUsed).toBeUndefined();
  });

  it("без карти — відмова", () => {
    expect(() => moveMutation(context(), { participantId: "hero", to: { x: 1, y: 0 } })).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });
});
```

Run: `pnpm test:run app/api/__tests__/battles/move-mutation.test.ts`
Expected: FAIL — модуля немає.

- [ ] **Step 2: Мутація й роут**

`app/api/campaigns/[id]/battles/[battleId]/move/move-mutation.ts`:

```ts
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { canActNow } from "@/lib/utils/battle/common/control";
import { canStand, cellKey, reachable, remainingMovement } from "@/lib/utils/battle/grid";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { assertNotPanicking } from "@/lib/utils/battle/turn";

export const moveSchema = z.object({
  participantId: z.string(),
  to: z.object({ x: z.number().int().min(0), y: z.number().int().min(0) }),
});

export type MoveBody = z.infer<typeof moveSchema>;

export function moveMutation(ctx: BattleMutationContext, data: MoveBody): MutationResult {
  const map = ctx.meta.map;

  if (!map) throw new BattleRuleError("action_rejected", "У цьому бою немає карти");

  const mover = findParticipant(ctx.participants, data.participantId);

  if (!mover) throw new BattleAccessError(404, "Учасника немає в бою");

  if (!isActive(mover) || mover.battleData.reserved) throw new BattleRuleError("participant_dead", "Учасник не може рухатися");

  const current = ctx.participants[ctx.scene.turnIndex];

  const ownTurn = current?.basicInfo.id === mover.basicInfo.id;

  if (!ownTurn && !ctx.isDM) throw new BattleAccessError(403, "Рухатися можна лише у свій хід");

  if (ownTurn && !canActNow(ctx, mover, current)) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  let movementUsed = mover.battleData.movementUsed;

  // ДМ переставляє чужого учасника вільно — це розстановка, а не хід
  if (ownTurn) {
    assertNotPanicking(ctx.scene.pendingMoraleCheck, mover.basicInfo.id);

    const cost = reachable(map, ctx.participants, mover, remainingMovement(mover)).get(cellKey(data.to));

    if (cost === undefined) throw new BattleRuleError("action_rejected", "Туди не дійти: зайнято, закрито ворогами або не вистачає руху");

    movementUsed = (movementUsed ?? 0) + cost;
  } else if (!canStand(map, ctx.participants, mover, data.to)) {
    throw new BattleRuleError("action_rejected", "Клітинка зайнята або поза картою");
  }

  const moved = { ...mover, battleData: { ...mover.battleData, position: data.to, ...(movementUsed !== undefined && { movementUsed }) } };

  return { participants: replaceParticipant(ctx.participants, moved), pending: ctx.pending, events: [] };
}
```

`.../move/route.ts`:

```ts
import { moveMutation, moveSchema } from "./move-mutation";

import { BattleStatus } from "@/lib/constants/battle";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; battleId: string }> }) {
  return runBattleMutation(req, {
    params: await params,
    access: BattleAccess.MEMBER,
    requireStatus: BattleStatus.ACTIVE,
    rateLimitScope: "move",
    schema: moveSchema,
    respond: "wrapped",
    mutate: moveMutation,
  });
}
```

`lib/utils/api/rate-limit.ts` — у `BATTLE_RATE_LIMITS` після `abilityAction`:

```ts
  /** Рух по карті — кілька кроків поспіль за хід. */
  move: { limit: 60, windowSeconds: 10 },
```

Перевір, що `replaceParticipant` справді експортується з `@/lib/utils/abilities/engine/core/participants` (так, рядок 9) і що `isDM: true` у тесті проходить `canActNow` для ДМ (так — `actor.isDM ||`).

- [ ] **Step 3: Run — PASS**

Run: `pnpm test:run app/api/__tests__/battles/move-mutation.test.ts`
Expected: PASS.

Перевір збереження ходу без подій: `grep -n "events.length" lib/utils/battle/store/save-battle.ts` — вставка подій під `if (events.length > 0)`, `eventSeq` росте на 0. Якщо `saveBattle` десь вимагає хоча б одну подію (знімок відкату, Pusher) — додай тест у `lib/utils/battle/store/__tests__` на порожній `events` і виправ.

- [ ] **Step 4: Скидання руху — failing test**

У `lib/utils/battle/turn/__tests__/start-end.test.ts` за шаблоном наявних тестів `processStartOfTurn` додай:

```ts
  it("на початку власного ходу обнуляє пройдений рух", () => {
    // учасник з battleData.movementUsed = 4 → після processStartOfTurn movementUsed === 0
    // учасник без movementUsed → поле не зʼявляється (undefined), щоб не слати зайвих патчів
  });
```

(Тіло — тими самими хелперами/викликом, що інші тести цього файлу.) Run — FAIL.

- [ ] **Step 5: Скидання руху — реалізація**

У `start-end.ts` одразу після блоку «5. Скидаємо флаги дій» (після присвоєння `updatedParticipant = { …actionFlags… }`):

```ts
  if (updatedParticipant.battleData.movementUsed) {
    updatedParticipant = { ...updatedParticipant, battleData: { ...updatedParticipant.battleData, movementUsed: 0 } };
  }
```

Run: `pnpm test:run lib/utils/battle/turn`
Expected: PASS.

- [ ] **Step 6: Клієнт**

`types/api.ts` поряд з `AuraZoneData`:

```ts
export interface MoveParticipantData {
  participantId: string;
  to: GridPoint;
}
```

`lib/api/battles.ts` (додай `MoveParticipantData` до імпорту з `@/types/api`):

```ts
export async function moveParticipant(campaignId: string, battleId: string, data: WithVersion<MoveParticipantData>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/move`, data);
}
```

`lib/hooks/battles/useBattles.ts` поряд з `useAuraZone`:

```ts
export const useMoveParticipant = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<MoveParticipantData>(c, b, (data) => moveParticipant(c, b, data), o);
```

і експорт `useMoveParticipant` у `lib/hooks/battles/index.ts` поряд з `useAuraZone`.

- [ ] **Step 7: Run + tsc + lint**

Run: `pnpm test:run app/api/__tests__/battles lib/utils/battle && pnpm exec tsc --noEmit && pnpm lint`
Expected: PASS, без помилок.

- [ ] **Step 8: Commit**

```bash
git add app/api lib types
git commit -m "feat(battle-map): move mutation with path and movement budget; reset movement at turn start"
```

---

### Task 6: Просторові правила атак

**Files:**
- Create: `lib/utils/battle/grid/attack-reach.ts`
- Modify: `lib/utils/battle/grid/index.ts`
- Modify: `app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation.ts` (`assertAttackInput`)
- Test: `lib/utils/battle/grid/__tests__/attack-reach.test.ts`, доповнити `app/api/__tests__/battles/attack-mutation.test.ts`

**Interfaces:**
- Consumes: `cellsOf`, `isOnMap`, `footprintDistance` (Tasks 1, 3); `attackKindOf` (`@/lib/utils/battle/common/attack-kind`); `CELL_FEET`, `AttackType`
- Produces:
  - `attackRangeCells(range?: string): number | null` — останнє число в рядку / 5 (округлення вниз, мінімум 1); немає числа → `null` (без обмеження)
  - `attackReachError(map: BattleMapConfig | null, participants: BattleParticipant[], attacker: BattleParticipant, attack: BattleAttack, targets: BattleParticipant[]): string | null`

- [ ] **Step 1: Failing test**

`lib/utils/battle/grid/__tests__/attack-reach.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { attackRangeCells, attackReachError } from "../attack-reach";

import { AttackType, CombatStatus, GridShape, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { grid: GridShape.SQUARE, cols: 30, rows: 10, background: null, opacity: 0.3 };

function at(id: string, position: GridPoint | undefined, side: string, dead = false): BattleParticipant {
  const p = createMockParticipant();

  return {
    ...p,
    basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    combatStats: { ...p.combatStats, ...(dead && { status: CombatStatus.DEAD, currentHp: 0 }) },
    battleData: { ...p.battleData, ...(position && { position }) },
  };
}

const sword = { id: "s", name: "Меч", type: AttackType.MELEE } as BattleAttack;

const bow = { id: "b", name: "Лук", type: AttackType.RANGED, range: "80/320 фт" } as BattleAttack;

const sling = { id: "sl", name: "Праща", type: AttackType.RANGED, range: "30 фт" } as BattleAttack;

describe("дальність атаки", () => {
  it("береться останнє число у футах", () => {
    expect(attackRangeCells("80/320 фт")).toBe(64);
    expect(attackRangeCells("5 ft")).toBe(1);
    expect(attackRangeCells(undefined)).toBeNull();
    expect(attackRangeCells("дальня")).toBeNull();
  });
});

describe("правила атак на карті", () => {
  const hero = at("h", { x: 5, y: 5 }, ParticipantSide.ALLY);

  it("ближня атака — лише по сусідній цілі", () => {
    const near = at("e1", { x: 6, y: 6 }, ParticipantSide.ENEMY);

    const far = at("e2", { x: 8, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(map, [hero, near, far], hero, sword, [near])).toBeNull();
    expect(attackReachError(map, [hero, near, far], hero, sword, [far])).toMatch(/поруч/);
  });

  it("стрілок не стріляє, коли поруч живий ворог; мертвий не заважає", () => {
    const adj = at("e1", { x: 5, y: 6 }, ParticipantSide.ENEMY);

    const target = at("e2", { x: 15, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(map, [hero, adj, target], hero, bow, [target])).toMatch(/ворог/);

    const corpse = at("e1", { x: 5, y: 6 }, ParticipantSide.ENEMY, true);

    expect(attackReachError(map, [hero, corpse, target], hero, bow, [target])).toBeNull();
  });

  it("ціль поза дальністю", () => {
    const target = at("e2", { x: 15, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(map, [hero, target], hero, sling, [target])).toMatch(/дальн/);
  });

  it("без карти або без позицій — правил немає", () => {
    const far = at("e2", { x: 20, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(null, [hero, far], hero, sword, [far])).toBeNull();

    const loose = at("e3", undefined, ParticipantSide.ENEMY);

    expect(attackReachError(map, [hero, loose], hero, sword, [loose])).toBeNull();
  });
});
```

Run: `pnpm test:run lib/utils/battle/grid/__tests__/attack-reach.test.ts`
Expected: FAIL — модуля немає.

- [ ] **Step 2: Реалізація**

`lib/utils/battle/grid/attack-reach.ts`:

```ts
import { footprintDistance } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";

import { AttackType, CELL_FEET } from "@/lib/constants/battle";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export function attackRangeCells(range?: string): number | null {
  const numbers = range?.match(/\d+/g);

  if (!numbers) return null;

  return Math.max(1, Math.floor(Number(numbers[numbers.length - 1]) / CELL_FEET));
}

export function attackReachError(
  map: BattleMapConfig | null,
  participants: BattleParticipant[],
  attacker: BattleParticipant,
  attack: BattleAttack,
  targets: BattleParticipant[],
): string | null {
  if (!map || !attacker.battleData.position) return null;

  const mine = cellsOf(map.grid, attacker);

  const distanceTo = (p: BattleParticipant) => footprintDistance(map.grid, mine, cellsOf(map.grid, p));

  const placed = targets.filter((t) => t.battleData.position);

  if (attackKindOf(attack.type) === AttackType.MELEE) {
    return placed.some((t) => distanceTo(t) > 1) ? "Ціль не поруч — спершу підійдіть" : null;
  }

  const engaged = participants.some((p) => p.basicInfo.side !== attacker.basicInfo.side && isOnMap(p) && distanceTo(p) <= 1);

  if (engaged) return "Поруч ворог — стріляти не можна";

  const range = attackRangeCells(attack.range);

  return range !== null && placed.some((t) => distanceTo(t) > range) ? "Ціль поза дальністю атаки" : null;
}
```

Додай `export * from "./attack-reach";` в `index.ts`.

- [ ] **Step 3: Run — PASS**

Run: `pnpm test:run lib/utils/battle/grid/__tests__/attack-reach.test.ts`
Expected: PASS.

- [ ] **Step 4: Підключити в мутацію атаки — failing test**

В `app/api/__tests__/battles/attack-mutation.test.ts` за наявним шаблоном виклику `attackMutation` додай:

```ts
  it("на карті ближня атака по далекій цілі відхиляється", async () => {
    // ctx = context(...) з meta.map = { grid: "square", cols: 10, rows: 5, background: null, opacity: 0.3 },
    // hero (battleData.position {x:0,y:0}, атака type "melee"), goblin {x:5,y:0}
    // await expect(attackMutation(ctx, body)).rejects.toMatchObject({ code: "action_rejected" })
  });

  it("без карти та сама атака проходить як раніше", async () => {
    // той самий body, meta.map = null → не кидає
  });
```

Run — FAIL (перший тест не відхиляється).

- [ ] **Step 5: Реалізація в мутації**

У `attack-mutation.ts`, `assertAttackInput`, після `assertAttackRolls(...)`:

```ts
  const targets = targetIds.flatMap((id) => ctx.participants.find((p) => p.basicInfo.id === id) ?? []);

  const reach = attackReachError(ctx.meta.map, ctx.participants, attacker, attack, targets);

  if (reach) throw new BattleRuleError("action_rejected", reach);
```

(імпорти: `attackReachError` з `@/lib/utils/battle/grid`, `BattleRuleError` з `@/lib/utils/battle/store`). `assertAttackInput` уже повертається раніше, якщо атакуючого чи атаки немає — фаза атаки дасть свою помилку.

- [ ] **Step 6: Run — PASS**

Run: `pnpm test:run app/api/__tests__/battles lib/utils/battle`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/utils/battle/grid app/api
git commit -m "feat(battle-map): melee needs adjacency, ranged blocked by adjacent enemy and limited by range"
```

---

### Task 7: Загальна перевірка блоку

**Files:** без нових (лише виправлення, якщо щось впаде)

- [ ] **Step 1: Повний прогін**

Run: `pnpm test:run && pnpm exec tsc --noEmit && pnpm lint`
Expected: усі тести PASS, tsc і lint без помилок.

- [ ] **Step 2: Battle-sweep (бій без карти не змінився)**

Якщо локальна база `prodcopy` є (`psql postgresql://postgres:postgres@localhost:54322/prodcopy -c 'select 1'`): застосуй міграцію до неї (`DATABASE_URL=… DIRECT_URL=… pnpm exec prisma migrate deploy` з URL `prodcopy`) і запусти `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep`.
Expected: exit 0, у звіті немає нових помилок. Якщо бази немає — зазнач у звіті, що sweep пропущено (prod не чіпати).

- [ ] **Step 3: Commit виправлень (якщо були)**

```bash
git add -A
git commit -m "fix(battle-map): follow-ups from full verification"
```
