import { describe, expect } from 'vitest';

import { bookExample, CANON, LEGACY, NO_RNG } from './book-example';

import { DIFFICULTY_SL } from '@/systems/wfrp/rules/percentile/difficulty';
import { resolvePercentileTest } from '@/systems/wfrp/rules/percentile/resolve';

const test = (
    target: number,
    roll: number,
    slModifier: number,
    extra: { doubles?: boolean; mode?: 'advantage' | 'disadvantage' } = {}
) =>
    resolvePercentileTest({
        target,
        slModifier,
        slModel: CANON.slModel,
        presetRoll: roll,
        rng: NO_RNG,
        ...extra,
    });

describe('canon: Success Levels (p130-132)', () => {
    bookExample(131, 'difficulty table is +6/+4/+2/0/-1/-2/-3 SL', () => {
        expect(Object.values(DIFFICULTY_SL)).toEqual([6, 4, 2, 0, -1, -2, -3]);
    });

    bookExample(
        132,
        'Stealth 39 rolling 41 is -1 SL, +2 SL Average turns it into +1 SL success',
        () => {
            const r = test(39, 41, DIFFICULTY_SL.average);

            expect(r.sl).toBe(1);
            expect(r.outcome).toBe('success');
        }
    );

    bookExample(
        132,
        'Athletics 30 rolling 11 at -1 SL is a critical (a double that succeeds)',
        () => {
            const r = test(30, 11, DIFFICULTY_SL.difficult, { doubles: true });

            expect(r.sl).toBe(1);
            expect(r.outcome).toBe('critical');
        }
    );

    bookExample(132, 'a failed double is a fumble', () => {
        expect(test(30, 66, 0, { doubles: true }).outcome).toBe('fumble');
    });

    bookExample(
        132,
        'Advantage reverses 72 into 27 against Stealth 46: a success',
        () => {
            const r = test(46, 72, 0, { mode: 'advantage' });

            expect(r.roll).toBe(27);
            expect(r.outcome).toBe('success');
        }
    );

    bookExample(
        130,
        'a modifier that lands on 0 SL: success when roll <= skill',
        () => {
            const r = test(45, 43, 0);

            expect(r.sl).toBe(0);
            expect(r.outcome).toBe('success');
        }
    );

    bookExample(
        130,
        'a modifier that lands on 0 SL: failure when roll > skill',
        () => {
            const r = test(45, 57, 1);

            expect(r.sl).toBe(0);
            expect(r.outcome).toBe('failure');
        }
    );

    bookExample(
        131,
        'a hard penalty turns a passed roll into a failure',
        () => {
            const r = test(45, 43, DIFFICULTY_SL.hard);

            expect(r.sl).toBe(-2);
            expect(r.outcome).toBe('failure');
        }
    );

    bookExample(130, 'rolls 01-05 always succeed, 96-00 always fail', () => {
        expect(test(10, 4, DIFFICULTY_SL.veryHard).outcome).toBe('success');
        expect(test(99, 97, DIFFICULTY_SL.veryEasy).outcome).toBe('failure');
    });

    bookExample(
        132,
        'the legacy preset keeps the clamped SL (nothing changes)',
        () => {
            const r = resolvePercentileTest({
                target: 39,
                slModifier: DIFFICULTY_SL.average,
                slModel: LEGACY.slModel,
                presetRoll: 41,
                rng: NO_RNG,
            });

            expect(r.outcome).toBe('failure');
            expect(r.sl).toBe(0);
        }
    );
});
