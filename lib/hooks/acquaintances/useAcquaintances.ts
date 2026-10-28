"use client";

import { useQuery } from "@tanstack/react-query";

import { acquaintanceKeys } from "./keys";

import { getAcquaintances } from "@/lib/api/acquaintances";

const STALE_MS = 60_000;

export function useAcquaintances(campaignId: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: acquaintanceKeys.list(campaignId),
    queryFn: () => getAcquaintances(campaignId),
    enabled,
    staleTime: STALE_MS,
  });
}
