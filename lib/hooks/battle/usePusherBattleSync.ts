"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getBattleVersion } from "@/lib/api/battles";
import { battleQueryKey } from "@/lib/hooks/battles";
import { battleChannelName, userChannelName } from "@/lib/pusher-channels";
import { applyBattleDelta } from "@/lib/utils/battle/client/apply-delta";
import type { BattleRefetchSignal, BattleScene, ClientBattleDelta } from "@/types/api";

export type PusherConnectionState = "connected" | "disconnected" | "connecting" | "unavailable" | null;

const isBattleSyncDebugEnabled = false;

export const RESYNC_AFTER_HIDDEN_MS = 15_000;

/**
 * Підписка на Pusher-канали бою: оновлення битви, старт, завершення, turn-started для поточного юзера.
 * Застосовує battle-delta до кешу; refetch-сигнал або пропуск версії — одна інвалідація.
 * Канал battle-* підписується окремо від currentUserId, щоб не втрачати події під час завантаження userId.
 * Після будь-якого розриву або довго схованої вкладки питає лише версію; повний GET — коли вона новіша за кеш.
 * Повертає connectionState для індикатора з'єднання.
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

  const cleanupRef = useRef<(() => void) | null>(null);

  const onTurnStartedRef = useRef(onTurnStarted);

  onTurnStartedRef.current = onTurnStarted;

  const queryKey = useCallback(() => battleQueryKey(campaignId, battleId), [campaignId, battleId]);

  const resyncRef = useRef<Promise<void> | null>(null);

  // видимість і перепідключення часто приходять разом: один запит версії на обидва
  const resync = useCallback(() => {
    resyncRef.current ??= (async () => {
      try {
        const { version } = await getBattleVersion(campaignId, battleId);

        const cached = queryClient.getQueryData<BattleScene>(queryKey())?.version;

        if (cached !== undefined && version <= cached) return;
      } catch {
        // без версії безпечніше перечитати бій
      }

      await queryClient.invalidateQueries({ queryKey: queryKey() });
    })().finally(() => {
      resyncRef.current = null;
    });

    return resyncRef.current;
  }, [campaignId, battleId, queryClient, queryKey]);

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

  // 1) Підписка на канал бою — БЕЗ залежності від currentUserId, щоб не відписуватись під час завантаження userId (гравець не втрачає battle-delta).
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

      const channel = battleChannelName(battleId);

      debugLog("pusher init (battle channel)", {
        queryKey: queryKey(),
        battleChannel: channel,
      });

      const onDelta = (data: unknown) => {
        if (!data || typeof data !== "object" || !("version" in data)) {
          void queryClient.invalidateQueries({ queryKey: queryKey() });

          return;
        }

        const cached = queryClient.getQueryData<BattleScene>(queryKey());

        const signal = data as ClientBattleDelta | BattleRefetchSignal;

        if (cached?.version !== undefined && signal.version <= cached.version) return;

        const next = !cached || "refetch" in signal ? "refetch" : applyBattleDelta(cached, signal);

        if (next === "refetch") void queryClient.invalidateQueries({ queryKey: queryKey() });
        else queryClient.setQueryData(queryKey(), next);
      };

      const updateConnectionState = () => {
        if (!mounted) return;

        const state = pusher.connection.state;

        if (state === "connected" || state === "connecting" || state === "disconnected" || state === "unavailable") {
          setConnectionState(state);
        }
      };

      const onState = (states: { previous: string; current: string }) => {
        debugLog("connection state change", states);
        updateConnectionState();

        if (states.previous === "connected" && states.current !== "connected") wasDisconnectedRef.current = true;

        if (states.current === "connected" && wasDisconnectedRef.current) {
          wasDisconnectedRef.current = false;
          void resync();
        }
      };

      pusher.connection.bind("state_change", onState);
      updateConnectionState();

      const battleChannel = pusher.subscribe(channel);

      debugLog("subscribed battle channel", { channel });
      battleChannel.bind("battle-delta", onDelta);

      cleanupRef.current = () => {
        battleChannel.unbind("battle-delta", onDelta);
        pusher.connection.unbind("state_change", onState);
      };
    });

    return () => {
      mounted = false;

      const p = pusherRef.current;

      cleanupRef.current?.();
      cleanupRef.current = null;

      if (p) {
        debugLog("cleanup battle channel only");
        p.unsubscribe(battleChannelName(battleId));
        // не обнуляємо pusherRef — другий effect використовує його для cleanup user-каналу
      }
    };
  }, [battleId, campaignId, queryClient, queryKey, debugLog, resync]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    let hiddenAt: number | null = null;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();

        return;
      }

      if (hiddenAt !== null && Date.now() - hiddenAt > RESYNC_AFTER_HIDDEN_MS) void resync();

      hiddenAt = null;
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [resync]);

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

      const channel = userChannelName(currentUserId);

      userChannelRef.current = channel;
      debugLog("subscribed user channel", { channel });

      const userChannel = pusher.subscribe(channel);

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
