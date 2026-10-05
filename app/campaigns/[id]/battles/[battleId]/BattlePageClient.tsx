"use client";

import LegacyBattlePage from "./LegacyBattlePage";

export function BattlePageClient({ campaignId, battleId }: { campaignId: string; battleId: string; userId: string | null }) {
  return <LegacyBattlePage id={campaignId} battleId={battleId} />;
}
