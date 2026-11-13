import { describe, expect, it } from 'vitest';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { noMagic, noSustain } from '@/lib/utils/battle/spell/none';

describe('noMagic', () => {
    it('has no save DC rather than a made-up one', () => {
        expect(
            noMagic.saveDc(createMockParticipant(), undefined, 8)
        ).toBeUndefined();
    });

    it('noSustain.begin takes a hold object and changes nothing', () => {
        const ps = [createMockParticipant()];

        const r = noSustain.begin(ps, {
            casterId: 'c',
            castId: 'x',
            spellName: 'S',
            rounds: 2,
        });

        expect(r.participants).toBe(ps);
    });
});
