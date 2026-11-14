'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useBattleMapMutations, useBattleMaps } from './useBattleMaps';

import { DEFAULT_BATTLE_MAP } from '@/lib/constants/battle';
import { useLibraryList, useNotify } from '@/lib/hooks/common';
import { errorMessage } from '@/lib/utils/common/error-message';
import type { BattleMapBrief } from '@/types/battle-map';

export interface NewMapForm {
    name: string;
    cols: number;
    rows: number;
}

const NAME_MAX = 80;

export function useMapLibrary(campaignId: string) {
    const t = useTranslations('maps.list');

    const router = useRouter();

    const notify = useNotify();

    const query = useBattleMaps(campaignId);

    const mutations = useBattleMapMutations(campaignId);

    const list = useLibraryList({
        query,
        create: mutations.create,
        remove: mutations.remove,
        texts: {
            confirmDelete: t('confirmDelete'),
            deleteError: t('deleteError'),
            createError: t('createError'),
        },
    });

    const fail = (error: Error, fallback: string) =>
        void notify(errorMessage(error, fallback));

    return {
        query,
        maps: list.items,
        isLoading: list.isLoading,
        createDialog: {
            ...list.createDialog,
            isPending: mutations.create.isPending,
        },
        actions: {
            create: ({ name, cols, rows }: NewMapForm) =>
                mutations.create.mutate(
                    {
                        name,
                        map: { ...DEFAULT_BATTLE_MAP, cols, rows },
                        walls: [],
                        bars: [],
                    },
                    {
                        onSuccess: (created) => {
                            list.createDialog.setOpen(false);
                            router.push(
                                `/campaigns/${campaignId}/dm/maps/${created.id}`
                            );
                        },
                        onError: (e) => fail(e, t('createError')),
                    }
                ),
            clone: (map: BattleMapBrief) =>
                mutations.clone.mutate(
                    {
                        mapId: map.id,
                        name: t('cloneName', { name: map.name }).slice(
                            0,
                            NAME_MAX
                        ),
                    },
                    { onError: (e) => fail(e, t('cloneError')) }
                ),
            remove: list.remove,
        },
    };
}
