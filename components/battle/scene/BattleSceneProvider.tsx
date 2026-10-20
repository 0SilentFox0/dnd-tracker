"use client";

import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { BattleSceneContext, BattleSceneDataContext, type BattleSceneValue, MazeViewProvider, ParticipantFacesContext, useBattleSceneDataValue, useParticipantFacesValue } from "@/lib/hooks/battle";


const NO_ORDER: BattleSceneValue["battle"]["initiativeOrder"] = [];

export function BattleSceneProvider({ value, children }: { value: BattleSceneValue; children: ReactNode }) {
  const data = useBattleSceneDataValue(value);

  const faces = useParticipantFacesValue(value.battle.initiativeOrder ?? NO_ORDER);

  return (
    <BattleSceneDataContext.Provider value={data}>
      <ParticipantFacesContext.Provider value={faces}>
        <BattleSceneContext.Provider value={value}>
          <TooltipProvider delayDuration={200}><MazeViewProvider>{children}</MazeViewProvider></TooltipProvider>
        </BattleSceneContext.Provider>
      </ParticipantFacesContext.Provider>
    </BattleSceneDataContext.Provider>
  );
}
