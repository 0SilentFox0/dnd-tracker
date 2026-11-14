'use client';

import { MapLibraryList } from '@/components/maps/MapLibraryList';

export function MapsPageClient({ campaignId }: { campaignId: string }) {
    return <MapLibraryList campaignId={campaignId} />;
}
