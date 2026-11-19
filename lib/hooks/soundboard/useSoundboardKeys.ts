'use client';

import { useEffect, useRef } from 'react';

import { shortcutBlocked } from '@/lib/hooks/common';
import type { LibrarySound } from '@/types/soundboard';

export function useSoundboardKeys(
    pads: (LibrarySound | null)[] | null,
    play: (sound: LibrarySound) => void
) {
    const latest = useRef({ pads, play });

    useEffect(() => {
        latest.current = { pads, play };
    });

    const enabled = pads !== null;

    useEffect(() => {
        if (!enabled) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.repeat || shortcutBlocked(e)) return;

            if (!/^[1-9]$/.test(e.key)) return;

            const sound = latest.current.pads?.[Number(e.key) - 1];

            if (!sound) return;

            e.preventDefault();
            latest.current.play(sound);
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [enabled]);
}
