import { describe, expect, it } from 'vitest';

import { D20_MAGIC } from '@/systems/d20/rules/magic';
import {
    d20SaveCrit,
    d20SpellAttackRoll,
    d20ZoneAttack,
} from '@/systems/d20/rules/magic/spell-roll';

const base = {
    mode: 'normal' as const,
    rng: () => 0.5,
    bonus: 5,
    ac: 15,
    critOn: 20,
    fumbleOn: 1,
};

describe('d20 spell attack roll', () => {
    it('a natural 20 crits and hits whatever the armor', () => {
        expect(
            d20SpellAttackRoll({ ...base, presetRoll: 20, ac: 40 })
        ).toMatchObject({ crit: true, fumble: false, hit: true });
    });

    it('a natural 1 misses even with a huge bonus', () => {
        expect(
            d20SpellAttackRoll({ ...base, presetRoll: 1, bonus: 50 })
        ).toMatchObject({ crit: false, fumble: true, hit: false });
    });

    it('compares roll plus bonus with the armor otherwise', () => {
        expect(d20SpellAttackRoll({ ...base, presetRoll: 10 }).hit).toBe(true);
        expect(d20SpellAttackRoll({ ...base, presetRoll: 9 }).hit).toBe(false);
    });

    it('is the magic hook of the base, with the d20 die for the client', () => {
        expect(D20_MAGIC.attackRoll).toBe(d20SpellAttackRoll);
        expect(D20_MAGIC.attackDice).toBe(20);
    });
});

describe('d20 save crit and zone attack', () => {
    it('natural 20 and 1 decide a save, other rolls do not', () => {
        expect(d20SaveCrit(20)).toBe('success');
        expect(d20SaveCrit(1)).toBe('fail');
        expect(d20SaveCrit(11)).toBeNull();
    });

    it('a zone attack uses the same hit rule', () => {
        const rng = () => 0.99;

        expect(d20ZoneAttack({ rng, bonus: 0, ac: 99 })).toEqual({
            roll: 20,
            hit: true,
        });
    });
});
