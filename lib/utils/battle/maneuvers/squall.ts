import { attackShare, isEnemyOf, maneuverResult,pickedEnemies, primaryDamageType, strikeAll } from "./strike";
import type { ManeuverInput, ManeuverResult } from "./types";

import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { canStand, cellKey, feetToCells, footprint, participantsInCells, rayCells, sizeOf } from "@/lib/utils/battle/grid";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

function flightPath(map: BattleMapConfig, start: GridPoint, aim: GridPoint, rangeFeet: number | undefined): GridPoint[] {
  return rayCells(map, start, aim, { maxCells: rangeFeet === undefined ? Math.max(map.cols, map.rows) : feetToCells(rangeFeet), stopAtTarget: true });
}

export function squall(ps: BattleParticipant[], input: ManeuverInput): ManeuverResult {
  const actor = findParticipant(ps, input.actorId);

  if (!actor) return maneuverResult(ps);

  const hit = { actorId: actor.basicInfo.id, damageType: primaryDamageType(actor), name: input.name };

  const amount = attackShare(actor, ps, input.percentOfAttack, input.rng);

  const start = actor.battleData.position;

  if (!input.map || !start || !input.targetCell) {
    const targets = pickedEnemies(ps, actor, input.targetIds, input.maxTargets ?? input.targetIds.length);

    return strikeAll(maneuverResult(ps), targets.map((t) => ({ targetId: t.basicInfo.id, amount })), hit);
  }

  const map = input.map;

  const path = flightPath(map, start, input.targetCell, input.range);

  const swept = new Set(path.flatMap((c) => footprint(c, sizeOf(actor))).map(cellKey));

  const victims = participantsInCells(ps, [...swept], start).filter(isEnemyOf(actor));

  const landing = [...path].reverse().find((c) => canStand(map, ps, actor, c));

  const moved = landing ? replaceParticipant(ps, { ...actor, battleData: { ...actor.battleData, position: landing } }) : ps;

  return strikeAll(maneuverResult(moved), victims.map((t) => ({ targetId: t.basicInfo.id, amount })), hit);
}
