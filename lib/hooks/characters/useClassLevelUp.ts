"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { levelUpInvalidateKeys } from "./useCharacters";

import { levelUpCharacter } from "@/lib/api/characters";
import { useCrudMutation } from "@/lib/hooks/common";
import type { Character } from "@/types/characters";
import type { ClassLevelUpPick } from "@/types/classes";

export function useClassLevelUp({ campaignId, characterId, onLeveled }: { campaignId: string; characterId: string; onLeveled?: (updated: Character) => void }) {
  const t = useTranslations("characterProfile.classLevelUp");

  const [error, setError] = useState<string | null>(null);

  const mutation = useCrudMutation({
    mutationFn: (pick: ClassLevelUpPick) => levelUpCharacter(campaignId, characterId, pick),
    invalidateKeys: levelUpInvalidateKeys(campaignId),
  });

  const submit = async (pick: ClassLevelUpPick) => {
    setError(null);

    try {
      onLeveled?.(await mutation.mutateAsync(pick));

      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failed"));

      return false;
    }
  };

  return { submit, isPending: mutation.isPending, error, clearError: () => setError(null) };
}
