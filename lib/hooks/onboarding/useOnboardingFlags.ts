'use client';

import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { onboardingKeys } from './keys';

import {
    getOnboardingFlags,
    resetOnboarding,
    setOnboardingFlag,
} from '@/lib/api/onboarding';
import { useCrudMutation } from '@/lib/hooks/common';
import { hintKey, PLAYER_SHEET_SEEN_KEY } from '@/lib/onboarding/flag-keys';
import { isHintHidden } from '@/lib/onboarding/progress';
import type { OnboardingRole } from '@/lib/onboarding/types';
import type {
    OnboardingFlagsResponse,
    ResetScope,
    SetFlagBody,
} from '@/types/onboarding';

const NO_AUDIENCES: OnboardingRole[] = [];

const flagsQuery = {
    queryKey: onboardingKeys.flags(),
    queryFn: getOnboardingFlags,
    staleTime: Infinity,
    retry: false,
} as const;

export function useSetOnboardingFlag() {
    const qc = useQueryClient();

    const { mutate } = useMutation({
        mutationFn: setOnboardingFlag,
        onMutate: ({ key, value }: SetFlagBody) => {
            qc.setQueryData<OnboardingFlagsResponse>(
                onboardingKeys.flags(),
                (prev) =>
                    prev
                        ? {
                              ...prev,
                              flags: { ...prev.flags, [key]: value ?? null },
                          }
                        : prev
            );
        },
        // the optimistic write did not land: restore server state so the badge/checklist do not "come alive" only next session
        onError: () =>
            qc.invalidateQueries({ queryKey: onboardingKeys.flags() }),
    });

    return useCallback(
        (key: string, value: string | null = null) => mutate({ key, value }),
        [mutate]
    );
}

export function useOnboardingFlags() {
    const { data } = useQuery(flagsQuery);

    const setFlag = useSetOnboardingFlag();

    const { mutate: reset } = useCrudMutation({
        mutationFn: (scope: ResetScope) => resetOnboarding(scope),
        invalidateKeys: (_data, scope) =>
            scope === 'checklists'
                ? [onboardingKeys.flags(), onboardingKeys.campaigns()]
                : [onboardingKeys.flags()],
    });

    return {
        flags: data?.flags ?? null,
        audiences: data?.audiences ?? NO_AUDIENCES,
        setFlag,
        reset,
    };
}

export function useOnboardingHint(id: string) {
    // select: a hint rerenders only when its own visibility changes
    const { data: hidden } = useQuery({
        ...flagsQuery,
        select: (d: OnboardingFlagsResponse) => isHintHidden(id, d.flags),
    });

    const setFlag = useSetOnboardingFlag();

    const dismiss = useCallback(() => setFlag(hintKey(id)), [setFlag, id]);

    return { visible: hidden === false, dismiss };
}

export function useMarkPlayerSheetSeen() {
    const { data: seen } = useQuery({
        ...flagsQuery,
        select: (d: OnboardingFlagsResponse) =>
            PLAYER_SHEET_SEEN_KEY in d.flags,
    });

    const setFlag = useSetOnboardingFlag();

    useEffect(() => {
        if (seen === false) setFlag(PLAYER_SHEET_SEEN_KEY);
    }, [seen, setFlag]);
}
