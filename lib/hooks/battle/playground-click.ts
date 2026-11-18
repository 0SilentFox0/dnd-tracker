import type { Dispatch, SetStateAction } from 'react';

import {
    type BattleMapPlaygroundLogEntry,
    type BattleMapPlaygroundMode,
    DEMO_DAMAGE,
    DEMO_TEMPLATE,
} from './playground-demo';

import { CombatStatus } from '@/lib/constants/battle';
import { PREVIEW_RULES } from '@/lib/utils/battle/fx/preview-rules';
import {
    aimView,
    cellKey,
    cellsOf,
    type MapAim,
    templateArea,
} from '@/lib/utils/battle/grid';
import type { BattleParticipant } from '@/types/battle';
import type {
    BattleMapConfig,
    GridPoint,
    MazeMarkSymbol,
} from '@/types/battle-grid';

export interface PlaygroundClickContext {
    mode: BattleMapPlaygroundMode;
    marks: Map<string, string>;
    costs: Map<string, number>;
    activeId: string;
    active: BattleParticipant;
    participants: BattleParticipant[];
    map: BattleMapConfig;
    mapAim: MapAim;
    mazeMarkSymbol: MazeMarkSymbol;
    setMap: Dispatch<SetStateAction<BattleMapConfig>>;
    setParticipants: Dispatch<SetStateAction<BattleParticipant[]>>;
    setAim(cell: GridPoint): void;
    pushLog(entry: BattleMapPlaygroundLogEntry): void;
}

export function playgroundCellClick(
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
        setMap,
        setParticipants,
        setAim,
        pushLog,
    }: PlaygroundClickContext,
    p: GridPoint
) {
    const key = cellKey(p);

    if (mode === 'maze-mark') {
        if (!map.maze) return;

        setMap((prev) =>
            prev.maze
                ? {
                      ...prev,
                      maze: {
                          ...prev.maze,
                          marks: {
                              ...prev.maze.marks,
                              [key]: {
                                  symbol: mazeMarkSymbol,
                                  color: '#f0c75e',
                                  by: activeId,
                              },
                          },
                      },
                  }
                : prev
        );
        pushLog({
            key: 'mazeMark',
            params: { symbol: mazeMarkSymbol, cell: key },
        });

        return;
    }

    if (mode === 'template') {
        if (
            !aimView(
                { map, participants, rules: PREVIEW_RULES },
                mapAim,
                p
            )
        )
            return pushLog({ key: 'outOfRange', params: {} });

        const hit = templateArea(
            map,
            participants,
            active,
            DEMO_TEMPLATE,
            p,
            PREVIEW_RULES
        ).targets;

        setAim(p);
        pushLog({
            key: 'template',
            params: {
                cell: key,
                names: hit.map((q) => q.basicInfo.name).join(', '),
            },
        });

        return;
    }

    if (mode === 'move') {
        const cost = marks.has(key) ? costs.get(key) : undefined;

        if (cost === undefined || cost <= 0) return;

        setParticipants((prev) =>
            prev.map((q) =>
                q.basicInfo.id === activeId
                    ? {
                          ...q,
                          battleData: {
                              ...q.battleData,
                              position: p,
                              movementUsed:
                                  (q.battleData.movementUsed ?? 0) +
                                  cost,
                          },
                      }
                    : q
            )
        );
        pushLog({
            key: 'move',
            params: { name: active.basicInfo.name, cost },
        });

        return;
    }

    if (marks.get(key) !== 'target') return;

    const target = participants.find(
        (q) =>
            q.basicInfo.side !== active.basicInfo.side &&
            cellsOf(q).some((c) => cellKey(c) === key)
    );

    if (!target) return;

    setParticipants((prev) =>
        prev.map((q) => {
            if (q.basicInfo.id !== target.basicInfo.id) return q;

            const currentHp = Math.max(
                0,
                q.combatStats.currentHp - DEMO_DAMAGE
            );

            return {
                ...q,
                combatStats: {
                    ...q.combatStats,
                    currentHp,
                    status:
                        currentHp <= 0
                            ? CombatStatus.DEAD
                            : q.combatStats.status,
                },
            };
        })
    );
    pushLog({
        key: 'hit',
        params: {
            name: active.basicInfo.name,
            target: target.basicInfo.name,
            damage: DEMO_DAMAGE,
        },
    });
}
