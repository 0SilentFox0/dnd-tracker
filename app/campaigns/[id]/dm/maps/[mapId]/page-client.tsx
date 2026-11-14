'use client';

import { MapEditorScreen } from '@/components/maps/MapEditorScreen';

export function MapEditorPageClient({
    campaignId,
    mapId,
}: {
    campaignId: string;
    mapId: string;
}) {
    return <MapEditorScreen campaignId={campaignId} mapId={mapId} />;
}
