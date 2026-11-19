'use client';

import { useCallback, useRef } from 'react';

import { markLocalPlay } from './handle-play-event';
import { playBuffer, previewSound } from './player';
import { useSoundLibrary } from './useSounds';

import { ApiError } from '@/lib/api/client';
import { playSound } from '@/lib/api/soundboard';
import { PAD_GUARD_MS } from '@/lib/constants/soundboard';
import { readAudioPrefs } from '@/lib/hooks/audio';
import { useNotify } from '@/lib/hooks/common';
import { effectiveVolume } from '@/lib/utils/soundboard/volume';
import type { Sound } from '@/types/soundboard';

export function useSoundboardPads(campaignId: string): {
    sounds: Sound[];
    play(sound: Sound): void;
    preview(sound: Sound): void;
} {
    const { all } = useSoundLibrary(campaignId);

    const notify = useNotify();

    const lastPlayed = useRef(new Map<string, number>());

    const play = useCallback(
        (sound: Sound) => {
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

    const preview = useCallback(
        (sound: Sound) =>
            void previewSound(sound, effectiveVolume(sound, readAudioPrefs())),
        []
    );

    return { sounds: all, play, preview };
}
