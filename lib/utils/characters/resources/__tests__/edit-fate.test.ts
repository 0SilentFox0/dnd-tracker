import { describe, expect, it } from 'vitest';

import { editResources } from '@/lib/utils/characters/resources/edit';

describe('editResources fate', () => {
    it('clamps to fateLimit', () => {
        expect(
            editResources({}, { fate: 9 }, undefined, {}, { fateLimit: 3 })
        ).toEqual({ fate: 3 });
        expect(
            editResources(
                { fate: 2 },
                { fate: -1 },
                undefined,
                {},
                { fateLimit: 3 }
            )
        ).toEqual({ fate: 0 });
    });

    it('is ignored without a fateLimit', () => {
        expect(editResources({}, { fate: 2 })).toEqual({});
        expect(
            editResources({}, { fate: 2 }, undefined, {}, { fateMax: 3 })
        ).toEqual({});
    });
});
