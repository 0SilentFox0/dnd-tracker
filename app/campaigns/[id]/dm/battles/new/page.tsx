import { BattleSetupForm } from "@/components/battle/setup/BattleSetupForm";

export default async function NewBattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <BattleSetupForm campaignId={id} />;
}
