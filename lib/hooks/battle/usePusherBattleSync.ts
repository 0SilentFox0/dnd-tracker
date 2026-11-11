"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useBattleResync } from "./useBattleResync";

import { writeAudioSnapshot } from "@/lib/hooks/audio";
import { battleKeys } from "@/lib/hooks/battles/keys";
import { writeBattleDelta } from "@/lib/hooks/battles/write-battle-delta";
import { usePusherChannel, usePusherConnection } from "@/lib/hooks/common";
import { BATTLE_AUDIO_EVENT, battleChannelName, battleDmChannelName, userChannelName } from "@/lib/pusher/channels";
import type { BattleRefetchSignal, BattleScene, ClientBattleDelta } from "@/types/api";
import type { BattleAudioEvent } from "@/types/audio";

export type PusherConnectionState = "connected" | "disconnected" | "connecting" | "unavailable" | null;

const CONNECTION_STATES = new Set(["connected", "connecting", "disconnected", "unavailable"]);

/**
 * Pusher-канали бою: battle-delta і battle-audio в кеш, turn-started для поточного юзера.
 * Канал battle-* не залежить від currentUserId, щоб не втрачати події під час завантаження userId.
 * Після першої підписки, розриву або довго схованої вкладки — перевірка версії (useBattleResync).
 */
export function usePusherBattleSync(
  campaignId: string,
  battleId: string,
  currentUserId: string | null,
  onTurnStarted: (participantName: string | undefined) => void,
  isDM = false,
): { connectionState: PusherConnectionState } {
  const queryClient = useQueryClient();

  const resync = useBattleResync(campaignId, battleId);

  const [rawState, setRawState] = useState<PusherConnectionState>(null);

  const [failedChannels, setFailedChannels] = useState<string[]>([]);

  const resyncedChannelRef = useRef<string | null>(null);

  const channel = battleChannelName(battleId);

  const dmChannel = battleDmChannelName(battleId);

  const [dmSubscribed, setDmSubscribed] = useState<string | null>(null);

  const dmReady = isDM && dmSubscribed === dmChannel;

  usePusherConnection(
    (state) => {
      if (CONNECTION_STATES.has(state)) setRawState(state as PusherConnectionState);
    },
    () => void resync(),
  );

  const applyDelta = (data: unknown) => {
    const key = battleKeys.scene(campaignId, battleId);

    if (!data || typeof data !== "object" || !("version" in data)) {
      void queryClient.invalidateQueries({ queryKey: key });

      return;
    }

    const signal = data as ClientBattleDelta | BattleRefetchSignal;

    // ДМ бере повну дельту з dm-каналу тієї ж версії, але лише поки той канал підписаний
    if (dmReady && "redacted" in signal && signal.redacted) return;

    const cachedVersion = queryClient.getQueryData<BattleScene>(key)?.version;

    if (cachedVersion !== undefined && signal.version <= cachedVersion) return;

    void writeBattleDelta(queryClient, key, signal);
  };

  const onChannelSubscribed = (name: string) => {
    const recovered = failedChannels.includes(name);

    if (!recovered && resyncedChannelRef.current === name) return;

    resyncedChannelRef.current = name;

    if (recovered) setFailedChannels((list) => list.filter((n) => n !== name));

    void resync();
  };

  const onChannelError = (name: string, error: unknown) => {
    console.warn("[battle-sync] channel subscription failed, falling back to polling", name, error);
    setFailedChannels((list) => (list.includes(name) ? list : [...list, name]));
  };

  usePusherChannel(isDM ? dmChannel : null, { "battle-delta": applyDelta }, {
    onSubscribed: () => {
      setDmSubscribed(dmChannel);
      onChannelSubscribed(dmChannel);
    },
    onError: (error) => {
      setDmSubscribed(null);
      onChannelError(dmChannel, error);
    },
  });

  usePusherChannel(
    channel,
    {
      "battle-delta": applyDelta,
      [BATTLE_AUDIO_EVENT]: (data) => {
        const audio = (data as Partial<BattleAudioEvent> | null)?.audio;

        if (!audio || typeof audio.seq !== "number") return;

        writeAudioSnapshot(queryClient, battleKeys.audio(campaignId, battleId), { audio });
      },
    },
    {
      // the cached scene (server HTML or GET) predates the subscription: deltas in between would be lost
      onSubscribed: () => onChannelSubscribed(channel),
      onError: (error) => onChannelError(channel, error),
    },
  );

  usePusherChannel(currentUserId ? userChannelName(currentUserId) : null, {
    "turn-started": (data) => {
      const name = (data as { participantName?: string } | null)?.participantName;

      onTurnStarted(name);
    },
  });

  // з'єднання живе, але канал бою не підписаний — дельт не буде, хай працює polling
  const connectionState = failedChannels.includes(channel) || (isDM && failedChannels.includes(dmChannel)) ? "unavailable" : rawState;

  return { connectionState };
}
