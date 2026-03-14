/**
 * Advances turn after attack: processEndOfTurn loop, startOfRound/startOfTurn,
 * victory check. Used by attack-and-next-turn route.
 */

import { ParticipantSide } from "@/lib/constants/battle";
import {
  processEndOfTurn,
  processStartOfRound,
  processStartOfTurn,
} from "@/lib/utils/battle/battle-turn";
import {
  calculateAllyHpChangesOnVictory,
  checkVictoryConditions,
} from "@/lib/utils/battle/battle-victory";
import { slimInitiativeOrderForStorage } from "@/lib/utils/battle/strip-battle-payload";
import { executeSkillsByTrigger } from "@/lib/utils/skills/skill-triggers-execution";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export type AdvanceTurnPhaseInput = {
  initiativeOrder: BattleParticipant[];
  currentTurnIndex: number;
  currentRound: number;
  battleId: string;
  battleLogLength: number;
  pendingSummons: BattleParticipant[];
  battleStatus: string;
};

export type AdvanceTurnPhaseResult = {
  updatedInitiativeOrder: BattleParticipant[];
  nextTurnIndex: number;
  nextRound: number;
  newLogEntries: BattleAction[];
  finalStatus: string;
  completedAt: Date | null;
  clearedPendingSummons: boolean;
};

