'use client';

import { skipToken, useQuery } from '@tanstack/react-query';

import { getMapCatalogAsset } from '@/lib/api/map-catalog';
import { parseUvtt } from '@/lib/utils/battle/uvtt/parse';
import type { MapCatalogEntry } from '@/types/map-catalog';

export function useMapCatalogPreview(
    entry: MapCatalogEntry | undefined,
    enabled: boolean
) {
    return useQuery({
        queryKey: ['map-catalog-preview', entry?.id],
        queryFn: entry
            ? async () => parseUvtt(await getMapCatalogAsset(entry))
            : skipToken,
        enabled: enabled && Boolean(entry),
        staleTime: 0,
        gcTime: 30 * 1000,
        retry: false,
    });
}
