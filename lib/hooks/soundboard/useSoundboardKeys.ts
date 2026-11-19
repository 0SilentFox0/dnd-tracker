'use client';

import { useEffect, useRef } from 'react';

import type { Sound } from '@/types/soundboard';

const TYPING =
    'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

export function useSoundboardKeys(
    pads: Sound[] | null,
    play: (sound: Sound) => void
) {
    const latest = useRef({ pads, play });

    useEffect(() => {
        latest.current = { pads, play };
    });

    const enabled = pads !== null;

    useEffect(() => {
        if (!enabled) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

            if (!/^[1-9]$/.test(e.key)) return;

            const target = e.target instanceof Element ? e.target : null;

            if (target?.closest(TYPING)) return;

            if (document.querySelector('[role=dialog]')) return;

            const sound = latest.current.pads?.[Number(e.key) - 1];

            if (!sound) return;

            e.preventDefault();
            latest.current.play(sound);
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [enabled]);
}
