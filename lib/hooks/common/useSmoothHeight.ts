'use client';

import { type RefObject, useLayoutEffect, useRef } from 'react';

import { prefersReducedMotion } from './media-query';

/** Animates the container height between the old and new content whenever `key` changes. */
export function useSmoothHeight(
    container: RefObject<HTMLElement | null>,
    key: string,
    duration = 320
) {
    const last = useRef<{ key: string; height: number } | null>(null);

    useLayoutEffect(() => {
        const el = container.current;

        if (!el) return;

        const height = el.offsetHeight;

        const prev = last.current;

        last.current = { key, height };

        if (
            !prev ||
            prev.key === key ||
            Math.abs(prev.height - height) < 2 ||
            prefersReducedMotion() ||
            typeof el.animate !== 'function'
        )
            return;

        el.animate(
            [
                { height: `${prev.height}px`, overflow: 'clip' },
                { height: `${height}px`, overflow: 'clip' },
            ],
            { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
    }, [container, key, duration]);
}
