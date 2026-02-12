import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteAllCharacters,
  deleteCharacter,
  getCharacters,
} from "@/lib/api/characters";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";
import type { Character } from "@/types/characters";

export type { Character };

export function useCharacters(campaignId: string) {
  return useQuery<Character[]>({
    queryKey: ["characters", campaignId],
    queryFn: () => getCharacters(campaignId, { type: "player" }),
    staleTime: ENTITY_STALE_MS,
    enabled: !!campaignId,
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
