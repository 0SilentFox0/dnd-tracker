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
