import { attackReachError } from "./attack-reach";
import { cellKey } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";
import { reachable, remainingMovement } from "./path";

import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export type CellMark = "move" | "target" | "invalid-target";

export function moveMarks(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant): Map<string, number> {
  return reachable(map, participants, mover, remainingMovement(mover));
}

export function targetMarks(map: BattleMapConfig, participants: BattleParticipant[], attacker: BattleParticipant, attack: BattleAttack): Map<string, CellMark> {
  const marks = new Map<string, CellMark>();

  for (const t of participants) {
    if (t.basicInfo.side === attacker.basicInfo.side || !isOnMap(t) || !isActive(t)) continue;

    const mark: CellMark = attackReachError(map, participants, attacker, attack, [t]) === null ? "target" : "invalid-target";

    for (const c of cellsOf(t)) marks.set(cellKey(c), mark);
  }

  return marks;
}
