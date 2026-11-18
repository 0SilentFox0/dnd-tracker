'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { writeAudioSnapshot } from './audio-snapshot';
import type { AudioHost } from './host';

import { mergeAudio, mergeAudioSnapshot } from '@/lib/utils/audio/merge';
import type { BattleAudioSnapshot } from '@/types/audio';

export function useAudioState({
    host,
    unlocked,
}: {
    host: AudioHost;
    unlocked: boolean;
}): BattleAudioSnapshot {
    const { queryKey, seed, fetch } = host;

    const queryClient = useQueryClient();

    const { data } = useQuery<BattleAudioSnapshot>({
        queryKey,
        queryFn: async () => {
            const fresh = await fetch();

            return mergeAudioSnapshot(
                queryClient.getQueryData<BattleAudioSnapshot>(queryKey),
                fresh
            );
        },
        enabled: unlocked,
        // seed and Pusher write the cache via setQueryData making it "fresh", while the clock measures only the GET after unlock
        staleTime: 0,
        initialData: { audio: seed ?? null, clockOffsetMs: null },
        initialDataUpdatedAt: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    // the seed carries the state at read time: merge by seq only, never assign
    useEffect(() => {
        if (!seed) return;

        writeAudioSnapshot(queryClient, queryKey, { audio: seed });
    }, [queryClient, queryKey, seed]);

    // the cache is read synchronously: observer notifications arrive after the render
    const snapshot =
        queryClient.getQueryData<BattleAudioSnapshot>(queryKey) ?? data;

    const audio = mergeAudio(snapshot.audio, seed);

    return useMemo(
        () =>
            audio === snapshot.audio
                ? snapshot
                : { audio, clockOffsetMs: snapshot.clockOffsetMs },
        [audio, snapshot]
    );
}
