"use client";

import { use } from "react";

import { BattleSetupForm } from "@/components/battle/setup/BattleSetupForm";

export default function NewBattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return <BattleSetupForm campaignId={id} />;
}
