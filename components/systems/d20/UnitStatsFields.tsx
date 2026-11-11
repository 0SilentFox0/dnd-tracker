"use client";

import { useTranslations } from "next-intl";

import type { UnitStatsFieldsProps } from "../types";

import { AbilityScoresGrid } from "@/components/common/AbilityScoresGrid";
import { HudSection } from "@/components/hud/form";
import { UnitFiveEFields } from "@/components/units/form/UnitFiveEFields";

export function UnitStatsFields({ formData, onChange, fiveE }: UnitStatsFieldsProps) {
  const t = useTranslations("units.basic");

  return (
    <>
      {(fiveE || formData.cr != null) && (
        <HudSection title="5e">
          <UnitFiveEFields formData={formData} onChange={onChange} />
        </HudSection>
      )}
      <HudSection title={t("abilityScores")}>
        <AbilityScoresGrid data={formData} set={(key, value) => onChange({ [key]: value })} />
      </HudSection>
    </>
  );
}
