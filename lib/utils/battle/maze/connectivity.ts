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

export function allReachExit(grid: MazeGrid, points: GridPoint[]): boolean {
  const { exit } = grid.maze;

  if (!exit) return true;

  const reach = mazeDistances(grid, [exit]);

  return points.every((p) => reach.has(cellKey(p)));
}
