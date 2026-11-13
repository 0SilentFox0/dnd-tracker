import { describe, expect, it } from 'vitest';

import {
    FALLBACK_SYSTEM_KEY,
    kindOf,
} from '@/lib/utils/rules/systems/catalog';
import { metaOf, RULE_SYSTEM_KEYS } from '@/lib/utils/rules/systems/meta';

describe('FALLBACK_SYSTEM_KEY', () => {
    it('is a registered key of a base system, not an addon', () => {
        expect(RULE_SYSTEM_KEYS).toContain(FALLBACK_SYSTEM_KEY);

        const meta = metaOf(FALLBACK_SYSTEM_KEY);

        expect(meta && kindOf(meta)).toBe('base');
    });
});
