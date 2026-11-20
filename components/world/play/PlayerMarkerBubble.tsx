'use client';

import { MarkerBubble } from '@/components/world/MarkerBubble';
import type { WorldMarker } from '@/types/world';

interface PlayerMarkerBubbleProps {
    marker: WorldMarker;
    actions: { onMore(): void; onOpenMap?(): void; onClose(): void };
}

export function PlayerMarkerBubble({
    marker,
    actions,
}: PlayerMarkerBubbleProps) {
    return <MarkerBubble marker={marker} actions={actions} />;
}
