import type { MoraleCheckResult } from "@/lib/utils/battle/battle-morale";
import { BattleRuleError } from "@/lib/utils/battle/store/errors";

export interface PendingMoraleCheckPayload {
  participantId: string;
  d10Roll: number;
  moraleResult: MoraleCheckResult;
}

export function assertNotPanicking(pendingMoraleCheck: unknown, participantId: string): void {
  const pending = pendingMoraleCheck as PendingMoraleCheckPayload | null;

  if (pending?.participantId === participantId && pending.moraleResult.shouldSkipTurn) {
    throw new BattleRuleError("action_used", "Учасник у паніці й пропускає хід");
  }
}
