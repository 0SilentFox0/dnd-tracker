import { DMMainSkillsPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";

export default async function DMMainSkillsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  const mainSkills = await prisma.mainSkill.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <DMMainSkillsPageClient 
      campaignId={id} 
      initialMainSkills={mainSkills.map(skill => ({
        ...skill,
        createdAt: skill.createdAt.toISOString(),
        updatedAt: skill.updatedAt.toISOString(),
      }))} 
    />
  );
}
