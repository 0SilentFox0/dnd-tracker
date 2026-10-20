import { cellsOf } from "@/lib/utils/battle/grid/occupancy";
import { aimInRange } from "@/lib/utils/battle/grid/template";
import { MAZE_AIM_OUT_OF_SIGHT, mazeAimHidden } from "@/lib/utils/battle/maze";
import { BattleRuleError } from "@/lib/utils/battle/store/errors";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export function assertAbilityAim(ability: ResolvedAbility, map: BattleMapConfig | null | undefined, actor: BattleParticipant, cell: GridPoint | undefined): GridPoint | undefined {
  if (!ability.aim || !map) return undefined;

  if (!cell) throw new BattleRuleError("invalid_target", "Оберіть клітинку на карті");

  if (cell.x < 0 || cell.y < 0 || cell.x >= map.cols || cell.y >= map.rows || !aimInRange(cellsOf(actor), cell, ability.aim.range)) {
    throw new BattleRuleError("invalid_target", "Задалеко");
  }

  if (mazeAimHidden(map, actor, cell)) throw new BattleRuleError("invalid_target", MAZE_AIM_OUT_OF_SIGHT);

  return cell;
}
