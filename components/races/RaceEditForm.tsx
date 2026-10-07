"use client";

import { getInitialRaceFormData } from "./RaceEditFormUtils";
import { RaceFormFields } from "./RaceFormFields";

import { withAbilityErrors } from "@/components/abilities";
import { HudForm, HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useRaceForm } from "@/lib/hooks/races";
import type { Race } from "@/types/races";

interface RaceEditFormProps {
  campaignId: string;
  race: Race;
}

export function RaceEditForm({ campaignId, race }: RaceEditFormProps) {
  const form = useRaceForm(campaignId, race.id, getInitialRaceFormData(race));

  return (
    <HudFormPage title="Редагувати расу" aside="Оновіть інформацію про расу">
      <HudForm
        id="race-form"
        onSubmit={form.submit}
        actions={
          <>
            <Button type="button" variant="outline" onClick={form.cancel}>
              Скасувати
            </Button>
            <Button type="submit" disabled={form.isSaving || !form.abilitiesValid}>
              {form.isSaving ? "Збереження..." : withAbilityErrors("Зберегти", form.abilityErrors)}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <RaceFormFields
            campaignId={campaignId}
            formData={form.formData}
            setFormData={form.setFormData}
            mainSkills={form.mainSkills}
            abilityIssues={race.abilityIssues}
            onAbilitiesValidityChange={(_, n) => form.setAbilityErrors(n)}
          />
        </div>
      </HudForm>
    </HudFormPage>
  );
}
