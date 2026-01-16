import { getAuthUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SkillCreateForm } from "@/components/skills/SkillCreateForm";

export default async function EditSkillPage({
  params,
}: {
  params: Promise<{ id: string; skillId: string }>;
}) {
  const { id, skillId } = await params;
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

  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
  });

  if (!skill || skill.campaignId !== id) {
    notFound();
  }

  const spells = await prisma.spell.findMany({
    where: { campaignId: id },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  const spellGroups = await prisma.spellGroup.findMany({
    where: { campaignId: id },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <SkillCreateForm
        campaignId={id}
        spells={spells}
        spellGroups={spellGroups}
        initialData={skill}
      />
    </div>
  );
}
