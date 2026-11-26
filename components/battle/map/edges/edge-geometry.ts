import { EDGE_WALL_WIDTH } from '@/lib/constants/battle';
import { parseEdgeKey, UNIT } from '@/lib/utils/battle/grid';
import { edgeSegment } from '@/lib/utils/battle/grid/edge-keys';
import type { GridKind } from '@/types/battle-grid';

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

export interface EdgeBar {
    cx: number;
    cy: number;
    length: number;
    angle: number;
}

export function edgeBar(grid: GridKind, edge: string): EdgeBar {
    const [p, q] = edgeSegment(grid, edge);

    const dx = q.x - p.x;

    const dy = q.y - p.y;

    return {
        cx: (p.x + q.x) / 2,
        cy: (p.y + q.y) / 2,
        length: Math.hypot(dx, dy),
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    };
}

export function edgeBarProps(bar: EdgeBar, width: number, extend = width) {
    const long = bar.length + extend;

    return {
        x: -long / 2,
        y: -width / 2,
        width: long,
        height: width,
        transform: `translate(${bar.cx} ${bar.cy}) rotate(${bar.angle})`,
    };
}
