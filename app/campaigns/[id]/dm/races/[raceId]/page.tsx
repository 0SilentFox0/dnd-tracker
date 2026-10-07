import { redirect } from "next/navigation";

import { RaceEditForm } from "@/components/races/RaceEditForm";
import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";
import { readAbilities } from "@/lib/utils/abilities/read";
import { toRace } from "@/lib/utils/races/to-race";

export default async function EditRacePage({
  params,
}: {
  params: Promise<{ id: string; raceId: string }>;
}) {
  const { id, raceId } = await params;

  await requireCampaignDM(id);

  const raceData = await prisma.race.findUnique({
    where: {
      id: raceId,
      campaignId: id,
    },
  });

  if (!raceData) {
    redirect(`/campaigns/${id}/dm/races`);
  }

  const { abilities, issues: abilityIssues } = readAbilities("race", raceData);

  const race = toRace(raceData, { abilities, abilityIssues });

  return <RaceEditForm campaignId={id} race={race} />;
}
