'use client';

import { type TouchEvent, useCallback, useRef } from 'react';

const MIN_DISTANCE = 64;

/** Adjacent id for a horizontal swipe (left = next); null for short or mostly vertical moves. */
export function swipeTarget(
    order: readonly string[],
    current: string,
    dx: number,
    dy: number
): string | null {
    if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5)
        return null;

    const i = order.indexOf(current);

    if (i < 0) return null;

    return order[dx < 0 ? i + 1 : i - 1] ?? null;
}

function insideScroller(target: EventTarget | null, stop: HTMLElement) {
    for (
        let el = target as HTMLElement | null;
        el && el !== stop;
        el = el.parentElement
    ) {
        if (el.matches('input, textarea, select, [role="slider"]')) return true;

        if (el.scrollWidth > el.clientWidth + 1) {
            const overflow = getComputedStyle(el).overflowX;

            if (overflow === 'auto' || overflow === 'scroll') return true;
        }
    }

    return false;
}

/** Touch handlers that call `onChange(id)` on a horizontal swipe, ignoring gestures that start in an inner scroller. */
export function useSwipeTabs(
    order: readonly string[],
    current: string,
    onChange: (id: string) => void
) {
    const start = useRef<{ x: number; y: number } | null>(null);

    const onTouchStart = useCallback((e: TouchEvent<HTMLElement>) => {
        const touch = e.touches[0];

        start.current =
            e.touches.length === 1 &&
            touch &&
            !insideScroller(e.target, e.currentTarget)
                ? { x: touch.clientX, y: touch.clientY }
                : null;
    }, []);

    const onTouchEnd = useCallback(
        (e: TouchEvent<HTMLElement>) => {
            const from = start.current;

            const touch = e.changedTouches[0];

            start.current = null;

            if (!from || !touch) return;

            const next = swipeTarget(
                order,
                current,
                touch.clientX - from.x,
                touch.clientY - from.y
            );

            if (next) onChange(next);
        },
        [order, current, onChange]
    );

    return { onTouchStart, onTouchEnd };
}
