import { type KeyboardEvent, useRef } from 'react';

interface RovingOptions {
    count: number;
    active: number;
    onMove: (index: number) => void;
    cols?: number;
    loop?: boolean;
}

export function useRovingIndex({
    count,
    active,
    onMove,
    cols = 1,
    loop = false,
}: RovingOptions) {
    const items = useRef(new Map<number, HTMLElement>());

    const target = (key: string): number | null => {
        const step =
            key === 'ArrowRight' || key === 'ArrowLeft'
                ? 1
                : key === 'ArrowDown' || key === 'ArrowUp'
                  ? cols
                  : 0;

        if (key === 'Home') return 0;

        if (key === 'End') return count - 1;

        if (step === 0) return null;

        const raw =
            active +
            (key === 'ArrowRight' || key === 'ArrowDown' ? step : -step);

        if (raw >= 0 && raw < count) return raw;

        if (!loop) return null;

        return (raw + count) % count;
    };

    const onKeyDown = (e: KeyboardEvent) => {
        const next = target(e.key);

        if (next === null || next === active || count === 0) return;

        e.preventDefault();
        items.current.get(next)?.focus();
        onMove(next);
    };

    return {
        tabIndex: (i: number): 0 | -1 => (i === active ? 0 : -1),
        onKeyDown,
        itemRef: (i: number) => (el: HTMLElement | null) => {
            if (el) items.current.set(i, el);
            else items.current.delete(i);
        },
    };
}
