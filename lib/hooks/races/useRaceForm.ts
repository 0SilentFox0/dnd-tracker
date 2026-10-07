"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useUpdateRace } from "./useRaces";

import { useMainSkills } from "@/lib/hooks/skills";
import type { RaceFormData } from "@/types/races";

export function useRaceForm(campaignId: string, raceId: string, initial: RaceFormData) {
  const router = useRouter();

  const update = useUpdateRace(campaignId);

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const [formData, setFormData] = useState<RaceFormData>(initial);

  const [abilityErrors, setAbilityErrors] = useState(0);

  const listHref = `/campaigns/${campaignId}/dm/races`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (abilityErrors > 0) return;

    const data: RaceFormData = {
      ...formData,
      passiveAbility: {
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
    formData,
    setFormData,
    mainSkills,
    abilityErrors,
    setAbilityErrors,
    abilitiesValid: abilityErrors === 0,
    isSaving: update.isPending,
    submit,
    cancel: () => router.push(listHref),
  };
}
