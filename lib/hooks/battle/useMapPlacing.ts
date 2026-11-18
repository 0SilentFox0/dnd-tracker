'use client';

import { useCallback, useEffect, useState } from 'react';

export function useMapPlacing(isDM: boolean, modeToolActive: boolean) {
    const [placingOn, setPlacingOn] = useState(false);

    const [placingId, setPlacingId] = useState<string | null>(null);

    const stopPlacing = useCallback(() => {
        setPlacingOn(false);
        setPlacingId(null);
    }, []);

    const placing = placingOn && isDM && !modeToolActive;

    useEffect(() => {
        if (!placing) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;

            stopPlacing();
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [placing, stopPlacing]);

    return { placing, placingId, setPlacingOn, setPlacingId, stopPlacing };
}
