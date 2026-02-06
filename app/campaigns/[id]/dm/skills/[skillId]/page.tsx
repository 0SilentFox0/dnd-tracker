import { redirect } from "next/navigation";

import { EditSkillClient } from "./edit-skill-client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { MainSkill } from "@/types/main-skills";

export default async function EditSkillPage({
  params,
}: {
  params: Promise<{ id: string; skillId: string }>;
}) {
  const { id: campaignId, skillId } = await params;

  const user = await getAuthUser();
  const userId = user.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!campaign || campaign.members[0]?.role !== "dm") {
    redirect(`/campaigns/${campaignId}`);
  }

  const [spells, spellGroups, mainSkills] = await Promise.all([
    prisma.spell.findMany({
      where: { campaignId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.spellGroup.findMany({
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
      spellGroups={spellGroups}
      initialMainSkills={initialMainSkills}
    />
  );
}
