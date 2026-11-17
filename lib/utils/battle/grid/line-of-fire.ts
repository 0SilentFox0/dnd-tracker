import { edgeBlocks } from './edges';
import {
    blockedSet,
    cellKey,
    cellLine,
    closestCell,
    impassableSet,
    inBounds,
} from './geometry';
import { bothOnMap, cellsOf, occupiedBy } from './occupancy';

import { isAirborne } from '@/lib/utils/abilities/engine/core/participants';
import { modeLineBlocked } from '@/lib/utils/battle/modes/engine';
import { isUp } from '@/lib/utils/battle/participant/state';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export interface LineOfFire {
    /** Укриття (×0.5): істоти, бар'єри, закриті клітинки, ворота режиму; стіна — окремо у `wallBlocked`. */
    blocked: boolean;
    /** Стіна ребром на лінії: постріл неможливий. */
    wallBlocked: boolean;
    /** Клітинки, що заважають (для підсвітки); стіна лабіринту клітинки не має. */
    cells: string[];
}

const CLEAR: LineOfFire = { blocked: false, wallBlocked: false, cells: [] };

export function lineOfFire(
    map: BattleMapConfig | null | undefined,
    participants: BattleParticipant[],
    shooter: BattleParticipant,
    target: BattleParticipant
): LineOfFire {
    if (!bothOnMap(map, shooter, target)) return CLEAR;

    const from = cellsOf(shooter);

    const to = cellsOf(target);

    const start = closestCell(from, to);

    const line = cellLine(start, closestCell(to, [start]));

    const own = new Set([...from, ...to].map(cellKey));

    const others = participants.filter(
        (p) =>
            p.basicInfo.id !== shooter.basicInfo.id &&
            p.basicInfo.id !== target.basicInfo.id
    );

    const occupied = occupiedBy(others, (p) => isUp(p) && !isAirborne(p));

    const blocked = blockedSet(map);

    const impassable = impassableSet(map);

    const cells = line
        .filter((c) => {
            const key = cellKey(c);

            if (own.has(key)) return false;

            return (
                !inBounds(map, c) ||
                blocked.has(key) ||
                impassable.has(key) ||
                occupied.has(key)
            );
        })
        .map(cellKey);

    const wallBlocked = line.some(
        (c, i) => i > 0 && edgeBlocks(map, line[i - 1], c, 'fire')
    );

    return {
        blocked: cells.length > 0 || modeLineBlocked(map, line),
        wallBlocked,
        cells,
    };
}
