import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import {
    applyFortune,
    FORTUNE_INPUT,
    spentFortune,
} from '@/systems/wfrp/rules/percentile/fortune';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';

const reroll = (rerolls?: number, manualReroll?: number) =>
    FORTUNE_INPUT.read(
        FORTUNE_INPUT.write({
            kind: 'reroll',
            ...(rerolls && { rerolls }),
            ...(manualReroll && { manualReroll }),
        })
    );

const sequence = (rolls: number[]) => {
    let i = 0;

    return (preset?: number) => ({ roll: preset ?? rolls[i++] });
};

const passes = (r: { roll: number }) => r.roll <= 30;

describe('canon: Fortune reroll (p133)', () => {
    bookExample(133, 'a second reroll may follow a failed one', () => {
        const out = applyFortune(
            sequence([80, 70, 20]),
            reroll(3),
            passes,
            undefined,
            { repeat: true }
        );

        expect(out.result.roll).toBe(20);
        expect(out.fortune).toMatchObject({
            kind: 'reroll',
            firstRoll: 80,
            rolls: [70, 20],
            spent: 2,
        });
    });

    bookExample(133, 'a passed first test spends nothing', () => {
        const out = applyFortune(sequence([10]), reroll(3), passes, undefined, {
            repeat: true,
        });

        expect(out.fortune).toBeUndefined();
    });

    bookExample(133, 'rerolls stop at the declared count', () => {
        const out = applyFortune(
            sequence([80, 70, 60, 50]),
            reroll(2),
            passes,
            undefined,
            { repeat: true }
        );

        expect(out.fortune?.spent).toBe(2);
        expect(out.result.roll).toBe(60);
    });

    it('legacy allows a single reroll and keeps the one-point spend', () => {
        const out = applyFortune(sequence([80, 70, 20]), reroll(3), passes);

        expect(out.fortune?.spent).toBe(1);
        expect(out.fortune?.rolls).toBeUndefined();
        expect(out.result.roll).toBe(70);
    });

    it('a manual roll covers only the first reroll', () => {
        const out = applyFortune(
            sequence([80, 15]),
            reroll(2, 77),
            passes,
            undefined,
            { repeat: true }
        );

        expect(out.fortune?.rolls).toEqual([77, 15]);
    });

    bookExample(133, 'spentFortune charges the number of rerolls used', () => {
        const p = withWfrpState(makeParticipant({ id: 'a', hp: 5, maxHp: 5 }), {
            fortune: 3,
        });

        expect(spentFortune(p, 2)).toEqual({ fortune: 1 });
        expect(spentFortune(p, 9)).toEqual({ fortune: 0 });
        expect(wfrpState(p).fortune).toBe(3);
    });
});
