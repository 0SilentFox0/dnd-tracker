import type { BattleParticipant } from "@/types/battle";

export const markKey = (markId: string) => `mark:${markId}`;

export function countMarks(target: BattleParticipant | undefined, markId: string, sourceId: string): number {
  if (!target) return 0;

  return target.battleData.activeEffects.filter((e) => e.abilityKey === markKey(markId) && e.source?.participantId === sourceId).length;
}
