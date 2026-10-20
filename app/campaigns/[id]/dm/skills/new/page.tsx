import { SkillCreateForm } from "@/components/skills/form/SkillCreateForm";
import { prisma } from "@/lib/db";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function NewSkillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  const spells = await prisma.spell.findMany({
    where: { campaignId: id },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  return <SkillCreateForm campaignId={id} spells={spells} />;
}
