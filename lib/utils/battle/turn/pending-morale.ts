import { awaitsMoraleCheck, type MoraleScope } from "@/lib/utils/battle/morale/awaits-check";
import type { MoraleCheckResult } from "@/lib/utils/battle/morale/check";
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

export function assertMoraleResolved(scope: MoraleScope, participantId: string): void {
  if (awaitsMoraleCheck(scope, participantId)) throw new BattleRuleError("action_rejected", "Спершу потрібна перевірка моралі");
}

export function assertCanAct(scope: MoraleScope, participantId: string, opts: { skipMorale?: boolean } = {}): void {
  if (!opts.skipMorale) assertMoraleResolved(scope, participantId);

  assertNotPanicking(scope.scene.pendingMoraleCheck, participantId);
}
