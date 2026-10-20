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

  // ключ — бій: запит старого бою не має блокувати (чи скидати) запит нового
  const inFlightRef = useRef<{ battleId: string; promise: Promise<void> } | null>(null);

  // видимість і перепідключення часто приходять разом: один запит версії на обидва
  const resync = useCallback(() => {
    if (inFlightRef.current?.battleId === battleId) return inFlightRef.current.promise;

    const key = battleKeys.scene(campaignId, battleId);

    const entry = {
      battleId,
      promise: (async () => {
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
        if (inFlightRef.current === entry) inFlightRef.current = null;
      }),
    };

    inFlightRef.current = entry;

    return entry.promise;
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
