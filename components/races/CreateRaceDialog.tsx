"use client";

import { useState } from "react";

import { RaceFormFields } from "./RaceFormFields";

import { withAbilityErrors } from "@/components/abilities";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { DEFAULT_SPELL_SLOT_PROGRESSION } from "@/lib/constants/spells";
import { useMainSkills } from "@/lib/hooks/skills";
import type { RaceFormData } from "@/types/races";

interface CreateRaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onCreateRace: (data: RaceFormData) => void;
}

const EMPTY_FORM: RaceFormData = {
  name: "",
  color: "",
  availableSkills: [],
  disabledSkills: [],
  passiveAbility: {
    description: "",
    statImprovements: "",
    statModifiers: {},
  },
  spellSlotProgression: DEFAULT_SPELL_SLOT_PROGRESSION,
  abilities: [],
};

export function CreateRaceDialog({
  open,
  onOpenChange,
  campaignId,
  onCreateRace,
}: CreateRaceDialogProps) {
  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const [formData, setFormData] = useState<RaceFormData>(EMPTY_FORM);

  const [abilityErrors, setAbilityErrors] = useState(0);

  const abilitiesValid = abilityErrors === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!abilitiesValid) return;

    onCreateRace(formData);

    setFormData(EMPTY_FORM);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Створити расу"
      description="Заповніть інформацію про расу та її здібності"
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button type="submit" form="create-race-form" disabled={!abilitiesValid}>
            {withAbilityErrors("Створити расу", abilityErrors)}
          </Button>
        </>
      }
    >
      <form id="create-race-form" onSubmit={handleSubmit} className="space-y-4">
        <RaceFormFields
          campaignId={campaignId}
          formData={formData}
          setFormData={setFormData}
          mainSkills={mainSkills}
          compact
          onAbilitiesValidityChange={(_, n) => setAbilityErrors(n)}
        />
      </form>
    </ResponsiveDialog>
  );
}
