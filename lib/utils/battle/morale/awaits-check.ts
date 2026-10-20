import { effectiveMorale } from "./effective-morale";

import type { PendingMoraleCheckPayload } from "@/lib/utils/battle/turn/pending-morale";
import type { BattleParticipant } from "@/types/battle";

export interface MoraleScope {
  participants: BattleParticipant[];
  scene: { turnIndex: number; pendingMoraleCheck: unknown };
}

// мораль могла змінитися посеред ходу (вбивство, вміння) — перевірка потрібна лише до першої дії
const hasActedThisTurn = (p: BattleParticipant) =>
  p.actionFlags.hasUsedAction || p.actionFlags.hasUsedBonusAction || (p.battleData.movementUsed ?? 0) > 0 || !!p.battleData.returnedThisTurn;

export function awaitsMoraleCheck(scope: MoraleScope, participantId: string): boolean {
  const current = scope.participants[scope.scene.turnIndex];

  if (!current || current.basicInfo.id !== participantId || current.battleData.extraTurnActive || hasActedThisTurn(current)) return false;

  if ((scope.scene.pendingMoraleCheck as PendingMoraleCheckPayload | null)?.participantId === participantId) return false;

  return effectiveMorale(current, scope.participants).value !== 0;
}
