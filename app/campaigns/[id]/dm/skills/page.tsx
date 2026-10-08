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

  const transformedSkills = skills.map((row) => withAbilitySummary("skill", row));

  return (
    <DMSkillsPageClient
      campaignId={id}
      initialSkills={transformedSkills}
    />
  );
}
