import { describe, expect, it } from 'vitest';

import { MAP_LIMITS } from '../map-limits';

describe('MAP_LIMITS', () => {
    it('keeps the invariants other code relies on', () => {
        expect(MAP_LIMITS.minSide).toBeLessThan(MAP_LIMITS.photoMaxSide);
        expect(MAP_LIMITS.photoMaxSide).toBeLessThanOrEqual(
            MAP_LIMITS.tileMaxSide
        );
        expect(MAP_LIMITS.battleMaxSide).toBeLessThanOrEqual(
            MAP_LIMITS.tileMaxSide
        );
        expect(MAP_LIMITS.libraryMaxEdges).toBe(2 * MAP_LIMITS.tileMaxSide ** 2);
        expect(MAP_LIMITS.inlineMaxEdges).toBeLessThanOrEqual(
            MAP_LIMITS.libraryMaxEdges
        );
    });

    it('inline limits keep their pre-library values', () => {
        expect(MAP_LIMITS.photoMaxSide).toBe(60);
        expect(MAP_LIMITS.inlineMaxEdges).toBe(7200);
        expect(MAP_LIMITS.maxTerrainCells).toBe(3600);
    });
});
