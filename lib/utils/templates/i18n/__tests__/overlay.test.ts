import { describe, expect, it } from 'vitest';

import { translateAt } from '../overlay';

const tr = {
    'spells/bless/name': { text: 'Благословення', en: 'Bless' },
    'spells/bless/description': { text: 'Дає {n} HP', en: 'Gives {n} HP' },
};

describe('translateAt', () => {
    it('returns the translation, applies a stale one, and falls back when missing', () => {
        expect(translateAt(tr, 'spells/bless/name', 'Bless')).toBe(
            'Благословення'
        );
        expect(translateAt(tr, 'spells/bless/name', 'Greater Bless')).toBe(
            'Благословення'
        );
        expect(translateAt(tr, 'spells/other/name', 'Other')).toBe('Other');
        expect(translateAt(tr, 'constructor', 'Other')).toBe('Other');
    });

    it('keeps English when the placeholders differ', () => {
        expect(
            translateAt(tr, 'spells/bless/description', 'Gives {x} HP')
        ).toBe('Gives {x} HP');
        expect(
            translateAt(tr, 'spells/bless/description', 'Gives {n} HP')
        ).toBe('Дає {n} HP');
    });
});
