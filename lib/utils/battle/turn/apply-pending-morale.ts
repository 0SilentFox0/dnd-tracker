/**
 * Застосовує збережену перевірку моралі (pendingMoraleCheck) при next-turn:
 * екстра-хід, подія moraleCheck для вмінь, запис у battleLog.
 */

import type { PendingMoraleCheckPayload } from "./pending-morale";

import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import type { BattleAction, BattleParticipant } from "@/types/battle";

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
  rng: () => number = Math.random,
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

  // без клона: учасник ходить ще раз наприкінці раунду (advanceTurn)
  if (moraleResult.hasExtraTurn) {
    updatedInitiativeOrder = updatedInitiativeOrder.map((p) =>
      p.basicInfo.id === participant.basicInfo.id
        ? { ...p, actionFlags: { ...p.actionFlags, hasExtraTurn: true } }
        : p,
    );
  }

  // паніка: до власного наступного ходу не відповідає на удари (скидання — на початку ходу)
  if (moraleResult.shouldSkipTurn) {
    updatedInitiativeOrder = updatedInitiativeOrder.map((p) =>
      p.basicInfo.id === participant.basicInfo.id
        ? { ...p, actionFlags: { ...p.actionFlags, hasUsedReaction: true } }
        : p,
    );
  }

  const moraleSuccess = moraleResult.hasExtraTurn || !moraleResult.shouldSkipTurn;

  const run = runAbilities(
    updatedInitiativeOrder,
    { type: "moraleCheck", actorId: participant.basicInfo.id, result: moraleSuccess ? "success" : "fail" },
    { round: currentRound, rng },
  );

  updatedInitiativeOrder = run.participants;

  const triggerMessages = run.messages;

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
