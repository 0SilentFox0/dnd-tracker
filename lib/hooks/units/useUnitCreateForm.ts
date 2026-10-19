"use client";

import { useRouter } from "next/navigation";

import { useUnitFormFields } from "./useUnitFormFields";
import { useCreateUnit } from "./useUnits";

import { buildUnitCreatePayload, emptyUnitFormDefaults } from "@/lib/utils/units/unit-form";

export function useUnitCreateForm(campaignId: string) {
  const router = useRouter();

  const create = useCreateUnit(campaignId);

  const fields = useUnitFormFields(campaignId, emptyUnitFormDefaults);

  const listHref = `/campaigns/${campaignId}/dm/units`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fields.abilities.valid) return;

    create.mutate(buildUnitCreatePayload(fields.form.data), { onSuccess: () => router.push(listHref) });
  };

  return {
    ...fields,
    actions: { submit },
    status: { isSaving: create.isPending, error: create.error as Error | null },
    listHref,
  };
}
