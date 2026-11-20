import type { SpellMagicKind } from '@/lib/utils/spells/model/schema';

// verify against 5e book
export const CAST_SKILL = { key: 'language', spec: 'magick' } as const;
// verify against 5e book
export const OVERCAST_SL_STEP = 2;
// verify against 5e book
export const ARMOUR_SL_PER_AP = 1;
// legacy only; canon5e has no cap (p236)
export const CHANNEL_MAX_SL = 10;

/** canon5e channelling (p236): a mishap drains 1d10 SL and shifts the miscast roll by this per SL lost */
export const CHANNEL_LOSS_DIE = 10;
export const CHANNEL_MISCAST_STEP = 10;
// verify against 5e book
export const NO_OVERCAST_KINDS: ReadonlySet<SpellMagicKind> = new Set([
    'petty',
    'blessing',
    'miracle',
]);
// verify against 5e book
export const PRAY_SKILL = { key: 'pray' } as const;
// verify against 5e book
export const PRAYER_KINDS: ReadonlySet<SpellMagicKind> = new Set([
    'blessing',
    'miracle',
]);
// verify against 5e book
export const MAX_OVERCAST_STEPS = 3;
// verify against 5e book
export const MAJOR_MISCAST_ROLLS: ReadonlySet<number> = new Set([99, 100]);
// verify against 5e book
export const WORST_ROLL = 100;

/** Canon5e overcast table (p236): from this SL on, the listed bonus is available; values are cumulative per row */
export interface OvercastRow {
    sl: number;
    damage: number;
    targets: number;
    rangeMul: number;
    aoeMul: number;
    durationMul: number;
}

// AoE x3 at SL 8 is unreadable in the extracted page; it carries the SL 5 value
export const OVERCAST_TABLE: readonly OvercastRow[] = [
    { sl: 1, damage: 1, targets: 0, rangeMul: 1, aoeMul: 1, durationMul: 1 },
    { sl: 2, damage: 2, targets: 1, rangeMul: 2, aoeMul: 1, durationMul: 1 },
    { sl: 3, damage: 3, targets: 1, rangeMul: 2, aoeMul: 1, durationMul: 2 },
    { sl: 5, damage: 4, targets: 1, rangeMul: 2, aoeMul: 2, durationMul: 2 },
    { sl: 8, damage: 5, targets: 2, rangeMul: 3, aoeMul: 2, durationMul: 2 },
    { sl: 13, damage: 6, targets: 2, rangeMul: 3, aoeMul: 2, durationMul: 3 },
    { sl: 18, damage: 7, targets: 3, rangeMul: 4, aoeMul: 3, durationMul: 3 },
];

/** Overcast directions in the order a plan beyond the budget is cut (p236) */
export type OvercastDirection =
    | 'damage'
    | 'targets'
    | 'range'
    | 'aoe'
    | 'duration';

export type OvercastPlan = Partial<Record<OvercastDirection, number>>;

export const OVERCAST_DIRECTIONS: readonly OvercastDirection[] = [
    'targets',
    'range',
    'aoe',
    'duration',
    'damage',
];

export const CRIT_BONUS_DEFAULT = 'totalPower' as const;

export const SIN_WRATH_STEP = 10;

/** canon5e prayer overcast (p217-222): every OVERCAST_SL_STEP SL grants one bonus; a Blessing picks one dimension, the default is the first */
export const BLESSING_OVERCAST = [
    { dimension: 'rangeYards', per: 6 },
    { dimension: 'targets', per: 1 },
    { dimension: 'durationRounds', per: 6 },
] as const;

/** Design bound on what a Blessing may plan to reach before its roll (steps of OVERCAST_SL_STEP); the roll decides the real reach */
export const PRAYER_PLAN_STEPS = 3;

export type BlessingDimension = (typeof BLESSING_OVERCAST)[number]['dimension'];

/** canon5e dispelling (p237) */
export const DISPEL_PERSISTENT_SL_OWN = 1;
