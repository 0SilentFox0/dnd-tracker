"use client";

import { useState } from "react";

import { BattleToast } from "./BattleToast";
import { CompleteBattleDialog } from "./CompleteBattleDialog";
import { DesktopBattleLayout } from "./DesktopBattleLayout";
import { MobileBattleLayout } from "./MobileBattleLayout";

import { ResultOverlay } from "@/components/battle/fx/ResultOverlay";
import { hudFontClassName } from "@/components/battle/hud";
import { BattlePreparationView } from "@/components/battle/views/BattlePreparationView";
import { useBattleScene, useBelowHeaderHeight, useSpellBookPrefetch } from "@/lib/hooks/battle";
import { useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";

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
      {wide ? <DesktopBattleLayout onComplete={() => setCompleteOpen(true)} /> : <MobileBattleLayout />}
      <ResultOverlay />
      <BattleToast />
      <CompleteBattleDialog open={completeOpen} onOpenChange={setCompleteOpen} />
    </div>
  );
}
