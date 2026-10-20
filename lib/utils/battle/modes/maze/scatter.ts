import { allReachExit } from "./connectivity";
import { featureKeys } from "./features";
import type { MazeGrid } from "./grid";
import { type Rng, shuffled } from "./rng";
import { isEdgeCell } from "./walls";

import { allCells, cellDistance, cellKey } from "@/lib/utils/battle/grid/geometry";
import { MAZE_SCATTER_MIN_GAP } from "@/lib/utils/battle/modes/maze/constants";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import type { GridPoint } from "@/types/battle";

const SCATTER_ATTEMPTS = 20;

// MAZE_SCATTER_MIN_GAP — порожні клітинки між учасниками, тож відстань на 1 більша
const MIN_DISTANCE = MAZE_SCATTER_MIN_GAP + 1;

const freeCells = (grid: MazeGrid): GridPoint[] => {
  const features = featureKeys(grid.maze);

  return allCells(grid).filter((p) => !features.has(cellKey(p)));
};

export function scatterStarts(grid: MazeGrid, heroes: string[], rnd: Rng): Record<string, GridPoint> | null {
  const cells = shuffled(
    rnd,
    freeCells(grid).filter((p) => isEdgeCell(grid, p)),
  );

  if (cells.length < heroes.length) return null;

  return Object.fromEntries(heroes.map((id, i) => [id, cells[i]]));
}

export interface FreeStartsArgs {
  heroIds: string[];
  /** клітинки решти учасників на полі */
  others: GridPoint[];
  /** усі мають мати шлях до виходу; інакше повтор, а після всіх спроб — «замурують» */
  mustReachExit?: boolean;
}

/** Старти героїв на крайніх клітинках, не зайнятих рештою учасників. */
export function scatterFreeStarts(grid: MazeGrid, { heroIds, others, mustReachExit = false }: FreeStartsArgs, rnd: Rng): { starts: Record<string, GridPoint> } | { error: string } {
  const taken = new Set(others.map(cellKey));

  for (let attempt = 0; attempt < SCATTER_ATTEMPTS; attempt++) {
    const starts = scatterStarts(grid, heroIds, rnd);

    if (!starts) return { error: MAZE_TEXTS.scatterNoRoom };

    if (Object.values(starts).some((c) => taken.has(cellKey(c)))) continue;

    if (mustReachExit && !allReachExit(grid, [...others, ...Object.values(starts)])) continue;

    return { starts };
  }

  return { error: mustReachExit ? MAZE_TEXTS.walledIn : MAZE_TEXTS.scatterNoRoom };
}

export function scatterAll(grid: MazeGrid, ids: string[], rnd: Rng): Record<string, GridPoint> | null {
  const free = freeCells(grid);

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
