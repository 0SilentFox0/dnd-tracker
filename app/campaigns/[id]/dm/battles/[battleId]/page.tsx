"use client";

import { use } from "react";

import { BattleSetupForm } from "@/components/battle/setup/BattleSetupForm";

export default function EditBattlePage({ params }: { params: Promise<{ id: string; battleId: string }> }) {
  const { id, battleId } = use(params);

  return <BattleSetupForm campaignId={id} battleId={battleId} />;
}
