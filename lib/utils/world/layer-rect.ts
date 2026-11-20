import { WORLD_LAYER_COORD, WORLD_LAYER_SIZE } from '@/lib/constants/world';
import { clamp } from '@/lib/utils/common/clamp';
import type { LayerRect } from '@/types/world';

export type RectCorner = 'nw' | 'ne' | 'sw' | 'se';

export const clampRect = (r: LayerRect): LayerRect => ({
    x: clamp(r.x, WORLD_LAYER_COORD.min, WORLD_LAYER_COORD.max),
    y: clamp(r.y, WORLD_LAYER_COORD.min, WORLD_LAYER_COORD.max),
    w: clamp(r.w, WORLD_LAYER_SIZE.min, WORLD_LAYER_SIZE.max),
    h: clamp(r.h, WORLD_LAYER_SIZE.min, WORLD_LAYER_SIZE.max),
});

export const moveRect = (r: LayerRect, dx: number, dy: number): LayerRect =>
    clampRect({ ...r, x: r.x + dx, y: r.y + dy });

// the corner opposite to the dragged one stays fixed
export function resizeRect(
    r: LayerRect,
    corner: RectCorner,
    dx: number,
    dy: number
): LayerRect {
    const west = corner === 'nw' || corner === 'sw';

    const north = corner === 'nw' || corner === 'ne';

    const w = clamp(
        west ? r.w - dx : r.w + dx,
        WORLD_LAYER_SIZE.min,
        WORLD_LAYER_SIZE.max
    );

    const h = clamp(
        north ? r.h - dy : r.h + dy,
        WORLD_LAYER_SIZE.min,
        WORLD_LAYER_SIZE.max
    );

    return clampRect({
        x: west ? r.x + r.w - w : r.x,
        y: north ? r.y + r.h - h : r.y,
        w,
        h,
    });
}
