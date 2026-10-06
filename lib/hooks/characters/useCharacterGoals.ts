"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { characterSheetKey } from "./useCharacterSheet";

import { putCharacterGoals } from "@/lib/api/characters";
import { GoalAuthor } from "@/lib/constants/characters";
import { useNotify } from "@/lib/hooks/common";
import type { GoalInput } from "@/lib/schemas/character-goals";
import type { CharacterGoal, CharacterSheet } from "@/types/characters";

export function useCharacterGoals(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const key = characterSheetKey(campaignId, characterId);

  const mutation = useMutation({
    mutationFn: ({ goals, seen }: { goals: GoalInput[]; seen?: string[] }) => putCharacterGoals(campaignId, characterId, goals, seen),
    onMutate: async ({ goals }) => {
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<CharacterSheet>(key);

      // the server keeps DM goals a player cannot touch, so only the shown list changes optimistically
      const keptDm = previous?.viewer?.isDM ? [] : (previous?.story.goals.filter((g) => g.author === GoalAuthor.DM) ?? []);

      const shown = [...keptDm, ...goals.map((g) => ({ ...g, author: g.author ?? (previous?.viewer?.isDM ? GoalAuthor.DM : GoalAuthor.PLAYER) }) as CharacterGoal)];

      queryClient.setQueryData<CharacterSheet>(key, (old) => (old ? { ...old, story: { ...old.story, goals: shown } } : old));

      return { previous };
    },
    onSuccess: ({ goals }) => queryClient.setQueryData<CharacterSheet>(key, (old) => (old ? { ...old, story: { ...old.story, goals } } : old)),
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(key, context?.previous);
      void notify("Не вдалося зберегти цілі");
    },
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
