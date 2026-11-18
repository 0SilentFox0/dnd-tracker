import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { scoresOf } from './draft-form-helpers';
import { characterKeys } from './keys';

import { createDraft, updateDraft } from '@/lib/api/characters';
import { ApiError } from '@/lib/api/client';
import { translateIssue } from '@/lib/i18n/translate-issue';
import { useTranslator } from '@/lib/i18n/use-translator';
import { pendingIssues } from '@/lib/utils/characters/choices/pending';
import {
    draftChoicesState,
    stateDraftChoices,
} from '@/lib/utils/characters/choices/picks';
import { prunePicks } from '@/lib/utils/characters/choices/prune';
import {
    type ChoiceRefs,
    countFeats,
    visitPicks,
} from '@/lib/utils/characters/choices/walk';
import { isRecord } from '@/lib/utils/common/is-record';
import type { DraftInput } from '@/types/characters';
import type { ChoiceIssue } from '@/types/choices';

// the 400 body may carry plain Zod issues (path is an array), not only ChoiceIssue
const isChoiceIssue = (i: unknown): i is ChoiceIssue =>
    isRecord(i) && typeof i.path === 'string' && typeof i.message === 'string';

export interface PlayerDraftSubmitOptions {
    campaignId: string;
    characterId?: string;
    values: DraftInput;
    classBased: boolean;
}

export function usePlayerDraftSubmit({
    campaignId,
    characterId,
    values,
    classBased,
}: PlayerDraftSubmitOptions) {
    const t = useTranslations('characters.draft');

    const tRoot = useTranslator();

    const router = useRouter();

    const queryClient = useQueryClient();

    const submitMutation = useMutation({
        mutationFn: (refs?: ChoiceRefs) => {
            const choices =
                values.choices && refs
                    ? stateDraftChoices(
                          prunePicks(
                              draftChoicesState(
                                  values.choices,
                                  classBased ? values.classId : undefined
                              ),
                              refs
                          ).state
                      )
                    : values.choices;

            const body: DraftInput = {
                ...values,
                ...(choices && { choices }),
                alignment: values.alignment || undefined,
                background: values.background || undefined,
                avatar: values.avatar,
            };

            return characterId
                ? updateDraft(campaignId, characterId, body)
                : createDraft(campaignId, body);
        },
        onError: (e) => {
            const issues = (e instanceof ApiError ? e.body : undefined) as
                | { issues?: unknown }
                | undefined;

            setChoiceIssues(
                Array.isArray(issues?.issues)
                    ? issues.issues.filter(isChoiceIssue)
                    : []
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: characterKeys.sheet(campaignId),
            });
            router.push(`/campaigns/${campaignId}/character`);
        },
    });

    const [validationError, setValidationError] = useState<string | null>(null);

    const [choiceIssues, setChoiceIssues] = useState<ChoiceIssue[]>([]);

    const run = (refs?: ChoiceRefs) => {
        if (!values.race) {
            setValidationError(t('raceRequired'));

            return;
        }

        const classMode = classBased && !!values.classId;

        const state = draftChoicesState(
            values.choices,
            classBased ? values.classId : undefined
        );

        const visits = refs
            ? visitPicks(state, refs, { level: 1, classMode })
            : [];

        const issues = refs
            ? pendingIssues(visits, {
                  ...refs,
                  hero: { totalLevel: 1, scores: scoresOf(values) },
                  takenFeatIds: new Set(
                      countFeats(visits, state, classMode).keys()
                  ),
              })
            : [];

        setChoiceIssues(
            issues.map((issue) => ({
                ...issue,
                message: translateIssue(tRoot, issue),
            }))
        );

        if (issues.length > 0) {
            setValidationError(t('choicesIncomplete'));

            return;
        }

        setValidationError(null);
        submitMutation.mutate(refs);
    };

    const clearIssues = () => {
        setChoiceIssues([]);
        setValidationError(null);
    };

    return {
        run,
        clearIssues,
        choiceIssues,
        isPending: submitMutation.isPending,
        error:
            validationError ??
            (submitMutation.error instanceof Error
                ? submitMutation.error.message
                : null),
    };
}
