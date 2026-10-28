import { readCharacterSheet } from "@/app/api/campaigns/[id]/characters/[characterId]/sheet/read-sheet";
import { CharacterProfile } from "@/components/character-profile";
import { EmptyState } from "@/components/common/states";
import { HudPage } from "@/components/hud/page";
import { CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { characterKeys } from "@/lib/hooks/characters/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { requireCampaignMember } from "@/lib/server/campaigns/access";
import { readOkJson } from "@/lib/utils/api/read-json";
import { parseRules } from "@/lib/utils/rules/schema";
import type { CharacterSheet } from "@/types/characters";

export default async function CharacterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);

  const { userId, isDM, campaign } = await requireCampaignMember(id);

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

  const sheet = await readOkJson<CharacterSheet>(await readCharacterSheet({ id, characterId: character.id, known: { userId, isDM, maxLevel: campaign.maxLevel, rules: parseRules(campaign.rules) } }));

  return (
    <PrefetchedQuery queryKey={characterKeys.sheet(id, character.id)} data={sheet}>
      <CharacterProfile campaignId={id} characterId={character.id} canEdit={isDM} initialTab={tab} />
    </PrefetchedQuery>
  );
}
