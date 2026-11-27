import { gridOf } from '@/lib/utils/battle/grid/geometry';
import {
    cellAtUnitPoint,
    cellCenter,
    gridMetrics,
    UNIT,
} from '@/lib/utils/battle/grid/layout';
import type { MapDims } from '@/lib/utils/battle/map-art/scene';

type Point = { x: number; y: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Centre that lines a cols x rows footprint up with the grid: even sides sit on cell edges, odd ones on cell centres. */
export function snapStampCenter(
    at: Point,
    footprint: { cols: number; rows: number; rot: number },
    map: MapDims
): Point {
    const grid = gridOf(map);

    const quarter = Math.round(footprint.rot / 90) % 2 !== 0;

    const cols = quarter ? footprint.rows : footprint.cols;

    const rows = quarter ? footprint.cols : footprint.rows;

    const evenX = cols % 2 === 0;

    const evenY = rows % 2 === 0;

    if (grid === 'square')
        return {
            x: evenX
                ? clamp(Math.round(at.x / UNIT), 0, map.cols) * UNIT
                : (clamp(Math.floor(at.x / UNIT), 0, map.cols - 1) + 0.5) * UNIT,
            y: evenY
                ? clamp(Math.round(at.y / UNIT), 0, map.rows) * UNIT
                : (clamp(Math.floor(at.y / UNIT), 0, map.rows - 1) + 0.5) * UNIT,
        };

    const cell = cellAtUnitPoint(at, grid);

    const c = cellCenter(
        {
            x: clamp(cell.x, 0, map.cols - 1),
            y: clamp(cell.y, 0, map.rows - 1),
        },
        grid
    );

    const { colStep, rowStep } = gridMetrics(grid);

    return {
        x: c.x + (evenX ? colStep / 2 : 0),
        y: c.y + (evenY ? rowStep / 2 : 0),
    };
}
