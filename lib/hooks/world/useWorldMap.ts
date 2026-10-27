"use client";

import { useQuery } from "@tanstack/react-query";

import { worldKeys } from "./keys";

import { getWorldMap } from "@/lib/api/world";
import type { WorldMapDetail } from "@/types/world";

const STALE_MS = 30_000;

export function useWorldMap(campaignId: string, mapId: string | null) {
  return useQuery<WorldMapDetail>({
    queryKey: worldKeys.map(campaignId, mapId ?? ""),
    queryFn: () => getWorldMap(campaignId, mapId as string),
    enabled: !!mapId,
    staleTime: STALE_MS,
  });
}
