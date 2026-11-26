'use client';
import { useState } from 'react';

import { compendiumAdvanceStep, compendiumStep } from './compendium-step';
import type { CompendiumImportController } from './useCompendiumImport';

export type WizardView = ReturnType<typeof useCompendiumWizardView>;

export function useCompendiumWizardView(
    state: CompendiumImportController['state']
) {
    const maxStep = compendiumStep(state);

    const advance = compendiumAdvanceStep(state);

    const previewing = state.phase === 'previewing';

    const [view, setView] = useState({ step: advance, seen: advance });

    if (!previewing && view.seen !== advance)
        setView({
            step: advance > view.seen ? advance : Math.min(view.step, maxStep),
            seen: advance,
        });

    const step = previewing ? view.step : Math.min(view.step, maxStep);

    return {
        step: step as 0 | 1 | 2 | 3 | 4,
        maxStep,
        setStep: (next: number) =>
            setView((v) => ({
                ...v,
                step: Math.max(0, Math.min(next, maxStep)),
            })),
    };
}
