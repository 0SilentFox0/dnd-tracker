import { featureKeys } from "./features";
import type { MazeGrid } from "./grid";
import { mazeReachable } from "./movement";

import { cellKey, cellsByDistance } from "@/lib/utils/battle/grid/geometry";
import { occupiedBy } from "@/lib/utils/battle/grid/occupancy";
import type { BattleParticipant, GridPoint } from "@/types/battle";

/** Воскреслий стає на свою клітинку або найближчу вільну за кроками лабіринту (стіни, без виходу й телепортів). */
export function nearestMazeCell(grid: MazeGrid, participants: BattleParticipant[], mover: BattleParticipant, from: GridPoint): GridPoint | null {
  const taken = occupiedBy(participants, (p) => p.basicInfo.id !== mover.basicInfo.id);

  const features = featureKeys(grid.maze);

  if (!taken.has(cellKey(from))) return from;

  const reach = mazeReachable(grid, { participants, mover: { ...mover, battleData: { ...mover.battleData, position: from } }, budget: grid.cols * grid.rows });

  const byCost = [...reach.entries()].filter(([key]) => !features.has(key)).sort((a, b) => a[1].cost - b[1].cost);

  if (byCost.length > 0) return byCost[0][1].path[byCost[0][1].path.length - 1];

  return cellsByDistance(grid, from).find((c) => !taken.has(cellKey(c)) && !features.has(cellKey(c))) ?? null;
}
