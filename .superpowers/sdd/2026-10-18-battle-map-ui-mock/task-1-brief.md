### Task 1: Геометрія відмальовки й підсвітка (pure)

**Files:**
- Create: `lib/utils/battle/grid/layout.ts`, `lib/utils/battle/grid/map-view.ts`
- Modify: `lib/utils/battle/grid/index.ts` (експорт обох)
- Test: `lib/utils/battle/grid/__tests__/layout.test.ts`, `lib/utils/battle/grid/__tests__/map-view.test.ts`

**Interfaces:**
- Consumes: `cellKey`, `footprint`, `neighbors` (`./geometry`); `cellsOf`, `isOnMap`, `sizeOf` (`./occupancy`); `reachable`, `remainingMovement` (`./path`); `attackReachError` (`./attack-reach`)
- Produces:
  - `const UNIT = 100` — розмір клітинки в одиницях SVG
  - `mapSize(map: Pick<BattleMapConfig, "grid" | "cols" | "rows">): { width: number; height: number }`
  - `cellCenter(grid: GridShape, p: GridPoint): { x: number; y: number }`
  - `cellPolygon(grid: GridShape, p: GridPoint): string` — атрибут `points` для `<polygon>`
  - `tokenBox(grid: GridShape, p: BattleParticipant): { cx: number; cy: number; size: number } | null` — центр і діаметр токена в одиницях
  - `type CellMark = "move" | "target" | "invalid-target"`
  - `moveMarks(map, participants, mover): Map<string, number>` — досяжні клітинки з вартістю (обгортка над `reachable(map, participants, mover, remainingMovement(mover))`)
  - `targetMarks(map, participants, attacker, attack): Map<string, CellMark>` — для кожного живого учасника іншої сторони з позицією: ключі клітинок його footprint → `"target"`, якщо `attackReachError(map, participants, attacker, attack, [t]) === null`, інакше `"invalid-target"`

- [ ] **Step 1: Failing tests**

`layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { cellCenter, cellPolygon, mapSize, tokenBox, UNIT } from "../layout";

import { GridShape } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";

const sq = GridShape.SQUARE;

const hex = GridShape.HEX;

describe("квадрати", () => {
  it("розмір карти й центр клітинки", () => {
    expect(mapSize({ grid: sq, cols: 20, rows: 12 })).toEqual({ width: 20 * UNIT, height: 12 * UNIT });
    expect(cellCenter(sq, { x: 2, y: 1 })).toEqual({ x: 2.5 * UNIT, y: 1.5 * UNIT });
    expect(cellPolygon(sq, { x: 0, y: 0 }).split(" ")).toHaveLength(4);
  });

  it("токен 2×2 — центр на стику чотирьох клітинок, діаметр ~2 клітинки", () => {
    const p = createMockParticipant();

    const big = { ...p, combatStats: { ...p.combatStats, gridSize: 2 }, battleData: { ...p.battleData, position: { x: 3, y: 3 } } };

    const box = tokenBox(sq, big)!;

    expect(box.cx).toBe(4 * UNIT);
    expect(box.cy).toBe(4 * UNIT);
    expect(box.size).toBeGreaterThan(1.5 * UNIT);
  });

  it("учасник без позиції — без токена", () => {
    expect(tokenBox(sq, createMockParticipant())).toBeNull();
  });
});

describe("гекси (pointy-top, odd-r)", () => {
  it("непарний рядок зсунутий на пів ширини", () => {
    const even = cellCenter(hex, { x: 0, y: 0 });

    const odd = cellCenter(hex, { x: 0, y: 1 });

    expect(odd.x - even.x).toBeCloseTo((Math.sqrt(3) * UNIT) / 4, 5);
    expect(odd.y).toBeGreaterThan(even.y);
  });

  it("полігон має 6 вершин; карта вміщує зсунутий рядок", () => {
    expect(cellPolygon(hex, { x: 1, y: 1 }).split(" ")).toHaveLength(6);

    const { width } = mapSize({ grid: hex, cols: 4, rows: 2 });

    const last = cellCenter(hex, { x: 3, y: 1 });

    expect(width).toBeGreaterThanOrEqual(last.x + (Math.sqrt(3) * UNIT) / 4);
  });
});
```

Розміри гекса: радіус `R = UNIT / 2` (від центру до вершини), ширина `w = √3·R`, крок по вертикалі `1.5·R`, `cellCenter = { x: w·(x + 0.5·(y & 1)) + w/2, y: 1.5·R·y + R }`, `mapSize = { width: w·(cols + 0.5), height: 1.5·R·(rows − 1) + 2R }`. Перевір тести проти цих формул і за потреби виправ очікування в тесті (наприклад, різниця `odd.x − even.x` = `w/2` = `√3·UNIT/4`).

