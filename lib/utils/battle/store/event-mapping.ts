import type { NewBattleEvent, StoredBattleEvent } from "./types";

import { DM_ACTOR, SYSTEM_ACTOR } from "@/lib/constants/battle";
import { decodeLog } from "@/lib/utils/battle/log/codec";
import { logFields } from "@/lib/utils/battle/log/lines";
import type { BattleAction, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

type EventDetails = {
  actorName?: string;
  actorSide?: BattleAction["actorSide"];
  actionDetails?: BattleAction["actionDetails"];
  log?: LogLine[];
};

// a plain string stays a legacy `resultText`; refs and line lists go to `details.log` with an empty `resultText`
type EventText = LogLine | readonly LogLine[];

export function battleActionToEvent(action: BattleAction): NewBattleEvent {
  return {
    type: action.actionType,
    round: action.round,
    actorId: action.actorId,
    targets: action.targets,
    hpChanges: action.hpChanges,
    resultText: action.log ? "" : action.resultText,
    details: { actorName: action.actorName, actorSide: action.actorSide, actionDetails: action.actionDetails, ...(action.log && { log: action.log }) },
  };
}

export function systemEvent(round: number, text: EventText): NewBattleEvent {
  const { resultText, log } = logFields(text);

  return {
    type: "ability",
    round,
    actorId: SYSTEM_ACTOR.actorId,
    resultText,
    details: { actorName: SYSTEM_ACTOR.actorName, actorSide: SYSTEM_ACTOR.actorSide, actionDetails: {}, ...(log && { log }) },
  };
}

export function actorEvent(
  round: number,
  actor: BattleParticipant,
  text: EventText,
  { target, actionDetails = {} }: { target?: BattleParticipant; actionDetails?: BattleAction["actionDetails"] } = {},
): NewBattleEvent {
  const { resultText, log } = logFields(text);

  return {
    type: "ability",
    round,
    actorId: actor.basicInfo.id,
    targets: target ? [{ participantId: target.basicInfo.id, participantName: target.basicInfo.name }] : [],
    resultText,
    details: { actorName: actor.basicInfo.name, actorSide: actor.basicInfo.side, actionDetails, ...(log && { log }) },
  };
}

export function dmEvent(round: number, text: EventText, targets?: BattleAction["targets"], hpChanges?: BattleAction["hpChanges"]): NewBattleEvent {
  const { resultText, log } = logFields(text);

  return {
    type: "ability",
    round,
    actorId: DM_ACTOR.actorId,
    ...(targets && { targets }),
    ...(hpChanges && { hpChanges }),
    resultText,
    details: { actorName: DM_ACTOR.actorName, actorSide: DM_ACTOR.actorSide, actionDetails: {}, ...(log && { log }) },
  };
}

export function eventToBattleAction(
  e: StoredBattleEvent,
  battleId: string,
  meta: { createdAt?: Date; cancelledAt?: Date | null } = {},
): BattleAction {
  const d = (e.details ?? {}) as EventDetails;

  const log = d.log && decodeLog(d.log);

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
    resultText: log ? "" : e.resultText,
    ...(log && { log }),
    hpChanges: e.hpChanges as BattleAction["hpChanges"],
    isCancelled: Boolean(meta.cancelledAt),
  };
}
