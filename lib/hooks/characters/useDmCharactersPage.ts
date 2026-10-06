"use client";

import { useCharacters, useDeleteAllCharacters, useDeleteCharacter, useLevelUpCharacter } from "./useCharacters";

import type { CharacterTypeValue } from "@/lib/constants/characters";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import type { Character } from "@/types/characters";

export function useDmCharactersPage(campaignId: string, type?: CharacterTypeValue) {
  const confirm = useConfirm();

  const notify = useNotify();

  const query = useCharacters(campaignId, type ? { type } : undefined);

  const deleteAll = useDeleteAllCharacters(campaignId);

  const deleteOne = useDeleteCharacter(campaignId);

  const levelUpMutation = useLevelUpCharacter(campaignId);

  const levelUp = (character: Character) =>
    levelUpMutation.mutate(character.id, { onError: () => void notify("Не вдалося підняти рівень. Спробуйте ще раз.") });

  const confirmDelete = (character: Character) =>
    confirm({
      title: "Видалити персонажа?",
      description: `Персонажа "${character.name}" буде видалено. Цю дію не можна скасувати.`,
      confirmLabel: "Видалити",
      destructive: true,
      onConfirm: () => deleteOne.mutateAsync(character.id),
    });

  const confirmDeleteAll = () =>
    confirm({
      title: "Видалити всіх персонажів?",
      description: "Буде видалено всіх персонажів гравців у цій кампанії. Цю дію не можна скасувати.",
      confirmLabel: "Видалити всіх",
      destructive: true,
      onConfirm: () => deleteAll.mutateAsync(),
    });

  return {
    query,
    levelUp,
    confirmDelete,
    confirmDeleteAll,
    isDeletingAll: deleteAll.isPending,
    levelingUpId: levelUpMutation.isPending ? levelUpMutation.variables : undefined,
  };
}
