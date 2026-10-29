"use client";

import { useTranslations } from "next-intl";

import { useCharacterEditor } from "./useCharacterEditor";
import { useDeleteCharacter, useLevelUpCharacter } from "./useCharacters";

import { useArtifactsList } from "@/lib/hooks/artifacts";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import { mergeLevelUpIntoForm } from "@/lib/utils/characters/character-form";
import type { Character } from "@/types/characters";

export function useDmCharacterEditor({ campaignId, characterId, onSaved }: { campaignId: string; characterId: string; onSaved: () => void }) {
  const t = useTranslations("characters.editor");

  const tc = useTranslations("common.actions");

  const confirm = useConfirm();

  const notify = useNotify();

  const editor = useCharacterEditor({ campaignId, characterId, onSaved });

  const loaded = !!editor.query.data;

  const { data: artifacts = [] } = useArtifactsList(campaignId, { enabled: loaded });

  const levelUpMutation = useLevelUpCharacter(campaignId);

  const deleteMutation = useDeleteCharacter(campaignId);

  const remove = () =>
    confirm({
      title: t("deleteTitle", { name: editor.form.basicInfo.data.name }),
      description: t("deleteDescription"),
      confirmLabel: tc("delete"),
      onConfirm: () => deleteMutation.mutateAsync(characterId),
    });

  const levelUp = async () => {
    const { name, level } = editor.form.basicInfo.data;

    let details: { abilityIncreased?: string | null } | undefined;

    const ok = await confirm({
      title: t("levelUpTitle", { name, from: level, to: level + 1 }),
      confirmLabel: t("levelUpConfirm"),
      onConfirm: async () => {
        const updated = await levelUpMutation.mutateAsync(characterId);

        editor.form.actions.setFormData((prev) => mergeLevelUpIntoForm(prev, updated));
        details = updated.levelUpDetails as typeof details;
      },
    });

    if (ok && details) {
      void notify(details.abilityIncreased ? t("levelUpDoneIncreased", { ability: details.abilityIncreased }) : t("levelUpDoneMaxed"));
    }
  };

  const applyClassLevelUp = (updated: Character) => editor.form.actions.setFormData((prev) => mergeLevelUpIntoForm(prev, updated));

  return { ...editor, artifacts, dmActions: { levelUp, applyClassLevelUp, remove } };
}

export type DmCharacterEditor = ReturnType<typeof useDmCharacterEditor>;
