import type { NewBattleEvent, StoredBattleEvent } from "./types";

import { DM_ACTOR, SYSTEM_ACTOR } from "@/lib/constants/battle";
import type { BattleAction, BattleParticipant } from "@/types/battle";

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

export function actorEvent(
  round: number,
  actor: BattleParticipant,
  resultText: string,
  { target, actionDetails = {} }: { target?: BattleParticipant; actionDetails?: BattleAction["actionDetails"] } = {},
): NewBattleEvent {
  return {
    type: "ability",
    round,
    actorId: actor.basicInfo.id,
    targets: target ? [{ participantId: target.basicInfo.id, participantName: target.basicInfo.name }] : [],
    resultText,
    details: { actorName: actor.basicInfo.name, actorSide: actor.basicInfo.side, actionDetails },
  };
}

export function dmEvent(round: number, resultText: string, targets?: BattleAction["targets"]): NewBattleEvent {
  return {
    type: "ability",
    round,
    actorId: DM_ACTOR.actorId,
    ...(targets && { targets }),
    resultText,
    details: { actorName: DM_ACTOR.actorName, actorSide: DM_ACTOR.actorSide, actionDetails: {} },
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
