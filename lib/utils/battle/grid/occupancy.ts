import { cellDistance, cellKey, footprint, isPlayable } from "./geometry";

import { CombatStatus } from "@/lib/constants/battle";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export function sizeOf(p: BattleParticipant): number {
  return Math.min(3, Math.max(1, p.combatStats.gridSize ?? 1));
}

export function occupiesCells(p: BattleParticipant): boolean {
  return !p.battleData.reserved && !p.battleData.airborne && p.combatStats.status !== CombatStatus.DEAD;
}

export function isOnMap(p: BattleParticipant): boolean {
  return p.battleData.position !== undefined && occupiesCells(p);
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

/** Найближчий до from якір, де mover може стати (кільцями від from). */
export function nearestStandable(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, from: GridPoint): GridPoint | null {
  const maxRing = Math.max(map.cols, map.rows);

  for (let r = 0; r <= maxRing; r++) {
    for (let y = from.y - r; y <= from.y + r; y++) {
      for (let x = from.x - r; x <= from.x + r; x++) {
        const cell = { x, y };

        if (cellDistance(cell, from) === r && canStand(map, participants, mover, cell)) return cell;
      }
    }
  }

  return null;
}
