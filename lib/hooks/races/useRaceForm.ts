"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useUpdateRace } from "./useRaces";

import { useAbilityValidity } from "@/lib/hooks/abilities";
import { useNavigateFresh } from "@/lib/hooks/common";
import type { RaceFormData } from "@/types/races";

export function useRaceForm(campaignId: string, raceId: string, initial: RaceFormData) {
  const router = useRouter();

  const navigateFresh = useNavigateFresh();

  const update = useUpdateRace(campaignId);

  const [formData, setFormData] = useState<RaceFormData>(initial);

  const abilities = useAbilityValidity();

  const listHref = `/campaigns/${campaignId}/dm/races`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!abilities.valid) return;

    const data: RaceFormData = {
      ...formData,
      passiveAbility: {
        ...formData.passiveAbility,
        description: formData.passiveAbility?.description || "",
        statImprovements: formData.passiveAbility?.statImprovements || "",
        statModifiers: formData.passiveAbility?.statModifiers || {},
      },
    };

    update.mutate({ raceId, data }, { onSuccess: () => navigateFresh(listHref) });
  };

  return {
    form: { data: formData, set: setFormData },
    abilities,
    status: { isSaving: update.isPending },
    actions: { submit, cancel: () => router.push(listHref) },
  };
}
