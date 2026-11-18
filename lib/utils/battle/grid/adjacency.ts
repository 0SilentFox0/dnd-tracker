import { edgeBlocks, wallsOf } from './edges';
import { cellsOf, isAdjacent } from './occupancy';

import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

export function cellsAdjacentOnMap(
    map: BattleMapConfig | null | undefined,
    aCells: GridPoint[],
    bCells: GridPoint[]
): boolean {
    const walled = !!map && wallsOf(map).size > 0;

    return aCells.some((from) =>
        bCells.some(
            (to) =>
                Math.max(Math.abs(from.x - to.x), Math.abs(from.y - to.y)) <=
                    1 &&
                (!walled || !edgeBlocks(map, from, to, 'sight'))
        )
    );
}

export function isAdjacentOnMap(
    map: BattleMapConfig | null | undefined,
    a: BattleParticipant,
    b: BattleParticipant
): boolean {
    return isAdjacent(a, b) && cellsAdjacentOnMap(map, cellsOf(a), cellsOf(b));
}

export const adjacencyOf =
    (map: BattleMapConfig | null | undefined) =>
    (a: BattleParticipant, b: BattleParticipant): boolean =>
        isAdjacentOnMap(map, a, b);
