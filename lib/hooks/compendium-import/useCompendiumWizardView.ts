'use client';
import { useEffect, useState } from 'react';

export type CompendiumStepId = 1 | 2 | 3 | 4 | 5;

export interface CompendiumWizardView {
    step: CompendiumStepId;
    setStep: (step: CompendiumStepId) => void;
    maxStep: CompendiumStepId;
}

const PREVIEW_TTL_MS = 15 * 60 * 1000;

/** `progress` pulls the viewed step forward; `unlocked` bounds manual navigation. */
export function useCompendiumWizardView(
    progress: CompendiumStepId,
    unlocked: CompendiumStepId = progress
): CompendiumWizardView {
    const [state, setState] = useState({ step: progress, progress });

    let step = state.step;

    if (state.progress !== progress) {
        step = progress > state.progress ? progress : state.step;
        step = Math.min(step, unlocked) as CompendiumStepId;
        setState({ step, progress });
    }

    return {
        step: Math.min(step, unlocked) as CompendiumStepId,
        maxStep: unlocked,
        setStep: (next) => {
            if (next <= unlocked) setState({ step: next, progress });
        },
    };
}

/** ISO deadline of the preview, stamped when its token first appears. */
export function usePreviewDeadline(token: string | undefined): string | null {
    const [stamp, setStamp] = useState<{
        token?: string;
        at: string | null;
    }>({ at: null });

    useEffect(() => {
        const id = setTimeout(
            () =>
                setStamp({
                    token,
                    at: token
                        ? new Date(Date.now() + PREVIEW_TTL_MS).toISOString()
                        : null,
                }),
            0
        );

        return () => clearTimeout(id);
    }, [token]);

    return stamp.token === token ? stamp.at : null;
}
