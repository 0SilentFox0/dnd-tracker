import { isFloorCode } from '@/lib/constants/map-art/materials';
import { clipScene, sceneFromMap } from '@/lib/utils/battle/map-art/scene';
import { CHUNK_CELLS } from '@/lib/utils/battle/map-storage/chunk-key';
import { decodeTileChunk, encodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import type { TileLayer } from '@/lib/utils/battle/tiles/types';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { MapArtScene } from '@/types/battle-map';

export type ChunkTileLayers = Record<
    string,
    Partial<Record<TileLayer, string>>
>;

export type ConvertMap = Pick<
    BattleMapConfig,
    'cols' | 'rows' | 'gridType' | 'walls' | 'bars' | 'doors' | 'blocked'
>;

export const ART_LAYERS = [
    'ground',
    'wallfill',
    'edge-art',
    'effects',
] as const;

export interface DroppedLayers {
    edgeArt: number;
    effects: number;
}

/** Painted cells in the layers that conversion discards without a replacement. */
export function countDroppedLayers(tileLayers: ChunkTileLayers): DroppedLayers {
    const dropped: DroppedLayers = { edgeArt: 0, effects: 0 };

    for (const layers of Object.values(tileLayers)) {
        if (layers['edge-art'])
            dropped.edgeArt += decodeTileChunk(layers['edge-art']).filter(
                Boolean
            ).length;

        if (layers.effects)
            dropped.effects += decodeTileChunk(layers.effects).filter(
                Boolean
            ).length;
    }

    return dropped;
}

export const hasFloorLayers = (tileLayers: ChunkTileLayers): boolean =>
    Object.values(tileLayers).some((l) => l.ground || l.wallfill);

/** Ground first, wallfill over it; codes that are not floor materials are dropped. */
export function tilesToScene(
    tileLayers: ChunkTileLayers,
    map: ConvertMap
): MapArtScene {
    return convertTiles(tileLayers, map).scene;
}

export function convertTiles(
    tileLayers: ChunkTileLayers,
    map: ConvertMap
): { scene: MapArtScene; wallsClipped: number } {
    const scene = sceneFromMap(map);

    const chunks: Record<string, Uint16Array> = {};

    for (const layer of ['ground', 'wallfill'] as const) {
        for (const [key, layers] of Object.entries(tileLayers)) {
            const data = layers[layer];

            if (!data) continue;

            const source = decodeTileChunk(data);

            const target = (chunks[key] ??= new Uint16Array(CHUNK_CELLS));

            for (let i = 0; i < source.length; i++)
                if (source[i] && isFloorCode(source[i])) target[i] = source[i];
        }
    }

    const floors = Object.fromEntries(
        Object.entries(chunks)
            .filter(([, cells]) => cells.some(Boolean))
            .map(([k, cells]) => [k, encodeTileChunk(cells)])
    );

    const clipped = clipScene({ ...scene, floors }, map);

    return {
        scene: clipped,
        wallsClipped:
            Object.keys(scene.walls).length - Object.keys(clipped.walls).length,
    };
}

/** Layers that stay on the current chunk row; null when nothing remains. */
export function stripArtLayers(
    layers: Partial<Record<string, string>>
): Record<string, string> | null {
    const kept = Object.fromEntries(
        Object.entries(layers).filter(
            ([k, v]) =>
                typeof v === 'string' &&
                !(ART_LAYERS as readonly string[]).includes(k)
        )
    );

    return Object.keys(kept).length ? (kept as Record<string, string>) : null;
}

export function countFloorCells(scene: MapArtScene): number {
    return Object.values(scene.floors).reduce(
        (sum, data) => sum + decodeTileChunk(data).filter(Boolean).length,
        0
    );
}
