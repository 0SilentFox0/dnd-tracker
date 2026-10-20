"use client";

import type { ReactNode } from "react";

import { BattleSceneContext, BattleSceneDataContext, MazeAsHeroContext, MazeToolStateContext, MazeViewContext, useMazeAsHeroValue, useMazeMaskValue, useMazeToolStateValue } from "@/lib/hooks/battle";

function MazeMask({ children }: { children: ReactNode }) {
  const { state, data, value } = useMazeMaskValue();

  return (
    <MazeViewContext.Provider value={state}>
      <BattleSceneDataContext.Provider value={data}>
        <BattleSceneContext.Provider value={value}>{children}</BattleSceneContext.Provider>
      </BattleSceneDataContext.Provider>
    </MazeViewContext.Provider>
  );
}

export function MazeViewProvider({ children }: { children: ReactNode }) {
  return (
    <MazeAsHeroContext.Provider value={useMazeAsHeroValue()}>
      <MazeMask>{children}</MazeMask>
    </MazeAsHeroContext.Provider>
  );
}

export function MazeToolStateProvider({ children }: { children: ReactNode }) {
  return <MazeToolStateContext.Provider value={useMazeToolStateValue()}>{children}</MazeToolStateContext.Provider>;
}
