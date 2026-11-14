import { type ImageSize, MAX_CELL_PX, MIN_CELL_PX } from './background';

import { clamp } from '@/lib/utils/common/clamp';
import type { BattleMapConfig } from '@/types/battle';

export interface PixelRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface GridCalibration {
    backgroundCols: number;
    backgroundRows: number;
    gridOffset: { x: number; y: number };
}

export type NudgeUnit = 'px' | 'cell';

const frac = (v: number) => ((v % 1) + 1) % 1;

/** Обведено клітинку (або квадрат n×n клітинок) у px зображення → масштаб фону й зсув сітки. */
export function fromCellRect(
    img: ImageSize,
    rect: PixelRect,
    n = 1
): GridCalibration {
    const cellW = clamp(rect.w / n, MIN_CELL_PX, MAX_CELL_PX);

    const cellH = clamp(rect.h / n, MIN_CELL_PX, MAX_CELL_PX);

    return {
        backgroundCols: img.width / cellW,
        backgroundRows: img.height / cellH,
        gridOffset: { x: frac(rect.x / cellW), y: frac(rect.y / cellH) },
    };
}

/** Зсув сітки по фону: px — частка impliedCellPx, cell — частка клітинки; обгортається в [0, 1). */
export function nudge(
    map: Pick<BattleMapConfig, 'gridOffset'>,
    dx: number,
    dy: number,
    unit: NudgeUnit,
    cellPx: number
): { gridOffset: { x: number; y: number } } {
    const k = unit === 'px' ? 1 / cellPx : 1;

    const { x, y } = map.gridOffset ?? { x: 0, y: 0 };

    return { gridOffset: { x: frac(x + dx * k), y: frac(y + dy * k) } };
}
