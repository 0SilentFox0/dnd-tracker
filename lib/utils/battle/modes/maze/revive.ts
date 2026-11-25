import { featureKeys } from './features';
import type { MazeGrid } from './grid';
import { mazeReachable } from './movement';

import { cellKey, cellsByRing } from '@/lib/utils/battle/grid/geometry';
import { occupiedBy } from '@/lib/utils/battle/grid/occupancy';
import type { BattleParticipant } from '@/types/battle';
import type { GridPoint } from '@/types/battle-grid';

export function nearestMazeCell(
    grid: MazeGrid,
    participants: BattleParticipant[],
    mover: BattleParticipant,
    from: GridPoint
): GridPoint | null {
    const taken = occupiedBy(
        participants,
        (p) => p.basicInfo.id !== mover.basicInfo.id,
        'square'
    );

    const features = featureKeys(grid.maze);

    if (!taken.has(cellKey(from))) return from;

    const reach = mazeReachable(grid, {
        participants,
        mover: {
            ...mover,
            battleData: { ...mover.battleData, position: from },
        },
        budget: grid.cols * grid.rows,
    });

    const byCost = [...reach.entries()]
        .filter(([key]) => !features.has(key))
        .sort((a, b) => a[1].cost - b[1].cost);

    if (byCost.length > 0)
        return byCost[0][1].path[byCost[0][1].path.length - 1];

    for (const c of cellsByRing(grid, from)) {
        if (!taken.has(cellKey(c)) && !features.has(cellKey(c))) return c;
    }

    return null;
}
