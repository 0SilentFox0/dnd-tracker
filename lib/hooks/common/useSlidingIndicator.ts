'use client';

import { type RefObject, useLayoutEffect, useState } from 'react';

export interface IndicatorBox {
    left: number;
    width: number;
}

function effectiveZoom(el: HTMLElement): number {
    let zoom = 1;

    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        zoom *= parseFloat(getComputedStyle(node).zoom) || 1;
    }

    return zoom;
}

/** Converts offset* values to the element's local px: browsers report them in zoomed units while transforms apply inside the zoom. */
export function toLocalBox(
    box: IndicatorBox,
    visualPerOffset: number,
    zoom: number
): IndicatorBox {
    const k = zoom > 1 && visualPerOffset > 0 ? visualPerOffset / zoom : 1;

    return { left: box.left * k, width: box.width * k };
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

            const visual =
                root.offsetWidth > 0
                    ? root.getBoundingClientRect().width / root.offsetWidth
                    : 1;

            const next = toLocalBox(
                { left: el.offsetLeft, width: el.offsetWidth },
                visual,
                effectiveZoom(root)
            );

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
