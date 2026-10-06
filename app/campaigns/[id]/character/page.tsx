import { Suspense } from "react";

import { CharacterProfile } from "@/components/character-profile";
import { EmptyState, LoadingState } from "@/components/common/states";
import { requireCampaignMember } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { userId, isDM } = await requireCampaignMember(id);

  const character = await prisma.character.findFirst({
    where: { campaignId: id, controlledBy: userId, type: "player" },
    select: { id: true },
  });

  if (!character) {
    return (
      <div className="container mx-auto p-4">
        <EmptyState title="У вас поки немає персонажа в цій кампанії" />
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingState rows={6} />}>
      <CharacterProfile campaignId={id} characterId={character.id} canEdit={isDM} />
    </Suspense>
  );
}
