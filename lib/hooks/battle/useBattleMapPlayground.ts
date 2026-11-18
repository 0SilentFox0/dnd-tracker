'use client';

import { useCallback, useMemo, useState } from 'react';

import { playgroundCellClick } from './playground-click';
import {
    type BattleMapPlaygroundLogEntry,
    type BattleMapPlaygroundMode,
    type BattleMapPlaygroundSnapshot,
    DEMO_RANGE,
    DEMO_TEMPLATE,
    DEMO_TERRAIN,
    initial,
    LOG_LIMIT,
} from './playground-demo';

export type {
    BattleMapPlaygroundLogEntry,
    BattleMapPlaygroundLogKey,
    BattleMapPlaygroundMode,
    BattleMapPlaygroundSnapshot,
} from './playground-demo';

import {
    CombatStatus,
    DEFAULT_BATTLE_MAP,
    MAZE_MARK_SYMBOLS,
} from '@/lib/constants/battle';
import { PREVIEW_RULES } from '@/lib/utils/battle/fx/preview-rules';
import {aimView, deriveTrajectory, type MapAim, marginCells, moveMarks, moveZoneMarks, placeParticipants, targetMarks} from '@/lib/utils/battle/grid';
import type { BattleParticipant } from '@/types/battle';
import type {BattleMapActions, BattleMapConfig, BattleMapView, GridPoint, MazeMarkSymbol} from '@/types/battle-grid';

export function useBattleMapPlayground(
    snapshot: BattleMapPlaygroundSnapshot = {}
) {
    const authored = useMemo(() => {
        const map = snapshot.map ?? {
            ...DEFAULT_BATTLE_MAP,
            terrain: DEMO_TERRAIN,
        };

        return {
            map,
            participants: snapshot.participants?.length
                ? snapshot.participants
                : initial(map),
        };
    }, [snapshot.map, snapshot.participants]);

    const [map, setMapState] = useState<BattleMapConfig>(authored.map);

    const [participants, setParticipants] = useState<BattleParticipant[]>(
        authored.participants
    );

    const [activeId, setActiveId] = useState<string>(
        () => participants[0].basicInfo.id
    );

    const [mode, setMode] = useState<BattleMapPlaygroundMode>('move');

    const [mazeMarkSymbol, setMazeMarkSymbol] = useState<MazeMarkSymbol>(
        MAZE_MARK_SYMBOLS[0]
    );

    const [hover, setHover] = useState<GridPoint | null>(null);

    const [log, setLog] = useState<BattleMapPlaygroundLogEntry[]>([]);

    const active =
        participants.find((p) => p.basicInfo.id === activeId) ??
        participants[0];

    const attack = active.battleData.attacks[0];

    const [aim, setAim] = useState<GridPoint | null>(null);

    const mapAim = useMemo<MapAim>(
        () => ({
            template: DEMO_TEMPLATE,
            casterId: active.basicInfo.id,
            range: DEMO_RANGE,
            onAim: () => undefined,
        }),
        [active.basicInfo.id]
    );

    const aimed =
        mode === 'template'
            ? (hover &&
                  aimView(
                      { map, participants, rules: PREVIEW_RULES },
                      mapAim,
                      hover
                  )) ||
              (aim &&
                  aimView(
                      { map, participants, rules: PREVIEW_RULES },
                      mapAim,
                      aim
                  ))
            : null;

    const marks = useMemo(
        () =>
            mode === 'move'
                ? moveZoneMarks(map, participants, active, {
                      rules: PREVIEW_RULES,
                  })
                : mode === 'attack' && attack
                  ? targetMarks(
                        map,
                        participants,
                        active,
                        [attack],
                        PREVIEW_RULES
                    )
                  : new Map(),
        [mode, map, participants, active, attack]
    );

    const costs = useMemo(
        () => moveMarks(map, participants, active, { rules: PREVIEW_RULES }),
        [map, participants, active]
    );

    const trajectory =
        mode === 'attack'
            ? deriveTrajectory(
                  {
                      map,
                      participants,
                      marks,
                      current: active,
                      rules: PREVIEW_RULES,
                  },
                  hover
              )
            : null;

    const hud = useMemo(
        () =>
            new Map(participants.map((p) => [p.basicInfo.id, { exact: true }])),
        [participants]
    );

    const view: BattleMapView = {
        selectedId: activeId,
        currentId: activeId,
        marks: aimed?.marks ?? marks,
        aim: aimed?.aim ?? null,
        trajectory,
        hud,
    };

    const pushLog = useCallback(
        (entry: BattleMapPlaygroundLogEntry) =>
            setLog((prev) => [entry, ...prev].slice(0, LOG_LIMIT)),
        []
    );

    const [margin, setMarginState] = useState(0);

    const setMap = useCallback(
        (raw: BattleMapConfig) => {
            const next = { ...raw, blocked: marginCells(raw, margin) };

            setMapState((prev) => {
                if (next.cols !== prev.cols || next.rows !== prev.rows)
                    setParticipants(initial(next));

                return next;
            });
        },
        [margin]
    );

    const setMargin = useCallback(
        (n: number) => {
            const value = Math.min(5, Math.max(0, Math.round(n) || 0));

            const next = { ...map, blocked: marginCells(map, value) };

            setMarginState(value);
            setMapState(next);
            setParticipants((prev) => placeParticipants(next, prev));
        },
        [map]
    );

    const onCellClick = useCallback(
        (p: GridPoint) =>
            playgroundCellClick(
                {
                    mode,
                    marks,
                    costs,
                    activeId,
                    active,
                    participants,
                    map,
                    mapAim,
                    mazeMarkSymbol,
                    setMap: setMapState,
                    setParticipants,
                    setAim,
                    pushLog,
                },
                p
            ),
        [
            mode,
            marks,
            costs,
            activeId,
            active,
            participants,
            pushLog,
            map,
            mapAim,
            mazeMarkSymbol,
        ]
    );

    const nextTurn = useCallback(() => {
        const alive = participants.filter(
            (p) => p.combatStats.status === CombatStatus.ACTIVE
        );

        if (alive.length === 0) return;

        const index = alive.findIndex((p) => p.basicInfo.id === activeId);

        const next = alive[(index + 1) % alive.length];

        setActiveId(next.basicInfo.id);
        setParticipants((prev) =>
            prev.map((p) =>
                p.basicInfo.id === next.basicInfo.id
                    ? { ...p, battleData: { ...p.battleData, movementUsed: 0 } }
                    : p
            )
        );
        pushLog({ key: 'turn', params: { name: next.basicInfo.name } });
    }, [participants, activeId, pushLog]);

    const reset = useCallback(() => {
        setMapState(authored.map);
        setParticipants(authored.participants);
        setActiveId(authored.participants[0].basicInfo.id);
        setMode('move');
        setMazeMarkSymbol(MAZE_MARK_SYMBOLS[0]);
        setAim(null);
        setHover(null);
        setLog([]);
    }, [authored]);

    const actions: Omit<Required<BattleMapActions>, 'onStroke' | 'onReturn'> = {
        onCellClick,
        onCellHover: setHover,
        onTokenClick: setActiveId,
    };

    return {
        map,
        setMap,
        margin,
        setMargin,
        participants,
        activeId,
        active,
        mode,
        mazeMarkSymbol,
        view,
        actions,
        log,
        controls: { nextTurn, setMode, setMazeMarkSymbol, reset },
    };
}
