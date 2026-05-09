import { DMSpellsPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";

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

  const spellsForClient = spells.map((s) => ({
    ...s,
    effects: Array.isArray(s.effects) ? (s.effects as string[]) : null,
  }));

  return (
    <DMSpellsPageClient campaignId={id} initialSpells={spellsForClient} />
  );
}
