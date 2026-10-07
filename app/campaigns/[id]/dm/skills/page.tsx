import { DMSkillsPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";
import { withAbilitySummary } from "@/lib/utils/abilities/summary";

export default async function DMSkillsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  const skills = await prisma.skill.findMany({
    where: {
      campaignId: id,
    },
    include: {
      spell: true,
      spellGroup: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const transformedSkills = skills.map((row) => withAbilitySummary("skill", row)).map((skill) => ({
    ...skill,
    spellEnhancementTypes: Array.isArray(skill.spellEnhancementTypes)
      ? (skill.spellEnhancementTypes as string[])
      : undefined,
    spellTargetChange:
      skill.spellTargetChange &&
      typeof skill.spellTargetChange === "object" &&
      skill.spellTargetChange !== null &&
      !Array.isArray(skill.spellTargetChange) &&
      "target" in skill.spellTargetChange
        ? (skill.spellTargetChange as { target: string })
        : null,
    spellAdditionalModifier:
      skill.spellAdditionalModifier &&
      typeof skill.spellAdditionalModifier === "object" &&
      skill.spellAdditionalModifier !== null &&
      !Array.isArray(skill.spellAdditionalModifier)
        ? (skill.spellAdditionalModifier as {
            modifier?: string;
            damageDice?: string;
            duration?: number;
          })
        : null,
  }));

  return (
    <DMSkillsPageClient
      campaignId={id}
      initialSkills={transformedSkills}
    />
  );
}
