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
    win: { x: number; y: number; rows?: number },
    pxPerUnit: number,
    rotated = false,
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

    const x = unitOf(anchor.x + size / 2 - win.x) * pxPerUnit;

    const y = unitOf(anchor.y + size / 2 - win.y) * pxPerUnit;

    return rotated
        ? { x: unitOf(win.rows ?? 0) * pxPerUnit - y, y: x }
        : { x, y };
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

export function participantsCenterPx(
    participants: readonly BattleParticipant[],
    win: { x: number; y: number; rows?: number },
    pxPerUnit: number,
    rotated = false,
    grid: GridKind = 'square'
): { x: number; y: number } | null {
    let x0 = Infinity;

    let y0 = Infinity;

    let x1 = -Infinity;

    let y1 = -Infinity;

    for (const p of participants) {
        const anchor = p.battleData.position;

        if (!anchor) continue;

        const size = footprintSizeOf(p, grid);

        x0 = Math.min(x0, anchor.x);
        y0 = Math.min(y0, anchor.y);
        x1 = Math.max(x1, anchor.x + size);
        y1 = Math.max(y1, anchor.y + size);
    }

    if (x0 === Infinity) return null;

    return cellPointPx(
        { x: (x0 + x1) / 2 - 0.5, y: (y0 + y1) / 2 - 0.5 },
        1,
        win,
        pxPerUnit,
        rotated,
        grid
    );
}
