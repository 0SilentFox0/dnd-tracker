"use client";

import { useQueryClient } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { putCharacterNotes } from "@/lib/api/characters";
import { useCrudMutation } from "@/lib/hooks/common";
import type { CharacterSheet } from "@/types/characters";

export function useCharacterNotes(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const key = characterKeys.sheet(campaignId, characterId);

  const mutation = useCrudMutation({
    mutationFn: (notes: string) => putCharacterNotes(campaignId, characterId, notes),
    errorText: "Не вдалося зберегти нотатки",
    onSuccess: ({ notes }) => queryClient.setQueryData<CharacterSheet>(key, (old) => (old ? { ...old, story: { ...old.story, notes } } : old)),
  });

  return {
    save: (notes: string) => mutation.mutateOk(notes),
    isPending: mutation.isPending,
  };
}
