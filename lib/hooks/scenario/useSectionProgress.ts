'use client';

import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';

import { scenarioKeys } from './keys';

import { patchScenarioSection } from '@/lib/api/scenario';
import { useCrudMutation } from '@/lib/hooks/common';
import type { ScenarioPage, ScenarioSectionPatch } from '@/types/scenario';

export function useSectionProgress(campaignId: string, pageId: string) {
    const queryClient = useQueryClient();

    const t = useTranslations('scenario');

    const key = scenarioKeys.page(campaignId, pageId);

    const mutation = useCrudMutation({
        mutationFn: ({
            sectionId,
            patch,
        }: {
            sectionId: string;
            patch: ScenarioSectionPatch;
        }) => patchScenarioSection(campaignId, pageId, sectionId, patch),
        errorText: t('sectionUpdateFailed'),
        onSuccess: ({ version, section }) => {
            queryClient.setQueryData<ScenarioPage>(key, (old) => {
                if (!old) return old;

                const sections = old.content.sections.map((s) =>
                    s.id === section.id ? section : s
                );

                // mirrors the server rule: a scene with every section played becomes played
                const completes =
                    old.kind === 'scene' && sections.every((s) => s.played);

                return {
                    ...old,
                    version,
                    ...(completes && { status: 'played' as const }),
                    content: { ...old.content, sections },
                };
            });
            void queryClient.invalidateQueries({
                queryKey: scenarioKeys.list(campaignId),
            });
        },
        onError: () => void queryClient.invalidateQueries({ queryKey: key }),
    });

    return {
        setPlayed: (sectionId: string, played: boolean) =>
            mutation
                .mutateAsync({ sectionId, patch: { played } })
                .then(() => undefined),
        setRevealed: (sectionId: string, revealed: boolean) =>
            mutation
                .mutateAsync({ sectionId, patch: { revealed } })
                .then(() => undefined),
        isPending: mutation.isPending,
    };
}
