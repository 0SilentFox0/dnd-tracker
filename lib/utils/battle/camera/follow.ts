import { UNIT } from '@/lib/utils/battle/grid/layout';
import { sizeOf } from '@/lib/utils/battle/grid/occupancy';
import type { BattleParticipant } from '@/types/battle';
import type { GridPoint } from '@/types/battle-grid';

export function cellPointPx(
    anchor: GridPoint,
    size: number,
    win: { x: number; y: number },
    pxPerUnit: number
): { x: number; y: number } {
    return {
        x: (anchor.x + size / 2 - win.x) * UNIT * pxPerUnit,
        y: (anchor.y + size / 2 - win.y) * UNIT * pxPerUnit,
    };
}

export function followTarget(
    id: string | null,
    participants: readonly BattleParticipant[]
): { anchor: GridPoint; size: number } | null {
    const p = id ? participants.find((x) => x.basicInfo.id === id) : undefined;

    const anchor = p?.battleData.position;

    return p && anchor ? { anchor, size: sizeOf(p) } : null;
}
