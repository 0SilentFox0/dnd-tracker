/**
 * Застосовує збережену перевірку моралі (pendingMoraleCheck) при next-turn:
 * extra turn слот, тригери onMoraleSuccess/allyMoraleCheck, запис у battleLog.
 */

import { executeSkillsByTrigger } from "@/lib/utils/skills/execution";
import type { BattleAction, BattleParticipant } from "@/types/battle";
import type { PendingMoraleCheckPayload } from "../morale-check/route";

export interface ApplyPendingMoraleResult {
  updatedInitiativeOrder: BattleParticipant[];
  moraleLogEntry: BattleAction;
}

export function applyPendingMoraleCheck(
  initiativeOrder: BattleParticipant[],
  payload: PendingMoraleCheckPayload,
  currentRound: number,
  battleId: string,
  battleLogLength: number,
): ApplyPendingMoraleResult {
  const { participantId, d10Roll, moraleResult } = payload;

  const participant = initiativeOrder.find(
    (p) => p.basicInfo.id === participantId,
  );

  if (!participant) {
    return {
      updatedInitiativeOrder: initiativeOrder,
      moraleLogEntry: {
        id: `morale-skip-${Date.now()}`,
        battleId,
        round: currentRound,
        actionIndex: battleLogLength,
        timestamp: new Date(),
        actorId: participantId,
        actorName: "?",
        actorSide: "ally",
        actionType: "ability",
        targets: [],
        actionDetails: { d10Roll, morale: 0 },
        resultText: "Учасник не знайдений в initiativeOrder",
        hpChanges: [],
        isCancelled: false,
        stateBefore: undefined,
      },
    };
  }

  let updatedInitiativeOrder = [...initiativeOrder];

  if (moraleResult.hasExtraTurn) {
    const extraParticipant: BattleParticipant = {
      ...participant,
      basicInfo: {
        ...participant.basicInfo,
        id: `${participant.basicInfo.id}-extra-${Date.now()}`,
        isExtraTurnSlot: true,
      },
      actionFlags: {
        ...participant.actionFlags,
        hasExtraTurn: false,
        hasUsedAction: false,
        hasUsedBonusAction: false,
        hasUsedReaction: false,
      },
    };
    updatedInitiativeOrder.push(extraParticipant);
  }

  const triggerMessages: string[] = [];
  const moraleSuccess =
    moraleResult.hasExtraTurn || !moraleResult.shouldSkipTurn;

  if (moraleSuccess) {
    const participantIdx = updatedInitiativeOrder.findIndex(
      (p) => p.basicInfo.id === participant.basicInfo.id,
    );
    if (participantIdx >= 0) {
      const result = executeSkillsByTrigger(
        updatedInitiativeOrder[participantIdx],
        "onMoraleSuccess",
        updatedInitiativeOrder,
        { currentRound },
      );
      triggerMessages.push(...result.messages);
      updatedInitiativeOrder = updatedInitiativeOrder.map((p, i) =>
        i === participantIdx ? result.participant : p,
      );
    }
  }

  const allies = updatedInitiativeOrder.filter(
    (p) =>
      p.basicInfo.side === participant.basicInfo.side &&
      p.basicInfo.id !== participant.basicInfo.id,
  );
  for (const ally of allies) {
    const allyIdx = updatedInitiativeOrder.findIndex(
      (p) => p.basicInfo.id === ally.basicInfo.id,
    );
    if (allyIdx >= 0) {
      const result = executeSkillsByTrigger(
        updatedInitiativeOrder[allyIdx],
        "allyMoraleCheck",
        updatedInitiativeOrder,
        { currentRound },
      );
      triggerMessages.push(...result.messages);
      updatedInitiativeOrder = updatedInitiativeOrder.map((p, i) =>
        i === allyIdx ? result.participant : p,
      );
    }
  }

  const participantForLog = updatedInitiativeOrder.find(
    (p) => p.basicInfo.id === participant.basicInfo.id,
  );
  const moraleLogEntry: BattleAction = {
    id: `morale-${participant.basicInfo.id}-${Date.now()}`,
    battleId,
    round: currentRound,
    actionIndex: battleLogLength,
    timestamp: new Date(),
    actorId: participant.basicInfo.id,
    actorName: participant.basicInfo.name,
    actorSide: participant.basicInfo.side,
    actionType: moraleResult.shouldSkipTurn ? "morale_skip" : "ability",
    targets: [],
    actionDetails: {
      d10Roll,
      morale: participantForLog?.combatStats.morale ?? participant.combatStats.morale,
    },
    resultText: [moraleResult.message, ...triggerMessages]
      .filter(Boolean)
      .join(" | "),
    hpChanges: [],
    isCancelled: false,
    stateBefore: undefined,
  };

  return { updatedInitiativeOrder, moraleLogEntry };
}
