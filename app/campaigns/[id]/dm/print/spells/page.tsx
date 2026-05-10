import { PrintSpellsPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";

export default async function PrintSpellsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { campaign } = await requireCampaignDM(id);

  const [spells, spellGroups] = await Promise.all([
    prisma.spell.findMany({
      where: { campaignId: id },
      include: { spellGroup: true },
      orderBy: [{ level: "asc" }, { name: "asc" }],
    }),
    prisma.spellGroup.findMany({
      where: { campaignId: id },
      orderBy: { name: "asc" },
    }),
  ]);

  const spellsForClient = spells.map((s) => ({
    ...s,
    effects: Array.isArray(s.effects) ? (s.effects as string[]) : null,
    damageDistribution: Array.isArray(s.damageDistribution)
      ? (s.damageDistribution as number[]).filter(
          (n): n is number => typeof n === "number",
        )
      : null,
  }));

  return (
    <PrintSpellsPageClient
      campaignId={id}
      campaignName={campaign.name}
      initialSpells={spellsForClient}
      spellGroups={spellGroups.map((g) => ({ id: g.id, name: g.name }))}
    />
  );
}
