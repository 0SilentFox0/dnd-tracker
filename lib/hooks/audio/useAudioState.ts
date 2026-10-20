"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { writeAudioSnapshot } from "./audio-snapshot";
import type { AudioHost } from "./host";

import { mergeAudio, mergeAudioSnapshot } from "@/lib/utils/audio/merge";
import type { BattleAudioSnapshot } from "@/types/audio";

/** unlocked = звук увімкнено: лише тоді GET (свіжий стан і годинник); до того — seed і Pusher. */
export function useAudioState({ host, unlocked }: { host: AudioHost; unlocked: boolean }): BattleAudioSnapshot {
  const { queryKey, seed, fetch } = host;

  const queryClient = useQueryClient();

  const { data } = useQuery<BattleAudioSnapshot>({
    queryKey,
    queryFn: async () => mergeAudioSnapshot(queryClient.getQueryData<BattleAudioSnapshot>(queryKey), await fetch()),
    enabled: unlocked,
    // seed і Pusher пишуть кеш через setQueryData і роблять його «свіжим», а годинник міряє лише GET після розблокування
    staleTime: 0,
    initialData: { audio: seed ?? null, clockOffsetMs: null },
    initialDataUpdatedAt: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // seed несе стан на момент читання — лише злиття за seq, ніколи не присвоєння
  useEffect(() => {
    if (!seed) return;

    writeAudioSnapshot(queryClient, queryKey, { audio: seed });
  }, [queryClient, queryKey, seed]);

  // кеш читається синхронно: сповіщення спостерігача приходять пізніше за рендер
  const snapshot = queryClient.getQueryData<BattleAudioSnapshot>(queryKey) ?? data;

  const audio = mergeAudio(snapshot.audio, seed);

  return useMemo(() => (audio === snapshot.audio ? snapshot : { audio, clockOffsetMs: snapshot.clockOffsetMs }), [audio, snapshot]);
}
