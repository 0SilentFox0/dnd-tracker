import { applyPendingMoraleCheck } from "./apply-pending-morale";
import { finishTurnEffects } from "./end-turn-cleanup";
import type { PendingMoraleCheckPayload } from "./pending-morale";
import { runAdvanceTurnLoop } from "./run-advance-turn-loop";
import { applyVictoryCompletion } from "./turn-helpers";
import { resetTurnState } from "./turn-state";

import { joinLines } from "@/lib/i18n/text-ref";
import { findParticipant, replaceParticipant, takesTurn } from "@/lib/utils/abilities/engine/core/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { pruneExpiredTerrain } from "@/lib/utils/battle/grid/terrain";
import { logFields } from "@/lib/utils/battle/log/lines";
import { actionsPerTurnPool, setExtraActionPool } from "@/lib/utils/battle/participant/helpers";
import { dropBattleFlag, reserveOf } from "@/lib/utils/battle/participant/reserve";
import type { BattleSceneState, ScenePatch } from "@/lib/utils/battle/store";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface AdvanceTurnInput {
  rng?: () => number;
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  scene: BattleSceneState;
  map?: BattleMapConfig | null;
  rules?: Ruleset;
}

export interface AdvanceTurnOutput {
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  scene: ScenePatch;
  actions: BattleAction[];
}

export interface AdvanceAfterRemovalInput extends AdvanceTurnInput {
  /** скільки учасників, що лишились у черзі, стояли перед прибраним */
  before: number;
}

export function advanceTurn(input: AdvanceTurnInput): AdvanceTurnOutput {
  return advanceFrom(input, false);
}

/** Учасника на ході прибрали з черги: хід переходить до наступного без повторного кінця ходу попереднього. */
export function advanceAfterRemoval({ before, scene, ...input }: AdvanceAfterRemovalInput): AdvanceTurnOutput {
  return advanceFrom({ ...input, scene: { ...scene, turnIndex: before - 1, pendingMoraleCheck: null } }, true);
}

function advanceFrom({ participants, pending, scene, rng, map, rules }: AdvanceTurnInput, skipEnding: boolean): AdvanceTurnOutput {
  let order = participants;

  const actions: BattleAction[] = [];

  if (scene.pendingMoraleCheck) {
    const morale = applyPendingMoraleCheck(order, scene.pendingMoraleCheck as PendingMoraleCheckPayload, scene.round, scene.id, scene.eventSeq, undefined, rules);

    order = morale.updatedInitiativeOrder;

    if (morale.moraleLogEntry) actions.push(morale.moraleLogEntry);
  }

  const ending = skipEnding ? undefined : order[scene.turnIndex];

  // невикористані додаткові дії згорають разом із ходом
  if (ending) order = replaceParticipant(order, setExtraActionPool(ending, 0));

  if (ending && takesTurn(ending, scene.round)) {
    const ended = runAbilities(order, { type: "turnEnd", actorId: ending.basicInfo.id }, { round: scene.round, rng: rng ?? Math.random, map, rules });

    order = ended.participants;

    if (ended.messages.length > 0) actions.push(turnEndAction(ending, scene, ended.messages));

    const finished = finishTurnEffects(findParticipant(order, ending.basicInfo.id) ?? ending, { participants: order, rules, rng: rng ?? Math.random, round: scene.round });

    order = replaceParticipant(order, finished.participant);

    if (finished.messages.length > 0) actions.push(turnEndAction(ending, scene, finished.messages));

    if (finished.expired.length > 0) actions.push(turnEndAction(ending, scene, [`ефекти завершилися: ${finished.expired.join(", ")}`]));
  }

  const current = order[scene.turnIndex];

  const endingExtraTurn = !skipEnding && current?.battleData.extraTurnActive === true;

  if (endingExtraTurn) {
    order = order.map((p, i) =>
      i === scene.turnIndex ? { ...p, battleData: { ...p.battleData, extraTurnActive: false } } : p,
    );
  }

  const roundIsOver = endingExtraTurn || !order.slice(scene.turnIndex + 1).some((p) => takesTurn(p, scene.round));

  if (roundIsOver) order = order.map((p) => (p.battleData.airborne && p.actionFlags.hasExtraTurn ? { ...p, actionFlags: { ...p.actionFlags, hasExtraTurn: false } } : p));

  const extraIndex = roundIsOver ? order.findIndex((p) => takesTurn(p, scene.round) && p.actionFlags.hasExtraTurn) : -1;

  if (extraIndex >= 0) {
    const taker = order[extraIndex];

    // без processStartOfTurn: DoT уже спрацював, а тривалості зменшилися наприкінці звичайного ходу
    order = order.map((p, i) =>
      i === extraIndex
        ? {
            ...p,
            actionFlags: { hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false, hasExtraTurn: false },
            battleData: {
              ...resetTurnState(p, { keepLegendary: true }),
              extraTurnActive: true,
              pendingExtraActions: actionsPerTurnPool(p, order),
            },
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

  const reserve = reserveOf(pending);

  const loop = runAdvanceTurnLoop({
    initiativeOrder: order,
    // після додаткового ходу раунд закінчено: з останнього індексу цикл переходить у новий раунд
    currentTurnIndex: endingExtraTurn ? order.length - 1 : scene.turnIndex,
    currentRound: scene.round,
    battleId: scene.id,
    currentBattleLogLength: scene.eventSeq + actions.length,
    pendingSummons: pending,
    rng,
    map,
    rules,
  });

  const newLogEntries = [...loop.newLogEntries];

  const victory = applyVictoryCompletion({
    updatedInitiativeOrder: loop.updatedInitiativeOrder,
    battleStatus: scene.status,
    battleId: scene.id,
    nextRound: loop.nextRound,
    currentBattleLogLength: scene.eventSeq + actions.length,
    newLogEntries,
    reserve,
    rules,
    getStateBeforeForEntry: () => undefined,
  });

  const newRound = loop.nextRound > scene.round;

  const participantsAfter = victory.updatedInitiativeOrder.map((p, i) =>
    p.battleData.revealPending && (newRound || (i >= scene.turnIndex && i <= loop.nextTurnIndex)) ? dropBattleFlag(p, "revealPending") : p,
  );

  const prunedMap = newRound && map ? pruneExpiredTerrain(map, loop.nextRound) : null;

  return {
    participants: participantsAfter,
    pending: loop.clearedPendingSummons ? reserve : pending,
    scene: {
      turnIndex: loop.nextTurnIndex,
      round: loop.nextRound,
      status: victory.finalStatus as BattleSceneState["status"],
      ...(victory.completedAt && { completedAt: victory.completedAt }),
      pendingMoraleCheck: null,
      ...(prunedMap && { map: prunedMap }),
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

function turnEndAction(p: BattleParticipant, scene: AdvanceTurnInput["scene"], messages: LogLine[]): BattleAction {
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
    ...logFields(joinLines([`Кінець ходу: `, joinLines(messages, "; ")])),
    hpChanges: [],
    isCancelled: false,
  };
}
