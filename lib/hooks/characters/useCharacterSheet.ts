"use client";

import { useQuery } from "@tanstack/react-query";

import { getCharacterSheet } from "@/lib/api/characters";

export const characterSheetKey = (campaignId: string, characterId?: string) => (characterId ? ["character-sheet", campaignId, characterId] : ["character-sheet", campaignId]);

export function useCharacterSheet(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: characterSheetKey(campaignId, characterId),
    queryFn: () => getCharacterSheet(campaignId, characterId),
    staleTime: 60_000,
    enabled: !!campaignId && !!characterId,
  });
}
