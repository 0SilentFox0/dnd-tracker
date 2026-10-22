import { useQuery } from "@tanstack/react-query";

import { characterKeys, characterWriteKeys } from "./keys";

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
import { skillKeys } from "@/lib/hooks/skills/keys";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";
import type { Character, CharacterFormData, CharacterListItem } from "@/types/characters";

export type { Character };

// compact — без важких JSON/інвентаря (менший egress)
export function useCharacters(
  campaignId: string,
  opts?: { type?: CharacterTypeValue; status?: "pending"; compact?: boolean; enabled?: boolean },
) {
  return useQuery<CharacterListItem[]>({
    queryKey: characterKeys.list(campaignId, opts?.status ?? opts?.type ?? "all", !!opts?.compact),
    queryFn: () => getCharacters(campaignId, opts),
    staleTime: ENTITY_STALE_MS,
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}

export function useCharacter(campaignId: string, characterId: string) {
  return useQuery<Character>({
    queryKey: characterKeys.detail(campaignId, characterId),
    queryFn: () => getCharacter(campaignId, characterId),
    // Editors seed a form from this; other writers (profile, battles) don't invalidate it.
    staleTime: 0,
    enabled: !!campaignId && !!characterId,
  });
}

export function useCreateCharacter(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: CharacterFormData) => createCharacter(campaignId, data),
    invalidateKeys: characterWriteKeys(campaignId),
  });
}

export function useUpdateCharacter(campaignId: string, characterId: string) {
  return useCrudMutation({
    mutationFn: (data: CharacterFormData) => updateCharacter(campaignId, characterId, data),
    invalidateKeys: [
      ...characterWriteKeys(campaignId),
      characterKeys.detail(campaignId, characterId),
      skillKeys.progression(campaignId, characterId),
      characterKeys.sheet(campaignId, characterId),
    ],
  });
}

export function useLevelUpCharacter(campaignId: string) {
  return useCrudMutation({
    mutationFn: (characterId: string) =>
      levelUpCharacter(campaignId, characterId),
    invalidateKeys: [
      ...characterWriteKeys(campaignId),
      characterKeys.details(campaignId),
      characterKeys.sheet(campaignId),
      skillKeys.progressionOf(campaignId),
    ],
  });
}

export function useDeleteCharacter(campaignId: string) {
  return useCrudMutation({
    mutationFn: (characterId: string) =>
      deleteCharacter(campaignId, characterId),
    invalidateKeys: characterWriteKeys(campaignId),
  });
}

export function useDeleteAllCharacters(campaignId: string) {
  return useCrudMutation({
    mutationFn: () => deleteAllCharacters(campaignId),
    invalidateKeys: characterWriteKeys(campaignId),
  });
}
