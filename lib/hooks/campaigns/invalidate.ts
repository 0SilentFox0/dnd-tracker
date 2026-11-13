import type { QueryClient } from '@tanstack/react-query';

import { campaignKeys } from './keys';

export const invalidateCampaignQueries = (
    queryClient: QueryClient,
    campaignId: string
) =>
    queryClient.invalidateQueries({
        predicate: (q) => q.queryKey.includes(campaignId),
        refetchType: 'active',
    });

/** Everything of the campaign but the rules query, which the caller has just refreshed itself */
export const invalidateCampaignExceptRules = (
    queryClient: QueryClient,
    campaignId: string
) =>
    queryClient.invalidateQueries({
        predicate: (q) =>
            q.queryKey.includes(campaignId) &&
            q.queryKey[0] !== campaignKeys.rules(campaignId)[0],
        refetchType: 'active',
    });

export const invalidateCampaignRules = (
    queryClient: QueryClient,
    campaignId: string
) =>
    queryClient.invalidateQueries({ queryKey: campaignKeys.rules(campaignId) });
