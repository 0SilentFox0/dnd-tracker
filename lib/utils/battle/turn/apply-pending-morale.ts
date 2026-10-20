import type { PendingMoraleCheckPayload } from "./pending-morale";

import { ParticipantSide } from "@/lib/constants/battle";
import { findParticipant, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
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

  const participant = findParticipant(initiativeOrder, participantId);

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
        actorSide: ParticipantSide.ALLY,
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

  // без клона: учасник ходить ще раз наприкінці раунду (advanceTurn); з додаткового ходу — не ланцюжком
  const grantsExtraTurn = moraleResult.hasExtraTurn && !participant.battleData.extraTurnActive && !participant.battleData.airborne;

  let updatedInitiativeOrder =
    grantsExtraTurn || moraleResult.shouldSkipTurn
      ? updateParticipant(initiativeOrder, participantId, (p) => ({
          ...p,
          actionFlags: {
            ...p.actionFlags,
            ...(grantsExtraTurn && { hasExtraTurn: true }),
            // паніка: до власного наступного ходу не відповідає на удари (скидання — на початку ходу)
            ...(moraleResult.shouldSkipTurn && { hasUsedReaction: true }),
          },
        }))
      : initiativeOrder;

  const moraleSuccess = moraleResult.hasExtraTurn || !moraleResult.shouldSkipTurn;

  const run = runAbilities(
    updatedInitiativeOrder,
    { type: "moraleCheck", actorId: participant.basicInfo.id, result: moraleSuccess ? "success" : "fail" },
    { round: currentRound, rng },
  );

  updatedInitiativeOrder = run.participants;

  const triggerMessages = run.messages;

  const participantForLog = findParticipant(updatedInitiativeOrder, participantId);

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
      morale: effectiveMorale(participantForLog ?? participant, updatedInitiativeOrder).value,
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
