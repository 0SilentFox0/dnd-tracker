'use client';

import { useEffect, useRef, useState } from 'react';

const ZERO = { width: 0, height: 0 };

/** `contentBox`: after the first measure, take the observer's content rect (no padding/border) instead of the bounding rect. */
export function useElementSize<T extends HTMLElement>({
    contentBox = false,
}: { contentBox?: boolean } = {}) {
    const ref = useRef<T>(null);

    const [size, setSize] = useState(ZERO);

    useEffect(() => {
        const el = ref.current;

        if (!el) return;

        const apply = ({ width, height }: { width: number; height: number }) =>
            setSize((s) =>
                s.width === width && s.height === height ? s : { width, height }
            );

        const sync = () => apply(el.getBoundingClientRect());

        sync();

        const observer = new ResizeObserver(([entry]) =>
            contentBox && entry ? apply(entry.contentRect) : sync()
        );

        observer.observe(el);

        return () => observer.disconnect();
    }, [contentBox]);

    return { ref, size };
}
