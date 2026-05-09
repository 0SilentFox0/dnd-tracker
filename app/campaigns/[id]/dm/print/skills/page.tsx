import { PrintSkillsPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";
import type { SkillTriggers } from "@/types/skill-triggers";

export default async function PrintSkillsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { campaign } = await requireCampaignDM(id);

  const [skills, mainSkillsRaw, skillTrees] = await Promise.all([
    prisma.skill.findMany({
      where: { campaignId: id },
      include: {
        spell: true,
        spellGroup: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.mainSkill.findMany({
      where: { campaignId: id },
      include: { spellGroup: true },
      orderBy: { name: "asc" },
    }),
    prisma.skillTree.findMany({
      where: { campaignId: id },
      select: { skills: true },
    }),
  ]);

  const transformedSkills = skills.map((skill) => ({
    ...skill,
    bonuses:
      typeof skill.bonuses === "object" && skill.bonuses !== null
        ? (skill.bonuses as Record<string, number>)
        : {},
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
    skillTriggers: Array.isArray(skill.skillTriggers)
      ? (skill.skillTriggers as unknown as SkillTriggers)
      : undefined,
  }));

  const mainSkills = mainSkillsRaw.map((ms) => ({
    id: ms.id,
    campaignId: ms.campaignId,
    name: ms.name,
    color: ms.color,
    icon: ms.icon,
    isEnableInSkillTree: ms.isEnableInSkillTree,
    spellGroupId: ms.spellGroupId,
    spellGroupName: ms.spellGroup?.name ?? null,
    createdAt: ms.createdAt.toISOString(),
    updatedAt: ms.updatedAt.toISOString(),
  }));

  return (
    <PrintSkillsPageClient
      campaignId={id}
      campaignName={campaign.name}
      initialSkills={transformedSkills}
      mainSkills={mainSkills}
      skillTrees={skillTrees}
    />
  );
}
