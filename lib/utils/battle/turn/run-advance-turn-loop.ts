/**
 * Логіка циклу переходу ходу: пошук наступного живого учасника, endRound/startOfRound, processStartOfTurn, логи.
 */
import { logTurnTiming } from "./turn-helpers";

import { CombatStatus, SYSTEM_ACTOR } from "@/lib/constants/battle";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import {
  processEndOfTurn,
  processStartOfRound,
  processStartOfTurn,
} from "@/lib/utils/battle/battle-turn";
import { checkVictoryConditions } from "@/lib/utils/battle/battle-victory";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface AdvanceTurnLoopParams {
  initiativeOrder: BattleParticipant[];
  currentTurnIndex: number;
  currentRound: number;
  battleId: string;
  currentBattleLogLength: number;
  pendingSummons: BattleParticipant[];
  rng?: () => number;
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
    rng = Math.random,
  } = params;

  let activeParticipantFound = false;

  let attempts = 0;

  const maxAttempts = initiativeOrder.length * 2;

  let updatedInitiativeOrder = [...initiativeOrder];

  let nextTurnIndex = currentTurnIndex;

  let nextRound = currentRound;

  const newLogEntries: BattleAction[] = [];

  // відкат тепер через battle_snapshots, stateBefore у записах не потрібен
  const getStateBeforeForEntry = () => undefined;

  let clearedPendingSummons = false;

  const systemEntry = (round: number, text: string, tag: string): BattleAction => ({
    id: `${tag}-${round}-${Date.now()}-${attempts}`,
    battleId,
    round,
    actionIndex: currentBattleLogLength + newLogEntries.length,
    timestamp: new Date(),
    ...SYSTEM_ACTOR,
    actionType: "ability",
    targets: [],
    actionDetails: {},
    resultText: text,
    hpChanges: [],
    isCancelled: false,
    stateBefore: getStateBeforeForEntry(),
  });

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
      const roundEnd = runAbilities(updatedInitiativeOrder, { type: "roundEnd" }, { round: previousRound, rng });

      updatedInitiativeOrder = roundEnd.participants;

      if (roundEnd.messages.length > 0) {
        newLogEntries.push(systemEntry(previousRound, `Кінець раунду ${previousRound}: ${roundEnd.messages.join("; ")}`, "triggers-round-end"));
      }

      clearedPendingSummons = true;

      const roundResult = processStartOfRound(
        updatedInitiativeOrder,
        nextRound,
        pendingSummons,
        rng,
      );

      updatedInitiativeOrder = roundResult.updatedInitiativeOrder;

      // індекс обрано за старим порядком; після пересортування раунд починається з початку
      nextTurnIndex = 0;

      if (roundResult.triggerMessages.length > 0) {
        newLogEntries.push({
          id: `triggers-round-${nextRound}-${Date.now()}-${attempts}`,
          battleId,
          round: nextRound,
          actionIndex: currentBattleLogLength + newLogEntries.length,
          timestamp: new Date(),
          ...SYSTEM_ACTOR,
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
      rng,
    );

    logTurnTiming("processStartOfTurn (початок ходу)", tStartTurn, {
      participantId: nextParticipant.basicInfo.id,
      participantName: nextParticipant.basicInfo.name,
    });

    updatedInitiativeOrder = turnResult.participants;

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

    if (turnResult.abilityMessages.length > 0) {
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
        actionDetails: {},
        resultText: `Початок ходу: ${turnResult.abilityMessages.join("; ")}`,
        hpChanges: [],
        isCancelled: false,
        stateBefore: getStateBeforeForEntry(),
      });
    }

    const isAlive =
      turnResult.participant.combatStats.status !== CombatStatus.DEAD &&
      turnResult.participant.combatStats.status !== CombatStatus.UNCONSCIOUS;

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
