"use client";

import { useQuery } from "@tanstack/react-query";

import { worldKeys } from "./keys";

import { getWorldMaps } from "@/lib/api/world";
import type { WorldMapSummary } from "@/types/world";

const STALE_MS = 30_000;

export function useWorldMaps(campaignId: string) {
  return useQuery<WorldMapSummary[]>({
    queryKey: worldKeys.maps(campaignId),
    queryFn: () => getWorldMaps(campaignId),
    staleTime: STALE_MS,
  });
}
