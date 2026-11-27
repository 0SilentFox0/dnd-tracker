import { describe, expect, it } from 'vitest';

import { magicInitiate } from './fixtures';

import { featSpellList } from '@/lib/utils/characters/choices/describe';

const variant = (list: string) => ({
    choices: magicInitiate.choices.map((c) => ({
        ...c,
        spells: { ...c.spells!, lists: [list] },
    })),
});

describe('featSpellList', () => {
    it('null for a feat open to several lists', () => {
        expect(featSpellList(magicInitiate)).toBeNull();
    });

    it('the single list of a variant', () => {
        expect(featSpellList(variant('Cleric'))).toBe('Cleric');
    });

    it('null without spell choices', () => {
        expect(featSpellList({ choices: [] })).toBeNull();
    });
});
