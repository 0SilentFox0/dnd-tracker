import { gridOf } from '@/lib/utils/battle/grid/geometry';
import type { MapDims } from '@/lib/utils/battle/map-art/scene';
import { CHUNK_CELLS } from '@/lib/utils/battle/map-storage/chunk-key';
import {
    applyTileStroke,
    type TileCellChange,
    type TileEditTool,
} from '@/lib/utils/battle/tiles/edit';
import { decodeTileChunk, encodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import type { GridPoint } from '@/types/battle-grid';
import type { MapArtScene } from '@/types/battle-map';

export type FloorChunks = Record<string, Uint16Array>;

export function decodeFloors(floors: MapArtScene['floors']): FloorChunks {
    return Object.fromEntries(
        Object.entries(floors).map(([k, data]) => [k, decodeTileChunk(data)])
    );
}

export function encodeFloors(chunks: FloorChunks): MapArtScene['floors'] {
    return Object.fromEntries(
        Object.entries(chunks)
            .filter(([, cells]) => cells.length === CHUNK_CELLS && cells.some(Boolean))
            .map(([k, cells]) => [k, encodeTileChunk(cells)])
    );
}

export function applyFloorStroke(input: {
    chunks: FloorChunks;
    points: readonly GridPoint[];
    code: number;
    brushSize: number;
    tool: TileEditTool;
    map: MapDims;
}): { chunks: FloorChunks; changes: TileCellChange[] } {
    const { chunks, points, code, brushSize, tool, map } = input;

    const result = applyTileStroke({
        chunks: { ground: chunks },
        layer: 'ground',
        points,
        tileId: code,
        brushSize,
        tool,
        mapSize: { cols: map.cols, rows: map.rows },
        grid: gridOf(map),
    });

    return { chunks: { ...(result.chunks.ground ?? {}) }, changes: result.changes };
}
