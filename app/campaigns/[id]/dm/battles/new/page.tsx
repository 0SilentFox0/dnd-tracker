import { BattleSetupForm } from "@/components/battle/setup/BattleSetupForm";
import { requireCampaignDM } from "@/lib/campaigns/access";

export default async function NewBattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <BattleSetupForm campaignId={id} />;
}
