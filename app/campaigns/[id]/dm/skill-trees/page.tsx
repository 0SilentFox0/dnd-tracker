import { redirect } from "next/navigation";

import { SkillTreePageClient } from "./page-client";

import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createMockSkillTree } from "@/lib/utils/skill-tree-mock";
import type { Race } from "@/types/races";

export default async function SkillTreesPage({
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

  // Отримуємо існуючі дерева прокачки
  const skillTreesData = await prisma.skillTree.findMany({
    where: { campaignId: id },
  });

  // Отримуємо раси з кампанії
  const racesData = await prisma.race.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "desc" },
  });

  // Конвертуємо Prisma дані в формат Race
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

  // Отримуємо основні навики з кампанії
  const mainSkillsData = await prisma.mainSkill.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
  });

  // Якщо немає дерев, створюємо моки для демонстрації
  // Конвертуємо mainSkills з Prisma Date в string
  const mainSkillsForMock = mainSkillsData.map((skill) => ({
    ...skill,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  }));

  const mockSkillTrees =
    races.length > 0
      ? races.map((race) => createMockSkillTree(id, race.name, mainSkillsForMock))
      : [];

  // Використовуємо моки якщо немає даних в БД
  const skillTrees =
    skillTreesData.length > 0
      ? skillTreesData.map((st) => ({
          id: st.id,
          campaignId: st.campaignId,
          race: st.race,
          skills: st.skills,
          createdAt: st.createdAt,
        }))
      : mockSkillTrees;

  return (
    <SkillTreePageClient
      campaignId={id}
      skillTrees={skillTrees}
      races={races}
    />
  );
}
