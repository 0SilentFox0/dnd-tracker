import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { textRef } from "@/lib/i18n/text-ref";
import { ownerHeroNames, randomizeUnitControl, setUnitController } from "@/lib/utils/battle/participant/unit-control";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError, dmEvent } from "@/lib/utils/battle/store";

export const unitControlSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("assign"), participantId: z.string().min(1), controlledBy: z.string().min(1) }),
  z.object({ mode: z.literal("random") }),
]);

export type UnitControlBody = z.infer<typeof unitControlSchema>;

export function unitControlMutation(ctx: BattleMutationContext, body: UnitControlBody): MutationResult {
  const outcome = body.mode === "assign" ? assign(ctx, body) : random(ctx);

  return {
    participants: outcome.participants,
    pending: ctx.pending,
    events: [dmEvent(ctx.scene.round, outcome.text)],
  };
}

function assign(ctx: BattleMutationContext, body: Extract<UnitControlBody, { mode: "assign" }>) {
  const result = setUnitController(ctx.participants, body.participantId, body.controlledBy, ctx.userId);

  if ("error" in result) throw new BattleRuleError("invalid_target", result.error);

  const owner = result.unit.basicInfo.controlledBy;

  const who = ownerHeroNames(result.participants, owner) || textRef("battleLog.dm.name");

  return { participants: result.participants, text: textRef("battleLog.dm.unitAssigned", { unit: result.unit.basicInfo.name, who }) };
}

function random(ctx: BattleMutationContext) {
  const { participants, assigned } = randomizeUnitControl(ctx.participants, ctx.userId, ctx.rng ?? Math.random);

  if (assigned.length === 0) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_NO_CONTROLLABLE_UNITS);

  const given = assigned.map(({ unit, owner }) => `${unit.basicInfo.name} → ${ownerHeroNames(participants, owner)}`);

  return { participants, text: textRef("battleLog.dm.unitsRandomized", { list: given.join(", ") }) };
}
