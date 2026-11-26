'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';

import { battleMapKeys } from './keys';
import { announceMapLibraryChange } from './mapLibrarySync';
import { useMapArt } from './useMapArt';
import type { useMapArtEditor } from './useMapArtEditor';
import type { useMapEditorDraft } from './useMapEditorDraft';

import {
    discardBattleMapBackground,
    uploadBattleMapBackground,
} from '@/lib/api/battle-map-background';
import { saveMapArt } from '@/lib/api/battle-maps';
import { ApiError } from '@/lib/api/client';
import { useNotify } from '@/lib/hooks/common';
import type { BattleMapInput } from '@/lib/schemas/battle-maps';
import { clipScene } from '@/lib/utils/battle/map-art';
import { artTextureUrls, loadArtAssets } from '@/lib/utils/canvas/map-art/assets';
import { BakeError, bakeScene } from '@/lib/utils/canvas/map-art/bake';
import { errorMessage } from '@/lib/utils/common/error-message';

type Phase = 'idle' | 'baking' | 'uploading' | 'saving';

interface BakeStats {
    ms: number;
    cellPx: number;
    bytes: number;
}

export function useMapArtSave(
    campaignId: string,
    mapId: string,
    draft: ReturnType<typeof useMapEditorDraft>,
    art: ReturnType<typeof useMapArtEditor>
) {
    const t = useTranslations('maps.editor');

    const notify = useNotify();

    const queryClient = useQueryClient();

    const { data: record } = useMapArt(campaignId, mapId);

    const [phase, setPhase] = useState<Phase>('idle');

    const [lastBake, setLastBake] = useState<BakeStats | null>(null);

    const { map } = draft.editor.state;

    const needsBake =
        !!record &&
        (record.bakedSceneVersion !== record.sceneVersion ||
            map.background !== record.bakedUrl);

    const save = async (opts: { bake?: boolean } = {}) => {
        const { value } = draft.editor.state;

        if (!value || !record || !art.scene || phase !== 'idle') return;

        const name = draft.name.value.trim();

        if (!name) return;

        const scene = clipScene(art.scene, map);

        const bake = opts.bake ?? (art.isDirty || needsBake);

        const { walls = [], bars = [], ...rest } = value;

        let uploaded: string | undefined;

        try {
            if (bake) {
                setPhase('baking');

                try {
                    const assets = await loadArtAssets(artTextureUrls(scene));

                    const baked = await bakeScene({
                        scene,
                        map: value,
                        seed: mapId,
                        assets,
                    });

                    setPhase('uploading');
                    uploaded = await uploadBattleMapBackground(
                        campaignId,
                        baked.blob
                    );
                    setLastBake({
                        ms: baked.ms,
                        cellPx: baked.cellPx,
                        bytes: baked.blob.size,
                    });
                } catch (e) {
                    if (!(e instanceof BakeError)) throw e;

                    void notify(t(`art.bakeFailed.${e.code}`));
                }
            }

            setPhase('saving');

            const result = await saveMapArt(campaignId, mapId, {
                save: {
                    name,
                    map: rest as BattleMapInput['map'],
                    walls,
                    bars,
                    expectedVersion: draft.version,
                },
                scene,
                expectedSceneVersion: record.sceneVersion,
                ...(uploaded && { bakedUrl: uploaded }),
            });

            draft.acceptArtSave(result);
            art.markSaved(scene);
            queryClient.setQueryData(
                battleMapKeys.art(campaignId, mapId),
                result.art
            );
            void queryClient.invalidateQueries({
                queryKey: battleMapKeys.detail(campaignId, mapId),
                refetchType: 'none',
            });
            void queryClient.invalidateQueries({
                queryKey: battleMapKeys.list(campaignId),
            });
            announceMapLibraryChange(campaignId);
        } catch (e) {
            if (uploaded)
                await discardBattleMapBackground(campaignId, uploaded).catch(
                    () => undefined
                );

            void notify(
                e instanceof ApiError && e.status === 409
                    ? t('conflict')
                    : errorMessage(e, t('saveFailed'))
            );
        } finally {
            setPhase('idle');
        }
    };

    return { save, phase, needsBake, lastBake, isSaving: phase !== 'idle' };
}
