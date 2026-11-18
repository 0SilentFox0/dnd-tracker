import { describe, expect, it } from 'vitest';

import { readProposalOps } from '../proposal-ops';

describe('readProposalOps', () => {
    it('returns stored ops untouched', () => {
        const ops = [{ op: 'addSlide', imageUrl: 'x' }];

        expect(readProposalOps(ops)).toEqual(ops);
    });

    it.each([null, {}, 'x', [1], [{ nope: true }]])(
        'falls back to an empty list for %p',
        (value) => {
            expect(readProposalOps(value)).toEqual([]);
        }
    );
});
