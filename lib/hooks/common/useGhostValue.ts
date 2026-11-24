'use client';

import { useEffect, useState } from 'react';

import { prefersReducedMotion } from './media-query';

export type GhostFlash = 'damage' | 'heal' | null;

const GHOST_DELAY = 480;

const FLASH_MS = 320;

/** `ghost` lags behind `current` when it drops (damage tail); `flash` marks the last change for 320 ms. */
export function useGhostValue(current: number) {
    const [seen, setSeen] = useState(current);

    const [tail, setTail] = useState(current);

    const [flash, setFlash] = useState<GhostFlash>(null);

    if (seen !== current) {
        setFlash(
            prefersReducedMotion() ? null : current < seen ? 'damage' : 'heal'
        );
        setSeen(current);
    }

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];

        const reduce = prefersReducedMotion();

        timers.push(
            setTimeout(() => setTail(current), reduce ? 0 : GHOST_DELAY)
        );
        timers.push(setTimeout(() => setFlash(null), FLASH_MS));

        return () => timers.forEach(clearTimeout);
    }, [current]);

    const reduce = prefersReducedMotion();

    return { ghost: reduce ? current : Math.max(tail, current), flash };
}
