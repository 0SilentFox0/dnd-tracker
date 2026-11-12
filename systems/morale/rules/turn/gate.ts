import { awaitsMoraleCheck } from "@/lib/utils/battle/morale/awaits-check";
import type { PendingMoraleCheckPayload } from "@/lib/utils/battle/morale/threshold";
import { REJECT } from "@/lib/utils/battle/store/reject";
import type { ActGate } from "@/lib/utils/rules/systems/types";

export function isPanicking(pendingMoraleCheck: unknown, participantId: string): boolean {
  const pending = pendingMoraleCheck as PendingMoraleCheckPayload | null;

  return pending?.participantId === participantId && pending.moraleResult.shouldSkipTurn;
}

export const moraleGate: ActGate = (scope, participantId, { phase, skipCheck }) => {
  if (phase === "end" || !skipCheck) {
    if (awaitsMoraleCheck(scope, participantId)) return { code: "action_rejected", key: REJECT.moraleFirst };
  }

  if (phase === "act" && isPanicking(scope.scene.pendingMoraleCheck, participantId)) return { code: "action_used", key: REJECT.panicSkip };

  return null;
};
