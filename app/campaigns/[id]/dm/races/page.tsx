import { DMRacesPageClient } from "./page-client";

import { prisma } from "@/lib/db";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { toRace } from "@/lib/utils/races/to-race";

export default async function DMRacesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  const racesData = await prisma.race.findMany({ omit: { abilities: true },
    where: {
      campaignId: id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const races = racesData.map((race) => toRace(race));

  return <DMRacesPageClient campaignId={id} initialRaces={races} />;
}
