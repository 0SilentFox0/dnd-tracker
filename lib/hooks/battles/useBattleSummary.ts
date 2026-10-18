import { useQuery } from "@tanstack/react-query";

import { battleKeys } from "./keys";

import { getBattleSummary } from "@/lib/api/battles";

export function useBattleSummary(campaignId: string, battleId: string, enabled: boolean) {
  return useQuery({
    queryKey: battleKeys.summary(campaignId, battleId),
    queryFn: () => getBattleSummary(campaignId, battleId),
    enabled,
    staleTime: Infinity,
  });
}
