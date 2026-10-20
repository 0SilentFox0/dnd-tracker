import { NewCharacterForm } from "@/components/characters/NewCharacterForm";
import { CharacterType, type CharacterTypeValue } from "@/lib/constants/characters";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function NewCharacterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> }) {
  const { id } = await params;

  const { type } = await searchParams;

  await requireCampaignDM(id);

  const characterType: CharacterTypeValue = type === CharacterType.NPC_HERO ? CharacterType.NPC_HERO : CharacterType.PLAYER;

  return <NewCharacterForm campaignId={id} characterType={characterType} />;
}
