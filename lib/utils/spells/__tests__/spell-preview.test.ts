import { describe, expect, it } from 'vitest';

import { defaultSpellForm } from '@/lib/utils/spells/model/form';
import { toSpellReferencePreview } from '@/lib/utils/spells/spell-preview';

describe('toSpellReferencePreview', () => {
    it('does not throw on an empty form', () => {
        const out = toSpellReferencePreview(defaultSpellForm(), {});

        expect(out.id).toBe('');
        expect(out.name).toBe('');
        expect(out.fx).toBeNull();
        expect(out.groupName).toBeNull();
    });

    it('reflects the name and context', () => {
        const out = toSpellReferencePreview(
            { ...defaultSpellForm(), name: 'Bolt', level: 3 },
            { id: 's1', groupName: 'Fire' }
        );

        expect(out).toMatchObject({
            id: 's1',
            name: 'Bolt',
            level: 3,
            groupName: 'Fire',
        });
    });

    it('is pure', () => {
        const form = { ...defaultSpellForm(), name: 'A' };

        expect(toSpellReferencePreview(form, {})).toEqual(
            toSpellReferencePreview(form, {})
        );
    });
});
