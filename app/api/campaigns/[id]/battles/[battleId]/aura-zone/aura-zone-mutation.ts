import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { applyAuraZone, areaAuras, AuraZoneError } from "@/lib/utils/abilities/engine/area-aura";
import { findParticipant, isActive, participantNames } from "@/lib/utils/abilities/engine/participants";
import { canActNow } from "@/lib/utils/battle/common/control";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";

export const auraZoneSchema = z.object({
  participantId: z.string(),
  auraId: z.string(),
  targetIds: z.array(z.string()).max(50),
});

export type AuraZoneBody = z.infer<typeof auraZoneSchema>;

export function auraZoneMutation(ctx: BattleMutationContext, data: AuraZoneBody): MutationResult {
  const owner = findParticipant(ctx.participants, data.participantId);

  if (!owner) throw new BattleAccessError(404, "Учасника немає в бою");

  if (!canActNow(ctx, owner, ctx.participants[ctx.scene.turnIndex])) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  if (!isActive(owner)) throw new BattleRuleError("participant_dead", "Учасник не може діяти");

  const aura = areaAuras(owner).find((a) => a.id === data.auraId);

  if (!aura) throw new BattleRuleError("action_rejected", "У учасника немає такої аури");

  const targetIds = [...new Set(data.targetIds)];

  let participants;

  try {
    participants = applyAuraZone(ctx.participants, owner.basicInfo.id, aura.id, targetIds, ctx.scene.round);
  } catch (e) {
    if (e instanceof AuraZoneError) throw new BattleRuleError("action_rejected", e.message);

    throw e;
  }

  const who = targetIds.length ? participantNames(ctx.participants, targetIds) : "нікого";

  return {
    participants,
    pending: ctx.pending,
    events: [
      {
        type: "ability",
        round: ctx.scene.round,
        actorId: owner.basicInfo.id,
        resultText: `${aura.ability.name}: у зоні — ${who}`,
        details: { actorName: owner.basicInfo.name, actorSide: owner.basicInfo.side, actionDetails: { abilityKey: aura.ability.key, skillName: aura.ability.name } },
      },
    ],
  };
}
