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

import {
    aimInRange,
    allCells,
    applyTerrainDiff,
    blockedSet,
    cellKey,
    cellsByDistance,
    cellsOf,
    hazardCells,
    isMoveMark,
    moveBudget,
    moveZoneMarks,
    nearestStandable,
    placeParticipants,
    playableBounds,
    searchPaths,
} from '@/lib/utils/battle/grid';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import type { BattleMapConfig, GridPoint } from '@/types/battle';

const RUNS = Number(process.env.SPIKE_RUNS ?? 7);

// copy of the private outOfRangeMarks (map-scene.ts) — the "before" shape
function outOfRangeMarks(map: BattleMapConfig, origin: GridPoint[], feet: number) {
    const out = new Map<string, string>();

    for (let y = 0; y < map.rows; y++)
        for (let x = 0; x < map.cols; x++)
            if (!aimInRange(origin, { x, y }, feet, DEFAULT_RULES))
                out.set(cellKey({ x, y }), 'out-of-range');

    return out;
}

// copy of the inline zoneCells in GridLayer (MapLayers.tsx), recomputed on every render
function zoneCells(map: BattleMapConfig, marks: Map<string, unknown>) {
    const blocked = blockedSet(map);

    return allCells(map).flatMap((p) => {
        const m = marks.get(cellKey(p)) as Parameters<typeof isMoveMark>[0];

        return !blocked.has(cellKey(p)) && isMoveMark(m) ? [p] : [];
    });
}

it('grid algorithms on synthetic maps', () => {
    const rows: Record<string, unknown>[] = [];

    for (const n of SIDES) {
        const map = syntheticMap(n);

        const participants = syntheticParticipants(map);

        const dmMover = participants[8];

        const hero = participants[0];

        const budget = moveBudget({ map, dmUserId: DM_ID, rules: DEFAULT_RULES }, dmMover);

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

        const diff = { set: [{ cell: { kind: 'difficult' as const }, keys: [cellKey(centre)] }] };

        rows.push({
            side: n,
            cells: n * n,
            dmBudget: budget,
            dmReachable: dmMarks.size,
            'searchPaths DM (ms)': ms(
                time(() => searchPaths(map, participants, dmMover, budget), RUNS).median
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
            'cellsByDistance (ms)': ms(time(() => cellsByDistance(map, centre), RUNS).median),
            'nearestStandable (ms)': ms(
                time(() => nearestStandable(map, participants, hero, cellsOf(dmMover)[0]), RUNS)
                    .median
            ),
            'placeParticipants 16 (ms)': ms(
                time(() => placeParticipants(map, unplaced), RUNS).median
            ),
            'hazardCells (ms)': ms(time(() => hazardCells(map), RUNS).median),
            'outOfRangeMarks 60ft (ms)': ms(
                time(() => outOfRangeMarks(map, cellsOf(hero), 60), RUNS).median
            ),
            'zoneCells DM marks (ms)': ms(time(() => zoneCells(map, dmMarks), RUNS).median),
            'playableBounds (ms)': ms(time(() => playableBounds(map), RUNS).median),
            'applyTerrainDiff 1 cell (ms)': ms(time(() => applyTerrainDiff(oneCell, diff), RUNS).median),
        });
    }

    console.table(rows);

    if (process.env.SPIKE_OUT)
        writeFileSync(`${process.env.SPIKE_OUT}/algorithms.json`, JSON.stringify(rows, null, 2));
}, 600_000);
