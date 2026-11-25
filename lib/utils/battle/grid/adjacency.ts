import { edgeBlocks, wallsOf } from './edges';
import { cellDistance, gridOf } from './geometry';
import { cellsOf, isAdjacent } from './occupancy';

import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

export function cellsAdjacentOnMap(
    map: BattleMapConfig | null | undefined,
    aCells: GridPoint[],
    bCells: GridPoint[]
): boolean {
    const walled = !!map && wallsOf(map).size > 0;

    const grid = gridOf(map);

    return aCells.some((from) =>
        bCells.some(
            (to) =>
                cellDistance(from, to, grid) <= 1 &&
                (!walled || !edgeBlocks(map, from, to, 'sight'))
        )
    );
}

export function isAdjacentOnMap(
    map: BattleMapConfig | null | undefined,
    a: BattleParticipant,
    b: BattleParticipant
): boolean {
    const grid = gridOf(map);

    return (
        isAdjacent(a, b, grid) &&
        cellsAdjacentOnMap(map, cellsOf(a, grid), cellsOf(b, grid))
    );
}

export const adjacencyOf =
    (map: BattleMapConfig | null | undefined) =>
    (a: BattleParticipant, b: BattleParticipant): boolean =>
        isAdjacentOnMap(map, a, b);