export function advanceTurnPhase(
  input: AdvanceTurnPhaseInput,
): AdvanceTurnPhaseResult {
  const {
    initiativeOrder,
    currentTurnIndex,
    currentRound,
    battleId,
    battleLogLength,
    pendingSummons,
    battleStatus,
  } = input;

  let activeParticipantFound = false;

  let attempts = 0;

  const maxAttempts = initiativeOrder.length * 2;

  let updatedInitiativeOrder = [...initiativeOrder];

  let nextTurnIndex = currentTurnIndex;

  let nextRound = currentRound;

  const stateBeforeNextTurn = {
    initiativeOrder: slimInitiativeOrderForStorage(
      structuredClone(initiativeOrder) as BattleParticipant[],
    ),
    currentTurnIndex,
    currentRound,
  };

  const newLogEntries: BattleAction[] = [];

  let stateBeforeAddedToBatch = false;

  const getStateBeforeForEntry = () => {
    if (stateBeforeAddedToBatch) return undefined;

    stateBeforeAddedToBatch = true;

    return stateBeforeNextTurn;
  };

  let clearedPendingSummons = false;

  while (!activeParticipantFound && attempts < maxAttempts) {
    attempts++;

    const turnTransition = processEndOfTurn(
      nextTurnIndex,
      updatedInitiativeOrder,
      nextRound,
    );

    const previousRound = nextRound;

    nextTurnIndex = turnTransition.nextTurnIndex;
    nextRound = turnTransition.nextRound;

    if (nextRound > previousRound) {
      const afterEndRound = updatedInitiativeOrder.map((participant) => {
        const result = executeSkillsByTrigger(
          participant,
          "endRound",
          updatedInitiativeOrder,
          { currentRound: previousRound },
        );

        return result.participant;
      });

      updatedInitiativeOrder = afterEndRound;
      clearedPendingSummons = true;

      const roundResult = processStartOfRound(
        updatedInitiativeOrder,
        nextRound,
        pendingSummons,
      );

      updatedInitiativeOrder = roundResult.updatedInitiativeOrder;

      if (roundResult.triggerMessages.length > 0) {
        newLogEntries.push({
          id: `triggers-round-${nextRound}-${Date.now()}-${attempts}`,
          battleId,
          round: nextRound,
          actionIndex: battleLogLength + newLogEntries.length,
          timestamp: new Date(),
          actorId: "system",
          actorName: "Система",
          actorSide: "ally",
          actionType: "ability",
          targets: [],
          actionDetails: {},
          resultText: `Тригери початку раунду ${nextRound}: ${roundResult.triggerMessages.join("; ")}`,
          hpChanges: [],
          isCancelled: false,
          stateBefore: getStateBeforeForEntry(),
        });
      }
    }

    const nextParticipant = updatedInitiativeOrder[nextTurnIndex];

    if (!nextParticipant) break;

    const turnResult = processStartOfTurn(
      nextParticipant,
      nextRound,
      updatedInitiativeOrder,
    );

    updatedInitiativeOrder[nextTurnIndex] = turnResult.participant;

    if (turnResult.damageMessages.length > 0) {
      newLogEntries.push({
        id: `turn-${nextTurnIndex}-${Date.now()}-${attempts}`,
        battleId,
        round: nextRound,
        actionIndex: battleLogLength + newLogEntries.length,
        timestamp: new Date(),
        actorId: turnResult.participant.basicInfo.id,
        actorName: turnResult.participant.basicInfo.name,
        actorSide: turnResult.participant.basicInfo.side,
        actionType: "end_turn",
        targets: [],
        actionDetails: {
          damageRolls: turnResult.damageMessages.map(() => ({
            dice: "DOT",
            results: [],
            total: 0,
            damageType: "dot",
          })),
        },
        resultText: turnResult.damageMessages.join("; "),
        hpChanges: [
          {
            participantId: turnResult.participant.basicInfo.id,
            participantName: turnResult.participant.basicInfo.name,
            oldHp: nextParticipant.combatStats.currentHp,
            newHp: turnResult.participant.combatStats.currentHp,
            change:
              turnResult.participant.combatStats.currentHp -
              nextParticipant.combatStats.currentHp,
          },
        ],
        isCancelled: false,
        stateBefore: getStateBeforeForEntry(),
      });
    }

    if (turnResult.expiredEffects.length > 0) {
      newLogEntries.push({
        id: `effects-${nextTurnIndex}-${Date.now()}-${attempts}`,
        battleId,
        round: nextRound,
        actionIndex: battleLogLength + newLogEntries.length,
        timestamp: new Date(),
        actorId: turnResult.participant.basicInfo.id,
        actorName: turnResult.participant.basicInfo.name,
        actorSide: turnResult.participant.basicInfo.side,
        actionType: "ability",
        targets: [],
        actionDetails: {
          appliedEffects: turnResult.expiredEffects.map((name) => ({
            id: name,
            name,
            duration: 0,
          })),
        },
        resultText: `Ефекти завершилися: ${turnResult.expiredEffects.join(", ")}`,
        hpChanges: [],
        isCancelled: false,
        stateBefore: getStateBeforeForEntry(),
      });
    }

    if (turnResult.triggeredAbilities.length > 0) {
      newLogEntries.push({
        id: `triggers-turn-${nextTurnIndex}-${Date.now()}-${attempts}`,
        battleId,
        round: nextRound,
        actionIndex: battleLogLength + newLogEntries.length,
        timestamp: new Date(),
        actorId: turnResult.participant.basicInfo.id,
        actorName: turnResult.participant.basicInfo.name,
        actorSide: turnResult.participant.basicInfo.side,
        actionType: "ability",
        targets: [],
        actionDetails: {
          triggeredAbilities: turnResult.triggeredAbilities.map((name) => ({
            id: name,
            name,
          })),
        },
        resultText: `Тригери початку ходу: ${turnResult.triggeredAbilities.join(", ")}`,
        hpChanges: [],
        isCancelled: false,
        stateBefore: getStateBeforeForEntry(),
      });
    }

    const isAlive =
      turnResult.participant.combatStats.status !== "dead" &&
      turnResult.participant.combatStats.status !== "unconscious";

    if (isAlive) activeParticipantFound = true;

    const victoryCheck = checkVictoryConditions(updatedInitiativeOrder);

    if (victoryCheck.result && battleStatus === "active") break;
  }

  const victoryCheck = checkVictoryConditions(updatedInitiativeOrder);

  let finalStatus = battleStatus;

  let completedAt: Date | null = null;

  if (victoryCheck.result && battleStatus === "active") {
    finalStatus = "completed";
    completedAt = new Date();

    if (victoryCheck.result === "victory") {
      updatedInitiativeOrder = updatedInitiativeOrder.map((participant) => {
        if (
          participant.basicInfo.side === ParticipantSide.ALLY &&
          participant.combatStats.status === "unconscious"
        ) {
          return {
            ...participant,
            combatStats: {
              ...participant.combatStats,
              currentHp: participant.combatStats.maxHp,
              status: "active",
            },
          };
        }

        return participant;
      });
    }

    newLogEntries.push({
      id: `battle-complete-${Date.now()}`,
      battleId,
      round: nextRound,
      actionIndex: battleLogLength + newLogEntries.length,
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
    });
  }

  return {
    updatedInitiativeOrder,
    nextTurnIndex,
    nextRound,
    newLogEntries,
    finalStatus,
    completedAt,
    clearedPendingSummons,
  };
}
