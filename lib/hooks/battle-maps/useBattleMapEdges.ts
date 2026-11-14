'use client';

import { skipToken, useQuery } from '@tanstack/react-query';

import { battleMapKeys } from './keys';

import { getBattleMap } from '@/lib/api/battle-maps';
import type { LibraryEdges } from '@/lib/utils/battle/map-storage/effective-map';
import type { BattleMapRef } from '@/types/battle';

const EDGES_GC_MS = 30 * 60_000;

/** Ребра pinned-версії карти бібліотеки; незмінні, тож без повторних запитів. */
export function useBattleMapEdges(
    campaignId: string,
    ref: BattleMapRef | undefined
) {
    return useQuery<LibraryEdges>({
        queryKey: battleMapKeys.edges(campaignId, ref),
        queryFn: ref
            ? async () => {
                  const { walls, bars } = await getBattleMap(
                      campaignId,
                      ref.mapId,
                      ref.version
                  );

                  return { walls, bars };
              }
            : skipToken,
        staleTime: Infinity,
        gcTime: EDGES_GC_MS,
        structuralSharing: false,
    });
}
