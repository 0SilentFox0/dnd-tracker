import { pickAttack } from "./attack-reach";
import { cellKey } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";
import { moveBudget, reachable } from "./path";
import { hazardCells, threatCells } from "./terrain";

import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleAttack, BattleMapConfig, BattleMapMark, BattleParticipant } from "@/types/battle";

export type CellMark = BattleMapMark;

export function moveMarks(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, opts: { dmUserId?: string | null } = {}): Map<string, number> {
  return reachable(map, participants, mover, moveBudget({ map, dmUserId: opts.dmUserId ?? null }, mover));
}

export const isMoveMark = (m: CellMark | number | undefined): boolean => typeof m === "number" || m === "move" || m === "move-danger";

export function moveZoneMarks(
  map: BattleMapConfig,
  participants: BattleParticipant[],
  mover: BattleParticipant,
  opts: { dmUserId?: string | null } = {},
): Map<string, CellMark | number> {
  const danger = new Set([...threatCells(map, participants, mover), ...hazardCells(map)]);

  const marks = new Map<string, CellMark | number>();

  for (const [key, cost] of moveMarks(map, participants, mover, opts)) marks.set(key, danger.has(key) ? "move-danger" : cost);

  return marks;
}

export function targetMarks(map: BattleMapConfig, participants: BattleParticipant[], attacker: BattleParticipant, attacks: BattleAttack[]): Map<string, CellMark> {
  const marks = new Map<string, CellMark>();

  for (const t of participants) {
    if (t.basicInfo.side === attacker.basicInfo.side || !isOnMap(t) || !isActive(t)) continue;

    const mark: CellMark = pickAttack(map, participants, attacker, attacks, t).attack ? "target" : "invalid-target";

    for (const c of cellsOf(t)) marks.set(cellKey(c), mark);
  }

  return marks;
}
