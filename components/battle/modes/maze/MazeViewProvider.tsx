"use client";

import { type ReactNode, useContext } from "react";

import { BattleSceneContext, BattleSceneDataContext, ModeViewContext, ParticipantFacesContext, useParticipantFacesValue } from "@/lib/hooks/battle";
import { MazeAsHeroContext, MazeToolStateContext, MazeViewContext, useMazeAsHeroValue, useMazeMaskValue, useMazeToolStateValue } from "@/lib/hooks/battle/modes/maze";
import type { BattleParticipant } from "@/types/battle";

const NO_ORDER: BattleParticipant[] = [];

function MazeMask({ children }: { children: ReactNode }) {
  const { state, modeView, data, value } = useMazeMaskValue();

  const parentView = useContext(ModeViewContext);

  const ownView = state.view ? modeView : (parentView ?? modeView);

  const parentFaces = useContext(ParticipantFacesContext);

  const maskedFaces = useParticipantFacesValue(value.battle.initiativeOrder ?? NO_ORDER);

  const faces = state.view?.disguiseOf ? maskedFaces : parentFaces;

  return (
    <MazeViewContext.Provider value={state}>
      <ModeViewContext.Provider value={ownView}>
        <BattleSceneDataContext.Provider value={data}>
          <ParticipantFacesContext.Provider value={faces}>
            <BattleSceneContext.Provider value={value}>{children}</BattleSceneContext.Provider>
          </ParticipantFacesContext.Provider>
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
