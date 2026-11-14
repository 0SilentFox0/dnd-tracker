'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { battleMapKeys } from './keys';

import {
    cloneBattleMap,
    createBattleMap,
    deleteBattleMap,
    getBattleMaps,
    updateBattleMap,
} from '@/lib/api/battle-maps';
import type { BattleMapInput } from '@/lib/schemas/battle-maps';

export function useBattleMaps(campaignId: string, enabled = true) {
    return useQuery({
        queryKey: battleMapKeys.list(campaignId),
        queryFn: () => getBattleMaps(campaignId),
        enabled,
        staleTime: 60_000,
    });
}

export function useBattleMapMutations(campaignId: string) {
    const queryClient = useQueryClient();

    const onSuccess = () =>
        queryClient.invalidateQueries({
            queryKey: battleMapKeys.list(campaignId),
        });

    return {
        create: useMutation({
            mutationFn: (data: BattleMapInput) =>
                createBattleMap(campaignId, data),
            onSuccess,
        }),
        update: useMutation({
            mutationFn: (v: { mapId: string; data: BattleMapInput }) =>
                updateBattleMap(campaignId, v.mapId, v.data),
            onSuccess,
        }),
        remove: useMutation({
            mutationFn: (mapId: string) => deleteBattleMap(campaignId, mapId),
            onSuccess,
        }),
        clone: useMutation({
            mutationFn: (mapId: string) => cloneBattleMap(campaignId, mapId),
            onSuccess,
        }),
    };
}
