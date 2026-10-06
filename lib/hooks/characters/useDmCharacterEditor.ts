"use client";

import { useCharacterEditor } from "./useCharacterEditor";
import { useDeleteCharacter, useLevelUpCharacter } from "./useCharacters";

import { useArtifactsList } from "@/lib/hooks/artifacts";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import { characterToFormData } from "@/lib/utils/characters/character-form";

export function useDmCharacterEditor({ campaignId, characterId, onSaved }: { campaignId: string; characterId: string; onSaved: () => void }) {
  const confirm = useConfirm();

  const notify = useNotify();

  const editor = useCharacterEditor({ campaignId, characterId, onSaved });

  const loaded = !!editor.query.data;

  const { data: artifacts = [] } = useArtifactsList(campaignId, { enabled: loaded });

  const levelUpMutation = useLevelUpCharacter(campaignId);

  const deleteMutation = useDeleteCharacter(campaignId);

  const remove = () =>
    confirm({
      title: `Видалити персонажа ${editor.form.basicInfo.name}?`,
      description: "Персонаж, його інвентар і прогрес зникнуть назавжди.",
      confirmLabel: "Видалити",
      onConfirm: () => deleteMutation.mutateAsync(characterId),
    });

  const levelUp = async () => {
    const { name, level } = editor.form.basicInfo;

    let details: { abilityIncreased?: string; hpGain?: number } | undefined;

    const ok = await confirm({
      title: `Підняти рівень персонажа ${name}? (Рівень ${level} → ${level + 1})`,
      confirmLabel: "Підняти",
      onConfirm: async () => {
        const updated = await levelUpMutation.mutateAsync(characterId);

        editor.form.setFormData(characterToFormData(updated));
        details = updated.levelUpDetails as typeof details;
      },
    });

    if (ok && details) {
      void notify(`Рівень піднято! ${details.abilityIncreased ?? "Характеристика"}: +1, HP: +${details.hpGain ?? 0}, Додано магічні слоти.`);
    }
  };

  return { ...editor, campaignId, characterId, artifacts, levelUp, remove };
}

export type DmCharacterEditor = ReturnType<typeof useDmCharacterEditor>;
