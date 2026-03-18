/**
 * Допоміжні функції для start battle API: снапшот стану, лог
 */

import type { BattleParticipant } from "@/types/battle";

export const isBattleSyncDebugEnabled = false;

export interface BattleStateSnapshot {
  status: string | null;
  round: number;
  turnIndex: number;
  initiativeCount: number;
  currentParticipantId: string | null;
  currentParticipantName: string | null;
  currentParticipantSide: string | null;
}

export function battleStateSnapshot(
  initiativeOrder: BattleParticipant[],
  currentTurnIndex: number,
  currentRound: number,
  status?: string,
): BattleStateSnapshot {
  const current = initiativeOrder[currentTurnIndex]?.basicInfo;

  return {
    status: status ?? null,
    round: currentRound,
    turnIndex: currentTurnIndex,
    initiativeCount: initiativeOrder.length,
    currentParticipantId: current?.id ?? null,
    currentParticipantName: current?.name ?? null,
    currentParticipantSide: current?.side ?? null,
  };
}

export function debugBattleSync(message: string, payload?: unknown) {
  if (!isBattleSyncDebugEnabled) return;

  if (payload === undefined) {
    console.info("[battle-sync][start-battle]", message);

    return;
  }

  console.info("[battle-sync][start-battle]", message, payload);
}
