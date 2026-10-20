import { teleportPartner } from "./features";
import type { MazeGrid } from "./grid";
import { mazeNeighbors, wallSet } from "./walls";

import { allCells, cellKey, inBounds } from "@/lib/utils/battle/grid/geometry";
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

/**
 * Клітинки, з яких можна дійти до виходу. Як у русі: телепорт не пройти наскрізь — ступив на нього, і тебе переносить до пари.
 * Один зворотний пошук на всю карту замість окремого пошуку від кожного учасника.
 */
function exitReachers(grid: MazeGrid, exitKey: string): ReadonlySet<string> {
  const walls = wallSet(grid.maze);

  const from = new Map<string, GridPoint[]>();

  const good = new Set<string>();

  const queue: GridPoint[] = [];

  for (const cell of allCells(grid)) {
    for (const n of mazeNeighbors(grid, walls, cell)) {
      if (cellKey(n) === exitKey) {
        if (!good.has(cellKey(cell))) {
          good.add(cellKey(cell));
          queue.push(cell);
        }

        continue;
      }

      const land = cellKey(teleportPartner(grid.maze, n) ?? n);

      const list = from.get(land);

      if (list) list.push(cell);
      else from.set(land, [cell]);
    }
  }

  for (let i = 0; i < queue.length; i++) {
    for (const prev of from.get(cellKey(queue[i])) ?? []) {
      if (good.has(cellKey(prev))) continue;

      good.add(cellKey(prev));
      queue.push(prev);
    }
  }

  return good;
}

export function allReachExit(grid: MazeGrid, points: GridPoint[]): boolean {
  const { exit } = grid.maze;

  if (!exit || points.length === 0) return true;

  const exitKey = cellKey(exit);

  const others = points.filter((p) => cellKey(p) !== exitKey);

  if (others.length === 0) return true;

  const good = exitReachers(grid, exitKey);

  return others.every((p) => good.has(cellKey(p)));
}
