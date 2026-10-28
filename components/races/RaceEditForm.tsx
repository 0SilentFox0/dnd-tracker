"use client";

import { useTranslations } from "next-intl";

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
  const t = useTranslations("races");

  const tc = useTranslations("common");

  const editor = useRaceForm(campaignId, race.id, getInitialRaceFormData(race));

  return (
    <HudFormPage title={t("edit.title")} aside={t("edit.aside")}>
      <HudForm
        id="race-form"
        onSubmit={editor.actions.submit}
        actions={
          <>
            <Button type="button" variant="outline" onClick={editor.actions.cancel}>
              {tc("actions.cancel")}
            </Button>
            {editor.status.error != null && (
              <p role="alert" className="w-full text-sm text-destructive">
                {errorMessage(editor.status.error, t("edit.error"))}
              </p>
            )}
            <Button type="submit" disabled={editor.status.isSaving || !editor.abilities.valid}>
              {editor.status.isSaving ? tc("actions.saving") : withAbilityErrors(tc("actions.save"), editor.abilities.errors)}
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
