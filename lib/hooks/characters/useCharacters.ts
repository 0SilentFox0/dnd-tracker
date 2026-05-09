import { useQuery } from "@tanstack/react-query";

import {
  deleteAllCharacters,
  deleteCharacter,
  getCharacters,
  levelUpCharacter,
} from "@/lib/api/characters";
import { useCrudMutation } from "@/lib/hooks/common";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";
import type { Character } from "@/types/characters";

export type { Character };

/** Без `opts` — усі персонажі кампанії (гравці та npc_hero). `compact` — без важких JSON/інвентаря (менший egress). */
export function useCharacters(
  campaignId: string,
  opts?: { type?: "player" | "npc_hero"; compact?: boolean },
) {
  return useQuery<Character[]>({
    queryKey: [
      "characters",
      campaignId,
      opts?.type ?? "all",
      opts?.compact ? "compact" : "full",
    ],
    queryFn: () => getCharacters(campaignId, opts),
    staleTime: ENTITY_STALE_MS,
    enabled: !!campaignId,
  });
}

export function useLevelUpCharacter(campaignId: string) {
  return useCrudMutation({
    mutationFn: (characterId: string) =>
      levelUpCharacter(campaignId, characterId),
    invalidateKeys: [["characters", campaignId]],
  });
}

export function useDeleteCharacter(campaignId: string) {
  return useCrudMutation({
    mutationFn: (characterId: string) =>
      deleteCharacter(campaignId, characterId),
    invalidateKeys: [["characters", campaignId]],
  });
}

export function useDeleteAllCharacters(campaignId: string) {
  return useCrudMutation({
    mutationFn: () => deleteAllCharacters(campaignId),
    invalidateKeys: [["characters", campaignId]],
  });
}
