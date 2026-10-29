import { optionArg } from "../text";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { textRef } from "@/lib/i18n/text-ref";
import type { Effect, Maneuver } from "@/lib/utils/abilities/schema";
import { MANEUVER_RUNNERS } from "@/lib/utils/battle/maneuvers";
import type { LogLine } from "@/types/text";

export const MANEUVERS: readonly Maneuver[] = ["dive", "squall", "fireBurst"];

export function describeManeuver(e: Extract<Effect, { kind: "maneuver" }>): LogLine {
  return textRef("abilityText.effects.maneuver", { maneuver: optionArg("maneuver", e.maneuver), percent: e.percentOfAttack });
}

export function applyManeuver(input: EffectApplyInput<Extract<Effect, { kind: "maneuver" }>>): EffectApplyResult {
  const { event, ability, effect, ctx } = input;

  if (event.type !== "action" && event.type !== "bonusAction") return { participants: input.participants, messages: [] };

  const r = MANEUVER_RUNNERS[effect.maneuver](input.participants, {
    actorId: input.ownerId,
    name: ability.name,
    percentOfAttack: effect.percentOfAttack,
    targetIds: event.targetIds ?? [],
    ...(event.targetCell && { targetCell: event.targetCell }),
    ...(ability.aim && { range: ability.aim.range }),
    ...(ability.maxTargets && { maxTargets: ability.maxTargets }),
    map: ctx.map,
    round: ctx.round,
    rng: ctx.rng,
    rules: ctx.rules,
  });

  return { participants: r.participants, messages: r.messages, downed: r.downed };
}
