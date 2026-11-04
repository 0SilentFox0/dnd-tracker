import type { QueryClient } from "@tanstack/react-query";

import { campaignKeys } from "./keys";

export const invalidateCampaignQueries = (queryClient: QueryClient, campaignId: string) =>
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes(campaignId), refetchType: "active" });

export const invalidateCampaignRules = (queryClient: QueryClient, campaignId: string) =>
  queryClient.invalidateQueries({ queryKey: campaignKeys.rules(campaignId) });
