'use client';

import { useState } from 'react';

import { useBattleMapMutations } from './useBattleMaps';

import {
    discardBattleMapBackground,
    uploadBattleMapBackground,
} from '@/lib/api/battle-map-background';
import {
    backgroundForSave,
    battleMapToLibraryInput,
} from '@/lib/utils/battle/grid';
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
            // a null background shows the default image in setup (unless plainGrid); keep what the DM saw
            let source: BattleMapConfig = {
                ...map,
                background: backgroundForSave(map),
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
