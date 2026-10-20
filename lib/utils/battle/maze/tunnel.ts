import { directionOf } from "./direction";
import type { MazeGrid } from "./vision";
import { mazeNeighbors, wallSet } from "./walls";

import { cellKey } from "@/lib/utils/battle/grid/geometry";
import type { Direction8, GridPoint } from "@/types/battle";

type Grid = { cols: number; rows: number };

export interface TunnelRoom {
  walls: string[];
  /** клітинки тунелю від виходу до кімнати */
  cells: GridPoint[];
  /** перша клітинка кімнати біля тунелю */
  mouth: GridPoint;
}

export const roomCentre = (grid: Grid): GridPoint => ({ x: Math.floor(grid.cols / 2), y: Math.floor(grid.rows / 2) });

function line(from: GridPoint, step: GridPoint, length: number): GridPoint[] {
  return Array.from({ length }, (_, i) => ({ x: from.x + step.x * i, y: from.y + step.y * i }));
}

/** Одна кімната без стін і прямий тунель шириною в клітинку від виходу до центрального рядка/стовпця. */
export function tunnelRoom(grid: Grid, exit: GridPoint): TunnelRoom {
  const c = roomCentre(grid);

  const horizontal = exit.x === 0 || exit.x === grid.cols - 1;

  if (horizontal) {
    const fromLeft = exit.x === 0;

    const cells = fromLeft ? line({ x: 0, y: exit.y }, { x: 1, y: 0 }, c.x) : line({ x: c.x + 1, y: exit.y }, { x: 1, y: 0 }, grid.cols - 1 - c.x);

    const walls = cells.flatMap(({ x, y }) => [...(y > 0 ? [`${x}:${y - 1}:s`] : []), ...(y < grid.rows - 1 ? [`${x}:${y}:s`] : [])]);

    return { walls, cells, mouth: { x: c.x, y: exit.y } };
  }

  const fromTop = exit.y === 0;

  const cells = fromTop ? line({ x: exit.x, y: 0 }, { x: 0, y: 1 }, c.y) : line({ x: exit.x, y: c.y + 1 }, { x: 0, y: 1 }, grid.rows - 1 - c.y);

  const walls = cells.flatMap(({ x, y }) => [...(x > 0 ? [`${x - 1}:${y}:e`] : []), ...(x < grid.cols - 1 ? [`${x}:${y}:e`] : [])]);

  return { walls, cells, mouth: { x: exit.x, y: c.y } };
}

/** n найближчих до центру вільних клітинок (BFS кроками по сітці); null — місця не вистачає. */
export function clusterAt(grid: MazeGrid, centre: GridPoint, n: number, blocked: ReadonlySet<string>): GridPoint[] | null {
  const walls = wallSet(grid.maze);

  const seen = new Set([cellKey(centre)]);

  const queue = [centre];

  const out: GridPoint[] = [];

  for (let i = 0; i < queue.length && out.length < n; i++) {
    const p = queue[i];

    if (!blocked.has(cellKey(p))) out.push(p);

    for (const next of mazeNeighbors(grid, walls, p)) {
      const key = cellKey(next);

      if (seen.has(key)) continue;

      seen.add(key);
      queue.push(next);
    }
  }

  return out.length === n ? out : null;
}

export const facingTo = (from: GridPoint, to: GridPoint): Direction8 => directionOf(from, to) ?? "s";
