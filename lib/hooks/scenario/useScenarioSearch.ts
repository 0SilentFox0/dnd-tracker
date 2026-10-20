"use client";

import { useQuery } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { searchScenario } from "@/lib/api/scenario";
import { useDebouncedValue } from "@/lib/hooks/common";

export function useScenarioSearch(campaignId: string, query: string) {
  const debounced = useDebouncedValue(query.trim(), 300);

  const active = debounced.length >= 2;

  const result = useQuery({ queryKey: scenarioKeys.search(campaignId, debounced), queryFn: () => searchScenario(campaignId, debounced), enabled: active, staleTime: 30_000 });

  return { hits: active ? (result.data ?? []) : [], isFetching: result.isFetching };
}
