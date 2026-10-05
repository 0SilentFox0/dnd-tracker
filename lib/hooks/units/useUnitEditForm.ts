"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useDeleteUnit, useUnit, useUpdateUnit } from "./useUnits";

import { useConfirm } from "@/lib/hooks/common";
import { useRaces } from "@/lib/hooks/races";
import { useSpells } from "@/lib/hooks/spells";
import { buildUnitFormData, buildUnitUpdatePayload, emptyUnitFormDefaults } from "@/lib/utils/units/unit-form";
import type { Unit } from "@/types/units";

export function useUnitEditForm(campaignId: string, unitId: string) {
  const confirm = useConfirm();

  const router = useRouter();

  const query = useUnit(campaignId, unitId);

  const { data: races = [] } = useRaces(campaignId);

  const { data: spells = [] } = useSpells(campaignId);

  const update = useUpdateUnit(campaignId, unitId);

  const del = useDeleteUnit(campaignId);

  const [formData, setFormData] = useState<Partial<Unit>>(emptyUnitFormDefaults);

  const [abilityErrors, setAbilityErrors] = useState(0);

  const abilitiesValid = abilityErrors === 0;

  const unit = query.data;

  // Re-sync only when race/group arrive (cache → full load), not on every refetch.
  const lastServerSyncKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!unit) return;

    const syncKey = [unit.id, unit.race ?? "", unit.groupId ?? "", unit.unitGroup?.name ?? ""].join("|");

    if (lastServerSyncKeyRef.current === syncKey) return;

    lastServerSyncKeyRef.current = syncKey;
    setFormData(buildUnitFormData(unit)); // eslint-disable-line react-hooks/set-state-in-effect -- sync form from server snapshot
  }, [unit]);

  const listHref = `/campaigns/${campaignId}/dm/units`;

  const change = (updates: Partial<Unit>) => setFormData((prev) => ({ ...prev, ...updates }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!abilitiesValid) return;

    update.mutate(buildUnitUpdatePayload(formData, unit), { onSuccess: () => router.push(listHref) });
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
    query,
    races,
    spells,
    formData,
    change,
    abilityErrors,
    setAbilityErrors,
    abilitiesValid,
    submit,
    remove,
    isSaving: update.isPending,
    isDeleting: del.isPending,
    error: update.error as Error | null,
  };
}
