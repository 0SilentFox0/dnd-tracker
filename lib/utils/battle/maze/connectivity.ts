import type { MazeGrid } from "./vision";
import { mazeNeighbors, wallSet } from "./walls";

import { cellKey, inBounds } from "@/lib/utils/battle/grid/geometry";
import type { GridPoint } from "@/types/battle";

export function mazeDistances(grid: MazeGrid, sources: GridPoint[]): Map<string, number> {
  const walls = wallSet(grid.maze);

  const dist = new Map<string, number>();

  const queue: GridPoint[] = [];

  for (const s of sources) {
    if (!inBounds(grid, s) || dist.has(cellKey(s))) continue;

    dist.set(cellKey(s), 0);
    queue.push(s);
  }

  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];

    const d = dist.get(cellKey(cur)) as number;

    for (const n of mazeNeighbors(grid, walls, cur)) {
      const key = cellKey(n);

      if (dist.has(key)) continue;

      dist.set(key, d + 1);
      queue.push(n);
    }
  }

  return dist;
}

export function pathLength(grid: MazeGrid, from: GridPoint, to: GridPoint): number | null {
  if (!inBounds(grid, to)) return null;

  return mazeDistances(grid, [from]).get(cellKey(to)) ?? null;
}

function warpTargets(grid: MazeGrid): Map<string, GridPoint> {
  const out = new Map<string, GridPoint>();

  for (const [a, b] of grid.maze.teleports) {
    out.set(cellKey(a), b);
    out.set(cellKey(b), a);
  }

  return out;
}

/** Як у русі: телепорт не пройти наскрізь — ступив на нього, і тебе переносить до пари. */
export function reachesExit(grid: MazeGrid, from: GridPoint): boolean {
  const { exit } = grid.maze;

  if (!exit) return true;

  const exitKey = cellKey(exit);

  if (cellKey(from) === exitKey) return true;

  const walls = wallSet(grid.maze);

  const warp = warpTargets(grid);

  const seen = new Set([cellKey(from)]);

  const queue: GridPoint[] = [from];

  for (let i = 0; i < queue.length; i++) {
    for (const n of mazeNeighbors(grid, walls, queue[i])) {
      const key = cellKey(n);

      if (key === exitKey) return true;

      const land = warp.get(key) ?? n;

      if (seen.has(cellKey(land))) continue;

      seen.add(cellKey(land));
      queue.push(land);
    }
  }

  return false;
}

export function allReachExit(grid: MazeGrid, points: GridPoint[]): boolean {
  return points.every((p) => reachesExit(grid, p));
}
