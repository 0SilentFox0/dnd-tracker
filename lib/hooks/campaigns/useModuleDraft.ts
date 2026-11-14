'use client';

import { useEffect, useMemo, useState } from 'react';

import {
    composition,
    moduleChange,
    moduleToggles,
    type SystemSelection,
    withModule,
} from '@/lib/utils/rules/systems/catalog';
import { isInstalled } from '@/lib/utils/rules/systems/lookup';
import { preloadSystem } from '@/lib/utils/rules/systems/preload';
import {
    type CompositionPreview,
    previewComposition,
} from '@/lib/utils/rules/systems/preview';

function safePreview(
    current: SystemSelection,
    draft: SystemSelection
): CompositionPreview | null {
    try {
        return previewComposition(current, draft);
    } catch {
        return null;
    }
}

export function useModuleDraft(current: SystemSelection) {
    const [draft, setDraft] = useState<SystemSelection>(() => ({
        key: current.key,
        modules: composition(current).modules,
    }));

    const [loadedDraft, setLoadedDraft] = useState<SystemSelection | null>(
        null
    );

    useEffect(() => {
        let isCancelled = false;

        void preloadSystem(draft).then(() => {
            if (!isCancelled) setLoadedDraft(draft);
        });

        return () => {
            isCancelled = true;
        };
    }, [draft]);

    const toggles = useMemo(() => moduleToggles(draft), [draft]);

    const isReady = loadedDraft === draft || isInstalled(draft);

    const preview = useMemo(
        () => (isReady ? safePreview(current, draft) : null),
        [current, draft, isReady]
    );

    return {
        draft,
        toggles,
        preview,
        isLoading: preview === null,
        isChanged: moduleChange(current, draft).changed,
        set: (id: string, on: boolean) =>
            setDraft((prev) => withModule(prev, id, on)),
    };
}
