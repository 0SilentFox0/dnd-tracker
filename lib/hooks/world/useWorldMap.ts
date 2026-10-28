"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { worldKeys } from "./keys";

import { getWorldMap } from "@/lib/api/world";
import type { WorldMapDetail } from "@/types/world";

const STALE_MS = 30_000;

export function useWorldMap(campaignId: string, mapId: string | null, { keepPrevious = false }: { keepPrevious?: boolean } = {}) {
  return useQuery<WorldMapDetail>({
    queryKey: worldKeys.map(campaignId, mapId ?? ""),
    queryFn: () => getWorldMap(campaignId, mapId as string),
    enabled: !!mapId,
    staleTime: STALE_MS,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });
}
