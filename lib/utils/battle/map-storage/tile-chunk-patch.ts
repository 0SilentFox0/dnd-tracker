import { chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import { EMPTY_EDGE_CHUNK } from '@/lib/utils/battle/map-storage/edge-chunks';
import type { TileLayer } from '@/lib/utils/battle/tiles/types';

export type TileLayerRecord = Partial<Record<TileLayer, string>>;

export interface TilePatchInput {
    layer: TileLayer;
    cx: number;
    cy: number;
    data: string | null;
}

export interface ExistingTileChunk {
    data: string;
    layers: TileLayerRecord | undefined;
}

export type TileChunkWrite =
    | { kind: 'delete'; key: string; cx: number; cy: number }
    | {
          kind: 'upsert';
          key: string;
          cx: number;
          cy: number;
          data: string;
          layers: TileLayerRecord | null;
      };

export interface TileChunkPlan {
    nextLayers: Map<string, TileLayerRecord | null>;
    writes: TileChunkWrite[];
}

export function tilePatchKeys(patches: readonly TilePatchInput[]): string[] {
    return [...new Set(patches.map(({ cx, cy }) => chunkKey(cx, cy)))];
}

function sameLayers(a: TileLayerRecord | undefined, b: TileLayerRecord | null) {
    const left = Object.entries(a ?? {});
    const right = Object.entries(b ?? {});

    if (left.length !== right.length) return false;

    return left.every(([layer, data]) => b?.[layer as TileLayer] === data);
}

export function planTileChunkWrites(
    patches: readonly TilePatchInput[],
    existing: ReadonlyMap<string, ExistingTileChunk>
): TileChunkPlan {
    const nextLayers = new Map<string, TileLayerRecord | null>();

    for (const { layer, cx, cy, data } of patches) {
        const key = chunkKey(cx, cy);

        const layers = nextLayers.get(key) ?? { ...existing.get(key)?.layers };

        if (data === null) delete layers[layer];
        else layers[layer] = data;

        nextLayers.set(key, layers);
    }

    const writes: TileChunkWrite[] = [];

    for (const [key, layers] of nextLayers) {
        const [cx, cy] = key.split(':').map(Number);

        const before = existing.get(key);

        const next = layers && Object.keys(layers).length ? layers : null;

        if (!next) nextLayers.set(key, null);

        if (sameLayers(before?.layers, next)) continue;

        if (!next && (!before || before.data === EMPTY_EDGE_CHUNK)) {
            if (before) writes.push({ kind: 'delete', key, cx, cy });
            continue;
        }

        writes.push({
            kind: 'upsert',
            key,
            cx,
            cy,
            data: before?.data ?? EMPTY_EDGE_CHUNK,
            layers: next,
        });
    }

    return { nextLayers, writes };
}
