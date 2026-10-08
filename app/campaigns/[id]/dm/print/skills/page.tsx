import { PrintSkillsPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";
import { withAbilitySummary } from "@/lib/utils/abilities/summary";

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
      select: { id: true, skills: true },
    }),
  ]);

  const transformedSkills = skills.map((row) => withAbilitySummary("skill", row));

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
