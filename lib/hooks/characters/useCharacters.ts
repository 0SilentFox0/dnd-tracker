import { useQuery } from "@tanstack/react-query";

import {
  createCharacter,
  deleteAllCharacters,
  deleteCharacter,
  getCharacter,
  getCharacters,
  levelUpCharacter,
  updateCharacter,
} from "@/lib/api/characters";
import { useCrudMutation } from "@/lib/hooks/common";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";
import type { Character, CharacterFormData } from "@/types/characters";

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

export function useCharacter(campaignId: string, characterId: string) {
  return useQuery<Character>({
    queryKey: ["character", campaignId, characterId],
    queryFn: () => getCharacter(campaignId, characterId),
    staleTime: ENTITY_STALE_MS,
    enabled: !!campaignId && !!characterId,
  });
}

export function useCreateCharacter(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: CharacterFormData) => createCharacter(campaignId, data),
    invalidateKeys: [["characters", campaignId]],
  });
}

export function useUpdateCharacter(campaignId: string, characterId: string) {
  return useCrudMutation({
    mutationFn: (data: CharacterFormData) => updateCharacter(campaignId, characterId, data),
    invalidateKeys: [
      ["characters", campaignId],
      ["character", campaignId, characterId],
    ],
  });
}

export function useLevelUpCharacter(campaignId: string) {
  return useCrudMutation({
    mutationFn: (characterId: string) =>
      levelUpCharacter(campaignId, characterId),
    invalidateKeys: [
      ["characters", campaignId],
      ["character", campaignId],
      ["character-damage-preview", campaignId],
      ["damage-calculator-melee-ranged", campaignId],
      ["damage-calculator-magic-spell", campaignId],
    ],
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
