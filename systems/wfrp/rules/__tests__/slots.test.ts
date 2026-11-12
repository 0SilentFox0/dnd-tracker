import { describe, expect, it } from 'vitest';

import { ATTACK_SLOT } from '../slots';

describe('ATTACK_SLOT', () => {
    it('round-trips an attack slot', () => {
        const data = {
            qualities: [{ key: 'blast' as const, value: 2 }],
            flaws: [],
            noSb: true,
        };

        expect(ATTACK_SLOT.read(ATTACK_SLOT.write(data))).toEqual(data);
    });

    it('returns undefined for a foreign key, missing slot and malformed data', () => {
        expect(
            ATTACK_SLOT.read({
                key: 'd6pool',
                data: { qualities: [], flaws: [] },
            })
        ).toBeUndefined();
        expect(ATTACK_SLOT.read(undefined)).toBeUndefined();
        expect(
            ATTACK_SLOT.read({
                key: 'wfrp',
                data: { qualities: [{ key: 'nope' }], flaws: [] },
            })
        ).toBeUndefined();
        expect(ATTACK_SLOT.read({ key: 'wfrp', data: 'x' })).toBeUndefined();
    });
});
