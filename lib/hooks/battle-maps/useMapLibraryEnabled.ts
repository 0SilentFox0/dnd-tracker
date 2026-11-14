import { useQuery } from '@tanstack/react-query';

import { getCampaign } from '@/lib/api/campaigns';
import { campaignKeys } from '@/lib/hooks/campaigns/keys';
import { ENTITY_STALE_MS } from '@/lib/providers/query-provider';

export function useMapLibraryEnabled(campaignId: string) {
    const { data } = useQuery({
        queryKey: campaignKeys.detail(campaignId),
        queryFn: () => getCampaign(campaignId),
        staleTime: ENTITY_STALE_MS,
        select: (campaign) => campaign.mapLibraryEnabled,
    });

    return data ?? false;
}
