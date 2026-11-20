import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import { value } from '@/systems/wfrp/rules/characteristics/derive';
import {
    type Characteristics,
    DEFAULT_CHARACTERISTICS,
} from '@/systems/wfrp/rules/characteristics/keys';
import {
    wfrpAbilitiesOf,
    wfrpBaseStats,
} from '@/systems/wfrp/rules/combat/participant';
import { wfrpBurden } from '@/systems/wfrp/rules/equipment/burden';
import {
    burdenedAgility,
    burdenedMove,
    encumbrance,
} from '@/systems/wfrp/rules/equipment/encumbrance';
import { PARTICIPANT_SLOT } from '@/systems/wfrp/rules/slots';

const chars = (s = 30, t = 30): Characteristics => ({
    ...DEFAULT_CHARACTERISTICS,
    base: { ...DEFAULT_CHARACTERISTICS.base, s, t, ag: 40 },
    move: 4,
});

const gear = (weight: number) => ({
    systemStats: { type: 'gear', weight, price: 1, qualities: [] },
});

const rules = (preset: 'legacy' | 'canon5e') => ({ edition: { preset } });

const tierOf = (carried: number, preset: 'legacy' | 'canon5e' = 'canon5e') =>
    wfrpBurden({
        rows: [{ slot: 'backpack', ...gear(carried), carried: true }],
        specials: [],
        coins: 0,
        characteristics: chars(),
        rules: rules(preset) as never,
    });

describe('canon: Encumbrance (p299)', () => {
    bookExample(299, 'the limit is Strength Bonus + Toughness Bonus', () =>
        expect(encumbrance([], chars(30, 30)).limit).toBe(6)
    );

    bookExample(299, 'no penalty up to the limit, tiers at 2x and 3x', () => {
        expect(tierOf(6)).toBe(0);
        expect(tierOf(7)).toBe(1);
        expect(tierOf(12)).toBe(1);
        expect(tierOf(13)).toBe(2);
        expect(tierOf(18)).toBe(2);
        expect(tierOf(19)).toBe(3);
    });

    bookExample(299, 'legacy campaigns apply no burden', () =>
        expect(tierOf(40, 'legacy')).toBe(0)
    );

    bookExample(299, 'Movement drops by 1 (min 3) and 2 (min 2)', () => {
        expect(burdenedMove(4, 1)).toBe(3);
        expect(burdenedMove(3, 1)).toBe(3);
        expect(burdenedMove(2, 1)).toBe(2);
        expect(burdenedMove(4, 2)).toBe(2);
        expect(burdenedMove(3, 2)).toBe(2);
        expect(burdenedMove(1, 2)).toBe(1);
    });

    bookExample(299, 'beyond triple the limit you cannot move', () =>
        expect(burdenedMove(4, 3)).toBe(0)
    );

    bookExample(
        299,
        'Agility drops by 10 and 20 (min 10 at the second step)',
        () => {
            expect(burdenedAgility(40, 1)).toBe(30);
            expect(burdenedAgility(40, 2)).toBe(20);
            expect(burdenedAgility(25, 2)).toBe(10);
            expect(burdenedAgility(8, 2)).toBe(8);
        }
    );

    bookExample(299, 'worn armour weighs 1 Enc less', () => {
        const worn = encumbrance(
            [{ ...gear(3), worn: true }, gear(1)],
            chars()
        );

        expect(worn.carried).toBe(3);
    });

    bookExample(299, 'coins weigh 1 Enc per 200', () =>
        expect(encumbrance([], chars(), { coins: 500 }).carried).toBe(2.5)
    );

    bookExample(299, 'oversized items (Enc 4+) are counted', () =>
        expect(
            encumbrance([gear(4), gear(5), gear(2)], chars()).oversized
        ).toBe(2)
    );

    bookExample(
        299,
        'worn armour in the armour slots and coins feed the tier',
        () => {
            const tier = wfrpBurden({
                rows: [
                    { slot: 'armor', ...gear(4) },
                    { slot: 'weapon', ...gear(3) },
                ],
                specials: [],
                coins: 600,
                characteristics: chars(),
                rules: rules('canon5e') as never,
            });

            expect(tier).toBe(1);
        }
    );

    bookExample(
        299,
        'a participant carries the penalised Agility and slower Movement',
        () => {
            const slot = PARTICIPANT_SLOT.read(
                wfrpAbilitiesOf(chars(), { ap: {} as never, burden: 2 }).system
            );

            expect(value(slot?.characteristics as Characteristics, 'ag')).toBe(
                20
            );
            expect(slot?.stats.ag).toBe(20);
            expect(slot?.stats.burden).toBe(2);

            expect(wfrpBaseStats({ characteristics: chars() }).speed).toBe(24);
            expect(
                wfrpBaseStats(
                    { characteristics: chars() },
                    { ap: {} as never, burden: 2 }
                ).speed
            ).toBe(12);
            expect(
                wfrpBaseStats(
                    { characteristics: chars() },
                    { ap: {} as never, burden: 3 }
                ).speed
            ).toBe(0);
        }
    );
});
