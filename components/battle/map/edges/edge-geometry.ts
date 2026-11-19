import { EDGE_WALL_WIDTH } from '@/lib/constants/battle';
import { parseEdgeKey, UNIT } from '@/lib/utils/battle/grid';

const HALF = EDGE_WALL_WIDTH / 2;

export function edgeRect(
    edge: string,
    width = EDGE_WALL_WIDTH
): { x: number; y: number; width: number; height: number } {
    const { a, side } = parseEdgeKey(edge);

    const half = width / 2;

    if (side === 'e')
        return {
            x: (a.x + 1) * UNIT - half,
            y: a.y * UNIT - HALF,
            width,
            height: UNIT + EDGE_WALL_WIDTH,
        };

    return {
        x: a.x * UNIT - HALF,
        y: (a.y + 1) * UNIT - half,
        width: UNIT + EDGE_WALL_WIDTH,
        height: width,
    };
}
