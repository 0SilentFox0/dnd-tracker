"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { RaceFormFields } from "./RaceFormFields";

import { withAbilityErrors } from "@/components/abilities";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { DEFAULT_SPELL_SLOT_PROGRESSION } from "@/lib/constants/spells";
import { useTranslator } from "@/lib/i18n/use-translator";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { RaceFormData } from "@/types/races";

interface CreateRaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onCreateRace: (data: RaceFormData, onSuccess: () => void) => void;
  status?: { isPending: boolean; error: unknown };
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
  status,
}: CreateRaceDialogProps) {
  const t = useTranslations("races");

  const ta = useTranslator("abilities");

  const tc = useTranslations("common");

  const [formData, setFormData] = useState<RaceFormData>(EMPTY_FORM);

  const [abilityErrors, setAbilityErrors] = useState(0);

  const abilitiesValid = abilityErrors === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!abilitiesValid) return;

    onCreateRace(formData, () => setFormData(EMPTY_FORM));
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("create.title")}
      description={t("create.description")}
      size="lg"
      hud
      footer={
        <>
          {status?.error != null && (
            <p role="alert" className="w-full text-sm text-destructive">
              {errorMessage(status.error, t("create.error"))}
            </p>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("actions.cancel")}
          </Button>
          <Button type="submit" form="create-race-form" disabled={!abilitiesValid || status?.isPending}>
            {status?.isPending ? tc("actions.creating") : withAbilityErrors(t("create.submit"), abilityErrors, ta)}
          </Button>
        </>
      }
    >
      <form id="create-race-form" onSubmit={handleSubmit} className="space-y-4">
        <RaceFormFields
          campaignId={campaignId}
          form={{ data: formData, set: setFormData }}
          compact
          onAbilitiesValidityChange={(_, n) => setAbilityErrors(n)}
        />
      </form>
    </ResponsiveDialog>
  );
}
