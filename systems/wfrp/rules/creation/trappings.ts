import { STATUS_COIN } from '../downtime/constants';
import { parseStatus, type Status } from '../downtime/status';
import type { CoinAmount } from '../downtime/types';

import { rollDice } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';

export type StartingItem = { name: string; quantity: number };

/** Every character begins with these (p39) */
export const EVERYONE_TRAPPINGS = ['Clothing', 'Dagger', 'Pouch'] as const;

type ClassKit = { name: string; quantity: number | `${number}d${number}` }[];

const one = (...names: string[]): ClassKit =>
    names.map((name) => ({ name, quantity: 1 }));

/** Beginning Trappings by Class (p39); keys are lowercase singular class names */
const CLASS_TRAPPINGS: Record<string, ClassKit> = {
    academic: [
        ...one('Sling Bag', 'Writing Kit'),
        { name: 'Parchment', quantity: '1d10' },
    ],
    burgher: one('Cloak', 'Hat', 'Sling Bag', 'Lunch'),
    courtier: one('Fine Clothing', 'Tweezers', 'Ear Pick', 'Comb'),
    peasant: one('Cloak', 'Sling Bag', 'Rations (1 day)'),
    ranger: one('Cloak', 'Backpack', 'Tinderbox', 'Blanket', 'Rations (1 day)'),
    riverfolk: one('Cloak', 'Sling Bag', 'Flask of Spirits'),
    rogue: [
        { name: 'Sling Bag', quantity: 1 },
        { name: 'Candle', quantity: 2 },
        { name: 'Matches', quantity: '1d10' },
        { name: 'Hood or Mask', quantity: 1 },
    ],
    warrior: one('Hand Weapon'),
};

const classKey = (cls: string) => {
    const k = cls.trim().toLowerCase();

    return k in CLASS_TRAPPINGS ? k : k.replace(/s$/, '');
};

export function beginningTrappings(
    cls: string | null | undefined,
    rng: Rng
): StartingItem[] {
    const kit = (cls && CLASS_TRAPPINGS[classKey(cls)]) || [];

    return [
        ...EVERYONE_TRAPPINGS.map((name) => ({ name, quantity: 1 })),
        ...kit.map(({ name, quantity }) => ({
            name,
            quantity:
                typeof quantity === 'number'
                    ? quantity
                    : rollDice(quantity, rng),
        })),
    ];
}

/** Starting wealth by Status of the first Career Level (p39) */
export function startingWealth(status: Status, rng: Rng): CoinAmount {
    const { tier, level } = status;

    const amount =
        tier === 'brass'
            ? 20 + rollDice(`${2 * level}d10`, rng)
            : tier === 'silver'
              ? 10 + rollDice(`${level}d10`, rng)
              : 2 + level;

    return { coin: STATUS_COIN[tier], amount };
}

export const startingWealthOf = (raw: string | undefined, rng: Rng) =>
    startingWealth(parseStatus(raw), rng);
