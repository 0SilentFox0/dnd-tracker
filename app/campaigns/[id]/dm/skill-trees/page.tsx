import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SkillTreePageClient } from "./page-client";
import { createMockSkillTree } from "@/lib/utils/skill-tree-mock";

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

  // Якщо немає дерев, створюємо моки для демонстрації
  const mockSkillTrees = [
    createMockSkillTree(id, "human"),
    createMockSkillTree(id, "elf"),
    createMockSkillTree(id, "dark_elf"),
    createMockSkillTree(id, "wizard"),
  ];

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
    />
  );
}
