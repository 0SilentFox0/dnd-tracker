import { attackShare, isEnemyOf, maneuverResult,primaryDamageType, strikeAll } from "./strike";
import type { ManeuverInput, ManeuverResult } from "./types";

import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { cellKey, nearestStandable, participantsInCells } from "@/lib/utils/battle/grid";
import type { Ruleset } from "@/lib/utils/rules";
import type { AirborneState, BattleMapConfig, BattleParticipant } from "@/types/battle";

export function startDive(ps: BattleParticipant[], input: ManeuverInput): ManeuverResult {
  const actor = findParticipant(ps, input.actorId);

  if (!actor) return maneuverResult(ps);

  const onMap = !!input.map && !!actor.battleData.position && !!input.targetCell;

  const target = onMap ? { landAt: input.targetCell } : { ...(input.targetIds[0] && { targetId: input.targetIds[0] }) };

  const airborne: AirborneState = { ...target, since: input.round, percent: input.percentOfAttack, name: input.name };

  const flying: BattleParticipant = { ...actor, battleData: { ...actor.battleData, position: undefined, airborne }, actionFlags: { ...actor.actionFlags, hasUsedAction: true } };

  return maneuverResult(replaceParticipant(ps, flying), [textRef("battleLog.maneuver.diveUp", { name: actor.basicInfo.name, ability: input.name })]);
}

function victimOf(ps: BattleParticipant[], actor: BattleParticipant, map: BattleMapConfig | null | undefined): BattleParticipant | undefined {
  const { landAt, targetId } = actor.battleData.airborne ?? {};

  const enemy = isEnemyOf(actor);

  if (map && landAt) return participantsInCells(ps, [cellKey(landAt)], landAt).find(enemy);

  const target = targetId ? findParticipant(ps, targetId) : undefined;

  return target && enemy(target) ? target : undefined;
}

/** Приземлення на початку ходу: удар по тому, хто на клітинці (без карти — по цілі), і посадка на найближчу вільну клітинку. */
export function landDive(ps: BattleParticipant[], actorId: string, ctx: { map?: BattleMapConfig | null; rng: Rng; rules?: Ruleset }): ManeuverResult {
  const actor = findParticipant(ps, actorId);

  const airborne = actor?.battleData.airborne;

  if (!actor || !airborne) return maneuverResult(ps);

    const battleData = { ...actor.battleData, airborne: undefined };

  const grounded: BattleParticipant = { ...actor, battleData, actionFlags: { ...actor.actionFlags, hasUsedAction: true } };

  let next = replaceParticipant(ps, grounded);

  const anchor = ctx.map && airborne.landAt ? nearestStandable(ctx.map, next, grounded, airborne.landAt) : null;

  if (anchor) next = replaceParticipant(next, { ...grounded, battleData: { ...battleData, position: anchor, turnStartPosition: anchor } });

  const victim = isActive(actor) ? victimOf(next, actor, ctx.map) : undefined;

  if (!victim) return maneuverResult(next, [textRef("battleLog.maneuver.diveMiss", { name: airborne.name })]);

  return strikeAll(maneuverResult(next), [{ targetId: victim.basicInfo.id, amount: attackShare(actor, next, airborne.percent, ctx.rng) }], { actorId, damageType: primaryDamageType(actor), name: airborne.name, rules: ctx.rules, rng: ctx.rng });
}
