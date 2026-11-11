"use client";

import { useTranslations } from "next-intl";

import { CharacteristicsEditor } from "./CharacteristicsEditor";

import { HudSection } from "@/components/hud/form";
import type { UnitStatsFieldsProps } from "@/components/systems/types";
import { type Characteristics, readCharacteristics } from "@/systems/wfrp/rules/characteristics/keys";

export function UnitStatsFields({ formData, onChange }: UnitStatsFieldsProps) {
  const t = useTranslations("characters.wfrp");

  const data = readCharacteristics({ characteristics: formData.characteristics });

  const set = <K extends keyof Characteristics>(key: K, value: Characteristics[K]) => onChange({ characteristics: { ...data, [key]: value } });

  return (
    <HudSection title={t("characteristics")}>
      <CharacteristicsEditor binding={{ data, set }} />
    </HudSection>
  );
}
