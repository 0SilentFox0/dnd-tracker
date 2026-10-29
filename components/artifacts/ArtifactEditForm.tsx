"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ArtifactForm } from "./ArtifactForm";

import { ArtifactRarity } from "@/lib/constants/artifacts";
import { useDeleteArtifact, useUpdateArtifact } from "@/lib/hooks/artifacts";
import type { ArtifactData, ArtifactSetOption } from "@/types/artifacts";

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
  const t = useTranslations("artifacts.form");

  const tc = useTranslations("common.actions");

  const router = useRouter();

  const update = useUpdateArtifact(campaignId);

  const remove = useDeleteArtifact(campaignId);

  return (
    <ArtifactForm
      campaignId={campaignId}
      artifactSets={artifactSets}
      mode="edit"
      labels={{
        title: t("editTitle"),
        description: t("editDescription"),
        submit: tc("save"),
        saving: tc("saving"),
        iconHint: t("editIconHint", { bucket: "artifact-icons" }),
      }}
      cancelHref={`/campaigns/${campaignId}/dm/artifacts`}
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
        armor: artifact.armor ?? null,
        item: artifact.item ?? undefined,
      }}
      actions={{
        onSubmit: async (payload) => {
          await update.mutateAsync({ artifactId: artifact.id, data: payload });
          router.push(`/campaigns/${campaignId}/dm/artifacts`);
          router.refresh();
        },
        onDelete: async () => {
          await remove.mutateAsync(artifact.id);
          router.push(`/campaigns/${campaignId}/dm/artifacts`);
          router.refresh();
        },
      }}
    />
  );
}
