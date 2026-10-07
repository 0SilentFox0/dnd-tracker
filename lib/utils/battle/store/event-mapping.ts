import type { NewBattleEvent, StoredBattleEvent } from "./types";

import { SYSTEM_ACTOR } from "@/lib/constants/battle";
import type { BattleAction } from "@/types/battle";

type EventDetails = {
  actorName?: string;
  actorSide?: BattleAction["actorSide"];
  actionDetails?: BattleAction["actionDetails"];
};

export function battleActionToEvent(action: BattleAction): NewBattleEvent {
  return {
    type: action.actionType,
    round: action.round,
    actorId: action.actorId,
    targets: action.targets,
    hpChanges: action.hpChanges,
    resultText: action.resultText,
    details: { actorName: action.actorName, actorSide: action.actorSide, actionDetails: action.actionDetails },
  };
}

export function systemEvent(round: number, resultText: string): NewBattleEvent {
  return {
    type: "ability",
    round,
    actorId: SYSTEM_ACTOR.actorId,
    resultText,
    details: { actorName: SYSTEM_ACTOR.actorName, actorSide: SYSTEM_ACTOR.actorSide, actionDetails: {} },
  };
}

export function eventToBattleAction(
  e: StoredBattleEvent,
  battleId: string,
  meta: { createdAt?: Date; cancelledAt?: Date | null } = {},
): BattleAction {
  const d = (e.details ?? {}) as EventDetails;

  return {
    id: `${battleId}-${e.seq}`,
    battleId,
    round: e.round,
    actionIndex: e.seq,
    timestamp: meta.createdAt ?? new Date(),
    actorId: e.actorId ?? SYSTEM_ACTOR.actorId,
    actorName: d.actorName ?? SYSTEM_ACTOR.actorName,
    actorSide: d.actorSide ?? SYSTEM_ACTOR.actorSide,
    actionType: e.type as BattleAction["actionType"],
    targets: e.targets as BattleAction["targets"],
    actionDetails: d.actionDetails ?? {},
    resultText: e.resultText,
    hpChanges: e.hpChanges as BattleAction["hpChanges"],
    isCancelled: Boolean(meta.cancelledAt),
  };
}
