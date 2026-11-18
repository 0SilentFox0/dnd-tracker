'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useBattleMapMutations } from './useBattleMaps';

import {
    discardBattleMapBackground,
    uploadBattleMapBackground,
} from '@/lib/api/battle-map-background';
import { ApiError } from '@/lib/api/client';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { useBattleMapEditor } from '@/lib/hooks/battles/setup/useBattleMapEditor';
import { useNotify } from '@/lib/hooks/common';
import type { BattleMapInput } from '@/lib/schemas/battle-maps';
import { normalizeUvttBackground } from '@/lib/utils/battle/uvtt/normalize-background';
import { errorMessage } from '@/lib/utils/common/error-message';
import type { BattleMapFull } from '@/types/battle-map';

export function useMapEditorDraft(campaignId: string, source: BattleMapFull) {
    const t = useTranslations('maps.editor');

    const notify = useNotify();

    const { update } = useBattleMapMutations(campaignId);

    const editor = useBattleMapEditor(
        {
            ...source.map,
            walls: source.walls,
            bars: source.bars,
        },
        {
            maxSide: {
                photo: MAP_LIMITS.tileMaxSide,
                tile: MAP_LIMITS.tileMaxSide,
            },
        }
    );

    const backgroundRef = useRef(editor.state.map.background);

    useEffect(() => {
        backgroundRef.current = editor.state.map.background;
    }, [editor.state.map.background]);

    const [name, setName] = useState(source.name);

    const snapshot = JSON.stringify([name.trim(), editor.state.map]);

    const [saved, setSaved] = useState(snapshot);

    const [justSaved, setJustSaved] = useState(false);

    const [version, setVersion] = useState(source.version);

    const [isUploading, setIsUploading] = useState(false);

    const isDirty = snapshot !== saved;

    const save = async () => {
        const { value } = editor.state;

        if (!value || !name.trim() || update.isPending || isUploading) return;

        const { walls = [], bars = [], ...rest } = value;

        // runtime-only zones never exist on a library map
        let header = rest as BattleMapInput['map'];

        let uploadedBackground: string | undefined;

        try {
            if (header.background?.startsWith('data:')) {
                setIsUploading(true);

                const normalized = await normalizeUvttBackground(
                    header.background
                );

                const storedUrl = await uploadBattleMapBackground(
                    campaignId,
                    normalized
                );

                uploadedBackground = storedUrl;

                header = { ...header, background: storedUrl };
            }

            const brief = await update.mutateAsync({
                mapId: source.id,
                data: {
                    name: name.trim(),
                    map: header,
                    walls,
                    bars,
                    expectedVersion: version,
                },
            });

            if (
                uploadedBackground &&
                backgroundRef.current === value.background
            )
                editor.actions.replaceBackground(uploadedBackground);

            setVersion(brief.version);
            setSaved(
                JSON.stringify([
                    name.trim(),
                    { ...editor.state.map, background: header.background },
                ])
            );
            setJustSaved(true);
        } catch (e) {
            if (uploadedBackground) {
                await discardBattleMapBackground(
                    campaignId,
                    uploadedBackground
                ).catch(() => undefined);
            }

            void notify(
                e instanceof ApiError && e.status === 409
                    ? t('conflict')
                    : errorMessage(e, t('saveFailed'))
            );
        } finally {
            setIsUploading(false);
        }
    };

    return {
        editor,
        name: {
            value: name,
            set: (v: string) => {
                setName(v);
                setJustSaved(false);
            },
        },
        isDirty,
        justSaved: justSaved && !isDirty,
        isSaving: update.isPending || isUploading,
        version,
        acceptVersion: setVersion,
        canSave:
            isDirty && name.trim() !== '' && !update.isPending && !isUploading,
        save,
    };
}
