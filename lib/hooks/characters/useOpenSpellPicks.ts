'use client';

import { useMemo } from 'react';

import type { ChoiceRefsView } from './useChoiceRefs';

import { backgroundFields } from '@/lib/utils/backgrounds/selection';
import { pendingSpellCount } from '@/lib/utils/characters/choices/pending';
import { visitPicks } from '@/lib/utils/characters/choices/walk';
import type { CharacterFormData } from '@/types/characters';

/** Spell picks (cantrips, prepared spells) still open in a character form; 0 while the references load. */
export function useOpenSpellPicks(
    refs: ChoiceRefsView,
    data: CharacterFormData,
    classMode: boolean
): number {
    const classes = data.basicInfo.classes;

    return useMemo(() => {
        if (!refs.ready || !classMode) return 0;

        const entries = (classes ?? []).filter((e) => e.classId);

        const visits = visitPicks(
            {
                ...backgroundFields(data.choices ?? {}),
                raceChoices: data.choices?.raceChoices ?? {},
                feats: data.choices?.feats ?? [],
                classes: entries,
            },
            refs,
            { level: data.basicInfo.level, classMode }
        );

        return pendingSpellCount(visits, refs);
    }, [refs, data.choices, data.basicInfo.level, classes, classMode]);
}
