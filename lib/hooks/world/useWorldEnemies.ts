'use client';

import { useTranslations } from 'next-intl';

import { worldKeys } from './keys';

import { createEnemy, deleteEnemy, updateEnemy } from '@/lib/api/world';
import { useCrudMutation } from '@/lib/hooks/common';
import type { CreateEnemyData, UpdateEnemyData } from '@/types/world';

export function useWorldEnemies(campaignId: string, mapId: string) {
    const t = useTranslations('world.errors');

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
