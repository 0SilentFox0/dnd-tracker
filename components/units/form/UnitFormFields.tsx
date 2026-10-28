"use client";

import { UNIT_FORM_TAB, type UnitFormTabId } from "./unit-form-tabs";
import { UnitAttacks } from "./UnitAttacks";
import { UnitBasicInfo } from "./UnitBasicInfo";
import { UnitFiveEFields } from "./UnitFiveEFields";
import { UnitImmunities } from "./UnitImmunities";
import { UnitKnownSpells } from "./UnitKnownSpells";

import { AbilityListEditor } from "@/components/abilities";
import { AbilityScoresGrid } from "@/components/common/AbilityScoresGrid";
import { IconUrlField } from "@/components/common/IconUrlField";
import { HudSection, type HudTab } from "@/components/hud/form";
import type { UnitFormFieldsState } from "@/lib/hooks/units";
import type { ConversionIssue } from "@/lib/utils/abilities/schema";

interface UnitFormFieldsProps {
  campaignId: string;
  editor: UnitFormFieldsState;
  abilityIssues?: ConversionIssue[];
}

export function unitFormTabs({ campaignId, editor, abilityIssues }: UnitFormFieldsProps): HudTab<UnitFormTabId>[] {
  const { data: formData, change } = editor.form;

  const { races, spells, fiveE } = editor.options;

  return [
    {
      id: UNIT_FORM_TAB.basic,
      label: "Основне",
      content: (
        <div className="space-y-4">
          <UnitBasicInfo formData={formData} races={races} onChange={change} />
          {(fiveE || formData.cr != null) && (
            <HudSection title="5e">
              <UnitFiveEFields formData={formData} onChange={change} />
            </HudSection>
          )}
          <IconUrlField
            id="avatar"
            label="Аватар (посилання на картинку)"
            value={formData.avatar ?? ""}
            onChange={(avatar) => change({ avatar: avatar || null })}
            fallbackText={formData.name || "?"}
          />
          <HudSection title="Характеристики">
            <AbilityScoresGrid data={formData} set={(key, value) => change({ [key]: value })} />
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
          <UnitImmunities formData={formData} onChange={change} />
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
