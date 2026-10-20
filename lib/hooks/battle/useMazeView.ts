"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { type BattleSceneData, type BattleSceneValue, useBattleScene, useBattleSceneData } from "./useBattleScene";

import { modeFxVisible } from "@/lib/utils/battle/modes/client";
import { deriveMazeView, maskMazeScene, type MazeView,mazeVisible } from "@/lib/utils/battle/modes/maze";
import type { BattleScene } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface MazeAsHero {
  id: string | null;
  set(id: string | null): void;
}

export interface MazeViewState {
  view: MazeView | null;
  asHero: MazeAsHero;
  /** Журнал до маскування — FX мають власне правило видимості */
  fullLog: BattleAction[];
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
  data: BattleSceneData;
  value: BattleSceneValue;
}

/** Сцена без прихованих від гравця учасників: списки, черга, «ходить …», журнал. */
export function useMazeMaskValue(): MazeMaskValue {
  const value = useBattleScene();

  const data = useBattleSceneData();

  const asHero = useContext(MazeAsHeroContext) ?? NO_HERO;

  const view = useDerivedMazeView(data.battle, data.viewer, asHero.id);

  const fullLog = data.battle.battleLog ?? NO_LOG;

  const state = useMemo(() => ({ view, asHero, fullLog }), [view, asHero, fullLog]);

  const maskedData = useMemo(() => maskMazeScene(data, view), [data, view]);

  const maskedValue = useMemo(
    () => (maskedData === data ? value : { ...value, battle: maskedData.battle, turn: maskedData.turn, roster: maskedData.roster }),
    [maskedData, data, value],
  );

  return { state, data: maskedData, value: maskedValue };
}

export function useMazeView(): { view: MazeView | null; asHero: MazeAsHero } {
  const state = useContext(MazeViewContext);

  const { battle, viewer } = useBattleSceneData();

  const asHero = useContext(MazeAsHeroContext) ?? NO_HERO;

  const fallback = useDerivedMazeView(state ? null : battle, viewer, asHero.id);

  return state ?? { view: fallback, asHero };
}

/** Фільтр цілей і списків: гравець у лабіринті не обирає того, кого не бачить. */
export function useMazeVisible(): (p: BattleParticipant) => boolean {
  const { view } = useMazeView();

  return useCallback((p: BattleParticipant) => mazeVisible(view, p), [view]);
}

export function useMazeFxLog(): BattleAction[] {
  const state = useContext(MazeViewContext);

  const { battle } = useBattleSceneData();

  const log = state?.fullLog ?? battle.battleLog ?? NO_LOG;

  const view = state?.view ?? null;

  return useMemo(() => (view?.role === "player" ? log.filter((e) => modeFxVisible(battle.map, view, e)) : log), [log, view, battle.map]);
}
