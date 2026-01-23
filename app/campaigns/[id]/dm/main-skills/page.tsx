import { redirect } from "next/navigation";

import { DMMainSkillsPageClient } from "./page-client";

import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DMMainSkillsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getAuthUser();

  const userId = user.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!campaign || campaign.members[0]?.role !== "dm") {
    redirect(`/campaigns/${id}`);
  }

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
