"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { worldKeys } from "./keys";

import { getWorldView } from "@/lib/api/world";
import type { WorldView } from "@/types/world";

const POLL_STALE_MS = 15_000;

const POLL_MS = 30_000;

const PUSHER_STALE_MS = 60_000;

export function useWorldView(campaignId: string, { mapId, asHeroId, asParty = false, keepPrevious = false }: { mapId: string | null; asHeroId?: string; asParty?: boolean; keepPrevious?: boolean }) {
  const live = !!process.env.NEXT_PUBLIC_PUSHER_KEY;

  return useQuery<WorldView>({
    queryKey: asParty ? worldKeys.partyView(campaignId, mapId ?? "") : worldKeys.view(campaignId, mapId ?? "", asHeroId),
    queryFn: () => getWorldView(campaignId, { mapId: mapId as string, asHeroId, ...(asParty && { asParty }) }),
    enabled: !!mapId,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    staleTime: live ? PUSHER_STALE_MS : POLL_STALE_MS,
    // party view is a permanent 400 for a campaign without active heroes: no retries, no polling after an error
    ...(asParty && { retry: false }),
    refetchInterval: (query) => (live || (asParty && query.state.status === "error") ? false : POLL_MS),
    refetchOnWindowFocus: (query) => !(asParty && query.state.status === "error"),
  });
}
