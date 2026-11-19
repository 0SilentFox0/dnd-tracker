'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { soundKeys } from './keys';

import { getSounds } from '@/lib/api/soundboard';
import { BUILTIN_SOUNDS } from '@/lib/constants/soundboard';
import type { Sound, SoundList } from '@/types/soundboard';

export function useSounds(
    campaignId: string,
    options: { enabled?: boolean } = {}
) {
    return useQuery<SoundList>({
        queryKey: soundKeys.list(campaignId),
        queryFn: () => getSounds(campaignId),
        enabled: options.enabled ?? true,
        staleTime: 60_000,
    });
}

const NONE: SoundList = { sounds: [], hiddenBuiltin: [] };

export function useSoundLibrary(
    campaignId: string,
    options: { enabled?: boolean } = {}
): { custom: Sound[]; hiddenBuiltin: string[]; all: Sound[] } {
    const { data = NONE } = useSounds(campaignId, options);

    return useMemo(() => {
        const custom: Sound[] = data.sounds.map((s) => ({
            ...s,
            source: 'custom',
        }));

        const builtin: Sound[] = BUILTIN_SOUNDS.filter(
            (b) => !data.hiddenBuiltin.includes(b.id)
        ).map((b) => ({
            id: b.id,
            source: 'builtin',
            name: b.nameKey,
            url: b.url,
            volume: 1,
            color: null,
            icon: b.icon,
            sortOrder: 0,
            durationMs: null,
        }));

        return {
            custom,
            hiddenBuiltin: data.hiddenBuiltin,
            all: [...builtin, ...custom],
        };
    }, [data]);
}
