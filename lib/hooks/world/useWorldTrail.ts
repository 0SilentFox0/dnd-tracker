'use client';

import { useQuery } from '@tanstack/react-query';

import { worldKeys } from './keys';

import { getTrail } from '@/lib/api/world';
import type { WorldTrailData } from '@/types/world';

const STALE_MS = 15_000;

export function useWorldTrail(
    campaignId: string,
    mapId: string | null,
    enabled = true
) {
    return useQuery<WorldTrailData>({
        queryKey: worldKeys.trail(campaignId, mapId ?? ''),
        queryFn: () => getTrail(campaignId, mapId as string),
        enabled: enabled && !!mapId,
        staleTime: STALE_MS,
    });
}
