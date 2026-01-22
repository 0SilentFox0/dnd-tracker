import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Race } from "@/types/races";
import { RaceEditForm } from "@/components/races/RaceEditForm";

export default async function EditRacePage({
  params,
}: {
  params: Promise<{ id: string; raceId: string }>;
}) {
  const { id, raceId } = await params;
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

  const raceData = await prisma.race.findUnique({
    where: {
      id: raceId,
      campaignId: id,
    },
  });

  if (!raceData) {
    redirect(`/campaigns/${id}/dm/races`);
  }

  // Конвертуємо Prisma дані в формат Race
  const race: Race = {
    ...raceData,
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

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <RaceEditForm campaignId={id} race={race} />
    </div>
  );
}
