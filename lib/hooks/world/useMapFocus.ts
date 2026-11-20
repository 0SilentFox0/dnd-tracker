'use client';

import { useCallback, useState } from 'react';

import type { MapFocus, MapPoint } from '@/types/world';

export function useMapFocus() {
    const [focus, setFocus] = useState<MapFocus | undefined>();

    const focusPoint = useCallback(
        (point: MapPoint, zoom?: number) =>
            setFocus((f) => ({ point, seq: (f?.seq ?? 0) + 1, zoom })),
        []
    );

    return { focus, focusPoint };
}
