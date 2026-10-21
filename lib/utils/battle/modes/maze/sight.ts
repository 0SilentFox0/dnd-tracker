import { type MazeGrid, mazeGridOf } from "./grid";
import { mazeVision, seesParticipant, viewpointOf } from "./vision";
import { canStep, wallSet } from "./walls";

import { cellKey } from "@/lib/utils/battle/grid/geometry";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

function seesCell(grid: MazeGrid, viewer: BattleParticipant, cell: GridPoint): boolean {
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

export function mazeLineBlocked(grid: MazeGrid, line: GridPoint[]): boolean {
  const walls = wallSet(grid.maze);

  return line.some((c, i) => i > 0 && !canStep(grid, walls, line[i - 1], c));
}
