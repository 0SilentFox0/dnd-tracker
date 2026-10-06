"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { characterSheetKey } from "./useCharacterSheet";

import { putCharacterGoals } from "@/lib/api/characters";
import { useNotify } from "@/lib/hooks/common";
import type { GoalInput } from "@/lib/schemas/character-goals";
import type { CharacterSheet } from "@/types/characters";

export function useCharacterGoals(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const mutation = useMutation({
    mutationFn: ({ goals, seen }: { goals: GoalInput[]; seen?: string[] }) => putCharacterGoals(campaignId, characterId, goals, seen),
    onSuccess: ({ goals }) =>
      queryClient.setQueryData<CharacterSheet>(characterSheetKey(campaignId, characterId), (old) => (old ? { ...old, story: { ...old.story, goals } } : old)),
    onError: () => void notify("Не вдалося зберегти цілі"),
  });

  return {
    save: (goals: GoalInput[], seen?: string[]) =>
      mutation.mutateAsync({ goals, seen }).then(
        () => true,
        () => false,
      ),
    isPending: mutation.isPending,
  };
}
