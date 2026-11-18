import { useMutation, useQuery } from '@tanstack/react-query';

import { compendiumKeys } from './keys';

import {
    confirmCompendium,
    getCompendiumOptions,
    getCompendiumRunReport,
    previewCompendium,
} from '@/lib/api/compendium';
import type { CompendiumTargets, ImportInput } from '@/types/compendium-import';

const NO_TARGETS: CompendiumTargets = { local: [], templates: [] };

export function useCompendiumRequests(
    campaignId: string,
    optionsEnabled: boolean
) {
    const previewMutation = useMutation({
        mutationFn: ({
            next,
            signal,
        }: {
            next: ImportInput;
            signal: AbortSignal;
        }) => previewCompendium(campaignId, next, signal),
    });

    const confirmMutation = useMutation({
        mutationFn: ({
            body,
            signal,
        }: {
            body: Parameters<typeof confirmCompendium>[1];
            signal: AbortSignal;
        }) => confirmCompendium(campaignId, body, signal),
    });

    const openRunMutation = useMutation({
        mutationFn: (runId: string) =>
            getCompendiumRunReport(campaignId, runId),
    });

    const targetsQuery = useQuery({
        queryKey: compendiumKeys.options(campaignId),
        queryFn: ({ signal }) => getCompendiumOptions(campaignId, signal),
        enabled: optionsEnabled,
        staleTime: 0,
    });

    return {
        preview: previewMutation,
        confirm: confirmMutation,
        openRun: openRunMutation,
        targets: targetsQuery,
        targetList: targetsQuery.data ?? NO_TARGETS,
    };
}
