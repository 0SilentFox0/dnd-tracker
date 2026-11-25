import {
    type ImageSize,
    MAX_CELL_PX,
    MIN_CELL_PX,
    stepRatio,
} from './background';

import { clamp } from '@/lib/utils/common/clamp';
import type { BattleMapConfig, GridKind } from '@/types/battle-grid';

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

export function fromCellRect(
    img: ImageSize,
    rect: PixelRect,
    n = 1,
    grid: GridKind = 'square'
): GridCalibration {
    const { kx, ky } = stepRatio(grid);

    const cellW = clamp((rect.w * kx) / n, MIN_CELL_PX, MAX_CELL_PX);

    const cellH = clamp((rect.h * ky) / n, MIN_CELL_PX, MAX_CELL_PX);

    return {
        backgroundCols: img.width / cellW,
        backgroundRows: img.height / cellH,
        gridOffset: { x: frac(rect.x / cellW), y: frac(rect.y / cellH) },
    };
}

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
