'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useBattleMapMutations } from './useBattleMaps';

import {
    discardBattleMapBackground,
    uploadBattleMapBackground,
} from '@/lib/api/battle-map-background';
import {
    getMapCatalogAsset,
    validateMapCatalogEntry,
} from '@/lib/api/map-catalog';
import { DEFAULT_BATTLE_MAP } from '@/lib/constants/battle';
import type { BattleMapInput } from '@/lib/schemas/battle-maps';
import { normalizeUvttBackground } from '@/lib/utils/battle/uvtt/normalize-background';
import { parseUvtt, type UvttImport } from '@/lib/utils/battle/uvtt/parse';
import type { MapCatalogEntry } from '@/types/map-catalog';

export function useImportCatalogMap(campaignId: string) {
    const t = useTranslations('maps.catalog');

    const mutations = useBattleMapMutations(campaignId);

    const inFlight = useRef(false);

    const [isPreparing, setIsPreparing] = useState(false);

    async function importEntry(entry: MapCatalogEntry, prepared?: UvttImport) {
        if (inFlight.current) throw new Error(t('importFailed'));

        inFlight.current = true;
        setIsPreparing(true);

        let background: string | undefined;

        try {
            validateMapCatalogEntry(entry);

            const parsed =
                prepared ?? parseUvtt(await getMapCatalogAsset(entry));

            const image = await normalizeUvttBackground(parsed.image);

            background = await uploadBattleMapBackground(campaignId, image);

            const input: BattleMapInput = {
                name: entry.name.slice(0, 80),
                map: {
                    ...DEFAULT_BATTLE_MAP,
                    cols: parsed.cols,
                    rows: parsed.rows,
                    background,
                    backgroundCols: parsed.backgroundCols,
                    backgroundRows:
                        (parsed.backgroundCols * parsed.imageHeight) /
                        parsed.imageWidth,
                    doors: parsed.doors,
                    source: {
                        url: entry.sourceUrl,
                        attribution: entry.attribution,
                        license: entry.license,
                    },
                },
                walls: parsed.walls,
                bars: [],
            };

            return await mutations.create.mutateAsync(input);
        } catch (error) {
            if (background)
                await discardBattleMapBackground(campaignId, background).catch(
                    () => undefined
                );

            throw new Error(
                error instanceof Error ? error.message : t('importFailed')
            );
        } finally {
            inFlight.current = false;
            setIsPreparing(false);
        }
    }

    return {
        importEntry,
        isPending: isPreparing || mutations.create.isPending,
    };
}
