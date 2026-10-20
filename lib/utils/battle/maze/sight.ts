import { type MazeGrid, mazeVision, seesParticipant, viewpointOf } from "./vision";
import { canStep, wallSet } from "./walls";

import { cellKey } from "@/lib/utils/battle/grid/geometry";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export const MAZE_WALL_BETWEEN = "Між вами стіна";

export const MAZE_TARGET_OUT_OF_SIGHT = "Ціль поза полем зору";

export const MAZE_AIM_OUT_OF_SIGHT = "Точка поза полем зору";

export const MAZE_DARK_ERROR = "Темрява — ніхто не може діяти";

export const MAZE_DARK_SKIP = "Темрява — хід пропущено";

export function mazeGridOf(map: BattleMapConfig | null | undefined): MazeGrid | null {
  return map?.maze ? { cols: map.cols, rows: map.rows, maze: map.maze } : null;
}

export const isMazeDark = (map: BattleMapConfig | null | undefined): boolean => !!map?.maze?.dark;

export function seesCell(grid: MazeGrid, viewer: BattleParticipant, cell: GridPoint): boolean {
  const view = viewpointOf(viewer);

  return !!view && mazeVision(grid, view).has(cellKey(cell));
}

/** Ціль без позиції (поза картою) не перевіряється — як і дальність. */
export function seesTarget(grid: MazeGrid, viewer: BattleParticipant, target: BattleParticipant): boolean {
  const view = viewpointOf(viewer);

  const to = target.battleData.position;

  if (!view || !to) return true;

  return seesParticipant(grid, mazeVision(grid, view), view.position, to);
}

export function meleeWallBetween(grid: MazeGrid, attacker: BattleParticipant, target: BattleParticipant): boolean {
  const a = attacker.battleData.position;

  const b = target.battleData.position;

  return !!a && !!b && !canStep(grid, wallSet(grid.maze), a, b);
}

/** У лабіринті приціл — лише в полі зору; сама зона тонкими стінами не зупиняється. */
export function mazeAimHidden(map: BattleMapConfig | null | undefined, caster: BattleParticipant, aim: GridPoint): boolean {
  const grid = mazeGridOf(map);

  return !!grid && !seesCell(grid, caster, aim);
}

export function mazeTargetHidden(map: BattleMapConfig | null | undefined, caster: BattleParticipant, targets: BattleParticipant[]): boolean {
  const grid = mazeGridOf(map);

  return !!grid && targets.some((t) => !seesTarget(grid, caster, t));
}
