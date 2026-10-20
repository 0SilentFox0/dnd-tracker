"use client";

import { type ReactNode, useContext } from "react";

import { BattleSceneContext, BattleSceneDataContext, ModeViewContext } from "@/lib/hooks/battle";
import { MazeAsHeroContext, MazeToolStateContext, MazeViewContext, useMazeAsHeroValue, useMazeMaskValue, useMazeToolStateValue } from "@/lib/hooks/battle/modes/maze";

function MazeMask({ children }: { children: ReactNode }) {
  const { state, modeView, data, value } = useMazeMaskValue();

  const parentView = useContext(ModeViewContext);

  const ownView = state.view ? modeView : (parentView ?? modeView);

  return (
    <MazeViewContext.Provider value={state}>
      <ModeViewContext.Provider value={ownView}>
        <BattleSceneDataContext.Provider value={data}>
          <BattleSceneContext.Provider value={value}>{children}</BattleSceneContext.Provider>
        </BattleSceneDataContext.Provider>
      </ModeViewContext.Provider>
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
