import { useEffect, useRef } from 'react';

export interface GlideFrame {
    left: string;
    top: string;
}

const STEP_MS = 120;

const MIN_MS = 220;

const MAX_MS = 1500;

/** Проводить елемент по кадрах маршруту (Web Animations); без маршруту елемент стоїть у своїй позиції. */
export function useTokenGlide<T extends HTMLElement>(
    frames: readonly GlideFrame[] | null
) {
    const ref = useRef<T>(null);

    useEffect(() => {
        const el = ref.current;

        if (!el || !frames || frames.length < 2 || !el.animate) return;

        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
            return;

        el.animate([...frames], {
            duration: Math.min(
                MAX_MS,
                Math.max(MIN_MS, (frames.length - 1) * STEP_MS)
            ),
            easing: 'linear',
        });
    }, [frames]);

    return ref;
}
