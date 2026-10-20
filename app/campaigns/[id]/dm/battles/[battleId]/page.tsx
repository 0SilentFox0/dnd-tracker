import { BattleSetupForm } from "@/components/battle/setup/BattleSetupForm";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function EditBattlePage({ params }: { params: Promise<{ id: string; battleId: string }> }) {
  const { id, battleId } = await params;

  await requireCampaignDM(id);

  return <BattleSetupForm campaignId={id} battleId={battleId} />;
}
