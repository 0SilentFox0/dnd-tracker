"use client";

import { useQuery } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { getScenarioPage } from "@/lib/api/scenario";
import type { ScenarioPage } from "@/types/scenario";

export function useScenarioPage(campaignId: string, pageId: string | null) {
  return useQuery<ScenarioPage>({
    queryKey: scenarioKeys.page(campaignId, pageId ?? ""),
    queryFn: () => getScenarioPage(campaignId, pageId as string),
    enabled: !!pageId,
    staleTime: 60_000,
  });
}
