import type { BattleMapConfig, GridPoint } from "@/types/battle";

const DIRS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
] as const;

export function cellKey(p: GridPoint): string {
  return `${p.x}:${p.y}`;
}

export function neighbors(p: GridPoint): GridPoint[] {
  return DIRS.map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy }));
}

export function cellDistance(a: GridPoint, b: GridPoint): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function inBounds(map: Pick<BattleMapConfig, "cols" | "rows">, p: GridPoint): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < map.cols && p.y < map.rows;
}

const EMPTY_SET: ReadonlySet<string> = new Set();

const blockedCache = new WeakMap<string[], Set<string>>();

export function blockedSet(map: Pick<BattleMapConfig, "blocked">): ReadonlySet<string> {
  const list = map.blocked;

  if (!list?.length) return EMPTY_SET;

  let set = blockedCache.get(list);

  if (!set) {
    set = new Set(list);
    blockedCache.set(list, set);
  }

  return set;
}

export function isPlayable(map: Pick<BattleMapConfig, "cols" | "rows" | "blocked">, p: GridPoint): boolean {
  return inBounds(map, p) && !blockedSet(map).has(cellKey(p));
}

export type Margins = { top: number; right: number; bottom: number; left: number };

export function marginCells(map: Pick<BattleMapConfig, "cols" | "rows">, n: number | Margins): string[] {
  const m: Margins = typeof n === "number" ? { top: n, right: n, bottom: n, left: n } : n;

  const keys: string[] = [];

  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      if (x < m.left || y < m.top || x >= map.cols - m.right || y >= map.rows - m.bottom) keys.push(cellKey({ x, y }));
    }
  }

  return keys;
}

export function footprint(anchor: GridPoint, size: number): GridPoint[] {
  if (size <= 1) return [anchor];

  const cells: GridPoint[] = [];

  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) cells.push({ x: anchor.x + dx, y: anchor.y + dy });
  }

  return cells;
}

export function footprintDistance(a: GridPoint[], b: GridPoint[]): number {
  let best = Infinity;

  for (const p of a) {
    for (const q of b) best = Math.min(best, cellDistance(p, q));
  }

  return best;
}
