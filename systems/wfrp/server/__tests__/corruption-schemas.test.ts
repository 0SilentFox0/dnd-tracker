import { describe, expect, it } from 'vitest';

import { corruptionGrantSchema } from '../corruption-schemas';

describe('corruptionGrantSchema', () => {
    it('accepts the manual form', () => {
        expect(
            corruptionGrantSchema.safeParse({ points: 2, reason: 'r' }).success
        ).toBe(true);
    });

    it('accepts the exposure form', () => {
        expect(
            corruptionGrantSchema.safeParse({
                exposure: { degree: 'major', skill: 'cool' },
                reason: 'r',
            }).success
        ).toBe(true);
    });

    it.each([
        {
            points: 2,
            exposure: { degree: 'minor', skill: 'cool' },
            reason: 'r',
        },
        { exposure: { degree: 'huge', skill: 'cool' }, reason: 'r' },
        { exposure: { degree: 'minor', skill: 'melee' }, reason: 'r' },
        { exposure: { degree: 'minor', skill: 'cool' } },
        { points: 0, reason: 'r' },
        { reason: 'r' },
    ])('rejects %j', (body) => {
        expect(corruptionGrantSchema.safeParse(body).success).toBe(false);
    });
});
