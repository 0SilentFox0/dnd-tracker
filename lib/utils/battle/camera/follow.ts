import {
    cellCenter,
    gridMetrics,
    unitOf,
} from '@/lib/utils/battle/grid/layout';
import { footprintSizeOf } from '@/lib/utils/battle/grid/occupancy';
import type { BattleParticipant } from '@/types/battle';
import type { GridKind, GridPoint } from '@/types/battle-grid';

export function cellPointPx(
    anchor: GridPoint,
    size: number,
    win: { x: number; y: number },
    pxPerUnit: number,
    grid: GridKind = 'square'
): { x: number; y: number } {
    if (grid === 'hex') {
        const c = cellCenter(anchor, grid);

        const m = gridMetrics(grid);

        return {
            x: (c.x - win.x * m.colStep) * pxPerUnit,
            y: (c.y - win.y * m.rowStep) * pxPerUnit,
        };
    }

    return {
        x: unitOf(anchor.x + size / 2 - win.x) * pxPerUnit,
        y: unitOf(anchor.y + size / 2 - win.y) * pxPerUnit,
    };
}

export function followTarget(
    id: string | null,
    participants: readonly BattleParticipant[],
    grid: GridKind = 'square'
): { anchor: GridPoint; size: number } | null {
    const p = id ? participants.find((x) => x.basicInfo.id === id) : undefined;

    const anchor = p?.battleData.position;

    return p && anchor ? { anchor, size: footprintSizeOf(p, grid) } : null;
}
