"use client";

import { useTranslations } from "next-intl";

import { useCharacters, useDeleteAllCharacters, useDeleteCharacter, useLevelUpCharacter } from "./useCharacters";

import type { CharacterTypeValue } from "@/lib/constants/characters";
import { useConfirm, useNotify, useSearch } from "@/lib/hooks/common";
import type { CharacterListItem } from "@/types/characters";

const EMPTY: CharacterListItem[] = [];

const characterFields = (character: CharacterListItem) => [character.name, character.user?.displayName];

export function useDmCharactersPage(campaignId: string, type?: CharacterTypeValue) {
  const t = useTranslations("characters.list");

  const confirm = useConfirm();

  const notify = useNotify();

  const tc = useTranslations("common.actions");

  const query = useCharacters(campaignId, type ? { type } : undefined);

  const search = useSearch(query.data ?? EMPTY, characterFields);

  const deleteAll = useDeleteAllCharacters(campaignId);

  const deleteOne = useDeleteCharacter(campaignId);

  const levelUpMutation = useLevelUpCharacter(campaignId);

  const levelUp = (character: CharacterListItem) =>
    levelUpMutation.mutate(character.id, { onError: () => void notify(t("levelUpFailed")) });

  const confirmDelete = (character: CharacterListItem) =>
    confirm({
      title: t("deleteTitle"),
      description: t("deleteDescription", { name: character.name }),
      confirmLabel: tc("delete"),
      destructive: true,
      onConfirm: () => deleteOne.mutateAsync(character.id),
    });

  const removeAll = () => deleteAll.mutateAsync();

  return {
    query,
    search,
    actions: { levelUp, confirmDelete, removeAll },
    status: { isDeletingAll: deleteAll.isPending, levelingUpId: levelUpMutation.isPending ? levelUpMutation.variables : undefined },
  };
}
