import { inwardFacing } from "./direction";
import type { MazeGrid } from "./grid";
import { isEdgeCell } from "./walls";

import { ParticipantSide } from "@/lib/constants/battle";
import { cellKey, inBounds, samePoint } from "@/lib/utils/battle/grid/geometry";
import { occupiedBy } from "@/lib/utils/battle/grid/occupancy";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import type { BattleParticipant, GridPoint } from "@/types/battle";

export interface MazePlacementArgs {
  participants: BattleParticipant[];
  mover: BattleParticipant;
  to: GridPoint;
}

const ERROR = MAZE_TEXTS.placement;

const isHeroSide = (p: BattleParticipant) => p.basicInfo.side === ParticipantSide.ALLY;

/** Розстановка ДМ: без бюджету й шляху; герої до першого кроку — лише на краю. */
export function mazePlacementError(grid: MazeGrid, { participants, mover, to }: MazePlacementArgs): string | null {
  if (!inBounds(grid, to)) return ERROR.outside;

  const { exit, moved } = grid.maze;

  if (exit && samePoint(exit, to)) return ERROR.exit;

  if (occupiedBy(participants, (p) => p.basicInfo.id !== mover.basicInfo.id).has(cellKey(to))) return ERROR.taken;

  if (isHeroSide(mover) && !moved && !isEdgeCell(grid, to)) return ERROR.edge;

  return null;
}

export function placeInMaze(grid: MazeGrid, mover: BattleParticipant, to: GridPoint): BattleParticipant {
  const facing = isHeroSide(mover) && !grid.maze.moved ? inwardFacing(grid, to) : mover.battleData.facing;

  return { ...mover, battleData: { ...mover.battleData, position: to, ...(facing && { facing }) } };
}
