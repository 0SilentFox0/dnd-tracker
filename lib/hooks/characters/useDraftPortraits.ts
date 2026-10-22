import { queryOptions, useQuery } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { getDraftPortraits } from "@/lib/api/characters";

export const draftPortraitsQuery = (campaignId: string, race: string) =>
  queryOptions({ queryKey: characterKeys.draftPortraits(campaignId, race), queryFn: async () => (await getDraftPortraits(campaignId, race)).portraits, staleTime: 60 * 60_000 });

export function useDraftPortraits(campaignId: string, race: string) {
  return useQuery({ ...draftPortraitsQuery(campaignId, race), enabled: !!race });
}
