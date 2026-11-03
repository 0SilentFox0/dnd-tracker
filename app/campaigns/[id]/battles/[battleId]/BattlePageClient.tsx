"use client";

import { useTranslations } from "next-intl";

import "@/components/hud/hud.css";
import "@/components/battle/hud/battle-hud.css";
import { DemoBattleSandbox } from "@/components/battle/demo/DemoBattleSandbox";
import { BattleSceneProvider } from "@/components/battle/scene/BattleSceneProvider";
import { BattleScreen } from "@/components/battle/scene/BattleScreen";
import { ErrorState, LoadingState } from "@/components/common/states";
import { useBattleSceneValue, useBattleTitle } from "@/lib/hooks/battle";
import type { BattleScene } from "@/types/api";

export function BattlePageClient({ campaignId, battleId, userId, demoScene = null }: { campaignId: string; battleId: string; userId: string | null; demoScene?: BattleScene | null }) {
  if (demoScene) return <DemoBattleSandbox key={demoScene.id} scene={demoScene} />;

  return <StandardBattlePageClient campaignId={campaignId} battleId={battleId} userId={userId} />;
}

function StandardBattlePageClient({ campaignId, battleId, userId }: { campaignId: string; battleId: string; userId: string | null }) {
  const t = useTranslations("battle.page");

  const { value, loading } = useBattleSceneValue(campaignId, battleId, userId);

  const myTurn = value?.turn.isMyTurn ?? false;

  const name = value?.battle.name;

  useBattleTitle(name, myTurn);

  if (!value) {
    return (
      <div className="battle-hud flex min-h-[70dvh] items-center justify-center px-4">
        {loading ? <LoadingState label={t("loading")} className="w-full max-w-md" /> : <ErrorState error={t("notFound")} className="w-full max-w-md" />}
      </div>
    );
  }

  return (
    <BattleSceneProvider value={value}>
      <BattleScreen />
    </BattleSceneProvider>
  );
}
