import { parseEdgeKey, UNIT } from '@/lib/utils/battle/grid';

export const WALL_WIDTH = 10;

const HALF = WALL_WIDTH / 2;

/** Прямокутник ребра "x:y:e" / "x:y:s" із кінцями, що заходять у кути. */
export function edgeRect(
    edge: string,
    width = WALL_WIDTH
): { x: number; y: number; width: number; height: number } {
    const { a, side } = parseEdgeKey(edge);

    const half = width / 2;

    if (side === 'e')
        return {
            x: (a.x + 1) * UNIT - half,
            y: a.y * UNIT - HALF,
            width,
            height: UNIT + WALL_WIDTH,
        };

    return {
        x: a.x * UNIT - HALF,
        y: (a.y + 1) * UNIT - half,
        width: UNIT + WALL_WIDTH,
        height: width,
    };
}
