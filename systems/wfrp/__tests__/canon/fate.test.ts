import { describe, expect, it } from 'vitest';

import { bookExample, CANON, NO_RNG } from './book-example';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { resolveOpposed } from '@/systems/wfrp/rules/combat/opposed';
import { resolvePercentileTest } from '@/systems/wfrp/rules/percentile';
import {
    applyFortune,
    forcedOf,
    FORTUNE_INPUT,
    spentFor,
} from '@/systems/wfrp/rules/percentile/fortune';
import { wfrpState,withWfrpState } from '@/systems/wfrp/rules/state';

describe('canon: Fate, "I Will Not Fail!" (p133)', () => {
    bookExample(
        133,
        'the chosen result is an automatic success even when the roll would fail',
        () => {
            const r = resolvePercentileTest({
                target: 10,
                slModel: 'final',
                rng: NO_RNG,
                presetRoll: 90,
                forced: { outcome: 'success' },
            });

            expect(r.outcome).toBe('success');
            expect(r.sl).toBe(0);
        }
    );

    bookExample(
        133,
        'a chosen Critical is a Critical regardless of the roll',
        () => {
            const r = resolvePercentileTest({
                target: 10,
                doubles: true,
                rng: NO_RNG,
                presetRoll: 90,
                forced: { outcome: 'critical' },
            });

            expect(r.outcome).toBe('critical');
            expect(r.doubles).toBe(true);
        }
    );

    bookExample(133, 'in an Opposed Test you win by at least +1 SL', () => {
        const r = resolveOpposed({
            attackerTarget: 10,
            defenderTargets: [{ kind: 'parry', target: 90 }],
            attackerForced: { outcome: 'success' },
            edition: CANON,
            rng: NO_RNG,
            presetRolls: { attacker: 99, defender: 5 },
        });

        expect(r.isHit).toBe(true);
        expect(r.netSl).toBeGreaterThanOrEqual(1);
    });

    bookExample(133, 'it spends one Fate point, not Fortune', () => {
        const p = withWfrpState(makeParticipant({ id: 'a', hp: 5, maxHp: 5 }), {
            fate: 2,
            fortune: 3,
        });

        expect(spentFor(p, 'notFail')).toEqual({ fate: 1 });
        expect(spentFor(p, 'sl')).toEqual({ fortune: 2 });
        expect(wfrpState(p).fate).toBe(2);
    });

    bookExample(133, 'applyFortune reports the spend without a reroll', () => {
        const input = FORTUNE_INPUT.read(
            FORTUNE_INPUT.write({ kind: 'notFail' })
        );

        const { fortune } = applyFortune(
            (preset) => ({ roll: preset ?? 50 }),
            input,
            () => true
        );

        expect(fortune).toEqual({ kind: 'notFail' });
    });

    it('notFail input keeps the chosen critical location only with a critical', () => {
        const input = FORTUNE_INPUT.read(
            FORTUNE_INPUT.write({
                kind: 'notFail',
                critical: true,
                location: 'head',
            })
        );

        expect(forcedOf(input, 2)).toEqual({ outcome: 'critical', minSl: 2 });
        expect(input?.location).toBe('head');
        expect(forcedOf(undefined)).toBeUndefined();
    });
});
