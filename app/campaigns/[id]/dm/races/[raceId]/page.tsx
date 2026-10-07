import { redirect } from "next/navigation";

import { RaceEditForm } from "@/components/races/RaceEditForm";
import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";
import { readAbilities } from "@/lib/utils/abilities/read";
import type { Race } from "@/types/races";

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

  const race: Race = {
    ...raceData,
    abilities,
    abilityIssues,
    availableSkills: Array.isArray(raceData.availableSkills)
      ? (raceData.availableSkills as string[])
      : [],
    disabledSkills: Array.isArray(raceData.disabledSkills)
      ? (raceData.disabledSkills as string[])
      : [],
    passiveAbility: raceData.passiveAbility
      ? typeof raceData.passiveAbility === "object" &&
        raceData.passiveAbility !== null &&
        !Array.isArray(raceData.passiveAbility)
        ? (raceData.passiveAbility as unknown as Race["passiveAbility"])
        : null
      : null,
    spellSlotProgression: Array.isArray(raceData.spellSlotProgression)
      ? (raceData.spellSlotProgression as unknown as Race["spellSlotProgression"])
      : undefined,
    createdAt: raceData.createdAt,
    updatedAt: raceData.updatedAt,
  };

  return <RaceEditForm campaignId={id} race={race} />;
}
