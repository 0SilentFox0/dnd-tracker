'use client';

import { useCallback, useState } from 'react';

import type { SoundPreset } from '@/types/soundboard';

const storageKey = (campaignId: string) => `soundboard.preset.${campaignId}`;

function readSaved(campaignId: string): string | null {
    try {
        return window.localStorage.getItem(storageKey(campaignId));
    } catch {
        return null;
    }
}

export function useActivePreset(
    campaignId: string,
    presets: SoundPreset[]
): { preset: SoundPreset | null; setPresetId(id: string): void } {
    const [savedId, setSavedId] = useState<string | null>(() =>
        typeof window === 'undefined' ? null : readSaved(campaignId)
    );

    const setPresetId = useCallback(
        (id: string) => {
            setSavedId(id);

            try {
                window.localStorage.setItem(storageKey(campaignId), id);
            } catch {
                // storage unavailable: the choice lasts for this session only
            }
        },
        [campaignId]
    );

    const preset =
        presets.find((p) => p.id === savedId) ?? presets[0] ?? null;

    return { preset, setPresetId };
}
