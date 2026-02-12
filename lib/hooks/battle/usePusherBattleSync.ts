"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { mergeBattleCache } from "@/lib/hooks/useBattles";
import type { BattleScene } from "@/types/api";

export type PusherConnectionState = "connected" | "disconnected" | "connecting" | "unavailable" | null;

const isBattleSyncDebugEnabled =
  process.env.NEXT_PUBLIC_BATTLE_SYNC_DEBUG === "1" ||
  process.env.NEXT_PUBLIC_BATTLE_SYNC_DEBUG === "true";

function battleSnapshot(battle: BattleScene | null | undefined) {
  if (!battle) return null;

  const current =
    battle.initiativeOrder?.[battle.currentTurnIndex]?.basicInfo;

  return {
    id: battle.id,
    status: battle.status,
    round: battle.currentRound,
    turnIndex: battle.currentTurnIndex,
    initiativeCount: battle.initiativeOrder?.length ?? 0,
    battleLogCount: battle.battleLog?.length ?? 0,
    currentParticipantId: current?.id ?? null,
    currentParticipantName: current?.name ?? null,
  };
}

/**
 * Підписка на Pusher-канали бою: оновлення битви, старт, завершення, turn-started для поточного юзера.
 * Оновлює кеш з payload події (setQueryData), щоб UI реагував миттєво без refetch.
 * Канал battle-* підписується окремо від currentUserId, щоб не втрачати події під час завантаження userId.
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

  const onTurnStartedRef = useRef(onTurnStarted);

  onTurnStartedRef.current = onTurnStarted;

  const queryKey = useCallback(
    () => ["battle", campaignId, battleId] as const,
    [campaignId, battleId],
  );

  const debugLog = useCallback(
    (message: string, payload?: unknown) => {
      if (!isBattleSyncDebugEnabled) return;

      const prefix = `[battle-sync][battle:${battleId}][user:${currentUserId ?? "anon"}]`;

      if (payload === undefined) {
        console.info(prefix, message);
      } else {
        console.info(prefix, message, payload);
      }
    },
    [battleId, currentUserId],
  );

  // 1) Підписка на канал бою — БЕЗ залежності від currentUserId, щоб не відписуватись під час завантаження userId (гравець не втрачає battle-updated).
  useEffect(() => {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_PUSHER_KEY) {
      debugLog("skip init: no window or NEXT_PUBLIC_PUSHER_KEY");

      return;
    }

    let mounted = true;

    import("@/lib/pusher").then(({ getPusherClient }) => {
      if (!mounted) return;

      const pusher = getPusherClient();

      pusherRef.current = pusher;

      if (!pusher) {
        debugLog("skip init: pusher client is null");

        return;
      }

      debugLog("pusher init (battle channel)", {
        queryKey: queryKey(),
        battleChannel: `battle-${battleId}`,
      });

      const applyBattlePayload = (
        eventName: "battle-updated" | "battle-started" | "battle-completed",
        data: unknown,
      ) => {
        if (data && typeof data === "object" && "id" in data) {
          const previous = queryClient.getQueryData<BattleScene>(queryKey());

          const incoming = data as BattleScene;

          debugLog(`event received: ${eventName}`, {
            previous: battleSnapshot(previous),
            incoming: battleSnapshot(incoming),
          });

          const merged = mergeBattleCache(
            queryClient,
            campaignId,
            battleId,
            incoming,
          );

          queryClient.setQueryData(queryKey(), { ...merged });

          const next = queryClient.getQueryData<BattleScene>(queryKey());

          debugLog(`cache updated: ${eventName}`, {
            next: battleSnapshot(next),
          });
        } else if (
          data &&
          typeof data === "object" &&
          "battleId" in data &&
          "type" in data
        ) {
          debugLog(`event light payload (refetch): ${eventName}`, {
            battleId: (data as { battleId: string }).battleId,
          });
          queryClient.invalidateQueries({ queryKey: queryKey() });
        } else {
          debugLog(`event invalid payload: ${eventName}`, {
            payloadType: typeof data,
          });
          queryClient.invalidateQueries({ queryKey: queryKey() });
        }
      };

      const updateConnectionState = () => {
        if (!mounted) return;

        const state = pusher.connection.state;

        if (state === "connected" || state === "connecting" || state === "disconnected" || state === "unavailable") {
          setConnectionState(state);
        }
      };

      pusher.connection.bind("state_change", (states: { previous: string; current: string }) => {
        debugLog("connection state change", states);
        updateConnectionState();

        if (states.previous !== "connected" && (states.current === "disconnected" || states.current === "unavailable")) {
          wasDisconnectedRef.current = true;
        }

        if (states.current === "connected" && wasDisconnectedRef.current) {
          wasDisconnectedRef.current = false;
          debugLog("reconnected -> invalidate battle query");
          queryClient.invalidateQueries({ queryKey: queryKey() });
        }
      });
      updateConnectionState();

      const battleChannel = pusher.subscribe("battle-" + battleId);

      debugLog("subscribed battle channel", { channel: `battle-${battleId}` });
      battleChannel.bind("battle-updated", (data: unknown) =>
        applyBattlePayload("battle-updated", data),
      );
      battleChannel.bind("battle-started", (data: unknown) =>
        applyBattlePayload("battle-started", data),
      );
      battleChannel.bind("battle-completed", (data: unknown) =>
        applyBattlePayload("battle-completed", data),
      );
    });

    return () => {
      mounted = false;

      const p = pusherRef.current;

      if (p) {
        debugLog("cleanup battle channel only");
        p.unsubscribe("battle-" + battleId);
        // не обнуляємо pusherRef — другий effect використовує його для cleanup user-каналу
      }
    };
  }, [battleId, campaignId, queryClient, queryKey, debugLog]);

  // 2) Підписка на user-* канал для turn-started — окремий effect, залежить від currentUserId.
  useEffect(() => {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_PUSHER_KEY || !currentUserId) {
      return;
    }

    let mounted = true;

    import("@/lib/pusher").then(({ getPusherClient }) => {
      if (!mounted) return;

      const pusher = getPusherClient();

      if (!pusher) return;

      const userChannelName = "user-" + currentUserId;

      userChannelRef.current = userChannelName;
      debugLog("subscribed user channel", { channel: userChannelName });

      const userChannel = pusher.subscribe(userChannelName);

      userChannel.bind(
        "turn-started",
        (data: { participantName?: string }) => {
          debugLog("event received: turn-started", data);
          onTurnStartedRef.current(
            data?.participantName
              ? "Твій хід: " + data.participantName
              : "Твій хід!",
          );
        },
      );
    });

    return () => {
      mounted = false;

      const p = pusherRef.current;

      if (p) {
        const uc = userChannelRef.current;

        if (uc) {
          debugLog("cleanup user channel");
          p.unsubscribe(uc);
          userChannelRef.current = null;
        }
      }
    };
  }, [battleId, currentUserId, debugLog]);

  return { connectionState };
}
