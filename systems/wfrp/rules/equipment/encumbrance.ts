import type { Characteristics } from '../characteristics/keys';
import { parseWfrpStats } from './armour';
import { hasQuality } from './qualities';
import type { WfrpItemStats } from './stats';

type EncumbranceItem = {
    systemStats: unknown;
    quantity?: number;
    /** Worn armour and clothing weigh 1 Enc less (p299) */
    worn?: boolean;
};

export type BurdenTier = 0 | 1 | 2 | 3;

export type Encumbrance = { carried: number; limit: number; over: boolean };

export type EncumbranceReport = Encumbrance & {
    tier: BurdenTier;
    oversized: number;
};

export const COINS_PER_ENC = 200;

export const OVERSIZED_ENC = 4;

const bonusOf = (
    c: Pick<Characteristics, 'base' | 'advances'>,
    key: 's' | 't'
) => Math.floor((c.base[key] + c.advances[key]) / 10);

export const burdenTierOf = (carried: number, limit: number): BurdenTier =>
    carried <= limit
        ? 0
        : carried <= limit * 2
          ? 1
          : carried <= limit * 3
            ? 2
            : 3;

const flagged = (stats: WfrpItemStats | null, key: 'bulky' | 'lightweight') =>
    !!stats &&
    (hasQuality(stats.qualities, key) ||
        (stats.type === 'weapon' && hasQuality(stats.flaws, key)));

/** Canon: Lightweight -1, Bulky +1 and Enc 1 even when worn (p298-299) */
function encOf(stats: WfrpItemStats | null, worn: boolean, canon: boolean) {
    const weight = stats?.weight ?? 0;

    if (!canon) return Math.max(0, weight - (worn ? 1 : 0));

    const bulky = flagged(stats, 'bulky');

    if (worn && bulky) return 1;

    const adjusted =
        weight + (bulky ? 1 : 0) - (flagged(stats, 'lightweight') ? 1 : 0);

    return Math.max(0, adjusted - (worn ? 1 : 0));
}

export function encumbrance(
    items: EncumbranceItem[],
    characteristics: Pick<Characteristics, 'base' | 'advances'>,
    opts: { coins?: number; canon?: boolean } = {}
): EncumbranceReport {
    let oversized = 0;

    const weighed = items.reduce((sum, item) => {
        const stats = parseWfrpStats(item.systemStats);

        if ((stats?.weight ?? 0) >= OVERSIZED_ENC)
            oversized += item.quantity ?? 1;

        return (
            sum + encOf(stats, !!item.worn, !!opts.canon) * (item.quantity ?? 1)
        );
    }, 0);

    const carried = weighed + (opts.coins ?? 0) / COINS_PER_ENC;

    const limit = bonusOf(characteristics, 's') + bonusOf(characteristics, 't');

    return {
        carried,
        limit,
        over: carried > limit,
        tier: burdenTierOf(carried, limit),
        oversized,
    };
}

/** Overburdened Movement (p299): -1 to 2x limit (min 3), -2 to 3x (min 2), none beyond */
export function burdenedMove(move: number, tier: BurdenTier): number {
    if (tier === 0) return move;

    if (tier === 3) return 0;

    const [drop, floor] = tier === 1 ? [1, 3] : [2, 2];

    return Math.max(Math.min(move, floor), move - drop);
}

/** Overburdened Agility (p299): -10 / -20 (min 10); beyond 3x keeps the heaviest penalty */
export function burdenedAgility(ag: number, tier: BurdenTier): number {
    if (tier === 0) return ag;

    return Math.max(
        Math.min(ag, tier === 1 ? 1 : 10),
        ag - (tier === 1 ? 10 : 20)
    );
}
