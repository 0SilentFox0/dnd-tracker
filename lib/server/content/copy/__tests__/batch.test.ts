import { describe, expect, it } from 'vitest';

import { sliceTargets } from '../batch';

const targets = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));

describe('sliceTargets', () => {
    it('returns everything without next when it fits', () => {
        expect(sliceTargets(targets, undefined, 10)).toEqual({
            batch: targets,
        });
    });

    it('slices by size and continues after the cursor', () => {
        const first = sliceTargets(targets, undefined, 2);

        expect(first.batch.map((t) => t.id)).toEqual(['a', 'b']);
        expect(first.next).toBe('b');

        const second = sliceTargets(targets, first.next, 2);

        expect(second.batch.map((t) => t.id)).toEqual(['c', 'd']);
        expect(second.next).toBe('d');

        const last = sliceTargets(targets, second.next, 2);

        expect(last.batch.map((t) => t.id)).toEqual(['e']);
        expect(last.next).toBeUndefined();
    });

    it('an unknown cursor restarts from the beginning', () => {
        expect(sliceTargets(targets, 'zzz', 2).batch[0].id).toBe('a');
    });
});
