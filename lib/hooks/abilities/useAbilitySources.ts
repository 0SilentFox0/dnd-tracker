import { useQuery } from "@tanstack/react-query";

import { abilityKeys } from "./keys";

import { getAbilitySources } from "@/lib/api/abilities";

export function useAbilitySources(campaignId: string, enabled: boolean) {
  return useQuery({
    queryKey: abilityKeys.sources(campaignId),
    queryFn: () => getAbilitySources(campaignId),
    enabled,
    staleTime: 5 * 60_000,
  });
}
