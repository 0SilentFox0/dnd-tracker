'use client';

import { MarkerBubble } from '@/components/world/nav/MarkerBubble';
import type { WorldMarker } from '@/types/world';

interface PlayerMarkerBubbleProps {
    marker: WorldMarker;
    actions: { onMore(): void; onOpenMap?(): void; onClose(): void };
    embedded?: boolean;
}

export function PlayerMarkerBubble({
    marker,
    actions,
    embedded,
}: PlayerMarkerBubbleProps) {
    return (
        <MarkerBubble marker={marker} actions={actions} embedded={embedded} />
    );
}
