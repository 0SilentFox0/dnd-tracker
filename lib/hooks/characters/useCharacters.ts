import { useQuery } from "@tanstack/react-query";

import { characterSheetKey } from "./useCharacterSheet";

import {
  createCharacter,
  deleteAllCharacters,
  deleteCharacter,
  getCharacter,
  getCharacters,
  levelUpCharacter,
  updateCharacter,
} from "@/lib/api/characters";
import { type CharacterTypeValue } from "@/lib/constants/characters";
import { useCrudMutation } from "@/lib/hooks/common";
import { progressionCampaignKey, progressionKey } from "@/lib/hooks/skills/progression-keys";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";
import type { Character, CharacterFormData, CharacterListItem } from "@/types/characters";

export type { Character };

/** Без `opts` — усі персонажі кампанії (гравці та npc_hero). `compact` — без важких JSON/інвентаря (менший egress). */
export function useCharacters(
  campaignId: string,
  opts?: { type?: CharacterTypeValue; compact?: boolean; enabled?: boolean },
) {
  return useQuery<CharacterListItem[]>({
    queryKey: [
      "characters",
      campaignId,
      opts?.type ?? "all",
      opts?.compact ? "compact" : "full",
    ],
    queryFn: () => getCharacters(campaignId, opts),
    staleTime: ENTITY_STALE_MS,
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}

export function useCharacter(campaignId: string, characterId: string) {
  return useQuery<Character>({
    queryKey: ["character", campaignId, characterId],
    queryFn: () => getCharacter(campaignId, characterId),
    // Editors seed a form from this; other writers (profile, battles) don't invalidate it.
    staleTime: 0,
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
      progressionKey(campaignId, characterId),
      characterSheetKey(campaignId, characterId),
      ["battle-balance"],
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
      characterSheetKey(campaignId),
      progressionCampaignKey(campaignId),
      ["battle-balance"],
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
