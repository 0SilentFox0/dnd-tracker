"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useBattleResync } from "./useBattleResync";

import { writeAudioSnapshot } from "@/lib/hooks/audio";
import { battleKeys } from "@/lib/hooks/battles/keys";
import { writeBattleDelta } from "@/lib/hooks/battles/write-battle-delta";
import { usePusherChannel, usePusherConnection } from "@/lib/hooks/common";
import { BATTLE_AUDIO_EVENT, battleChannelName, userChannelName } from "@/lib/pusher/channels";
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
): { connectionState: PusherConnectionState } {
  const queryClient = useQueryClient();

  const resync = useBattleResync(campaignId, battleId);

  const [rawState, setRawState] = useState<PusherConnectionState>(null);

  const [failedChannel, setFailedChannel] = useState<string | null>(null);

  const resyncedChannelRef = useRef<string | null>(null);

  const channel = battleChannelName(battleId);

  usePusherConnection(
    (state) => {
      if (CONNECTION_STATES.has(state)) setRawState(state as PusherConnectionState);
    },
    () => void resync(),
  );

  usePusherChannel(
    channel,
    {
      "battle-delta": (data) => {
        const key = battleKeys.scene(campaignId, battleId);

        if (!data || typeof data !== "object" || !("version" in data)) {
          void queryClient.invalidateQueries({ queryKey: key });

          return;
        }

        const signal = data as ClientBattleDelta | BattleRefetchSignal;

        const cachedVersion = queryClient.getQueryData<BattleScene>(key)?.version;

        if (cachedVersion !== undefined && signal.version <= cachedVersion) return;

        void writeBattleDelta(queryClient, key, signal);
      },
      [BATTLE_AUDIO_EVENT]: (data) => {
        const audio = (data as Partial<BattleAudioEvent> | null)?.audio;

        if (!audio || typeof audio.seq !== "number") return;

        writeAudioSnapshot(queryClient, battleKeys.audio(campaignId, battleId), { audio });
      },
    },
    {
      // the cached scene (server HTML or GET) predates the subscription: deltas in between would be lost
      onSubscribed: () => {
        const recovered = failedChannel === channel;

        if (!recovered && resyncedChannelRef.current === channel) return;

        resyncedChannelRef.current = channel;

        if (recovered) setFailedChannel(null);

        void resync();
      },
      onError: (error) => {
        console.warn("[battle-sync] battle channel subscription failed, falling back to polling", error);
        setFailedChannel(channel);
      },
    },
  );

  usePusherChannel(currentUserId ? userChannelName(currentUserId) : null, {
    "turn-started": (data) => {
      const name = (data as { participantName?: string } | null)?.participantName;

      onTurnStarted(name);
    },
  });

  // з'єднання живе, але канал бою не підписаний — дельт не буде, хай працює polling
  const connectionState = failedChannel === channel ? "unavailable" : rawState;

  return { connectionState };
}
