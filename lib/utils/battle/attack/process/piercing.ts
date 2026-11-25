import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import {
    apexOf,
    bothOnMap,
    cellDistance,
    cellKey,
    cellsOf,
    closestCell,
    footprintDistance,
    participantsInCells,
    rayCells,
} from '@/lib/utils/battle/grid';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export function piercingTargets(
    map: BattleMapConfig | null | undefined,
    ps: BattleParticipant[],
    attacker: BattleParticipant,
    firstTargetId: string
): string[] {
    const first = findParticipant(ps, firstTargetId);

    if (!first || !bothOnMap(map, attacker, first)) return [firstTargetId];

    const grid = gridOf(map);

    const origin = cellsOf(attacker, grid);

    const through = closestCell(cellsOf(first, grid), origin, grid);

    const apex = apexOf(origin, through, grid);

    const ray = rayCells(map, apex, through, {
        maxCells: Math.max(map.cols, map.rows),
    }).map(cellKey);

    const reach = cellDistance(apex, through, grid);

    const rest = participantsInCells(ps, ray, apex, grid)
        .filter(
            (p) =>
                p.basicInfo.id !== firstTargetId &&
                isHostile(map, attacker, p) &&
                footprintDistance([apex], cellsOf(p, grid), grid) >= reach
        )
        .map((p) => p.basicInfo.id);

    return [firstTargetId, ...rest];
}
