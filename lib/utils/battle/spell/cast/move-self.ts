import { cellsByDistance, footprint, footprintDistance } from "@/lib/utils/battle/grid/geometry";
import { cellsOf, fits, isOnMap, occupiedBy, sizeOf } from "@/lib/utils/battle/grid/occupancy";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

/** Найближча до кастера вільна клітинка впритул до цілі; null — місця немає. */
export function adjacentFreeCell(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, target: BattleParticipant): GridPoint | null {
  const targetAnchor = target.battleData.position;

  const from = mover.battleData.position;

  if (!targetAnchor || !from) return null;

  const size = sizeOf(mover);

  const blocked = occupiedBy(participants, (p) => p.basicInfo.id !== mover.basicInfo.id);

  const targetCells = cellsOf(target);

  const near = cellsByDistance(map, targetAnchor).filter((a) => fits(map, a, size, blocked) && footprintDistance(footprint(a, size), targetCells) <= 1);

  const away = (a: GridPoint) => footprintDistance([a], [from]) * 1000 + (a.x - from.x) ** 2 + (a.y - from.y) ** 2;

  return near.reduce<GridPoint | null>((best, a) => (!best || away(a) < away(best) ? a : best), null);
}

export function moveAdjacent(map: BattleMapConfig | null | undefined, participants: BattleParticipant[], moverId: string, targetId: string): { participants: BattleParticipant[]; message: string } {
  const mover = participants.find((p) => p.basicInfo.id === moverId);

  const target = participants.find((p) => p.basicInfo.id === targetId);

  if (!mover || !target) return { participants, message: "" };

  if (!map || !isOnMap(mover) || !isOnMap(target)) return { participants, message: `🌀 ${mover.basicInfo.name}: переміщується до ${target.basicInfo.name} (без мапи)` };

  const cell = adjacentFreeCell(map, participants, mover, target);

  if (!cell) return { participants, message: `🌀 ${mover.basicInfo.name}: немає вільної клітинки біля ${target.basicInfo.name}` };

  const moved = { ...mover, battleData: { ...mover.battleData, position: cell } };

  return { participants: participants.map((p) => (p === mover ? moved : p)), message: `🌀 ${mover.basicInfo.name}: переміщується до ${target.basicInfo.name}` };
}
