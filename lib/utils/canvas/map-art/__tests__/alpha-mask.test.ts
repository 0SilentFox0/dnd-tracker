import { describe, expect, it } from 'vitest';

import { alphaHit, type AlphaMask } from '../alpha-mask';
import { pickStamp } from '@/lib/hooks/battle-maps/useStampSelection';
import type { StampDef } from '@/lib/constants/map-art/stamps';
import type { MapArtStamp } from '@/types/battle-map';

const mask = (rows: number[][]): AlphaMask => ({
    w: rows[0].length,
    h: rows.length,
    data: Uint8Array.from(rows.flat()),
});

describe('alphaHit', () => {
    const m = mask([
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
    ]);

    it('is false on a transparent corner and true in the centre', () => {
        expect(alphaHit(m, 0.05, 0.05)).toBe(false);
        expect(alphaHit(m, 0.5, 0.5)).toBe(true);
    });

    it('treats a missing mask as a bbox hit', () => {
        expect(alphaHit(null, 0.01, 0.01)).toBe(true);
    });

    it('handles the 0 and 1 bounds and rejects outside', () => {
        expect(alphaHit(m, 0, 0)).toBe(false);
        expect(alphaHit(m, 1, 1)).toBe(false);
        expect(alphaHit(mask([[1]]), 1, 1)).toBe(true);
        expect(alphaHit(m, -0.1, 0.5)).toBe(false);
        expect(alphaHit(m, 0.5, 1.1)).toBe(false);
    });
});

const def = (id: string, layer: StampDef['layer'], cols = 2, rows = 2): StampDef => ({
    id,
    biome: 'dungeon',
    category: id,
    nameKey: id,
    file: `/${id}.png`,
    cols,
    rows,
    layer,
    shadow: 'none',
    priority: 1,
});

const defs: Record<string, StampDef> = {
    decal: def('decal', 'decal'),
    object: def('object', 'object'),
    canopy: def('canopy', 'canopy'),
};

const lookup = (id: string) => defs[id];

const stamp = (id: string, asset: string, patch: Partial<MapArtStamp> = {}): MapArtStamp => ({
    id,
    asset,
    x: 200,
    y: 200,
    rot: 0,
    scale: 1,
    flip: false,
    z: 0,
    ...patch,
});

const solid = () => null;

describe('pickStamp', () => {
    const at = { x: 200, y: 200 };

    it('prefers the higher layer, then the higher z', () => {
        const list = [stamp('d', 'decal'), stamp('o', 'object'), stamp('c', 'canopy')];

        expect(pickStamp(list, at, solid, lookup)).toBe('c');
        expect(pickStamp(list.slice(0, 2), at, solid, lookup)).toBe('o');

        const same = [stamp('a', 'object', { z: 1 }), stamp('b', 'object', { z: 2 })];

        expect(pickStamp(same, at, solid, lookup)).toBe('b');
    });

    it('falls through a transparent pixel of the top stamp', () => {
        const holes = (asset: string) =>
            asset === 'canopy' ? mask([[0, 0], [0, 0]]) : null;

        const list = [stamp('o', 'object'), stamp('c', 'canopy')];

        expect(pickStamp(list, at, holes, lookup)).toBe('o');
    });

    it('mirrors u for flipped stamps', () => {
        const left = mask([[1, 0], [1, 0]]);

        const masks = () => left;

        const p = { x: 150, y: 200 };

        expect(pickStamp([stamp('o', 'object')], p, masks, lookup)).toBe('o');
        expect(pickStamp([stamp('o', 'object', { flip: true })], p, masks, lookup)).toBeNull();
    });

    it('ignores unknown assets and misses outside the box', () => {
        expect(pickStamp([stamp('x', 'nope')], at, solid, lookup)).toBeNull();
        expect(pickStamp([stamp('o', 'object')], { x: 900, y: 900 }, solid, lookup)).toBeNull();
    });
});
