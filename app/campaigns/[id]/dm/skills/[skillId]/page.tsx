import { EditSkillClient } from "./edit-skill-client";

import { prisma } from "@/lib/db";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import type { MainSkill } from "@/types/main-skills";

export default async function EditSkillPage({
  params,
}: {
  params: Promise<{ id: string; skillId: string }>;
}) {
  const { id: campaignId, skillId } = await params;

  await requireCampaignDM(campaignId);

  const [spells, mainSkills] = await Promise.all([
    prisma.spell.findMany({
      where: { campaignId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mainSkill.findMany({
      where: { campaignId },
      orderBy: { name: "asc" },
    }),
  ]);

  const initialMainSkills: MainSkill[] = mainSkills.map((ms) => ({
    id: ms.id,
    campaignId: ms.campaignId,
    name: ms.name,
    color: ms.color,
    icon: ms.icon ?? null,
    createdAt: ms.createdAt.toISOString(),
    updatedAt: ms.updatedAt.toISOString(),
  }));

  return (
    <EditSkillClient
      campaignId={campaignId}
      skillId={skillId}
      spells={spells}
      initialMainSkills={initialMainSkills}
    />
  );
}
