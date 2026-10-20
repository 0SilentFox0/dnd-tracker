"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { ModeViewValue } from "../useModeView";

import { type BattleSceneData, type BattleSceneValue, useBattleScene, useBattleSceneData } from "@/lib/hooks/battle/useBattleScene";
import { modeFxVisible } from "@/lib/utils/battle/modes/client";
import { deriveMazeView, maskMazeFxAction, maskMazeScene, type MazeView, mazeVisible } from "@/lib/utils/battle/modes/maze";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

export interface MazeAsHero {
  id: string | null;
  set(id: string | null): void;
}

export interface MazeViewState {
  view: MazeView | null;
  asHero: MazeAsHero;
}

export const MazeAsHeroContext = createContext<MazeAsHero | null>(null);

export const MazeViewContext = createContext<MazeViewState | null>(null);

const NO_HERO: MazeAsHero = { id: null, set: () => {} };

const NO_LOG: BattleAction[] = [];

function useDerivedMazeView(battle: BattleScene | null, viewer: { userId: string | null; isDM: boolean }, asHeroId: string | null): MazeView | null {
  const map = battle?.map;

  const order = battle?.initiativeOrder;

  const heroId = viewer.isDM ? asHeroId : null;

  return useMemo(
    () => (map?.maze ? deriveMazeView({ map, participants: order ?? [], userId: viewer.userId ?? "", isDM: viewer.isDM, asHeroId: heroId }) : null),
    [map, order, viewer.userId, viewer.isDM, heroId],
  );
}

export function useMazeAsHeroValue(): MazeAsHero {
  const [id, set] = useState<string | null>(null);

  return useMemo(() => ({ id, set }), [id]);
}

export interface MazeMaskValue {
  state: MazeViewState;
  modeView: ModeViewValue;
  data: BattleSceneData;
  value: BattleSceneValue;
}

/** Сцена без прихованих від гравця учасників: списки, черга, «ходить …», журнал. */
export function useMazeMaskValue(): MazeMaskValue {
  const value = useBattleScene();

  const data = useBattleSceneData();

  const asHero = useContext(MazeAsHeroContext) ?? NO_HERO;

  const view = useDerivedMazeView(data.battle, data.viewer, asHero.id);

  const state = useMemo(() => ({ view, asHero }), [view, asHero]);

  const log = data.battle.battleLog ?? NO_LOG;

  const { map } = data.battle;

  const modeView = useMemo<ModeViewValue>(
    () => ({
      view,
      visible: (p) => mazeVisible(view, p),
      fxLog: view?.role === "player" ? log.filter((e) => modeFxVisible(map, view, e)).map((e) => maskMazeFxAction(view, e)) : log,
    }),
    [view, log, map],
  );

  const maskedData = useMemo(() => maskMazeScene(data, view), [data, view]);

  const maskedValue = useMemo(
    () => (maskedData === data ? value : { ...value, battle: maskedData.battle, turn: maskedData.turn, roster: maskedData.roster }),
    [maskedData, data, value],
  );

  return { state, modeView, data: maskedData, value: maskedValue };
}

export function useMazeView(): { view: MazeView | null; asHero: MazeAsHero } {
  const state = useContext(MazeViewContext);

  const { battle, viewer } = useBattleSceneData();

  const asHero = useContext(MazeAsHeroContext) ?? NO_HERO;

  const fallback = useDerivedMazeView(state ? null : battle, viewer, asHero.id);

  return state ?? { view: fallback, asHero };
}
