import { UNIT } from '@/lib/utils/battle/grid/layout';
import { sizeOf } from '@/lib/utils/battle/grid/occupancy';
import type { BattleParticipant } from '@/types/battle';
import type { GridPoint } from '@/types/battle-grid';

export function cellPointPx(
    anchor: GridPoint,
    size: number,
    win: { x: number; y: number; rows?: number },
    pxPerUnit: number,
    rotated = false
): { x: number; y: number } {
    const x = (anchor.x + size / 2 - win.x) * UNIT * pxPerUnit;

    const y = (anchor.y + size / 2 - win.y) * UNIT * pxPerUnit;

    return rotated
        ? { x: (win.rows ?? 0) * UNIT * pxPerUnit - y, y: x }
        : { x, y };
}

export function followTarget(
    id: string | null,
    participants: readonly BattleParticipant[]
): { anchor: GridPoint; size: number } | null {
    const p = id ? participants.find((x) => x.basicInfo.id === id) : undefined;

    const anchor = p?.battleData.position;

    return p && anchor ? { anchor, size: sizeOf(p) } : null;
}

export function participantsCenterPx(
    participants: readonly BattleParticipant[],
    win: { x: number; y: number; rows?: number },
    pxPerUnit: number,
    rotated = false
): { x: number; y: number } | null {
    let x0 = Infinity;

    let y0 = Infinity;

    let x1 = -Infinity;

    let y1 = -Infinity;

    for (const p of participants) {
        const anchor = p.battleData.position;

        if (!anchor) continue;

        const size = sizeOf(p);

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
        rotated
    );
}
