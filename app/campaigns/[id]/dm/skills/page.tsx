import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DMSkillsPageClient } from "./page-client";
import type { Race } from "@/lib/types/races";

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

  // Завантажуємо раси для відображення назв
  const racesData = await prisma.race.findMany({
    where: {
      campaignId: id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Перетворюємо дані з Prisma у правильний тип Race
  const races: Race[] = racesData.map((race) => ({
    ...race,
    availableSkills: Array.isArray(race.availableSkills)
      ? (race.availableSkills as string[])
      : [],
    disabledSkills: Array.isArray(race.disabledSkills)
      ? (race.disabledSkills as string[])
      : [],
    passiveAbility: race.passiveAbility
      ? typeof race.passiveAbility === "object" &&
        race.passiveAbility !== null &&
        !Array.isArray(race.passiveAbility)
        ? (race.passiveAbility as unknown as Race["passiveAbility"])
        : null
      : null,
    spellSlotProgression: Array.isArray(race.spellSlotProgression)
      ? (race.spellSlotProgression as unknown as Race["spellSlotProgression"])
      : undefined,
    createdAt: race.createdAt,
    updatedAt: race.updatedAt,
  }));

  return (
    <DMSkillsPageClient
      campaignId={id}
      initialSkills={transformedSkills}
      initialRaces={races}
    />
  );
}
