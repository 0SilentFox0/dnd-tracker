"use client";

import { useQuery } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { getScenarioSummaries } from "@/lib/api/scenario";
import type { ScenarioSummaries } from "@/types/scenario";

export function useScenarioSummaries(campaignId: string) {
  return useQuery<ScenarioSummaries>({ queryKey: scenarioKeys.summaries(campaignId), queryFn: () => getScenarioSummaries(campaignId), staleTime: 60_000 });
}
