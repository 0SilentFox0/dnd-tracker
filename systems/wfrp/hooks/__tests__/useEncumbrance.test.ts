import { describe, expect, it } from 'vitest';

import { encumbranceInputOf } from '../useEncumbrance';

import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { carriedLoad } from '@/systems/wfrp/rules/equipment';

const stats = (weight: number) => ({
    type: 'gear',
    weight,
    price: 1,
    qualities: [],
});

const artifact = (id: string, weight: number) =>
    ({ id, name: id, slot: 'ring', systemStats: stats(weight) }) as never;

const special = (artifactId: string | undefined, quantity: number) => ({
    id: 's',
    name: 's',
    quantity,
    consumable: false,
    ...(artifactId && { artifactId }),
});

const weigh = (
    input: ReturnType<typeof encumbranceInputOf>,
    canon = false,
    coins = 0
) => carriedLoad({ ...input, coins }, DEFAULT_CHARACTERISTICS, canon).carried;

describe('encumbranceInputOf', () => {
    it('weighs a backpack artifact once, unknown specials weigh nothing', () => {
        const items = encumbranceInputOf(
            [],
            [artifact('rope', 2)],
            [special('other', 3)]
        );

        expect(weigh(items)).toBe(2);
    });

    it('special items without a known artifact weigh nothing', () => {
        expect(
            weigh(
                encumbranceInputOf(
                    [],
                    [artifact('a', 1)],
                    [special(undefined, 5), special('missing', 5)]
                )
            )
        ).toBe(1);
    });

    it('does not count an artifact twice when it is also a special item', () => {
        expect(
            weigh(
                encumbranceInputOf(
                    [artifact('rope', 2)],
                    [],
                    [special('rope', 3)]
                )
            )
        ).toBe(2);
    });

    it('canon: worn armour is 1 lighter and 200 coins weigh 1', () => {
        const armour = {
            id: 'a',
            slot: 'armor',
            systemStats: stats(3),
        } as never;

        const input = encumbranceInputOf([armour], [], []);

        expect(weigh(input, false)).toBe(3);
        expect(weigh(input, true, 400)).toBe(2 + 2);
    });
});
