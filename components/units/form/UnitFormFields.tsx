"use client";

import { UnitAbilityScores } from "./UnitAbilityScores";
import { UnitAttacks } from "./UnitAttacks";
import { UnitBasicInfo } from "./UnitBasicInfo";
import { UnitImmunities } from "./UnitImmunities";
import { UnitKnownSpells } from "./UnitKnownSpells";

import { AbilityListEditor } from "@/components/abilities";
import { IconUrlField } from "@/components/common/IconUrlField";
import type { UnitFormFieldsState } from "@/lib/hooks/units";
import type { ConversionIssue } from "@/lib/utils/abilities/legacy/types";

interface UnitFormFieldsProps {
  campaignId: string;
  form: UnitFormFieldsState & { error: Error | null };
  abilityIssues?: ConversionIssue[];
}

export function UnitFormFields({ campaignId, form, abilityIssues }: UnitFormFieldsProps) {
  const { formData, change } = form;

  return (
    <>
      {form.error && (
        <div className="relative mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <strong className="font-bold">Помилка:</strong>
          <span className="block sm:inline"> {form.error.message || "Помилка"}</span>
        </div>
      )}

      <UnitBasicInfo formData={formData} races={form.races} onChange={change} />

      <UnitAbilityScores formData={formData} onChange={change} />

      <UnitAttacks formData={formData} onChange={change} />

      <IconUrlField
        id="avatar"
        label="Аватар (посилання на картинку)"
        value={formData.avatar ?? ""}
        onChange={(avatar) => change({ avatar: avatar || null })}
        fallbackText={formData.name || "?"}
      />

      <UnitImmunities formData={formData} race={form.race} onChange={change} />

      <AbilityListEditor
        campaignId={campaignId}
        value={formData.abilities ?? []}
        onChange={(abilities) => change({ abilities })}
        issues={abilityIssues}
        onValidityChange={(_, n) => form.setAbilityErrors(n)}
      />

      <UnitKnownSpells formData={formData} spells={form.spells} onChange={change} />
    </>
  );
}
