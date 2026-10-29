import type { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { auraZoneSchema } from "@/lib/schemas/battles";
import { participantNames } from "@/lib/utils/abilities/engine/core/participants";
import { applyAuraZone, areaAuras, zoneCandidates } from "@/lib/utils/abilities/engine/effects/area-aura";
import { requireActor } from "@/lib/utils/battle/common/control";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";
import { assertCanAct } from "@/lib/utils/battle/turn";


export type AuraZoneBody = z.infer<typeof auraZoneSchema>;

export function auraZoneMutation(ctx: BattleMutationContext, data: AuraZoneBody): MutationResult {
  const owner = requireActor(ctx, data.participantId, {
    missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE,
    forbidden: API_ERRORS.FORBIDDEN,
    inactive: { code: "participant_dead", message: "Учасник не може діяти" },
  });

  const aura = areaAuras(owner).find((a) => a.id === data.auraId);

  if (!aura) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_NO_SUCH_AURA);

  assertCanAct(ctx, owner.basicInfo.id);

  if (!ctx.isDM && owner.battleData.auraZones?.[aura.id] === ctx.scene.round) throw new BattleRuleError("action_used", API_ERRORS.BATTLE_AURA_ZONE_CHOSEN);

  const targetIds = [...new Set(data.targetIds)];

  const allowed = new Set(zoneCandidates(ctx.participants, owner, aura.target).map((p) => p.basicInfo.id));

  if (targetIds.some((id) => !allowed.has(id))) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_TARGET_OUT_OF_SIDE);

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
