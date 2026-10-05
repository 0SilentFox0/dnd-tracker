"use client";

import { useRouter } from "next/navigation";

import {
  ArtifactForm,
  type ArtifactSetOption,
} from "./ArtifactForm";

import { createArtifact } from "@/lib/api/artifacts";
import { ArtifactRarity, ArtifactSlot } from "@/lib/constants/artifacts";

interface ArtifactCreateFormProps {
  campaignId: string;
  artifactSets: ArtifactSetOption[];
}

export function ArtifactCreateForm({
  campaignId,
  artifactSets,
}: ArtifactCreateFormProps) {
  const router = useRouter();

  return (
    <ArtifactForm
      campaignId={campaignId}
      artifactSets={artifactSets}
      mode="create"
      title="Створити артефакт"
      description="Бонуси та ефекти артефакту задаються вміннями"
      submitLabel="Створити артефакт"
      submitLabelSaving="Створення..."
      cancelHref={`/campaigns/${campaignId}/dm/artifacts`}
      iconHint={
        <>
          Зовнішнє посилання при збереженні копіюється в Supabase Storage
          (бакет{" "}
          <code className="text-xs bg-muted px-1 rounded">artifact-icons</code>
          ); у базі залишиться публічний URL з вашого проєкту.
        </>
      }
      initial={{
        name: "",
        description: "",
        rarity: ArtifactRarity.COMMON,
        slot: ArtifactSlot.ITEM,
        icon: "",
        setId: null,
        abilities: [],
        abilityIssues: [],
      }}
      onSubmit={async (payload) => {
        await createArtifact(campaignId, {
          name: payload.name,
          description: payload.description ?? undefined,
          rarity: payload.rarity,
          slot: payload.slot,
          icon: payload.icon,
          setId: payload.setId ?? undefined,
          abilities: payload.abilities,
        });

        router.push(`/campaigns/${campaignId}/dm/artifacts`);
        router.refresh();
      }}
    />
  );
}
