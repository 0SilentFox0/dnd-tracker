"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { characterSheetKey } from "./keys";

import { createCharacterToken, deleteCharacterToken } from "@/lib/api/characters";
import { useNotify } from "@/lib/hooks/common";
import type { CreateTokenInput } from "@/lib/schemas/character-tokens";
import type { CharacterSheet, CharacterToken } from "@/types/characters";

export function useCharacterTokens(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const key = characterSheetKey(campaignId, characterId);

  const patchTokens = (update: (tokens: CharacterToken[]) => CharacterToken[]) =>
    queryClient.setQueryData<CharacterSheet>(key, (old) => (old ? { ...old, story: { ...old.story, tokens: update(old.story.tokens) } } : old));

  const addMutation = useMutation({
    mutationFn: (input: CreateTokenInput) => createCharacterToken(campaignId, characterId, input),
    onSuccess: ({ token }) => patchTokens((tokens) => [token, ...tokens]),
    onError: () => void notify("Не вдалося зберегти жетон"),
  });

  const removeMutation = useMutation({
    mutationFn: (tokenId: string) => deleteCharacterToken(campaignId, characterId, tokenId),
    onSuccess: (_res, tokenId) => patchTokens((tokens) => tokens.filter((t) => t.id !== tokenId)),
    onError: () => void notify("Не вдалося зберегти жетон"),
  });

  return {
    add: (input: CreateTokenInput) =>
      addMutation.mutateAsync(input).then(
        () => true,
        () => false,
      ),
    remove: (tokenId: string) =>
      removeMutation.mutateAsync(tokenId).then(
        () => true,
        () => false,
      ),
    isPending: addMutation.isPending || removeMutation.isPending,
  };
}
