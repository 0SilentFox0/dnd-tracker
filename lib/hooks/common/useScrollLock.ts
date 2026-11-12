'use client';

import { useEffect } from 'react';

const SCROLL_KEYS = new Set([
    ' ',
    'PageUp',
    'PageDown',
    'Home',
    'End',
    'ArrowUp',
    'ArrowDown',
]);

const isEditable = (el: EventTarget | null) =>
    el instanceof HTMLElement &&
    (el.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

// blocks user scrolling only: programmatic scrollIntoView / scrollTo keep working
export function useScrollLock(active: boolean, allow?: string) {
    useEffect(() => {
        if (!active) return;

        const inAllowed = (e: Event) =>
            !!allow && e.target instanceof Element && !!e.target.closest(allow);

        const block = (e: Event) => {
            if (!inAllowed(e)) e.preventDefault();
        };

        const onKey = (e: KeyboardEvent) => {
            if (
                SCROLL_KEYS.has(e.key) &&
                !isEditable(e.target) &&
                !(e.target instanceof HTMLButtonElement && e.key === ' ')
            )
                e.preventDefault();
        };

        window.addEventListener('wheel', block, { passive: false });
        window.addEventListener('touchmove', block, { passive: false });
        window.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('wheel', block);
            window.removeEventListener('touchmove', block);
            window.removeEventListener('keydown', onKey);
        };
    }, [active, allow]);
}
