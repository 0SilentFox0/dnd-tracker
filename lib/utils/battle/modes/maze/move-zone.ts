import type { ModeEngineHooks, ModeMoveZone } from '../types';
import { mazeGridOf } from './grid';
import { mazeBudgetLeft, mazeReachable } from './movement';

import { parseCellKey } from '@/lib/utils/battle/grid/geometry';

export const mazeMoveZone: NonNullable<
    ModeEngineHooks<unknown>['moveZone']
> = ({ map, seen, mover, view }): ModeMoveZone => {
    const grid = mazeGridOf(map);

    const zone: ModeMoveZone = { steps: new Map(), marks: new Map() };

    if (!grid || grid.maze.dark || !grid.maze.exit) return zone;

    const reach = mazeReachable(grid, {
        participants: seen,
        mover,
        budget: mazeBudgetLeft(mover),
        limit: view?.cells ?? undefined,
    });

    for (const [key, { cost }] of reach) {
        zone.steps.set(key, { anchor: parseCellKey(key), cost });
        zone.marks.set(key, cost);
    }

    return zone;
};
