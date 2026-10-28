"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { worldKeys } from "./keys";

import { getWorldView } from "@/lib/api/world";
import type { WorldView } from "@/types/world";

const POLL_STALE_MS = 15_000;

const POLL_MS = 30_000;

const PUSHER_STALE_MS = 60_000;

export function useWorldView(campaignId: string, { mapId, asHeroId, keepPrevious = false }: { mapId: string | null; asHeroId?: string; keepPrevious?: boolean }) {
  const live = !!process.env.NEXT_PUBLIC_PUSHER_KEY;

  return useQuery<WorldView>({
    queryKey: worldKeys.view(campaignId, mapId ?? "", asHeroId),
    queryFn: () => getWorldView(campaignId, { mapId: mapId as string, asHeroId }),
    enabled: !!mapId,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    staleTime: live ? PUSHER_STALE_MS : POLL_STALE_MS,
    refetchInterval: live ? false : POLL_MS,
    refetchOnWindowFocus: true,
  });
}
