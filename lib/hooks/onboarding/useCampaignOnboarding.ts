"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { onboardingKeys } from "./keys";
import { useSetOnboardingFlag } from "./useOnboardingFlags";

import { getCampaignOnboarding } from "@/lib/api/onboarding";
import { CHECKLIST_HIDDEN, checklistKey } from "@/lib/onboarding/flag-keys";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";
import type { CampaignOnboardingResponse } from "@/types/onboarding";

export function useCampaignOnboarding(campaignId: string) {
  const qc = useQueryClient();

  const setFlag = useSetOnboardingFlag();

  const { data } = useQuery({ queryKey: onboardingKeys.campaign(campaignId), queryFn: () => getCampaignOnboarding(campaignId), staleTime: ENTITY_STALE_MS, retry: false });

  const hide = useCallback(() => {
    qc.setQueryData<CampaignOnboardingResponse>(onboardingKeys.campaign(campaignId), (prev) => (prev ? { ...prev, state: "hidden" } : prev));
    setFlag(checklistKey(campaignId), CHECKLIST_HIDDEN);
  }, [qc, campaignId, setFlag]);

  return { data: data ?? null, hide };
}
