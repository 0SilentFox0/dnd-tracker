"use client";

import { useTranslations } from "next-intl";

import type { UnitStatsFieldsProps } from "../types";
import { CharacteristicsEditor } from "./CharacteristicsEditor";

import { HudSection } from "@/components/hud/form";
import { type Characteristics, DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";

export function UnitStatsFields({ formData, onChange }: UnitStatsFieldsProps) {
  const t = useTranslations("characters.wfrp");

  const data = formData.characteristics ?? DEFAULT_CHARACTERISTICS;

  const set = <K extends keyof Characteristics>(key: K, value: Characteristics[K]) => onChange({ characteristics: { ...data, [key]: value } });

  return (
    <HudSection title={t("characteristics")}>
      <CharacteristicsEditor binding={{ data, set }} />
    </HudSection>
  );
}
