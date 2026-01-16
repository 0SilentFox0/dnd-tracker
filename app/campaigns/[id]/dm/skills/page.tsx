import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DMSkillsPageClient } from "./page-client";

export default async function DMSkillsPage({
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

  // Перетворюємо дані з Prisma у правильний тип Skill
  const transformedSkills = skills.map((skill) => ({
    ...skill,
    races: Array.isArray(skill.races) ? (skill.races as string[]) : [],
    bonuses: typeof skill.bonuses === "object" && skill.bonuses !== null
      ? (skill.bonuses as Record<string, number>)
      : {},
  }));

  return <DMSkillsPageClient campaignId={id} initialSkills={transformedSkills} />;
}
