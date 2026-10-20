import { cellKey, inBounds, neighbors } from "@/lib/utils/battle/grid/geometry";
import type { GridPoint, MazeConfig } from "@/types/battle";

type Grid = { cols: number; rows: number };

const EMPTY_SET: ReadonlySet<string> = new Set();

const wallCache = new WeakMap<string[], Set<string>>();

export function wallSet(maze: Pick<MazeConfig, "walls">): ReadonlySet<string> {
  const list = maze.walls;

  if (!list?.length) return EMPTY_SET;

  let set = wallCache.get(list);

  if (!set) {
    set = new Set(list);
    wallCache.set(list, set);
  }

  return set;
}

export function edgeKey(a: GridPoint, b: GridPoint): string | null {
  const dx = b.x - a.x;

  const dy = b.y - a.y;

  if (Math.abs(dx) + Math.abs(dy) !== 1) return null;

  const first = dx < 0 || dy < 0 ? b : a;

  return `${cellKey(first)}:${dx !== 0 ? "e" : "s"}`;
}

export function hasWall(grid: Grid, walls: ReadonlySet<string>, a: GridPoint, b: GridPoint): boolean {
  if (!inBounds(grid, a) || !inBounds(grid, b)) return true;

  const key = edgeKey(a, b);

  return key !== null && walls.has(key);
}

export function cornerOpen(grid: Grid, walls: ReadonlySet<string>, a: GridPoint, b: GridPoint): boolean {
  const ax = { x: b.x, y: a.y };

  const ay = { x: a.x, y: b.y };

  return !hasWall(grid, walls, a, ax) && !hasWall(grid, walls, a, ay) && !hasWall(grid, walls, ax, b) && !hasWall(grid, walls, ay, b);
}

export function canStep(grid: Grid, walls: ReadonlySet<string>, a: GridPoint, b: GridPoint): boolean {
  const dx = Math.abs(b.x - a.x);

  const dy = Math.abs(b.y - a.y);

  if (dx > 1 || dy > 1 || dx + dy === 0) return false;

  if (dx + dy === 1) return !hasWall(grid, walls, a, b);

  return inBounds(grid, a) && inBounds(grid, b) && cornerOpen(grid, walls, a, b);
}

export function isEdgeCell(grid: Grid, p: GridPoint): boolean {
  return p.x === 0 || p.y === 0 || p.x === grid.cols - 1 || p.y === grid.rows - 1;
}

export function allInteriorEdges(grid: Grid): string[] {
  const out: string[] = [];

  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (x < grid.cols - 1) out.push(`${x}:${y}:e`);

      if (y < grid.rows - 1) out.push(`${x}:${y}:s`);
    }
  }

  return out;
}

export function mazeNeighbors(grid: Grid, walls: ReadonlySet<string>, p: GridPoint): GridPoint[] {
  return neighbors(p).filter((n) => canStep(grid, walls, p, n));
}
