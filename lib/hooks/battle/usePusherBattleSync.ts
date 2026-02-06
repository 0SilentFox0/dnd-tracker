"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * Підписка на Pusher-канали бою: оновлення битви, старт, завершення, turn-started для поточного юзера.
 * Інвалідує battle query та показує сповіщення про хід.
 */
export function usePusherBattleSync(
  campaignId: string,
  battleId: string,
  currentUserId: string | null,
  onTurnStarted: (message: string) => void,
) {
  const queryClient = useQueryClient();
  const pusherRef = useRef<ReturnType<
    typeof import("@/lib/pusher").getPusherClient
  > | null>(null);
  const userChannelRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_PUSHER_KEY) {
      return;
    }

    import("@/lib/pusher").then(({ getPusherClient }) => {
      const pusher = getPusherClient();
      pusherRef.current = pusher;
      if (!pusher) return;

      const battleChannel = pusher.subscribe("battle-" + battleId);
      battleChannel.bind("battle-updated", () => {
        queryClient.invalidateQueries({
          queryKey: ["battle", campaignId, battleId],
        });
      });
      battleChannel.bind("battle-started", () => {
        queryClient.invalidateQueries({
          queryKey: ["battle", campaignId, battleId],
        });
      });
      battleChannel.bind("battle-completed", () => {
        queryClient.invalidateQueries({
          queryKey: ["battle", campaignId, battleId],
        });
      });

      if (currentUserId) {
        const userChannelName = "user-" + currentUserId;
        userChannelRef.current = userChannelName;
        const userChannel = pusher.subscribe(userChannelName);
        userChannel.bind(
          "turn-started",
          (data: { participantName?: string }) => {
            queryClient.invalidateQueries({
              queryKey: ["battle", campaignId, battleId],
            });
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
  ]);
}
