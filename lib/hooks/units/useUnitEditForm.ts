"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useUnitFormFields } from "./useUnitFormFields";
import { useDeleteUnit, useUnit, useUpdateUnit } from "./useUnits";

import { useConfirm } from "@/lib/hooks/common";
import { buildUnitFormData, buildUnitUpdatePayload, emptyUnitFormDefaults } from "@/lib/utils/units/unit-form";
import type { Unit } from "@/types/units";

export function useUnitEditForm(campaignId: string, unitId: string) {
  const confirm = useConfirm();

  const router = useRouter();

  const query = useUnit(campaignId, unitId);

  const update = useUpdateUnit(campaignId, unitId);

  const del = useDeleteUnit(campaignId);

  const fields = useUnitFormFields(campaignId, emptyUnitFormDefaults);

  const unit = query.data;

  const [syncedUnit, setSyncedUnit] = useState<Unit | undefined>(undefined);

  // Follow fresh server snapshots until the DM starts editing
  if (unit && unit !== syncedUnit && !fields.dirty) {
    setSyncedUnit(unit);
    fields.setFormData(buildUnitFormData(unit));
  }

  const listHref = `/campaigns/${campaignId}/dm/units`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fields.abilitiesValid) return;

    update.mutate(buildUnitUpdatePayload(fields.formData, unit), { onSuccess: () => router.push(listHref) });
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Ви впевнені, що хочете видалити цього юніта?",
      confirmLabel: "Видалити",
      destructive: true,
      onConfirm: () => del.mutateAsync(unitId),
    });

    if (ok) router.push(listHref);
  };

  return {
    ...fields,
    query,
    submit,
    remove,
    listHref,
    isSaving: update.isPending,
    isDeleting: del.isPending,
    error: update.error as Error | null,
  };
}
