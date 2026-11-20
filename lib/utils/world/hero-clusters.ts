import { clusterByPixel } from '@/lib/utils/world/cluster';
import type { WorldHero } from '@/types/world';

export const HERO_CLUSTER_PX = 24;

export interface HeroClusterGroup {
    key: string;
    x: number;
    y: number;
    heroes: WorldHero[];
}

export function clusterHeroes(
    heroes: WorldHero[],
    px: (h: WorldHero) => { x: number; y: number },
    thresholdPx: number
): HeroClusterGroup[] {
    const ordered = [
        ...heroes.filter((h) => h.own),
        ...heroes.filter((h) => !h.own),
    ];

    return clusterByPixel(ordered, {
        key: (h) => h.id,
        point: (h) => ({ x: h.x, y: h.y }),
        px,
        threshold: thresholdPx,
    }).map(({ key, point, items }) => ({
        key,
        x: point.x,
        y: point.y,
        heroes: items,
    }));
}
