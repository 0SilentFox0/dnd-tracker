"use client";

import { useQuery } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { getScenarioIndex } from "@/lib/api/scenario";
import type { ScenarioIndex } from "@/types/scenario";

export function useScenarioIndex(campaignId: string) {
  return useQuery<ScenarioIndex>({ queryKey: scenarioKeys.index(campaignId), queryFn: () => getScenarioIndex(campaignId), staleTime: 60_000 });
}