`map-view.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { moveMarks, targetMarks } from "../map-view";

import { AttackType, GridShape, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { grid: GridShape.SQUARE, cols: 10, rows: 5, background: null, opacity: 0.3 };

function at(id: string, position: GridPoint, side: string): BattleParticipant {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] }, combatStats: { ...p.combatStats, speed: 10 }, battleData: { ...p.battleData, position } };
}

const sword = { id: "s", name: "Меч", type: AttackType.MELEE } as BattleAttack;

describe("підсвітка карти", () => {
  it("рух — клітинки в межах залишку руху", () => {
    const hero = at("h", { x: 0, y: 0 }, ParticipantSide.ALLY);

    const marks = moveMarks(map, [hero], hero);

    expect(marks.get("2:2")).toBe(2);
    expect(marks.has("3:0")).toBe(false);
  });

  it("цілі — сусід доступний, далекий ворог ні, союзник не підсвічується", () => {
    const hero = at("h", { x: 0, y: 0 }, ParticipantSide.ALLY);

    const near = at("e1", { x: 1, y: 0 }, ParticipantSide.ENEMY);

    const far = at("e2", { x: 5, y: 0 }, ParticipantSide.ENEMY);

    const ally = at("a", { x: 0, y: 1 }, ParticipantSide.ALLY);

    const marks = targetMarks(map, [hero, near, far, ally], hero, sword);

    expect(marks.get("1:0")).toBe("target");
    expect(marks.get("5:0")).toBe("invalid-target");
    expect(marks.has("0:1")).toBe(false);
  });
});
```

Run: `pnpm test:run lib/utils/battle/grid/__tests__/layout.test.ts lib/utils/battle/grid/__tests__/map-view.test.ts` — FAIL (модулів немає).

- [ ] **Step 2: Реалізація**

`layout.ts`:

```ts
import { footprint } from "./geometry";
import { sizeOf } from "./occupancy";

import { GridShape } from "@/lib/constants/battle";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export const UNIT = 100;

const R = UNIT / 2;

const HEX_W = Math.sqrt(3) * R;

export function mapSize(map: Pick<BattleMapConfig, "grid" | "cols" | "rows">): { width: number; height: number } {
  if (map.grid === GridShape.HEX) return { width: HEX_W * (map.cols + 0.5), height: 1.5 * R * (map.rows - 1) + 2 * R };

  return { width: map.cols * UNIT, height: map.rows * UNIT };
}

export function cellCenter(grid: GridShape, p: GridPoint): { x: number; y: number } {
  if (grid === GridShape.HEX) return { x: HEX_W * (p.x + 0.5 * (p.y & 1)) + HEX_W / 2, y: 1.5 * R * p.y + R };

  return { x: (p.x + 0.5) * UNIT, y: (p.y + 0.5) * UNIT };
}

export function cellPolygon(grid: GridShape, p: GridPoint): string {
  const c = cellCenter(grid, p);

  const corners =
    grid === GridShape.HEX
      ? Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 180) * (60 * i - 30);

          return [c.x + R * Math.cos(a), c.y + R * Math.sin(a)];
        })
      : [[c.x - R, c.y - R], [c.x + R, c.y - R], [c.x + R, c.y + R], [c.x - R, c.y + R]];

  return corners.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export function tokenBox(grid: GridShape, p: BattleParticipant): { cx: number; cy: number; size: number } | null {
  const anchor = p.battleData.position;

  if (!anchor) return null;

  const size = sizeOf(p);

  if (grid === GridShape.HEX) {
    const c = cellCenter(grid, anchor);

    return { cx: c.x, cy: c.y, size: (size > 1 ? 2.6 : 0.86) * R * 2 };
  }

  const cells = footprint(grid, anchor, size).map((cell) => cellCenter(grid, cell));

  const cx = cells.reduce((s, c) => s + c.x, 0) / cells.length;

  const cy = cells.reduce((s, c) => s + c.y, 0) / cells.length;

  return { cx, cy, size: size * UNIT * 0.86 };
}
```

`map-view.ts`:

```ts
import { attackReachError } from "./attack-reach";
import { cellKey } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";
import { reachable, remainingMovement } from "./path";

import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export type CellMark = "move" | "target" | "invalid-target";

export function moveMarks(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant): Map<string, number> {
  return reachable(map, participants, mover, remainingMovement(mover));
}

export function targetMarks(map: BattleMapConfig, participants: BattleParticipant[], attacker: BattleParticipant, attack: BattleAttack): Map<string, CellMark> {
  const marks = new Map<string, CellMark>();

  for (const t of participants) {
    if (t.basicInfo.side === attacker.basicInfo.side || !isOnMap(t) || !isActive(t)) continue;

    const mark: CellMark = attackReachError(map, participants, attacker, attack, [t]) === null ? "target" : "invalid-target";

    for (const c of cellsOf(map.grid, t)) marks.set(cellKey(c), mark);
  }

  return marks;
}
```

(Підлаштуй сигнатуру виклику `attackReachError` під фактичну після блоку 1 — у ній є додатковий параметр/опція для aoe/hitsAllEnemies; передай значення «не ігнорувати».)

Додай у `index.ts`: `export * from "./layout"; export * from "./map-view";`.

- [ ] **Step 3: Run — PASS**, потім `pnpm exec tsc --noEmit`, `pnpm lint`.

- [ ] **Step 4: Commit** — `feat(battle-map): render layout math and map highlights`

---

