import { allCells } from "./features";
import { type Rng, shuffled } from "./rng";
import type { MazeGrid } from "./vision";
import { isEdgeCell } from "./walls";

import { MAZE_SCATTER_MIN_GAP } from "@/lib/constants/battle";
import { cellDistance, cellKey } from "@/lib/utils/battle/grid/geometry";
import type { GridPoint } from "@/types/battle";

const SCATTER_ATTEMPTS = 20;

// MAZE_SCATTER_MIN_GAP — порожні клітинки між учасниками, тож відстань на 1 більша
const MIN_DISTANCE = MAZE_SCATTER_MIN_GAP + 1;

function notExit(grid: MazeGrid): (p: GridPoint) => boolean {
  const exit = grid.maze.exit;

  return (p) => !exit || cellKey(p) !== cellKey(exit);
}

/** null — крайніх клітинок менше, ніж героїв */
export function scatterStarts(grid: MazeGrid, heroes: string[], rnd: Rng): Record<string, GridPoint> | null {
  const teleports = new Set(grid.maze.teleports.flat().map(cellKey));

  const cells = shuffled(
    rnd,
    allCells(grid).filter((p) => isEdgeCell(grid, p) && notExit(grid)(p) && !teleports.has(cellKey(p))),
  );

  if (cells.length < heroes.length) return null;

  return Object.fromEntries(heroes.map((id, i) => [id, cells[i]]));
}

export function scatterAll(grid: MazeGrid, ids: string[], rnd: Rng): Record<string, GridPoint> | null {
  const teleports = new Set(grid.maze.teleports.flat().map(cellKey));

  const free = allCells(grid).filter((p) => notExit(grid)(p) && !teleports.has(cellKey(p)));

  if (free.length < ids.length) return null;

  for (let attempt = 0; attempt < SCATTER_ATTEMPTS; attempt++) {
    const chosen: GridPoint[] = [];

    for (const p of shuffled(rnd, free)) {
      if (chosen.length === ids.length) break;

      if (chosen.every((c) => cellDistance(c, p) >= MIN_DISTANCE)) chosen.push(p);
    }

    if (chosen.length === ids.length) return Object.fromEntries(ids.map((id, i) => [id, chosen[i]]));
  }

  return null;
}
