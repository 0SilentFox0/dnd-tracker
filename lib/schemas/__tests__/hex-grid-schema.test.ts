import { describe, expect, it } from 'vitest';

import { battleMapInputSchema } from '../battle-maps';
import { battleMapSchema } from '../battles';

import { emptyMaze } from '@/lib/utils/battle/modes/maze/constants';

const base = { cols: 10, rows: 10, background: null, opacity: 0.3 };

const lib = (map: object, extra: object = {}) => ({
    name: 'Hex',
    map: { ...base, ...map },
    ...extra,
});

describe('battleMapSchema gridType', () => {
    it('accepts and keeps gridType', () => {
        const r = battleMapSchema.safeParse({ ...base, gridType: 'hex' });

        expect(r.success).toBe(true);
        expect(r.success && r.data.gridType).toBe('hex');
        expect(
            battleMapSchema.safeParse({ ...base, gridType: 'tri' }).success
        ).toBe(false);
    });

    it('leaves an old payload identical', () => {
        const r = battleMapSchema.safeParse(base);

        expect(r.success && r.data).toEqual(base);
    });

    it('rejects hex with walls, bars, doors or maze', () => {
        const hex = { ...base, gridType: 'hex' };

        for (const extra of [
            { walls: ['0:0:e'] },
            { bars: ['0:0:e'] },
            { doors: { '0:0:e': { open: false } } },
            { maze: emptyMaze() },
        ])
            expect(
                battleMapSchema.safeParse({ ...hex, ...extra }).success
            ).toBe(false);
    });

    it('allows square with walls', () => {
        expect(
            battleMapSchema.safeParse({
                ...base,
                gridType: 'square',
                walls: ['0:0:e'],
            }).success
        ).toBe(true);
    });
});

describe('battleMapInputSchema gridType', () => {
    it('keeps gridType in the library header', () => {
        const r = battleMapInputSchema.safeParse(lib({ gridType: 'hex' }));

        expect(r.success && r.data.map.gridType).toBe('hex');
    });

    it('old header payload has no gridType', () => {
        const r = battleMapInputSchema.safeParse(lib({}));

        expect(r.success && 'gridType' in r.data.map).toBe(false);
    });

    it('rejects hex with walls, bars or doors', () => {
        expect(
            battleMapInputSchema.safeParse(
                lib({ gridType: 'hex' }, { walls: ['0:0:e'] })
            ).success
        ).toBe(false);
        expect(
            battleMapInputSchema.safeParse(
                lib({ gridType: 'hex' }, { bars: ['0:0:e'] })
            ).success
        ).toBe(false);
        expect(
            battleMapInputSchema.safeParse(
                lib({ gridType: 'hex', doors: { '0:0:e': { open: false } } })
            ).success
        ).toBe(false);
    });
});
