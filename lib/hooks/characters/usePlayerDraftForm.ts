import { useCallback, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';

import { emptyDraft, type RollKey, scoresOf } from './draft-form-helpers';
import { useDraftAi } from './useDraftAi';
import { usePlayerDraftGenerate } from './usePlayerDraftGenerate';
import { usePlayerDraftSubmit } from './usePlayerDraftSubmit';
import { useRollReveal } from './useRollReveal';

import { ABILITY_KEYS, type AbilityKey } from '@/lib/constants/abilities';
import { useClassMode } from '@/lib/hooks/classes';
import { useRaces } from '@/lib/hooks/races';
import type { Locale } from '@/lib/i18n/config';
import {
    draftChoicesState,
    stateDraftChoices,
} from '@/lib/utils/characters/choices/picks';
import { classModeOf } from '@/lib/utils/characters/classes';
import {
    type AbilityMethod,
    pointBuySpent,
    recommendedPriority,
    recommendedScores,
    rerecommendScores,
    validateAbilityScores,
} from '@/lib/utils/characters/generate';
import type { DraftInput } from '@/types/characters';
import type { ChoicesState } from '@/types/choices';

export type { RollKey };

export interface PlayerDraftFormOptions {
    campaignId: string;
    characterId?: string;
    initial?: 'generate' | DraftInput;
}

export function usePlayerDraftForm({
    campaignId,
    characterId,
    initial,
}: PlayerDraftFormOptions) {
    const locale = useLocale() as Locale;

    const { data: raceList } = useRaces(campaignId);

    const classMode = useClassMode(campaignId);

    const classBased = classModeOf(classMode.enabled, classMode.classes.length);

    const raceNames = useMemo(
        () => (raceList ?? []).map((r) => r.name),
        [raceList]
    );

    const [values, setValues] = useState<DraftInput>(
        typeof initial === 'object' ? initial : emptyDraft(locale)
    );

    const reveal = useRollReveal<RollKey>();

    const { start } = reveal;

    const set = useCallback(
        <K extends keyof DraftInput>(key: K, value: DraftInput[K]) =>
            setValues((prev) => ({ ...prev, [key]: value })),
        []
    );

    const setScore = useCallback((key: AbilityKey, value: number) => {
        setValues((prev) => {
            const holder =
                prev.method === 'standard'
                    ? ABILITY_KEYS.find((k) => k !== key && prev[k] === value)
                    : undefined;

            return {
                ...prev,
                [key]: value,
                ...(holder && { [holder]: prev[key] }),
            };
        });
    }, []);

    const priorityOf = useCallback(
        (v: DraftInput, classId = v.classId) =>
            recommendedPriority({
                cls: classBased
                    ? classMode.classes.find((c) => c.id === classId)
                    : undefined,
                archetype: v.archetype,
            }),
        [classBased, classMode.classes]
    );

    const setMethod = useCallback(
        (method: AbilityMethod) => {
            setValues((prev) => ({
                ...prev,
                method,
                ...(method === 'pointBuy'
                    ? Object.fromEntries(ABILITY_KEYS.map((k) => [k, 8]))
                    : recommendedScores(priorityOf(prev) ?? [])),
            }));
        },
        [priorityOf]
    );

    const setArchetype = useCallback(
        (archetype: DraftInput['archetype']) => {
            setValues((prev) => {
                const next = { ...prev, archetype };

                const rec =
                    prev.method === 'standard'
                        ? rerecommendScores(
                              scoresOf(prev),
                              priorityOf(prev),
                              priorityOf(next)
                          )
                        : null;

                return {
                    ...next,
                    ...rec,
                    ...(rec && { primaryAbility: priorityOf(next)?.[0] }),
                };
            });
        },
        [priorityOf]
    );

    const setClass = useCallback(
        (classId: string) =>
            setValues((prev) => {
                const nextPriority = priorityOf(prev, classId);

                const rec =
                    prev.method === 'standard'
                        ? rerecommendScores(
                              scoresOf(prev),
                              priorityOf(prev),
                              nextPriority
                          )
                        : null;

                return {
                    ...prev,
                    classId,
                    class:
                        classMode.classes.find((c) => c.id === classId)?.name ??
                        prev.class,
                    ...rec,
                    ...(rec && { primaryAbility: nextPriority?.[0] }),
                    ...(prev.choices && {
                        choices: { ...prev.choices, classChoices: undefined },
                    }),
                };
            }),
        [classMode.classes, priorityOf]
    );

    const { generate } = usePlayerDraftGenerate({
        campaignId,
        values,
        setValues,
        start,
        raceNames,
        classBased,
        classes: classMode.classes,
        autoGenerate:
            initial === 'generate' &&
            raceList !== undefined &&
            !classMode.pending,
    });

    const ai = useDraftAi({ campaignId, values, setValues, start });

    const submit = usePlayerDraftSubmit({
        campaignId,
        characterId,
        values,
        classBased,
    });

    const scoreStatus = useMemo(() => {
        const scoreValues = scoresOf(values);

        return {
            valid: validateAbilityScores(scoreValues, values.method),
            spent:
                values.method === 'pointBuy'
                    ? pointBuySpent(scoreValues)
                    : undefined,
        };
    }, [values]);

    return {
        form: {
            values,
            set,
            setScore,
            setArchetype,
            classes: classBased
                ? { list: classMode.classes, set: setClass }
                : null,
            method: values.method,
            setMethod,
        },
        choices: {
            data: draftChoicesState(
                values.choices,
                classBased ? values.classId : undefined
            ),
            set: (next: ChoicesState) => {
                submit.clearIssues();
                setValues((prev) => ({
                    ...prev,
                    choices: stateDraftChoices(next),
                }));
            },
            enabled: classBased,
        },
        generate,
        ai,
        submit: {
            run: submit.run,
            choiceIssues: submit.choiceIssues,
            isPending: submit.isPending,
            error: submit.error,
        },
        scoreStatus,
        reveal,
    };
}
