'use client';

import { useState } from 'react';

import { useBattleMapMutations } from './useBattleMaps';

import {
    discardBattleMapBackground,
    uploadBattleMapBackground,
} from '@/lib/api/battle-map-background';
import { DEFAULT_MAP_BACKGROUND } from '@/lib/constants/battle';
import { battleMapToLibraryInput } from '@/lib/utils/battle/grid';
import { normalizeUvttBackground } from '@/lib/utils/battle/uvtt/normalize-background';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { BattleMapBrief } from '@/types/battle-map';

export function useSaveMapToLibrary(campaignId: string) {
    const { create } = useBattleMapMutations(campaignId);

    const [isUploading, setIsUploading] = useState(false);

    const save = async (
        map: BattleMapConfig,
        name: string
    ): Promise<BattleMapBrief> => {
        let uploaded: string | undefined;

        try {
            // the setup canvas shows the default image for a null background; keep what the DM saw
            let source: BattleMapConfig = {
                ...map,
                background: map.background ?? DEFAULT_MAP_BACKGROUND,
            };

            if (source.background?.startsWith('data:')) {
                setIsUploading(true);

                uploaded = await uploadBattleMapBackground(
                    campaignId,
                    await normalizeUvttBackground(source.background)
                );

                source = { ...source, background: uploaded };
            }

            return await create.mutateAsync(
                battleMapToLibraryInput(source, name)
            );
        } catch (e) {
            if (uploaded)
                await discardBattleMapBackground(campaignId, uploaded).catch(
                    () => undefined
                );

            throw e;
        } finally {
            setIsUploading(false);
        }
    };

    return { save, isPending: create.isPending || isUploading };
}
