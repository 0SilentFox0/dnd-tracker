"use client";

import { useRouter } from "next/navigation";

import type { ArtifactData, ArtifactSetOption } from "./ArtifactEditForm-types";
import { ArtifactForm } from "./ArtifactForm";

import { ArtifactRarity } from "@/lib/constants/artifacts";
import { useDeleteArtifact, useUpdateArtifact } from "@/lib/hooks/artifacts";

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

  const update = useUpdateArtifact(campaignId);

  const remove = useDeleteArtifact(campaignId);

  return (
    <ArtifactForm
      campaignId={campaignId}
      artifactSets={artifactSets}
      mode="edit"
      title="Редагувати артефакт"
      description="Зміни зберігаються при натисканні кнопки"
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
        abilities: artifact.abilities,
        abilityIssues: artifact.abilityIssues,
        weapon: artifact.weapon,
      }}
      onSubmit={async (payload) => {
        await update.mutateAsync({ artifactId: artifact.id, data: payload });
        router.push(`/campaigns/${campaignId}/dm/artifacts`);
        router.refresh();
      }}
      onDelete={async () => {
        await remove.mutateAsync(artifact.id);
        router.push(`/campaigns/${campaignId}/dm/artifacts`);
        router.refresh();
      }}
    />
  );
}
