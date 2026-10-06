import { notFound } from "next/navigation";

import { MainSkillEditForm } from "@/components/main-skills/MainSkillEditForm";
import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";

export default async function EditMainSkillPage({
  params,
}: {
  params: Promise<{ id: string; mainSkillId: string }>;
}) {
  const { id, mainSkillId } = await params;

  await requireCampaignDM(id);

  const mainSkill = await prisma.mainSkill.findUnique({
    where: { id: mainSkillId },
  });

  if (!mainSkill || mainSkill.campaignId !== id) {
    notFound();
  }

  return (
    <MainSkillEditForm
      campaignId={id}
      mainSkill={{
        ...mainSkill,
        createdAt: mainSkill.createdAt.toISOString(),
        updatedAt: mainSkill.updatedAt.toISOString(),
      }}
    />
  );
}
