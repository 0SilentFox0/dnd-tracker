"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getBattleVersion } from "@/lib/api/battles";
import { battleKeys } from "@/lib/hooks/battles/keys";
import type { BattleScene } from "@/types/api";

export const RESYNC_AFTER_HIDDEN_MS = 15_000;

/** Питає лише версію бою; повний GET — коли вона новіша за кеш. Також після довго схованої вкладки. */
export function useBattleResync(campaignId: string, battleId: string): () => Promise<void> {
  const queryClient = useQueryClient();

  const inFlightRef = useRef<Promise<void> | null>(null);

  // видимість і перепідключення часто приходять разом: один запит версії на обидва
  const resync = useCallback(() => {
    const key = battleKeys.scene(campaignId, battleId);

    inFlightRef.current ??= (async () => {
      // музика не має версії: пропущені battle-audio перечитуються окремо (лише якщо звук увімкнено)
      void queryClient.invalidateQueries({ queryKey: battleKeys.audio(campaignId, battleId) });

      if (queryClient.getQueryData<BattleScene>(key) === undefined) return;

      try {
        const { version } = await getBattleVersion(campaignId, battleId);

        const cached = queryClient.getQueryData<BattleScene>(key)?.version;

        if (cached === undefined || version <= cached) return;
      } catch {
        // без версії безпечніше перечитати бій
      }

      await queryClient.invalidateQueries({ queryKey: key });
    })().finally(() => {
      inFlightRef.current = null;
    });

    return inFlightRef.current;
  }, [campaignId, battleId, queryClient]);

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

  return resync;
}
