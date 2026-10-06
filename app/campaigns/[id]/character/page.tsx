import { CharacterProfile } from "@/components/character-profile";
import { EmptyState } from "@/components/common/states";
import { HudPage } from "@/components/hud/page";
import { requireCampaignMember } from "@/lib/campaigns/access";
import { CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";

export default async function CharacterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);

  const { userId, isDM } = await requireCampaignMember(id);

  const character = await prisma.character.findFirst({
    where: { campaignId: id, controlledBy: userId, type: CharacterType.PLAYER },
    select: { id: true },
  });

  if (!character) {
    return (
      <HudPage>
        <EmptyState title="У вас поки немає персонажа в цій кампанії" />
      </HudPage>
    );
  }

  return <CharacterProfile campaignId={id} characterId={character.id} canEdit={isDM} initialTab={tab} />;
}
