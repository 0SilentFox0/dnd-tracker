import { cellKey, cellsByDistance, footprint, isPlayable } from "./geometry";

import { CombatStatus } from "@/lib/constants/battle";
import { isAirborne } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export function sizeOf(p: BattleParticipant): number {
  return Math.min(3, Math.max(1, p.combatStats.gridSize ?? 1));
}

export function occupiesCells(p: BattleParticipant): boolean {
  return !p.battleData.reserved && !isAirborne(p) && p.combatStats.status !== CombatStatus.DEAD;
}

export function isOnMap(p: BattleParticipant): boolean {
  return p.battleData.position !== undefined && occupiesCells(p);
}

export function bothOnMap(map: BattleMapConfig | null | undefined, ...ps: BattleParticipant[]): map is BattleMapConfig {
  return !!map && ps.every(isOnMap);
}

export function cellsOf(p: BattleParticipant): GridPoint[] {
  return p.battleData.position ? footprint(p.battleData.position, sizeOf(p)) : [];
}

export function occupiedBy(participants: BattleParticipant[], filter: (p: BattleParticipant) => boolean): Set<string> {
  return new Set(participants.filter((p) => isOnMap(p) && filter(p)).flatMap((p) => cellsOf(p).map(cellKey)));
}

export function fits(map: BattleMapConfig, anchor: GridPoint, size: number, blocked: Set<string>): boolean {
  return footprint(anchor, size).every((c) => isPlayable(map, c) && !blocked.has(cellKey(c)));
}

export function canStand(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, anchor: GridPoint): boolean {
  const others = occupiedBy(participants, (p) => p.basicInfo.id !== mover.basicInfo.id);

  return fits(map, anchor, sizeOf(mover), others);
}

export function nearestStandable(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, from: GridPoint): GridPoint | null {
  const others = occupiedBy(participants, (p) => p.basicInfo.id !== mover.basicInfo.id);

  const size = sizeOf(mover);

  return cellsByDistance(map, from).find((cell) => fits(map, cell, size, others)) ?? null;
}
