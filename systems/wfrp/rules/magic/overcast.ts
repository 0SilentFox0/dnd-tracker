import {
    OVERCAST_DIMENSIONS,
    type OvercastDimension,
    type WfrpOvercast,
} from '../percentile/fortune';

import type { CastExtension } from '@/lib/utils/rules/systems/types';

interface OvercastTier {
    sl: number;
    value: number;
}

/** Canon5e overcast table (p236): one column per direction, a tier needs that many SL spent in that direction */
export const OVERCAST_COLUMNS: Record<
    OvercastDimension,
    readonly OvercastTier[]
> = {
    damage: [
        { sl: 1, value: 1 },
        { sl: 2, value: 2 },
        { sl: 3, value: 3 },
        { sl: 5, value: 4 },
        { sl: 8, value: 5 },
        { sl: 13, value: 6 },
        { sl: 18, value: 7 },
    ],
    targets: [
        { sl: 1, value: 1 },
        { sl: 5, value: 2 },
        { sl: 18, value: 3 },
    ],
    range: [
        { sl: 1, value: 2 },
        { sl: 5, value: 3 },
        { sl: 18, value: 4 },
    ],
    aoe: [
        { sl: 3, value: 2 },
        { sl: 18, value: 3 },
    ],
    duration: [
        { sl: 2, value: 2 },
        { sl: 8, value: 3 },
    ],
};

const NEUTRAL: Record<OvercastDimension, number> = {
    damage: 0,
    targets: 0,
    range: 1,
    aoe: 1,
    duration: 1,
};

/** Losing order when the roll cannot pay the declared spread */
export const OVERCAST_TRIM_ORDER: readonly OvercastDimension[] = [
    'damage',
    'duration',
    'aoe',
    'range',
    'targets',
];

export function overcastValue(dim: OvercastDimension, spent: number): number {
    return (
        OVERCAST_COLUMNS[dim].filter((t) => t.sl <= spent).at(-1)?.value ??
        NEUTRAL[dim]
    );
}

export const overcastTotal = (spread: WfrpOvercast): number =>
    OVERCAST_DIMENSIONS.reduce((sum, d) => sum + (spread[d] ?? 0), 0);

/** Cuts the declared spread down to the SL actually available, losing directions in `OVERCAST_TRIM_ORDER` */
export function trimOvercast(
    declared: WfrpOvercast,
    available: number
): WfrpOvercast {
    let excess = overcastTotal(declared) - Math.max(0, available);

    const out: WfrpOvercast = { ...declared };

    for (const d of OVERCAST_TRIM_ORDER) {
        if (excess <= 0) break;

        const have = out[d] ?? 0;

        const cut = Math.min(have, excess);

        excess -= cut;

        if (have - cut > 0) out[d] = have - cut;
        else delete out[d];
    }

    return out;
}

/** Directions a spell may be overcast in: damage only for a magic missile */
export function allowedOvercast(
    declared: WfrpOvercast,
    missile: boolean
): WfrpOvercast {
    const { damage, ...rest } = declared;

    return missile && damage ? { ...rest, damage } : rest;
}

export function overcastExtension(spread: WfrpOvercast): CastExtension {
    return {
        rangeMul: overcastValue('range', spread.range ?? 0),
        extraTargets: overcastValue('targets', spread.targets ?? 0),
        areaMul: overcastValue('aoe', spread.aoe ?? 0),
        durationMul: overcastValue('duration', spread.duration ?? 0),
    };
}

export const overcastDamage = (spread: WfrpOvercast): number =>
    overcastValue('damage', spread.damage ?? 0);
