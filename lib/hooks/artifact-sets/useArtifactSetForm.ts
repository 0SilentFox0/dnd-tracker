"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useDeleteArtifactSet, useSaveArtifactSet } from "./useArtifactSets";

import { abilitySaveError } from "@/lib/hooks/abilities";
import { useArtifactsList } from "@/lib/hooks/artifacts";
import { useConfirm } from "@/lib/hooks/common";
import type { Ability } from "@/lib/utils/abilities/schema";
import { filterArtifactsSelectableForSet } from "@/lib/utils/artifacts/artifact-set-form";

export interface ArtifactSetFormInitial {
  name?: string;
  description?: string | null;
  icon?: string | null;
  setBonus?: { name?: string; description?: string };
  abilities?: Ability[];
  artifactIds?: string[];
}

export function useArtifactSetForm({ campaignId, setId, initial }: { campaignId: string; setId?: string; initial: ArtifactSetFormInitial }) {
  const confirm = useConfirm();

  const router = useRouter();

  const save = useSaveArtifactSet(campaignId, setId);

  const del = useDeleteArtifactSet(campaignId);

  const { data: artifacts = [] } = useArtifactsList(campaignId);

  const [fields, setFields] = useState({
    name: initial.name ?? "",
    description: initial.description ?? "",
    icon: initial.icon ?? "",
    bonusName: initial.setBonus?.name ?? "",
    bonusDescription: initial.setBonus?.description ?? "",
    abilities: initial.abilities ?? [],
  });

  const [selectedIds, setSelectedIds] = useState(() => new Set(initial.artifactIds ?? []));

  const [abilityErrors, setAbilityErrors] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const abilitiesValid = abilityErrors === 0;

  const selectableArtifacts = useMemo(() => filterArtifactsSelectableForSet(artifacts, setId), [artifacts, setId]);

  const setField = <K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const toggleArtifact = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });

  const listHref = `/campaigns/${campaignId}/dm/artifact-sets`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!abilitiesValid) return;

    setError(null);

    try {
      await save.mutateAsync({
        name: fields.name,
        description: fields.description.trim() ? fields.description : null,
        setBonus: { name: fields.bonusName.trim() || undefined, description: fields.bonusDescription.trim() || undefined },
        abilities: fields.abilities,
        artifactIds: [...selectedIds],
        icon: fields.icon.trim() ? fields.icon : null,
      });
      router.push(listHref);
    } catch (err) {
      setError(abilitySaveError(err, "Помилка збереження"));
    }
  };

  const remove = async () => {
    if (!setId) return;

    const ok = await confirm({
      title: "Видалити сет? Артефакти залишаться в кампанії, поле «Сет» у них буде очищено.",
      confirmLabel: "Видалити",
      destructive: true,
      onConfirm: () => del.mutateAsync(setId),
    });

    if (ok) router.push(listHref);
  };

  return {
    fields,
    setField,
    selectedIds,
    toggleArtifact,
    selectableArtifacts,
    abilityErrors,
    setAbilityErrors,
    abilitiesValid,
    isBusy: save.isPending || del.isPending,
    error,
    submit,
    remove,
  };
}
