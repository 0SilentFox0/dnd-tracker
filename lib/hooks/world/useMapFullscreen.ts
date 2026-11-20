'use client';

import { useCallback, useEffect, useState } from 'react';

export function useMapFullscreen() {
    const [full, setFull] = useState(false);

    const toggle = useCallback(() => setFull((f) => !f), []);

    const exit = useCallback(() => setFull(false), []);

    useEffect(() => {
        if (!full) return;

        const root = document.documentElement;

        const prev = root.style.overflow;

        root.style.overflow = 'hidden';

        return () => {
            root.style.overflow = prev;
        };
    }, [full]);

    return { full, toggle, exit };
}
