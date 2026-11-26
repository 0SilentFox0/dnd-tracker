import { describe, expect, it } from 'vitest';

import { makeClass } from './class-fixtures';

import { toClassReferencePreview } from '@/lib/utils/characters/classes/class-preview';

describe('toClassReferencePreview', () => {
    const { id: _id, ...data } = makeClass({ name: 'Fighter' });

    it('does not throw on an empty class', () => {
        const out = toClassReferencePreview({ ...data, name: '' }, {});

        expect(out.id).toBe('');
        expect(out.name).toBe('');
    });

    it('reflects the name', () => {
        expect(toClassReferencePreview(data, { id: 'c1' })).toMatchObject({
            id: 'c1',
            name: 'Fighter',
        });
    });

    it('is pure', () => {
        expect(toClassReferencePreview(data, {})).toEqual(
            toClassReferencePreview(data, {})
        );
    });
});
