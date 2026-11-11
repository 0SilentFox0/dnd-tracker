"use client";

import { useTranslations } from "next-intl";

import { CharacteristicsEditor } from "./CharacteristicsEditor";
import { SkillAdvancesEditor } from "./SkillAdvancesEditor";

import { HudSection } from "@/components/hud/form";
import type { StatsFieldsProps } from "@/components/systems/types";

export function StatsFields({ bindings: { characteristics } }: StatsFieldsProps) {
  const t = useTranslations("characters.wfrp");

  return (
    <>
      <HudSection title={t("characteristics")}>
        <CharacteristicsEditor binding={characteristics} />
      </HudSection>
      <HudSection title={t("skills")}>
        <SkillAdvancesEditor binding={characteristics} />
      </HudSection>
    </>
  );
}
