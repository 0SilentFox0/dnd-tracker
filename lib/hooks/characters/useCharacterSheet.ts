"use client";

import { useQuery } from "@tanstack/react-query";

import { characterSheetKey } from "./keys";

import { getCharacterSheet } from "@/lib/api/characters";

export function useCharacterSheet(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: characterSheetKey(campaignId, characterId),
    queryFn: () => getCharacterSheet(campaignId, characterId),
    staleTime: 60_000,
    enabled: !!campaignId && !!characterId,
  });
}
