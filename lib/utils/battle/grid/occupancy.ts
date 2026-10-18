import { cellKey, footprint, inBounds } from "./geometry";

import { CombatStatus, type GridShape } from "@/lib/constants/battle";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export function sizeOf(p: BattleParticipant): number {
  return Math.min(3, Math.max(1, p.combatStats.gridSize ?? 1));
}

export function occupiesCells(p: BattleParticipant): boolean {
  return !p.battleData.reserved && p.combatStats.status !== CombatStatus.DEAD;
}

export function isOnMap(p: BattleParticipant): boolean {
  return p.battleData.position !== undefined && occupiesCells(p);
}

export function cellsOf(grid: GridShape, p: BattleParticipant): GridPoint[] {
  return p.battleData.position ? footprint(grid, p.battleData.position, sizeOf(p)) : [];
}

export function occupiedBy(grid: GridShape, participants: BattleParticipant[], filter: (p: BattleParticipant) => boolean): Set<string> {
  return new Set(participants.filter((p) => isOnMap(p) && filter(p)).flatMap((p) => cellsOf(grid, p).map(cellKey)));
}

export function fits(map: BattleMapConfig, anchor: GridPoint, size: number, blocked: Set<string>): boolean {
  return footprint(map.grid, anchor, size).every((c) => inBounds(map, c) && !blocked.has(cellKey(c)));
}

export function canStand(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, anchor: GridPoint): boolean {
  const others = occupiedBy(map.grid, participants, (p) => p.basicInfo.id !== mover.basicInfo.id);

  return fits(map, anchor, sizeOf(mover), others);
}
