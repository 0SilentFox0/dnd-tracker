import { describe, expect, it } from 'vitest';

import { byPinRank, isMinorPin, pinHiddenAtZoom, pinRank } from '../pin-tier';

describe('pin tiers', () => {
    it('treats villages and camps as minor, cities and zones as not', () => {
        expect(isMinorPin({ kind: 'point', icon: 'village' })).toBe(true);
        expect(isMinorPin({ kind: 'point', icon: 'camp' })).toBe(true);
        expect(isMinorPin({ kind: 'point', icon: 'city' })).toBe(false);
        expect(isMinorPin({ kind: 'point', icon: null })).toBe(false);
        expect(isMinorPin({ kind: 'zone', icon: 'village' })).toBe(false);
    });

    it('hides minor pins at low zoom unless pinned', () => {
        const v = { kind: 'point', icon: 'village' } as const;

        expect(pinHiddenAtZoom(v, 1, false)).toBe(true);
        expect(pinHiddenAtZoom(v, 1, true)).toBe(false);
        expect(pinHiddenAtZoom(v, 3, false)).toBe(false);
        expect(pinHiddenAtZoom({ kind: 'point', icon: 'city' }, 1, false)).toBe(
            false
        );
    });
});

describe('pin rank', () => {
    it('pinRank puts castles before cities and minor pins last', () => {
        const rank = (icon: string | null) => pinRank({ kind: 'point', icon });

        expect(rank('castle')).toBeLessThan(rank('city'));
        expect(rank('battle')).toBeLessThan(rank(null));
        expect(rank(null)).toBeLessThan(rank('village'));
        expect(rank('village')).toBeLessThan(rank('camp'));
    });

    it('byPinRank keeps input order on ties', () => {
        const a = { id: 'a', kind: 'point', icon: 'city' } as const;

        const b = { id: 'b', kind: 'point', icon: 'city' } as const;

        const c = { id: 'c', kind: 'point', icon: 'castle' } as const;

        expect([a, b, c].sort(byPinRank).map((m) => m.id)).toEqual([
            'c',
            'a',
            'b',
        ]);
    });
});
