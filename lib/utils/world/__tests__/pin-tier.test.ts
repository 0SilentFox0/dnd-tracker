import { describe, expect, it } from 'vitest';

import { isMinorPin, pinHiddenAtZoom } from '../pin-tier';

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
