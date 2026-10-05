"use client";

import { useState } from "react";

import { abilitySaveError } from "@/lib/hooks/abilities";
import { useConfirm } from "@/lib/hooks/common";
import {
  type ArtifactFormState,
  type ArtifactFormSubmitPayload,
  buildArtifactPayload,
} from "@/lib/utils/artifacts/artifact-form";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";

interface UseArtifactFormOptions {
  initial: Omit<ArtifactFormState, "weapon"> & { weapon?: WeaponStats };
  mode: "create" | "edit";
  onSubmit: (payload: ArtifactFormSubmitPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function useArtifactForm({ initial, mode, onSubmit, onDelete }: UseArtifactFormOptions) {
  const confirm = useConfirm();

  const [fields, setFields] = useState<ArtifactFormState>({ ...initial, weapon: initial.weapon ?? {} });

  const [abilityErrors, setAbilityErrors] = useState(0);

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const abilitiesValid = abilityErrors === 0;

  const setField = <K extends keyof ArtifactFormState>(key: K, value: ArtifactFormState[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!fields.name.trim() || !abilitiesValid) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSubmit(buildArtifactPayload(fields, mode));
    } catch (err) {
      setError(abilitySaveError(err, mode === "edit" ? "Помилка оновлення" : "Помилка створення"));
    } finally {
      setIsSaving(false);
    }
  };

  const remove = () =>
    onDelete
      ? confirm({ title: "Ви впевнені, що хочете видалити цей артефакт?", confirmLabel: "Видалити", destructive: true, onConfirm: onDelete })
      : Promise.resolve(false);

  return { fields, setField, abilityErrors, setAbilityErrors, abilitiesValid, isSaving, isBusy: isSaving, error, submit, remove };
}
