"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

import { useBattleSceneData } from "./useBattleScene";
import { MazeToolStateProvider } from "./useMazeToolState";

import { deriveMazeView, type MazeView } from "@/lib/utils/battle/view";

export interface MazeAsHero {
  id: string | null;
  set(id: string | null): void;
}

const AsHeroContext = createContext<MazeAsHero | null>(null);

export function MazeViewProvider({ children }: { children: ReactNode }) {
  const [id, set] = useState<string | null>(null);

  const value = useMemo(() => ({ id, set }), [id]);

  return (
    <AsHeroContext.Provider value={value}>
      <MazeToolStateProvider>{children}</MazeToolStateProvider>
    </AsHeroContext.Provider>
  );
}

const NO_HERO: MazeAsHero = { id: null, set: () => {} };

export function useMazeView(): { view: MazeView | null; asHero: MazeAsHero } {
  const { battle, viewer } = useBattleSceneData();

  const asHero = useContext(AsHeroContext) ?? NO_HERO;

  const { map, initiativeOrder } = battle;

  const asHeroId = viewer.isDM ? asHero.id : null;

  const view = useMemo(
    () => (map?.maze ? deriveMazeView({ map, participants: initiativeOrder ?? [], userId: viewer.userId ?? "", isDM: viewer.isDM, asHeroId }) : null),
    [map, initiativeOrder, viewer.userId, viewer.isDM, asHeroId],
  );

  return { view, asHero };
}
