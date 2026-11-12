'use client';

import { createContext, useContext, useMemo, useState } from 'react';

import type { ModeViewValue } from '../useModeView';

import type {
    BattleSceneData,
    BattleSceneValue,
} from '@/lib/hooks/battle/types';
import {
    useBattleScene,
    useBattleSceneData,
} from '@/lib/hooks/battle/useBattleScene';
import { modeFxVisible } from '@/lib/utils/battle/modes/client';
import {
    deriveMazeView,
    maskMazeFxAction,
    maskMazeScene,
    type MazeView,
    mazeViewHeroes,
    mazeVisible,
} from '@/lib/utils/battle/modes/maze';
import { maskBattleBy } from '@/lib/utils/battle/modes/maze/illusion-mask';
import type { BattleScene } from '@/types/api';
import type { BattleAction } from '@/types/battle';

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

function useDerivedMazeView(
    battle: BattleScene | null,
    viewer: { userId: string | null; isDM: boolean; readOnly?: boolean },
    asHeroId: string | null
): MazeView | null {
    const map = battle?.map;

    const order = battle?.initiativeOrder;

    const readOnly = viewer.readOnly === true;

    const picks = viewer.isDM || readOnly;

    return useMemo(() => {
        if (!map?.maze) return null;

        const participants = order ?? [];

        // player view keeps the fog: the chosen hero, else the first one on the field
        const heroes = readOnly ? mazeViewHeroes(participants) : [];

        const heroId = readOnly
            ? ((heroes.find((p) => p.basicInfo.id === asHeroId) ?? heroes[0])
                  ?.basicInfo.id ?? null)
            : viewer.isDM
              ? asHeroId
              : null;

        return deriveMazeView({
            map,
            participants,
            userId: viewer.userId ?? '',
            isDM: picks && (!readOnly || !!heroId),
            asHeroId: heroId,
        });
    }, [map, order, viewer.userId, viewer.isDM, readOnly, picks, asHeroId]);
}

/** Pins the first hero shown in player view, so fog does not jump when initiative order changes. */
export function pinFirstHero(
    pinned: string | null,
    heroIds: string[]
): string | null {
    if (pinned && heroIds.includes(pinned)) return pinned;

    return heroIds[0] ?? null;
}

export function useMazeAsHeroValue(): MazeAsHero {
    const [id, set] = useState<string | null>(null);

    const { battle, viewer } = useBattleSceneData();

    const readOnly = viewer.readOnly === true;

    const order = battle.map?.maze ? battle.initiativeOrder : undefined;

    const pinned = readOnly
        ? pinFirstHero(
              id,
              mazeViewHeroes(order ?? []).map((p) => p.basicInfo.id)
          )
        : id;

    const [wasReadOnly, setWasReadOnly] = useState(readOnly);

    if (wasReadOnly !== readOnly) {
        setWasReadOnly(readOnly);
        set(readOnly ? pinned : null);
    } else if (readOnly && pinned !== id) {
        set(pinned);
    }

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
            fxLog:
                view?.role === 'player'
                    ? log
                          .filter((e) => modeFxVisible(map, view, e))
                          .map((e) => maskMazeFxAction(view, e))
                    : view?.disguiseOf
                      ? log.map((e) => maskMazeFxAction(view, e))
                      : log,
        }),
        [view, log, map]
    );

    const maskedData = useMemo(() => maskMazeScene(data, view), [data, view]);

    const maskedValue = useMemo(() => {
        if (maskedData === data) return value;

        const masked = {
            ...value,
            battle: maskedData.battle,
            turn: maskedData.turn,
            roster: maskedData.roster,
        };

        const disguiseOf = view?.disguiseOf;

        if (!disguiseOf) return masked;

        const readBattle = () => {
            const b = value.readBattle();

            return b && maskBattleBy(b, disguiseOf, view?.disguiseNames);
        };

        return { ...masked, readBattle };
    }, [maskedData, data, value, view]);

    return { state, modeView, data: maskedData, value: maskedValue };
}

export function useMazeView(): { view: MazeView | null; asHero: MazeAsHero } {
    const state = useContext(MazeViewContext);

    const { battle, viewer } = useBattleSceneData();

    const asHero = useContext(MazeAsHeroContext) ?? NO_HERO;

    const fallback = useDerivedMazeView(
        state ? null : battle,
        viewer,
        asHero.id
    );

    return state ?? { view: fallback, asHero };
}
