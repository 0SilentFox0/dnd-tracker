"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useDeleteArtifactSet, useSaveArtifactSet } from "./useArtifactSets";

import { abilitySaveError, useAbilityValidity } from "@/lib/hooks/abilities";
import { useArtifactsList } from "@/lib/hooks/artifacts";
import { useConfirm, useNavigateFresh } from "@/lib/hooks/common";
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
  const t = useTranslations();

  const confirm = useConfirm();

  const navigateFresh = useNavigateFresh();

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

  const abilities = useAbilityValidity();

  const [error, setError] = useState<string | null>(null);

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

    if (!abilities.valid) return;

    if (!fields.name.trim()) {
      setError(t("artifacts.sets.form.nameRequired"));

      return;
    }

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
      navigateFresh(listHref);
    } catch (err) {
      setError(abilitySaveError(err, t("common.form.saveFailed")));
    }
  };

  const remove = async () => {
    if (!setId) return;

    const ok = await confirm({
      title: t("artifacts.sets.list.confirmDelete"),
      confirmLabel: t("common.actions.delete"),
      destructive: true,
      onConfirm: () => del.mutateAsync(setId),
    });

    if (ok) navigateFresh(listHref);
  };

  return {
    form: { data: fields, set: setField },
    members: { selectedIds, selectable: selectableArtifacts, toggle: toggleArtifact },
    abilities,
    status: { isBusy: save.isPending || del.isPending, error },
    actions: { submit, remove },
  };
}
