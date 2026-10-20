import type { ModeEngineHooks, ModeMoveZone } from "../types";
import { mazeGridOf } from "./grid";
import { mazeBudgetLeft, mazeReachable } from "./movement";

import { parseCellKey } from "@/lib/utils/battle/grid/geometry";

/** Кроки лише крізь видимі клітинки й повз видимих учасників — прихованих гравець не має вгадувати з зони ходу. */
export const mazeMoveZone: NonNullable<ModeEngineHooks<unknown>["moveZone"]> = ({ map, seen, mover, view }): ModeMoveZone => {
  const grid = mazeGridOf(map);

  const zone: ModeMoveZone = { steps: new Map(), marks: new Map() };

  // без виходу лабіринт ще не готовий — сервер відхилить будь-який крок
  if (!grid || grid.maze.dark || !grid.maze.exit) return zone;

  const reach = mazeReachable(grid, { participants: seen, mover, budget: mazeBudgetLeft(mover), limit: view?.cells ?? undefined });

  for (const [key, { cost }] of reach) {
    zone.steps.set(key, { anchor: parseCellKey(key), cost });
    zone.marks.set(key, cost);
  }

  return zone;
};
