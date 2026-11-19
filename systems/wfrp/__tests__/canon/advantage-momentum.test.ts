import { describe, expect, it } from 'vitest';

import { bookExample, CANON, LEGACY, NO_RNG } from './book-example';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { fortuneMax, readCharacteristics } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpLoseChannelled } from '@/systems/wfrp/rules/combat/lose-channelled';
import { hasMomentum,loseMomentum, spendMomentum, withMomentum } from '@/systems/wfrp/rules/combat/momentum';
import { resolveOpposed } from '@/systems/wfrp/rules/combat/opposed';
import { resolvePercentileTest } from '@/systems/wfrp/rules/percentile';
import { resolveModeSources } from '@/systems/wfrp/rules/percentile/advantage';

describe('canon: Advantage and Disadvantage (p130)', () => {
    bookExample(130, 'one Advantage lets the digits be reversed: 71 becomes 17', () => {
        const r = resolvePercentileTest({
            target: 30,
            mode: 'advantage',
            slModel: 'final',
            rng: NO_RNG,
            presetRoll: 71,
        });

        expect(r.roll).toBe(17);
        expect(r.reversed).toBe(true);
    });

    bookExample(130, 'Disadvantage forces the reversal when worse: 19 becomes 91', () => {
        const r = resolvePercentileTest({
            target: 50,
            mode: 'disadvantage',
            slModel: 'final',
            rng: NO_RNG,
            presetRoll: 19,
        });

        expect(r.roll).toBe(91);
    });

    bookExample(130, 'Advantage and Disadvantage cancel each other out', () => {
        expect(resolveModeSources({ advantage: 1, disadvantage: 1 })).toEqual({
            mode: 'normal',
            slMod: 0,
        });
    });

    bookExample(130, 'each Advantage source after the first adds +1 SL', () => {
        expect(resolveModeSources({ advantage: 3 })).toEqual({ mode: 'advantage', slMod: 2 });
        expect(resolveModeSources({ advantage: 1 })).toEqual({ mode: 'advantage', slMod: 0 });
    });

    bookExample(130, 'each Disadvantage source after the first inflicts -1 SL; pairs cancel first', () => {
        expect(resolveModeSources({ disadvantage: 2 })).toEqual({ mode: 'disadvantage', slMod: -1 });
        expect(resolveModeSources({ advantage: 1, disadvantage: 3 })).toEqual({ mode: 'disadvantage', slMod: -1 });
    });
});

describe('canon: Momentum (p168)', () => {
    const opposed = (attackerAdvantage: number, rolls: { attacker: number; defender: number }) =>
        resolveOpposed({
            attackerTarget: 40,
            defenderTargets: [{ kind: 'parry', target: 40 }],
            attackerModes: { advantage: attackerAdvantage },
            edition: CANON,
            rng: NO_RNG,
            presetRolls: rolls,
        });

    bookExample(168, 'Momentum grants Advantage on a melee test (reversed 71 -> 17)', () => {
        expect(opposed(1, { attacker: 71, defender: 90 }).attacker.roll).toBe(17);
        expect(opposed(0, { attacker: 71, defender: 90 }).attacker.roll).toBe(71);
    });

    bookExample(168, 'you either have Momentum or you do not; gaining it twice changes nothing', () => {
        const p = makeParticipant({ id: 'a', hp: 5, maxHp: 5 });

        const once = withMomentum(p, true);

        expect(hasMomentum(once)).toBe(true);
        expect(withMomentum(once, true)).toBe(once);
    });

    bookExample(168, 'suffering damage costs Momentum', () => {
        const p = withMomentum(makeParticipant({ id: 'a', hp: 5, maxHp: 5 }), true);

        const result = { participant: p, participants: [p], messages: [] };

        const next = wfrpLoseChannelled({ amount: 2 } as never, result);

        expect(hasMomentum(next.participant)).toBe(false);
    });

    bookExample(168, 'spending Momentum on an extra attack or Disengage removes it; none to spend gives null', () => {
        const p = makeParticipant({ id: 'a', hp: 5, maxHp: 5 });

        expect(spendMomentum(p)).toBeNull();
        expect(hasMomentum(spendMomentum(withMomentum(p, true))!)).toBe(false);
        expect(loseMomentum(p)).toBe(p);
    });

    it('legacy keeps the one scene token per side worth +1 SL', () => {
        expect(LEGACY.momentumModel).toBe('side');
        expect(LEGACY.advantageModel).toBe('slBonus');
    });
});

describe('canon: Fate and Fortune are separate pools (p27, p29, p133)', () => {
    bookExample(29, 'Fate 4 and Fortune 3: Fortune has its own maximum', () => {
        const c = readCharacteristics({ characteristics: { fate: 4, fortune: 3 } });

        expect(c.fate).toBe(4);
        expect(fortuneMax(c)).toBe(3);
    });

    it('a hero without a separate Fortune value keeps Fortune = Fate (existing heroes)', () => {
        expect(fortuneMax(readCharacteristics({ characteristics: { fate: 2 } }))).toBe(2);
    });

    it('canon5e splits the pools, legacy keeps one', () => {
        expect(CANON.fortunePools).toBe('split');
        expect(LEGACY.fortunePools).toBe('single');
    });
});
