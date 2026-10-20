"use client";

import { useQuery } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { getScenarioPages } from "@/lib/api/scenario";
import type { ScenarioPageSummary } from "@/types/scenario";

export function useScenarioPages(campaignId: string, initial?: ScenarioPageSummary[]) {
  return useQuery<ScenarioPageSummary[]>({
    queryKey: scenarioKeys.list(campaignId),
    queryFn: () => getScenarioPages(campaignId),
    staleTime: 60_000,
    ...(initial && { initialData: initial }),
  });
}
