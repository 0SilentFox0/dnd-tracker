'use client';

import { skipToken, useQuery } from '@tanstack/react-query';

import { campaignKeys } from './keys';
import { useCampaignRules } from './useCampaignRules';

import type { SystemSelection } from '@/lib/utils/rules/systems/catalog';

/** The system selection before `rules` load: the campaign layout seeds it (no request), loaded rules take over */
export function useCampaignSystemSelection(
    campaignId: string
): SystemSelection | undefined {
    const rules = useCampaignRules(campaignId).data;

    const seeded = useQuery<SystemSelection>({
        queryKey: campaignKeys.system(campaignId),
        queryFn: skipToken,
        staleTime: Infinity,
    }).data;

    return rules?.system ?? seeded;
}
