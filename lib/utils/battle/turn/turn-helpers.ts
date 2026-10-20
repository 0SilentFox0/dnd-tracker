import { BattleStatus } from "@/lib/constants/battle";
import { checkVictoryConditions, completeBattle } from "@/lib/utils/battle/turn/victory";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface ApplyVictoryParams {
  updatedInitiativeOrder: BattleParticipant[];
  battleStatus: string;
  battleId: string;
  nextRound: number;
  currentBattleLogLength: number;
  newLogEntries: BattleAction[];
  reserve?: BattleParticipant[];
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
  const { updatedInitiativeOrder: order, battleStatus, battleId, nextRound, currentBattleLogLength, newLogEntries, reserve = [], getStateBeforeForEntry } = params;

  const { result } = checkVictoryConditions(order, reserve);

  if (!result || battleStatus !== BattleStatus.ACTIVE) return { updatedInitiativeOrder: order, finalStatus: battleStatus, completedAt: null };

  const { updatedParticipants, battleAction } = completeBattle(order, result, nextRound);

  newLogEntries.push({ ...battleAction, battleId, actionIndex: currentBattleLogLength + newLogEntries.length, stateBefore: getStateBeforeForEntry() });

  return { updatedInitiativeOrder: updatedParticipants, finalStatus: BattleStatus.COMPLETED, completedAt: new Date() };
}
