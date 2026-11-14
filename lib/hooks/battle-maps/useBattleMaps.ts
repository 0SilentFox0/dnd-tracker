'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { battleMapKeys } from './keys';

import {
    cloneBattleMap,
    createBattleMap,
    deleteBattleMap,
    getBattleMap,
    getBattleMaps,
    updateBattleMap,
} from '@/lib/api/battle-maps';
import type { BattleMapInput } from '@/lib/schemas/battle-maps';

export function useBattleMaps(
    campaignId: string,
    enabled = true,
    options: {
        staleTime?: number;
        refetchOnWindowFocus?: boolean | 'always';
    } = {}
) {
    return useQuery({
        queryKey: battleMapKeys.list(campaignId),
        queryFn: () => getBattleMaps(campaignId),
        enabled,
        staleTime: 60_000,
        ...options,
    });
}

export function useBattleMap(campaignId: string, mapId: string) {
    return useQuery({
        queryKey: battleMapKeys.detail(campaignId, mapId),
        queryFn: () => getBattleMap(campaignId, mapId),
        staleTime: 0,
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
            onSuccess: (_data, v) => {
                void queryClient.invalidateQueries({
                    queryKey: battleMapKeys.detail(campaignId, v.mapId),
                    refetchType: 'none',
                });

                return onSuccess();
            },
        }),
        remove: useMutation({
            mutationFn: (mapId: string) => deleteBattleMap(campaignId, mapId),
            onSuccess: (_data, mapId) => {
                queryClient.removeQueries({
                    queryKey: battleMapKeys.detail(campaignId, mapId),
                });

                return onSuccess();
            },
        }),
        clone: useMutation({
            mutationFn: (v: { mapId: string; name?: string }) =>
                cloneBattleMap(campaignId, v.mapId, v.name),
            onSuccess,
        }),
    };
}
