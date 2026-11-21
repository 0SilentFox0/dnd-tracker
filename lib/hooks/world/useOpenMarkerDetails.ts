'use client';

import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';
import { markerAnchor } from '@/lib/utils/world/geometry';
import type { MapPoint, WorldMarker } from '@/types/world';

export function useOpenMarkerDetails({
    marker,
    exitFullscreen,
    focusPoint,
    setDetailsOpen,
}: {
    marker: WorldMarker | null | undefined;
    exitFullscreen: () => void;
    focusPoint: (point: MapPoint, zoom?: number) => void;
    setDetailsOpen: (open: boolean) => void;
}) {
    const desktop = useMediaQuery(DESKTOP_QUERY);

    return () => {
        if (!marker) return;

        if (desktop) {
            exitFullscreen();
            focusPoint(markerAnchor(marker), 1);
        }

        setDetailsOpen(true);
    };
}
