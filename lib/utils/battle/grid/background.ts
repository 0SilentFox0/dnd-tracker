import { MAX_SIDE, MIN_SIDE } from './map-editor';

import { clamp } from '@/lib/utils/common/clamp';
import type { BattleMapConfig } from '@/types/battle-grid';

export interface ImageSize {
    width: number;
    height: number;
}

export const MIN_CELL_PX = 24;

export const MAX_CELL_PX = 200;

export const MAX_GRID_OFFSET = 0.99;

export function gridForCellSize(
    img: ImageSize,
    cellPx: number
): { cols: number; rows: number; backgroundCols: number } {
    return {
        cols: clamp(Math.round(img.width / cellPx), MIN_SIDE, MAX_SIDE),
        rows: clamp(Math.round(img.height / cellPx), MIN_SIDE, MAX_SIDE),
        backgroundCols: img.width / cellPx,
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
    img: ImageSize
): number {
    return Math.round(img.width / backgroundColsOf(map, img));
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
    aspect: number | null
): BackgroundBox {
    const left = -(map.gridOffset?.x ?? 0) * cellPx || 0;

    const top = -(map.gridOffset?.y ?? 0) * cellPx || 0;

    if (map.backgroundCols && aspect) {
        const width = map.backgroundCols * cellPx;

        const height = map.backgroundRows
            ? map.backgroundRows * cellPx
            : width * aspect;

        return { left, top, width, height };
    }

    return { left, top, width: map.cols * cellPx, height: map.rows * cellPx };
}
