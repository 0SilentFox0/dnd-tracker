import { replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { DamagedHook } from "@/lib/utils/rules/systems/types";

export const wfrpLoseChannelled: DamagedHook = (ctx, result) => {
  const { participant } = result;

  if (ctx.amount <= 0 || !participant.battleData.channelledSl) return result;

  const dropped = { ...participant, battleData: { ...participant.battleData, channelledSl: 0 } };

  return { ...result, participant: dropped, participants: replaceParticipant(result.participants, dropped) };
};
