import { clamp } from '@/lib/utils/common/clamp';
import type { MapPoint } from '@/types/world';

const GAP = 14;

interface Args {
    point: MapPoint;
    box: { width: number; height: number };
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
    zoom,
    offset,
    size,
}: Args): BubblePosition {
    const ax = point.x * box.width * zoom + offset.x;

    const ay = point.y * box.height * zoom + offset.y;

    const above = ay - size.height - GAP;

    const placement = above >= 0 ? 'above' : 'below';

    return {
        left: clamp(
            ax - size.width / 2,
            0,
            Math.max(0, box.width - size.width)
        ),
        top: clamp(
            placement === 'above' ? above : ay + GAP,
            0,
            Math.max(0, box.height - size.height)
        ),
        placement,
    };
}

export const useMarkerBubblePosition = (args: Args): BubblePosition =>
    markerBubblePosition(args);
