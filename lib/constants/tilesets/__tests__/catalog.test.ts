import { describe, expect, it } from 'vitest';

import {
    TILE_CATALOG,
    tileDefinition,
    validateTileIdsForLayer,
} from '../catalog';

import enMaps from '@/messages/en/maps.json';
import ukMaps from '@/messages/uk/maps.json';

describe('tile catalog', () => {
    it('has unique ids, keys, and local raster asset files', () => {
        expect(new Set(TILE_CATALOG.map(({ id }) => id)).size).toBe(
            TILE_CATALOG.length
        );
        expect(new Set(TILE_CATALOG.map(({ key }) => key)).size).toBe(
            TILE_CATALOG.length
        );
        expect(
            new Set(
                TILE_CATALOG.map(({ assetFile }) => assetFile).filter(Boolean)
            ).size
        ).toBe(TILE_CATALOG.length - 11);
        expect(TILE_CATALOG.map(({ assetFile }) => assetFile)).toEqual(
            expect.arrayContaining([
                'tiles_stone-floor_1.png',
                'tiles_grass_1.png',
                'tiles_wood-planks_1.png',
                'tiles_wall-stone.png',
                'tiles_barrel.png',
                'tiles_door-wood-closed-cell.png',
            ])
        );
    });

    it('includes the complete local asset catalog for every layer', () => {
        expect({
            ground: TILE_CATALOG.filter((tile) => tile.layer === 'ground')
                .length,
            wallfill: TILE_CATALOG.filter((tile) => tile.layer === 'wallfill')
                .length,
            objects: TILE_CATALOG.filter((tile) => tile.layer === 'objects')
                .length,
            edgeArt: TILE_CATALOG.filter((tile) => tile.layer === 'edge-art')
                .length,
            effects: TILE_CATALOG.filter((tile) => tile.layer === 'effects')
                .length,
        }).toEqual({
            ground: 90,
            wallfill: 6,
            objects: 35,
            edgeArt: 7,
            effects: 11,
        });
    });

    it('has Ukrainian and English labels for every tile', () => {
        for (const tile of TILE_CATALOG) {
            expect(
                ukMaps.tileLabels[tile.key as keyof typeof ukMaps.tileLabels]
            ).toBeTruthy();
            expect(
                enMaps.tileLabels[tile.key as keyof typeof enMaps.tileLabels]
            ).toBeTruthy();
        }
    });

    it('rejects IDs that do not belong to the selected layer', () => {
        expect(() =>
            validateTileIdsForLayer(new Uint16Array([1, 2]), 'ground')
        ).not.toThrow();
        expect(() =>
            validateTileIdsForLayer(new Uint16Array([5]), 'ground')
        ).toThrow(/not valid/i);
        expect(tileDefinition(999)).toBeUndefined();
    });
});
