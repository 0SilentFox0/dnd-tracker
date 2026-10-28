import type { QueryClient } from "@tanstack/react-query";

export const invalidateCampaignQueries = (queryClient: QueryClient, campaignId: string) =>
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes(campaignId), refetchType: "active" });
