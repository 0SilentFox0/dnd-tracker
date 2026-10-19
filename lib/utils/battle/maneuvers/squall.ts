import { attackShare, isEnemyOf, pickedEnemies, primaryDamageType, strikeAll, unchanged } from "./strike";
import type { ManeuverInput, ManeuverResult } from "./types";

import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { canStand, cellKey, cellLine, cellsOf, feetToCells, footprint, inBounds, sizeOf } from "@/lib/utils/battle/grid";
import type { BattleParticipant, GridPoint } from "@/types/battle";

const NO_MAP_TARGETS = 3;

function flightPath(start: GridPoint, aim: GridPoint, rangeFeet: number | undefined, bounds: { cols: number; rows: number }): GridPoint[] {
  const path = cellLine(start, aim).slice(1);

  const limited = rangeFeet === undefined ? path : path.slice(0, feetToCells(rangeFeet));

  const inside = limited.findIndex((c) => !inBounds(bounds, c));

  return inside < 0 ? limited : limited.slice(0, inside);
}

export function squall(ps: BattleParticipant[], input: ManeuverInput): ManeuverResult {
  const actor = findParticipant(ps, input.actorId);

  if (!actor) return unchanged(ps);

  const hit = { actorId: actor.basicInfo.id, damageType: primaryDamageType(actor), name: input.name };

  const amount = attackShare(actor, ps, input.percentOfAttack, input.rng);

  const start = actor.battleData.position;

  if (!input.map || !start || !input.targetCell) {
    const targets = pickedEnemies(ps, actor, input.targetIds, NO_MAP_TARGETS);

    return strikeAll(unchanged(ps), targets.map((t) => ({ targetId: t.basicInfo.id, amount })), hit);
  }

  const map = input.map;

  const path = flightPath(start, input.targetCell, input.range, map);

  const swept = new Set(path.flatMap((c) => footprint(c, sizeOf(actor))).map(cellKey));

  const victims = ps.filter((p) => isEnemyOf(actor)(p) && cellsOf(p).some((c) => swept.has(cellKey(c))));

  const landing = [...path].reverse().find((c) => canStand(map, ps, actor, c));

  const moved = landing ? replaceParticipant(ps, { ...actor, battleData: { ...actor.battleData, position: landing } }) : ps;

  return strikeAll(unchanged(moved), victims.map((t) => ({ targetId: t.basicInfo.id, amount })), hit);
}
