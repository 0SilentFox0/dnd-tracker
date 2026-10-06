"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { BattleToast } from "./BattleToast";
import { MobileBattleLayout } from "./MobileBattleLayout";

import { hudFontClassName } from "@/components/battle/hud";
import { useBattleScene, useBelowHeaderHeight, useSpellBookPrefetch } from "@/lib/hooks/battle";
import { useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";

// телефони завжди на мобільному макеті: він у entry-чанку, решта підвантажується
const DesktopBattleLayout = dynamic(() => import("./DesktopBattleLayout").then((m) => m.DesktopBattleLayout), { ssr: false });

const CompleteBattleDialog = dynamic(() => import("./CompleteBattleDialog").then((m) => m.CompleteBattleDialog), { ssr: false });

const ResultOverlay = dynamic(() => import("@/components/battle/fx/ResultOverlay").then((m) => m.ResultOverlay), { ssr: false });

const BattlePreparationView = dynamic(() => import("@/components/battle/views/BattlePreparationView").then((m) => m.BattlePreparationView));

export function BattleScreen() {
  const { battle, isDM, actions } = useBattleScene();

  const wide = useMediaQuery("(min-width: 1024px)", true);

  const height = useBelowHeaderHeight();

  const [completeOpen, setCompleteOpen] = useState(false);

  useSpellBookPrefetch();

  if (battle.status === "prepared") {
    const count = (side: string) => battle.participants.filter((p) => p.side === side).reduce((s, p) => s + (p.quantity ?? 1), 0);

    return (
      <div className={cn("battle-hud overflow-y-auto", hudFontClassName)} style={{ height }}>
        <BattlePreparationView battle={battle} alliesCount={count("ally")} enemiesCount={count("enemy")} isDM={isDM} onStartBattle={() => actions.start.mutate({})} isStarting={actions.start.isPending} />
      </div>
    );
  }

  return (
    <div className={cn("battle-hud", hudFontClassName)}>
      {wide ? <DesktopBattleLayout height={height} onComplete={() => setCompleteOpen(true)} /> : <MobileBattleLayout height={height} />}
      <ResultOverlay />
      <BattleToast />
      {wide && <CompleteBattleDialog open={completeOpen} onOpenChange={setCompleteOpen} />}
    </div>
  );
}
