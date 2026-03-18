/**
 * Логіка циклу переходу ходу: пошук наступного живого учасника, endRound/startOfRound, processStartOfTurn, логи.
 */

import { logTurnTiming } from "./next-turn-helpers";

import {
  processEndOfTurn,
  processStartOfRound,
  processStartOfTurn,
} from "@/lib/utils/battle/battle-turn";
import { checkVictoryConditions } from "@/lib/utils/battle/battle-victory";
import { slimInitiativeOrderForStorage } from "@/lib/utils/battle/strip-battle-payload";
import { executeSkillsByTrigger } from "@/lib/utils/skills/execution";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface AdvanceTurnLoopParams {
  initiativeOrder: BattleParticipant[];
  currentTurnIndex: number;
  currentRound: number;
  battleId: string;
  currentBattleLogLength: number;
  pendingSummons: BattleParticipant[];
}

export interface AdvanceTurnLoopResult {
  updatedInitiativeOrder: BattleParticipant[];
  nextTurnIndex: number;
  nextRound: number;
  newLogEntries: BattleAction[];
  clearedPendingSummons: boolean;
}

export function runAdvanceTurnLoop(
  params: AdvanceTurnLoopParams,
): AdvanceTurnLoopResult {
  const {
    initiativeOrder,
    currentTurnIndex,
    currentRound,
    battleId,
    currentBattleLogLength,
    pendingSummons,
  } = params;

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

    const tStep = Date.now();

    const turnTransition = processEndOfTurn(
      nextTurnIndex,
      updatedInitiativeOrder,
      nextRound,
    );

    const previousRound = nextRound;

    nextTurnIndex = turnTransition.nextTurnIndex;
    nextRound = turnTransition.nextRound;
    logTurnTiming("processEndOfTurn (переключення на наступного гравця)", tStep, {
      attempt: attempts,
      nextTurnIndex,
      nextRound,
    });

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
          actionIndex: currentBattleLogLength + newLogEntries.length,
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

    const tStartTurn = Date.now();

    const turnResult = processStartOfTurn(
      nextParticipant,
      nextRound,
      updatedInitiativeOrder,
    );

    logTurnTiming("processStartOfTurn (початок ходу)", tStartTurn, {
      participantId: nextParticipant.basicInfo.id,
      participantName: nextParticipant.basicInfo.name,
    });

    updatedInitiativeOrder[nextTurnIndex] = turnResult.participant;

    if (turnResult.damageMessages.length > 0) {
      newLogEntries.push({
        id: `turn-${nextTurnIndex}-${Date.now()}-${attempts}`,
        battleId,
        round: nextRound,
        actionIndex: currentBattleLogLength + newLogEntries.length,
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
        actionIndex: currentBattleLogLength + newLogEntries.length,
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
        actionIndex: currentBattleLogLength + newLogEntries.length,
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

    if (victoryCheck.result) break;
  }

  return {
    updatedInitiativeOrder,
    nextTurnIndex,
    nextRound,
    newLogEntries,
    clearedPendingSummons,
  };
}
