import type { Characteristics } from '../characteristics/keys';
import { parseWfrpStats } from './armour';

type EncumbranceItem = { systemStats: unknown; quantity?: number };

export type Encumbrance = { carried: number; limit: number; over: boolean };

const bonusOf = (
    c: Pick<Characteristics, 'base' | 'advances'>,
    key: 's' | 't'
) => Math.floor((c.base[key] + c.advances[key]) / 10);

export function encumbrance(
    items: EncumbranceItem[],
    characteristics: Pick<Characteristics, 'base' | 'advances'>
): Encumbrance {
    const carried = items.reduce(
        (sum, item) =>
            sum +
            (parseWfrpStats(item.systemStats)?.weight ?? 0) *
                (item.quantity ?? 1),
        0
    );

    // verify against 5e book
    const limit = bonusOf(characteristics, 's') + bonusOf(characteristics, 't');

    return { carried, limit, over: carried > limit };
}
