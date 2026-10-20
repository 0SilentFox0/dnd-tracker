import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface ActionAt {
  battleId: string;
  round: number;
  targets?: BattleParticipant[];
}

type ActionRest = Pick<BattleAction, "actionDetails" | "resultText"> & Partial<Pick<BattleAction, "id" | "actionIndex" | "hpChanges">>;

export function newBattleAction(actor: BattleParticipant, actionType: BattleAction["actionType"], at: ActionAt, rest: ActionRest): BattleAction {
  return {
    id: `${actionType}-${actor.basicInfo.id}-${Date.now()}`,
    battleId: at.battleId,
    round: at.round,
    actionIndex: 0,
    timestamp: new Date(),
    actorId: actor.basicInfo.id,
    actorName: actor.basicInfo.name,
    actorSide: actor.basicInfo.side,
    actionType,
    targets: (at.targets ?? []).map((t) => ({ participantId: t.basicInfo.id, participantName: t.basicInfo.name })),
    hpChanges: [],
    isCancelled: false,
    ...rest,
  };
}
