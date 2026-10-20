"use client";

import { useQueryClient } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { createCharacterToken, deleteCharacterToken } from "@/lib/api/characters";
import { useCrudMutation } from "@/lib/hooks/common";
import type { CreateTokenInput } from "@/lib/schemas/character-tokens";
import type { CharacterSheet, CharacterToken } from "@/types/characters";

const TOKEN_ERROR = "Не вдалося зберегти жетон";

export function useCharacterTokens(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const key = characterKeys.sheet(campaignId, characterId);

  const patchTokens = (update: (tokens: CharacterToken[]) => CharacterToken[]) =>
    queryClient.setQueryData<CharacterSheet>(key, (old) => (old ? { ...old, story: { ...old.story, tokens: update(old.story.tokens) } } : old));

  const addMutation = useCrudMutation({
    mutationFn: (input: CreateTokenInput) => createCharacterToken(campaignId, characterId, input),
    errorText: TOKEN_ERROR,
    onSuccess: ({ token }) => patchTokens((tokens) => [token, ...tokens]),
  });

  const removeMutation = useCrudMutation({
    mutationFn: (tokenId: string) => deleteCharacterToken(campaignId, characterId, tokenId),
    errorText: TOKEN_ERROR,
    onSuccess: (_res, tokenId) => patchTokens((tokens) => tokens.filter((t) => t.id !== tokenId)),
  });

  return {
    add: addMutation.mutateOk,
    remove: removeMutation.mutateOk,
    isPending: addMutation.isPending || removeMutation.isPending,
  };
}
