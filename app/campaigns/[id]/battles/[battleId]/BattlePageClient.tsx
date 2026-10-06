"use client";

import { useEffect } from "react";

import "@/components/hud/hud.css";
import "@/components/battle/hud/battle-hud.css";
import { BattleSceneProvider } from "@/components/battle/scene/BattleSceneProvider";
import { BattleScreen } from "@/components/battle/scene/BattleScreen";
import { ErrorState, LoadingState } from "@/components/common/states";
import { useBattleSceneValue } from "@/lib/hooks/battle";

export function BattlePageClient({ campaignId, battleId, userId }: { campaignId: string; battleId: string; userId: string | null }) {
  const { value, loading } = useBattleSceneValue(campaignId, battleId, userId);

  const myTurn = value?.isMyTurn ?? false;

  const name = value?.battle.name;

  useEffect(() => {
    if (!myTurn && name) document.title = name;
  }, [myTurn, name]);

  if (!value) {
    return (
      <div className="battle-hud flex min-h-[70dvh] items-center justify-center px-4">
        {loading ? <LoadingState label="Завантаження бою…" className="w-full max-w-md" /> : <ErrorState error="Бій не знайдено" className="w-full max-w-md" />}
      </div>
    );
  }

  return (
    <BattleSceneProvider value={value}>
      <BattleScreen />
    </BattleSceneProvider>
  );
}
