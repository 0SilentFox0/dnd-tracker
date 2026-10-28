import { useQuery } from "@tanstack/react-query";

import { campaignKeys } from "./keys";

import { getCampaign } from "@/lib/api/campaigns";
import { CampaignKind } from "@/lib/constants/campaigns";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";

export function useIsTemplateCampaign(campaignId: string | undefined) {
  const { data } = useQuery({
    queryKey: campaignKeys.detail(campaignId ?? ""),
    queryFn: () => getCampaign(campaignId!),
    enabled: !!campaignId,
    staleTime: ENTITY_STALE_MS,
    select: (campaign) => campaign.kind === CampaignKind.TEMPLATE,
  });

  return data ?? false;
}
