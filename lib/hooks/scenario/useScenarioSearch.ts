"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { searchScenario } from "@/lib/api/scenario";

export function useScenarioSearch(campaignId: string, query: string) {
  const [debounced, setDebounced] = useState(query.trim());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);

    return () => clearTimeout(t);
  }, [query]);

  const result = useQuery({ queryKey: scenarioKeys.search(campaignId, debounced), queryFn: () => searchScenario(campaignId, debounced), enabled: debounced.length >= 2, staleTime: 30_000 });

  return { hits: debounced.length >= 2 ? (result.data ?? []) : [], isFetching: result.isFetching };
}
