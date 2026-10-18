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
