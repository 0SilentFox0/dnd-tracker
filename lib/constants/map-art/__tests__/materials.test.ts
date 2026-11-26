import { describe, expect, it } from 'vitest';

import {
    DEFAULT_ART,
    FLOOR_MATERIALS,
    floorMaterial,
    isFloorCode,
    OPENING_MATERIALS,
} from '../materials';

import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';

describe('map art materials', () => {
    it('covers 90 ground and 6 wallfill tiles with unique catalog codes', () => {
        const layer = (code: number) =>
            TILE_CATALOG.find((t) => t.id === code)?.layer;

        const codes = FLOOR_MATERIALS.map((m) => m.code);

        expect(new Set(codes).size).toBe(codes.length);
        expect(codes.filter((c) => layer(c) === 'ground')).toHaveLength(90);
        expect(codes.filter((c) => layer(c) === 'wallfill')).toHaveLength(6);
    });

    it('uses battle-tiles textures', () => {
        for (const m of FLOOR_MATERIALS)
            expect(m.texture.startsWith('/assets/battle-tiles/')).toBe(true);
    });

    it('doors have no sprite, other openings use edge art', () => {
        for (const o of OPENING_MATERIALS) {
            if (o.kind === 'door') expect(o.sprite).toBeNull();
            else expect(o.sprite).toContain('/edges/');
        }
    });

    it('resolves floor codes', () => {
        expect(isFloorCode(DEFAULT_ART.floor)).toBe(true);
        expect(floorMaterial(DEFAULT_ART.floor)?.key).toBe('stone-floor');
        expect(isFloorCode(105)).toBe(false);
    });
});
