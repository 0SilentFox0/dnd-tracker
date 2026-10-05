"use client";

import { useState } from "react";

import { RaceFormFields } from "./RaceFormFields";

import { withAbilityErrors } from "@/components/abilities";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  availableSkills: [],
  disabledSkills: [],
  passiveAbility: {
    description: "",
    statImprovements: "",
    statModifiers: {},
  },
  spellSlotProgression: [
    { level: 1, slots: 0 },
    { level: 2, slots: 0 },
    { level: 3, slots: 0 },
    { level: 4, slots: 0 },
    { level: 5, slots: 0 },
  ],
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Створити расу</DialogTitle>
          <DialogDescription>
            Заповніть інформацію про расу та її здібності
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <RaceFormFields
            campaignId={campaignId}
            formData={formData}
            setFormData={setFormData}
            mainSkills={mainSkills}
            compact
            onAbilitiesValidityChange={(_, n) => setAbilityErrors(n)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={!abilitiesValid}>
              {withAbilityErrors("Створити расу", abilityErrors)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
