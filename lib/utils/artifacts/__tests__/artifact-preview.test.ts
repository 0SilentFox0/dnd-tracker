import { describe, expect, it } from 'vitest';

import type { ArtifactFormState } from '@/lib/utils/artifacts/artifact-form';
import { toArtifactReferencePreview } from '@/lib/utils/artifacts/artifact-preview';

const empty: ArtifactFormState = {
    name: '',
    description: '',
    rarity: '',
    slot: 'ring',
    icon: '',
    setId: null,
    abilities: [],
    weapon: {},
};

describe('toArtifactReferencePreview', () => {
    it('does not throw on an empty form', () => {
        const out = toArtifactReferencePreview(empty, {});

        expect(out).toMatchObject({
            id: '',
            icon: null,
            rarity: null,
            description: null,
            effects: [],
            setName: null,
        });
    });

    it('reflects the name and set', () => {
        const out = toArtifactReferencePreview(
            { ...empty, name: 'Ring' },
            { id: 'a1', setName: 'Set' }
        );

        expect(out).toMatchObject({ id: 'a1', name: 'Ring', setName: 'Set' });
    });

    it('is pure', () => {
        expect(toArtifactReferencePreview(empty, {})).toEqual(
            toArtifactReferencePreview(empty, {})
        );
    });
});
