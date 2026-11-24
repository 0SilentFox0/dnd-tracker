'use client';

import { type RefObject, useLayoutEffect, useState } from 'react';

export interface IndicatorBox {
    left: number;
    width: number;
}

/** Measures `[data-tab="<id>"]` inside the container; apply as translateX(left) scaleX(width) on a 1px-wide indicator. */
export function useSlidingIndicator(
    container: RefObject<HTMLElement | null>,
    activeId: string
): IndicatorBox | null {
    const [box, setBox] = useState<IndicatorBox | null>(null);

    useLayoutEffect(() => {
        const root = container.current;

        if (!root) return;

        const measure = () => {
            const el = Array.from(
                root.querySelectorAll<HTMLElement>('[data-tab]')
            ).find((node) => node.dataset.tab === activeId);

            if (!el) return setBox(null);

            const next = { left: el.offsetLeft, width: el.offsetWidth };

            setBox((prev) =>
                prev && prev.left === next.left && prev.width === next.width
                    ? prev
                    : next
            );
        };

        measure();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(measure);

        observer.observe(root);

        return () => observer.disconnect();
    }, [container, activeId]);

    return box;
}
