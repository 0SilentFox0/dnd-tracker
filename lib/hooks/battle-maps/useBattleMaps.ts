'use client';

import {
    skipToken,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';

import { battleMapKeys } from './keys';
import { announceMapLibraryChange } from './mapLibrarySync';

import {
    cloneBattleMap,
    createBattleMap,
    deleteBattleMap,
    getBattleMap,
    getBattleMaps,
    getBattleMapTiles,
    patchBattleMapTiles,
    updateBattleMap,
} from '@/lib/api/battle-maps';
import type {
    BattleMapInput,
    BattleMapSaveInput,
} from '@/lib/schemas/battle-maps';

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

export function useBattleMapTiles(
    campaignId: string,
    mapId: string | undefined,
    version?: number,
    enabled = mapId !== undefined
) {
    return useQuery({
        queryKey: battleMapKeys.tiles(campaignId, mapId ?? '', version),
        queryFn: mapId
            ? () => getBattleMapTiles(campaignId, mapId, version)
            : skipToken,
        enabled,
        staleTime: 0,
    });
}

export function usePatchBattleMapTiles(campaignId: string, mapId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof patchBattleMapTiles>[2]) =>
            patchBattleMapTiles(campaignId, mapId, data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: battleMapKeys.tiles(campaignId, mapId),
            });
            announceMapLibraryChange(campaignId);
        },
    });
}

export function useBattleMapMutations(campaignId: string) {
    const queryClient = useQueryClient();

    const onSuccess = () => {
        announceMapLibraryChange(campaignId);

        return queryClient.invalidateQueries({
            queryKey: battleMapKeys.list(campaignId),
        });
    };

    return {
        create: useMutation({
            mutationFn: (data: BattleMapInput) =>
                createBattleMap(campaignId, data),
            onSuccess,
        }),
        update: useMutation({
            mutationFn: (v: { mapId: string; data: BattleMapSaveInput }) =>
                updateBattleMap(campaignId, v.mapId, v.data),
            onSuccess: (_data, v) => {
                void queryClient.invalidateQueries({
                    queryKey: battleMapKeys.detail(campaignId, v.mapId),
                    refetchType: 'none',
                });
                void queryClient.invalidateQueries({
                    queryKey: battleMapKeys.tiles(campaignId, v.mapId),
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
