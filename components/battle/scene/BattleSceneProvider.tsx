"use client";

import type { ReactNode } from "react";

import { ParticipantFacesProvider } from "@/components/battle/hud";
import { BattleSceneContext, BattleSceneDataContext, type BattleSceneValue, useBattleSceneDataValue } from "@/lib/hooks/battle";

export function BattleSceneProvider({ value, children }: { value: BattleSceneValue; children: ReactNode }) {
  const data = useBattleSceneDataValue(value);

  return (
    <BattleSceneDataContext.Provider value={data}>
      <BattleSceneContext.Provider value={value}>
        <ParticipantFacesProvider order={data.battle.initiativeOrder}>{children}</ParticipantFacesProvider>
      </BattleSceneContext.Provider>
    </BattleSceneDataContext.Provider>
  );
}
