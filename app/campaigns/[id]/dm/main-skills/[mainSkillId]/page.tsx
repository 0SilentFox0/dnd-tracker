import { notFound,redirect } from "next/navigation";

import { MainSkillEditForm } from "@/components/main-skills/MainSkillEditForm";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function EditMainSkillPage({
  params,
}: {
  params: Promise<{ id: string; mainSkillId: string }>;
}) {
  const { id, mainSkillId } = await params;

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

  const mainSkill = await prisma.mainSkill.findUnique({
    where: { id: mainSkillId },
  });

  if (!mainSkill || mainSkill.campaignId !== id) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <MainSkillEditForm 
        campaignId={id} 
        mainSkill={{
          ...mainSkill,
          createdAt: mainSkill.createdAt.toISOString(),
          updatedAt: mainSkill.updatedAt.toISOString(),
        }} 
      />
    </div>
  );
}
