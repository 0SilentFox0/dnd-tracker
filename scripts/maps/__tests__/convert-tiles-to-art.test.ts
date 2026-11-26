import { describe, expect, it } from 'vitest';

import { FLOOR_MATERIALS } from '@/lib/constants/map-art/materials';
import { mapArtSaveSchema } from '@/lib/schemas/map-art';
import { decodeTileChunk, encodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import {
    countFloorCells,
    hasFloorLayers,
    stripArtLayers,
    tilesToScene,
} from '@/scripts/maps/lib/tiles-to-scene';

const [A, B] = FLOOR_MATERIALS.map((m) => m.code);

const chunk = (cells: Record<number, number>) => {
    const arr = new Uint16Array(256);

    for (const [i, v] of Object.entries(cells)) arr[Number(i)] = v;

    return encodeTileChunk(arr);
};

const map = {
    cols: 10,
    rows: 10,
    walls: ['2:2:e'],
    doors: { '3:3:e': { open: false, locked: true } },
    blocked: ['1:1'],
};

describe('tilesToScene', () => {
    it('layers wallfill over ground and keeps map walls', () => {
        const scene = tilesToScene(
            {
                '0:0': {
                    ground: chunk({ 0: A, 1: A }),
                    wallfill: chunk({ 1: B }),
                },
            },
            map
        );

        const cells = decodeTileChunk(scene.floors['0:0']);

        expect(cells[0]).toBe(A);
        expect(cells[1]).toBe(B);
        expect(scene.walls['2:2:e']).toBeDefined();
        expect(scene.openings['3:3:e']).toMatchObject({
            kind: 'door',
            locked: true,
        });
        expect(scene.blocked['1:1']).toBeNull();
    });

    it('drops non-floor codes and cells outside the map', () => {
        const scene = tilesToScene(
            { '0:0': { ground: chunk({ 0: 60000, 5: A, 255: A }) } },
            map
        );

        const cells = decodeTileChunk(scene.floors['0:0']);

        expect(cells[0]).toBe(0);
        expect(cells[5]).toBe(A);
        expect(cells[255]).toBe(0);
        expect(countFloorCells(scene)).toBe(1);
    });

    it('produces a scene valid for mapArtSaveSchema', () => {
        const scene = tilesToScene({ '0:0': { ground: chunk({ 0: A }) } }, map);

        const result = mapArtSaveSchema.safeParse({
            save: {
                name: 'Cave',
                map: { cols: 10, rows: 10, background: null, opacity: 0.5 },
                expectedVersion: 1,
            },
            scene,
            expectedSceneVersion: 0,
        });

        expect(result.success).toBe(true);
    });
});

describe('hasFloorLayers', () => {
    it('is false for objects-only maps', () => {
        expect(hasFloorLayers({ '0:0': { objects: 'x' } })).toBe(false);
        expect(hasFloorLayers({ '0:0': { ground: 'x' } })).toBe(true);
    });
});

describe('stripArtLayers', () => {
    it('keeps objects and returns null when nothing remains', () => {
        expect(
            stripArtLayers({
                ground: 'a',
                wallfill: 'b',
                'edge-art': 'c',
                effects: 'd',
                objects: 'o',
            })
        ).toEqual({ objects: 'o' });

        expect(stripArtLayers({ ground: 'a', effects: 'd' })).toBeNull();
    });
});
