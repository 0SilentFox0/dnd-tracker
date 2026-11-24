'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from './media-query';

interface CountUpOptions {
    duration?: number;
    enabled?: boolean;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Counts 0 → target once on mount (SSR/first paint shows the real value), then tweens between later targets; instant under reduced motion. */
export function useCountUp(
    target: number,
    { duration = 700, enabled = true }: CountUpOptions = {}
): number {
    const [value, setValue] = useState(target);

    const shown = useRef(target);

    useLayoutEffect(() => {
        if (!enabled || prefersReducedMotion()) return;

        shown.current = 0;
        setValue(0);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!enabled || prefersReducedMotion() || shown.current === target) {
            shown.current = target;
            setValue(target);

            return;
        }

        const from = shown.current;

        let start: number | null = null;

        let frame = 0;

        const tick = (now: number) => {
            start ??= now;

            const t = Math.min(1, (now - start) / duration);

            shown.current = from + (target - from) * easeOut(t);
            setValue(Math.round(shown.current));

            if (t < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [target, duration, enabled]);

    return value;
}
