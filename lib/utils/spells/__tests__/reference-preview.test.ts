import { describe, expect, it } from 'vitest';

import { defaultSpellForm } from '@/lib/utils/spells/model/form';
import { toSpellReferencePreview } from '@/lib/utils/spells/reference-preview';

describe('toSpellReferencePreview', () => {
    it('maps minimal form data to a valid reference', () => {
        const out = toSpellReferencePreview(
            { ...defaultSpellForm(), name: 'Spark', level: 2 },
            {}
        );

        expect(out).toMatchObject({
            name: 'Spark',
            level: 2,
            groupName: null,
            effects: [],
            facetKey: 'enemy',
        });
    });

    it('turns empty description into an empty string and keeps group name', () => {
        const out = toSpellReferencePreview(defaultSpellForm(), {
            id: 's1',
            groupName: 'Fire',
        });

        expect(out.description).toBe('');
        expect(out.id).toBe('s1');
        expect(out.groupName).toBe('Fire');
    });
});
