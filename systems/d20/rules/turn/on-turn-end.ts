import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { TurnHook, TurnSubjectCtx } from "@/lib/utils/rules/systems/types";
import { dropConcentration, hasConcentration } from "@/systems/d20/rules/concentration/sustain";

/** A long cast ends with its caster's turn when concentration is gone or its round has passed */
export const d20DropStalePendingCast: TurnHook<TurnSubjectCtx> = ({ participants, id, round }) => {
  const p = findParticipant(participants, id);

  const cast = p?.battleData.pendingCast;

  if (!p || !cast || (hasConcentration(p) && cast.lastRound >= round)) return { participants, messages: [] };

  const dropped = dropConcentration([p], id, textRef("battleLog.concentration.reasons.castSkipped"));

  const next = { ...dropped.participants[0], battleData: { ...dropped.participants[0].battleData, pendingCast: undefined } };

  return { participants: replaceParticipant(participants, next), messages: dropped.messages };
};
