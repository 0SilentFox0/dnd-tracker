import { useQuery } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { getCharacterRoster } from "@/lib/api/characters";

export function useCharacterRoster(campaignId: string) {
  return useQuery({
    queryKey: characterKeys.roster(campaignId),
    queryFn: () => getCharacterRoster(campaignId),
    staleTime: 30_000,
  });
}
