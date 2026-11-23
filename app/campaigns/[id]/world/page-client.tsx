'use client';

import { WorldPlayClient } from '@/components/world/play/WorldPlayClient';

export function WorldPageClient(props: {
    campaignId: string;
    campaignName: string;
    mapId: string | null;
    markerId?: string;
}) {
    return (
        <WorldPlayClient
            key={`${props.mapId ?? 'none'}:${props.markerId ?? ''}`}
            {...props}
        />
    );
}
