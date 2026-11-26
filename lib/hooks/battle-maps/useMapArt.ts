'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { battleMapKeys } from './keys';
import { announceMapLibraryChange } from './mapLibrarySync';

import { deleteMapArt, getMapArt } from '@/lib/api/battle-maps';

export function useMapArt(campaignId: string, mapId: string) {
    return useQuery({
        queryKey: battleMapKeys.art(campaignId, mapId),
        queryFn: () => getMapArt(campaignId, mapId),
        staleTime: 0,
    });
}

export function useDeleteMapArt(campaignId: string, mapId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => deleteMapArt(campaignId, mapId),
        onSuccess: async () => {
            void queryClient.invalidateQueries({
                queryKey: battleMapKeys.detail(campaignId, mapId),
                refetchType: 'none',
            });
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: battleMapKeys.art(campaignId, mapId),
                }),
                queryClient.invalidateQueries({
                    queryKey: battleMapKeys.list(campaignId),
                }),
            ]);
            announceMapLibraryChange(campaignId);
        },
    });
}
