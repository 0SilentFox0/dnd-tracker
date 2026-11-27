import { describe, expect, it } from 'vitest';

import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import { encodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import { countObjectCells, objectsToStamps } from '@/scripts/maps/lib/objects-to-stamps';

const codeOf = (key: string) => {
    const tile = TILE_CATALOG.find((t) => t.key === key && t.layer === 'objects');

    if (!tile) throw new Error(`no tile ${key}`);

    return tile.id;
};

const chunk = (cells: Record<number, number>) => {
    const arr = new Uint16Array(256);

    for (const [i, v] of Object.entries(cells)) arr[Number(i)] = v;

    return encodeTileChunk(arr);
};

const map = { cols: 10, rows: 10, gridType: 'square' as const };

describe('objectsToStamps', () => {
    it('centres a 1x1 object on its cell', () => {
        const layers = { '0:0': { objects: chunk({ [4 * 16 + 3]: codeOf('barrel') }) } };

        const { stamps } = objectsToStamps(layers, map, []);

        expect(stamps).toEqual([
            {
                id: 't3-4',
                asset: 'barrel',
                x: 350,
                y: 450,
                rot: 0,
                scale: 1,
                flip: false,
                z: 0,
            },
        ]);
    });

    it('anchors a multi-cell object at its top-left cell', () => {
        const layers = { '0:0': { objects: chunk({ 0: codeOf('table-long') }) } };

        expect(objectsToStamps(layers, map, []).stamps[0]).toMatchObject({
            x: 100,
            y: 50,
        });
    });

    it('counts unknown codes and cells outside the map', () => {
        const layers = {
            '0:0': { objects: chunk({ 0: 60000, 12: codeOf('barrel') }) },
        };

        const result = objectsToStamps(layers, map, []);

        expect(result).toMatchObject({ stamps: [], unknown: 1, outside: 1 });
        expect(countObjectCells(layers)).toBe(2);
    });

    it('is idempotent against existing stamps', () => {
        const layers = { '0:0': { objects: chunk({ 0: codeOf('barrel') }) } };

        const first = objectsToStamps(layers, map, []);

        expect(objectsToStamps(layers, map, first.stamps).stamps).toEqual([]);
    });
});
