import { gridOf, stepNeighbors } from '@/lib/utils/battle/grid/geometry';
import type { FloorChunks } from '@/lib/utils/battle/map-art/floors';
import type { MapDims } from '@/lib/utils/battle/map-art/scene';
import { CHUNK_SIDE, chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import { seedHash } from '@/lib/utils/battle/tiles/variant';

export function floorRegionSeeds(
    chunks: FloorChunks,
    map: MapDims,
    seed: string
): Uint32Array {
    const { cols, rows } = map;

    const dims = { cols, rows, gridType: gridOf(map) };

    const codes = new Uint16Array(cols * rows);

    for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++)
            codes[y * cols + x] =
                chunks[chunkKey(Math.floor(x / CHUNK_SIDE), Math.floor(y / CHUNK_SIDE))]?.[
                    (y % CHUNK_SIDE) * CHUNK_SIDE + (x % CHUNK_SIDE)
                ] ?? 0;

    const seeds = new Uint32Array(cols * rows);

    for (let start = 0; start < codes.length; start++) {
        const code = codes[start];

        if (!code || seeds[start]) continue;

        const value = seedHash(`${seed}:${code}:${start}`) || 1;

        const stack: number[] = [start];

        seeds[start] = value;

        for (let i = stack.pop(); i !== undefined; i = stack.pop()) {
            for (const n of stepNeighbors(dims, { x: i % cols, y: Math.floor(i / cols) })) {
                const j = n.y * cols + n.x;

                if (codes[j] !== code || seeds[j]) continue;

                seeds[j] = value;
                stack.push(j);
            }
        }
    }

    return seeds;
}
