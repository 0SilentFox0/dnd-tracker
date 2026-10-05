import { useQuery } from "@tanstack/react-query";

import { getCampaignMembers } from "@/lib/api/campaigns";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";

export function useCampaignMembers(campaignId: string) {
  const { data, isPending, error } = useQuery({
    queryKey: ["campaign-members", campaignId],
    queryFn: () => getCampaignMembers(campaignId),
    enabled: !!campaignId,
    staleTime: ENTITY_STALE_MS,
  });

  return { members: data ?? [], loading: isPending && !!campaignId, error: error?.message ?? null };
}
