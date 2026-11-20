'use client';

import { useTranslations } from 'next-intl';

import { worldKeys } from './keys';

import {
    createWorldLayer,
    deleteWorldLayer,
    setWorldLayerHeroes,
    updateWorldLayer,
} from '@/lib/api/world';
import { useCrudMutation } from '@/lib/hooks/common';
import type {
    CreateWorldLayerData,
    DeleteWorldLayerMode,
    UpdateWorldLayerData,
} from '@/types/world';

export function useWorldLayers(campaignId: string, mapId: string) {
    const t = useTranslations('world.errors');

    const invalidateKeys = () => [
        worldKeys.mapAll(campaignId),
        worldKeys.viewAll(campaignId),
    ];

    const create = useCrudMutation({
        mutationFn: (data: Omit<CreateWorldLayerData, 'mapId'>) =>
            createWorldLayer(campaignId, { ...data, mapId }),
        invalidateKeys,
        errorText: t('createLayer'),
    });

    const update = useCrudMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateWorldLayerData }) =>
            updateWorldLayer(campaignId, id, data),
        invalidateKeys,
        errorText: t('saveLayer'),
    });

    const setHeroes = useCrudMutation({
        mutationFn: ({ id, heroIds }: { id: string; heroIds: string[] }) =>
            setWorldLayerHeroes(campaignId, id, heroIds),
        invalidateKeys,
        errorText: t('saveLayer'),
    });

    const remove = useCrudMutation({
        mutationFn: ({ id, mode }: { id: string; mode?: DeleteWorldLayerMode }) =>
            deleteWorldLayer(campaignId, id, mode),
        invalidateKeys,
        errorText: t('deleteLayer'),
    });

    return { create, update, setHeroes, remove };
}
