import { BattleSetupForm } from "@/components/battle/setup/BattleSetupForm";

export default async function EditBattlePage({ params }: { params: Promise<{ id: string; battleId: string }> }) {
  const { id, battleId } = await params;

  return <BattleSetupForm campaignId={id} battleId={battleId} />;
}
