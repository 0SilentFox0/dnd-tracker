"use client";

import { useQuery } from "@tanstack/react-query";

import { worldKeys } from "./keys";

import { getTravelLog } from "@/lib/api/world";
import type { WorldTravelEntry } from "@/types/world";

const STALE_MS = 15_000;

export function useTravelLog(campaignId: string) {
  return useQuery<WorldTravelEntry[]>({ queryKey: worldKeys.log(campaignId), queryFn: () => getTravelLog(campaignId), staleTime: STALE_MS });
}
