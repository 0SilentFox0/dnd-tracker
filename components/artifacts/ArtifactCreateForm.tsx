"use client";

import { useRouter } from "next/navigation";

import { ArtifactForm } from "./ArtifactForm";

import { ArtifactRarity, ArtifactSlot } from "@/lib/constants/artifacts";
import { useCreateArtifact } from "@/lib/hooks/artifacts";
import type { ArtifactSetOption } from "@/types/artifacts";

interface ArtifactCreateFormProps {
  campaignId: string;
  artifactSets: ArtifactSetOption[];
}

export function ArtifactCreateForm({
  campaignId,
  artifactSets,
}: ArtifactCreateFormProps) {
  const router = useRouter();

  const create = useCreateArtifact(campaignId);

  return (
    <ArtifactForm
      campaignId={campaignId}
      artifactSets={artifactSets}
      mode="create"
      labels={{
        title: "Створити артефакт",
        description: "Бонуси та ефекти артефакту задаються вміннями",
        submit: "Створити артефакт",
        saving: "Створення...",
        iconHint: (
          <>
            Зовнішнє посилання при збереженні копіюється в Supabase Storage
            (бакет{" "}
            <code className="text-xs bg-muted px-1 rounded">artifact-icons</code>
            ); у базі залишиться публічний URL з вашого проєкту.
          </>
        ),
      }}
      cancelHref={`/campaigns/${campaignId}/dm/artifacts`}
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
      actions={{
        onSubmit: async (payload) => {
          await create.mutateAsync({
            ...payload,
            description: payload.description ?? undefined,
            setId: payload.setId ?? undefined,
          });
          router.push(`/campaigns/${campaignId}/dm/artifacts`);
          router.refresh();
        },
      }}
    />
  );
}
