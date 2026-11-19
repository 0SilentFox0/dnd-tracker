import { describe, expect, it } from 'vitest';

import { UNIQUE_ABILITIES } from '../overrides/magic-items';

import { AbilitySchema } from '@/lib/utils/abilities/schema';

describe('UNIQUE_ABILITIES', () => {
    it('every override parses as an ability', () => {
        for (const abilities of Object.values(UNIQUE_ABILITIES))
            for (const a of abilities)
                expect(AbilitySchema.safeParse(a).success).toBe(true);
    });

    it('Periapt of Proof against Poison grants poison immunity and poisoned immunity', () => {
        const [a] = UNIQUE_ABILITIES['srd-2024_periapt-of-proof-against-poison'];

        expect(a.effects).toContainEqual({
            kind: 'flag',
            flag: 'conditionImmunity',
            conditions: ['poisoned'],
        });
    });
});
