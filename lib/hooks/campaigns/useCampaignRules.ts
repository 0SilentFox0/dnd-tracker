"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { campaignKeys } from "./keys";

import { getCampaignRules, updateCampaignRules } from "@/lib/api/rules";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { RulesetPatch } from "@/lib/utils/rules";

export function useCampaignRules(campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.rules(campaignId),
    queryFn: () => getCampaignRules(campaignId),
    enabled: !!campaignId,
    staleTime: REFERENCE_STALE_MS,
  });
}

export function useUpdateCampaignRules(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: RulesetPatch) => updateCampaignRules(campaignId, patch),
    onSuccess: (rules) => queryClient.setQueryData(campaignKeys.rules(campaignId), rules),
  });
}
