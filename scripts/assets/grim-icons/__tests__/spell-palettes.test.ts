import { describe, expect, it } from 'vitest';

import { GRIM_SPELL_LISTS } from '../../../templates/systems/wfrp/spells';
import {
    allGrimSpellLists,
    SPELL_LIST_PALETTES,
    spellPaletteOf,
} from '../spell-palettes';

describe('spell list palettes', () => {
    it('covers every Grim spell list', () => {
        const lists = new Set(Object.values(GRIM_SPELL_LISTS).flat());

        expect(Object.keys(SPELL_LIST_PALETTES).sort()).toEqual(
            [...lists].sort()
        );
        expect(allGrimSpellLists().sort()).toEqual([...lists].sort());
    });

    it('uses the first list for a multi-list row and radiant as a fallback', () => {
        expect(spellPaletteOf(['Rites of the Tide', 'Hearth Rites'])).toBe(
            'teal'
        );
        expect(spellPaletteOf(['Pact Rites'])).toBe('crimson and black');
        expect(spellPaletteOf(['Unknown'])).toBe('radiant');
    });
});
