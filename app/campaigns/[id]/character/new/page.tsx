import { redirect } from "next/navigation";

import { PlayerDraftForm } from "@/components/characters/player-draft/PlayerDraftForm";
import { CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { requireCampaignMember } from "@/lib/server/campaigns/access";

export default async function NewPlayerCharacterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ generate?: string }> }) {
  const [{ id }, { generate }] = await Promise.all([params, searchParams]);

  const { userId, isDM } = await requireCampaignMember(id);

  if (isDM) redirect(`/campaigns/${id}/dm/characters/new?type=player`);

  const existing = await prisma.character.findFirst({
    where: { campaignId: id, controlledBy: userId, type: CharacterType.PLAYER },
    select: { id: true },
  });

  if (existing) redirect(`/campaigns/${id}/character`);

  return <PlayerDraftForm campaignId={id} initial={generate === "1" ? "generate" : undefined} />;
}
