"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { getInventoryLog, getStash, postStashAction } from "@/lib/api/inventory";
import { useCrudMutation } from "@/lib/hooks/common";
import type { StashAction } from "@/lib/utils/inventory/stash-actions";

export function useStash(campaignId: string, characterId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: characterKeys.stash(campaignId, characterId),
    queryFn: () => getStash(campaignId, characterId),
    enabled: opts?.enabled ?? true,
  });
}

export function useStashAction(campaignId: string, characterId: string) {
  return useCrudMutation({
    mutationFn: (action: StashAction) => postStashAction(campaignId, characterId, action),
    awaitInvalidation: true,
    invalidateKeys: [
      characterKeys.stash(campaignId, characterId),
      characterKeys.inventoryLog(campaignId, characterId),
      characterKeys.sheet(campaignId, characterId),
      characterKeys.roster(campaignId),
    ],
  });
}

export function useInventoryLog(campaignId: string, characterId: string) {
  return useInfiniteQuery({
    queryKey: characterKeys.inventoryLog(campaignId, characterId),
    queryFn: ({ pageParam }) => getInventoryLog(campaignId, characterId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
