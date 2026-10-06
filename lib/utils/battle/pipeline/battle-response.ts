import { PUSHER_DELTA_LIMIT_BYTES } from "./limits";

import { CampaignRole } from "@/lib/constants/campaigns";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import { battleChannelName, userChannelName } from "@/lib/pusher-channels";
import type { BattleSceneState, LoadedBattle } from "@/lib/utils/battle/store";
import type { BattleRefetchSignal, BattleScene, ClientBattleDelta } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface BattleResponseView {
  isDM?: boolean;
}

export interface PusherMessage {
  channel: string;
  event: string;
  payload: unknown;
}

export function toBattleResponse(
  loaded: Pick<LoadedBattle, "meta">,
  scene: BattleSceneState,
  participants: BattleParticipant[],
  pending: BattleParticipant[],
  log: { mode: "append" | "full"; entries: BattleAction[]; cancelledFrom?: number },
  view?: BattleResponseView,
): BattleScene {
  const { meta } = loaded;

  return {
    id: scene.id,
    campaignId: scene.campaignId,
    name: meta.name,
    description: meta.description ?? undefined,
    status: scene.status,
    participants: scene.status === "prepared" ? meta.setup : [],
    currentRound: scene.round,
    currentTurnIndex: scene.turnIndex,
    initiativeOrder: participants,
    pendingSummons: pending,
    pendingMoraleCheck: scene.pendingMoraleCheck,
    battleLog: log.entries,
    ...(log.mode === "append" && { battleLogMode: "append" as const }),
    ...(log.cancelledFrom !== undefined && { battleLogCancelledFrom: log.cancelledFrom }),
    version: scene.version,
    createdAt: meta.createdAt.toISOString(),
    startedAt: scene.startedAt?.toISOString(),
    completedAt: scene.completedAt?.toISOString(),
    campaign: { id: scene.campaignId, friendlyFire: meta.friendlyFire },
    ...(view && { isDM: Boolean(view.isDM), userRole: view.isDM ? CampaignRole.DM : CampaignRole.PLAYER }),
  };
}

export function buildPusherMessages(args: {
  before: BattleSceneState;
  after: BattleSceneState;
  participants: BattleParticipant[];
  delta: ClientBattleDelta;
}): PusherMessage[] {
  const { before, after, participants, delta } = args;

  const channel = battleChannelName(after.id);

  const fits = Buffer.byteLength(JSON.stringify(delta), "utf8") <= PUSHER_DELTA_LIMIT_BYTES;

  const payload: ClientBattleDelta | BattleRefetchSignal = fits ? delta : { battleId: delta.battleId, version: delta.version, refetch: true };

  const messages: PusherMessage[] = [{ channel, event: "battle-delta", payload }];

  const turnMoved = before.round !== after.round || before.turnIndex !== after.turnIndex || before.status !== after.status;

  const active = participants[after.turnIndex];

  if (after.status === "active" && turnMoved && active && active.basicInfo.controlledBy !== CONTROLLED_BY_DM) {
    messages.push({
      channel: userChannelName(active.basicInfo.controlledBy),
      event: "turn-started",
      payload: { battleId: after.id, participantId: active.basicInfo.id, participantName: active.basicInfo.name },
    });
  }

  return messages;
}
