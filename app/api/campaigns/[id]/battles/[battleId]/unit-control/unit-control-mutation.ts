import { z } from "zod";

import { DM_ACTOR } from "@/lib/constants/battle";
import { freeUnits, ownerHeroNames, randomizeUnitControl, setUnitController } from "@/lib/utils/battle/participant/unit-control";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";

export const unitControlSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("assign"), participantId: z.string().min(1), controlledBy: z.string().min(1) }),
  z.object({ mode: z.literal("random") }),
]);

export type UnitControlBody = z.infer<typeof unitControlSchema>;

export function unitControlMutation(ctx: BattleMutationContext, body: UnitControlBody): MutationResult {
  const dmUserId = ctx.userId;

  const text = body.mode === "assign" ? assign(ctx, body, dmUserId) : random(ctx, dmUserId);

  return {
    participants: text.participants,
    pending: ctx.pending,
    events: [
      {
        type: "ability",
        round: ctx.scene.round,
        actorId: DM_ACTOR.actorId,
        resultText: text.resultText,
        details: { actorName: DM_ACTOR.actorName, actorSide: DM_ACTOR.actorSide, actionDetails: {} },
      },
    ],
  };
}

function assign(ctx: BattleMutationContext, body: Extract<UnitControlBody, { mode: "assign" }>, dmUserId: string) {
  const participants = setUnitController(ctx.participants, body.participantId, body.controlledBy, dmUserId);

  const unit = participants.find((p) => p.basicInfo.id === body.participantId);

  const owner = unit?.basicInfo.controlledBy ?? body.controlledBy;

  const who = ownerHeroNames(participants, owner) || "ДМ";

  return { participants, resultText: `🎮 ДМ передає ${unit?.basicInfo.name} під керування ${who}` };
}

function random(ctx: BattleMutationContext, dmUserId: string) {
  const free = freeUnits(ctx.participants, dmUserId);

  const participants = randomizeUnitControl(ctx.participants, dmUserId, ctx.rng ?? Math.random);

  const given = free.flatMap((u) => {
    const after = participants.find((p) => p.basicInfo.id === u.basicInfo.id);

    return after && after.basicInfo.controlledBy !== u.basicInfo.controlledBy ? [`${u.basicInfo.name} → ${ownerHeroNames(participants, after.basicInfo.controlledBy)}`] : [];
  });

  if (given.length === 0) throw new BattleRuleError("action_rejected", "Немає вільних юнітів або гравців із героями на цій стороні");

  return { participants, resultText: `🎲 ДМ роздає вільних юнітів: ${given.join(", ")}` };
}
