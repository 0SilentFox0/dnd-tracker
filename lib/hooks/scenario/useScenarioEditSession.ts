'use client';

import { useCallback, useRef, useState } from 'react';

import type { ScenarioPage } from '@/types/scenario';

type Draft = {
    flush: () => Promise<boolean>;
    hasUnsavedChanges?: () => boolean;
};

export function useScenarioEditSession() {
    const [base, setBase] = useState<ScenarioPage | null>(null);

    const draftRef = useRef<Draft | null>(null);

    const onDraftReady = useCallback((d: Draft) => {
        draftRef.current = d;
    }, []);

    const flush = useCallback(
        async () => (draftRef.current ? draftRef.current.flush() : true),
        []
    );

    // remount the editor from the applied page so its draft carries the new version — no 409 on the next autosave
    const rebase = useCallback((next: ScenarioPage) => {
        if (!draftRef.current?.hasUnsavedChanges?.())
            setBase((cur) => (cur ? next : cur));
    }, []);

    return {
        base,
        start: setBase,
        stop: useCallback(() => setBase(null), []),
        onDraftReady,
        flush,
        rebase,
    };
}

export type ScenarioEditSession = ReturnType<typeof useScenarioEditSession>;
