"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { mergeBattleCache } from "@/lib/hooks/useBattles";
import type { BattleScene } from "@/types/api";

export type PusherConnectionState = "connected" | "disconnected" | "connecting" | "unavailable" | null;

/**
 * Підписка на Pusher-канали бою: оновлення битви, старт, завершення, turn-started для поточного юзера.
 * Оновлює кеш з payload події (setQueryData), щоб UI реагував миттєво без refetch.
 * При reconnect робить refetch битви. Повертає connectionState для індикатора з'єднання.
 */
export function usePusherBattleSync(
  campaignId: string,
  battleId: string,
  currentUserId: string | null,
  onTurnStarted: (message: string) => void,
): { connectionState: PusherConnectionState } {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<PusherConnectionState>(null);
  const pusherRef = useRef<ReturnType<
    typeof import("@/lib/pusher").getPusherClient
  > | null>(null);
  const userChannelRef = useRef<string | null>(null);
  const wasDisconnectedRef = useRef(false);

  const queryKey = useCallback(
    () => ["battle", campaignId, battleId] as const,
    [campaignId, battleId],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_PUSHER_KEY) {
      return;
    }

    import("@/lib/pusher").then(({ getPusherClient }) => {
      const pusher = getPusherClient();
      pusherRef.current = pusher;
      if (!pusher) return;

      const applyBattlePayload = (data: unknown) => {
        if (data && typeof data === "object" && "id" in data) {
          const merged = mergeBattleCache(
            queryClient,
            campaignId,
            battleId,
            data as BattleScene,
          );
          queryClient.setQueryData(queryKey(), merged);
        } else {
          queryClient.invalidateQueries({ queryKey: queryKey() });
        }
      };

      const updateConnectionState = () => {
        const state = pusher.connection.state;
        if (state === "connected" || state === "connecting" || state === "disconnected" || state === "unavailable") {
          setConnectionState(state);
        }
      };

      pusher.connection.bind("state_change", (states: { previous: string; current: string }) => {
        updateConnectionState();
        if (states.previous !== "connected" && (states.current === "disconnected" || states.current === "unavailable")) {
          wasDisconnectedRef.current = true;
        }
        if (states.current === "connected" && wasDisconnectedRef.current) {
          wasDisconnectedRef.current = false;
          queryClient.invalidateQueries({ queryKey: queryKey() });
        }
      });
      updateConnectionState();

      const battleChannel = pusher.subscribe("battle-" + battleId);
      battleChannel.bind("battle-updated", applyBattlePayload);
      battleChannel.bind("battle-started", applyBattlePayload);
      battleChannel.bind("battle-completed", applyBattlePayload);

      if (currentUserId) {
        const userChannelName = "user-" + currentUserId;
        userChannelRef.current = userChannelName;
        const userChannel = pusher.subscribe(userChannelName);
        userChannel.bind(
          "turn-started",
          (data: { participantName?: string }) => {
            onTurnStarted(
              data?.participantName
                ? "Твій хід: " + data.participantName
                : "Твій хід!",
            );
          },
        );
      }
    });

    return () => {
      const p = pusherRef.current;
      if (p) {
        p.unsubscribe("battle-" + battleId);
        const uc = userChannelRef.current;
        if (uc) p.unsubscribe(uc);
        pusherRef.current = null;
        userChannelRef.current = null;
      }
    };
  }, [
    battleId,
    campaignId,
    currentUserId,
    onTurnStarted,
    queryClient,
    queryKey,
  ]);

  return { connectionState };
}
