import { redirect } from "next/navigation";

import { CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { requireCampaignMember } from "@/lib/server/campaigns/access";

export default async function PlayerCharacterEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { userId, isDM } = await requireCampaignMember(id);

  const character = isDM ? await prisma.character.findFirst({ where: { campaignId: id, controlledBy: userId, type: CharacterType.PLAYER }, select: { id: true } }) : null;

  redirect(character ? `/campaigns/${id}/dm/characters/${character.id}` : `/campaigns/${id}/character`);
}
