import type { BattleAction } from "@/types/battle";

export function damageTaken(action: BattleAction, participantId: string | undefined): number {
  return action.hpChanges.filter((h) => h.participantId === participantId).reduce((sum, h) => sum + Math.max(0, h.change), 0);
}
