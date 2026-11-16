'use client';

import { useQuery } from '@tanstack/react-query';

import { getMapCatalog } from '@/lib/api/map-catalog';

export const mapCatalogKey = ['map-catalog'] as const;

export function useMapCatalog(enabled = true) {
    return useQuery({
        queryKey: mapCatalogKey,
        queryFn: getMapCatalog,
        enabled,
        staleTime: 60 * 60 * 1000,
        retry: 1,
    });
}
