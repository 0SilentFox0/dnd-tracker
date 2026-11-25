import { gridMetrics, UNIT } from './layout';
import { MAX_SIDE, MIN_SIDE } from './map-editor';

import { clamp } from '@/lib/utils/common/clamp';
import type { BattleMapConfig, GridKind } from '@/types/battle-grid';

export interface ImageSize {
    width: number;
    height: number;
}

export const MIN_CELL_PX = 24;

export const MAX_CELL_PX = 200;

export const MAX_GRID_OFFSET = 0.99;

/** Step ratios of a cell against UNIT: 1 on square, column step / row step over UNIT on hex. */
export function stepRatio(grid: GridKind): { kx: number; ky: number } {
    const m = gridMetrics(grid);

    return { kx: m.colStep / UNIT, ky: m.rowStep / UNIT };
}

export function gridForCellSize(
    img: ImageSize,
    cellPx: number,
    grid: GridKind = 'square'
): { cols: number; rows: number; backgroundCols: number } {
    const { kx, ky } = stepRatio(grid);

    return {
        cols: clamp(Math.round(img.width / (cellPx * kx)), MIN_SIDE, MAX_SIDE),
        rows: clamp(Math.round(img.height / (cellPx * ky)), MIN_SIDE, MAX_SIDE),
        backgroundCols: img.width / (cellPx * kx),
    };
}

export function backgroundColsOf(
    map: Pick<BattleMapConfig, 'cols' | 'rows' | 'backgroundCols'>,
    img: ImageSize
): number {
    return (
        map.backgroundCols ??
        Math.min(map.cols, (map.rows * img.width) / img.height)
    );
}

export function backgroundRowsOf(
    map: Pick<
        BattleMapConfig,
        'cols' | 'rows' | 'backgroundCols' | 'backgroundRows'
    >,
    img: ImageSize
): number {
    return (
        map.backgroundRows ??
        (backgroundColsOf(map, img) * img.height) / img.width
    );
}

export function impliedCellPx(
    map: Pick<BattleMapConfig, 'cols' | 'rows' | 'backgroundCols'>,
    img: ImageSize,
    grid: GridKind = 'square'
): number {
    return Math.round(
        img.width / (backgroundColsOf(map, img) * stepRatio(grid).kx)
    );
}

export interface BackgroundBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

export function backgroundBox(
    map: Pick<
        BattleMapConfig,
        'cols' | 'rows' | 'backgroundCols' | 'backgroundRows' | 'gridOffset'
    >,
    cellPx: number,
    aspect: number | null,
    grid: GridKind = 'square'
): BackgroundBox {
    const { kx, ky } = stepRatio(grid);

    const left = -(map.gridOffset?.x ?? 0) * cellPx * kx || 0;

    const top = -(map.gridOffset?.y ?? 0) * cellPx * ky || 0;

    if (map.backgroundCols && aspect) {
        const span = gridMetrics(grid).size(map);

        const fillTo = (size: number, edge: number, full: number) => {
            const gap = full - (edge + size);

            return gap > 0 && gap < cellPx ? size + gap : size;
        };

        const width = fillTo(
            map.backgroundCols * cellPx * kx,
            left,
            (span.width / UNIT) * cellPx
        );

        const height = map.backgroundRows
            ? map.backgroundRows * cellPx * ky
            : fillTo(
                  map.backgroundCols * cellPx * kx * aspect,
                  top,
                  (span.height / UNIT) * cellPx
              );

        return { left, top, width, height };
    }

    const span = gridMetrics(grid).size(map);

    return {
        left,
        top,
        width: (span.width / UNIT) * cellPx,
        height: (span.height / UNIT) * cellPx,
    };
}
