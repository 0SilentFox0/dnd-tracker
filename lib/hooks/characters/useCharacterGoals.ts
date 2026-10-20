"use client";

import { useQueryClient } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { putCharacterGoals } from "@/lib/api/characters";
import { GoalAuthor } from "@/lib/constants/characters";
import { useCrudMutation } from "@/lib/hooks/common";
import type { GoalInput } from "@/lib/schemas/character-goals";
import type { CharacterGoal, CharacterSheet } from "@/types/characters";

export function useCharacterGoals(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const key = characterKeys.sheet(campaignId, characterId);

  const mutation = useCrudMutation({
    mutationFn: ({ goals, seen }: { goals: GoalInput[]; seen?: string[] }) => putCharacterGoals(campaignId, characterId, goals, seen),
    errorText: "Не вдалося зберегти цілі",
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
    onError: (_error, _vars, context) => queryClient.setQueryData(key, context?.previous),
  });

  return {
    save: (goals: GoalInput[], seen?: string[]) => mutation.mutateOk({ goals, seen }),
    isPending: mutation.isPending,
  };
}
