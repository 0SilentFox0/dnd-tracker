import { applyPendingMoraleCheck } from "./apply-pending-morale";
import { syncOriginalFromSlot } from "./extra-turn";
import type { PendingMoraleCheckPayload } from "./pending-morale";
import { runAdvanceTurnLoop } from "./run-advance-turn-loop";
import { applyVictoryCompletion } from "./turn-helpers";

import type { BattleSceneState, ScenePatch } from "@/lib/utils/battle/store";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface AdvanceTurnInput {
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

export function advanceTurn({ participants, pending, scene }: AdvanceTurnInput): AdvanceTurnOutput {
  let order = syncOriginalFromSlot(participants, scene.turnIndex);

  const actions: BattleAction[] = [];

  if (scene.pendingMoraleCheck) {
    const morale = applyPendingMoraleCheck(order, scene.pendingMoraleCheck as PendingMoraleCheckPayload, scene.round, scene.id, scene.eventSeq);

    order = morale.updatedInitiativeOrder;

    if (morale.moraleLogEntry) actions.push(morale.moraleLogEntry);
  }

  const loop = runAdvanceTurnLoop({
    initiativeOrder: order,
    currentTurnIndex: scene.turnIndex,
    currentRound: scene.round,
    battleId: scene.id,
    currentBattleLogLength: scene.eventSeq + actions.length,
    pendingSummons: pending,
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
