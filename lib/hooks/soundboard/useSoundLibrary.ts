'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { soundKeys } from './keys';

import { getSoundLibrary } from '@/lib/api/sound-library';
import { BUILTIN_LIBRARY_SOUNDS } from '@/lib/utils/soundboard/resolve-sound';
import type { LibrarySound, SoundPreset } from '@/types/soundboard';

const NO_PRESETS: SoundPreset[] = [];

export function useSoundLibrary(options: { enabled?: boolean } = {}): {
    sounds: LibrarySound[];
    byId: Map<string, LibrarySound>;
    presets: SoundPreset[];
    isLoading: boolean;
} {
    const { data, isLoading } = useQuery({
        queryKey: soundKeys.library(),
        queryFn: getSoundLibrary,
        enabled: options.enabled ?? true,
        staleTime: 60_000,
    });

    return useMemo(() => {
        const custom: LibrarySound[] = (data?.sounds ?? []).map((row) => ({
            id: row.id,
            source: 'library',
            name: row.name,
            icon: row.icon,
            color: row.color,
            volume: row.volume,
            url: row.url,
            durationMs: row.durationMs,
        }));

        const sounds = [...BUILTIN_LIBRARY_SOUNDS, ...custom];

        return {
            sounds,
            byId: new Map(sounds.map((s) => [s.id, s])),
            presets: data?.presets ?? NO_PRESETS,
            isLoading,
        };
    }, [data, isLoading]);
}
