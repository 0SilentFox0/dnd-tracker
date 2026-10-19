"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getBattleAudio } from "@/lib/api/battle-audio";
import { battleKeys } from "@/lib/hooks/battles";
import { mergeAudio } from "@/lib/utils/audio/merge";
import type { BattleAudioSnapshot, BattleAudioState } from "@/types/audio";

/** live = звук розблоковано: лише тоді GET (свіжий стан і годинник); до того — стан зі сцени й Pusher. */
export function useBattleAudioState(args: { campaignId: string; battleId: string; seed: BattleAudioState | null | undefined; live: boolean }): BattleAudioSnapshot {
  const { campaignId, battleId, seed, live } = args;

  const queryClient = useQueryClient();

  const { data } = useQuery<BattleAudioSnapshot>({
    queryKey: battleKeys.audio(campaignId, battleId),
    queryFn: async () => {
      const fresh = await getBattleAudio(campaignId, battleId);

      const prev = queryClient.getQueryData<BattleAudioSnapshot>(battleKeys.audio(campaignId, battleId));

      return { audio: mergeAudio(prev?.audio ?? null, fresh.audio), clockOffsetMs: fresh.clockOffsetMs ?? prev?.clockOffsetMs ?? null };
    },
    enabled: live,
    initialData: { audio: seed ?? null, clockOffsetMs: null },
    initialDataUpdatedAt: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // повна сцена несе audio на момент читання — лише злиття за seq, ніколи не присвоєння
  useEffect(() => {
    if (!seed) return;

    queryClient.setQueryData<BattleAudioSnapshot>(battleKeys.audio(campaignId, battleId), (prev) => {
      const audio = mergeAudio(prev?.audio ?? null, seed);

      return prev && audio === prev.audio ? prev : { audio, clockOffsetMs: prev?.clockOffsetMs ?? null };
    });
  }, [queryClient, campaignId, battleId, seed]);

  // кеш читається синхронно: сповіщення спостерігача приходять пізніше за рендер
  const snapshot = queryClient.getQueryData<BattleAudioSnapshot>(battleKeys.audio(campaignId, battleId)) ?? data;

  const audio = mergeAudio(snapshot.audio, seed);

  return useMemo(() => (audio === snapshot.audio ? snapshot : { audio, clockOffsetMs: snapshot.clockOffsetMs }), [audio, snapshot]);
}
