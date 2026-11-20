import type { ReactNode } from 'react';

import type { MapPoint } from '@/types/world';

export interface PickedCard {
    point: MapPoint;
    content: ReactNode;
}

export function pickCard({
    trail,
    marker,
    isDesktop,
}: {
    trail?: { node: MapPoint; content: ReactNode } | null;
    marker?: { point: MapPoint | null; content: ReactNode } | null;
    isDesktop: boolean;
}): PickedCard | undefined {
    if (!isDesktop) return undefined;

    if (trail?.content) return { point: trail.node, content: trail.content };

    if (marker?.content && marker.point)
        return { point: marker.point, content: marker.content };

    return undefined;
}
