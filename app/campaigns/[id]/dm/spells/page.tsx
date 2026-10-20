import { DMSpellsPageClient } from "./page-client";

import { prisma } from "@/lib/db";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DMSpellsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  const spells = await prisma.spell.findMany({
    where: {
      campaignId: id,
    },
    include: {
      spellGroup: true,
    },
    orderBy: {
      level: "asc",
    },
  });

  return <DMSpellsPageClient campaignId={id} initialSpells={spells} />;
}
