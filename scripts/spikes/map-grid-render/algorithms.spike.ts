import { writeFileSync } from 'node:fs';
import { it } from 'vitest';

import {
    DM_ID,
    ms,
    SIDES,
    syntheticMap,
    syntheticParticipants,
    time,
} from './scenario';

import '@/lib/utils/rules/systems/registry';
import {
    applyTerrainDiff,
    blockedSet,
    cellKey,
    cellsByDistance,
    cellsOf,
    feetToCells,
    hazardCells,
    isMoveMark,
    moveBudget,
    moveZoneMarks,
    nearestStandable,
    placeParticipants,
    playableBounds,
    regionFillPath,
    regionOutlinePath,
    searchPaths,
    windowPath,
} from '@/lib/utils/battle/grid';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

const RUNS = Number(process.env.SPIKE_RUNS ?? 7);

// copy of the private rangeWindow (map-scene.ts) + the windowPath the layer draws
function rangeWindow(map: BattleMapConfig, origin: GridPoint[], feet: number) {
    const r = feetToCells(feet, DEFAULT_RULES);

    const xs = origin.map((c) => c.x);

    const ys = origin.map((c) => c.y);

    const x0 = Math.max(0, Math.min(...xs) - r);

    const y0 = Math.max(0, Math.min(...ys) - r);

    const x1 = Math.min(map.cols - 1, Math.max(...xs) + r);

    const y1 = Math.min(map.rows - 1, Math.max(...ys) + r);

    const win = { x: x0, y: y0, cols: x1 - x0 + 1, rows: y1 - y0 + 1 };

    return windowPath(map, win);
}

function dmZone(map: BattleMapConfig, marks: Map<string, unknown>) {
    const blocked = blockedSet(map);

    const keys: string[] = [];

    for (const [key, m] of marks)
        if (
            !blocked.has(key) &&
            isMoveMark(m as Parameters<typeof isMoveMark>[0])
        )
            keys.push(key);

    return [regionFillPath(keys), regionOutlinePath(keys)];
}

it('grid algorithms on synthetic maps', () => {
    const rows: Record<string, unknown>[] = [];

    for (const n of SIDES) {
        const map = syntheticMap(n);

        const participants = syntheticParticipants(map);

        const dmMover = participants[8];

        const hero = participants[0];

        const budget = moveBudget(
            { map, dmUserId: DM_ID, rules: DEFAULT_RULES },
            dmMover
        );

        const dmMarks = moveZoneMarks(map, participants, dmMover, {
            rules: DEFAULT_RULES,
            dmUserId: DM_ID,
        });

        const centre = { x: Math.floor(n / 2), y: Math.floor(n / 2) };

        const unplaced = participants.map((p) => ({
            ...p,
            battleData: { ...p.battleData, position: undefined },
        }));

        const oneCell = { ...map, terrain: { ...map.terrain } };

        const diff = {
            set: [
                {
                    cell: { kind: 'difficult' as const },
                    keys: [cellKey(centre)],
                },
            ],
        };

        rows.push({
            side: n,
            cells: n * n,
            dmBudget: budget,
            dmReachable: dmMarks.size,
            'searchPaths DM (ms)': ms(
                time(
                    () => searchPaths(map, participants, dmMover, budget),
                    RUNS
                ).median
            ),
            'searchPaths hero 6 (ms)': ms(
                time(() => searchPaths(map, participants, hero, 6), RUNS).median
            ),
            'moveZoneMarks DM (ms)': ms(
                time(
                    () =>
                        moveZoneMarks(map, participants, dmMover, {
                            rules: DEFAULT_RULES,
                            dmUserId: DM_ID,
                        }),
                    RUNS
                ).median
            ),
            'cellsByDistance (ms)': ms(
                time(() => cellsByDistance(map, centre), RUNS).median
            ),
            'nearestStandable (ms)': ms(
                time(
                    () =>
                        nearestStandable(
                            map,
                            participants,
                            hero,
                            cellsOf(dmMover)[0]
                        ),
                    RUNS
                ).median
            ),
            'placeParticipants 16 (ms)': ms(
                time(() => placeParticipants(map, unplaced), RUNS).median
            ),
            'hazardCells (ms)': ms(time(() => hazardCells(map), RUNS).median),
            'rangeWindow 60ft (ms)': ms(
                time(() => rangeWindow(map, cellsOf(hero), 60), RUNS).median
            ),
            'DM zone fill+outline (ms)': ms(
                time(() => dmZone(map, dmMarks), RUNS).median
            ),
            'playableBounds (ms)': ms(
                time(() => playableBounds(map), RUNS).median
            ),
            'applyTerrainDiff 1 cell (ms)': ms(
                time(() => applyTerrainDiff(oneCell, diff), RUNS).median
            ),
        });
    }

    console.table(rows);

    if (process.env.SPIKE_OUT)
        writeFileSync(
            `${process.env.SPIKE_OUT}/algorithms.json`,
            JSON.stringify(rows, null, 2)
        );
}, 600_000);
