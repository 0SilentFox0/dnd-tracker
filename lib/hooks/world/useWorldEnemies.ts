'use client';

import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';

import { worldKeys } from './keys';

import { createEnemy, deleteEnemy, updateEnemy } from '@/lib/api/world';
import { useCrudMutation } from '@/lib/hooks/common';
import type {
    CreateEnemyData,
    UpdateEnemyData,
    WorldMapDetail,
} from '@/types/world';

export function useWorldEnemies(campaignId: string, mapId: string) {
    const queryClient = useQueryClient();

    const t = useTranslations('world.errors');

    const mapKey = worldKeys.map(campaignId, mapId);

    const invalidateKeys = () => [worldKeys.map(campaignId, mapId)];

    const create = useCrudMutation({
        mutationFn: (data: CreateEnemyData) =>
            createEnemy(campaignId, mapId, data),
        invalidateKeys,
        errorText: t('saveEnemy'),
    });

    const update = useCrudMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateEnemyData }) =>
            updateEnemy(campaignId, mapId, id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: mapKey });

            const prev = queryClient.getQueryData<WorldMapDetail>(mapKey);

            queryClient.setQueryData<WorldMapDetail>(mapKey, (d) =>
                d?.enemies
                    ? {
                          ...d,
                          enemies: d.enemies.map((e) =>
                              e.id === id ? { ...e, ...data } : e
                          ),
                      }
                    : d
            );

            return prev;
        },
        onError: (
            _e: unknown,
            _v: unknown,
            prev: WorldMapDetail | undefined
        ) => {
            if (prev) queryClient.setQueryData(mapKey, prev);
        },
        invalidateKeys,
        errorText: t('saveEnemy'),
    });

    const remove = useCrudMutation({
        mutationFn: (id: string) => deleteEnemy(campaignId, mapId, id),
        invalidateKeys,
        errorText: t('deleteEnemy'),
    });

    return { create, update, remove };
}
