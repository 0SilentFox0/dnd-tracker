import { chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import {
    decodeEdges,
    type EdgeChunks,
} from '@/lib/utils/battle/map-storage/edge-chunks';
import type { BattleMapFull } from '@/types/battle-map';

export type MapGeometry = Pick<BattleMapFull, 'map' | 'walls' | 'bars'>;

const CACHE_LIMIT = 32;

const cache = new Map<string, MapGeometry>();

export const chunksToRecord = (
    rows: { cx: number; cy: number; data: string }[]
): EdgeChunks =>
    Object.fromEntries(rows.map((c) => [chunkKey(c.cx, c.cy), c.data]));

export const recordToChunkRows = (chunks: EdgeChunks) =>
    Object.entries(chunks).map(([key, data]) => {
        const [cx, cy] = key.split(':').map(Number);

        return { cx, cy, data };
    });

export function assembleGeometry(
    header: MapGeometry['map'],
    chunks: EdgeChunks
): MapGeometry {
    const { walls, bars } = decodeEdges(chunks, header.cols, header.rows);

    return { map: header, walls, bars };
}

/** (mapId, version) is immutable, so the decoded result can be shared. */
export async function memoGeometry(
    mapId: string,
    version: number,
    load: () => Promise<MapGeometry | null>
): Promise<MapGeometry | null> {
    const key = `${mapId}:${version}`;

    const hit = cache.get(key);

    if (hit) {
        cache.delete(key);
        cache.set(key, hit);

        return hit;
    }

    const value = await load();

    if (!value) return null;

    cache.set(key, value);

    if (cache.size > CACHE_LIMIT) {
        const oldest = cache.keys().next().value;

        if (oldest !== undefined) cache.delete(oldest);
    }

    return value;
}

export const clearGeometryCache = () => cache.clear();
