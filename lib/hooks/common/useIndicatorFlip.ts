'use client';

import { type RefObject, useLayoutEffect, useRef } from 'react';

export interface FlipRect {
    left: number;
    width: number;
}

/** Unit-free inverse transform that makes the indicator at `cur` look like it sits at `prev`. */
export function flipDelta(prev: FlipRect, cur: FlipRect) {
    if (cur.width <= 0 || prev.width <= 0) return null;

    return {
        translatePct: ((prev.left - cur.left) / cur.width) * 100,
        scaleX: prev.width / cur.width,
    };
}

/** FLIP-animates an indicator that is a child of the active element; ratios keep it zoom-independent. */
export function useIndicatorFlip(
    indicator: RefObject<HTMLElement | null>,
    active: RefObject<HTMLElement | null>,
    activeId: string
) {
    const prevRect = useRef<DOMRect | null>(null);

    useLayoutEffect(() => {
        const host = active.current;

        if (!host) return;

        const cur = host.getBoundingClientRect();

        const prev = prevRect.current;

        prevRect.current = cur;

        const el = indicator.current;

        if (!prev || !el || typeof el.animate !== 'function') return;

        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
            return;

        const delta = flipDelta(prev, cur);

        if (!delta) return;

        el.animate(
            [
                {
                    transformOrigin: 'left',
                    transform: `translateX(${delta.translatePct}%) scaleX(${delta.scaleX})`,
                },
                { transformOrigin: 'left', transform: 'none' },
            ],
            { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }
        );
    }, [indicator, active, activeId]);
}
