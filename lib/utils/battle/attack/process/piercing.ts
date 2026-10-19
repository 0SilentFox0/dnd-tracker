import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { apexOf, cellDistance, cellKey, cellsOf, closestCell, footprintDistance, isOnMap, participantsInCells, rayCells } from "@/lib/utils/battle/grid";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

export function piercingTargets(map: BattleMapConfig | undefined, ps: BattleParticipant[], attacker: BattleParticipant, firstTargetId: string): string[] {
  const first = findParticipant(ps, firstTargetId);

  if (!map || !first || !isOnMap(attacker) || !isOnMap(first)) return [firstTargetId];

  const origin = cellsOf(attacker);

  const through = closestCell(cellsOf(first), origin);

  const apex = apexOf(origin, through);

  const ray = rayCells(map, apex, through, { maxCells: Math.max(map.cols, map.rows) }).map(cellKey);

  const reach = cellDistance(apex, through);

  const rest = participantsInCells(ps, ray, apex)
    .filter((p) => p.basicInfo.id !== firstTargetId && p.basicInfo.side !== attacker.basicInfo.side && footprintDistance([apex], cellsOf(p)) >= reach)
    .map((p) => p.basicInfo.id);

  return [firstTargetId, ...rest];
}
