import { HERO_DRAG_THRESHOLD_PX } from '@/lib/constants/world';
import type { MapPoint } from '@/types/world';

const DROP_EPS = 0.002;

export function dragGroup(clusterIds: string[], selected: string[]): string[] {
    const picked = new Set(selected);

    if (!clusterIds.some((id) => picked.has(id))) return clusterIds;

    return [...new Set([...selected, ...clusterIds])];
}

export function exceedsDragThreshold(
    start: { x: number; y: number },
    now: { x: number; y: number },
    px = HERO_DRAG_THRESHOLD_PX
): boolean {
    return Math.hypot(now.x - start.x, now.y - start.y) > px;
}

export function dropIsNoop(
    group: { x: number; y: number }[],
    to: MapPoint,
    eps = DROP_EPS
): boolean {
    return group.every((p) => Math.hypot(p.x - to.x, p.y - to.y) < eps);
}
