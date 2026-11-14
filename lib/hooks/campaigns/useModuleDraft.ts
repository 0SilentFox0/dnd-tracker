'use client';

import { useMemo, useState } from 'react';

import {
    composition,
    moduleToggles,
    type SystemSelection,
    withModule,
} from '@/lib/utils/rules/systems/catalog';
import { previewComposition } from '@/lib/utils/rules/systems/preview';

export function useModuleDraft(current: SystemSelection) {
    const [draft, setDraft] = useState<SystemSelection>(() => ({
        key: current.key,
        modules: composition(current).modules,
    }));

    const toggles = useMemo(() => moduleToggles(draft), [draft]);

    const preview = useMemo(
        () => previewComposition(current, draft),
        [current, draft]
    );

    return {
        draft,
        toggles,
        preview,
        isChanged: preview.added.length + preview.removed.length > 0,
        set: (id: string, on: boolean) =>
            setDraft((prev) => withModule(prev, id, on)),
    };
}
