"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { writeAudioSnapshot } from "./audio-snapshot";

import { getBattleAudio } from "@/lib/api/battle-audio";
import { battleKeys } from "@/lib/hooks/battles";
import { mergeAudio, mergeAudioSnapshot } from "@/lib/utils/audio/merge";
import type { BattleAudioSnapshot, BattleAudioState } from "@/types/audio";

/** unlocked = звук увімкнено: лише тоді GET (свіжий стан і годинник); до того — стан зі сцени й Pusher. */
export function useBattleAudioState(args: { campaignId: string; battleId: string; seed: BattleAudioState | null | undefined; unlocked: boolean }): BattleAudioSnapshot {
  const { campaignId, battleId, seed, unlocked } = args;

  const queryClient = useQueryClient();

  const { data } = useQuery<BattleAudioSnapshot>({
    queryKey: battleKeys.audio(campaignId, battleId),
    queryFn: async () => {
      const fresh = await getBattleAudio(campaignId, battleId);

      return mergeAudioSnapshot(queryClient.getQueryData<BattleAudioSnapshot>(battleKeys.audio(campaignId, battleId)), fresh);
    },
    enabled: unlocked,
    // сцена й Pusher пишуть кеш через setQueryData і роблять його «свіжим», а годинник міряє лише GET після розблокування
    staleTime: 0,
    initialData: { audio: seed ?? null, clockOffsetMs: null },
    initialDataUpdatedAt: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // повна сцена несе audio на момент читання — лише злиття за seq, ніколи не присвоєння
  useEffect(() => {
    if (!seed) return;

    writeAudioSnapshot(queryClient, { campaignId, battleId }, { audio: seed });
  }, [queryClient, campaignId, battleId, seed]);

  // кеш читається синхронно: сповіщення спостерігача приходять пізніше за рендер
  const snapshot = queryClient.getQueryData<BattleAudioSnapshot>(battleKeys.audio(campaignId, battleId)) ?? data;

  const audio = mergeAudio(snapshot.audio, seed);

  return useMemo(() => (audio === snapshot.audio ? snapshot : { audio, clockOffsetMs: snapshot.clockOffsetMs }), [audio, snapshot]);
}
