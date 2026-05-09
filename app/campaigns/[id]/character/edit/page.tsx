import { redirect } from "next/navigation";

import { PlayerCharacterEditClient } from "./edit-client";

import { requireCampaignMember } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";

export default async function PlayerCharacterEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { authUser: user, isDM } = await requireCampaignMember(id);

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
