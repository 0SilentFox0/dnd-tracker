import { redirect } from "next/navigation";

import { DMSkillsPageClient } from "./page-client";

import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SkillTriggers } from "@/types/skill-triggers";

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
    bonuses: typeof skill.bonuses === "object" && skill.bonuses !== null
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

  return (
    <DMSkillsPageClient
      campaignId={id}
      initialSkills={transformedSkills}
    />
  );
}
