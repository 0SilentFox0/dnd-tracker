import { DMCharactersClient } from "./page-client";

import { CharacterType } from "@/lib/constants/characters";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DMCharactersPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> }) {
  const { id } = await params;

  const { type } = await searchParams;

  const { campaign } = await requireCampaignDM(id);

  return <DMCharactersClient campaignId={id} maxLevel={campaign.maxLevel} type={type === CharacterType.PLAYER || type === CharacterType.NPC_HERO ? type : undefined} />;
}
