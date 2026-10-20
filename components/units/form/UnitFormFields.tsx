"use client";

import { UNIT_FORM_TAB, type UnitFormTabId } from "./unit-form-tabs";
import { UnitAbilityScores } from "./UnitAbilityScores";
import { UnitAttacks } from "./UnitAttacks";
import { UnitBasicInfo } from "./UnitBasicInfo";
import { UnitImmunities } from "./UnitImmunities";
import { UnitKnownSpells } from "./UnitKnownSpells";

import { AbilityListEditor } from "@/components/abilities";
import { IconUrlField } from "@/components/common/IconUrlField";
import { HudSection, type HudTab } from "@/components/hud/form";
import type { UnitFormFieldsState } from "@/lib/hooks/units";
import type { ConversionIssue } from "@/lib/utils/abilities/schema";

interface UnitFormFieldsProps {
  campaignId: string;
  editor: UnitFormFieldsState;
  abilityIssues?: ConversionIssue[];
}

export function UnitFormError({ error }: { error: Error | null }) {
  if (!error) return null;

  return (
    <p role="alert" className="mx-4 mt-3 rounded-md border border-hud-danger/50 bg-hud-danger/10 px-3 py-2 text-sm text-[#f0b4a6]">
      <strong>Помилка:</strong> {error.message || "Помилка"}
    </p>
  );
}

export function unitFormTabs({ campaignId, editor, abilityIssues }: UnitFormFieldsProps): HudTab<UnitFormTabId>[] {
  const { data: formData, change } = editor.form;

  const { races, race, spells } = editor.options;

  return [
    {
      id: UNIT_FORM_TAB.basic,
      label: "Основне",
      content: (
        <div className="space-y-4">
          <UnitBasicInfo formData={formData} races={races} onChange={change} />
          <IconUrlField
            id="avatar"
            label="Аватар (посилання на картинку)"
            value={formData.avatar ?? ""}
            onChange={(avatar) => change({ avatar: avatar || null })}
            fallbackText={formData.name || "?"}
          />
          <HudSection title="Характеристики">
            <UnitAbilityScores formData={formData} onChange={change} />
          </HudSection>
        </div>
      ),
    },
    {
      id: UNIT_FORM_TAB.attacks,
      label: "Атаки",
      content: (
        <>
          <UnitAttacks formData={formData} onChange={change} />
          <UnitImmunities formData={formData} race={race} onChange={change} />
        </>
      ),
    },
    {
      id: UNIT_FORM_TAB.abilities,
      label: "Вміння",
      invalid: editor.abilities.errors > 0 || (abilityIssues?.length ?? 0) > 0,
      content: (
        <AbilityListEditor
          campaignId={campaignId}
          value={formData.abilities ?? []}
          onChange={(abilities) => change({ abilities })}
          issues={abilityIssues}
          onValidityChange={editor.abilities.onValidityChange}
        />
      ),
    },
    {
      id: UNIT_FORM_TAB.magic,
      label: "Магія",
      content: <UnitKnownSpells formData={formData} spells={spells} onChange={change} />,
    },
  ];
}
