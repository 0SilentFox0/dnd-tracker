"use client";

import { useQuery } from "@tanstack/react-query";

import { trackKeys } from "./keys";

import { getTracks } from "@/lib/api/tracks";
import type { CampaignTrack } from "@/types/audio";

export function useTracks(campaignId: string, options: { initial?: CampaignTrack[]; enabled?: boolean } = {}) {
  return useQuery<CampaignTrack[]>({
    queryKey: trackKeys.list(campaignId),
    queryFn: () => getTracks(campaignId),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    ...(options.initial && { initialData: options.initial }),
  });
}
