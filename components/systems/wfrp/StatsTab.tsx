"use client";

import { useTranslations } from "next-intl";

import type { StatsTabProps } from "../types";
import { CorruptionBlock } from "./corruption/CorruptionBlock";
import { CharacteristicsGrid } from "./CharacteristicsGrid";
import { SkillsList } from "./SkillsList";

import { useProfile } from "@/components/character-profile/ProfileContext";
import { HudSection } from "@/components/hud/form";

export function StatsTab({ section, onRoll, canRoll }: StatsTabProps) {
  const { sheet } = useProfile();

  const t = useTranslations("characterProfile.wfrp");

  if (!sheet.wfrp) return null;

  return section === "top" ? (
    <>
      <HudSection title={t("characteristics")}>
        <CharacteristicsGrid block={sheet.wfrp} onRoll={onRoll} canRoll={canRoll} />
      </HudSection>
      <CorruptionBlock />
    </>
  ) : (
    <HudSection title={t("skills")}>
      <SkillsList block={sheet.wfrp} onRoll={onRoll} canRoll={canRoll} />
    </HudSection>
  );
}
