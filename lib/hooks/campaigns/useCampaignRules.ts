'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { campaignKeys } from './keys';

import { getCampaignRules, updateCampaignRules } from '@/lib/api/rules';
import { REFERENCE_STALE_MS } from '@/lib/providers/query-provider';
import type { RulesetPatch } from '@/lib/utils/rules';
import { preloadSystem } from '@/lib/utils/rules/systems/preload';

export function useCampaignRules(campaignId: string) {
    return useQuery({
        queryKey: campaignKeys.rules(campaignId),
        queryFn: () => getCampaignRules(campaignId),
        enabled: !!campaignId,
        staleTime: REFERENCE_STALE_MS,
    });
}

export function useUpdateCampaignRules(campaignId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (patch: RulesetPatch) =>
            updateCampaignRules(campaignId, patch),
        onSuccess: async (rules) => {
            await preloadSystem(rules.system);

            queryClient.setQueryData(campaignKeys.rules(campaignId), rules);
        },
    });
}
