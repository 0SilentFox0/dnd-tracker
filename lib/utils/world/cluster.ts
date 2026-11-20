import type { MapPoint } from '@/types/world';

export interface PixelCluster<T> {
    key: string;
    point: MapPoint;
    items: T[];
}

interface ClusterOptions<T> {
    key(item: T): string;
    point(item: T): MapPoint;
    px(item: T): { x: number; y: number };
    threshold: number;
}

/** Greedy in input order: the first item of a group is its anchor and representative. */
export function clusterByPixel<T>(
    items: readonly T[],
    { key, point, px, threshold }: ClusterOptions<T>
): PixelCluster<T>[] {
    const groups: (PixelCluster<T> & { at: { x: number; y: number } })[] = [];

    for (const item of items) {
        const at = px(item);

        const home = groups.find(
            (g) => Math.hypot(g.at.x - at.x, g.at.y - at.y) < threshold
        );

        if (home) home.items.push(item);
        else
            groups.push({
                key: key(item),
                point: point(item),
                items: [item],
                at,
            });
    }

    return groups.map(({ at: _at, ...g }) => g);
}

const SPREAD_MARGIN = 1.15;

const MIN_STEP = 1.5;

/** Zoom that splits the closest pair, or null when the list must open instead (max zoom or duplicates). */
export function clusterZoom(
    points: readonly MapPoint[],
    view: {
        zoom: number;
        box: { width: number; height: number };
        threshold: number;
        maxZoom: number;
    }
): number | null {
    if (view.zoom >= view.maxZoom) return null;

    let closest = Infinity;

    for (let i = 0; i < points.length; i++)
        for (let j = i + 1; j < points.length; j++)
            closest = Math.min(
                closest,
                Math.hypot(
                    (points[i].x - points[j].x) * view.box.width,
                    (points[i].y - points[j].y) * view.box.height
                )
            );

    if (!(closest > 0) || !Number.isFinite(closest)) return null;

    return Math.min(
        view.maxZoom,
        Math.max(view.zoom * MIN_STEP, (view.threshold / closest) * SPREAD_MARGIN)
    );
}

export function clusterCenter(points: readonly MapPoint[]): MapPoint {
    const xs = points.map((p) => p.x);

    const ys = points.map((p) => p.y);

    return {
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
}
