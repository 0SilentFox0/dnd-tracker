'use client';

import { useCallback, useMemo, useRef } from 'react';

import { markLocalPlay } from './handle-play-event';
import { playBuffer } from './player';
import { useActivePreset } from './useActivePreset';
import { useSoundLibrary } from './useSoundLibrary';
import { useSoundPreview } from './useSoundPreview';

import { ApiError } from '@/lib/api/client';
import { playSound } from '@/lib/api/soundboard';
import { PAD_GUARD_MS, PRESET_SLOTS } from '@/lib/constants/soundboard';
import { readAudioPrefs } from '@/lib/hooks/audio';
import { useNotify } from '@/lib/hooks/common';
import { effectiveVolume } from '@/lib/utils/soundboard/volume';
import type { LibrarySound, SoundPreset } from '@/types/soundboard';

export function useSoundboardPads(campaignId: string): {
    preset: SoundPreset | null;
    presets: SoundPreset[];
    setPresetId(id: string): void;
    pads: (LibrarySound | null)[];
    play(sound: LibrarySound): void;
    preview(sound: LibrarySound): void;
} {
    const { byId, presets } = useSoundLibrary();

    const { preset, setPresetId } = useActivePreset(campaignId, presets);

    const notify = useNotify();

    const lastPlayed = useRef(new Map<string, number>());

    const pads = useMemo(
        () =>
            Array.from({ length: PRESET_SLOTS }, (_, i) => {
                const id = preset?.slots[i];

                return (id && byId.get(id)) || null;
            }),
        [preset, byId]
    );

    const play = useCallback(
        (sound: LibrarySound) => {
            const now = Date.now();

            const last = lastPlayed.current.get(sound.id);

            if (last !== undefined && now - last < PAD_GUARD_MS) return;

            lastPlayed.current.set(sound.id, now);

            const nonce = crypto.randomUUID();

            markLocalPlay(nonce);
            void playBuffer(sound, effectiveVolume(sound, readAudioPrefs()));

            playSound(campaignId, { soundId: sound.id, nonce }).catch(
                (error) => {
                    if (error instanceof ApiError && error.status === 429)
                        return;

                    void notify(
                        error instanceof Error ? error.message : String(error)
                    );
                }
            );
        },
        [campaignId, notify]
    );

    const preview = useSoundPreview();

    return { preset, presets, setPresetId, pads, play, preview };
}
