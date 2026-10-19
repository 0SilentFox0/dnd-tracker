import { attackShare, isEnemyOf, maneuverResult,primaryDamageType, strikeAll } from "./strike";
import type { ManeuverInput, ManeuverResult } from "./types";

import { findParticipant, isActive, replaceParticipant, resolvedAbilitiesOf } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { cellKey, cellsOf, nearestStandable } from "@/lib/utils/battle/grid";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const DEFAULT_PERCENT = 200;

export function startDive(ps: BattleParticipant[], input: ManeuverInput): ManeuverResult {
  const actor = findParticipant(ps, input.actorId);

  if (!actor) return maneuverResult(ps);

  const onMap = !!input.map && !!actor.battleData.position && !!input.targetCell;

  const airborne = onMap ? { landAt: input.targetCell, since: input.round } : { ...(input.targetIds[0] && { targetId: input.targetIds[0] }), since: input.round };

  const flying: BattleParticipant = { ...actor, battleData: { ...actor.battleData, position: undefined, airborne }, actionFlags: { ...actor.actionFlags, hasUsedAction: true } };

  return maneuverResult(replaceParticipant(ps, flying), [`🦅 ${actor.basicInfo.name} злітає в небо (${input.name})`]);
}

function diveAbility(p: BattleParticipant): { name: string; percent: number } {
  for (const a of resolvedAbilitiesOf(p)) {
    const e = a.effects.find((x) => x.kind === "maneuver" && x.maneuver === "dive");

    if (e?.kind === "maneuver") return { name: a.name, percent: e.percentOfAttack };
  }

  return { name: "Пікірування", percent: DEFAULT_PERCENT };
}

function victimOf(ps: BattleParticipant[], actor: BattleParticipant, map: BattleMapConfig | null | undefined): BattleParticipant | undefined {
  const { landAt, targetId } = actor.battleData.airborne ?? {};

  const enemy = isEnemyOf(actor);

  if (map && landAt) return ps.find((p) => enemy(p) && cellsOf(p).some((c) => cellKey(c) === cellKey(landAt)));

  const target = targetId ? findParticipant(ps, targetId) : undefined;

  return target && enemy(target) ? target : undefined;
}

/** Приземлення на початку ходу: удар по тому, хто на клітинці (без карти — по цілі), і посадка на найближчу вільну клітинку. */
export function landDive(ps: BattleParticipant[], actorId: string, ctx: { map?: BattleMapConfig | null; rng: Rng }): ManeuverResult {
  const actor = findParticipant(ps, actorId);

  const airborne = actor?.battleData.airborne;

  if (!actor || !airborne) return maneuverResult(ps);

  const { name, percent } = diveAbility(actor);

  const battleData = { ...actor.battleData, airborne: undefined };

  const grounded: BattleParticipant = { ...actor, battleData, actionFlags: { ...actor.actionFlags, hasUsedAction: true } };

  let next = replaceParticipant(ps, grounded);

  const anchor = ctx.map && airborne.landAt ? nearestStandable(ctx.map, next, grounded, airborne.landAt) : null;

  if (anchor) next = replaceParticipant(next, { ...grounded, battleData: { ...battleData, position: anchor, turnStartPosition: anchor } });

  const victim = isActive(actor) ? victimOf(next, actor, ctx.map) : undefined;

  if (!victim) return maneuverResult(next, [`🦅 ${name}: удар у порожнечу`]);

  return strikeAll(maneuverResult(next), [{ targetId: victim.basicInfo.id, amount: attackShare(actor, next, percent, ctx.rng) }], { actorId, damageType: primaryDamageType(actor), name });
}
