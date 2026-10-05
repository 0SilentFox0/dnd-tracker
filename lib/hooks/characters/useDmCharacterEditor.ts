"use client";

import { useRouter } from "next/navigation";

import { useCharacterEditor } from "./useCharacterEditor";
import { useLevelUpCharacter } from "./useCharacters";

import { useArtifactSetsList } from "@/lib/hooks/artifact-sets";
import { useArtifactsList } from "@/lib/hooks/artifacts";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { ArtifactSetRow } from "@/types/artifact-sets";

export function useDmCharacterEditor({ campaignId, characterId }: { campaignId: string; characterId: string }) {
  const router = useRouter();

  const confirm = useConfirm();

  const notify = useNotify();

  const editor = useCharacterEditor({ campaignId, characterId, onSaved: () => router.push(`/campaigns/${campaignId}/dm/characters`) });

  const loaded = !!editor.query.data;

  const { data: artifacts = [] } = useArtifactsList(campaignId, { enabled: loaded });

  const { data: artifactSets = [] } = useArtifactSetsList(campaignId, { enabled: loaded });

  const levelUpMutation = useLevelUpCharacter(campaignId);

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

  return { ...editor, campaignId, characterId, artifacts, artifactSets: artifactSets as ArtifactSetRow[], levelUp };
}

export type DmCharacterEditor = ReturnType<typeof useDmCharacterEditor>;
