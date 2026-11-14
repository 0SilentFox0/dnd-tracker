'use client';

import { skipToken, useQuery } from '@tanstack/react-query';

import { campaignKeys } from './keys';

import type { SystemSelection } from '@/lib/utils/rules/systems/catalog';
import type { CampaignRulesView } from '@/types/campaigns';

/** The campaign layout seeds the selection (no request); `rules` already in the cache (loaded or saved by the DM) take over, nothing is fetched here */
export function useCampaignSystemSelection(
    campaignId: string
): SystemSelection | undefined {
    const rules = useQuery<CampaignRulesView>({
        queryKey: campaignKeys.rules(campaignId),
        queryFn: skipToken,
        staleTime: Infinity,
    }).data;

    const seeded = useQuery<SystemSelection>({
        queryKey: campaignKeys.system(campaignId),
        queryFn: skipToken,
        staleTime: Infinity,
    }).data;

    return rules?.system ?? seeded;
}
