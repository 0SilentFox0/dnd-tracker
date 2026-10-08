import { applyPendingMoraleCheck } from "./apply-pending-morale";
import { endTurnCleanup } from "./end-turn-cleanup";
import type { PendingMoraleCheckPayload } from "./pending-morale";
import { runAdvanceTurnLoop } from "./run-advance-turn-loop";
import { applyVictoryCompletion } from "./turn-helpers";

import { isActive, updateParticipant } from "@/lib/utils/abilities/engine/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import type { BattleSceneState, ScenePatch } from "@/lib/utils/battle/store";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface AdvanceTurnInput {
  rng?: () => number;
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  scene: BattleSceneState;
}

export interface AdvanceTurnOutput {
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  scene: ScenePatch;
  actions: BattleAction[];
}

export function advanceTurn({ participants, pending, scene, rng }: AdvanceTurnInput): AdvanceTurnOutput {
  let order = participants;

  const actions: BattleAction[] = [];

  if (scene.pendingMoraleCheck) {
    const morale = applyPendingMoraleCheck(order, scene.pendingMoraleCheck as PendingMoraleCheckPayload, scene.round, scene.id, scene.eventSeq);

    order = morale.updatedInitiativeOrder;

    if (morale.moraleLogEntry) actions.push(morale.moraleLogEntry);
  }

  const ending = order[scene.turnIndex];

  if (ending && isActive(ending)) {
    const ended = runAbilities(order, { type: "turnEnd", actorId: ending.basicInfo.id }, { round: scene.round, rng: rng ?? Math.random });

    order = ended.participants;

    if (ended.messages.length > 0) actions.push(turnEndAction(ending, scene, ended.messages));

    order = updateParticipant(order, ending.basicInfo.id, endTurnCleanup);
  }

  const current = order[scene.turnIndex];

  const endingExtraTurn = current?.battleData.extraTurnActive === true;

  if (endingExtraTurn) {
    order = order.map((p, i) =>
      i === scene.turnIndex ? { ...p, battleData: { ...p.battleData, extraTurnActive: false } } : p,
    );
  }

  const roundIsOver = endingExtraTurn || !order.slice(scene.turnIndex + 1).some(isActive);

  const extraIndex = roundIsOver ? order.findIndex((p) => isActive(p) && p.actionFlags.hasExtraTurn) : -1;

  if (extraIndex >= 0) {
    const taker = order[extraIndex];

    // без processStartOfTurn: DoT і тривалості вже спрацювали на початку звичайного ходу
    order = order.map((p, i) =>
      i === extraIndex
        ? {
            ...p,
            actionFlags: { hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false, hasExtraTurn: false },
            battleData: { ...p.battleData, extraTurnActive: true },
          }
        : p,
    );

    return {
      participants: order,
      pending,
      scene: { turnIndex: extraIndex, round: scene.round, status: scene.status, pendingMoraleCheck: null },
      actions: [...actions, extraTurnAction(taker, scene)],
    };
  }

  const loop = runAdvanceTurnLoop({
    initiativeOrder: order,
    // після додаткового ходу раунд закінчено: з останнього індексу цикл переходить у новий раунд
    currentTurnIndex: endingExtraTurn ? order.length - 1 : scene.turnIndex,
    currentRound: scene.round,
    battleId: scene.id,
    currentBattleLogLength: scene.eventSeq + actions.length,
    pendingSummons: pending,
    rng,
  });

  const newLogEntries = [...loop.newLogEntries];

  const victory = applyVictoryCompletion({
    updatedInitiativeOrder: loop.updatedInitiativeOrder,
    initiativeOrder: order,
    battleStatus: scene.status,
    battleId: scene.id,
    nextRound: loop.nextRound,
    currentBattleLogLength: scene.eventSeq + actions.length,
    newLogEntries,
    getStateBeforeForEntry: () => undefined,
  });

  return {
    participants: victory.updatedInitiativeOrder,
    pending: loop.clearedPendingSummons ? [] : pending,
    scene: {
      turnIndex: loop.nextTurnIndex,
      round: loop.nextRound,
      status: victory.finalStatus as BattleSceneState["status"],
      ...(victory.completedAt && { completedAt: victory.completedAt }),
      pendingMoraleCheck: null,
    },
    actions: [...actions, ...newLogEntries],
  };
}

function extraTurnAction(p: BattleParticipant, scene: BattleSceneState): BattleAction {
  return {
    id: `extra-turn-${p.basicInfo.id}-${Date.now()}`,
    battleId: scene.id,
    round: scene.round,
    actionIndex: scene.eventSeq,
    timestamp: new Date(),
    actorId: p.basicInfo.id,
    actorName: p.basicInfo.name,
    actorSide: p.basicInfo.side,
    actionType: "ability",
    targets: [],
    actionDetails: {},
    resultText: `${p.basicInfo.name} отримує додатковий хід`,
    hpChanges: [],
    isCancelled: false,
  };
}

function turnEndAction(p: BattleParticipant, scene: AdvanceTurnInput["scene"], messages: string[]): BattleAction {
  return {
    id: `triggers-turn-end-${p.basicInfo.id}-${Date.now()}`,
    battleId: scene.id,
    round: scene.round,
    actionIndex: 0,
    timestamp: new Date(),
    actorId: p.basicInfo.id,
    actorName: p.basicInfo.name,
    actorSide: p.basicInfo.side,
    actionType: "ability",
    targets: [],
    actionDetails: {},
    resultText: `Кінець ходу: ${messages.join("; ")}`,
    hpChanges: [],
    isCancelled: false,
  };
}
