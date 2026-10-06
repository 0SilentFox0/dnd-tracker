import { redirect } from "next/navigation";

import { requireCampaignMember } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";

export default async function PlayerCharacterEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { userId, isDM } = await requireCampaignMember(id);

  const character = isDM ? await prisma.character.findFirst({ where: { campaignId: id, controlledBy: userId, type: "player" }, select: { id: true } }) : null;

  redirect(character ? `/campaigns/${id}/dm/characters/${character.id}` : `/campaigns/${id}/character`);
}
