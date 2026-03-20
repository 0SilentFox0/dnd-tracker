import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteAllCharacters,
  deleteCharacter,
  getCharacters,
  levelUpCharacter,
} from "@/lib/api/characters";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";
import type { Character } from "@/types/characters";

export type { Character };

/** Без `opts` — усі персонажі кампанії (гравці та npc_hero). */
export function useCharacters(
  campaignId: string,
  opts?: { type?: "player" | "npc_hero" },
) {
  return useQuery<Character[]>({
    queryKey: ["characters", campaignId, opts?.type ?? "all"],
    queryFn: () => getCharacters(campaignId, opts),
    staleTime: ENTITY_STALE_MS,
    enabled: !!campaignId,
  });
}

export function useLevelUpCharacter(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (characterId: string) =>
      levelUpCharacter(campaignId, characterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", campaignId] });
    },
  });
}

export function useDeleteCharacter(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (characterId: string) =>
      deleteCharacter(campaignId, characterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", campaignId] });
    },
  });
}

export function useDeleteAllCharacters(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAllCharacters(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", campaignId] });
    },
  });
}
