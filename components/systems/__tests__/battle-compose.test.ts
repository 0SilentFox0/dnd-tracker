import { describe, expect, it } from 'vitest';

import { composeUi } from '../compose';
import { systemUiOf } from '../registry';
import type { SystemUi } from '../types';

import { CompositionError } from '@/lib/utils/rules/systems/compose';

const A = () => null;

const B = () => null;

const C = () => null;

const base: SystemUi = {
    ...systemUiOf('wfrp'),
    battle: { badges: [A] },
};

describe('composeUi: battle slots', () => {
    it('concatenates lists across addons and keeps the base slots', () => {
        const out = composeUi(base, [
            { id: 'a', build: () => ({ battle: { badges: [B] } }) },
            { id: 'b', build: () => ({ battle: { dialogs: [C] } }) },
        ]);

        expect(out.battle.badges).toEqual([A, B]);
        expect(out.battle.dialogs).toEqual([C]);
    });

    it('rejects two addons claiming the same exclusive slot', () => {
        const First = () => null;

        const Second = () => null;

        expect(() =>
            composeUi(base, [
                { id: 'a', build: () => ({ battle: { HeroStats: First } }) },
                { id: 'b', build: () => ({ battle: { HeroStats: Second } }) },
            ])
        ).toThrow(CompositionError);
    });

    it('resolves a defined battle object for every base', () => {
        expect(systemUiOf('dnd5e').battle).toBeDefined();
        expect(systemUiOf('wfrp').battle).toBeDefined();
    });
});
