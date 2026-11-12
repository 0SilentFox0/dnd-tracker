import { describe, expect, it } from 'vitest';

import { findForbiddenTerms } from '../forbidden-terms';

describe('findForbiddenTerms', () => {
    it.each([
        'That is a moot point.',
        'A MOOT COURT ruling',
        'gore and grit',
        'A Copper Hound and a Grave Touch',
        'Many-Mouthed Thing',
        'Arming Sword',
        'Hearth Mending',
        'Ember Dart',
        'Mail Hood',
        'Hedge row',
    ])('allows %s', (text) => expect(findForbiddenTerms(text)).toEqual([]));

    it.each([
        ['the Moot hills', 'Moot'],
        ['two Gors charge', 'Gor'],
        ['Flesh Hounds bay', 'Flesh Hound'],
        ['a Clanrat pack', 'Clanrat'],
        ['a Carstein lord', 'Carstein'],
        ['Aethyric Armour', 'Aethyric'],
        ['a Zweihander', 'Zweihander'],
        ['Blessing of Battle', 'Blessing of Battle'],
        ['Gromril plate', 'Gromril'],
        ['Bright Wizard', 'Bright Wizard'],
    ])('flags %s', (text, term) =>
        expect(findForbiddenTerms(text)).toContain(term)
    );
});
