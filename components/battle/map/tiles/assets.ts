import type { TileDefinition } from '@/lib/constants/tilesets/types';
import type { GridWindow } from '@/lib/utils/battle/grid';
import { CHUNK_SIDE, chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import type { TileLayerChunks } from '@/lib/utils/battle/tiles/derive';
import { loadImage } from '@/lib/utils/common/image-decode';

const imagePromises = new Map<string, Promise<HTMLImageElement>>();

const ASSET_DIRECTORY: Partial<Record<TileDefinition['layer'], string>> = {
    ground: 'ground',
    wallfill: 'wallfill',
    objects: 'objects',
    'edge-art': 'edges',
} as const;

export function tileAssetUrl(definition: TileDefinition): string {
    const directory = ASSET_DIRECTORY[definition.layer];

    if (!directory || !definition.assetFile)
        throw new Error('Tile has no raster asset');

    return `/assets/battle-tiles/${directory}/${definition.assetFile}`;
}

export function visibleTileIds(
    chunks: TileLayerChunks,
    window: GridWindow,
    chunkMargin = 1
): number[] {
    const ids = new Set<number>();

    const left = Math.max(0, window.x - chunkMargin);

    const top = Math.max(0, window.y - chunkMargin);

    const right = window.x + window.cols + chunkMargin;

    const bottom = window.y + window.rows + chunkMargin;

    const startCx = Math.floor(left / CHUNK_SIDE);

    const startCy = Math.floor(top / CHUNK_SIDE);

    const endCx = Math.floor((right - 1) / CHUNK_SIDE);

    const endCy = Math.floor((bottom - 1) / CHUNK_SIDE);

    for (const layerChunks of Object.values(chunks)) {
        for (let cy = startCy; cy <= endCy; cy++) {
            for (let cx = startCx; cx <= endCx; cx++) {
                const chunk = layerChunks?.[chunkKey(cx, cy)];

                if (!chunk) continue;

                const minX = Math.max(left, cx * CHUNK_SIDE);

                const minY = Math.max(top, cy * CHUNK_SIDE);

                const maxX = Math.min(right, (cx + 1) * CHUNK_SIDE);

                const maxY = Math.min(bottom, (cy + 1) * CHUNK_SIDE);

                for (let y = minY; y < maxY; y++) {
                    for (let x = minX; x < maxX; x++) {
                        const id =
                            chunk[
                                (y % CHUNK_SIDE) * CHUNK_SIDE + (x % CHUNK_SIDE)
                            ];

                        if (id) ids.add(id);
                    }
                }
            }
        }
    }

    return [...ids].sort((a, b) => a - b);
}

export function loadTileImage(
    definition: TileDefinition
): Promise<HTMLImageElement> {
    const url = tileAssetUrl(definition);

    const cached = imagePromises.get(url);

    if (cached) return cached;

    const promise = loadImage(url).catch((error: unknown) => {
        imagePromises.delete(url);
        throw error;
    });

    imagePromises.set(url, promise);

    return promise;
}
