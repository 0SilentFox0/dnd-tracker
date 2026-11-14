'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useBattleMapMutations } from './useBattleMaps';

import { ApiError } from '@/lib/api/client';
import { useBattleMapEditor } from '@/lib/hooks/battles';
import { useNotify } from '@/lib/hooks/common';
import type { BattleMapInput } from '@/lib/schemas/battle-maps';
import { errorMessage } from '@/lib/utils/common/error-message';
import type { BattleMapFull } from '@/types/battle-map';

export function useMapEditorDraft(campaignId: string, source: BattleMapFull) {
    const t = useTranslations('maps.editor');

    const notify = useNotify();

    const { update } = useBattleMapMutations(campaignId);

    const editor = useBattleMapEditor({
        ...source.map,
        walls: source.walls,
        bars: source.bars,
    });

    const [name, setName] = useState(source.name);

    const snapshot = JSON.stringify([name.trim(), editor.state.map]);

    const [saved, setSaved] = useState(snapshot);

    const [justSaved, setJustSaved] = useState(false);

    const [version, setVersion] = useState(source.version);

    const isDirty = snapshot !== saved;

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
        canSave: isDirty && name.trim() !== '' && !update.isPending,
        save,
    };
}
