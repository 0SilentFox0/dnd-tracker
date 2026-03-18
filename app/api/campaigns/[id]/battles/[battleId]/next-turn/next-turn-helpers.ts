/**
 * Допоміжні функції для next-turn API: логування, снапшот стану, перемога
 */

import { ParticipantSide } from "@/lib/constants/battle";
import {
  calculateAllyHpChangesOnVictory,
  checkVictoryConditions,
} from "@/lib/utils/battle/battle-victory";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export const isBattleSyncDebugEnabled = false;

export function logTurnTiming(
  _label?: string,
  _startMs?: number,
  _extra?: Record<string, number | string>,
) {
  void _label;
  void _startMs;
  void _extra;
  // Логування вимкнено
}

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
    console.info("[battle-sync][next-turn]", message);

    return;
  }

  console.info("[battle-sync][next-turn]", message, payload);
}

export interface ApplyVictoryParams {
  updatedInitiativeOrder: BattleParticipant[];
  initiativeOrder: BattleParticipant[];
  battleStatus: string;
  battleId: string;
  nextRound: number;
  currentBattleLogLength: number;
  newLogEntries: BattleAction[];
  getStateBeforeForEntry: () =>
    | {
        initiativeOrder: BattleParticipant[];
        currentTurnIndex: number;
        currentRound: number;
      }
    | undefined;
}

export interface ApplyVictoryResult {
  updatedInitiativeOrder: BattleParticipant[];
  finalStatus: string;
  completedAt: Date | null;
}

export function applyVictoryCompletion(params: ApplyVictoryParams): ApplyVictoryResult {
  const {
    updatedInitiativeOrder: order,
    initiativeOrder,
    battleStatus,
    battleId,
    nextRound,
    currentBattleLogLength,
    newLogEntries,
    getStateBeforeForEntry,
  } = params;

  const victoryCheck = checkVictoryConditions(order);

  let finalStatus = battleStatus;

  let completedAt: Date | null = null;

  let updatedInitiativeOrder = order;

  if (victoryCheck.result && battleStatus === "active") {
    finalStatus = "completed";
    completedAt = new Date();

    if (victoryCheck.result === "victory") {
      updatedInitiativeOrder = order.map((participant) => {
        if (
          participant.basicInfo.side === ParticipantSide.ALLY &&
          participant.combatStats.status === "unconscious"
        ) {
          return {
            ...participant,
            combatStats: {
              ...participant.combatStats,
              currentHp: participant.combatStats.maxHp,
              status: "active" as const,
            },
          };
        }

        return participant;
      });
    }

    const completionAction: BattleAction = {
      id: `battle-complete-${Date.now()}`,
      battleId,
      round: nextRound,
      actionIndex: currentBattleLogLength + newLogEntries.length,
      timestamp: new Date(),
      actorId: "system",
      actorName: "Система",
      actorSide: "ally",
      actionType: "end_turn",
      targets: [],
      actionDetails: {},
      resultText: victoryCheck.message,
      hpChanges: calculateAllyHpChangesOnVictory(
        initiativeOrder,
        updatedInitiativeOrder,
        victoryCheck,
      ),
      isCancelled: false,
      stateBefore: getStateBeforeForEntry(),
    };

    newLogEntries.push(completionAction);
  }

  return { updatedInitiativeOrder, finalStatus, completedAt };
}
