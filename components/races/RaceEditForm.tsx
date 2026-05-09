"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getInitialRaceFormData } from "./RaceEditFormUtils";
import { RaceFormFields } from "./RaceFormFields";

import { FormCard } from "@/components/common/FormCard";
import { useUpdateRace } from "@/lib/hooks/races";
import { useMainSkills } from "@/lib/hooks/skills";
import type { Race, RaceFormData } from "@/types/races";

interface RaceEditFormProps {
  campaignId: string;
  race: Race;
}

export function RaceEditForm({ campaignId, race }: RaceEditFormProps) {
  const router = useRouter();

  const updateRaceMutation = useUpdateRace(campaignId);

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const [formData, setFormData] = useState<RaceFormData>(() =>
    getInitialRaceFormData(race),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSave: RaceFormData = {
      ...formData,
      passiveAbility: {
        description: formData.passiveAbility?.description || "",
        statImprovements: formData.passiveAbility?.statImprovements || "",
        statModifiers: formData.passiveAbility?.statModifiers || {},
      },
    };

    updateRaceMutation.mutate(
      { raceId: race.id, data: dataToSave },
      {
        onSuccess: () => {
          router.push(`/campaigns/${campaignId}/dm/races`);
          router.refresh();
        },
      },
    );
  };

  return (
    <FormCard
      title="Редагувати расу"
      description="Оновіть інформацію про расу"
      onSubmit={handleSubmit}
      isSubmitting={updateRaceMutation.isPending}
      onCancel={() => router.push(`/campaigns/${campaignId}/dm/races`)}
      submitLabel="Зберегти"
    >
      <RaceFormFields
        formData={formData}
        setFormData={setFormData}
        mainSkills={mainSkills}
      />
    </FormCard>
  );
}
