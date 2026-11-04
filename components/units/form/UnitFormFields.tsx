"use client";

import { UNIT_FORM_TAB, type UnitFormTabId } from "./unit-form-tabs";
import { UnitAttacks } from "./UnitAttacks";
import { UnitBasicInfo } from "./UnitBasicInfo";
import { UnitImmunities } from "./UnitImmunities";
import { UnitKnownSpells } from "./UnitKnownSpells";
import { UnitSpellcastingFields } from "./UnitSpellcastingFields";
import { UnitStatblockFields } from "./UnitStatblockFields";

import { AbilityListEditor } from "@/components/abilities";
import { IconUrlField } from "@/components/common/IconUrlField";
import { type HudTab } from "@/components/hud/form";
import { systemUiOf } from "@/components/systems";
import type { UnitFormFieldsState } from "@/lib/hooks/units";
import type { Translator } from "@/lib/i18n/translator";
import type { ConversionIssue } from "@/lib/utils/abilities/schema";

interface UnitFormFieldsProps {
  campaignId: string;
  editor: UnitFormFieldsState;
  abilityIssues?: ConversionIssue[];
  t: Translator;
}

export function unitFormTabs({ campaignId, editor, abilityIssues, t }: UnitFormFieldsProps): HudTab<UnitFormTabId>[] {
  const { data: formData, change } = editor.form;

  const { races, spells, fiveE, system } = editor.options;

  const Ui = system && systemUiOf(system);

  return [
    {
      id: UNIT_FORM_TAB.basic,
      label: t("common.tabs.basic"),
      content: (
        <div className="space-y-4">
          <UnitBasicInfo formData={formData} races={races} onChange={change} />
          <IconUrlField
            id="avatar"
            label={t("units.basic.avatar")}
            value={formData.avatar ?? ""}
            onChange={(avatar) => change({ avatar: avatar || null })}
            fallbackText={formData.name || "?"}
          />
          {Ui && <Ui.UnitStatsFields formData={formData} onChange={change} fiveE={fiveE} />}
        </div>
      ),
    },
    {
      id: UNIT_FORM_TAB.attacks,
      label: t("units.form.tabs.attacks"),
      content: (
        <>
          <UnitAttacks formData={formData} onChange={change} />
          <UnitImmunities formData={formData} onChange={change} />
        </>
      ),
    },
    {
      id: UNIT_FORM_TAB.abilities,
      label: t("common.tabs.abilities"),
      invalid: editor.abilities.errors > 0 || (abilityIssues?.length ?? 0) > 0,
      content: (
        <AbilityListEditor
          campaignId={campaignId}
          performChoices={{ attacks: formData.attacks ?? [], spells }}
          value={formData.abilities ?? []}
          onChange={(abilities) => change({ abilities })}
          issues={abilityIssues}
          onValidityChange={editor.abilities.onValidityChange}
        />
      ),
    },
    {
      id: UNIT_FORM_TAB.magic,
      label: formData.cr != null ? t("units.form.tabs.spells") : t("units.form.tabs.magic"),
      content: formData.cr != null ? <UnitSpellcastingFields formData={formData} spells={spells} onChange={change} /> : <UnitKnownSpells formData={formData} spells={spells} onChange={change} />,
    },
    ...(formData.cr != null ? [{ id: UNIT_FORM_TAB.statblock, label: t("units.form.tabs.statblock"), content: <UnitStatblockFields formData={formData} onChange={change} /> }] : []),
  ];
}
