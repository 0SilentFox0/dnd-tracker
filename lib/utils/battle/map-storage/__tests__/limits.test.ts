import { describe, expect, it } from 'vitest';

import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { battleMapMaxSide } from '@/lib/utils/battle/map-storage/limits';

describe('battleMapMaxSide', () => {
    it('with the library flag: tileMaxSide', () => {
        expect(battleMapMaxSide({ mapLibraryEnabled: true })).toBe(
            MAP_LIMITS.tileMaxSide
        );
    });

    it.each([{ mapLibraryEnabled: false }, { mapLibraryEnabled: null }, {}])(
        'without the flag (%o): battleMaxSide',
        (flags) => {
            expect(battleMapMaxSide(flags)).toBe(MAP_LIMITS.battleMaxSide);
        }
    );
});
