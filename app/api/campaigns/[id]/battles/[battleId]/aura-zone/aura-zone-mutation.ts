import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { findParticipant, isActive, participantNames } from "@/lib/utils/abilities/engine/core/participants";
import { applyAuraZone, areaAuras, zoneCandidates } from "@/lib/utils/abilities/engine/effects/area-aura";
import { canActNow } from "@/lib/utils/battle/common/control";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { assertNotPanicking } from "@/lib/utils/battle/turn";

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

  assertNotPanicking(ctx.scene.pendingMoraleCheck, owner.basicInfo.id);

  if (!ctx.isDM && owner.battleData.auraZones?.[aura.id] === ctx.scene.round) throw new BattleRuleError("action_used", "Зону цієї аури вже обрано в цьому раунді");

  const targetIds = [...new Set(data.targetIds)];

  const allowed = new Set(zoneCandidates(ctx.participants, owner, aura.target).map((p) => p.basicInfo.id));

  if (targetIds.some((id) => !allowed.has(id))) throw new BattleRuleError("action_rejected", "Ціль поза доступною стороною");

  const participants = applyAuraZone(ctx.participants, owner, aura, targetIds, ctx.scene.round);

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
