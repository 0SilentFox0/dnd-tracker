import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { fateLeftOf, fateSpendsOn } from '@/systems/wfrp/rules/combat/fate';
import { assertWfrpInput } from '@/systems/wfrp/rules/combat/input';
import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import { PARTICIPANT_STATE } from '@/systems/wfrp/rules/slots';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';

const hero = (fate: number, fortune = 3) => {
    const base = makeParticipant({ id: 'a', hp: 10, maxHp: 10 });

    return withWfrpState(
        {
            ...base,
            abilities: {
                ...base.abilities,
                system: slotOf({ ...DEFAULT_CHARACTERISTICS, fate }),
            },
        },
        { fortune }
    );
};

describe('canon: Fate pool (p133)', () => {
    bookExample(133, 'unspent Fate reads as the characteristic', () => {
        expect(wfrpState(hero(4)).fate).toBeUndefined();
        expect(fateLeftOf(hero(4))).toBe(4);
    });

    bookExample(133, 'spent Fate reads as the stored value, even 0', () => {
        expect(fateLeftOf(withWfrpState(hero(4), { fate: 0 }))).toBe(0);
        expect(fateLeftOf(withWfrpState(hero(4), { fate: 2 }))).toBe(2);
    });

    it('Fate is its own pool only under the split profile', () => {
        expect(fateSpendsOn({ edition: { preset: 'canon5e' } })).toBe(true);
        expect(fateSpendsOn({ edition: { preset: 'legacy' } })).toBe(false);
        expect(fateSpendsOn({})).toBe(false);
    });

    it('state keeps outOfFight and momentumAttack only when true', () => {
        const slot = {
            key: 'wfrp',
            data: { outOfFight: true, momentumAttack: true },
        };

        expect(PARTICIPANT_STATE.read(slot)).toEqual({
            outOfFight: true,
            momentumAttack: true,
        });
        expect(
            PARTICIPANT_STATE.read({
                key: 'wfrp',
                data: { outOfFight: false, momentumAttack: 1 },
            })
        ).toEqual({});
    });
});

describe('canon: Fortune rerolls count (p133)', () => {
    const input = (kind: 'reroll' | 'notFail', rerolls?: number) =>
        FORTUNE_INPUT.write({ kind, ...(rerolls && { rerolls }) });

    it('parses a 1..9 integer count and drops the rest', () => {
        expect(FORTUNE_INPUT.read(input('reroll', 3))?.rerolls).toBe(3);
        expect(
            FORTUNE_INPUT.read({
                key: 'wfrp',
                data: { kind: 'reroll', rerolls: 0 },
            })?.rerolls
        ).toBeUndefined();
        expect(
            FORTUNE_INPUT.read({
                key: 'wfrp',
                data: { kind: 'reroll', rerolls: 1.5 },
            })?.rerolls
        ).toBeUndefined();
    });

    bookExample(
        133,
        'a reroll count above the Fortune left is rejected',
        () => {
            const ctx = {
                kind: 'attack',
                actor: hero(2, 2),
                targetCount: 1,
                isDM: false,
            } as const;

            expect(() =>
                assertWfrpInput(input('reroll', 2), ctx)
            ).not.toThrow();
            expect(() => assertWfrpInput(input('reroll', 3), ctx)).toThrow();
            expect(() => assertWfrpInput(input('reroll'), ctx)).not.toThrow();
        }
    );

    bookExample(133, 'unspent Fate pays for "I Will Not Fail"', () => {
        const ctx = {
            kind: 'attack',
            actor: hero(1, 0),
            targetCount: 1,
            isDM: false,
        } as const;

        expect(() => assertWfrpInput(input('notFail'), ctx)).not.toThrow();
        expect(() =>
            assertWfrpInput(input('notFail'), {
                ...ctx,
                actor: withWfrpState(ctx.actor, { fate: 0 }),
            })
        ).toThrow();
    });
});
