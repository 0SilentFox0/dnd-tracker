import { describe, expect, it } from 'vitest';

import {
    TILE_CATALOG,
    tileDefinition,
    validateTileIdsForLayer,
} from '../catalog';

describe('tile catalog', () => {
    it('has unique ids, keys, and pilot asset files', () => {
        expect(new Set(TILE_CATALOG.map(({ id }) => id)).size).toBe(
            TILE_CATALOG.length
        );
        expect(new Set(TILE_CATALOG.map(({ key }) => key)).size).toBe(
            TILE_CATALOG.length
        );
        expect(new Set(TILE_CATALOG.map(({ assetFile }) => assetFile)).size).toBe(
            TILE_CATALOG.length
        );
        expect(TILE_CATALOG.map(({ assetFile }) => assetFile)).toEqual(
            expect.arrayContaining([
                'tiles_stone-floor_1.png',
                'tiles_grass_1.png',
                'tiles_wood-planks_1.png',
                'tiles_wall-stone.png',
                'tiles_barrel.png',
                'tiles_door-wood-closed.png',
            ])
        );
    });

    it('rejects IDs that do not belong to the selected layer', () => {
        expect(() => validateTileIdsForLayer(new Uint16Array([1, 2]), 'ground')).not.toThrow();
        expect(() => validateTileIdsForLayer(new Uint16Array([5]), 'ground')).toThrow(
            /not valid/i
        );
        expect(tileDefinition(99)).toBeUndefined();
    });
});
