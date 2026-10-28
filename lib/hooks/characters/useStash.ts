"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { getFreeArtifacts, getInventoryLog, getStash, postStashAction } from "@/lib/api/inventory";
import { useCrudMutation } from "@/lib/hooks/common";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";
import type { StashAction } from "@/lib/utils/inventory/stash-actions";

const ARTIFACT_ACTIONS: ReadonlySet<StashAction["action"]> = new Set(["stash", "equip", "grant", "revoke"]);

export function useStash(campaignId: string, characterId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: characterKeys.stash(campaignId, characterId),
    queryFn: () => getStash(campaignId, characterId),
    enabled: opts?.enabled ?? true,
    staleTime: ENTITY_STALE_MS,
  });
}

export function useFreeArtifacts(campaignId: string, characterId: string, enabled: boolean) {
  return useQuery({
    queryKey: characterKeys.freeArtifacts(campaignId),
    queryFn: () => getFreeArtifacts(campaignId, characterId),
    enabled,
  });
}

export function useStashAction(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  return useCrudMutation({
    mutationFn: (action: StashAction) => postStashAction(campaignId, characterId, action),
    awaitInvalidation: true,
    invalidateKeys: (_view, action) => [
      characterKeys.inventoryLog(campaignId, characterId),
      ...(ARTIFACT_ACTIONS.has(action.action)
        ? [characterKeys.sheet(campaignId, characterId), characterKeys.roster(campaignId), characterKeys.details(campaignId), characterKeys.freeArtifacts(campaignId)]
        : []),
    ],
    onSuccess: (view) => queryClient.setQueryData(characterKeys.stash(campaignId, characterId), view),
  });
}

export function useInventoryLog(campaignId: string, characterId: string) {
  return useInfiniteQuery({
    queryKey: characterKeys.inventoryLog(campaignId, characterId),
    queryFn: ({ pageParam }) => getInventoryLog(campaignId, characterId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: ENTITY_STALE_MS,
  });
}
