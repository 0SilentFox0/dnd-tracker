'use client';

import { useEffect, useRef } from 'react';

import { shortcutBlocked } from './shortcut-guard';

/** P toggles the player view; matched by e.code so it works on any keyboard layout. */
export function usePlayerViewKey(onToggle: () => void, active: boolean): void {
    const latest = useRef(onToggle);

    useEffect(() => {
        latest.current = onToggle;
    });

    useEffect(() => {
        if (!active) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.code !== 'KeyP' || e.repeat || shortcutBlocked(e)) return;

            e.preventDefault();
            latest.current();
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [active]);
}
