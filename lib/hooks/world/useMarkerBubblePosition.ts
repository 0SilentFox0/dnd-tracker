import { clamp } from '@/lib/utils/common/clamp';
import type { MapPoint } from '@/types/world';

const GAP = 14;

interface Args {
    point: MapPoint;
    box: { width: number; height: number };
    crop?: { x: number; y: number };
    zoom: number;
    offset: { x: number; y: number };
    size: { width: number; height: number };
}

export interface BubblePosition {
    left: number;
    top: number;
    placement: 'above' | 'below';
}

export function markerBubblePosition({
    point,
    box,
    crop = { x: 0, y: 0 },
    zoom,
    offset,
    size,
}: Args): BubblePosition {
    const ax = point.x * box.width * zoom + offset.x;

    const ay = point.y * box.height * zoom + offset.y;

    const above = ay - size.height - GAP;

    const placement = above >= crop.y ? 'above' : 'below';

    return {
        left: clamp(
            ax - size.width / 2,
            crop.x,
            Math.max(crop.x, box.width - crop.x - size.width)
        ),
        top: clamp(
            placement === 'above' ? above : ay + GAP,
            crop.y,
            Math.max(crop.y, box.height - crop.y - size.height)
        ),
        placement,
    };
}

export const useMarkerBubblePosition = (args: Args): BubblePosition =>
    markerBubblePosition(args);
