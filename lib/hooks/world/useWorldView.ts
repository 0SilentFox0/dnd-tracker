"use client";

import { useQuery } from "@tanstack/react-query";

import { worldKeys } from "./keys";

import { getWorldView } from "@/lib/api/world";
import type { WorldView } from "@/types/world";

const STALE_MS = 15_000;

export function useWorldView(campaignId: string, { mapId, asHeroId }: { mapId: string | null; asHeroId?: string }) {
  return useQuery<WorldView>({
    queryKey: worldKeys.view(campaignId, mapId ?? "", asHeroId),
    queryFn: () => getWorldView(campaignId, { mapId: mapId as string, asHeroId }),
    enabled: !!mapId,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
  });
}
