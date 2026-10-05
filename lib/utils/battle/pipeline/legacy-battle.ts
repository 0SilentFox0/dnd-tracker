import { PUSHER_DELTA_LIMIT_BYTES } from "./limits";

import { battleChannelName, userChannelName } from "@/lib/pusher-channels";
import type { BattleSceneState, LoadedBattle } from "@/lib/utils/battle/store";
import type { BattleScene } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface LegacyView {
  isDM?: boolean;
}

export interface PusherMessage {
  channel: string;
  event: string;
  payload: unknown;
}

export function toLegacyBattle(
  loaded: Pick<LoadedBattle, "meta">,
  scene: BattleSceneState,
  participants: BattleParticipant[],
  pending: BattleParticipant[],
  log: { mode: "append" | "full"; entries: BattleAction[]; cancelledFrom?: number },
  view?: LegacyView,
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
    ...(view && { isDM: Boolean(view.isDM), userRole: view.isDM ? ("dm" as const) : ("player" as const) }),
  };
}

export function buildPusherMessages(args: {
  before: BattleSceneState;
  after: BattleSceneState;
  participants: BattleParticipant[];
  battlePayload: BattleScene;
}): PusherMessage[] {
  const { before, after, participants, battlePayload } = args;

  const channel = battleChannelName(after.id);

  const fits = Buffer.byteLength(JSON.stringify(battlePayload), "utf8") <= PUSHER_DELTA_LIMIT_BYTES;

  const payload = fits ? battlePayload : { type: "battle-updated", battleId: after.id, version: after.version };

  const messages: PusherMessage[] = [{ channel, event: "battle-updated", payload }];

  if (before.status !== "active" && after.status === "active") {
    messages.push({ channel, event: "battle-started", payload });
  }

  if (after.status === "completed" && before.status !== "completed") {
    messages.push({ channel, event: "battle-completed", payload });
  }

  const turnMoved = before.round !== after.round || before.turnIndex !== after.turnIndex;

  const active = participants[after.turnIndex];

  if (after.status === "active" && turnMoved && active && active.basicInfo.controlledBy !== "dm") {
    messages.push({
      channel: userChannelName(active.basicInfo.controlledBy),
      event: "turn-started",
      payload: { battleId: after.id, participantId: active.basicInfo.id, participantName: active.basicInfo.name },
    });
  }

  return messages;
}
