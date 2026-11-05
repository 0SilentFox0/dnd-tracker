import { PUSHER_DELTA_LIMIT_BYTES } from "./limits";

import { BattleStatus } from "@/lib/constants/battle";
import { CampaignRole } from "@/lib/constants/campaigns";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import { battleChannelName, battleDmChannelName, userChannelName } from "@/lib/pusher/channels";
import { toPublicPendingCrit } from "@/lib/utils/battle/crit-choice/public";
import { hasMomentum } from "@/lib/utils/battle/momentum";
import { reserveOf } from "@/lib/utils/battle/participant/reserve";
import type { BattleSceneState, LoadedBattle } from "@/lib/utils/battle/store";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import { redactLogForPlayers } from "@/lib/utils/battle/view/visibility";
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
    participants: scene.status === BattleStatus.PREPARED ? meta.setup : [],
    currentRound: scene.round,
    currentTurnIndex: scene.turnIndex,
    initiativeOrder: participants,
    pendingSummons: pending,
    pendingMoraleCheck: scene.pendingMoraleCheck,
    pendingCritChoice: toPublicPendingCrit(scene.pendingCritChoice),
    ...(hasMomentum(scene.momentum) && { momentum: scene.momentum }),
    map: meta.map,
    audio: meta.audio ?? null,
    rules: meta.rules,
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

function fitOrRefetch(delta: ClientBattleDelta): ClientBattleDelta | BattleRefetchSignal {
  const fits = Buffer.byteLength(JSON.stringify(delta), "utf8") <= PUSHER_DELTA_LIMIT_BYTES;

  return fits ? delta : { battleId: delta.battleId, version: delta.version, refetch: true };
}

export function buildPusherMessages(args: {
  before: BattleSceneState;
  after: BattleSceneState;
  participants: BattleParticipant[];
  pending?: BattleParticipant[];
  wasAwaiting?: boolean;
  delta: ClientBattleDelta;
}): PusherMessage[] {
  const { before, after, participants, pending = [], wasAwaiting = false, delta } = args;

  const channel = battleChannelName(after.id);

  const { entries, changed } = redactLogForPlayers(delta.log ?? [], participants);

  const publicDelta: ClientBattleDelta = changed ? { ...delta, log: entries, redacted: true } : delta;

  const messages: PusherMessage[] = [{ channel, event: "battle-delta", payload: fitOrRefetch(publicDelta) }];

  if (changed) messages.push({ channel: battleDmChannelName(after.id), event: "battle-delta", payload: fitOrRefetch(delta) });

  const turnMoved = before.round !== after.round || before.turnIndex !== after.turnIndex || before.status !== after.status || wasAwaiting;

  const active = participants[after.turnIndex];

  const awaiting = checkVictoryConditions(participants, reserveOf(pending)).awaiting !== null;

  if (after.status === BattleStatus.ACTIVE && !awaiting && turnMoved && active && active.basicInfo.controlledBy !== CONTROLLED_BY_DM) {
    messages.push({
      channel: userChannelName(active.basicInfo.controlledBy),
      event: "turn-started",
      payload: { battleId: after.id, participantId: active.basicInfo.id, participantName: active.basicInfo.name },
    });
  }

  return messages;
}
