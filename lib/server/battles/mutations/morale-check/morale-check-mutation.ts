import { API_ERRORS } from "@/lib/constants/api-errors";
import type { MoraleCheckInput } from "@/lib/schemas";
import { requireActor } from "@/lib/utils/battle/common/control";
import { checkMorale } from "@/lib/utils/battle/morale/check";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError, rejectAction } from "@/lib/utils/battle/store";
import type { PendingMoraleCheckPayload } from "@/lib/utils/battle/turn";

export function moraleCheckMutation(ctx: BattleMutationContext, data: MoraleCheckInput): MutationResult {
  if (!ctx.meta.rules.morale.enabled) rejectAction(API_ERRORS.BATTLE_MORALE_DISABLED);

  const participant = requireActor(ctx, data.participantId, { missing: "Учасника немає в бою", forbidden: API_ERRORS.FORBIDDEN });

  const pending = ctx.scene.pendingMoraleCheck as PendingMoraleCheckPayload | null;

  if (pending?.participantId === data.participantId) {
    throw new BattleRuleError("action_used", API_ERRORS.BATTLE_MORALE_ALREADY_CHECKED);
  }

  if (participant.battleData.extraTurnActive) {
    throw new BattleRuleError("action_used", API_ERRORS.BATTLE_MORALE_EXTRA_TURN);
  }

  const moraleResult = checkMorale(participant, data.d10Roll, ctx.participants);

  const pendingMoraleCheck: PendingMoraleCheckPayload = {
    participantId: data.participantId,
    d10Roll: data.d10Roll,
    moraleResult,
  };

  return {
    participants: ctx.participants,
    pending: ctx.pending,
    scene: { pendingMoraleCheck },
    events: [],
    response: { moraleResult },
  };
}
