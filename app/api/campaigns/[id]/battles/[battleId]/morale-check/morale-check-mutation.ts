import type { MoraleCheckInput } from "@/lib/schemas";
import { checkMorale } from "@/lib/utils/battle/battle-morale";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import type { PendingMoraleCheckPayload } from "@/lib/utils/battle/turn";

export function moraleCheckMutation(ctx: BattleMutationContext, data: MoraleCheckInput): MutationResult {
  const participant = ctx.participants.find((p) => p.basicInfo.id === data.participantId);

  if (!participant) throw new BattleAccessError(404, "Учасника немає в бою");

  if (!ctx.isDM && participant.basicInfo.controlledBy !== ctx.userId) {
    throw new BattleAccessError(403, "Forbidden");
  }

  const pending = ctx.scene.pendingMoraleCheck as PendingMoraleCheckPayload | null;

  if (pending?.participantId === data.participantId) {
    throw new BattleRuleError("action_used", "Мораль цього учасника вже перевірено в цьому ході");
  }

  const moraleResult = checkMorale(participant, data.d10Roll);

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
