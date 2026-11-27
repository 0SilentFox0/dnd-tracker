import { stepRatio } from '@/lib/utils/battle/grid/background';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import { mapSize, UNIT } from '@/lib/utils/battle/grid/layout';
import type { MapDims } from '@/lib/utils/battle/map-art/scene';
import { clamp } from '@/lib/utils/common/clamp';

export const BAKE = {
    maxSidePx: 8192,
    maxCellPx: 140,
    minCellPx: 32,
    maxBytes: 8 * 1024 * 1024,
    quality: 0.85,
    attempts: 3,
} as const;

export function bakeCellPx(map: MapDims): number {
    const size = mapSize(map, gridOf(map));

    const side = Math.max(size.width, size.height) / UNIT;

    return clamp(
        Math.floor(BAKE.maxSidePx / side),
        BAKE.minCellPx,
        BAKE.maxCellPx
    );
}

export function bakePixelSize(
    map: MapDims,
    cellPx: number
): { width: number; height: number } {
    const size = mapSize(map, gridOf(map));

    return {
        width: Math.ceil((size.width / UNIT) * cellPx),
        height: Math.ceil((size.height / UNIT) * cellPx),
    };
}

export function nextBakeCellPx(cellPx: number, bytes: number): number {
    return Math.max(
        BAKE.minCellPx,
        Math.floor(cellPx * Math.sqrt(BAKE.maxBytes / bytes) * 0.95)
    );
}

export function bakedBackgroundSpan(map: MapDims): {
    backgroundCols: number;
    backgroundRows: number;
} {
    const grid = gridOf(map);

    const { kx, ky } = stepRatio(grid);

    const size = mapSize(map, grid);

    return {
        backgroundCols: size.width / (UNIT * kx),
        backgroundRows: size.height / (UNIT * ky),
    };
}
