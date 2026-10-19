"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useUpdateRace } from "./useRaces";

import type { RaceFormData } from "@/types/races";

export function useRaceForm(campaignId: string, raceId: string, initial: RaceFormData) {
  const router = useRouter();

  const update = useUpdateRace(campaignId);

  const [formData, setFormData] = useState<RaceFormData>(initial);

  const [abilityErrors, setAbilityErrors] = useState(0);

  const listHref = `/campaigns/${campaignId}/dm/races`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (abilityErrors > 0) return;

    const data: RaceFormData = {
      ...formData,
      passiveAbility: {
        ...formData.passiveAbility,
        description: formData.passiveAbility?.description || "",
        statImprovements: formData.passiveAbility?.statImprovements || "",
        statModifiers: formData.passiveAbility?.statModifiers || {},
      },
    };

    update.mutate(
      { raceId, data },
      {
        onSuccess: () => {
          router.push(listHref);
          router.refresh();
        },
      },
    );
  };

  return {
    form: { data: formData, set: setFormData },
    abilities: { errors: abilityErrors, setErrors: setAbilityErrors, valid: abilityErrors === 0 },
    isSaving: update.isPending,
    actions: { submit, cancel: () => router.push(listHref) },
  };
}
