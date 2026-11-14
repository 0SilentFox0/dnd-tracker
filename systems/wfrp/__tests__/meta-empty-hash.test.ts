import { describe, expect, it } from 'vitest';

import { hashJson } from '@/lib/utils/battle/store/stable-json';
import { WFRP_META } from '@/systems/wfrp/meta';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';

describe('WFRP_META.emptyCharacteristicsHashes', () => {
    it('matches the hash of DEFAULT_CHARACTERISTICS', () => {
        expect(WFRP_META.emptyCharacteristicsHashes).toEqual([
            hashJson(DEFAULT_CHARACTERISTICS),
        ]);
    });
});
