// Seeds a furnished dungeon into a campaign's map library for the landing map-editor shot.
// Usage: DATABASE_URL=… DIRECT_URL=… pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/landing/seed-showcase-map.ts <campaignId>
import { battleMapInputSchema } from '@/lib/schemas/battle-maps';
import { createMap } from '@/lib/server/battle-maps/library-service';
import { CHUNK_CELLS, CHUNK_SIDE, chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import { encodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import type { TileLayer } from '@/lib/utils/battle/tiles/types';

const COLS = 32;
const ROWS = 20;

const id = (key: string) => {
    const tile = TILE_CATALOG.find((t) => t.key === key);

    if (!tile) throw new Error(`Unknown tile ${key}`);

    return tile.id;
};

type Rect = [number, number, number, number];

const ROOMS = {
    hall: [1, 1, 13, 9],
    library: [17, 1, 30, 7],
    crypt: [1, 12, 10, 18],
    vault: [22, 11, 30, 18],
} as const satisfies Record<string, Rect>;

const CORRIDORS: Rect[] = [
    [14, 4, 16, 4],
    [5, 10, 5, 11],
    [26, 8, 26, 10],
    [11, 15, 21, 15],
];

const DOORS: Record<string, { open: boolean; locked?: boolean }> = {
    '13:4:e': { open: true },
    '16:4:e': { open: false },
    '5:9:s': { open: false },
    '5:11:s': { open: false, locked: true },
    '26:7:s': { open: true },
    '26:10:s': { open: false },
    '10:15:e': { open: true },
    '21:15:e': { open: false },
};

const layers: Record<TileLayer, Uint16Array> = {
    ground: new Uint16Array(COLS * ROWS),
    wallfill: new Uint16Array(COLS * ROWS),
    objects: new Uint16Array(COLS * ROWS),
    'edge-art': new Uint16Array(COLS * ROWS),
    effects: new Uint16Array(COLS * ROWS),
};

const at = (x: number, y: number) => y * COLS + x;

const fill = (layer: TileLayer, [x1, y1, x2, y2]: Rect, tile: string) => {
    for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++) layers[layer][at(x, y)] = id(tile);
};

const put = (layer: TileLayer, tile: string, ...cells: [number, number][]) => {
    for (const [x, y] of cells) layers[layer][at(x, y)] = id(tile);
};

const floor = new Set<string>();

for (const [x1, y1, x2, y2] of [...Object.values(ROOMS), ...CORRIDORS])
    for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++) floor.add(`${x}:${y}`);

fill('wallfill', [0, 0, COLS - 1, ROWS - 1], 'wall-brick');

for (const key of floor) {
    const [x, y] = key.split(':').map(Number);

    layers.wallfill[at(x, y)] = 0;
}

fill('ground', ROOMS.hall, 'marble-tile-1');
fill('ground', [1, 4, 13, 5], 'carpet-red-1');
fill('ground', ROOMS.library, 'wood-planks-2');
fill('ground', ROOMS.crypt, 'cracked-flagstone-1');
fill('ground', [1, 12, 3, 13], 'mossy-stone-1');
fill('ground', [4, 15, 6, 17], 'magic-glyphs-1');
fill('ground', ROOMS.vault, 'brick-floor-1');
fill('ground', [24, 13, 28, 16], 'carpet-red-2');

for (const rect of CORRIDORS) fill('ground', rect, 'cobblestone-1');

put('objects', 'pillar', [3, 2], [3, 7], [8, 2], [8, 7], [2, 16], [9, 16], [23, 12], [23, 17], [29, 17]);
put('objects', 'statue', [1, 2], [1, 7], [30, 18]);
put('objects', 'brazier', [12, 2], [12, 7], [1, 18], [10, 18], [17, 2], [30, 2]);
put('objects', 'barrel', [13, 9], [13, 1]);
put('objects', 'crate', [12, 9]);
put('objects', 'bookshelf', ...Array.from({ length: 14 }, (_, i): [number, number] => [17 + i, 1]).filter(([x]) => x !== 17 && x !== 30));
put('objects', 'table-long', [20, 4], [28, 5]);
put('objects', 'chair', [20, 3], [21, 3], [20, 5], [21, 5], [28, 4], [29, 4]);
put('objects', 'cauldron', [29, 6]);
put('objects', 'chest-closed', [24, 12], [28, 11], [25, 18]);
put('objects', 'chest-open', [29, 16]);
put('objects', 'treasure-pile', [27, 14], [30, 12], [23, 15]);
put('objects', 'stairs-down', [30, 17]);
put('objects', 'grave', [2, 14], [4, 13], [6, 13], [8, 13], [8, 14]);
put('objects', 'bones', [3, 16], [9, 17], [7, 12]);
put('objects', 'altar', [5, 17]);
put('objects', 'cobweb', [1, 12], [10, 12], [30, 7]);
put('objects', 'blood-stain', [6, 16], [4, 17]);
put('objects', 'fountain', [6, 6]);
put('objects', 'rubble-pile', [10, 13]);

put('effects', 'glow-effect', [5, 17], [5, 16], [12, 2], [12, 7], [27, 14], [30, 12]);
put('effects', 'flame-effect', [1, 18], [10, 18], [17, 2], [30, 2]);
put('effects', 'gold-effect', [23, 15], [27, 14]);

const walls: string[] = [];

for (const key of floor) {
    const [x, y] = key.split(':').map(Number);

    for (const [dx, dy, side] of [[1, 0, 'e'], [0, 1, 's']] as const)
        if (x + dx < COLS && y + dy < ROWS && !floor.has(`${x + dx}:${y + dy}`))
            walls.push(`${x}:${y}:${side}`);

    for (const [dx, dy, ox, oy, side] of [[-1, 0, -1, 0, 'e'], [0, -1, 0, -1, 's']] as const)
        if (x + dx >= 0 && y + dy >= 0 && !floor.has(`${x + dx}:${y + dy}`))
            walls.push(`${x + ox}:${y + oy}:${side}`);
}

const snapshot: Record<string, Partial<Record<TileLayer, string>>> = {};

for (let cy = 0; cy < Math.ceil(ROWS / CHUNK_SIDE); cy++)
    for (let cx = 0; cx < Math.ceil(COLS / CHUNK_SIDE); cx++) {
        const entry: Partial<Record<TileLayer, string>> = {};

        for (const layer of Object.keys(layers) as TileLayer[]) {
            const cells = new Uint16Array(CHUNK_CELLS);

            let any = false;

            for (let i = 0; i < CHUNK_CELLS; i++) {
                const x = cx * CHUNK_SIDE + (i % CHUNK_SIDE);
                const y = cy * CHUNK_SIDE + Math.floor(i / CHUNK_SIDE);

                if (x >= COLS || y >= ROWS) continue;

                cells[i] = layers[layer][at(x, y)];
                any ||= cells[i] !== 0;
            }

            if (any) entry[layer] = encodeTileChunk(cells);
        }

        if (Object.keys(entry).length) snapshot[chunkKey(cx, cy)] = entry;
    }

const campaignId = process.argv[2];

if (!campaignId) throw new Error('campaignId required');

const input = battleMapInputSchema.parse({
    name: 'Crypt of the Silent Bell',
    map: {
        gridType: 'square',
        cols: COLS,
        rows: ROWS,
        background: null,
        opacity: 1,
        doors: DOORS,
    },
    walls: [...new Set(walls)],
    bars: [],
});

createMap(campaignId, input, snapshot)
    .then((brief) => {
        console.log(JSON.stringify(brief));
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
