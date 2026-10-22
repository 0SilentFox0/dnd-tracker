import { queryOptions, useQuery } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { getDraftPortraitPools } from "@/lib/api/characters";

export const draftPortraitsQuery = (campaignId: string) =>
  queryOptions({ queryKey: characterKeys.draftPortraits(campaignId), queryFn: async () => (await getDraftPortraitPools(campaignId)).pools, staleTime: 60 * 60_000 });

export const useDraftPortraits = (campaignId: string) => useQuery(draftPortraitsQuery(campaignId));
