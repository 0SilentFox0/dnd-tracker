import { edgeCellsOf, edgesOfCell } from '@/lib/utils/battle/grid/edge-keys';
import { cellKey } from '@/lib/utils/battle/grid/geometry';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import type { MapDims } from '@/lib/utils/battle/map-art/scene';
import type { GridPoint } from '@/types/battle-grid';

export function roomPerimeter(
    map: MapDims,
    a: GridPoint,
    b: GridPoint
): { cells: GridPoint[]; edges: string[] } {
    const grid = gridOf(map);

    const x0 = Math.max(0, Math.min(a.x, b.x));

    const x1 = Math.min(map.cols - 1, Math.max(a.x, b.x));

    const y0 = Math.max(0, Math.min(a.y, b.y));

    const y1 = Math.min(map.rows - 1, Math.max(a.y, b.y));

    const cells: GridPoint[] = [];

    for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) cells.push({ x, y });

    const inRect = (c: GridPoint) =>
        c.x >= x0 && c.x <= x1 && c.y >= y0 && c.y <= y1;

    const inMap = (c: GridPoint) =>
        c.x >= 0 && c.y >= 0 && c.x < map.cols && c.y < map.rows;

    const edges = new Set<string>();

    for (const cell of cells)
        for (const key of edgesOfCell(grid, cell)) {
            const other = edgeCellsOf(grid, key).find(
                (c) => cellKey(c) !== cellKey(cell)
            );

            if (other && inMap(other) && !inRect(other)) edges.add(key);
        }

    return { cells, edges: [...edges] };
}
