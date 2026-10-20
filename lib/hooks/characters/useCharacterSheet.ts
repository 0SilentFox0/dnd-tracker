"use client";

import { useQuery } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { getCharacterSheet } from "@/lib/api/characters";

export function useCharacterSheet(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: characterKeys.sheet(campaignId, characterId),
    queryFn: () => getCharacterSheet(campaignId, characterId),
    staleTime: 60_000,
    enabled: !!campaignId && !!characterId,
  });
}
