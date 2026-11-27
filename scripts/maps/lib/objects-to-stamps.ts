import { stampDef } from '@/lib/constants/map-art/stamps';
import { tileDefinition } from '@/lib/constants/tilesets/catalog';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import { cellCenter, gridMetrics } from '@/lib/utils/battle/grid/layout';
import type { MapDims } from '@/lib/utils/battle/map-art/scene';
import { CHUNK_SIDE, parseChunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import { decodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import type { ChunkTileLayers } from '@/scripts/maps/lib/tiles-to-scene';
import type { MapArtStamp } from '@/types/battle-map';

export interface ObjectsConversion {
    stamps: MapArtStamp[];
    unknown: number;
    outside: number;
}

export function countObjectCells(tileLayers: ChunkTileLayers): number {
    return Object.values(tileLayers).reduce(
        (sum, l) => sum + (l.objects ? decodeTileChunk(l.objects).filter(Boolean).length : 0),
        0
    );
}

export function objectsToStamps(
    tileLayers: ChunkTileLayers,
    map: MapDims,
    existing: readonly MapArtStamp[]
): ObjectsConversion {
    const grid = gridOf(map);

    const { colStep, rowStep } = gridMetrics(grid);

    const taken = new Set(existing.map((s) => s.id));

    const result: ObjectsConversion = { stamps: [], unknown: 0, outside: 0 };

    for (const [key, layers] of Object.entries(tileLayers)) {
        const at = parseChunkKey(key);

        if (!at || !layers.objects) continue;

        const cells = decodeTileChunk(layers.objects);

        for (let i = 0; i < cells.length; i++) {
            if (!cells[i]) continue;

            const x = at.cx * CHUNK_SIDE + (i % CHUNK_SIDE);

            const y = at.cy * CHUNK_SIDE + Math.floor(i / CHUNK_SIDE);

            if (x >= map.cols || y >= map.rows) {
                result.outside++;

                continue;
            }

            const tile = tileDefinition(cells[i]);

            const def = tile?.layer === 'objects' ? stampDef(tile.key) : undefined;

            if (!tile || !def) {
                result.unknown++;

                continue;
            }

            const id = `t${x}-${y}`;

            if (taken.has(id)) continue;

            const anchor = cellCenter({ x, y }, grid);

            result.stamps.push({
                id,
                asset: def.id,
                x: anchor.x + ((tile.footprint.cols - 1) / 2) * colStep,
                y: anchor.y + ((tile.footprint.rows - 1) / 2) * rowStep,
                rot: 0,
                scale: 1,
                flip: false,
                z: 0,
            });
        }
    }

    return result;
}
