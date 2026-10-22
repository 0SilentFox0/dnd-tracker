"use client";

import { RaceFormFields } from "./RaceFormFields";

import { withAbilityErrors } from "@/components/abilities";
import { HudForm, HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useRaceForm } from "@/lib/hooks/races";
import { errorMessage } from "@/lib/utils/common/error-message";
import { getInitialRaceFormData } from "@/lib/utils/races/race-form";
import type { Race } from "@/types/races";

interface RaceEditFormProps {
  campaignId: string;
  race: Race;
}

export function RaceEditForm({ campaignId, race }: RaceEditFormProps) {
  const editor = useRaceForm(campaignId, race.id, getInitialRaceFormData(race));

  return (
    <HudFormPage title="Редагувати расу" aside="Оновіть інформацію про расу">
      <HudForm
        id="race-form"
        onSubmit={editor.actions.submit}
        actions={
          <>
            <Button type="button" variant="outline" onClick={editor.actions.cancel}>
              Скасувати
            </Button>
            {editor.status.error != null && (
              <p role="alert" className="w-full text-sm text-destructive">
                {errorMessage(editor.status.error, "Не вдалося зберегти расу")}
              </p>
            )}
            <Button type="submit" disabled={editor.status.isSaving || !editor.abilities.valid}>
              {editor.status.isSaving ? "Збереження..." : withAbilityErrors("Зберегти", editor.abilities.errors)}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <RaceFormFields
            campaignId={campaignId}
            form={editor.form}
            abilityIssues={race.abilityIssues}
            onAbilitiesValidityChange={editor.abilities.onValidityChange}
          />
        </div>
      </HudForm>
    </HudFormPage>
  );
}
