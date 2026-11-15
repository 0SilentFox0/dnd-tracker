'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useBattleMapMutations } from './useBattleMaps';

import { getBattleMap } from '@/lib/api/battle-maps';
import { ApiError } from '@/lib/api/client';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { useBattleMapEditor } from '@/lib/hooks/battles';
import { useNotify } from '@/lib/hooks/common';
import type { BattleMapInput } from '@/lib/schemas/battle-maps';
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
                photo: MAP_LIMITS.photoMaxSide,
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

    const isDirty = snapshot !== saved;

    // swap the uploaded data-URL for the bucket URL so the next save does not re-upload it
    const adoptStoredBackground = async (sent: typeof editor.state.map) => {
        try {
            const { map } = await getBattleMap(campaignId, source.id);

            if (!map.background || backgroundRef.current !== sent.background)
                return;

            editor.actions.replaceBackground(map.background);
            setSaved(
                JSON.stringify([
                    name.trim(),
                    { ...sent, background: map.background },
                ])
            );
        } catch {
            // the data-URL stays; the next save uploads it again
        }
    };

    const save = () => {
        const { value } = editor.state;

        if (!value || !name.trim()) return;

        const { walls = [], bars = [], ...rest } = value;

        // runtime-only zones never exist on a library map
        const header = rest as BattleMapInput['map'];

        update.mutate(
            {
                mapId: source.id,
                data: {
                    name: name.trim(),
                    map: header,
                    walls,
                    bars,
                    expectedVersion: version,
                },
            },
            {
                onSuccess: (brief) => {
                    setVersion(brief.version);
                    setSaved(snapshot);
                    setJustSaved(true);

                    if (header.background?.startsWith('data:'))
                        void adoptStoredBackground(value);
                },
                onError: (e) =>
                    void notify(
                        e instanceof ApiError && e.status === 409
                            ? t('conflict')
                            : errorMessage(e, t('saveFailed'))
                    ),
            }
        );
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
        isSaving: update.isPending,
        version,
        acceptVersion: setVersion,
        canSave: isDirty && name.trim() !== '' && !update.isPending,
        save,
    };
}
