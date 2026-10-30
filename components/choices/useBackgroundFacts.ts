import { useTranslations } from "next-intl";

import type { DndSkill } from "@/lib/constants/skills";

interface BackgroundFacts {
  skills: readonly DndSkill[];
  tools: readonly string[];
  originFeatName?: string | null;
  equipmentText?: string | null;
}

export function useBackgroundFacts() {
  const t = useTranslations("choices.wizard.background");

  const tg = useTranslations("gameTerms");

  return ({ skills, tools, originFeatName, equipmentText }: BackgroundFacts): string[] =>
    [
      skills.length > 0 && `${t("skills")}: ${skills.map((s) => tg(`dndSkills.${s}`)).join(", ")}`,
      tools.length > 0 && `${t("tools")}: ${tools.join(", ")}`,
      originFeatName && `${t("originFeat")}: ${originFeatName}`,
      equipmentText && `${t("equipment")}: ${equipmentText}`,
    ].filter((line): line is string => !!line);
}
