import { attackReachError } from "./attack-reach";
import { cellKey } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";
import { reachable, remainingMovement } from "./path";

import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleAttack, BattleMapConfig, BattleMapMark, BattleParticipant } from "@/types/battle";

export type CellMark = BattleMapMark;

export function moveMarks(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant): Map<string, number> {
  return reachable(map, participants, mover, remainingMovement(mover));
}

export function reachingAttack(
  map: BattleMapConfig,
  participants: BattleParticipant[],
  attacker: BattleParticipant,
  attacks: BattleAttack[],
  target: BattleParticipant,
): { attack: BattleAttack | null; error: string | null } {
  let error: string | null = null;

  for (const attack of attacks) {
    const e = attackReachError(map, participants, attacker, attack, [target]);

    if (e === null) return { attack, error: null };

    error ??= e;
  }

  return { attack: null, error };
}

export function targetMarks(map: BattleMapConfig, participants: BattleParticipant[], attacker: BattleParticipant, attacks: BattleAttack[]): Map<string, CellMark> {
  const marks = new Map<string, CellMark>();

  for (const t of participants) {
    if (t.basicInfo.side === attacker.basicInfo.side || !isOnMap(t) || !isActive(t)) continue;

    const mark: CellMark = reachingAttack(map, participants, attacker, attacks, t).attack ? "target" : "invalid-target";

    for (const c of cellsOf(t)) marks.set(cellKey(c), mark);
  }

  return marks;
}
