import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

import { PlayerCharacterEditClient } from "./edit-client";

export default async function PlayerCharacterEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getAuthUser();

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: { where: { userId: user.id } },
    },
  });

  if (!campaign || campaign.members.length === 0) {
    redirect("/campaigns");
  }

  const isDM = campaign.members[0]?.role === "dm";
  if (!isDM) {
    redirect(`/campaigns/${id}/character`);
  }

  const character = await prisma.character.findFirst({
    where: {
      campaignId: id,
      controlledBy: user.id,
      type: "player",
    },
  });

  if (!character) {
    redirect(`/campaigns/${id}/character`);
  }

  return (
    <PlayerCharacterEditClient
      campaignId={id}
      characterId={character.id}
    />
  );
}
