'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useBattleMapMutations, useBattleMaps } from './useBattleMaps';
import { useImportCatalogMap } from './useImportCatalogMap';

import { DEFAULT_BATTLE_MAP } from '@/lib/constants/battle';
import { useLibraryList, useNotify } from '@/lib/hooks/common';
import type { UvttImport } from '@/lib/utils/battle/uvtt/parse';
import { errorMessage } from '@/lib/utils/common/error-message';
import type { GridKind } from '@/types/battle-grid';
import type { BattleMapBrief } from '@/types/battle-map';
import type { MapCatalogEntry } from '@/types/map-catalog';

export interface NewMapForm {
    name: string;
    cols: number;
    rows: number;
    gridType: GridKind;
}

const NAME_MAX = 80;

export function useMapLibrary(campaignId: string) {
    const t = useTranslations('maps.list');

    const router = useRouter();

    const notify = useNotify();

    const query = useBattleMaps(campaignId);

    const mutations = useBattleMapMutations(campaignId);

    const catalogImport = useImportCatalogMap(campaignId);

    const [catalogOpen, setCatalogOpen] = useState(false);

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
        catalog: {
            open: catalogOpen,
            setOpen: setCatalogOpen,
            isPending: catalogImport.isPending,
        },
        actions: {
            importCatalogEntry: async (
                entry: MapCatalogEntry,
                parsed?: UvttImport
            ) => {
                const created = await catalogImport.importEntry(entry, parsed);

                router.push(`/campaigns/${campaignId}/dm/maps/${created.id}`);
            },
            create: ({ name, cols, rows, gridType }: NewMapForm) =>
                mutations.create.mutate(
                    {
                        name,
                        map: { ...DEFAULT_BATTLE_MAP, cols, rows, gridType },
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
