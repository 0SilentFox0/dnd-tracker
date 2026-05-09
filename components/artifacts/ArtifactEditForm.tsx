"use client";

import { useRouter } from "next/navigation";

import {
  artifactBonusesFromDb,
  artifactEffectScopeDraftFromDb,
  artifactModifierDraftsFromDb,
  passiveSkillEffectsFromDb,
} from "./artifact-combat-draft";
import type { ArtifactData, ArtifactSetOption } from "./ArtifactEditForm-types";
import { ArtifactForm } from "./ArtifactForm";

import { deleteArtifact, updateArtifact } from "@/lib/api/artifacts";
import { ArtifactRarity } from "@/lib/constants/artifacts";

interface ArtifactEditFormProps {
  campaignId: string;
  artifact: ArtifactData;
  artifactSets: ArtifactSetOption[];
}

export function ArtifactEditForm({
  campaignId,
  artifact,
  artifactSets,
}: ArtifactEditFormProps) {
  const router = useRouter();

  const passive = artifact.passiveAbility as Record<string, unknown> | null;

  return (
    <ArtifactForm
      campaignId={campaignId}
      artifactSets={artifactSets}
      mode="edit"
      title="Редагувати артефакт"
      description="Зміни зберігаються при натисканні кнопки"
      idPrefix="artifact-edit"
      submitLabel="Зберегти"
      submitLabelSaving="Збереження..."
      cancelHref={`/campaigns/${campaignId}/dm/artifacts`}
      iconHint={
        <>
          Нове зовнішнє посилання при збереженні завантажується в бакет{" "}
          <code className="text-xs bg-muted px-1 rounded">artifact-icons</code>
          . URL уже з Supabase залишається без змін.
        </>
      }
      initial={{
        name: artifact.name,
        description: artifact.description || "",
        rarity: artifact.rarity || ArtifactRarity.COMMON,
        slot: artifact.slot,
        icon: artifact.icon || "",
        setId: artifact.setId,
        effectName: typeof passive?.name === "string" ? passive.name : "",
        effectDescription:
          typeof passive?.description === "string" ? passive.description : "",
        bonuses: artifactBonusesFromDb(artifact.bonuses),
        modifiers: artifactModifierDraftsFromDb(artifact.modifiers),
        passiveEffects: passiveSkillEffectsFromDb(artifact.passiveAbility),
        effectScopeDraft: artifactEffectScopeDraftFromDb(artifact.passiveAbility),
        existingPassive: passive,
      }}
      onSubmit={async (payload) => {
        await updateArtifact(campaignId, artifact.id, payload);

        router.push(`/campaigns/${campaignId}/dm/artifacts`);
        router.refresh();
      }}
      onDelete={async () => {
        await deleteArtifact(campaignId, artifact.id);

        router.push(`/campaigns/${campaignId}/dm/artifacts`);
        router.refresh();
      }}
    />
  );
}
