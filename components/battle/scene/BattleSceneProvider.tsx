"use client";

import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { BattleSceneContext, BattleSceneDataContext, type BattleSceneValue, useBattleSceneDataValue } from "@/lib/hooks/battle";

export function BattleSceneProvider({ value, children }: { value: BattleSceneValue; children: ReactNode }) {
  const data = useBattleSceneDataValue(value);

  return (
    <BattleSceneDataContext.Provider value={data}>
      <BattleSceneContext.Provider value={value}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </BattleSceneContext.Provider>
    </BattleSceneDataContext.Provider>
  );
}
