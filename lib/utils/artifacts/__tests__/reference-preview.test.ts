import { describe, expect, it } from 'vitest';

import { toArtifactReferencePreview } from '@/lib/utils/artifacts/reference-preview';

const base = {
    name: 'Ring',
    description: '',
    rarity: 'rare',
    slot: 'ring',
    icon: '',
    abilities: [],
};

describe('toArtifactReferencePreview', () => {
    it('maps minimal form data', () => {
        expect(toArtifactReferencePreview(base, {})).toMatchObject({
            name: 'Ring',
            rarity: 'rare',
            slot: 'ring',
            description: '',
            icon: null,
            effects: [],
            setName: null,
            holderName: null,
        });
    });

    it('passes set name and drops invalid abilities', () => {
        const out = toArtifactReferencePreview(
            { ...base, abilities: [{ junk: true } as never] },
            { setName: 'Dragon' }
        );

        expect(out.setName).toBe('Dragon');
        expect(out.effects).toEqual([]);
    });
});
