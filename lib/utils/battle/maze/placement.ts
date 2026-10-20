import { inwardFacing } from "./direction";
import type { MazeGrid } from "./vision";
import { isEdgeCell } from "./walls";

import { ParticipantSide } from "@/lib/constants/battle";
import { cellKey, inBounds } from "@/lib/utils/battle/grid/geometry";
import { occupiedBy } from "@/lib/utils/battle/grid/occupancy";
import type { BattleParticipant, GridPoint } from "@/types/battle";

export interface MazePlacementArgs {
  participants: BattleParticipant[];
  mover: BattleParticipant;
  to: GridPoint;
}

export const MAZE_PLACEMENT_ERROR = {
  outside: "Клітинка поза картою",
  exit: "На вихід ставити не можна",
  taken: "Клітинка зайнята",
  edge: "До першого кроку герої стоять лише на краю лабіринту",
} as const;

const isHeroSide = (p: BattleParticipant) => p.basicInfo.side === ParticipantSide.ALLY;

/** Розстановка ДМ: без бюджету й шляху; герої до першого кроку — лише на краю. */
export function mazePlacementError(grid: MazeGrid, { participants, mover, to }: MazePlacementArgs): string | null {
  if (!inBounds(grid, to)) return MAZE_PLACEMENT_ERROR.outside;

  const { exit, moved } = grid.maze;

  if (exit && exit.x === to.x && exit.y === to.y) return MAZE_PLACEMENT_ERROR.exit;

  if (occupiedBy(participants, (p) => p.basicInfo.id !== mover.basicInfo.id).has(cellKey(to))) return MAZE_PLACEMENT_ERROR.taken;

  if (isHeroSide(mover) && !moved && !isEdgeCell(grid, to)) return MAZE_PLACEMENT_ERROR.edge;

  return null;
}

export function placeInMaze(grid: MazeGrid, mover: BattleParticipant, to: GridPoint): BattleParticipant {
  const facing = isHeroSide(mover) && !grid.maze.moved ? inwardFacing(grid, to) : mover.battleData.facing;

  return { ...mover, battleData: { ...mover.battleData, position: to, ...(facing && { facing }) } };
}
