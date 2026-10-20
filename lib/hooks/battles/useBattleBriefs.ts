"use client";

import { useQuery } from "@tanstack/react-query";

import { battleKeys } from "./keys";

import { getBattleBriefs } from "@/lib/api/battles";
import type { BattleBrief } from "@/types/battle";

export function useBattleBriefs(campaignId: string, options: { enabled?: boolean } = {}) {
  return useQuery<BattleBrief[]>({ queryKey: battleKeys.briefs(campaignId), queryFn: () => getBattleBriefs(campaignId), staleTime: 15_000, enabled: options.enabled ?? true });
}
